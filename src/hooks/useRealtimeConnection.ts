import { useEffect, useState, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface ConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastConnected: Date | null;
  reconnectAttempts: number;
}

interface UseRealtimeConnectionOptions {
  channelName: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

export function useRealtimeConnection({
  channelName,
  maxReconnectAttempts = 5,
  reconnectDelay = 3000,
  onConnect,
  onDisconnect,
  onError,
}: UseRealtimeConnectionOptions) {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastConnected: null,
    reconnectAttempts: 0,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  const connect = () => {
    if (isUnmountedRef.current || status.isConnecting) return;

    setStatus(prev => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    try {
      // 기존 채널 정리
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // 새 채널 생성
      const channel = supabase.channel(channelName);
      channelRef.current = channel;

      // 연결 상태 모니터링
      channel.subscribe((status) => {
        if (isUnmountedRef.current) return;

        console.log(`Realtime connection status: ${status}`);

        switch (status) {
          case 'SUBSCRIBED':
            setStatus(prev => ({
              ...prev,
              isConnected: true,
              isConnecting: false,
              error: null,
              lastConnected: new Date(),
              reconnectAttempts: 0,
            }));
            onConnect?.();
            break;

          case 'CHANNEL_ERROR':
            const errorMsg = '실시간 연결 오류가 발생했습니다.';
            setStatus(prev => ({
              ...prev,
              isConnected: false,
              isConnecting: false,
              error: errorMsg,
            }));
            onError?.(errorMsg);
            scheduleReconnect();
            break;

          case 'TIMED_OUT':
            const timeoutMsg = '실시간 연결 시간이 초과되었습니다.';
            setStatus(prev => ({
              ...prev,
              isConnected: false,
              isConnecting: false,
              error: timeoutMsg,
            }));
            onError?.(timeoutMsg);
            scheduleReconnect();
            break;

          case 'CLOSED':
            setStatus(prev => ({
              ...prev,
              isConnected: false,
              isConnecting: false,
            }));
            onDisconnect?.();
            scheduleReconnect();
            break;
        }
      });
    } catch (error) {
      const errorMsg = '연결 초기화 중 오류가 발생했습니다.';
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: errorMsg,
      }));
      onError?.(errorMsg);
      scheduleReconnect();
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setStatus(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      error: null,
    }));
  };

  const scheduleReconnect = () => {
    if (isUnmountedRef.current) return;
    if (status.reconnectAttempts >= maxReconnectAttempts) {
      setStatus(prev => ({
        ...prev,
        error: `최대 재연결 시도 횟수(${maxReconnectAttempts})를 초과했습니다.`,
      }));
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = reconnectDelay * Math.pow(2, status.reconnectAttempts); // 지수 백오프

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isUnmountedRef.current) return;

      setStatus(prev => ({
        ...prev,
        reconnectAttempts: prev.reconnectAttempts + 1,
      }));

      connect();
    }, delay);
  };

  const manualReconnect = () => {
    setStatus(prev => ({
      ...prev,
      reconnectAttempts: 0,
      error: null,
    }));
    disconnect();
    connect();
  };

  // 초기 연결
  useEffect(() => {
    connect();

    return () => {
      isUnmountedRef.current = true;
      disconnect();
    };
  }, [channelName]);

  // 네트워크 상태 변화 감지
  useEffect(() => {
    const handleOnline = () => {
      if (!status.isConnected && !status.isConnecting) {
        manualReconnect();
      }
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        error: '네트워크 연결이 끊어졌습니다.',
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [status.isConnected, status.isConnecting]);

  return {
    ...status,
    channel: channelRef.current,
    connect: manualReconnect,
    disconnect,
  };
}

// 전역 실시간 연결 관리자
class RealtimeConnectionManager {
  private connections = new Map<string, RealtimeChannel>();
  private listeners = new Map<string, Set<(status: any) => void>>();

  getConnection(channelName: string): RealtimeChannel {
    if (!this.connections.has(channelName)) {
      const channel = supabase.channel(channelName);
      this.connections.set(channelName, channel);
    }
    return this.connections.get(channelName)!;
  }

  subscribe(channelName: string, callback: (status: any) => void) {
    if (!this.listeners.has(channelName)) {
      this.listeners.set(channelName, new Set());
    }
    this.listeners.get(channelName)!.add(callback);

    const channel = this.getConnection(channelName);
    channel.subscribe(callback);

    return () => {
      this.listeners.get(channelName)?.delete(callback);
      if (this.listeners.get(channelName)?.size === 0) {
        supabase.removeChannel(channel);
        this.connections.delete(channelName);
        this.listeners.delete(channelName);
      }
    };
  }

  cleanup() {
    this.connections.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.connections.clear();
    this.listeners.clear();
  }
}

export const realtimeManager = new RealtimeConnectionManager();

// 컴포넌트 언마운트 시 정리
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    realtimeManager.cleanup();
  });
}