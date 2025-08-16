import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface SessionManagerOptions {
  studentId?: string;
  activityId?: string;
  heartbeatInterval?: number; // 기본값: 30초
}

export function useSessionManager({
  studentId,
  activityId,
  heartbeatInterval = 30000,
}: SessionManagerOptions = {}) {
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // 세션 시작
  const startSession = async () => {
    if (!studentId) return;

    try {
      const { data, error } = await supabase
        .from('student_sessions')
        .upsert({
          student_id: studentId,
          activity_id: activityId,
          is_active: true,
          last_activity: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      sessionIdRef.current = data.id;
      console.log('Session started:', data.id);

      // 하트비트 시작
      startHeartbeat();
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  // 세션 종료
  const endSession = async () => {
    if (!sessionIdRef.current) return;

    try {
      await supabase
        .from('student_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionIdRef.current);

      console.log('Session ended:', sessionIdRef.current);
      sessionIdRef.current = null;

      // 하트비트 중지
      stopHeartbeat();
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  // 하트비트 시작 (주기적으로 활동 상태 업데이트)
  const startHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    heartbeatRef.current = setInterval(async () => {
      if (!sessionIdRef.current) return;

      try {
        await supabase
          .from('student_sessions')
          .update({
            last_activity: new Date().toISOString(),
          })
          .eq('id', sessionIdRef.current);
      } catch (error) {
        console.error('Error updating heartbeat:', error);
      }
    }, heartbeatInterval);
  };

  // 하트비트 중지
  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  // 활동 변경 시 세션 업데이트
  const updateActivity = async (newActivityId?: string) => {
    if (!sessionIdRef.current) return;

    try {
      await supabase
        .from('student_sessions')
        .update({
          activity_id: newActivityId,
          last_activity: new Date().toISOString(),
        })
        .eq('id', sessionIdRef.current);
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  // 컴포넌트 마운트 시 세션 시작
  useEffect(() => {
    if (studentId) {
      startSession();
    }

    return () => {
      endSession();
    };
  }, [studentId]);

  // 활동 변경 시 업데이트
  useEffect(() => {
    if (sessionIdRef.current && activityId !== undefined) {
      updateActivity(activityId);
    }
  }, [activityId]);

  // 페이지 언로드 시 세션 정리
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        // 동기적으로 세션 종료 (페이지 언로드 시)
        navigator.sendBeacon(
          `${supabase.supabaseUrl}/rest/v1/student_sessions?id=eq.${sessionIdRef.current}`,
          JSON.stringify({
            is_active: false,
            ended_at: new Date().toISOString(),
          })
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // 탭이 숨겨질 때 하트비트 중지
        stopHeartbeat();
      } else if (document.visibilityState === 'visible') {
        // 탭이 다시 보일 때 하트비트 재시작
        if (sessionIdRef.current) {
          startHeartbeat();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    sessionId: sessionIdRef.current,
    startSession,
    endSession,
    updateActivity,
  };
}

// 관리자용 세션 정리 훅
export function useSessionCleanup() {
  // 비활성 세션 정리 (30분 이상 비활성)
  const cleanupInactiveSessions = async () => {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('student_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
        })
        .eq('is_active', true)
        .lt('last_activity', thirtyMinutesAgo);

      if (error) throw error;

      console.log('Inactive sessions cleaned up');
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
    }
  };

  // 주기적 정리 시작
  const startPeriodicCleanup = (intervalMinutes: number = 10) => {
    const interval = setInterval(cleanupInactiveSessions, intervalMinutes * 60 * 1000);
    
    // 즉시 한 번 실행
    cleanupInactiveSessions();

    return () => clearInterval(interval);
  };

  return {
    cleanupInactiveSessions,
    startPeriodicCleanup,
  };
}