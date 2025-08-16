import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import StreamingChatInterface from '../components/student/StreamingChatInterface';
import ChecklistProgress from '../components/student/ChecklistProgress';
import EnhancedFileUpload from '../components/student/EnhancedFileUpload';
import ArgumentationEditor from '../components/student/ArgumentationEditor';
import PeerEvaluation from '../components/student/PeerEvaluation';
import { useActivity } from '../hooks/useActivities';
import { useSessionManager } from '../hooks/useSessionManager';
import { useAuth } from '../hooks/useAuth';

export default function StudentActivityPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 세션 관리
  useSessionManager({
    studentId: user?.id,
    activityId,
  });
  
  const { data: activity, isLoading, error } = useActivity(activityId || '');

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'argumentation':
        return '논증 활동';
      case 'discussion':
        return '토론 활동';
      case 'experiment':
        return '실험 활동';
      default:
        return type;
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'argumentation':
        return 'info';
      case 'discussion':
        return 'warning';
      case 'experiment':
        return 'success';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Layout title="활동 로딩 중..." showSidebar={false}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !activity) {
    return (
      <Layout title="활동을 찾을 수 없습니다" showSidebar={false}>
        <Card>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">요청하신 활동을 찾을 수 없습니다.</p>
              <Button onClick={() => navigate('/student')}>
                대시보드로 돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const headerActions = (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        onClick={() => navigate('/student')}
      >
        대시보드로
      </Button>
      <Button>
        활동 완료
      </Button>
    </div>
  );

  return (
    <Layout
      title={activity.title}
      subtitle={getActivityTypeLabel(activity.type)}
      headerActions={headerActions}
      showSidebar={false}
    >
      {/* 활동 정보 카드 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>활동 정보</CardTitle>
            <Badge variant={getActivityTypeColor(activity.type) as any}>
              {getActivityTypeLabel(activity.type)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">
            {activity.description}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 체크리스트 */}
        <div className="lg:col-span-1">
          <ChecklistProgress activityId={activity.id} />
          
          {/* 파일 업로드 */}
          <div className="mt-6">
            <EnhancedFileUpload 
              onFileProcessed={(fileName) => {
                console.log('File processed:', fileName);
                // 파일 처리 완료 알림 등 추가 로직
              }}
              maxFiles={5}
              showPreview={true}
            />
          </div>
        </div>

        {/* AI 채팅 인터페이스 */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>AI 학습 도우미</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-0">
                <StreamingChatInterface activityId={activity.id} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 활동별 특별 섹션 */}
      {activity.type === 'argumentation' && (
        <div className="mt-6 space-y-6">
          <ArgumentationEditor activityId={activity.id} />
          <PeerEvaluation activityId={activity.id} />
        </div>
      )}

      {activity.type === 'discussion' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>토론 참여</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">토론 기능은 개발 중입니다.</p>
              <p className="text-sm text-gray-400">
                곧 실시간 토론 기능을 제공할 예정입니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {activity.type === 'experiment' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>실험 기록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  실험 가설
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="실험 가설을 작성하세요..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  실험 과정 및 관찰 내용
                </label>
                <textarea
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="실험 과정과 관찰한 내용을 자세히 기록하세요..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  실험 결과 및 결론
                </label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="실험 결과와 결론을 작성하세요..."
                />
              </div>
              <div className="flex justify-between">
                <Button variant="outline">
                  임시저장
                </Button>
                <Button>
                  실험 보고서 제출
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
}