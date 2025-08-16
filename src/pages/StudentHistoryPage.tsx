import { useState } from 'react';
import Layout from '../components/layout/Layout';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useCurrentStudent } from '../hooks/useStudents';
import { useChatHistory } from '../hooks/useChat';

// 아이콘 컴포넌트들
const ClipboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

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

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export default function StudentHistoryPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'activities' | 'evaluations'>('chat');
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');

  const { data: student } = useCurrentStudent();
  const { data: chatHistory } = useChatHistory(student?.id || '');

  const sidebarItems = [
    { label: '대시보드', href: '/student', icon: <BookIcon /> },
    { label: 'AI 채팅', href: '/student/chat', icon: <ChatIcon /> },
    { label: '내 프로필', href: '/student/profile', icon: <UserIcon /> },
    { label: '활동 기록', href: '/student/history', icon: <ClipboardIcon /> },
  ];

  const getFilteredChatHistory = () => {
    if (!chatHistory) return [];

    if (timeFilter === 'all') return chatHistory;

    const now = new Date();
    const filterDate = timeFilter === 'week' 
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return chatHistory.filter(chat => new Date(chat.created_at) >= filterDate);
  };

  const filteredChatHistory = getFilteredChatHistory();

  const getTimeFilterLabel = (filter: string) => {
    switch (filter) {
      case 'all': return '전체';
      case 'week': return '최근 1주일';
      case 'month': return '최근 1개월';
      default: return filter;
    }
  };

  const headerActions = (
    <div className="flex space-x-2">
      <Button variant="outline" size="sm">
        내보내기
      </Button>
    </div>
  );

  return (
    <Layout
      title="활동 기록"
      subtitle="나의 학습 활동 기록을 확인할 수 있습니다"
      headerActions={headerActions}
      sidebarItems={sidebarItems}
      showSidebar={true}
    >
      {/* 탭 네비게이션 */}
      <Card className="mb-6">
        <CardContent padding="none">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { key: 'chat', label: 'AI 채팅 기록', count: chatHistory?.length || 0 },
                { key: 'activities', label: '활동 기록', count: 0 },
                { key: 'evaluations', label: '동료평가 기록', count: 0 },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.key
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.label}</span>
                  <Badge variant="info" size="sm">{tab.count}</Badge>
                </button>
              ))}
            </nav>
          </div>
        </CardContent>
      </Card>

      {/* 필터 */}
      <Card className="mb-6">
        <CardContent>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">기간 필터</h3>
            <div className="flex space-x-2">
              {(['all', 'week', 'month'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={timeFilter === filter ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setTimeFilter(filter)}
                >
                  {getTimeFilterLabel(filter)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI 채팅 기록 탭 */}
      {activeTab === 'chat' && (
        <Card>
          <CardHeader>
            <CardTitle>AI 채팅 기록</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredChatHistory.length > 0 ? (
              <div className="space-y-4">
                {filteredChatHistory.map((chat) => (
                  <div key={chat.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <CalendarIcon />
                        <span className="text-sm text-gray-600">
                          {new Date(chat.created_at).toLocaleString()}
                        </span>
                      </div>
                      <Badge variant="info" size="sm">AI 채팅</Badge>
                    </div>
                    
                    <div className="space-y-3">
                      {/* 사용자 질문 */}
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
                        <div className="flex items-center mb-1">
                          <UserIcon />
                          <span className="ml-2 text-sm font-medium text-blue-900">내 질문</span>
                        </div>
                        <p className="text-blue-800 text-sm">{chat.message}</p>
                      </div>
                      
                      {/* AI 응답 */}
                      <div className="bg-gray-50 border-l-4 border-gray-400 p-3">
                        <div className="flex items-center mb-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="ml-2 text-sm font-medium text-gray-900">AI 응답</span>
                        </div>
                        <p className="text-gray-800 text-sm whitespace-pre-wrap">{chat.response}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ChatIcon />
                <p className="text-gray-500 mt-4">
                  {timeFilter === 'all' 
                    ? '아직 AI 채팅 기록이 없습니다.' 
                    : `${getTimeFilterLabel(timeFilter)} 동안의 채팅 기록이 없습니다.`
                  }
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  AI와 대화를 시작해보세요!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 활동 기록 탭 */}
      {activeTab === 'activities' && (
        <Card>
          <CardHeader>
            <CardTitle>활동 기록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <BookIcon />
              <p className="text-gray-500 mt-4">아직 완료한 활동이 없습니다.</p>
              <p className="text-sm text-gray-400 mt-2">
                활동을 완료하면 여기에 기록이 표시됩니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 동료평가 기록 탭 */}
      {activeTab === 'evaluations' && (
        <Card>
          <CardHeader>
            <CardTitle>동료평가 기록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <ClipboardIcon />
              <p className="text-gray-500 mt-4">아직 완료한 동료평가가 없습니다.</p>
              <p className="text-sm text-gray-400 mt-2">
                동료평가를 완료하면 여기에 기록이 표시됩니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 통계 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {filteredChatHistory.length}
              </div>
              <div className="text-sm text-gray-600">
                {getTimeFilterLabel(timeFilter)} 채팅 수
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">완료한 활동</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600">동료평가 완료</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}