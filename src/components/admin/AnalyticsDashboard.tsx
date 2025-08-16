import { useState, useMemo } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';

// 분석 데이터 타입 정의
interface AnalyticsData {
  userEngagement: {
    totalUsers: number;
    activeUsers: number;
    averageSessionDuration: number;
    bounceRate: number;
  };
  educationalMetrics: {
    totalActivities: number;
    completionRate: number;
    averageScore: number;
    submissionRate: number;
  };
  chatAnalytics: {
    totalMessages: number;
    averageResponseTime: number;
    mostAskedQuestions: Array<{ question: string; count: number }>;
    topicDistribution: Array<{ topic: string; percentage: number }>;
  };
  performanceMetrics: {
    averageLoadTime: number;
    errorRate: number;
    apiResponseTime: number;
    systemUptime: number;
  };
}

interface TimeRange {
  label: string;
  value: string;
  days: number;
}

const timeRanges: TimeRange[] = [
  { label: '지난 7일', value: '7d', days: 7 },
  { label: '지난 30일', value: '30d', days: 30 },
  { label: '지난 90일', value: '90d', days: 90 },
  { label: '지난 1년', value: '1y', days: 365 },
];

export default function AnalyticsDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(timeRanges[1]);
  const [selectedMetric, setSelectedMetric] = useState<'engagement' | 'education' | 'chat' | 'performance'>('engagement');

  // 분석 데이터 조회
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['analytics', selectedTimeRange.value],
    queryFn: () => fetchAnalyticsData(selectedTimeRange.days),
    refetchInterval: 5 * 60 * 1000, // 5분마다 새로고침
  });

  // 차트 데이터 생성
  const chartData = useMemo(() => {
    if (!analyticsData) return null;

    switch (selectedMetric) {
      case 'engagement':
        return {
          labels: ['총 사용자', '활성 사용자', '세션 시간(분)', '이탈률(%)'],
          data: [
            analyticsData.userEngagement.totalUsers,
            analyticsData.userEngagement.activeUsers,
            Math.round(analyticsData.userEngagement.averageSessionDuration / 60),
            Math.round(analyticsData.userEngagement.bounceRate * 100),
          ],
        };
      case 'education':
        return {
          labels: ['총 활동', '완료율(%)', '평균 점수', '제출률(%)'],
          data: [
            analyticsData.educationalMetrics.totalActivities,
            Math.round(analyticsData.educationalMetrics.completionRate * 100),
            Math.round(analyticsData.educationalMetrics.averageScore),
            Math.round(analyticsData.educationalMetrics.submissionRate * 100),
          ],
        };
      case 'chat':
        return {
          labels: ['총 메시지', '응답시간(초)', '질문 유형', '주제 분포'],
          data: [
            analyticsData.chatAnalytics.totalMessages,
            Math.round(analyticsData.chatAnalytics.averageResponseTime),
            analyticsData.chatAnalytics.mostAskedQuestions.length,
            analyticsData.chatAnalytics.topicDistribution.length,
          ],
        };
      case 'performance':
        return {
          labels: ['로드시간(초)', '에러율(%)', 'API응답(ms)', '가동률(%)'],
          data: [
            Math.round(analyticsData.performanceMetrics.averageLoadTime / 1000),
            Math.round(analyticsData.performanceMetrics.errorRate * 100),
            Math.round(analyticsData.performanceMetrics.apiResponseTime),
            Math.round(analyticsData.performanceMetrics.systemUptime * 100),
          ],
        };
      default:
        return null;
    }
  }, [analyticsData, selectedMetric]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="ml-2">분석 데이터를 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">분석 데이터를 불러오는 중 오류가 발생했습니다.</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 및 필터 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">분석 대시보드</h1>
          <p className="text-gray-600">플랫폼 사용 현황 및 교육 효과 분석</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {timeRanges.map((range) => (
            <Button
              key={range.value}
              variant={selectedTimeRange.value === range.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeRange(range)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 메트릭 선택 탭 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'engagement', label: '사용자 참여도' },
            { key: 'education', label: '교육 효과' },
            { key: 'chat', label: '채팅 분석' },
            { key: 'performance', label: '성능 지표' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedMetric(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedMetric === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {analyticsData && (
        <>
          {/* 주요 지표 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {chartData?.labels.map((label, index) => (
              <Card key={label}>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">{label}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {chartData.data[index].toLocaleString()}
                      </p>
                    </div>
                    <div className="ml-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        getMetricColor(selectedMetric, index)
                      }`}>
                        {getMetricIcon(selectedMetric, index)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 상세 분석 섹션 */}
          {selectedMetric === 'engagement' && (
            <UserEngagementAnalysis data={analyticsData.userEngagement} />
          )}
          
          {selectedMetric === 'education' && (
            <EducationalAnalysis data={analyticsData.educationalMetrics} />
          )}
          
          {selectedMetric === 'chat' && (
            <ChatAnalysis data={analyticsData.chatAnalytics} />
          )}
          
          {selectedMetric === 'performance' && (
            <PerformanceAnalysis data={analyticsData.performanceMetrics} />
          )}
        </>
      )}
    </div>
  );
}

// 사용자 참여도 분석 컴포넌트
function UserEngagementAnalysis({ data }: { data: AnalyticsData['userEngagement'] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>사용자 활동 패턴</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">활성 사용자 비율</span>
              <span className="font-medium">
                {Math.round((data.activeUsers / data.totalUsers) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-500 h-2 rounded-full" 
                style={{ width: `${(data.activeUsers / data.totalUsers) * 100}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">평균 세션 시간</span>
              <span className="font-medium">
                {Math.round(data.averageSessionDuration / 60)}분
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">이탈률</span>
              <span className="font-medium text-red-600">
                {Math.round(data.bounceRate * 100)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>참여도 개선 제안</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.bounceRate > 0.5 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  높은 이탈률이 감지되었습니다. 초기 사용자 경험을 개선해보세요.
                </p>
              </div>
            )}
            
            {data.averageSessionDuration < 300 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  세션 시간이 짧습니다. 더 매력적인 콘텐츠를 제공해보세요.
                </p>
              </div>
            )}
            
            {(data.activeUsers / data.totalUsers) > 0.7 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  훌륭한 사용자 참여도입니다! 현재 전략을 유지하세요.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 교육 효과 분석 컴포넌트
function EducationalAnalysis({ data }: { data: AnalyticsData['educationalMetrics'] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>학습 성과 지표</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">활동 완료율</span>
                <span className="font-medium">{Math.round(data.completionRate * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${data.completionRate * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">제출률</span>
                <span className="font-medium">{Math.round(data.submissionRate * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${data.submissionRate * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">평균 점수</span>
                <span className="text-2xl font-bold text-primary-600">
                  {Math.round(data.averageScore)}/100
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>교육 효과 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.completionRate > 0.8 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  높은 완료율을 보이고 있습니다. 학습자들이 활동에 잘 참여하고 있어요.
                </p>
              </div>
            )}
            
            {data.averageScore > 80 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  우수한 학습 성과입니다. 현재 교육 방법이 효과적입니다.
                </p>
              </div>
            )}
            
            {data.submissionRate < 0.6 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  제출률이 낮습니다. 과제 난이도나 마감일을 검토해보세요.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 채팅 분석 컴포넌트
function ChatAnalysis({ data }: { data: AnalyticsData['chatAnalytics'] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>자주 묻는 질문 TOP 5</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.mostAskedQuestions.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700 flex-1 mr-2">
                  {item.question}
                </span>
                <span className="text-sm font-medium text-primary-600">
                  {item.count}회
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>주제별 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.topicDistribution.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">{item.topic}</span>
                  <span className="text-sm font-medium">{item.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full" 
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 성능 분석 컴포넌트
function PerformanceAnalysis({ data }: { data: AnalyticsData['performanceMetrics'] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>시스템 성능 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">평균 로드 시간</span>
              <span className={`font-medium ${
                data.averageLoadTime > 3000 ? 'text-red-600' : 
                data.averageLoadTime > 1500 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {(data.averageLoadTime / 1000).toFixed(2)}초
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">에러율</span>
              <span className={`font-medium ${
                data.errorRate > 0.05 ? 'text-red-600' : 
                data.errorRate > 0.02 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {(data.errorRate * 100).toFixed(2)}%
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">API 응답 시간</span>
              <span className={`font-medium ${
                data.apiResponseTime > 1000 ? 'text-red-600' : 
                data.apiResponseTime > 500 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {data.apiResponseTime}ms
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">시스템 가동률</span>
              <span className={`font-medium ${
                data.systemUptime < 0.99 ? 'text-red-600' : 
                data.systemUptime < 0.995 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {(data.systemUptime * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>성능 개선 권장사항</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.averageLoadTime > 3000 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  로드 시간이 느립니다. 이미지 최적화나 캐싱을 검토해보세요.
                </p>
              </div>
            )}
            
            {data.errorRate > 0.05 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  에러율이 높습니다. 로그를 확인하여 문제를 해결해보세요.
                </p>
              </div>
            )}
            
            {data.systemUptime > 0.99 && data.averageLoadTime < 2000 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  시스템이 안정적으로 운영되고 있습니다.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 분석 데이터 조회 함수
async function fetchAnalyticsData(days: number): Promise<AnalyticsData> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // 실제 구현에서는 여러 쿼리를 병렬로 실행
  const [userEngagement, educationalMetrics, chatAnalytics, performanceMetrics] = await Promise.all([
    fetchUserEngagement(startDate),
    fetchEducationalMetrics(startDate),
    fetchChatAnalytics(startDate),
    fetchPerformanceMetrics(startDate),
  ]);

  return {
    userEngagement,
    educationalMetrics,
    chatAnalytics,
    performanceMetrics,
  };
}

// 각 메트릭별 데이터 조회 함수들 (실제 구현)
async function fetchUserEngagement(startDate: Date) {
  const { data } = await supabase.rpc('get_user_engagement_metrics', {
    start_date: startDate.toISOString(),
  });

  return data || {
    totalUsers: 0,
    activeUsers: 0,
    averageSessionDuration: 0,
    bounceRate: 0,
  };
}

async function fetchEducationalMetrics(startDate: Date) {
  const { data } = await supabase.rpc('get_educational_metrics', {
    start_date: startDate.toISOString(),
  });

  return data || {
    totalActivities: 0,
    completionRate: 0,
    averageScore: 0,
    submissionRate: 0,
  };
}

async function fetchChatAnalytics(startDate: Date) {
  const { data } = await supabase.rpc('get_chat_analytics', {
    start_date: startDate.toISOString(),
  });

  return data || {
    totalMessages: 0,
    averageResponseTime: 0,
    mostAskedQuestions: [],
    topicDistribution: [],
  };
}

async function fetchPerformanceMetrics(startDate: Date) {
  const { data } = await supabase.rpc('get_performance_metrics', {
    start_date: startDate.toISOString(),
  });

  return data || {
    averageLoadTime: 0,
    errorRate: 0,
    apiResponseTime: 0,
    systemUptime: 1,
  };
}

// 유틸리티 함수들
function getMetricColor(metric: string, index: number): string {
  const colors = {
    engagement: ['bg-blue-100', 'bg-green-100', 'bg-yellow-100', 'bg-red-100'],
    education: ['bg-purple-100', 'bg-green-100', 'bg-blue-100', 'bg-orange-100'],
    chat: ['bg-indigo-100', 'bg-teal-100', 'bg-pink-100', 'bg-gray-100'],
    performance: ['bg-green-100', 'bg-red-100', 'bg-yellow-100', 'bg-blue-100'],
  };
  
  return colors[metric as keyof typeof colors][index] || 'bg-gray-100';
}

function getMetricIcon(metric: string, index: number): string {
  const icons = {
    engagement: ['👥', '🔥', '⏱️', '📉'],
    education: ['📚', '✅', '⭐', '📝'],
    chat: ['💬', '⚡', '❓', '📊'],
    performance: ['🚀', '⚠️', '📡', '✅'],
  };
  
  return icons[metric as keyof typeof icons][index] || '📊';
}