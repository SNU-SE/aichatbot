import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UseRealtimeOptions {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<any>) => void;
}

export function useRealtime({
  table,
  filter,
  event = '*',
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: UseRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channelName = `realtime-${table}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter,
        },
        (payload) => {
          console.log('Realtime payload:', payload);
          
          // 이벤트별 콜백 실행
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload);
              break;
            case 'UPDATE':
              onUpdate?.(payload);
              break;
            case 'DELETE':
              onDelete?.(payload);
              break;
          }
          
          // 공통 콜백 실행
          onChange?.(payload);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError('실시간 연결 오류가 발생했습니다.');
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          setError('실시간 연결 시간이 초과되었습니다.');
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [table, filter, event, onInsert, onUpdate, onDelete, onChange]);

  const reconnect = () => {
    if (channelRef.current) {
      channelRef.current.subscribe();
    }
  };

  return {
    isConnected,
    error,
    reconnect,
  };
}

// 채팅 메시지 실시간 동기화 훅
export function useRealtimeChat(studentId: string, activityId?: string) {
  const [newMessages, setNewMessages] = useState<any[]>([]);

  const filter = activityId 
    ? `student_id=eq.${studentId} and activity_id=eq.${activityId}`
    : `student_id=eq.${studentId}`;

  const { isConnected, error } = useRealtime({
    table: 'chat_logs',
    filter,
    event: 'INSERT',
    onInsert: (payload) => {
      setNewMessages(prev => [...prev, payload.new]);
    },
  });

  const clearNewMessages = () => {
    setNewMessages([]);
  };

  return {
    newMessages,
    clearNewMessages,
    isConnected,
    error,
  };
}

// 학생 세션 실시간 추적 훅
export function useRealtimeStudentSessions() {
  const [sessionUpdates, setSessionUpdates] = useState<any[]>([]);

  const { isConnected, error } = useRealtime({
    table: 'student_sessions',
    event: '*',
    onChange: (payload) => {
      setSessionUpdates(prev => [...prev.slice(-9), payload]);
    },
  });

  return {
    sessionUpdates,
    isConnected,
    error,
  };
}

// 체크리스트 진행상황 실시간 동기화 훅
export function useRealtimeChecklistProgress(studentId: string, activityId: string) {
  const [progressUpdates, setProgressUpdates] = useState<any[]>([]);

  const { isConnected, error } = useRealtime({
    table: 'student_checklist_progress',
    filter: `student_id=eq.${studentId}`,
    event: '*',
    onChange: (payload) => {
      setProgressUpdates(prev => [...prev.slice(-9), payload]);
    },
  });

  return {
    progressUpdates,
    isConnected,
    error,
  };
}

// 논증 제출 실시간 알림 훅 (관리자용)
export function useRealtimeArgumentationSubmissions() {
  const [submissions, setSubmissions] = useState<any[]>([]);

  const { isConnected, error } = useRealtime({
    table: 'argumentation_responses',
    filter: 'is_submitted=eq.true',
    event: 'UPDATE',
    onUpdate: (payload) => {
      if (payload.new?.is_submitted && !payload.old?.is_submitted) {
        setSubmissions(prev => [...prev.slice(-9), payload.new]);
      }
    },
  });

  const clearSubmissions = () => {
    setSubmissions([]);
  };

  return {
    submissions,
    clearSubmissions,
    isConnected,
    error,
  };
}

// 동료평가 완료 실시간 알림 훅 (관리자용)
export function useRealtimePeerEvaluations() {
  const [evaluations, setEvaluations] = useState<any[]>([]);

  const { isConnected, error } = useRealtime({
    table: 'peer_evaluations',
    filter: 'is_completed=eq.true',
    event: 'UPDATE',
    onUpdate: (payload) => {
      if (payload.new?.is_completed && !payload.old?.is_completed) {
        setEvaluations(prev => [...prev.slice(-9), payload.new]);
      }
    },
  });

  const clearEvaluations = () => {
    setEvaluations([]);
  };

  return {
    evaluations,
    clearEvaluations,
    isConnected,
    error,
  };
}