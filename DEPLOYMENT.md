# AI 교육 플랫폼 배포 가이드

## 개요
이 문서는 AI 교육 플랫폼을 GitHub Pages와 Supabase를 사용하여 배포하는 방법을 설명합니다.

## 사전 준비사항

### 1. 필요한 계정
- GitHub 계정
- Supabase 계정
- OpenAI API 계정 (선택사항)
- Anthropic API 계정 (선택사항)

### 2. 로컬 개발 환경
- Node.js 18+ 
- npm 또는 yarn
- Git

## Supabase 설정

### 1. Supabase 프로젝트 생성
1. [Supabase](https://supabase.com)에 로그인
2. "New Project" 클릭
3. 프로젝트 이름: `ai-education-platform`
4. 데이터베이스 비밀번호 설정
5. 리전 선택 (Asia Pacific - Seoul 권장)

### 2. 데이터베이스 설정
```bash
# Supabase CLI 설치
npm install -g supabase

# 프로젝트 연결
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# 마이그레이션 실행
supabase db push

# Edge Functions 배포
supabase functions deploy ai-chat
supabase functions deploy process-pdf
supabase functions deploy rag-search
supabase functions deploy verify-admin
```

### 3. 환경 변수 설정 (Supabase)
Supabase Dashboard > Settings > Edge Functions > Environment Variables에서 설정:

```
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 4. Vector Extension 활성화
Supabase Dashboard > Database > Extensions에서 `vector` extension 활성화

### 5. Storage 설정
Supabase Dashboard > Storage에서:
1. `chat-files` 버킷 생성
2. Public access 설정 (필요시)

## GitHub Pages 설정

### 1. GitHub Repository 설정
1. GitHub에서 새 repository 생성
2. 로컬 프로젝트를 repository에 push

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### 2. GitHub Secrets 설정
Repository Settings > Secrets and variables > Actions에서 설정:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. GitHub Actions 워크플로우 설정
`.github/workflows/deploy.yml` 파일 생성:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build
      run: npm run build
      env:
        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

### 4. Vite 설정 수정
`vite.config.ts` 파일 수정:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/YOUR_REPO_NAME/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})
```

### 5. GitHub Pages 활성화
Repository Settings > Pages에서:
1. Source: "Deploy from a branch"
2. Branch: "gh-pages"
3. Folder: "/ (root)"

## 환경 변수 설정

### 로컬 개발용 (.env.local)
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_local_supabase_anon_key
```

### 프로덕션용 (GitHub Secrets)
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## AI API 키 설정

### OpenAI API
1. [OpenAI Platform](https://platform.openai.com)에서 API 키 생성
2. Supabase Edge Functions 환경 변수에 `OPENAI_API_KEY` 설정

### Anthropic API
1. [Anthropic Console](https://console.anthropic.com)에서 API 키 생성
2. Supabase Edge Functions 환경 변수에 `ANTHROPIC_API_KEY` 설정

## 배포 과정

### 1. 로컬 테스트
```bash
# 의존성 설치
npm install

# 로컬 Supabase 시작
supabase start

# 개발 서버 실행
npm run dev
```

### 2. 프로덕션 빌드 테스트
```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

### 3. 배포
```bash
# main 브랜치에 push하면 자동 배포
git add .
git commit -m "Deploy to production"
git push origin main
```

## 초기 데이터 설정

### 1. 관리자 계정 생성
1. 애플리케이션에 접속
2. 회원가입 (admin이 포함된 이메일 사용)
3. Supabase Dashboard에서 `user_roles` 테이블에서 역할을 'admin'으로 변경

### 2. 학생 계정 생성
관리자 대시보드 > 학생 관리에서 학생 계정 생성

### 3. 활동 생성
관리자 대시보드 > 활동 관리에서 교육 활동 생성

## 모니터링 및 유지보수

### 1. 로그 확인
- Supabase Dashboard > Logs에서 Edge Functions 로그 확인
- GitHub Actions에서 배포 로그 확인

### 2. 데이터베이스 백업
Supabase Dashboard > Settings > Database에서 정기 백업 설정

### 3. 성능 모니터링
- Supabase Dashboard > Reports에서 사용량 모니터링
- GitHub Pages 트래픽 모니터링

## 문제 해결

### 일반적인 문제들

#### 1. CORS 오류
- Supabase Dashboard > Authentication > Settings에서 Site URL 확인
- GitHub Pages URL을 허용 목록에 추가

#### 2. 환경 변수 오류
- GitHub Secrets 설정 확인
- Supabase Edge Functions 환경 변수 확인

#### 3. 빌드 오류
- Node.js 버전 확인 (18+ 필요)
- 의존성 버전 충돌 확인

#### 4. AI API 오류
- API 키 유효성 확인
- API 사용량 한도 확인
- 네트워크 연결 확인

### 디버깅 팁

1. **브라우저 개발자 도구 활용**
   - Console에서 JavaScript 오류 확인
   - Network 탭에서 API 호출 상태 확인

2. **Supabase 로그 확인**
   - Edge Functions 실행 로그
   - 데이터베이스 쿼리 로그

3. **GitHub Actions 로그 확인**
   - 빌드 과정에서 발생한 오류
   - 배포 과정에서 발생한 문제

## 보안 고려사항

### 1. API 키 보안
- 환경 변수로만 관리
- 클라이언트 코드에 하드코딩 금지
- 정기적인 키 로테이션

### 2. 데이터베이스 보안
- RLS (Row Level Security) 정책 적용
- 최소 권한 원칙 적용
- 정기적인 보안 업데이트

### 3. 사용자 인증
- 강력한 비밀번호 정책
- 세션 타임아웃 설정
- 의심스러운 활동 모니터링

## 성능 최적화

### 1. 프론트엔드 최적화
- 코드 스플리팅 적용
- 이미지 최적화
- 캐싱 전략 구현

### 2. 백엔드 최적화
- 데이터베이스 인덱스 최적화
- Edge Functions 성능 튜닝
- 불필요한 API 호출 최소화

### 3. CDN 활용
- GitHub Pages CDN 활용
- 정적 자산 최적화
- 압축 설정

이 가이드를 따라 배포하면 AI 교육 플랫폼을 성공적으로 운영할 수 있습니다.