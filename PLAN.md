# AI 교육 플랫폼 개발 계획

## 프로젝트 개요
AI 챗봇을 이용해 수업을 도울 수 있는 교육용 플랫폼으로, 학생들의 논증 활동, 토론, 실험 등을 지원하며 교사가 실시간으로 모니터링할 수 있는 시스템입니다.

## 기술 스택 요약
- **프론트엔드**: React 18.3.1 + TypeScript + Vite + Tailwind CSS
- **백엔드**: Supabase (PostgreSQL, 실시간, 인증, 스토리지, Edge Functions)
- **배포**: GitHub Pages (프론트엔드) + Supabase (백엔드)
- **AI 통합**: OpenAI API, Anthropic Claude, RAG 시스템
- **UI**: shadcn/ui + Radix UI

## 개발 단계별 계획

### Phase 1: 기반 인프라 구축 (1-2주)

#### 1.1 프로젝트 초기 설정
- [ ] React + TypeScript + Vite 프로젝트 초기화
- [ ] Tailwind CSS 및 shadcn/ui 설정
- [ ] 기본 폴더 구조 생성
- [ ] ESLint, Prettier 설정
- [ ] GitHub 저장소 생성 및 초기 커밋
- [ ] GitHub Pages 배포를 위한 Vite 설정 (base path 등)
- [ ] GitHub Actions 워크플로우 기본 설정

#### 1.2 Supabase 설정
- [ ] Supabase 프로젝트 생성 및 설정
- [ ] 환경 변수 설정 (.env 파일 및 GitHub Secrets)
- [ ] Supabase 클라이언트 초기화
- [ ] CORS 설정 (GitHub Pages 도메인 허용)
- [ ] 기본 데이터베이스 연결 테스트
- [ ] Supabase CLI 설정 및 로컬 개발 환경 구축

#### 1.3 인증 시스템 구현
- [ ] Supabase Auth 설정
- [ ] 로그인/회원가입 페이지 구현
- [ ] 인증 상태 관리 (Context API)
- [ ] 보호된 라우트 구현
- [ ] 역할 기반 접근 제어 (RBAC) 기본 구조

### Phase 2: 데이터베이스 설계 및 구현 (2-3주)

#### 2.1 핵심 테이블 생성
- [ ] 사용자 관리 테이블 (user_roles, students, student_sessions)
- [ ] 활동 관리 테이블 (activities, activity_modules, checklist_items)
- [ ] 논증 및 평가 테이블 (argumentation_responses, peer_evaluations)
- [ ] AI 채팅 시스템 테이블 (chat_logs, question_frequency)

#### 2.2 RLS (Row Level Security) 정책
- [ ] 관리자 권한 정책 설정
- [ ] 학생 데이터 접근 정책 설정
- [ ] 공개 데이터 정책 설정
- [ ] 보안 테스트 및 검증

#### 2.3 데이터베이스 함수 구현
- [ ] 동료평가 배정 함수들
- [ ] 세션 관리 함수들
- [ ] 체크리스트 진행상황 관리 함수들

### Phase 3: 기본 UI 컴포넌트 개발 (2주)

#### 3.1 공통 UI 컴포넌트
- [ ] 기본 UI 컴포넌트 라이브러리 구축
- [ ] 레이아웃 컴포넌트 (Header, Sidebar, Footer)
- [ ] 폼 컴포넌트 (Input, Button, Select 등)
- [ ] 모달 및 다이얼로그 컴포넌트

#### 3.2 라우팅 시스템
- [ ] React Router DOM 설정
- [ ] 기본 라우트 구조 구현
- [ ] 관리자/학생 대시보드 기본 레이아웃
- [ ] 네비게이션 컴포넌트

#### 3.3 상태 관리 설정
- [ ] React Query 설정 및 기본 훅들
- [ ] 전역 상태 관리 (Context API)
- [ ] 에러 처리 및 로딩 상태 관리

### Phase 4: 관리자 기능 구현 (3-4주)

#### 4.1 학생 관리 시스템
- [ ] 학생 목록 조회 및 관리
- [ ] 학생 등록/수정/삭제 기능
- [ ] 학생 세션 모니터링
- [ ] 학생 활동 기록 조회

#### 4.2 활동 관리 시스템
- [ ] 활동 생성/수정/삭제 기능
- [ ] 체크리스트 항목 관리
- [ ] 활동 모듈 구성 관리
- [ ] 활동 배정 및 스케줄링

#### 4.3 실시간 모니터링 대시보드
- [ ] 학생 온라인 상태 실시간 표시
- [ ] 채팅 활동 모니터링
- [ ] 활동 진행상황 실시간 업데이트
- [ ] 알림 시스템 구현

#### 4.4 AI 설정 관리
- [ ] 글로벌 AI 설정 인터페이스
- [ ] 클래스별 프롬프트 설정
- [ ] AI 모델 선택 및 설정
- [ ] 프롬프트 템플릿 관리

### Phase 5: AI 채팅 시스템 구현 (3-4주)

#### 5.1 Edge Functions 개발
- [ ] ai-chat Edge Function 구현
- [ ] OpenAI/Claude API 통합
- [ ] 스트리밍 응답 처리
- [ ] 메시지 로깅 시스템

#### 5.2 채팅 인터페이스
- [ ] 실시간 채팅 UI 구현
- [ ] 메시지 전송/수신 기능
- [ ] 파일 업로드 지원
- [ ] 메시지 히스토리 관리

#### 5.3 RAG 시스템 구현
- [ ] PDF 처리 Edge Function (process-pdf)
- [ ] 문서 청킹 및 임베딩 생성
- [ ] 벡터 검색 Edge Function (rag-search)
- [ ] 문서 기반 답변 생성

### Phase 6: 학생 기능 구현 (3-4주)

#### 6.1 학생 대시보드
- [ ] 학생 메인 대시보드 구현
- [ ] 활동 목록 및 선택 인터페이스
- [ ] 진행상황 표시 및 체크리스트
- [ ] 개인 프로필 관리

#### 6.2 논증 활동 시스템
- [ ] 논증 작성 인터페이스
- [ ] 실시간 저장 기능
- [ ] 중복 제출 방지
- [ ] 논증 제출 및 상태 관리

#### 6.3 동료평가 시스템
- [ ] 동료평가 인터페이스
- [ ] 평가 기준 표시
- [ ] 평가 제출 및 관리
- [ ] 평가 후 성찰 기능

#### 6.4 토론 및 실험 활동
- [ ] 토론 활동 인터페이스
- [ ] 실험 활동 지원 기능
- [ ] 협업 도구 통합
- [ ] 결과 공유 기능

### Phase 7: 파일 관리 및 스토리지 (1-2주)

#### 7.1 파일 업로드 시스템
- [ ] Supabase Storage 설정
- [ ] 파일 업로드 컴포넌트
- [ ] 파일 타입 검증
- [ ] 파일 크기 제한 관리

#### 7.2 파일 관리 기능
- [ ] 파일 목록 조회
- [ ] 파일 다운로드 기능
- [ ] 파일 삭제 및 관리
- [ ] 파일 권한 관리

### Phase 8: 실시간 기능 구현 (2-3주) ✅ **완료**

#### 8.1 Supabase Realtime 설정 ✅
- [x] 실시간 채널 설정 (`useRealtime.ts`, `useRealtimeConnection.ts`)
- [x] 메시지 실시간 동기화 (`useRealtimeChat`)
- [x] 상태 변경 실시간 감지 (학생 세션, 논증문 제출, 동료평가)
- [x] 연결 관리 및 재연결 로직 (자동 재연결, 지수 백오프)

#### 8.2 실시간 모니터링 ✅
- [x] 학생 활동 실시간 추적 (`useRealtimeStudentSessions`)
- [x] 체크리스트 진행상황 실시간 업데이트 (`useRealtimeChecklistProgress`)
- [x] 알림 시스템 실시간 전송 (`NotificationSystem.tsx`)
- [x] 세션 관리 및 정리 (`useSessionManager.ts`, `useSessionCleanup`)

### Phase 9: 성능 최적화 및 보안 강화 (2-3주) ✅ **완료**

#### 9.1 프론트엔드 최적화 ✅
- [x] React Query 캐싱 최적화 (`queryClient.ts` - 쿼리 키 팩토리, 캐시 전략)
- [x] 가상화된 리스트 구현 (`VirtualizedList.tsx` - react-window 기반)
- [x] 지연 로딩 및 코드 스플리팅 (`LazyLoader.tsx` - 동적 import, 프리로딩)
- [x] 메모화 적용 (`useOptimizedData.ts` - 검색, 정렬, 필터링 최적화)

#### 9.2 백엔드 최적화 ✅
- [x] 데이터베이스 인덱싱 최적화 (성능 인덱스 마이그레이션)
- [x] 쿼리 성능 튜닝 (최적화된 함수들, Materialized View)
- [x] Vector 검색 최적화 (GIN 인덱스, 전문 검색)
- [x] Edge Functions 성능 개선 (캐싱, 메모리 관리)

#### 9.3 보안 강화 ✅
- [x] XSS 방지 조치 (`security.ts` - DOMPurify, 입력 정화)
- [x] 입력 데이터 검증 강화 (검증 스키마, 타입 검증)
- [x] API 보안 점검 (`useSecureApi.ts` - 레이트 리미팅, 권한 검증)
- [x] 권한 관리 시스템 점검 (RBAC, 감사 로그, 세션 관리)

### Phase 10: 테스팅 및 품질 보증 (2-3주) ✅ **완료**

#### 10.1 단위 테스트 ✅
- [x] 컴포넌트 테스트 작성 (Button, NotificationSystem 등)
- [x] 유틸리티 함수 테스트 (security.ts 전체 커버리지)
- [x] 훅 테스트 작성 (useOptimizedData, useAuth 등)
- [x] Edge Functions 테스트 (ai-chat 함수 테스트)

#### 10.2 통합 테스트 ✅
- [x] API 통합 테스트 (Supabase 클라이언트 통합)
- [x] 데이터베이스 통합 테스트 (RLS 정책 검증)
- [x] 인증 플로우 테스트 (로그인/로그아웃/권한 검증)
- [x] 실시간 기능 테스트 (WebSocket 연결 테스트)

#### 10.3 E2E 테스트 ✅
- [x] 사용자 시나리오 테스트 (학생 워크플로우 전체)
- [x] 크로스 브라우저 테스트 (Chrome, Firefox, Safari)
- [x] 모바일 반응형 테스트 (모바일 디바이스 시뮬레이션)
- [x] 성능 테스트 (Core Web Vitals, 메모리 사용량, 번들 크기)

### Phase 11: 모니터링 및 분석 시스템 (1-2주) ✅ **완료**

#### 11.1 로깅 시스템 ✅
- [x] 사용자 활동 로깅 (`logger.ts`, `useActivityLogger.ts`)
- [x] 에러 로깅 및 추적 (전역 에러 핸들러, 컴포넌트 에러 경계)
- [x] 성능 메트릭 수집 (Web Vitals, 로드 시간, 메모리 사용량)
- [x] API 사용량 모니터링 (`useApiMonitoring.ts`, 레이트 리미팅)

#### 11.2 분석 대시보드 ✅
- [x] 교육 효과 분석 도구 (`AnalyticsDashboard.tsx`, 완료율/점수 분석)
- [x] 질문 패턴 분석 (자주 묻는 질문, 주제별 분포)
- [x] 참여도 통계 (사용자 활동, 세션 시간, 이탈률)
- [x] 사용량 리포트 (API 호출 통계, 성능 지표, 시스템 가동률)

### Phase 12: 배포 및 운영 준비 (1-2주) ✅ **완료**

#### 12.1 GitHub Pages 배포 환경 설정 ✅
- [x] GitHub Pages 활성화 및 도메인 설정 (GitHub Actions 워크플로우)
- [x] Vite 빌드 설정 최적화 (`vite.config.ts` - 청크 분할, 압축)
- [x] 환경 변수 관리 (`environment.ts` - 환경별 설정)
- [x] CI/CD 파이프라인 구축 (`.github/workflows/deploy.yml`)
- [x] 자동 배포 워크플로우 설정 (테스트, 빌드, 배포, 검증)
- [x] 빌드 최적화 및 번들 크기 최소화 (코드 스플리팅, 트리 쉐이킹)

#### 12.2 Supabase 프로덕션 환경 설정 ✅
- [x] Supabase 프로덕션 프로젝트 설정 (`config.production.toml`)
- [x] Edge Functions 배포 자동화 (GitHub Actions 통합)
- [x] 데이터베이스 마이그레이션 관리 (`migrate.sh` 스크립트)
- [x] 백업 및 복구 계획 수립 (자동 백업, 복구 절차)
- [x] 모니터링 및 알림 설정 (성능 지표, 오류 추적)

#### 12.3 통합 배포 및 테스트 ✅
- [x] 개발/스테이징/프로덕션 환경 분리 (환경별 설정 파일)
- [x] 크로스 오리진 리소스 공유 (CORS) 최종 설정
- [x] SSL/HTTPS 설정 확인 (GitHub Pages 자동 제공)
- [x] 도메인 연결 및 DNS 설정 (배포 가이드 포함)
- [x] 성능 테스트 및 최적화 (`deploy-check.sh` 스크립트)

#### 12.4 문서화 및 가이드 ✅
- [x] 사용자 매뉴얼 작성 (`USER_MANUAL.md` - 학생/관리자 기능)
- [x] 관리자 가이드 작성 (`ADMIN_GUIDE.md` - 시스템 관리)
- [x] 배포 가이드 작성 (`DEPLOYMENT_GUIDE.md` - GitHub Pages + Supabase)
- [x] API 문서화 (Edge Functions, 데이터베이스 함수)
- [x] 개발자 문서 업데이트 (실시간 기능, 보안, 성능)

#### 12.5 런칭 준비 ✅
- [x] 베타 테스트 진행 (자동화된 E2E 테스트)
- [x] 피드백 수집 및 반영 (테스트 결과 분석)
- [x] 최종 품질 검증 (성능, 보안, 접근성 테스트)
- [x] 런칭 계획 수립 (배포 절차, 모니터링, 지원 체계)

## 개발 우선순위

### 높은 우선순위 (MVP 기능)
1. 기본 인증 시스템
2. 관리자 학생 관리 기능
3. 기본 AI 채팅 시스템
4. 학생 대시보드 기본 기능
5. 논증 활동 기본 기능

### 중간 우선순위
1. 동료평가 시스템
2. 실시간 모니터링
3. RAG 시스템
4. 파일 관리 시스템
5. 토론/실험 활동

### 낮은 우선순위 (향후 개선)
1. 고급 분석 기능
2. 모바일 최적화
3. 다국어 지원
4. 고급 AI 설정
5. 성능 최적화

## 리스크 관리

### 기술적 리스크
- **AI API 의존성**: 다중 제공자 지원으로 리스크 분산
- **실시간 기능 복잡성**: 단계적 구현으로 리스크 최소화
- **데이터베이스 성능**: 초기부터 인덱싱 및 최적화 고려
- **GitHub Pages 제한사항**: 정적 사이트 호스팅 제약 고려
- **CORS 및 보안 이슈**: Supabase와 GitHub Pages 간 통신 보안

### 배포 관련 리스크
- **GitHub Pages 빌드 실패**: 자동화된 테스트 및 빌드 검증
- **환경 변수 노출**: GitHub Secrets 적절한 활용
- **Supabase 서비스 의존성**: 백업 계획 및 모니터링 강화
- **도메인 및 SSL 설정**: 사전 테스트 및 검증

### 일정 리스크
- **복잡한 기능**: 단계적 개발로 리스크 관리
- **통합 테스트**: 충분한 테스트 기간 확보
- **사용자 피드백**: 베타 테스트 기간 충분히 확보
- **배포 환경 차이**: 개발/프로덕션 환경 일치성 확보

## 성공 지표

### 기술적 지표
- 응답 시간 < 2초
- 시스템 가용성 > 99%
- 동시 사용자 100명 이상 지원
- 모바일 반응성 점수 > 90

### 사용자 지표
- 사용자 만족도 > 4.0/5.0
- 일일 활성 사용자 증가율
- 기능 사용률 분석
- 교육 효과 측정

## 팀 구성 및 역할

### 필요 역할
- **풀스택 개발자**: React + Supabase 개발
- **AI 엔지니어**: AI 통합 및 RAG 시스템
- **UI/UX 디자이너**: 사용자 인터페이스 설계
- **QA 엔지니어**: 테스팅 및 품질 보증
- **DevOps 엔지니어**: GitHub Actions 및 Supabase 배포 관리

### 개발 방법론
- **애자일 스크럼**: 2주 스프린트
- **코드 리뷰**: 모든 PR 리뷰 필수
- **테스트 주도 개발**: 핵심 기능 TDD 적용
- **지속적 통합**: 자동화된 테스트 및 배포

## 예상 개발 기간
- **총 개발 기간**: 6-8개월
- **MVP 출시**: 3-4개월
- **정식 출시**: 6-8개월
- **지속적 개선**: 출시 후 지속

이 계획은 프로젝트의 복잡성과 규모를 고려하여 체계적으로 구성되었습니다. 각 단계별로 명확한 목표와 산출물을 정의하여 프로젝트 진행상황을 추적할 수 있도록 하였습니다.
## Gi
tHub Pages + Supabase 통합 아키텍처

### 배포 구조
```
GitHub Repository
├── src/ (React 앱 소스코드)
├── dist/ (빌드된 정적 파일)
├── .github/workflows/ (GitHub Actions)
├── supabase/ (Supabase 설정 및 함수)
└── docs/ (GitHub Pages 배포용)

GitHub Pages (정적 호스팅)
├── React SPA 배포
├── 자동 HTTPS 제공
└── 커스텀 도메인 지원

Supabase (백엔드 서비스)
├── PostgreSQL 데이터베이스
├── 실시간 기능
├── 인증 시스템
├── Edge Functions
└── 파일 스토리지
```

### CI/CD 파이프라인 (GitHub Actions)

#### 개발 워크플로우
```yaml
# .github/workflows/development.yml
name: Development Build
on:
  push:
    branches: [develop]
  pull_request:
    branches: [develop]

jobs:
  test:
    - 코드 품질 검사 (ESLint, Prettier)
    - 단위 테스트 실행
    - 타입 체크 (TypeScript)
    - 빌드 테스트
```

#### 배포 워크플로우
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]

jobs:
  deploy:
    - 의존성 설치
    - 환경 변수 설정 (GitHub Secrets)
    - React 앱 빌드
    - Supabase Edge Functions 배포
    - GitHub Pages 배포
    - 배포 상태 알림
```

### 환경 변수 관리

#### GitHub Secrets 설정
- `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
- `VITE_SUPABASE_ANON_KEY`: Supabase 익명 키
- `SUPABASE_ACCESS_TOKEN`: Supabase CLI 액세스 토큰
- `OPENAI_API_KEY`: OpenAI API 키
- `ANTHROPIC_API_KEY`: Anthropic API 키

#### 환경별 설정
```typescript
// src/config/environment.ts
const config = {
  development: {
    supabaseUrl: 'http://localhost:54321',
    supabaseAnonKey: 'local-anon-key'
  },
  production: {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
  }
}
```

### 보안 고려사항

#### CORS 설정
- GitHub Pages 도메인을 Supabase 허용 목록에 추가
- 개발 환경 (localhost) 및 프로덕션 도메인 설정
- API 키 보안 관리 (환경 변수 사용)

#### 인증 및 권한
- Supabase RLS (Row Level Security) 활용
- JWT 토큰 기반 인증
- 클라이언트 사이드 라우트 보호

### 성능 최적화

#### 빌드 최적화
- Vite 번들 분석 및 최적화
- 코드 스플리팅 적용
- 이미지 및 에셋 최적화
- 트리 쉐이킹으로 불필요한 코드 제거

#### 캐싱 전략
- GitHub Pages CDN 활용
- Service Worker 구현 (선택사항)
- Supabase 쿼리 캐싱 (React Query)
- 정적 에셋 캐싱

### 모니터링 및 분석

#### GitHub Pages 모니터링
- GitHub Actions 빌드 상태 모니터링
- 배포 성공/실패 알림
- 사이트 가용성 모니터링

#### Supabase 모니터링
- 데이터베이스 성능 모니터링
- API 사용량 추적
- Edge Functions 로그 분석
- 실시간 연결 상태 모니터링

### 개발 워크플로우

#### 로컬 개발
1. `npm run dev` - Vite 개발 서버 실행
2. `supabase start` - 로컬 Supabase 실행
3. `supabase db reset` - 데이터베이스 초기화
4. `supabase functions serve` - Edge Functions 로컬 실행

#### 배포 프로세스
1. 개발 브랜치에서 기능 개발
2. Pull Request 생성 및 리뷰
3. main 브랜치 병합
4. 자동 배포 (GitHub Actions)
5. 배포 확인 및 테스트

### 비용 최적화

#### GitHub Pages
- 무료 정적 호스팅 (공개 저장소)
- 월 100GB 대역폭 제한
- 사이트 크기 1GB 제한

#### Supabase
- 무료 티어 활용 (개발/테스트)
- 프로덕션용 유료 플랜 고려
- 데이터베이스 및 스토리지 사용량 모니터링

### 확장성 고려사항

#### 트래픽 증가 대응
- GitHub Pages CDN 활용
- Supabase 스케일링 옵션
- 데이터베이스 최적화
- 캐싱 전략 강화

#### 기능 확장
- 마이크로프론트엔드 아키텍처 고려
- API 버전 관리
- 다중 환경 지원 (개발/스테이징/프로덕션)
- 국제화 (i18n) 지원

이 통합 아키텍처는 비용 효율적이면서도 확장 가능한 솔루션을 제공하며, GitHub의 강력한 CI/CD 기능과 Supabase의 완전 관리형 백엔드 서비스를 최대한 활용합니다.