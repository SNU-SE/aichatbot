# 실시간 기능 구현 가이드

## 개요
AI 교육 플랫폼의 실시간 기능은 Supabase Realtime을 기반으로 구현되어 있으며, 학생 활동 모니터링, 채팅 동기화, 알림 시스템 등을 제공합니다.

## 구현된 기능

### 1. 실시간 데이터 동기화 (`useRealtime.ts`)

#### 기본 실시간 훅
```typescript
const { isConnected, error, reconnect } = useRealtime({
  table: 'chat_logs',
  filter: 'student_id=eq.123',
  event: 'INSERT',
  onInsert: (payload) => {
    console.log('새 메시지:', payload.new);
  }
});
```

#### 특화된 실시간 훅들
- `useRealtimeChat`: 채팅 메시지 실시간 동기화
- `useRealtimeStudentSessions`: 학생 세션 실시간 추적
- `useRealtimeChecklistProgress`: 체크리스트 진행상황 동기화
- `useRealtimeArgumentationSubmissions`: 논증문 제출 알림 (관리자용)
- `useRealtimePeerEvaluations`: 동료평가 완료 알림 (관리자용)

### 2. 알림 시스템 (`NotificationSystem.tsx`)

#### 토스트 알림 컴포넌트
```typescript
const { showSuccess, showError, showWarning, showInfo } = useNotifications();

// 성공 알림
showSuccess('제출 완료', '논증문이 성공적으로 제출되었습니다.');

// 에러 알림
showError('오류 발생', '파일 업로드 중 오류가 발생했습니다.');
```

#### 알림 타입
- `success`: 성공 메시지 (녹색)
- `error`: 오류 메시지 (빨간색)
- `warning`: 경고 메시지 (노란색)
- `info`: 정보 메시지 (파란색)

### 3. 세션 관리 (`useSessionManager.ts`)

#### 자동 세션 관리
```typescript
// 학생 페이지에서 사용
useSessionManager({
  studentId: user?.id,
  activityId: currentActivityId,
  heartbeatInterval: 30000, // 30초마다 하트비트
});
```

#### 기능
- 자동 세션 시작/종료
- 주기적 하트비트 (활동 상태 업데이트)
- 페이지 언로드 시 세션 정리
- 탭 숨김/표시 시 하트비트 제어

### 4. 연결 관리 (`useRealtimeConnection.ts`)

#### 고급 연결 관리
```typescript
const { isConnected, isConnecting, error, connect, disconnect } = useRealtimeConnection({
  channelName: 'student-activity',
  maxReconnectAttempts: 5,
  reconnectDelay: 3000,
  onConnect: () => console.log('연결됨'),
  onDisconnect: () => console.log('연결 끊김'),
});
```

#### 기능
- 자동 재연결 (지수 백오프)
- 네트워크 상태 감지
- 연결 상태 모니터링
- 전역 연결 관리자

### 5. 실시간 모니터링 대시보드 (`RealTimeMonitor.tsx`)

#### 관리자 모니터링 기능
- 온라인 학생 실시간 표시
- 최근 채팅 활동 모니터링
- 실시간 활동 알림 (논증문 제출, 동료평가 완료)
- 연결 상태 표시

## 사용 방법

### 1. 학생 페이지에서 실시간 기능 사용

```typescript
// StudentActivityPage.tsx
import { useSessionManager } from '../hooks/useSessionManager';
import { useRealtimeChat } from '../hooks/useRealtime';

export default function StudentActivityPage() {
  const { user } = useAuth();
  const { activityId } = useParams();

  // 세션 관리
  useSessionManager({
    studentId: user?.id,
    activityId,
  });

  // 실시간 채팅
  const { newMessages, clearNewMessages } = useRealtimeChat(
    user?.id,
    activityId
  );

  return (
    // 컴포넌트 내용
  );
}
```

### 2. 관리자 페이지에서 모니터링

```typescript
// AdminDashboard.tsx
import RealTimeMonitor from '../components/admin/RealTimeMonitor';
import { useSessionCleanup } from '../hooks/useSessionManager';
import { NotificationSystem, useNotifications } from '../components/common/NotificationSystem';

export default function AdminDashboard() {
  const { startPeriodicCleanup } = useSessionCleanup();
  const { notifications, removeNotification } = useNotifications();

  useEffect(() => {
    const cleanup = startPeriodicCleanup(10); // 10분마다 세션 정리
    return cleanup;
  }, []);

  return (
    <Layout>
      <RealTimeMonitor />
      <NotificationSystem 
        notifications={notifications} 
        onClose={removeNotification} 
      />
    </Layout>
  );
}
```

### 3. 채팅 인터페이스에서 실시간 동기화

```typescript
// StreamingChatInterface.tsx
import { useRealtimeChat } from '../../hooks/useRealtime';

export default function StreamingChatInterface({ activityId }) {
  const { user } = useAuth();
  const { newMessages, clearNewMessages } = useRealtimeChat(
    user?.id,
    activityId
  );

  useEffect(() => {
    if (newMessages.length > 0) {
      // 새 메시지 처리
      setMessages(prev => [...prev, ...newMessages]);
      clearNewMessages();
    }
  }, [newMessages]);

  return (
    // 채팅 인터페이스
  );
}
```

## 데이터베이스 설정

### 1. Realtime 활성화
```sql
-- 실시간 기능을 위한 테이블들
ALTER PUBLICATION supabase_realtime ADD TABLE student_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE argumentation_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE peer_evaluations;
ALTER PUBLICATION supabase_realtime ADD TABLE student_checklist_progress;
```

### 2. RLS 정책 설정
```sql
-- 학생은 자신의 세션만 볼 수 있음
CREATE POLICY "Students can view own sessions" ON student_sessions
  FOR SELECT USING (student_id = auth.uid());

-- 관리자는 모든 세션을 볼 수 있음
CREATE POLICY "Admins can view all sessions" ON student_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

## 성능 최적화

### 1. 연결 관리
- 불필요한 채널 구독 방지
- 컴포넌트 언마운트 시 자동 정리
- 전역 연결 관리자로 중복 연결 방지

### 2. 데이터 필터링
- 테이블 레벨 필터링 사용
- 필요한 이벤트만 구독
- 페이지네이션으로 데이터 제한

### 3. 메모리 관리
- 메시지 배열 크기 제한 (최대 10개)
- 주기적 세션 정리 (30분 이상 비활성)
- 브라우저 탭 상태에 따른 하트비트 제어

## 트러블슈팅

### 1. 연결 문제
```typescript
// 연결 상태 확인
const { isConnected, error } = useRealtimeConnection({
  channelName: 'test-channel',
  onError: (error) => console.error('연결 오류:', error),
});

if (!isConnected) {
  // 수동 재연결 시도
  connect();
}
```

### 2. 메시지 누락
```typescript
// 메시지 히스토리와 실시간 메시지 동기화
const { data: history } = useChatHistory(activityId);
const { newMessages } = useRealtimeChat(studentId, activityId);

const allMessages = useMemo(() => {
  return [...(history || []), ...newMessages];
}, [history, newMessages]);
```

### 3. 세션 정리
```typescript
// 관리자 페이지에서 주기적 정리
const { cleanupInactiveSessions } = useSessionCleanup();

// 수동 정리 실행
await cleanupInactiveSessions();
```

## 보안 고려사항

### 1. RLS 정책
- 학생은 자신의 데이터만 접근 가능
- 관리자 권한 검증
- 실시간 구독에도 RLS 적용

### 2. 데이터 검증
- 클라이언트 사이드 검증
- 서버 사이드 검증 (Edge Functions)
- 입력 데이터 sanitization

### 3. 연결 보안
- JWT 토큰 기반 인증
- 채널별 접근 권한 제어
- 비정상 연결 감지 및 차단

## 모니터링 및 로깅

### 1. 연결 상태 로깅
```typescript
console.log('Realtime connection status:', status);
console.log('Session started:', sessionId);
console.log('Heartbeat updated:', timestamp);
```

### 2. 에러 추적
```typescript
const { error } = useRealtime({
  table: 'chat_logs',
  onError: (error) => {
    console.error('Realtime error:', error);
    // 에러 리포팅 서비스로 전송
  }
});
```

### 3. 성능 메트릭
- 연결 지연시간
- 메시지 전송 속도
- 재연결 빈도
- 활성 사용자 수

이 문서는 실시간 기능의 구현과 사용법을 상세히 설명하며, 개발자가 시스템을 이해하고 확장할 수 있도록 돕습니다.