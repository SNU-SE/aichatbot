#!/bin/bash

# 데이터베이스 마이그레이션 관리 스크립트
# 사용법: ./scripts/migrate.sh [command] [environment]

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 환경 변수 확인
check_env() {
    local env=$1
    
    case $env in
        "local")
            if [ -z "$SUPABASE_LOCAL_DB_URL" ]; then
                log_error "SUPABASE_LOCAL_DB_URL is not set"
                exit 1
            fi
            ;;
        "staging")
            if [ -z "$SUPABASE_STAGING_ACCESS_TOKEN" ] || [ -z "$SUPABASE_STAGING_PROJECT_REF" ]; then
                log_error "SUPABASE_STAGING_ACCESS_TOKEN and SUPABASE_STAGING_PROJECT_REF must be set"
                exit 1
            fi
            ;;
        "production")
            if [ -z "$SUPABASE_ACCESS_TOKEN" ] || [ -z "$SUPABASE_PROJECT_REF" ]; then
                log_error "SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF must be set"
                exit 1
            fi
            ;;
        *)
            log_error "Invalid environment: $env. Use 'local', 'staging', or 'production'"
            exit 1
            ;;
    esac
}

# Supabase CLI 설치 확인
check_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        log_error "Supabase CLI is not installed"
        log_info "Install it with: npm install -g supabase"
        exit 1
    fi
}

# 마이그레이션 파일 검증
validate_migrations() {
    log_info "Validating migration files..."
    
    local migration_dir="supabase/migrations"
    local errors=0
    
    # 마이그레이션 파일 존재 확인
    if [ ! -d "$migration_dir" ]; then
        log_error "Migration directory not found: $migration_dir"
        exit 1
    fi
    
    # 마이그레이션 파일 순서 확인
    local prev_timestamp=""
    for file in "$migration_dir"/*.sql; do
        if [ -f "$file" ]; then
            local filename=$(basename "$file")
            local timestamp=${filename:0:14}
            
            if [[ ! $timestamp =~ ^[0-9]{14}$ ]]; then
                log_error "Invalid timestamp format in file: $filename"
                ((errors++))
                continue
            fi
            
            if [ -n "$prev_timestamp" ] && [ "$timestamp" -le "$prev_timestamp" ]; then
                log_error "Migration files are not in chronological order: $filename"
                ((errors++))
            fi
            
            prev_timestamp=$timestamp
        fi
    done
    
    if [ $errors -gt 0 ]; then
        log_error "Migration validation failed with $errors errors"
        exit 1
    fi
    
    log_success "Migration files validated successfully"
}

# 백업 생성
create_backup() {
    local env=$1
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    
    log_info "Creating backup: $backup_name"
    
    case $env in
        "local")
            supabase db dump --local > "backups/${backup_name}.sql"
            ;;
        "staging")
            supabase db dump --project-ref "$SUPABASE_STAGING_PROJECT_REF" > "backups/${backup_name}.sql"
            ;;
        "production")
            supabase db dump --project-ref "$SUPABASE_PROJECT_REF" > "backups/${backup_name}.sql"
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        log_success "Backup created: backups/${backup_name}.sql"
        echo "$backup_name"
    else
        log_error "Failed to create backup"
        exit 1
    fi
}

# 마이그레이션 실행
run_migrations() {
    local env=$1
    local create_backup_flag=$2
    
    log_info "Running migrations for $env environment..."
    
    # 백업 생성 (프로덕션에서는 항상, 다른 환경에서는 옵션)
    if [ "$env" = "production" ] || [ "$create_backup_flag" = "--backup" ]; then
        mkdir -p backups
        backup_name=$(create_backup "$env")
    fi
    
    # 마이그레이션 실행
    case $env in
        "local")
            supabase db push --local
            ;;
        "staging")
            supabase db push --project-ref "$SUPABASE_STAGING_PROJECT_REF"
            ;;
        "production")
            # 프로덕션에서는 더 신중하게
            log_warning "You are about to run migrations on PRODUCTION environment"
            read -p "Are you sure? (yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                log_info "Migration cancelled"
                exit 0
            fi
            
            supabase db push --project-ref "$SUPABASE_PROJECT_REF"
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        log_success "Migrations completed successfully"
        
        # 마이그레이션 후 검증
        verify_migrations "$env"
    else
        log_error "Migration failed"
        
        if [ -n "$backup_name" ]; then
            log_info "Backup available at: backups/${backup_name}.sql"
            log_info "To restore: ./scripts/migrate.sh restore $env backups/${backup_name}.sql"
        fi
        
        exit 1
    fi
}

# 마이그레이션 검증
verify_migrations() {
    local env=$1
    
    log_info "Verifying migrations..."
    
    # 기본 테이블 존재 확인
    local tables=("students" "activities" "chat_logs" "user_roles")
    
    for table in "${tables[@]}"; do
        case $env in
            "local")
                result=$(supabase db query --local "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');")
                ;;
            "staging")
                result=$(supabase db query --project-ref "$SUPABASE_STAGING_PROJECT_REF" "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');")
                ;;
            "production")
                result=$(supabase db query --project-ref "$SUPABASE_PROJECT_REF" "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');")
                ;;
        esac
        
        if [[ $result == *"t"* ]]; then
            log_success "Table '$table' exists"
        else
            log_error "Table '$table' does not exist"
            exit 1
        fi
    done
    
    log_success "Migration verification completed"
}

# 백업에서 복원
restore_backup() {
    local env=$1
    local backup_file=$2
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_warning "You are about to restore from backup: $backup_file"
    log_warning "This will OVERWRITE the current database in $env environment"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi
    
    log_info "Restoring from backup..."
    
    case $env in
        "local")
            supabase db reset --local
            psql "$SUPABASE_LOCAL_DB_URL" < "$backup_file"
            ;;
        "staging")
            # 스테이징 환경 복원 로직
            log_error "Staging restore not implemented yet"
            exit 1
            ;;
        "production")
            # 프로덕션 환경 복원 로직 (매우 신중하게)
            log_error "Production restore requires manual intervention"
            exit 1
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        log_success "Restore completed successfully"
    else
        log_error "Restore failed"
        exit 1
    fi
}

# 마이그레이션 상태 확인
check_status() {
    local env=$1
    
    log_info "Checking migration status for $env environment..."
    
    case $env in
        "local")
            supabase migration list --local
            ;;
        "staging")
            supabase migration list --project-ref "$SUPABASE_STAGING_PROJECT_REF"
            ;;
        "production")
            supabase migration list --project-ref "$SUPABASE_PROJECT_REF"
            ;;
    esac
}

# 새 마이그레이션 생성
create_migration() {
    local name=$1
    
    if [ -z "$name" ]; then
        log_error "Migration name is required"
        log_info "Usage: ./scripts/migrate.sh create <migration_name>"
        exit 1
    fi
    
    log_info "Creating new migration: $name"
    
    supabase migration new "$name"
    
    if [ $? -eq 0 ]; then
        log_success "Migration created successfully"
        log_info "Edit the migration file in supabase/migrations/"
    else
        log_error "Failed to create migration"
        exit 1
    fi
}

# 도움말 표시
show_help() {
    echo "Database Migration Management Script"
    echo ""
    echo "Usage: $0 [command] [environment] [options]"
    echo ""
    echo "Commands:"
    echo "  migrate <env>     Run migrations (env: local|staging|production)"
    echo "  status <env>      Check migration status"
    echo "  backup <env>      Create database backup"
    echo "  restore <env> <backup_file>  Restore from backup"
    echo "  create <name>     Create new migration"
    echo "  validate          Validate migration files"
    echo "  help              Show this help message"
    echo ""
    echo "Options:"
    echo "  --backup          Create backup before migration"
    echo ""
    echo "Examples:"
    echo "  $0 migrate local"
    echo "  $0 migrate production --backup"
    echo "  $0 status staging"
    echo "  $0 create add_user_preferences"
    echo "  $0 restore local backups/backup_20240101_120000.sql"
}

# 메인 로직
main() {
    local command=$1
    local env=$2
    local option=$3
    
    # Supabase CLI 확인
    check_supabase_cli
    
    case $command in
        "migrate")
            if [ -z "$env" ]; then
                log_error "Environment is required"
                show_help
                exit 1
            fi
            check_env "$env"
            validate_migrations
            run_migrations "$env" "$option"
            ;;
        "status")
            if [ -z "$env" ]; then
                log_error "Environment is required"
                show_help
                exit 1
            fi
            check_env "$env"
            check_status "$env"
            ;;
        "backup")
            if [ -z "$env" ]; then
                log_error "Environment is required"
                show_help
                exit 1
            fi
            check_env "$env"
            mkdir -p backups
            create_backup "$env"
            ;;
        "restore")
            if [ -z "$env" ] || [ -z "$option" ]; then
                log_error "Environment and backup file are required"
                show_help
                exit 1
            fi
            check_env "$env"
            restore_backup "$env" "$option"
            ;;
        "create")
            create_migration "$env"
            ;;
        "validate")
            validate_migrations
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