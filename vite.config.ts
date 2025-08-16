import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  const isGitHubPages = process.env.GITHUB_PAGES === 'true'

  return {
    plugins: [react()],
    
    // GitHub Pages 배포를 위한 base path 설정
    base: isGitHubPages ? '/ai-education-platform/' : '/',
    
    // 개발 서버 설정
    server: {
      port: 5173,
      host: true,
      open: true,
    },
    
    // 빌드 최적화 설정
    build: {
      outDir: 'dist',
      sourcemap: !isProduction,
      minify: isProduction ? 'esbuild' : false,
      
      // 청크 분할 최적화
      rollupOptions: {
        output: {
          manualChunks: {
            // 벤더 라이브러리 분리
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            query: ['@tanstack/react-query'],
            supabase: ['@supabase/supabase-js'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
            
            // 페이지별 청크 분리
            admin: [
              './src/pages/AdminDashboard.tsx',
              './src/pages/admin/StudentsManagePage.tsx',
              './src/pages/admin/ActivitiesManagePage.tsx',
              './src/pages/admin/ChatMonitoringPage.tsx',
              './src/pages/admin/FileManagePage.tsx',
              './src/pages/admin/AISettingsPage.tsx',
            ],
            student: [
              './src/pages/StudentDashboard.tsx',
              './src/pages/StudentActivityPage.tsx',
              './src/pages/StudentChatPage.tsx',
              './src/pages/StudentHistoryPage.tsx',
              './src/pages/StudentProfilePage.tsx',
            ],
          },
          
          // 파일명 패턴 설정
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
            if (facadeModuleId) {
              const name = facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
              return `assets/${name}-[hash].js`
            }
            return 'assets/[name]-[hash].js'
          },
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      
      // 번들 크기 경고 임계값
      chunkSizeWarningLimit: 1000,
      
      // 압축 설정
      reportCompressedSize: true,
      
      // 타겟 브라우저 설정
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
    },
    
    // 해상도 별칭 설정
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@components': resolve(__dirname, './src/components'),
        '@pages': resolve(__dirname, './src/pages'),
        '@hooks': resolve(__dirname, './src/hooks'),
        '@utils': resolve(__dirname, './src/utils'),
        '@lib': resolve(__dirname, './src/lib'),
        '@types': resolve(__dirname, './src/types'),
      },
    },
    
    // 환경 변수 설정
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __COMMIT_HASH__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) || 'dev'),
    },
    
    // CSS 설정
    css: {
      devSourcemap: !isProduction,
      postcss: {
        plugins: [
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('tailwindcss'),
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('autoprefixer'),
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          ...(isProduction ? [require('cssnano')] : []),
        ],
      },
    },
    
    // 최적화 설정
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        '@supabase/supabase-js',
      ],
      exclude: ['@vite/client', '@vite/env'],
    },
    
    // 미리보기 서버 설정
    preview: {
      port: 4173,
      host: true,
    },
    
    // 실험적 기능
    experimental: {
      renderBuiltUrl(filename, { hostType }) {
        if (hostType === 'js') {
          return { js: `/${filename}` }
        } else {
          return { relative: true }
        }
      },
    },
  }
})