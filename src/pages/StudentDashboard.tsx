import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useCurrentStudent } from '../hooks/useStudents';
import { useActiveActivities } from '../hooks/useActivities';
import { useChatHistory } from '../hooks/useChat';

// 아이콘 컴포넌트들
const BookIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  const { data: student, isLoading: studentLoading } = useCurrentStudent();
  const { data: activities, isLoading: activitiesLoading } = useActiveActivities();
  const { data: chatHistory } = useChatHistory(student?.id || '');

  const sidebarItems = [
    { label: '대시보드', href: '/student', icon: <BookIcon /> },
    { label: 'AI 채팅', href: '/student/chat', icon: <ChatIcon /> },
    { label: '내 프로필', href: '/student/profile', icon: <UserIcon /> },
    { label: '활동 기록', href: '/student/history', icon: <ClipboardIcon /> },
  ];

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

  if (studentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Layout
      title={`안녕하세요, ${student?.name || '학생'}님!`}
      subtitle="오늘도 즐거운 학습 되세요"
      sidebarItems={sidebarItems}
      showSidebar={true}
    >
      {/* 학생 정보 카드 */}
      <div className="mb-8">
        <Card>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <UserIcon />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{student?.name}</h2>
                <p className="text-gray-600">학번: {student?.student_id}</p>
                <p className="text-gray-600">반: {student?.class_name || '미지정'}</p>
              </div>
              <div className="ml-auto">
                <Badge variant="success">온라인</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{activities?.length || 0}</p>
              <p className="text-sm text-gray-600">사용 가능한 활동</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{chatHistory?.length || 0}</p>
              <p className="text-sm text-gray-600">AI 채팅 기록</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-600">완료한 활동</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 활동 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>사용 가능한 활동</CardTitle>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">활동을 불러오는 중...</p>
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedActivity(activity.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                    <Badge 
                      variant={getActivityTypeColor(activity.type) as any}
                      size="sm"
                    >
                      {getActivityTypeLabel(activity.type)}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {activity.description}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      진행률: 0%
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/student/activity/${activity.id}`);
                      }}
                    >
                      시작하기
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookIcon />
              <p className="text-gray-500 mt-2">현재 사용 가능한 활동이 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 최근 AI 채팅 */}
      {chatHistory && chatHistory.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>최근 AI 채팅</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/student/chat')}
              >
                전체 보기
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chatHistory.slice(-3).map((chat) => (
                <div key={chat.id} className="border-l-4 border-primary-200 pl-4">
                  <p className="text-sm text-gray-600 mb-1">
                    {new Date(chat.created_at).toLocaleString()}
                  </p>
                  <p className="text-gray-900 font-medium mb-2">{chat.message}</p>
                  <p className="text-gray-600 text-sm">{chat.response.substring(0, 100)}...</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
}