-- 성능 최적화된 데이터베이스 함수들
-- 복잡한 쿼리를 최적화하고 캐싱을 활용합니다.

-- 최적화된 학생 대시보드 데이터 조회 함수
CREATE OR REPLACE FUNCTION get_student_dashboard_data(p_student_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    student_info RECORD;
    active_activities INTEGER;
    completed_checklists INTEGER;
    total_checklists INTEGER;
    recent_chats INTEGER;
BEGIN
    -- 학생 기본 정보 조회
    SELECT s.*, COUNT(ss.id) as session_count
    INTO student_info
    FROM students s
    LEFT JOIN student_sessions ss ON s.id = ss.student_id 
        AND ss.created_at > NOW() - INTERVAL '7 days'
    WHERE s.id = p_student_id
    GROUP BY s.id, s.name, s.class_name, s.email, s.created_at;

    -- 활성 활동 수 조회
    SELECT COUNT(*)
    INTO active_activities
    FROM activities
    WHERE is_active = true;

    -- 체크리스트 진행상황 조회 (최적화된 쿼리)
    SELECT 
        COUNT(*) FILTER (WHERE scp.is_completed = true) as completed,
        COUNT(*) as total
    INTO completed_checklists, total_checklists
    FROM checklist_items ci
    INNER JOIN activities a ON ci.activity_id = a.id AND a.is_active = true
    LEFT JOIN student_checklist_progress scp ON ci.id = scp.checklist_item_id 
        AND scp.student_id = p_student_id;

    -- 최근 채팅 수 조회 (인덱스 활용)
    SELECT COUNT(*)
    INTO recent_chats
    FROM chat_logs
    WHERE student_id = p_student_id 
        AND created_at > NOW() - INTERVAL '7 days';

    -- JSON 결과 구성
    result := json_build_object(
        'student', row_to_json(student_info),
        'stats', json_build_object(
            'active_activities', active_activities,
            'completed_checklists', completed_checklists,
            'total_checklists', total_checklists,
            'progress_percentage', 
                CASE 
                    WHEN total_checklists > 0 
                    THEN ROUND((completed_checklists::DECIMAL / total_checklists) * 100, 1)
                    ELSE 0 
                END,
            'recent_chats', recent_chats,
            'session_count', COALESCE(student_info.session_count, 0)
        )
    );

    RETURN result;
END;
$$;

-- 최적화된 관리자 대시보드 통계 함수
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats(p_time_range TEXT DEFAULT 'day')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    time_filter TIMESTAMP;
    total_students INTEGER;
    online_students INTEGER;
    active_activities INTEGER;
    total_chats INTEGER;
    recent_submissions INTEGER;
    recent_evaluations INTEGER;
BEGIN
    -- 시간 범위 설정
    time_filter := CASE p_time_range
        WHEN 'day' THEN NOW() - INTERVAL '1 day'
        WHEN 'week' THEN NOW() - INTERVAL '7 days'
        WHEN 'month' THEN NOW() - INTERVAL '30 days'
        ELSE NOW() - INTERVAL '1 day'
    END;

    -- 병렬로 통계 수집 (단일 쿼리로 최적화)
    SELECT 
        COUNT(DISTINCT s.id) as total_students,
        COUNT(DISTINCT CASE 
            WHEN ss.is_active = true 
                AND ss.last_activity > NOW() - INTERVAL '30 minutes' 
            THEN s.id 
        END) as online_students,
        COUNT(DISTINCT CASE WHEN a.is_active = true THEN a.id END) as active_activities,
        COUNT(cl.id) FILTER (WHERE cl.created_at > time_filter) as total_chats,
        COUNT(ar.id) FILTER (WHERE ar.is_submitted = true AND ar.submitted_at > time_filter) as recent_submissions,
        COUNT(pe.id) FILTER (WHERE pe.is_completed = true AND pe.completed_at > time_filter) as recent_evaluations
    INTO total_students, online_students, active_activities, total_chats, recent_submissions, recent_evaluations
    FROM students s
    LEFT JOIN student_sessions ss ON s.id = ss.student_id
    LEFT JOIN activities a ON true  -- 크로스 조인으로 활동 수 계산
    LEFT JOIN chat_logs cl ON s.id = cl.student_id
    LEFT JOIN argumentation_responses ar ON s.id = ar.student_id
    LEFT JOIN peer_evaluations pe ON s.id = pe.evaluator_id;

    -- JSON 결과 구성
    result := json_build_object(
        'students', json_build_object(
            'total', total_students,
            'online', online_students,
            'online_percentage', 
                CASE 
                    WHEN total_students > 0 
                    THEN ROUND((online_students::DECIMAL / total_students) * 100, 1)
                    ELSE 0 
                END
        ),
        'activities', json_build_object(
            'active', active_activities
        ),
        'engagement', json_build_object(
            'chats', total_chats,
            'submissions', recent_submissions,
            'evaluations', recent_evaluations
        ),
        'time_range', p_time_range,
        'generated_at', NOW()
    );

    RETURN result;
END;
$$;

-- 최적화된 채팅 히스토리 조회 함수 (페이지네이션 포함)
CREATE OR REPLACE FUNCTION get_chat_history_paginated(
    p_student_id UUID,
    p_activity_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_search_query TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    total_count INTEGER;
    chat_data JSON;
BEGIN
    -- 총 개수 조회 (COUNT 쿼리 최적화)
    SELECT COUNT(*)
    INTO total_count
    FROM chat_logs cl
    WHERE cl.student_id = p_student_id
        AND (p_activity_id IS NULL OR cl.activity_id = p_activity_id)
        AND (p_search_query IS NULL OR cl.message ILIKE '%' || p_search_query || '%');

    -- 채팅 데이터 조회 (인덱스 활용)
    SELECT json_agg(
        json_build_object(
            'id', cl.id,
            'message', cl.message,
            'sender', cl.sender,
            'created_at', cl.created_at,
            'activity_title', a.title
        ) ORDER BY cl.created_at DESC
    )
    INTO chat_data
    FROM chat_logs cl
    LEFT JOIN activities a ON cl.activity_id = a.id
    WHERE cl.student_id = p_student_id
        AND (p_activity_id IS NULL OR cl.activity_id = p_activity_id)
        AND (p_search_query IS NULL OR cl.message ILIKE '%' || p_search_query || '%')
    ORDER BY cl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;

    -- 결과 구성
    result := json_build_object(
        'data', COALESCE(chat_data, '[]'::json),
        'pagination', json_build_object(
            'total', total_count,
            'limit', p_limit,
            'offset', p_offset,
            'has_more', total_count > (p_offset + p_limit)
        )
    );

    RETURN result;
END;
$$;

-- 최적화된 실시간 모니터링 데이터 함수
CREATE OR REPLACE FUNCTION get_realtime_monitoring_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    online_students JSON;
    recent_activities JSON;
    system_stats JSON;
BEGIN
    -- 온라인 학생 목록 (최적화된 쿼리)
    SELECT json_agg(
        json_build_object(
            'id', s.id,
            'name', s.name,
            'class_name', s.class_name,
            'last_activity', ss.last_activity,
            'current_activity', a.title
        ) ORDER BY ss.last_activity DESC
    )
    INTO online_students
    FROM students s
    INNER JOIN student_sessions ss ON s.id = ss.student_id
    LEFT JOIN activities a ON ss.activity_id = a.id
    WHERE ss.is_active = true 
        AND ss.last_activity > NOW() - INTERVAL '30 minutes'
    LIMIT 20;

    -- 최근 활동 (논증 제출, 동료평가 등)
    WITH recent_events AS (
        SELECT 'submission' as event_type, s.name as student_name, a.title as activity_title, ar.submitted_at as event_time
        FROM argumentation_responses ar
        JOIN students s ON ar.student_id = s.id
        JOIN activities a ON ar.activity_id = a.id
        WHERE ar.is_submitted = true AND ar.submitted_at > NOW() - INTERVAL '1 hour'
        
        UNION ALL
        
        SELECT 'evaluation' as event_type, s.name as student_name, a.title as activity_title, pe.completed_at as event_time
        FROM peer_evaluations pe
        JOIN students s ON pe.evaluator_id = s.id
        JOIN activities a ON pe.activity_id = a.id
        WHERE pe.is_completed = true AND pe.completed_at > NOW() - INTERVAL '1 hour'
    )
    SELECT json_agg(
        json_build_object(
            'event_type', event_type,
            'student_name', student_name,
            'activity_title', activity_title,
            'event_time', event_time
        ) ORDER BY event_time DESC
    )
    INTO recent_activities
    FROM recent_events
    LIMIT 10;

    -- 시스템 통계
    SELECT json_build_object(
        'total_students', (SELECT COUNT(*) FROM students),
        'active_sessions', (SELECT COUNT(*) FROM student_sessions WHERE is_active = true),
        'active_activities', (SELECT COUNT(*) FROM activities WHERE is_active = true),
        'today_chats', (SELECT COUNT(*) FROM chat_logs WHERE created_at > CURRENT_DATE),
        'database_size', pg_size_pretty(pg_database_size(current_database()))
    )
    INTO system_stats;

    -- 최종 결과
    result := json_build_object(
        'online_students', COALESCE(online_students, '[]'::json),
        'recent_activities', COALESCE(recent_activities, '[]'::json),
        'system_stats', system_stats,
        'generated_at', NOW()
    );

    RETURN result;
END;
$$;

-- 최적화된 학생 성과 분석 함수
CREATE OR REPLACE FUNCTION analyze_student_performance(p_student_id UUID, p_activity_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    chat_stats JSON;
    submission_stats JSON;
    evaluation_stats JSON;
    progress_stats JSON;
BEGIN
    -- 채팅 통계
    SELECT json_build_object(
        'total_messages', COUNT(*),
        'avg_message_length', ROUND(AVG(LENGTH(message)), 1),
        'most_active_day', mode() WITHIN GROUP (ORDER BY DATE(created_at)),
        'first_chat', MIN(created_at),
        'last_chat', MAX(created_at)
    )
    INTO chat_stats
    FROM chat_logs
    WHERE student_id = p_student_id
        AND (p_activity_id IS NULL OR activity_id = p_activity_id);

    -- 논증 제출 통계
    SELECT json_build_object(
        'total_submissions', COUNT(*),
        'avg_content_length', ROUND(AVG(LENGTH(content)), 1),
        'submission_rate', ROUND(
            COUNT(*) FILTER (WHERE is_submitted = true)::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100, 1
        )
    )
    INTO submission_stats
    FROM argumentation_responses
    WHERE student_id = p_student_id
        AND (p_activity_id IS NULL OR activity_id = p_activity_id);

    -- 동료평가 통계
    SELECT json_build_object(
        'evaluations_given', COUNT(*) FILTER (WHERE is_completed = true),
        'avg_score_given', ROUND(AVG(score) FILTER (WHERE is_completed = true), 1),
        'evaluations_received', (
            SELECT COUNT(*) 
            FROM peer_evaluations pe2 
            JOIN argumentation_responses ar ON pe2.target_response_id = ar.id
            WHERE ar.student_id = p_student_id AND pe2.is_completed = true
        )
    )
    INTO evaluation_stats
    FROM peer_evaluations
    WHERE evaluator_id = p_student_id
        AND (p_activity_id IS NULL OR activity_id = p_activity_id);

    -- 진행상황 통계
    SELECT json_build_object(
        'completed_items', COUNT(*) FILTER (WHERE scp.is_completed = true),
        'total_items', COUNT(*),
        'completion_rate', ROUND(
            COUNT(*) FILTER (WHERE scp.is_completed = true)::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100, 1
        )
    )
    INTO progress_stats
    FROM checklist_items ci
    LEFT JOIN student_checklist_progress scp ON ci.id = scp.checklist_item_id 
        AND scp.student_id = p_student_id
    WHERE (p_activity_id IS NULL OR ci.activity_id = p_activity_id);

    -- 최종 결과
    result := json_build_object(
        'student_id', p_student_id,
        'activity_id', p_activity_id,
        'chat_stats', chat_stats,
        'submission_stats', submission_stats,
        'evaluation_stats', evaluation_stats,
        'progress_stats', progress_stats,
        'analyzed_at', NOW()
    );

    RETURN result;
END;
$$;

-- 캐시된 통계를 위한 materialized view 생성
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_stats AS
SELECT 
    DATE(created_at) as stat_date,
    COUNT(DISTINCT student_id) as active_students,
    COUNT(*) as total_chats,
    AVG(LENGTH(message)) as avg_message_length,
    COUNT(DISTINCT activity_id) as activities_used
FROM chat_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY stat_date DESC;

-- 인덱스 추가
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(stat_date);

-- 자동 새로고침을 위한 함수
CREATE OR REPLACE FUNCTION refresh_daily_stats()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_stats;
END;
$$;

-- 권한 설정
GRANT EXECUTE ON FUNCTION get_student_dashboard_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_history_paginated(UUID, UUID, INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_realtime_monitoring_data() TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_student_performance(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_daily_stats() TO authenticated;

-- 함수 설명 추가
COMMENT ON FUNCTION get_student_dashboard_data(UUID) IS '학생 대시보드용 최적화된 데이터 조회';
COMMENT ON FUNCTION get_admin_dashboard_stats(TEXT) IS '관리자 대시보드용 통계 데이터 조회';
COMMENT ON FUNCTION get_chat_history_paginated(UUID, UUID, INTEGER, INTEGER, TEXT) IS '페이지네이션된 채팅 히스토리 조회';
COMMENT ON FUNCTION get_realtime_monitoring_data() IS '실시간 모니터링용 데이터 조회';
COMMENT ON FUNCTION analyze_student_performance(UUID, UUID) IS '학생 성과 분석 데이터 조회';