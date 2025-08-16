import { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { useCurrentStudent } from '../../hooks/useStudents';
import { supabase } from '../../lib/supabase';

interface PeerEvaluationProps {
  activityId: string;
  className?: string;
}

interface EvaluationTarget {
  id: string;
  evaluator_id: string;
  target_id: string;
  target_name: string;
  target_title: string;
  target_content: string;
  evaluation_data?: any;
  is_completed: boolean;
  completed_at?: string;
}

interface EvaluationCriteria {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

const defaultCriteria: EvaluationCriteria[] = [
  {
    id: 'clarity',
    name: '명확성',
    description: '주장이 명확하고 이해하기 쉬운가?',
    maxScore: 5,
  },
  {
    id: 'evidence',
    name: '근거의 적절성',
    description: '주장을 뒷받침하는 근거가 적절하고 충분한가?',
    maxScore: 5,
  },
  {
    id: 'logic',
    name: '논리성',
    description: '논리적 흐름이 일관되고 타당한가?',
    maxScore: 5,
  },
  {
    id: 'counterargument',
    name: '반박 고려',
    description: '반대 의견을 적절히 고려하고 대응했는가?',
    maxScore: 5,
  },
  {
    id: 'overall',
    name: '전체적 완성도',
    description: '논증문의 전체적인 완성도는 어떤가?',
    maxScore: 5,
  },
];

export default function PeerEvaluation({ activityId, className }: PeerEvaluationProps) {
  const [evaluationTargets, setEvaluationTargets] = useState<EvaluationTarget[]>([]);
  const [currentEvaluation, setCurrentEvaluation] = useState<EvaluationTarget | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [overallComment, setOverallComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: student } = useCurrentStudent();

  useEffect(() => {
    if (student && activityId) {
      loadEvaluationTargets();
    }
  }, [student, activityId]);

  const loadEvaluationTargets = async () => {
    try {
      const { data, error } = await supabase
        .from('peer_evaluations')
        .select(`
          *,
          target:students!peer_evaluations_target_id_fkey(name),
          target_response:argumentation_responses!peer_evaluations_target_id_fkey(title, content)
        `)
        .eq('evaluator_id', student!.id)
        .eq('activity_id', activityId);

      if (error) throw error;

      const formattedTargets: EvaluationTarget[] = data.map(item => ({
        id: item.id,
        evaluator_id: item.evaluator_id,
        target_id: item.target_id,
        target_name: item.target?.name || '알 수 없음',
        target_title: item.target_response?.title || '제목 없음',
        target_content: item.target_response?.content || '내용 없음',
        evaluation_data: item.evaluation_data,
        is_completed: item.is_completed,
        completed_at: item.completed_at,
      }));

      setEvaluationTargets(formattedTargets);

      // 첫 번째 미완료 평가를 현재 평가로 설정
      const firstIncomplete = formattedTargets.find(target => !target.is_completed);
      if (firstIncomplete) {
        setCurrentEvaluation(firstIncomplete);
        loadEvaluationData(firstIncomplete);
      }

    } catch (error) {
      console.error('Error loading evaluation targets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEvaluationData = (evaluation: EvaluationTarget) => {
    if (evaluation.evaluation_data) {
      setScores(evaluation.evaluation_data.scores || {});
      setComments(evaluation.evaluation_data.comments || {});
      setOverallComment(evaluation.evaluation_data.overallComment || '');
    } else {
      setScores({});
      setComments({});
      setOverallComment('');
    }
  };

  const handleEvaluationSelect = (evaluation: EvaluationTarget) => {
    setCurrentEvaluation(evaluation);
    loadEvaluationData(evaluation);
  };

  const handleScoreChange = (criteriaId: string, score: number) => {
    setScores(prev => ({ ...prev, [criteriaId]: score }));
  };

  const handleCommentChange = (criteriaId: string, comment: string) => {
    setComments(prev => ({ ...prev, [criteriaId]: comment }));
  };

  const handleSubmitEvaluation = async () => {
    if (!currentEvaluation || !student) return;

    // 모든 점수가 입력되었는지 확인
    const missingScores = defaultCriteria.filter(criteria => !scores[criteria.id]);
    if (missingScores.length > 0) {
      alert(`다음 항목의 점수를 입력해주세요: ${missingScores.map(c => c.name).join(', ')}`);
      return;
    }

    if (!overallComment.trim()) {
      alert('전체적인 피드백을 입력해주세요.');
      return;
    }

    if (window.confirm('평가를 제출하시겠습니까? 제출 후에는 수정할 수 없습니다.')) {
      setIsSubmitting(true);
      try {
        const evaluationData = {
          scores,
          comments,
          overallComment,
          submittedAt: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('peer_evaluations')
          .update({
            evaluation_data: evaluationData,
            is_completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq('id', currentEvaluation.id);

        if (error) throw error;

        alert('평가가 성공적으로 제출되었습니다!');
        await loadEvaluationTargets();

        // 다음 미완료 평가로 이동
        const nextIncomplete = evaluationTargets.find(
          target => target.id !== currentEvaluation.id && !target.is_completed
        );
        if (nextIncomplete) {
          setCurrentEvaluation(nextIncomplete);
          loadEvaluationData(nextIncomplete);
        } else {
          setCurrentEvaluation(null);
        }

      } catch (error) {
        console.error('Error submitting evaluation:', error);
        alert('평가 제출 중 오류가 발생했습니다. 다시 시도해주세요.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getTotalScore = () => {
    return Object.values(scores).reduce((sum, score) => sum + score, 0);
  };

  const getMaxTotalScore = () => {
    return defaultCriteria.reduce((sum, criteria) => sum + criteria.maxScore, 0);
  };

  const getCompletedCount = () => {
    return evaluationTargets.filter(target => target.is_completed).length;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-gray-600">동료평가 데이터를 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (evaluationTargets.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>동료평가</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="mb-4">
              <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500">아직 배정된 동료평가가 없습니다.</p>
            <p className="text-sm text-gray-400 mt-2">
              논증문 제출 후 관리자가 동료평가를 배정하면 여기에 표시됩니다.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>동료평가</CardTitle>
          <Badge variant="info">
            {getCompletedCount()}/{evaluationTargets.length} 완료
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* 평가 대상 선택 */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">평가 대상</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {evaluationTargets.map((target) => (
              <button
                key={target.id}
                onClick={() => handleEvaluationSelect(target)}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  currentEvaluation?.id === target.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={target.is_completed}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{target.target_name}</span>
                  <Badge variant={target.is_completed ? 'success' : 'warning'} size="sm">
                    {target.is_completed ? '완료' : '대기'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 truncate">{target.target_title}</p>
              </button>
            ))}
          </div>
        </div>

        {currentEvaluation && (
          <div className="space-y-6">
            {/* 평가 대상 논증문 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">
                {currentEvaluation.target_name}의 논증문
              </h4>
              <h5 className="text-lg font-semibold text-gray-800 mb-3">
                {currentEvaluation.target_title}
              </h5>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed max-h-64 overflow-y-auto">
                  {currentEvaluation.target_content}
                </div>
              </div>
            </div>

            {currentEvaluation.is_completed ? (
              // 완료된 평가 표시
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">제출된 평가</h4>
                  <Badge variant="success">평가 완료</Badge>
                </div>
                
                {/* 점수 표시 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {defaultCriteria.map((criteria) => (
                    <div key={criteria.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900">{criteria.name}</span>
                        <span className="text-lg font-bold text-primary-600">
                          {scores[criteria.id] || 0}/{criteria.maxScore}
                        </span>
                      </div>
                      {comments[criteria.id] && (
                        <p className="text-sm text-gray-600">{comments[criteria.id]}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-medium text-blue-900 mb-2">전체 피드백</h5>
                  <p className="text-blue-800">{overallComment}</p>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    총점: {getTotalScore()}/{getMaxTotalScore()}
                  </div>
                  <div className="text-sm text-gray-500">
                    완료일: {currentEvaluation.completed_at ? new Date(currentEvaluation.completed_at).toLocaleString() : '알 수 없음'}
                  </div>
                </div>
              </div>
            ) : (
              // 평가 작성 폼
              <div className="space-y-6">
                <h4 className="font-medium text-gray-900">평가 작성</h4>
                
                {/* 평가 기준별 점수 */}
                <div className="space-y-4">
                  {defaultCriteria.map((criteria) => (
                    <div key={criteria.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <h5 className="font-medium text-gray-900">{criteria.name}</h5>
                          <p className="text-sm text-gray-600">{criteria.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary-600">
                            {scores[criteria.id] || 0}/{criteria.maxScore}
                          </div>
                        </div>
                      </div>
                      
                      {/* 점수 선택 */}
                      <div className="flex space-x-2 mb-3">
                        {Array.from({ length: criteria.maxScore }, (_, i) => i + 1).map((score) => (
                          <button
                            key={score}
                            onClick={() => handleScoreChange(criteria.id, score)}
                            className={`w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors ${
                              scores[criteria.id] === score
                                ? 'border-primary-500 bg-primary-500 text-white'
                                : 'border-gray-300 text-gray-600 hover:border-primary-300'
                            }`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>

                      {/* 세부 코멘트 */}
                      <textarea
                        value={comments[criteria.id] || ''}
                        onChange={(e) => handleCommentChange(criteria.id, e.target.value)}
                        placeholder="이 항목에 대한 구체적인 피드백을 작성해주세요 (선택사항)"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                  ))}
                </div>

                {/* 전체 피드백 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    전체적인 피드백 *
                  </label>
                  <textarea
                    value={overallComment}
                    onChange={(e) => setOverallComment(e.target.value)}
                    placeholder="논증문에 대한 전체적인 피드백을 작성해주세요. 좋은 점과 개선할 점을 균형있게 제시해주세요."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>

                {/* 현재 총점 */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold text-gray-900">
                    현재 총점: {getTotalScore()}/{getMaxTotalScore()}
                  </div>
                </div>

                {/* 제출 버튼 */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmitEvaluation}
                    disabled={getTotalScore() === 0 || !overallComment.trim() || isSubmitting}
                    loading={isSubmitting}
                  >
                    평가 제출
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 평가 가이드 */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h5 className="text-sm font-medium text-yellow-800 mb-2">💡 동료평가 가이드</h5>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• <strong>공정하고 객관적으로:</strong> 개인적 감정이 아닌 논증의 질을 평가하세요</li>
            <li>• <strong>건설적인 피드백:</strong> 비판보다는 개선 방향을 제시하세요</li>
            <li>• <strong>구체적인 근거:</strong> 점수에 대한 구체적인 이유를 설명하세요</li>
            <li>• <strong>균형잡힌 평가:</strong> 좋은 점과 개선할 점을 모두 언급하세요</li>
            <li>• <strong>존중하는 태도:</strong> 상대방을 존중하는 언어를 사용하세요</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}