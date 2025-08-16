import { useState } from 'react';
import Layout from '../components/layout/Layout';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import StreamingChatInterface from '../components/student/StreamingChatInterface';
import FileUploadChat from '../components/student/FileUploadChat';
import { useActiveActivities } from '../hooks/useActivities';

// 아이콘 컴포넌트들
const ChatIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const BookIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

export default function StudentChatPage() {
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);

  const { data: activities } = useActiveActivities();

  const sidebarItems = [
    { label: '대시보드', href: '/student', icon: <BookIcon /> },
    { label: 'AI 채팅', href: '/student/chat', icon: <ChatIcon /> },
    { label: '내 프로필', href: '/student/profile', icon: <UserIcon /> },
    { label: '활동 기록', href: '/student/history', icon: <ClipboardIcon /> },
  ];

  const selectedActivity = activities?.find(a => a.id === selectedActivityId);

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

  const headerActions = (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowFileUpload(!showFileUpload)}
      >
        {showFileUpload ? '파일 업로드 숨기기' : '파일 업로드'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setSelectedActivityId(null)}
        disabled={!selectedActivityId}
      >
        일반 채팅
      </Button>
    </div>
  );

  return (
    <Layout
      title="AI 채팅"
      subtitle={selectedActivity ? `${selectedActivity.title} - ${getActivityTypeLabel(selectedActivity.type)}` : '일반 학습 채팅'}
      headerActions={headerActions}
      sidebarItems={sidebarItems}
      showSidebar={true}
    >
      {/* 활동 선택 */}
      {activities && activities.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>활동 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedActivityId === null ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedActivityId(null)}
              >
                일반 채팅
              </Button>
              {activities.map((activity) => (
                <Button
                  key={activity.id}
                  variant={selectedActivityId === activity.id ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedActivityId(activity.id)}
                >
                  {activity.title}
                </Button>
              ))}
            </div>
            {selectedActivity && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>{selectedActivity.title}</strong>에 대한 맞춤형 AI 도움을 받을 수 있습니다.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {selectedActivity.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 파일 업로드 (선택적 표시) */}
        {showFileUpload && (
          <div className="lg:col-span-1">
            <FileUploadChat 
              onFileProcessed={(fileName) => {
                console.log('File processed:', fileName);
                // 성공 알림 등 추가
              }}
            />
          </div>
        )}

        {/* 채팅 인터페이스 */}
        <div className={showFileUpload ? 'lg:col-span-3' : 'lg:col-span-4'}>
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedActivity 
                  ? `${selectedActivity.title} AI 도우미` 
                  : 'AI 학습 도우미'
                }
              </CardTitle>
            </CardHeader>
            <CardContent padding="none">
              <div className="h-[600px]">
                <StreamingChatInterface 
                  activityId={selectedActivityId || undefined}
                  className="h-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 채팅 가이드 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>💡 효과적인 AI 채팅 가이드</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">좋은 질문 예시</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• "기후변화의 주요 원인 3가지를 설명해주세요"</li>
                <li>• "이 실험에서 변인을 어떻게 통제해야 할까요?"</li>
                <li>• "논증에서 반박 의견을 어떻게 다뤄야 하나요?"</li>
                <li>• "토론에서 상대방 의견을 존중하는 방법은?"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">유용한 기능</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 문서 검색: 업로드한 파일 내용을 참조한 답변</li>
                <li>• 활동별 맞춤 도움: 각 활동에 특화된 AI 지원</li>
                <li>• 대화 기록: 이전 대화 내용을 기억하는 연속 대화</li>
                <li>• 파일 업로드: PDF, 이미지 등 참고 자료 활용</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}