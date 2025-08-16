# AI 교육 플랫폼

AI 챗봇을 활용한 혁신적인 교육 플랫폼으로, 학생들의 학습을 지원하고 교사가 실시간으로 모니터링할 수 있는 종합 교육 솔루션입니다.

## 🌟 주요 기능

### 학생 기능
- **AI 챗봇 대화**: 학습 주제에 대한 질문과 답변
- **논증 활동**: 체계적인 논증문 작성 및 제출
- **동료평가**: 학생 간 상호 평가 시스템
- **파일 공유**: 학습 자료 업로드 및 공유
- **진도 관리**: 체크리스트 기반 학습 진도 추적

### 관리자 기능
- **실시간 모니터링**: 학습 과정 실시간 추적
- **학생 관리**: 계정 및 클래스 관리
- **활동 관리**: 교육 활동 생성 및 관리
- **AI 설정**: 맞춤형 AI 프롬프트 설정
- **분석 대시보드**: 교육 효과 및 참여도 분석

## 🚀 기술 스택

### 프론트엔드
- **React 19** + **TypeScript**
- **Vite** (빌드 도구)
- **Tailwind CSS** (스타일링)
- **React Query** (상태 관리)
- **React Router** (라우팅)

### 백엔드
- **Supabase** (PostgreSQL, 인증, 실시간, 스토리지)
- **Edge Functions** (서버리스 함수)
- **OpenAI/Anthropic** (AI 모델)
- **RAG 시스템** (문서 기반 답변)

### 배포 및 운영
- **GitHub Pages** (프론트엔드 호스팅)
- **GitHub Actions** (CI/CD)
- **Supabase** (백엔드 서비스)

## 📦 설치 및 실행

### 사전 요구사항
- Node.js 18+
- npm 또는 yarn
- Supabase 계정

### 로컬 개발 환경 설정

1. **저장소 클론**
```bash
git clone https://github.com/your-username/ai-education-platform.git
cd ai-education-platform
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 변수 설정**
```bash
cp .env.example .env.local
# .env.local 파일을 편집하여 Supabase 설정 추가
```

4. **Supabase 로컬 환경 시작**
```bash
npx supabase start
```

5. **개발 서버 실행**
```bash
npm run dev
```

## 🧪 테스트

```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 타입 체크
npm run type-check

# 린팅
npm run lint
```

## 🚀 배포

### GitHub Pages 배포

1. **GitHub Secrets 설정**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_ACCESS_TOKEN`
   - `SUPABASE_PROJECT_REF`

2. **자동 배포**
```bash
git push origin main
```

자세한 배포 가이드는 [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)를 참조하세요.

## 📚 문서

- [사용자 매뉴얼](docs/USER_MANUAL.md)
- [관리자 가이드](docs/ADMIN_GUIDE.md)
- [배포 가이드](docs/DEPLOYMENT_GUIDE.md)
- [실시간 기능 가이드](docs/REALTIME_FEATURES.md)

## 🏗️ 프로젝트 구조

```
src/
├── components/          # React 컴포넌트
│   ├── admin/          # 관리자 전용 컴포넌트
│   ├── student/        # 학생 전용 컴포넌트
│   ├── common/         # 공통 컴포넌트
│   └── ui/            # 재사용 가능한 UI 컴포넌트
├── hooks/              # 커스텀 React 훅
├── pages/              # 페이지 컴포넌트
├── utils/              # 유틸리티 함수
├── lib/                # 라이브러리 설정
└── config/             # 환경 설정

supabase/
├── functions/          # Edge Functions
├── migrations/         # 데이터베이스 마이그레이션
└── config.toml        # Supabase 설정

docs/                   # 문서
scripts/                # 배포 및 관리 스크립트
```

## 🔧 개발 스크립트

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview

# 타입 체크
npm run type-check

# 린팅
npm run lint

# 테스트 실행
npm run test

# E2E 테스트
npm run test:e2e

# 커버리지 리포트
npm run test:coverage
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 지원

- 이메일: support@ai-education-platform.com
- 이슈 트래커: [GitHub Issues](https://github.com/your-username/ai-education-platform/issues)
- 문서: [프로젝트 문서](docs/)

## 🙏 감사의 말

이 프로젝트는 다음 오픈소스 프로젝트들의 도움을 받았습니다:

- [React](https://reactjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)

---

**AI 교육 플랫폼**으로 더 나은 교육 환경을 만들어보세요! 🎓✨