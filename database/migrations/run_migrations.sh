#!/bin/bash

# RSS Visit Report Database Migration Runner
# This script handles database schema migrations and data migrations

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-rss_visit_reports}"
DB_USER="${DB_USER:-rss_app_user}"
MIGRATION_TABLE="rss_audit.schema_migrations"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Check if psql is available
check_psql() {
    if ! command -v psql &> /dev/null; then
        log_error "psql is not installed or not in PATH"
        exit 1
    fi
}

# Test database connection
test_connection() {
    log_info "Testing database connection..."
    
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        log_error "Cannot connect to database. Please check your connection parameters."
        log_error "Host: $DB_HOST, Port: $DB_PORT, Database: $DB_NAME, User: $DB_USER"
        exit 1
    fi
    
    log_info "Database connection successful"
}

# Create migration tracking table if it doesn't exist
create_migration_table() {
    log_info "Creating migration tracking table..."
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
CREATE SCHEMA IF NOT EXISTS rss_audit;

CREATE TABLE IF NOT EXISTS $MIGRATION_TABLE (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER,
    checksum VARCHAR(64),
    executed_by VARCHAR(100) DEFAULT current_user
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_name ON $MIGRATION_TABLE(migration_name);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_executed_at ON $MIGRATION_TABLE(executed_at);
EOF
    
    log_info "Migration tracking table ready"
}

# Get list of executed migrations
get_executed_migrations() {
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -c "SELECT migration_name FROM $MIGRATION_TABLE ORDER BY executed_at;"
}

# Calculate file checksum
calculate_checksum() {
    local file="$1"
    if command -v sha256sum &> /dev/null; then
        sha256sum "$file" | cut -d' ' -f1
    elif command -v shasum &> /dev/null; then
        shasum -a 256 "$file" | cut -d' ' -f1
    else
        log_warn "No checksum utility found, using file size"
        stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo "0"
    fi
}

# Execute a single migration
execute_migration() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file" .sql)
    
    log_info "Executing migration: $migration_name"
    
    # Calculate checksum
    local checksum=$(calculate_checksum "$migration_file")
    
    # Start timing
    local start_time=$(date +%s%3N)
    
    # Execute migration in a transaction
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
BEGIN;

-- Execute the migration
\i $migration_file

-- Record the migration
INSERT INTO $MIGRATION_TABLE (migration_name, executed_at, execution_time_ms, checksum, executed_by)
VALUES (
    '$migration_name',
    CURRENT_TIMESTAMP,
    $(( $(date +%s%3N) - start_time )),
    '$checksum',
    current_user
);

COMMIT;
EOF
    
    if [ $? -eq 0 ]; then
        local end_time=$(date +%s%3N)
        local duration=$(( end_time - start_time ))
        log_info "Migration $migration_name completed successfully in ${duration}ms"
    else
        log_error "Migration $migration_name failed"
        exit 1
    fi
}

# Run all pending migrations
run_migrations() {
    local migration_dir="$1"
    
    if [ ! -d "$migration_dir" ]; then
        log_error "Migration directory not found: $migration_dir"
        exit 1
    fi
    
    log_info "Looking for migrations in: $migration_dir"
    
    # Get executed migrations
    local executed_migrations=$(get_executed_migrations | tr -d ' ')
    
    # Find migration files
    local migration_files=()
    while IFS= read -r -d '' file; do
        migration_files+=("$file")
    done < <(find "$migration_dir" -name "*.sql" -type f -print0 | sort -z)
    
    if [ ${#migration_files[@]} -eq 0 ]; then
        log_warn "No migration files found in $migration_dir"
        return
    fi
    
    local pending_count=0
    local executed_count=0
    
    # Check each migration file
    for migration_file in "${migration_files[@]}"; do
        local migration_name=$(basename "$migration_file" .sql)
        
        if echo "$executed_migrations" | grep -q "^$migration_name$"; then
            log_debug "Migration already executed: $migration_name"
            ((executed_count++))
        else
            log_info "Pending migration: $migration_name"
            execute_migration "$migration_file"
            ((pending_count++))
        fi
    done
    
    log_info "Migration summary: $executed_count already executed, $pending_count newly executed"
}

# Rollback last migration
rollback_migration() {
    log_warn "Rollback functionality not implemented yet"
    log_warn "Please manually rollback the database changes if needed"
    exit 1
}

# Show migration status
show_status() {
    log_info "Migration Status:"
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
\pset border 2
\pset format aligned

SELECT 
    migration_name,
    executed_at,
    execution_time_ms || 'ms' AS duration,
    executed_by
FROM $MIGRATION_TABLE 
ORDER BY executed_at DESC 
LIMIT 20;
EOF
}

# Create a new migration file
create_migration() {
    local description="$1"
    
    if [ -z "$description" ]; then
        log_error "Migration description is required"
        echo "Usage: $0 create 'Add new column to users table'"
        exit 1
    fi
    
    # Generate timestamp
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    
    # Create filename
    local filename="${timestamp}_$(echo "$description" | tr ' ' '_' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_]//g').sql"
    
    # Create migration file
    local migration_file="$SCRIPT_DIR/$filename"
    
cat > "$migration_file" << EOF
-- Migration: $description
-- Created: $(date)
-- Author: $(whoami)

BEGIN;

-- Add your migration SQL here
-- Example:
-- ALTER TABLE rss_app.visit_reports ADD COLUMN new_field VARCHAR(100);

-- Don't forget to update any indexes, constraints, or permissions as needed

COMMIT;
EOF
    
    log_info "Created migration file: $migration_file"
    log_info "Please edit the file and add your migration SQL"
}

# Backup database before migrations
backup_database() {
    local backup_dir="$SCRIPT_DIR/../backups"
    mkdir -p "$backup_dir"
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$backup_dir/pre_migration_backup_$timestamp.sql"
    
    log_info "Creating backup before migrations: $backup_file"
    
    PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        --verbose --no-owner --no-privileges --clean --if-exists \
        "$DB_NAME" > "$backup_file"
    
    if [ $? -eq 0 ]; then
        log_info "Backup created successfully"
    else
        log_error "Backup failed"
        exit 1
    fi
}

# Main function
main() {
    local command="${1:-migrate}"
    
    case "$command" in
        "migrate")
            check_psql
            test_connection
            create_migration_table
            
            # Ask for backup
            read -p "Create backup before migration? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                backup_database
            fi
            
            run_migrations "$SCRIPT_DIR"
            ;;
        "status")
            check_psql
            test_connection
            show_status
            ;;
        "create")
            create_migration "$2"
            ;;
        "rollback")
            rollback_migration
            ;;
        "backup")
            check_psql
            test_connection
            backup_database
            ;;
        "init")
            check_psql
            test_connection
            log_info "Initializing database schema..."
            
            # Run initialization script
            local init_script="$SCRIPT_DIR/../init/00_init_database.sql"
            if [ -f "$init_script" ]; then
                PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$init_script"
                log_info "Database initialization completed"
            else
                log_error "Initialization script not found: $init_script"
                exit 1
            fi
            
            # Run schema migrations
            run_migrations "$SCRIPT_DIR/../schema"
            ;;
        *)
            echo "Usage: $0 {migrate|status|create|rollback|backup|init}"
            echo ""
            echo "Commands:"
            echo "  migrate  - Run pending migrations (default)"
            echo "  status   - Show migration status"
            echo "  create   - Create new migration file"
            echo "  rollback - Rollback last migration (not implemented)"
            echo "  backup   - Create database backup"
            echo "  init     - Initialize database and run all schema migrations"
            echo ""
            echo "Environment variables:"
            echo "  DB_HOST     - Database host (default: localhost)"
            echo "  DB_PORT     - Database port (default: 5432)"
            echo "  DB_NAME     - Database name (default: rss_visit_reports)"
            echo "  DB_USER     - Database user (default: rss_app_user)"
            echo "  DB_PASSWORD - Database password (required)"
            exit 1
            ;;
    esac
}

# Check if DB_PASSWORD is set
if [ -z "$DB_PASSWORD" ]; then
    log_error "DB_PASSWORD environment variable is required"
    exit 1
fi

# Run main function
main "$@"