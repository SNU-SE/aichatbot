-- 분석용 데이터베이스 함수들
-- 교육 플랫폼의 다양한 메트릭을 계산하고 분석합니다.

-- 애플리케이션 로그 테이블 생성
CREATE TABLE IF NOT EXISTS application_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level INTEGER NOT NULL, -- 0: DEBUG, 1: INFO, 2: WARN, 3: ERROR
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    user_agent TEXT,
    url TEXT,
    stack TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 로그 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_application_logs_timestamp ON application_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_application_logs_level ON application_logs(level);
CREATE INDEX IF NOT EXISTS idx_application_logs_category ON application_logs(category);
CREATE INDEX IF NOT EXISTS idx_application_logs_user_id ON application_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_application_logs_session_id ON application_logs(session_id);

-- 사용자 참여도 메트릭 함수
CREATE OR REPLACE FUNCTION get_user_engagement_metrics(start_date TIMESTAMPTZ)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    total_users INTEGER;
    active_users INTEGER;
    avg_session_duration NUMERIC;
    bounce_rate NUMERIC;
BEGIN
    -- 총 사용자 수
    SELECT COUNT(DISTINCT id) INTO total_users
    FROM students
    WHERE created_at >= start_date;

    -- 활성 사용자 수 (기간 내 로그인한 사용자)
    SELECT COUNT(DISTINCT user_id) INTO active_users
    FROM application_logs
    WHERE timestamp >= start_date
    AND category = 'USER_ACTION'
    AND user_id IS NOT NULL;

    -- 평균 세션 시간 (초)
    SELECT AVG(
        EXTRACT(EPOCH FROM (
            MAX(timestamp) - MIN(timestamp)
        ))
    ) INTO avg_session_duration
    FROM application_logs
    WHERE timestamp >= start_date
    AND session_id IS NOT NULL
    GROUP BY session_id;

    -- 이탈률 계산 (단일 페이지 방문 세션 비율)
    WITH session_page_counts AS (
        SELECT 
            session_id,
            COUNT(DISTINCT url) as page_count
        FROM application_logs
        WHERE timestamp >= start_date
        AND category = 'USER_ACTION'
        AND data->>'action' = 'page_visit'
        AND session_id IS NOT NULL
        GROUP BY session_id
    )
    SELECT 
        COALESCE(
            COUNT(*) FILTER (WHERE page_count = 1)::NUMERIC / 
            NULLIF(COUNT(*), 0), 
            0
        ) INTO bounce_rate
    FROM session_page_counts;

    -- 결과 JSON 구성
    result := json_build_object(
        'totalUsers', COALESCE(total_users, 0),
        'activeUsers', COALESCE(active_users, 0),
        'averageSessionDuration', COALESCE(avg_session_duration, 0),
        'bounceRate', COALESCE(bounce_rate, 0)
    );

    RETURN result;
END;
$$;

-- 교육 효과 메트릭 함수
CREATE OR REPLACE FUNCTION get_educational_metrics(start_date TIMESTAMPTZ)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    total_activities INTEGER;
    completion_rate NUMERIC;
    avg_score NUMERIC;
    submission_rate NUMERIC;
BEGIN
    -- 총 활동 수
    SELECT COUNT(*) INTO total_activities
    FROM activities
    WHERE created_at >= start_date
    AND is_active = true;

    -- 완료율 계산
    WITH activity_completions AS (
        SELECT 
            scp.student_id,
            scp.activity_id,
            COUNT(*) as completed_items,
            (
                SELECT COUNT(*) 
                FROM checklist_items ci 
                WHERE ci.activity_id = scp.activity_id
            ) as total_items
        FROM student_checklist_progress scp
        WHERE scp.is_completed = true
        AND scp.completed_at >= start_date
        GROUP BY scp.student_id, scp.activity_id
    )
    SELECT 
        COALESCE(
            AVG(
                CASE 
                    WHEN total_items > 0 
                    THEN completed_items::NUMERIC / total_items 
                    ELSE 0 
                END
            ), 
            0
        ) INTO completion_rate
    FROM activity_completions;

    -- 평균 점수 (동료평가 점수 기준)
    SELECT COALESCE(AVG(score), 0) INTO avg_score
    FROM peer_evaluations
    WHERE completed_at >= start_date
    AND is_completed = true;

    -- 제출률 (논증문 제출률)
    WITH submission_stats AS (
        SELECT 
            COUNT(*) as total_responses,
            COUNT(*) FILTER (WHERE is_submitted = true) as submitted_responses
        FROM argumentation_responses
        WHERE created_at >= start_date
    )
    SELECT 
        COALESCE(
            submitted_responses::NUMERIC / NULLIF(total_responses, 0), 
            0
        ) INTO submission_rate
    FROM submission_stats;

    -- 결과 JSON 구성
    result := json_build_object(
        'totalActivities', COALESCE(total_activities, 0),
        'completionRate', COALESCE(completion_rate, 0),
        'averageScore', COALESCE(avg_score, 0),
        'submissionRate', COALESCE(submission_rate, 0)
    );

    RETURN result;
END;
$$;

-- 채팅 분석 메트릭 함수
CREATE OR REPLACE FUNCTION get_chat_analytics(start_date TIMESTAMPTZ)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    total_messages INTEGER;
    avg_response_time NUMERIC;
    most_asked_questions JSON;
    topic_distribution JSON;
BEGIN
    -- 총 메시지 수
    SELECT COUNT(*) INTO total_messages
    FROM chat_logs
    WHERE created_at >= start_date;

    -- 평균 응답 시간 (AI 응답까지의 시간, 초 단위)
    WITH response_times AS (
        SELECT 
            student_id,
            activity_id,
            created_at,
            LAG(created_at) OVER (
                PARTITION BY student_id, activity_id 
                ORDER BY created_at
            ) as prev_message_time
        FROM chat_logs
        WHERE created_at >= start_date
        AND sender = 'ai'
    )
    SELECT 
        COALESCE(
            AVG(EXTRACT(EPOCH FROM (created_at - prev_message_time))), 
            0
        ) INTO avg_response_time
    FROM response_times
    WHERE prev_message_time IS NOT NULL;

    -- 자주 묻는 질문 (질문 빈도 테이블 활용)
    SELECT json_agg(
        json_build_object(
            'question', question_text,
            'count', frequency
        ) ORDER BY frequency DESC
    ) INTO most_asked_questions
    FROM (
        SELECT 
            LEFT(question_text, 100) as question_text,
            frequency
        FROM question_frequency
        WHERE updated_at >= start_date
        ORDER BY frequency DESC
        LIMIT 10
    ) top_questions;

    -- 주제별 분포 (활동 타입별 메시지 분포)
    WITH topic_stats AS (
        SELECT 
            COALESCE(a.type, 'general') as topic,
            COUNT(cl.*) as message_count
        FROM chat_logs cl
        LEFT JOIN activities a ON cl.activity_id = a.id
        WHERE cl.created_at >= start_date
        GROUP BY COALESCE(a.type, 'general')
    ),
    total_topic_messages AS (
        SELECT SUM(message_count) as total FROM topic_stats
    )
    SELECT json_agg(
        json_build_object(
            'topic', topic,
            'percentage', ROUND(
                (message_count::NUMERIC / total) * 100, 1
            )
        ) ORDER BY message_count DESC
    ) INTO topic_distribution
    FROM topic_stats, total_topic_messages;

    -- 결과 JSON 구성
    result := json_build_object(
        'totalMessages', COALESCE(total_messages, 0),
        'averageResponseTime', COALESCE(avg_response_time, 0),
        'mostAskedQuestions', COALESCE(most_asked_questions, '[]'::json),
        'topicDistribution', COALESCE(topic_distribution, '[]'::json)
    );

    RETURN result;
END;
$$;

-- 성능 메트릭 함수
CREATE OR REPLACE FUNCTION get_performance_metrics(start_date TIMESTAMPTZ)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    avg_load_time NUMERIC;
    error_rate NUMERIC;
    avg_api_response_time NUMERIC;
    system_uptime NUMERIC;
BEGIN
    -- 평균 로드 시간 (성능 로그에서)
    SELECT COALESCE(AVG((data->>'value')::NUMERIC), 0) INTO avg_load_time
    FROM application_logs
    WHERE timestamp >= start_date
    AND category = 'PERFORMANCE'
    AND data->>'metric' = 'page_load_time';

    -- 에러율 계산
    WITH error_stats AS (
        SELECT 
            COUNT(*) as total_logs,
            COUNT(*) FILTER (WHERE level >= 3) as error_logs
        FROM application_logs
        WHERE timestamp >= start_date
    )
    SELECT 
        COALESCE(
            error_logs::NUMERIC / NULLIF(total_logs, 0), 
            0
        ) INTO error_rate
    FROM error_stats;

    -- 평균 API 응답 시간
    SELECT COALESCE(AVG((data->>'duration')::NUMERIC), 0) INTO avg_api_response_time
    FROM application_logs
    WHERE timestamp >= start_date
    AND category = 'API_CALL'
    AND data->>'duration' IS NOT NULL;

    -- 시스템 가동률 (에러가 없는 시간 비율)
    WITH uptime_stats AS (
        SELECT 
            COUNT(*) as total_intervals,
            COUNT(*) FILTER (
                WHERE NOT EXISTS (
                    SELECT 1 FROM application_logs al2 
                    WHERE al2.level >= 3 
                    AND al2.timestamp BETWEEN 
                        application_logs.timestamp AND 
                        application_logs.timestamp + INTERVAL '1 hour'
                )
            ) as uptime_intervals
        FROM (
            SELECT DISTINCT DATE_TRUNC('hour', timestamp) as timestamp
            FROM application_logs
            WHERE timestamp >= start_date
        ) application_logs
    )
    SELECT 
        COALESCE(
            uptime_intervals::NUMERIC / NULLIF(total_intervals, 0), 
            1
        ) INTO system_uptime
    FROM uptime_stats;

    -- 결과 JSON 구성
    result := json_build_object(
        'averageLoadTime', COALESCE(avg_load_time, 0),
        'errorRate', COALESCE(error_rate, 0),
        'apiResponseTime', COALESCE(avg_api_response_time, 0),
        'systemUptime', COALESCE(system_uptime, 1)
    );

    RETURN result;
END;
$$;

-- 학습 패턴 분석 함수
CREATE OR REPLACE FUNCTION analyze_learning_patterns(p_student_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    activity_preferences JSON;
    time_patterns JSON;
    engagement_trends JSON;
BEGIN
    -- 활동 선호도 분석
    WITH activity_stats AS (
        SELECT 
            a.type,
            COUNT(cl.id) as message_count,
            AVG(EXTRACT(EPOCH FROM (cl.created_at - lag(cl.created_at) OVER (
                PARTITION BY cl.student_id, cl.activity_id 
                ORDER BY cl.created_at
            )))) as avg_interaction_interval
        FROM chat_logs cl
        JOIN activities a ON cl.activity_id = a.id
        WHERE (p_student_id IS NULL OR cl.student_id = p_student_id)
        AND cl.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY a.type
    )
    SELECT json_agg(
        json_build_object(
            'activityType', type,
            'messageCount', message_count,
            'avgInteractionInterval', COALESCE(avg_interaction_interval, 0)
        ) ORDER BY message_count DESC
    ) INTO activity_preferences
    FROM activity_stats;

    -- 시간대별 활동 패턴
    WITH hourly_activity AS (
        SELECT 
            EXTRACT(HOUR FROM created_at) as hour,
            COUNT(*) as activity_count
        FROM application_logs
        WHERE (p_student_id IS NULL OR user_id = p_student_id)
        AND category = 'USER_ACTION'
        AND timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY EXTRACT(HOUR FROM created_at)
    )
    SELECT json_agg(
        json_build_object(
            'hour', hour,
            'activityCount', activity_count
        ) ORDER BY hour
    ) INTO time_patterns
    FROM hourly_activity;

    -- 참여도 트렌드 (일별)
    WITH daily_engagement AS (
        SELECT 
            DATE(timestamp) as date,
            COUNT(DISTINCT session_id) as sessions,
            COUNT(*) as total_actions,
            COUNT(DISTINCT user_id) as active_users
        FROM application_logs
        WHERE (p_student_id IS NULL OR user_id = p_student_id)
        AND category = 'USER_ACTION'
        AND timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(timestamp)
        ORDER BY DATE(timestamp)
    )
    SELECT json_agg(
        json_build_object(
            'date', date,
            'sessions', sessions,
            'totalActions', total_actions,
            'activeUsers', active_users
        ) ORDER BY date
    ) INTO engagement_trends
    FROM daily_engagement;

    -- 결과 JSON 구성
    result := json_build_object(
        'activityPreferences', COALESCE(activity_preferences, '[]'::json),
        'timePatterns', COALESCE(time_patterns, '[]'::json),
        'engagementTrends', COALESCE(engagement_trends, '[]'::json),
        'analyzedAt', NOW()
    );

    RETURN result;
END;
$$;

-- 교육 효과 상세 분석 함수
CREATE OR REPLACE FUNCTION analyze_educational_effectiveness(p_activity_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    completion_analysis JSON;
    score_distribution JSON;
    improvement_suggestions JSON;
BEGIN
    -- 완료도 분석
    WITH completion_stats AS (
        SELECT 
            a.id,
            a.title,
            a.type,
            COUNT(DISTINCT scp.student_id) as students_started,
            COUNT(DISTINCT CASE WHEN scp.is_completed THEN scp.student_id END) as students_completed,
            AVG(CASE WHEN scp.is_completed THEN 
                EXTRACT(EPOCH FROM (scp.completed_at - scp.created_at)) / 3600 
            END) as avg_completion_time_hours
        FROM activities a
        LEFT JOIN student_checklist_progress scp ON a.id = scp.activity_id
        WHERE (p_activity_id IS NULL OR a.id = p_activity_id)
        AND a.is_active = true
        GROUP BY a.id, a.title, a.type
    )
    SELECT json_agg(
        json_build_object(
            'activityId', id,
            'title', title,
            'type', type,
            'studentsStarted', students_started,
            'studentsCompleted', students_completed,
            'completionRate', CASE 
                WHEN students_started > 0 
                THEN ROUND((students_completed::NUMERIC / students_started) * 100, 1)
                ELSE 0 
            END,
            'avgCompletionTimeHours', COALESCE(avg_completion_time_hours, 0)
        )
    ) INTO completion_analysis
    FROM completion_stats;

    -- 점수 분포 분석
    WITH score_stats AS (
        SELECT 
            pe.activity_id,
            a.title,
            COUNT(*) as total_evaluations,
            AVG(pe.score) as avg_score,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pe.score) as median_score,
            MIN(pe.score) as min_score,
            MAX(pe.score) as max_score,
            STDDEV(pe.score) as score_stddev
        FROM peer_evaluations pe
        JOIN activities a ON pe.activity_id = a.id
        WHERE (p_activity_id IS NULL OR pe.activity_id = p_activity_id)
        AND pe.is_completed = true
        GROUP BY pe.activity_id, a.title
    )
    SELECT json_agg(
        json_build_object(
            'activityId', activity_id,
            'title', title,
            'totalEvaluations', total_evaluations,
            'avgScore', ROUND(avg_score, 1),
            'medianScore', ROUND(median_score, 1),
            'minScore', min_score,
            'maxScore', max_score,
            'scoreStddev', ROUND(score_stddev, 2)
        )
    ) INTO score_distribution
    FROM score_stats;

    -- 개선 제안 생성
    WITH improvement_data AS (
        SELECT 
            a.id,
            a.title,
            CASE 
                WHEN completion_rate < 0.5 THEN 'low_completion'
                WHEN avg_score < 60 THEN 'low_scores'
                WHEN score_stddev > 20 THEN 'high_variance'
                ELSE 'good_performance'
            END as issue_type,
            completion_rate,
            avg_score,
            score_stddev
        FROM (
            SELECT 
                a.id,
                a.title,
                COUNT(DISTINCT scp.student_id) as students_started,
                COUNT(DISTINCT CASE WHEN scp.is_completed THEN scp.student_id END) as students_completed,
                CASE 
                    WHEN COUNT(DISTINCT scp.student_id) > 0 
                    THEN (COUNT(DISTINCT CASE WHEN scp.is_completed THEN scp.student_id END)::NUMERIC / COUNT(DISTINCT scp.student_id))
                    ELSE 0 
                END as completion_rate,
                COALESCE(AVG(pe.score), 0) as avg_score,
                COALESCE(STDDEV(pe.score), 0) as score_stddev
            FROM activities a
            LEFT JOIN student_checklist_progress scp ON a.id = scp.activity_id
            LEFT JOIN peer_evaluations pe ON a.id = pe.activity_id AND pe.is_completed = true
            WHERE (p_activity_id IS NULL OR a.id = p_activity_id)
            AND a.is_active = true
            GROUP BY a.id, a.title
        ) a
    )
    SELECT json_agg(
        json_build_object(
            'activityId', id,
            'title', title,
            'issueType', issue_type,
            'suggestion', CASE issue_type
                WHEN 'low_completion' THEN '완료율이 낮습니다. 활동 난이도나 지침을 검토해보세요.'
                WHEN 'low_scores' THEN '평균 점수가 낮습니다. 학습 자료나 설명을 보강해보세요.'
                WHEN 'high_variance' THEN '점수 편차가 큽니다. 평가 기준을 명확히 하거나 추가 지원을 제공해보세요.'
                ELSE '좋은 성과를 보이고 있습니다. 현재 방식을 유지하세요.'
            END
        )
    ) INTO improvement_suggestions
    FROM improvement_data;

    -- 결과 JSON 구성
    result := json_build_object(
        'completionAnalysis', COALESCE(completion_analysis, '[]'::json),
        'scoreDistribution', COALESCE(score_distribution, '[]'::json),
        'improvementSuggestions', COALESCE(improvement_suggestions, '[]'::json),
        'analyzedAt', NOW()
    );

    RETURN result;
END;
$$;

-- 권한 설정
GRANT SELECT, INSERT ON application_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_engagement_metrics(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_educational_metrics(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_analytics(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_metrics(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_learning_patterns(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_educational_effectiveness(UUID) TO authenticated;

-- RLS 정책 설정
ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;

-- 관리자는 모든 로그 조회 가능
CREATE POLICY "Admins can view all logs" ON application_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 사용자는 자신의 로그만 조회 가능
CREATE POLICY "Users can view own logs" ON application_logs
    FOR SELECT USING (user_id = auth.uid());

-- 모든 인증된 사용자는 로그 삽입 가능
CREATE POLICY "Authenticated users can insert logs" ON application_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 함수 설명 추가
COMMENT ON FUNCTION get_user_engagement_metrics(TIMESTAMPTZ) IS '사용자 참여도 메트릭 조회';
COMMENT ON FUNCTION get_educational_metrics(TIMESTAMPTZ) IS '교육 효과 메트릭 조회';
COMMENT ON FUNCTION get_chat_analytics(TIMESTAMPTZ) IS '채팅 분석 메트릭 조회';
COMMENT ON FUNCTION get_performance_metrics(TIMESTAMPTZ) IS '성능 메트릭 조회';
COMMENT ON FUNCTION analyze_learning_patterns(UUID) IS '학습 패턴 분석';
COMMENT ON FUNCTION analyze_educational_effectiveness(UUID) IS '교육 효과 상세 분석';