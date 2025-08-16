-- 성능 최적화를 위한 인덱스 생성
-- 이 마이그레이션은 자주 사용되는 쿼리의 성능을 향상시킵니다.

-- 학생 관련 인덱스
CREATE INDEX IF NOT EXISTS idx_students_class_name ON students(class_name);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at DESC);
-- 한국어 텍스트 검색을 위한 인덱스 (simple 설정 사용)
CREATE INDEX IF NOT EXISTS idx_students_name_search ON students USING gin(to_tsvector('simple', name));

-- 학생 세션 관련 인덱스 (실시간 모니터링용)
CREATE INDEX IF NOT EXISTS idx_student_sessions_active ON student_sessions(is_active, last_activity DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_student_sessions_student_id ON student_sessions(student_id, created_at DESC);
-- activity_id 컬럼이 student_sessions 테이블에 없으므로 인덱스 제거

-- 활동 관련 인덱스
CREATE INDEX IF NOT EXISTS idx_activities_active ON activities(is_active, created_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_title_search ON activities USING gin(to_tsvector('simple', title));

-- 체크리스트 관련 인덱스
CREATE INDEX IF NOT EXISTS idx_checklist_items_activity ON checklist_items(activity_id, order_index);
CREATE INDEX IF NOT EXISTS idx_student_checklist_progress_composite ON student_checklist_progress(student_id, checklist_item_id);
CREATE INDEX IF NOT EXISTS idx_student_checklist_progress_completed ON student_checklist_progress(is_completed, completed_at DESC) WHERE is_completed = true;

-- 채팅 로그 관련 인덱스 (성능 중요)
CREATE INDEX IF NOT EXISTS idx_chat_logs_student_activity ON chat_logs(student_id, activity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_logs_message_search ON chat_logs USING gin(to_tsvector('simple', message));

-- 논증 응답 관련 인덱스
CREATE INDEX IF NOT EXISTS idx_argumentation_responses_student_activity ON argumentation_responses(student_id, activity_id);
CREATE INDEX IF NOT EXISTS idx_argumentation_responses_submitted ON argumentation_responses(is_submitted, submitted_at DESC) WHERE is_submitted = true;
CREATE INDEX IF NOT EXISTS idx_argumentation_responses_content_search ON argumentation_responses USING gin(to_tsvector('simple', content));

-- 동료평가 관련 인덱스
CREATE INDEX IF NOT EXISTS idx_peer_evaluations_evaluator ON peer_evaluations(evaluator_id, activity_id);
CREATE INDEX IF NOT EXISTS idx_peer_evaluations_target ON peer_evaluations(target_id, activity_id);
CREATE INDEX IF NOT EXISTS idx_peer_evaluations_completed ON peer_evaluations(is_completed, completed_at DESC) WHERE is_completed = true;

-- 파일 관련 인덱스
CREATE INDEX IF NOT EXISTS idx_file_uploads_student ON file_uploads(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_uploads_activity ON file_uploads(activity_id, created_at DESC) WHERE activity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_file_uploads_type ON file_uploads(file_type, created_at DESC);

-- 질문 빈도 관련 인덱스 (AI 분석용)
CREATE INDEX IF NOT EXISTS idx_question_frequency_question ON question_frequency(question_hash, frequency DESC);
CREATE INDEX IF NOT EXISTS idx_question_frequency_activity ON question_frequency(activity_id, frequency DESC) WHERE activity_id IS NOT NULL;

-- 복합 인덱스 (자주 함께 사용되는 조건들)
CREATE INDEX IF NOT EXISTS idx_chat_logs_recent_by_student ON chat_logs(student_id, created_at DESC) WHERE created_at > NOW() - INTERVAL '7 days';
CREATE INDEX IF NOT EXISTS idx_student_sessions_recent_active ON student_sessions(student_id, is_active, last_activity DESC) WHERE last_activity > NOW() - INTERVAL '1 hour';

-- 부분 인덱스 (조건부 인덱스로 크기 최적화)
CREATE INDEX IF NOT EXISTS idx_activities_recent_active ON activities(created_at DESC) WHERE is_active = true AND created_at > NOW() - INTERVAL '30 days';
CREATE INDEX IF NOT EXISTS idx_chat_logs_recent ON chat_logs(created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';

-- 함수 기반 인덱스 (계산된 값에 대한 인덱스)
CREATE INDEX IF NOT EXISTS idx_students_name_lower ON students(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_activities_title_lower ON activities(LOWER(title));

-- 통계 업데이트 (쿼리 플래너 최적화)
ANALYZE students;
ANALYZE student_sessions;
ANALYZE activities;
ANALYZE checklist_items;
ANALYZE student_checklist_progress;
ANALYZE chat_logs;
ANALYZE argumentation_responses;
ANALYZE peer_evaluations;
ANALYZE file_uploads;
ANALYZE question_frequency;

-- 인덱스 사용량 모니터링을 위한 뷰 생성
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'Unused'
        WHEN idx_scan < 10 THEN 'Low Usage'
        WHEN idx_scan < 100 THEN 'Medium Usage'
        ELSE 'High Usage'
    END as usage_level
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- 테이블 크기 모니터링을 위한 뷰 생성
CREATE OR REPLACE VIEW table_size_stats AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 슬로우 쿼리 모니터링을 위한 설정 (관리자만 실행)
-- ALTER SYSTEM SET log_min_duration_statement = 1000; -- 1초 이상 쿼리 로깅
-- ALTER SYSTEM SET log_statement = 'mod'; -- 수정 쿼리 로깅
-- SELECT pg_reload_conf(); -- 설정 리로드

-- 자동 VACUUM 설정 최적화
ALTER TABLE chat_logs SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE student_sessions SET (
    autovacuum_vacuum_scale_factor = 0.2,
    autovacuum_analyze_scale_factor = 0.1
);

-- 코멘트 추가 (인덱스 목적 설명)
COMMENT ON INDEX idx_students_class_name IS '클래스별 학생 조회 최적화';
COMMENT ON INDEX idx_student_sessions_active IS '온라인 학생 실시간 모니터링 최적화';
COMMENT ON INDEX idx_chat_logs_student_activity IS '학생별 채팅 히스토리 조회 최적화';
COMMENT ON INDEX idx_argumentation_responses_submitted IS '제출된 논증문 목록 조회 최적화';
COMMENT ON INDEX idx_peer_evaluations_completed IS '완료된 동료평가 목록 조회 최적화';