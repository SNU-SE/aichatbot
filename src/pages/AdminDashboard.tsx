import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useStudents } from '../hooks/useStudents';
import { useActivities } from '../hooks/useActivities';
import { useChatStatistics } from '../hooks/useChat';
import RealTimeMonitor from '../components/admin/RealTimeMonitor';
import { useSessionCleanup } from '../hooks/useSessionManager';
import { NotificationSystem, useNotifications } from '../components/common/NotificationSystem';

// 아이콘 컴포넌트들
const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const ActivityIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  
  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: activities, isLoading: activitiesLoading } = useActivities();
  const { data: chatStats, isLoading: chatStatsLoading } = useChatStatistics(timeRange);
  
  // 실시간 기능 관련 훅들
  const { startPeriodicCleanup } = useSessionCleanup();
  const { notifications, removeNotification, showInfo } = useNotifications();

  // 세션 정리 시작
  useEffect(() => {
    const cleanup = startPeriodicCleanup(10); // 10분마다 정리
    showInfo('실시간 모니터링', '실시간 모니터링이 시작되었습니다.');
    
    return cleanup;
  }, [startPeriodicCleanup, showInfo]);

  const sidebarItems = [
    { label: '대시보드', href: '/admin', icon: <ActivityIcon /> },
    { label: '학생 관리', href: '/admin/students', icon: <UsersIcon /> },
    { label: '활동 관리', href: '/admin/activities', icon: <ActivityIcon /> },
    { label: '채팅 모니터링', href: '/admin/chat', icon: <ChatIcon /> },
    { label: '파일 관리', href: '/admin/files', icon: <SettingsIcon /> },
    { label: 'AI 설정', href: '/admin/settings', icon: <SettingsIcon /> },
  ];

  const headerActions = (
    <div className="flex space-x-2">
      <Button variant="outline" size="sm">
        내보내기
      </Button>
      <Button size="sm">
        새 활동 만들기
      </Button>
    </div>
  );

  // 통계 카드 데이터
  const stats = [
    {
      title: '전체 학생',
      value: students?.length || 0,
      change: '+12%',
      changeType: 'positive' as const,
      loading: studentsLoading,
    },
    {
      title: '활성 활동',
      value: activities?.filter(a => a.is_active).length || 0,
      change: '+5%',
      changeType: 'positive' as const,
      loading: activitiesLoading,
    },
    {
      title: '오늘 채팅',
      value: chatStats?.totalMessages || 0,
      change: '+23%',
      changeType: 'positive' as const,
      loading: chatStatsLoading,
    },
    {
      title: '활성 사용자',
      value: chatStats?.uniqueStudents || 0,
      change: '+8%',
      changeType: 'positive' as const,
      loading: chatStatsLoading,
    },
  ];

  return (
    <Layout
      title="관리자 대시보드"
      subtitle="AI 교육 플랫폼 관리"
      headerActions={headerActions}
      sidebarItems={sidebarItems}
      showSidebar={true}
    >
      {/* 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.loading ? '...' : stat.value}
                  </p>
                </div>
                <div className="text-right">
                  <Badge 
                    variant={stat.changeType === 'positive' ? 'success' : 'error'}
                    size="sm"
                  >
                    {stat.change}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 최근 활동 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities?.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-500">{activity.type}</p>
                  </div>
                  <Badge variant={activity.is_active ? 'success' : 'default'}>
                    {activity.is_active ? '활성' : '비활성'}
                  </Badge>
                </div>
              ))}
              {(!activities || activities.length === 0) && (
                <p className="text-gray-500 text-center py-4">활동이 없습니다.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 온라인 학생들 */}
        <Card>
          <CardHeader>
            <CardTitle>온라인 학생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {students?.slice(0, 5).map((student) => (
                <div key={student.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-500">{student.class_name || '미지정'}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-gray-500">온라인</span>
                  </div>
                </div>
              ))}
              {(!students || students.length === 0) && (
                <p className="text-gray-500 text-center py-4">등록된 학생이 없습니다.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 채팅 통계 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>채팅 활동 통계</CardTitle>
            <div className="flex space-x-2">
              {(['day', 'week', 'month'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                >
                  {range === 'day' ? '오늘' : range === 'week' ? '이번 주' : '이번 달'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chatStatsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">통계를 불러오는 중...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{chatStats?.totalMessages || 0}</p>
                <p className="text-sm text-gray-500">총 메시지</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{chatStats?.totalTokens || 0}</p>
                <p className="text-sm text-gray-500">사용된 토큰</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{chatStats?.uniqueStudents || 0}</p>
                <p className="text-sm text-gray-500">활성 사용자</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{chatStats?.averageTokensPerMessage || 0}</p>
                <p className="text-sm text-gray-500">평균 토큰/메시지</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 실시간 모니터링 */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">실시간 모니터링</h2>
        <RealTimeMonitor />
      </div>
    </Layout>
  );
}      {/* 
실시간 모니터링 */}
      <div className="mb-8">
        <RealTimeMonitor />
      </div>

      {/* 알림 시스템 */}
      <NotificationSystem 
        notifications={notifications} 
        onClose={removeNotification} 
      />
    </Layout>
  );
}