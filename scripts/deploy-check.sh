#!/bin/bash

# 배포 전후 검증 스크립트
# 사용법: ./scripts/deploy-check.sh [pre|post] [environment] [url]

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 로깅 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 배포 전 검증
pre_deploy_checks() {
    local env=$1
    
    log_info "Running pre-deployment checks for $env environment..."
    
    # 1. 환경 변수 확인
    check_environment_variables "$env"
    
    # 2. 빌드 테스트
    check_build
    
    # 3. 단위 테스트
    run_unit_tests
    
    # 4. 린팅 및 타입 체크
    run_linting_and_type_check
    
    # 5. 보안 검사
    run_security_checks
    
    # 6. 번들 크기 검사
    check_bundle_size
    
    log_success "Pre-deployment checks completed successfully"
}

# 배포 후 검증
post_deploy_checks() {
    local env=$1
    local url=$2
    
    log_info "Running post-deployment checks for $env environment..."
    log_info "Target URL: $url"
    
    # 1. 사이트 접근성 확인
    check_site_accessibility "$url"
    
    # 2. API 엔드포인트 확인
    check_api_endpoints "$url"
    
    # 3. 데이터베이스 연결 확인
    check_database_connection
    
    # 4. 성능 테스트
    run_performance_tests "$url"
    
    # 5. 보안 헤더 확인
    check_security_headers "$url"
    
    # 6. SEO 및 접근성 확인
    check_seo_and_accessibility "$url"
    
    # 7. 기능 테스트 (스모크 테스트)
    run_smoke_tests "$url"
    
    log_success "Post-deployment checks completed successfully"
}

# 환경 변수 확인
check_environment_variables() {
    local env=$1
    
    log_info "Checking environment variables..."
    
    local required_vars=()
    
    case $env in
        "production")
            required_vars=(
                "VITE_SUPABASE_URL"
                "VITE_SUPABASE_ANON_KEY"
                "SUPABASE_ACCESS_TOKEN"
                "SUPABASE_PROJECT_REF"
            )
            ;;
        "staging")
            required_vars=(
                "VITE_SUPABASE_URL"
                "VITE_SUPABASE_ANON_KEY"
                "SUPABASE_STAGING_ACCESS_TOKEN"
                "SUPABASE_STAGING_PROJECT_REF"
            )
            ;;
    esac
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        exit 1
    fi
    
    log_success "Environment variables check passed"
}

# 빌드 테스트
check_build() {
    log_info "Testing build process..."
    
    if npm run build; then
        log_success "Build test passed"
    else
        log_error "Build test failed"
        exit 1
    fi
}

# 단위 테스트 실행
run_unit_tests() {
    log_info "Running unit tests..."
    
    if npm run test:run; then
        log_success "Unit tests passed"
    else
        log_error "Unit tests failed"
        exit 1
    fi
}

# 린팅 및 타입 체크
run_linting_and_type_check() {
    log_info "Running linting and type checking..."
    
    if npm run lint && npm run type-check; then
        log_success "Linting and type checking passed"
    else
        log_error "Linting or type checking failed"
        exit 1
    fi
}

# 보안 검사
run_security_checks() {
    log_info "Running security checks..."
    
    # npm audit 실행
    if npm audit --audit-level=high; then
        log_success "Security audit passed"
    else
        log_warning "Security vulnerabilities found - review required"
    fi
    
    # 민감한 정보 검사
    if grep -r "password\|secret\|key" src/ --exclude-dir=node_modules --exclude="*.test.*" | grep -v "placeholder\|example\|demo"; then
        log_warning "Potential sensitive information found in source code"
    else
        log_success "No sensitive information found in source code"
    fi
}

# 번들 크기 검사
check_bundle_size() {
    log_info "Checking bundle size..."
    
    if [ -d "dist" ]; then
        local bundle_size=$(du -sh dist/ | cut -f1)
        log_info "Bundle size: $bundle_size"
        
        # 번들 크기가 5MB를 초과하면 경고
        local size_bytes=$(du -sb dist/ | cut -f1)
        local max_size=$((5 * 1024 * 1024))  # 5MB
        
        if [ "$size_bytes" -gt "$max_size" ]; then
            log_warning "Bundle size ($bundle_size) exceeds recommended limit (5MB)"
        else
            log_success "Bundle size check passed"
        fi
    else
        log_error "Build directory not found"
        exit 1
    fi
}

# 사이트 접근성 확인
check_site_accessibility() {
    local url=$1
    
    log_info "Checking site accessibility..."
    
    # HTTP 상태 코드 확인
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status_code" = "200" ]; then
        log_success "Site is accessible (HTTP $status_code)"
    else
        log_error "Site is not accessible (HTTP $status_code)"
        exit 1
    fi
    
    # 응답 시간 확인
    local response_time=$(curl -s -o /dev/null -w "%{time_total}" "$url")
    log_info "Response time: ${response_time}s"
    
    if (( $(echo "$response_time > 3.0" | bc -l) )); then
        log_warning "Response time is slow (${response_time}s)"
    else
        log_success "Response time is acceptable"
    fi
}

# API 엔드포인트 확인
check_api_endpoints() {
    local url=$1
    
    log_info "Checking API endpoints..."
    
    # Supabase API 확인
    if [ -n "$VITE_SUPABASE_URL" ]; then
        local api_status=$(curl -s -o /dev/null -w "%{http_code}" "$VITE_SUPABASE_URL/rest/v1/")
        
        if [ "$api_status" = "200" ] || [ "$api_status" = "401" ]; then
            log_success "Supabase API is accessible"
        else
            log_error "Supabase API is not accessible (HTTP $api_status)"
            exit 1
        fi
    fi
}

# 데이터베이스 연결 확인
check_database_connection() {
    log_info "Checking database connection..."
    
    if command -v supabase &> /dev/null; then
        if supabase db ping --project-ref "$SUPABASE_PROJECT_REF" 2>/dev/null; then
            log_success "Database connection is healthy"
        else
            log_error "Database connection failed"
            exit 1
        fi
    else
        log_warning "Supabase CLI not available - skipping database check"
    fi
}

# 성능 테스트
run_performance_tests() {
    local url=$1
    
    log_info "Running performance tests..."
    
    if command -v lighthouse &> /dev/null; then
        # Lighthouse 성능 테스트
        lighthouse "$url" --only-categories=performance --chrome-flags="--headless" --output=json --output-path=./lighthouse-report.json
        
        local performance_score=$(cat lighthouse-report.json | jq '.categories.performance.score * 100')
        log_info "Performance score: $performance_score"
        
        if (( $(echo "$performance_score >= 80" | bc -l) )); then
            log_success "Performance test passed"
        else
            log_warning "Performance score is below 80"
        fi
        
        rm -f lighthouse-report.json
    else
        log_warning "Lighthouse not available - skipping performance test"
    fi
}

# 보안 헤더 확인
check_security_headers() {
    local url=$1
    
    log_info "Checking security headers..."
    
    local headers=$(curl -s -I "$url")
    
    # 중요한 보안 헤더 확인
    local security_headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
        "Referrer-Policy"
    )
    
    local missing_headers=()
    
    for header in "${security_headers[@]}"; do
        if ! echo "$headers" | grep -i "$header" > /dev/null; then
            missing_headers+=("$header")
        fi
    done
    
    if [ ${#missing_headers[@]} -gt 0 ]; then
        log_warning "Missing security headers:"
        for header in "${missing_headers[@]}"; do
            log_warning "  - $header"
        done
    else
        log_success "Security headers check passed"
    fi
}

# SEO 및 접근성 확인
check_seo_and_accessibility() {
    local url=$1
    
    log_info "Checking SEO and accessibility..."
    
    # 기본 메타 태그 확인
    local page_content=$(curl -s "$url")
    
    if echo "$page_content" | grep -q "<title>"; then
        log_success "Title tag found"
    else
        log_warning "Title tag missing"
    fi
    
    if echo "$page_content" | grep -q 'name="description"'; then
        log_success "Meta description found"
    else
        log_warning "Meta description missing"
    fi
    
    if echo "$page_content" | grep -q 'name="viewport"'; then
        log_success "Viewport meta tag found"
    else
        log_warning "Viewport meta tag missing"
    fi
}

# 스모크 테스트
run_smoke_tests() {
    local url=$1
    
    log_info "Running smoke tests..."
    
    if command -v playwright &> /dev/null; then
        # Playwright 스모크 테스트 실행
        if npm run test:smoke -- --base-url="$url"; then
            log_success "Smoke tests passed"
        else
            log_error "Smoke tests failed"
            exit 1
        fi
    else
        log_warning "Playwright not available - skipping smoke tests"
    fi
}

# 도움말 표시
show_help() {
    echo "Deployment Check Script"
    echo ""
    echo "Usage: $0 [pre|post] [environment] [url]"
    echo ""
    echo "Commands:"
    echo "  pre <env>         Run pre-deployment checks"
    echo "  post <env> <url>  Run post-deployment checks"
    echo ""
    echo "Environments:"
    echo "  staging           Staging environment"
    echo "  production        Production environment"
    echo ""
    echo "Examples:"
    echo "  $0 pre production"
    echo "  $0 post production https://your-site.github.io"
}

# 메인 로직
main() {
    local command=$1
    local env=$2
    local url=$3
    
    case $command in
        "pre")
            if [ -z "$env" ]; then
                log_error "Environment is required for pre-deployment checks"
                show_help
                exit 1
            fi
            pre_deploy_checks "$env"
            ;;
        "post")
            if [ -z "$env" ] || [ -z "$url" ]; then
                log_error "Environment and URL are required for post-deployment checks"
                show_help
                exit 1
            fi
            post_deploy_checks "$env" "$url"
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"