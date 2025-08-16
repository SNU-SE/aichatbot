-- Insert default admin settings
INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
('default_ai_model', '"gpt-3.5-turbo"', '기본 AI 모델'),
('default_temperature', '0.7', '기본 AI 온도 설정'),
('default_max_tokens', '1000', '기본 최대 토큰 수'),
('enable_rag', 'true', 'RAG 기능 활성화 여부'),
('max_chat_history', '50', '채팅 기록 최대 보관 수'),
('session_timeout_minutes', '30', '세션 타임아웃 시간(분)'),
('enable_peer_evaluation', 'true', '동료평가 기능 활성화'),
('evaluations_per_student', '2', '학생당 평가 할당 수');

-- Insert default prompt templates
INSERT INTO prompt_templates (name, template, description, variables) VALUES
('argumentation_assistant', 
'당신은 학생들의 논증 활동을 도와주는 AI 교육 도우미입니다. 

학생의 질문: {question}
현재 활동: {activity_title}
학생 이름: {student_name}

다음 지침을 따라 답변해주세요:
1. 학생의 사고를 자극하는 질문을 포함하세요
2. 직접적인 답을 주기보다는 스스로 생각할 수 있도록 안내하세요
3. 논리적 사고와 비판적 사고를 촉진하세요
4. 친근하고 격려하는 톤을 사용하세요

답변:', 
'논증 활동용 기본 프롬프트', 
'["question", "activity_title", "student_name"]'),

('discussion_facilitator',
'당신은 토론 활동을 촉진하는 AI 교육 도우미입니다.

학생의 질문: {question}
토론 주제: {activity_title}
학생 이름: {student_name}

다음 지침을 따라 답변해주세요:
1. 다양한 관점을 제시하여 토론을 활성화하세요
2. 반대 의견도 고려하도록 유도하세요
3. 근거와 증거를 요구하세요
4. 건설적인 토론 문화를 조성하세요

답변:',
'토론 활동용 기본 프롬프트',
'["question", "activity_title", "student_name"]'),

('experiment_guide',
'당신은 실험 활동을 안내하는 AI 교육 도우미입니다.

학생의 질문: {question}
실험 활동: {activity_title}
학생 이름: {student_name}

다음 지침을 따라 답변해주세요:
1. 과학적 사고 과정을 강조하세요
2. 가설 설정과 검증 방법을 안내하세요
3. 관찰과 기록의 중요성을 강조하세요
4. 안전한 실험 진행을 위한 주의사항을 제공하세요

답변:',
'실험 활동용 기본 프롬프트',
'["question", "activity_title", "student_name"]');

-- Insert sample activities
INSERT INTO activities (title, description, type, is_active) VALUES
('기후변화 논증하기', '기후변화의 원인과 해결방안에 대해 논증을 작성하고 동료평가를 진행합니다.', 'argumentation', true),
('인공지능 윤리 토론', '인공지능 기술의 윤리적 문제점에 대해 토론합니다.', 'discussion', true),
('물의 순환 실험', '물의 순환 과정을 실험을 통해 관찰하고 기록합니다.', 'experiment', true);

-- Insert checklist items for the first activity
INSERT INTO checklist_items (activity_id, title, description, order_index, is_required) 
SELECT 
    a.id,
    item.title,
    item.description,
    item.order_index,
    item.is_required
FROM activities a,
(VALUES 
    ('자료 조사하기', '기후변화 관련 신뢰할 수 있는 자료를 3개 이상 찾아보세요.', 1, true),
    ('주장 정리하기', '기후변화에 대한 자신의 주장을 명확히 정리하세요.', 2, true),
    ('근거 수집하기', '주장을 뒷받침할 수 있는 구체적인 근거를 수집하세요.', 3, true),
    ('반박 고려하기', '반대 의견에 대한 반박을 준비하세요.', 4, true),
    ('논증문 작성하기', '완성된 논증문을 작성하여 제출하세요.', 5, true),
    ('동료 평가하기', '다른 학생들의 논증문을 평가하세요.', 6, true),
    ('성찰하기', '동료평가 결과를 바탕으로 자신의 논증을 성찰하세요.', 7, false)
) AS item(title, description, order_index, is_required)
WHERE a.title = '기후변화 논증하기';

-- Insert checklist items for the second activity
INSERT INTO checklist_items (activity_id, title, description, order_index, is_required)
SELECT 
    a.id,
    item.title,
    item.description,
    item.order_index,
    item.is_required
FROM activities a,
(VALUES 
    ('주제 이해하기', '인공지능 윤리 문제에 대해 기본 개념을 학습하세요.', 1, true),
    ('입장 정하기', '토론 주제에 대한 자신의 입장을 명확히 하세요.', 2, true),
    ('논거 준비하기', '자신의 입장을 뒷받침할 논거를 준비하세요.', 3, true),
    ('토론 참여하기', '적극적으로 토론에 참여하세요.', 4, true),
    ('의견 정리하기', '토론 후 자신의 의견 변화를 정리하세요.', 5, true)
) AS item(title, description, order_index, is_required)
WHERE a.title = '인공지능 윤리 토론';

-- Insert checklist items for the third activity
INSERT INTO checklist_items (activity_id, title, description, order_index, is_required)
SELECT 
    a.id,
    item.title,
    item.description,
    item.order_index,
    item.is_required
FROM activities a,
(VALUES 
    ('실험 계획 세우기', '물의 순환 실험 계획을 세우고 가설을 설정하세요.', 1, true),
    ('실험 도구 준비하기', '필요한 실험 도구와 재료를 준비하세요.', 2, true),
    ('실험 수행하기', '계획에 따라 실험을 수행하세요.', 3, true),
    ('관찰 기록하기', '실험 과정과 결과를 자세히 관찰하고 기록하세요.', 4, true),
    ('결과 분석하기', '실험 결과를 분석하고 가설과 비교하세요.', 5, true),
    ('보고서 작성하기', '실험 보고서를 작성하여 제출하세요.', 6, true)
) AS item(title, description, order_index, is_required)
WHERE a.title = '물의 순환 실험';

-- Insert default class prompt settings
INSERT INTO class_prompt_settings (class_name, activity_type, prompt_template, ai_model, temperature, max_tokens)
VALUES 
('기본반', 'argumentation', 
'당신은 학생들의 논증 활동을 도와주는 AI 교육 도우미입니다. 학생이 스스로 생각할 수 있도록 안내하고, 논리적 사고를 촉진하세요.', 
'gpt-3.5-turbo', 0.7, 1000),

('기본반', 'discussion', 
'당신은 토론 활동을 촉진하는 AI 교육 도우미입니다. 다양한 관점을 제시하고 건설적인 토론을 유도하세요.', 
'gpt-3.5-turbo', 0.8, 1000),

('기본반', 'experiment', 
'당신은 실험 활동을 안내하는 AI 교육 도우미입니다. 과학적 사고 과정을 강조하고 안전한 실험을 안내하세요.', 
'gpt-3.5-turbo', 0.6, 1000);

-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', false);

-- Create storage policy for chat files
CREATE POLICY "Users can upload their own files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'chat-files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'chat-files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Admins can view all files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'chat-files' AND 
        is_admin(auth.uid())
    );