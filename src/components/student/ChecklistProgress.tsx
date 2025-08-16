import { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { useChecklistItems } from '../../hooks/useActivities';
import { useCurrentStudent } from '../../hooks/useStudents';
import { supabase } from '../../lib/supabase';

interface ChecklistProgressProps {
  activityId: string;
  className?: string;
}

interface ChecklistItemWithProgress {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  is_required: boolean;
  is_completed: boolean;
  completed_at?: string;
}

export default function ChecklistProgress({ activityId, className }: ChecklistProgressProps) {
  const [checklistProgress, setChecklistProgress] = useState<ChecklistItemWithProgress[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  const { data: student } = useCurrentStudent();
  const { data: checklistItems, isLoading } = useChecklistItems(activityId);

  // 체크리스트 진행상황 로드
  useEffect(() => {
    if (student && checklistItems) {
      loadChecklistProgress();
    }
  }, [student, checklistItems]);

  const loadChecklistProgress = async () => {
    if (!student || !checklistItems) return;

    try {
      const { data: progressData, error } = await supabase
        .from('student_checklist_progress')
        .select('checklist_item_id, is_completed, completed_at')
        .eq('student_id', student.id);

      if (error) throw error;

      const progressMap = new Map(
        progressData?.map(p => [p.checklist_item_id, p]) || []
      );

      const itemsWithProgress: ChecklistItemWithProgress[] = checklistItems.map(item => {
        const progress = progressMap.get(item.id);
        return {
          ...item,
          is_completed: progress?.is_completed || false,
          completed_at: progress?.completed_at,
        };
      });

      setChecklistProgress(itemsWithProgress);
    } catch (error) {
      console.error('Error loading checklist progress:', error);
    }
  };

  const toggleItemCompletion = async (itemId: string) => {
    if (!student || isUpdating) return;

    setIsUpdating(itemId);
    
    try {
      const currentItem = checklistProgress.find(item => item.id === itemId);
      if (!currentItem) return;

      const newCompletedState = !currentItem.is_completed;
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('student_checklist_progress')
        .upsert({
          student_id: student.id,
          checklist_item_id: itemId,
          is_completed: newCompletedState,
          completed_at: newCompletedState ? now : null,
        });

      if (error) throw error;

      // 로컬 상태 업데이트
      setChecklistProgress(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { 
                ...item, 
                is_completed: newCompletedState,
                completed_at: newCompletedState ? now : undefined
              }
            : item
        )
      );

    } catch (error) {
      console.error('Error updating checklist progress:', error);
      alert('체크리스트 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(null);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>체크리스트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!checklistItems || checklistItems.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>체크리스트</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            이 활동에는 체크리스트가 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalItems = checklistProgress.length;
  const completedCount = checklistProgress.filter(item => item.is_completed).length;
  const progressPercentage = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>체크리스트</CardTitle>
          <Badge variant={progressPercentage === 100 ? 'success' : 'info'}>
            {completedCount}/{totalItems} 완료
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* 진행률 바 */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>진행률</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* 체크리스트 항목들 */}
        <div className="space-y-3">
          {checklistProgress
            .sort((a, b) => a.order_index - b.order_index)
            .map((item) => {
              const isUpdatingThis = isUpdating === item.id;
              
              return (
                <div
                  key={item.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                    item.is_completed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() => toggleItemCompletion(item.id)}
                    disabled={isUpdatingThis}
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      item.is_completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-primary-500'
                    } ${isUpdatingThis ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isUpdatingThis ? (
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : item.is_completed ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : null}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4
                        className={`font-medium ${
                          item.is_completed
                            ? 'text-green-900 line-through'
                            : 'text-gray-900'
                        }`}
                      >
                        {item.title}
                      </h4>
                      {item.is_required && (
                        <Badge variant="error" size="sm">
                          필수
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p
                        className={`text-sm mt-1 ${
                          item.is_completed ? 'text-green-700' : 'text-gray-600'
                        }`}
                      >
                        {item.description}
                      </p>
                    )}
                    {item.completed_at && (
                      <p className="text-xs text-green-600 mt-1">
                        완료: {new Date(item.completed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* 완료 상태 메시지 */}
        {progressPercentage === 100 && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-green-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-green-800 font-medium">
                모든 체크리스트를 완료했습니다! 🎉
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}