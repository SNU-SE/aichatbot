import { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { useCurrentStudent } from '../../hooks/useStudents';
import { supabase } from '../../lib/supabase';

interface ArgumentationEditorProps {
  activityId: string;
  className?: string;
}

interface ArgumentationData {
  id?: string;
  title: string;
  content: string;
  is_submitted: boolean;
  submitted_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface DraftData {
  title: string;
  content: string;
  last_saved?: string;
}

export default function ArgumentationEditor({ activityId, className }: ArgumentationEditorProps) {
  const [argumentationData, setArgumentationData] = useState<ArgumentationData>({
    title: '',
    content: '',
    is_submitted: false,
  });
  const [draftData, setDraftData] = useState<DraftData>({
    title: '',
    content: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const { data: student } = useCurrentStudent();

  // 기존 논증 데이터 로드
  useEffect(() => {
    if (student && activityId) {
      loadArgumentationData();
      loadDraftData();
    }
  }, [student, activityId]);

  // 자동 저장 (30초마다)
  useEffect(() => {
    if (!autoSaveEnabled || argumentationData.is_submitted) return;

    const interval = setInterval(() => {
      if (draftData.title.trim() || draftData.content.trim()) {
        saveDraft();
      }
    }, 30000); // 30초

    return () => clearInterval(interval);
  }, [draftData, autoSaveEnabled, argumentationData.is_submitted]);

  const loadArgumentationData = async () => {
    try {
      const { data, error } = await supabase
        .from('argumentation_responses')
        .select('*')
        .eq('student_id', student!.id)
        .eq('activity_id', activityId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setArgumentationData(data);
        setDraftData({
          title: data.title || '',
          content: data.content || '',
        });
      }
    } catch (error) {
      console.error('Error loading argumentation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDraftData = async () => {
    try {
      const { data, error } = await supabase
        .from('student_work_drafts')
        .select('content, updated_at')
        .eq('student_id', student!.id)
        .eq('activity_id', activityId)
        .eq('draft_type', 'argumentation')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data && data.content) {
        try {
          const parsedContent = JSON.parse(data.content);
          if (parsedContent.title || parsedContent.content) {
            setDraftData({
              title: parsedContent.title || '',
              content: parsedContent.content || '',
              last_saved: data.updated_at,
            });
            setLastSaved(data.updated_at);
          }
        } catch (parseError) {
          console.error('Error parsing draft content:', parseError);
        }
      }
    } catch (error) {
      console.error('Error loading draft data:', error);
    }
  };

  const saveDraft = async () => {
    if (!student || isSaving) return;

    setIsSaving(true);
    try {
      const draftContent = JSON.stringify({
        title: draftData.title,
        content: draftData.content,
      });

      const { error } = await supabase
        .from('student_work_drafts')
        .upsert({
          student_id: student.id,
          activity_id: activityId,
          draft_type: 'argumentation',
          content: draftContent,
        });

      if (error) throw error;

      const now = new Date().toISOString();
      setLastSaved(now);
      setDraftData(prev => ({ ...prev, last_saved: now }));

    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!student || !draftData.title.trim() || !draftData.content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    if (window.confirm('논증문을 제출하시겠습니까? 제출 후에는 수정할 수 없습니다.')) {
      setIsSubmitting(true);
      try {
        const submissionData = {
          student_id: student.id,
          activity_id: activityId,
          title: draftData.title,
          content: draftData.content,
          is_submitted: true,
          submitted_at: new Date().toISOString(),
        };

        if (argumentationData.id) {
          // 기존 데이터 업데이트
          const { error } = await supabase
            .from('argumentation_responses')
            .update(submissionData)
            .eq('id', argumentationData.id);

          if (error) throw error;
        } else {
          // 새 데이터 삽입
          const { data, error } = await supabase
            .from('argumentation_responses')
            .insert(submissionData)
            .select()
            .single();

          if (error) throw error;
          setArgumentationData(data);
        }

        // 임시저장 데이터 삭제
        await supabase
          .from('student_work_drafts')
          .delete()
          .eq('student_id', student.id)
          .eq('activity_id', activityId)
          .eq('draft_type', 'argumentation');

        alert('논증문이 성공적으로 제출되었습니다!');
        await loadArgumentationData();

      } catch (error) {
        console.error('Error submitting argumentation:', error);
        alert('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setDraftData(prev => ({ ...prev, title: newTitle }));
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setDraftData(prev => ({ ...prev, content: newContent }));
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getCharCount = (text: string) => {
    return text.length;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-gray-600">논증 데이터를 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>논증문 작성</CardTitle>
          <div className="flex items-center space-x-2">
            {argumentationData.is_submitted ? (
              <Badge variant="success">제출 완료</Badge>
            ) : (
              <Badge variant="warning">작성 중</Badge>
            )}
            {lastSaved && (
              <span className="text-xs text-gray-500">
                마지막 저장: {new Date(lastSaved).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {argumentationData.is_submitted ? (
          // 제출된 논증문 표시
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {argumentationData.title}
              </h3>
              <div className="text-sm text-gray-500 mb-4">
                제출일: {argumentationData.submitted_at ? new Date(argumentationData.submitted_at).toLocaleString() : '알 수 없음'}
              </div>
            </div>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {argumentationData.content}
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                글자 수: {getCharCount(argumentationData.content)} | 
                단어 수: {getWordCount(argumentationData.content)}
              </div>
              <Badge variant="success">제출 완료</Badge>
            </div>
          </div>
        ) : (
          // 논증문 작성 폼
          <div className="space-y-6">
            <Input
              label="논증문 제목"
              value={draftData.title}
              onChange={handleTitleChange}
              placeholder="논증문의 제목을 입력하세요"
              disabled={isSubmitting}
              maxLength={100}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                논증 내용
              </label>
              <textarea
                value={draftData.content}
                onChange={handleContentChange}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                placeholder="논증 내용을 작성하세요...

다음 구조를 참고하세요:
1. 주장 (Claim): 당신의 입장을 명확히 제시
2. 근거 (Evidence): 주장을 뒷받침하는 사실, 데이터, 예시
3. 논증 (Warrant): 근거가 주장을 어떻게 지지하는지 설명
4. 반박 고려 (Counterargument): 반대 의견을 인정하고 대응
5. 결론 (Conclusion): 주장을 재확인하고 요약"
                disabled={isSubmitting}
                maxLength={5000}
              />
              <div className="flex justify-between items-center mt-2">
                <div className="text-sm text-gray-500">
                  글자 수: {getCharCount(draftData.content)}/5000 | 
                  단어 수: {getWordCount(draftData.content)}
                </div>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={autoSaveEnabled}
                      onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                      className="mr-1 h-3 w-3 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    자동 저장
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={saveDraft}
                disabled={isSaving || isSubmitting}
                loading={isSaving}
              >
                임시저장
              </Button>
              
              <Button
                onClick={handleSubmit}
                disabled={!draftData.title.trim() || !draftData.content.trim() || isSubmitting}
                loading={isSubmitting}
              >
                제출하기
              </Button>
            </div>

            {/* 작성 가이드 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">💡 논증문 작성 가이드</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• <strong>명확한 주장:</strong> 당신의 입장을 한 문장으로 명확히 표현하세요</li>
                <li>• <strong>신뢰할 수 있는 근거:</strong> 사실, 통계, 전문가 의견 등을 활용하세요</li>
                <li>• <strong>논리적 연결:</strong> 근거가 주장을 어떻게 지지하는지 설명하세요</li>
                <li>• <strong>반박 고려:</strong> 반대 의견을 인정하고 합리적으로 대응하세요</li>
                <li>• <strong>명확한 결론:</strong> 주장을 재확인하고 핵심 내용을 요약하세요</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}