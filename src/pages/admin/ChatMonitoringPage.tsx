import { useState } from 'react';
import Layout from '../../components/layout/Layout';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { useChatStatistics, useQuestionFrequency } from '../../hooks/useChat';
import { useStudents } from '../../hooks/useStudents';

// 아이콘 컴포넌트들
const ChatIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function ChatMonitoringPage() {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: chatStats, isLoading: statsLoading } = useChatStatistics(timeRange);
  const { data: questionFrequency, isLoading: frequencyLoading } = useQuestionFrequency();
  const { data: students } = useStudents();

  const sidebarItems = [
    { label: '대시보드', href: '/admin', icon: <ChatIcon /> },
    { label: '학생 관리', href: '/admin/students', icon: <UsersIcon /> },
    { label: '활동 관리', href: '/admin/activities', icon: <ChatIcon /> },
    { label: '채팅 모니터링', href: '/admin/chat', icon: <ChatIcon /> },
    { label: 'AI 설정', href: '/admin/settings', icon: <ChatIcon /> },
  ];

  const filteredQuestions = questionFrequency?.filter(item =>
    item.question_text.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case 'day':
        return '오늘';
      case 'week':
        return '이번 주';
      case 'month':
        return '이번 달';
      default:
        return range;
    }
  };

  const headerActions = (
    <div className="flex space-x-2">
      <Button variant="outline" size="sm">
        데이터 내보내기
      </Button>
      <Button size="sm">
        실시간 모니터링
      </Button>
    </div>
  );

  return (
    <Layout
      title="채팅 모니터링"
      subtitle="AI 채팅 활동을 실시간으로 모니터링합니다"
      headerActions={headerActions}
      sidebarItems={sidebarItems}
      showSidebar={true}
    >
      {/* 시간 범위 선택 */}
      <Card className="mb-6">
        <CardContent>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">통계 기간</h3>
            <div className="flex space-x-2">
              {(['day', 'week', 'month'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                >
                  {getTimeRangeLabel(range)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChatIcon />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 메시지</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? '...' : chatStats?.totalMessages || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUpIcon />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">사용된 토큰</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? '...' : (chatStats?.totalTokens || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">활성 사용자</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? '...' : chatStats?.uniqueStudents || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">평균 토큰/메시지</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? '...' : chatStats?.averageTokensPerMessage || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 모델 사용량 */}
        <Card>
          <CardHeader>
            <CardTitle>AI 모델 사용량</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">데이터를 불러오는 중...</p>
              </div>
            ) : chatStats?.modelUsage ? (
              <div className="space-y-4">
                {Object.entries(chatStats.modelUsage).map(([model, count]) => (
                  <div key={model} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-primary-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-gray-900">{model}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{count}회</span>
                      <Badge variant="info" size="sm">
                        {Math.round((count / chatStats.totalMessages) * 100)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>

        {/* 일별 활동 */}
        <Card>
          <CardHeader>
            <CardTitle>일별 채팅 활동</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">데이터를 불러오는 중...</p>
              </div>
            ) : chatStats?.dailyActivity ? (
              <div className="space-y-3">
                {Object.entries(chatStats.dailyActivity)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .slice(0, 7)
                  .map(([date, count]) => (
                    <div key={date} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {new Date(date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min((count / Math.max(...Object.values(chatStats.dailyActivity))) * 100, 100)}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 자주 묻는 질문 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>자주 묻는 질문</CardTitle>
            <Input
              placeholder="질문 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          {frequencyLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">질문 데이터를 불러오는 중...</p>
            </div>
          ) : filteredQuestions.length > 0 ? (
            <div className="space-y-4">
              {filteredQuestions.slice(0, 10).map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        {item.question_text}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>빈도: {item.frequency_count}회</span>
                        <span>
                          마지막 질문: {new Date(item.last_asked).toLocaleDateString()}
                        </span>
                        {item.students && (
                          <span>질문자: {item.students.name}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="info" size="sm">
                      {item.frequency_count}회
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ChatIcon />
              <p className="text-gray-500 mt-2">
                {searchTerm ? '검색 결과가 없습니다.' : '질문 데이터가 없습니다.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}