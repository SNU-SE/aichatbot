import { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { supabase } from '../../lib/supabase';
import { 
  useRealtimeStudentSessions, 
  useRealtimeArgumentationSubmissions,
  useRealtimePeerEvaluations 
} from '../../hooks/useRealtime';
import { useNotifications } from '../common/NotificationSystem';

interface OnlineStudent {
  id: string;
  name: string;
  class_name?: string;
  last_activity: string;
  current_activity?: string;
}

interface RecentChatMessage {
  id: string;
  student_name: string;
  message: string;
  created_at: string;
  activity_title?: string;
}

interface ActivityAlert {
  id: string;
  type: 'submission' | 'evaluation' | 'session';
  student_name: string;
  activity_title?: string;
  timestamp: string;
}

export default function RealTimeMonitor() {
  const [onlineStudents, setOnlineStudents] = useState<OnlineStudent[]>([]);
  const [recentMessages, setRecentMessages] = useState<RecentChatMessage[]>([]);
  const [activityAlerts, setActivityAlerts] = useState<ActivityAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const { showInfo, showSuccess } = useNotifications();

  // 실시간 훅들
  const { sessionUpdates, isConnected: sessionConnected } = useRealtimeStudentSessions();
  const { submissions, clearSubmissions } = useRealtimeArgumentationSubmissions();
  const { evaluations, clearEvaluations } = useRealtimePeerEvaluations();

  // 온라인 학생 목록 가져오기
  const fetchOnlineStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('student_sessions')
        .select(`
          student_id,
          last_activity,
          students (
            id,
            name,
            class_name
          )
        `)
        .eq('is_active', true)
        .gte('last_activity', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // 30분 이내
        .order('last_activity', { ascending: false });

      if (error) throw error;

      const students: OnlineStudent[] = data?.map(session => ({
        id: session.students.id,
        name: session.students.name,
        class_name: session.students.class_name,
        last_activity: session.last_activity,
      })) || [];

      setOnlineStudents(students);
    } catch (error) {
      console.error('Error fetching online students:', error);
    }
  };

  // 최근 채팅 메시지 가져오기
  const fetchRecentMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_logs')
        .select(`
          id,
          message,
          created_at,
          students (
            name
          ),
          activities (
            title
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const messages: RecentChatMessage[] = data?.map(log => ({
        id: log.id,
        student_name: log.students?.name || '알 수 없음',
        message: log.message,
        created_at: log.created_at,
        activity_title: log.activities?.title,
      })) || [];

      setRecentMessages(messages);
    } catch (error) {
      console.error('Error fetching recent messages:', error);
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
    return `${Math.floor(diffInMinutes / 1440)}일 전`;
  };

  const getAlertIcon = (type: ActivityAlert['type']) => {
    switch (type) {
      case 'submission':
        return '📝';
      case 'evaluation':
        return '⭐';
      case 'session':
        return '👤';
      default:
        return '📢';
    }
  };

  const getAlertMessage = (alert: ActivityAlert) => {
    switch (alert.type) {
      case 'submission':
        return `${alert.student_name}이 논증문을 제출했습니다`;
      case 'evaluation':
        return `${alert.student_name}이 동료평가를 완료했습니다`;
      case 'session':
        return `${alert.student_name}이 접속했습니다`;
      default:
        return '새로운 활동이 있습니다';
    }
  };

  // 실시간 업데이트 처리
  useEffect(() => {
    if (sessionUpdates.length > 0) {
      fetchOnlineStudents();
    }
  }, [sessionUpdates]);

  useEffect(() => {
    if (submissions.length > 0) {
      submissions.forEach(async (submission) => {
        try {
          // 학생 정보 가져오기
          const { data: student } = await supabase
            .from('students')
            .select('name')
            .eq('id', submission.student_id)
            .single();

          // 활동 정보 가져오기
          const { data: activity } = await supabase
            .from('activities')
            .select('title')
            .eq('id', submission.activity_id)
            .single();

          const alert: ActivityAlert = {
            id: `submission-${submission.id}`,
            type: 'submission',
            student_name: student?.name || '알 수 없음',
            activity_title: activity?.title,
            timestamp: submission.submitted_at || new Date().toISOString(),
          };

          setActivityAlerts(prev => [alert, ...prev.slice(0, 9)]);

          // 알림 표시
          showSuccess(
            '새 논증문 제출',
            `${student?.name || '학생'}이 ${activity?.title || '활동'}에 논증문을 제출했습니다.`
          );
        } catch (error) {
          console.error('Error processing submission:', error);
        }
      });
      clearSubmissions();
    }
  }, [submissions, clearSubmissions, showSuccess]);

  useEffect(() => {
    if (evaluations.length > 0) {
      evaluations.forEach(async (evaluation) => {
        try {
          // 평가자 정보 가져오기
          const { data: evaluator } = await supabase
            .from('students')
            .select('name')
            .eq('id', evaluation.evaluator_id)
            .single();

          // 활동 정보 가져오기
          const { data: activity } = await supabase
            .from('activities')
            .select('title')
            .eq('id', evaluation.activity_id)
            .single();

          const alert: ActivityAlert = {
            id: `evaluation-${evaluation.id}`,
            type: 'evaluation',
            student_name: evaluator?.name || '알 수 없음',
            activity_title: activity?.title,
            timestamp: evaluation.completed_at || new Date().toISOString(),
          };

          setActivityAlerts(prev => [alert, ...prev.slice(0, 9)]);

          // 알림 표시
          showInfo(
            '동료평가 완료',
            `${evaluator?.name || '학생'}이 ${activity?.title || '활동'}의 동료평가를 완료했습니다.`
          );
        } catch (error) {
          console.error('Error processing evaluation:', error);
        }
      });
      clearEvaluations();
    }
  }, [evaluations, clearEvaluations, showInfo]);

  useEffect(() => {
    setIsConnected(sessionConnected);
  }, [sessionConnected]);

  useEffect(() => {
    // 초기 데이터 로드
    fetchOnlineStudents();
    fetchRecentMessages();

    // 주기적으로 데이터 새로고침
    const interval = setInterval(() => {
      fetchOnlineStudents();
      fetchRecentMessages();
    }, 30000); // 30초마다

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 온라인 학생들 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>온라인 학생</CardTitle>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm text-gray-500">
                {isConnected ? '연결됨' : '연결 끊김'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {onlineStudents.length > 0 ? (
              onlineStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-500">{student.class_name || '미지정'}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="success" size="sm">온라인</Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {getTimeAgo(student.last_activity)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">현재 온라인인 학생이 없습니다.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 최근 채팅 메시지 */}
      <Card>
        <CardHeader>
          <CardTitle>실시간 채팅 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentMessages.length > 0 ? (
              recentMessages.map((message) => (
                <div key={message.id} className="border-l-4 border-primary-200 pl-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{message.student_name}</span>
                    <span className="text-xs text-gray-500">
                      {getTimeAgo(message.created_at)}
                    </span>
                  </div>
                  {message.activity_title && (
                    <p className="text-xs text-gray-500 mb-1">
                      활동: {message.activity_title}
                    </p>
                  )}
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {message.message}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">최근 채팅 메시지가 없습니다.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 실시간 활동 알림 */}
      <Card>
        <CardHeader>
          <CardTitle>실시간 활동 알림</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {activityAlerts.length > 0 ? (
              activityAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-lg">{getAlertIcon(alert.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900">
                      {getAlertMessage(alert)}
                    </p>
                    {alert.activity_title && (
                      <p className="text-xs text-blue-700 mt-1">
                        활동: {alert.activity_title}
                      </p>
                    )}
                    <p className="text-xs text-blue-600 mt-1">
                      {getTimeAgo(alert.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">최근 활동 알림이 없습니다.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}