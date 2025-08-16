# AI 교육 플랫폼 배포 가이드

## 개요

이 문서는 AI 교육 플랫폼을 GitHub Pages와 Supabase를 사용하여 배포하는 방법을 설명합니다.

## 아키텍처 개요

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub Pages  │    │    Supabase     │    │   External APIs │
│                 │    │                 │    │                 │
│ • React SPA     │◄──►│ • PostgreSQL    │◄──►│ • OpenAI        │
│ • Static Assets │    │ • Auth          │    │ • Anthropic     │
│ • CDN           │    │ • Realtime      │    │ • File Storage  │
│                 │    │ • Edge Functions│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 사전 요구사항

### 필수 도구
- Node.js 18+ 
- npm 또는 yarn
- Git
- GitHub 계정
- Supabase 계정

### 선택적 도구
- Supabase CLI
- Playwright (E2E 테스트용)
- Lighthouse (성능 테스트용)

## 1. 환경 설정

### 1.1 GitHub 저장소 설정

```bash
# 저장소 클론
git clone https://github.com/your-username/ai-education-platform.git
cd ai-education-platform

# 의존성 설치
npm install
```

### 1.2 환경 변수 설정

각 환경별로 다음 환경 변수를 설정해야 합니다:

#### 개발 환경 (.env.local)
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key
VITE_APP_ENV=development
```

#### 스테이징 환경 (GitHub Secrets)
```env
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
SUPABASE_STAGING_ACCESS_TOKEN=your-staging-access-token
SUPABASE_STAGING_PROJECT_REF=your-staging-project-ref
VITE_APP_ENV=staging
```

#### 프로덕션 환경 (GitHub Secrets)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_ACCESS_TOKEN=your-access-token
SUPABASE_PROJECT_REF=your-project-ref
VITE_OPENAI_API_KEY=your-openai-key
VITE_ANTHROPIC_API_KEY=your-anthropic-key
VITE_APP_ENV=production
GITHUB_PAGES=true
```

## 2. Supabase 설정

### 2.1 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 새 프로젝트 생성
2. 프로젝트 설정에서 API 키와 URL 확인
3. 데이터베이스 비밀번호 설정

### 2.2 데이터베이스 마이그레이션

```bash
# Supabase CLI 설치
npm install -g supabase

# 프로젝트 연결
supabase link --project-ref your-project-ref

# 마이그레이션 실행
./scripts/migrate.sh migrate production
```

### 2.3 Edge Functions 배포

```bash
# 모든 Edge Functions 배포
supabase functions deploy --no-verify-jwt

# 개별 함수 배포
supabase functions deploy ai-chat
supabase functions deploy process-pdf
supabase functions deploy rag-search
```

### 2.4 스토리지 설정

```bash
# 스토리지 버킷 생성
supabase storage create uploads --public

# 파일 업로드 정책 설정 (Supabase Dashboard에서)
```

## 3. GitHub Pages 설정

### 3.1 저장소 설정

1. GitHub 저장소의 Settings > Pages로 이동
2. Source를 "GitHub Actions"로 설정
3. Custom domain 설정 (선택사항)

### 3.2 GitHub Secrets 설정

Repository Settings > Secrets and variables > Actions에서 다음 시크릿 추가:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_REF
VITE_OPENAI_API_KEY
VITE_ANTHROPIC_API_KEY
```

### 3.3 배포 워크플로우

`.github/workflows/deploy.yml` 파일이 자동으로 다음을 수행합니다:

1. 코드 품질 검사 (린팅, 타입 체크)
2. 단위 테스트 실행
3. 빌드 생성
4. E2E 테스트 실행
5. Supabase 배포
6. GitHub Pages 배포
7. 배포 후 검증

## 4. 배포 프로세스

### 4.1 자동 배포

`main` 브랜치에 푸시하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

### 4.2 수동 배포

필요시 수동으로 배포할 수 있습니다:

```bash
# 배포 전 검증
./scripts/deploy-check.sh pre production

# 빌드
npm run build

# Supabase 배포
./scripts/migrate.sh migrate production
supabase functions deploy

# 배포 후 검증
./scripts/deploy-check.sh post production https://your-site.github.io
```

## 5. 환경별 배포 전략

### 5.1 개발 환경

```bash
# 로컬 Supabase 시작
supabase start

# 개발 서버 실행
npm run dev
```

### 5.2 스테이징 환경

```bash
# 스테이징 브랜치에 배포
git checkout staging
git merge main
git push origin staging
```

### 5.3 프로덕션 환경

```bash
# 프로덕션 배포 (main 브랜치)
git checkout main
git push origin main
```

## 6. 모니터링 및 유지보수

### 6.1 배포 상태 확인

```bash
# GitHub Actions 상태 확인
gh run list

# 사이트 상태 확인
curl -I https://your-site.github.io

# Supabase 상태 확인
supabase status
```

### 6.2 로그 모니터링

- GitHub Actions 로그: Repository > Actions
- Supabase 로그: Supabase Dashboard > Logs
- 애플리케이션 로그: Supabase Dashboard > Database > application_logs

### 6.3 성능 모니터링

```bash
# Lighthouse 성능 테스트
lighthouse https://your-site.github.io --view

# 번들 분석
npm run build:analyze
```

## 7. 트러블슈팅

### 7.1 일반적인 문제들

#### 빌드 실패
```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 타입 에러 확인
npm run type-check
```

#### 환경 변수 문제
```bash
# 환경 변수 확인
echo $VITE_SUPABASE_URL

# GitHub Secrets 확인 (GitHub UI에서)
```

#### CORS 에러
```bash
# Supabase CORS 설정 확인
# Dashboard > Settings > API > CORS Origins
```

### 7.2 롤백 절차

```bash
# 이전 배포로 롤백
git revert HEAD
git push origin main

# 데이터베이스 롤백 (백업에서)
./scripts/migrate.sh restore production backups/backup_YYYYMMDD_HHMMSS.sql
```

### 7.3 응급 상황 대응

1. **사이트 다운**: GitHub Pages 상태 확인, DNS 설정 확인
2. **데이터베이스 문제**: Supabase 상태 페이지 확인, 백업에서 복구
3. **API 오류**: Edge Functions 로그 확인, 재배포

## 8. 보안 고려사항

### 8.1 API 키 관리
- 모든 API 키는 GitHub Secrets에 저장
- 클라이언트 사이드에 민감한 정보 노출 금지
- 정기적인 키 로테이션

### 8.2 CORS 설정
```javascript
// Supabase CORS 설정
const corsOrigins = [
  'https://your-domain.github.io',
  'http://localhost:5173' // 개발용
];
```

### 8.3 RLS 정책
- 모든 테이블에 Row Level Security 적용
- 사용자별 데이터 접근 제한
- 관리자 권한 분리

## 9. 성능 최적화

### 9.1 빌드 최적화
- 코드 스플리팅 적용
- 번들 크기 모니터링
- 이미지 최적화

### 9.2 CDN 활용
- GitHub Pages CDN 자동 적용
- 정적 자산 캐싱
- 압축 활성화

### 9.3 데이터베이스 최적화
- 인덱스 최적화
- 쿼리 성능 모니터링
- 연결 풀링 설정

## 10. 백업 및 복구

### 10.1 자동 백업
```bash
# 일일 백업 설정 (cron)
0 2 * * * /path/to/scripts/migrate.sh backup production
```

### 10.2 복구 절차
```bash
# 백업 목록 확인
ls -la backups/

# 백업에서 복구
./scripts/migrate.sh restore production backups/backup_YYYYMMDD_HHMMSS.sql
```

## 11. 지속적 개선

### 11.1 모니터링 지표
- 사이트 가용성 (99.9% 목표)
- 응답 시간 (< 2초)
- 에러율 (< 1%)
- 사용자 만족도

### 11.2 정기 점검
- 주간: 성능 지표 검토
- 월간: 보안 업데이트 적용
- 분기: 백업 복구 테스트
- 연간: 아키텍처 검토

이 가이드를 따라 안정적이고 확장 가능한 AI 교육 플랫폼을 배포할 수 있습니다.