-- RSS Visit Report Database Initialization
-- This script initializes the database with required extensions and basic setup

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create application-specific database if not exists
-- This would typically be run by database administrator
SELECT 'CREATE DATABASE rss_visit_reports'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'rss_visit_reports')\gexec

-- Set timezone
SET timezone = 'UTC';

-- Create application roles
DO $$
BEGIN
    -- Application user role
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rss_app_user') THEN
        CREATE ROLE rss_app_user WITH
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            NOINHERIT
            NOREPLICATION
            CONNECTION LIMIT 10;
    END IF;
    
    -- Read-only role for reporting
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rss_readonly') THEN
        CREATE ROLE rss_readonly WITH
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            NOINHERIT
            NOREPLICATION
            CONNECTION LIMIT 5;
    END IF;
    
    -- Admin role for maintenance
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rss_admin') THEN
        CREATE ROLE rss_admin WITH
            LOGIN
            NOSUPERUSER
            CREATEDB
            NOCREATEROLE
            INHERIT
            NOREPLICATION
            CONNECTION LIMIT 3;
    END IF;
END
$$;

-- Create application schema
CREATE SCHEMA IF NOT EXISTS rss_app AUTHORIZATION rss_app_user;
CREATE SCHEMA IF NOT EXISTS rss_audit AUTHORIZATION rss_app_user;
CREATE SCHEMA IF NOT EXISTS rss_config AUTHORIZATION rss_app_user;

-- Set default schema for application user
ALTER ROLE rss_app_user SET search_path = rss_app, public;

-- Create sequences for primary keys
CREATE SEQUENCE IF NOT EXISTS rss_app.visit_report_seq
    START WITH 1000
    INCREMENT BY 1
    MINVALUE 1000
    MAXVALUE 999999999
    CACHE 10;

CREATE SEQUENCE IF NOT EXISTS rss_app.hardware_inventory_seq
    START WITH 10000
    INCREMENT BY 1
    MINVALUE 10000
    MAXVALUE 999999999
    CACHE 20;

CREATE SEQUENCE IF NOT EXISTS rss_app.audit_log_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 999999999999
    CACHE 100;

-- Create application configuration table
CREATE TABLE IF NOT EXISTS rss_config.app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_sensitive BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);

-- Insert default configuration
INSERT INTO rss_config.app_settings (key, value, description, category) VALUES
    ('app.version', '"1.0.0"', 'Application version', 'system'),
    ('app.maintenance_mode', 'false', 'Enable maintenance mode', 'system'),
    ('auth.session_timeout', '1800', 'Session timeout in seconds', 'security'),
    ('auth.max_login_attempts', '5', 'Maximum login attempts before lockout', 'security'),
    ('auth.lockout_duration', '900', 'Account lockout duration in seconds', 'security'),
    ('files.max_upload_size', '10485760', 'Maximum file upload size in bytes', 'files'),
    ('files.allowed_types', '["image/jpeg","image/png","image/gif","application/pdf"]', 'Allowed file types', 'files'),
    ('email.enabled', 'true', 'Enable email notifications', 'notifications'),
    ('backup.retention_days', '90', 'Backup retention period in days', 'maintenance'),
    ('audit.log_level', '"info"', 'Audit logging level', 'security')
ON CONFLICT (key) DO NOTHING;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION rss_app.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate report IDs
CREATE OR REPLACE FUNCTION rss_app.generate_report_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
BEGIN
    SELECT 'RPT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
           LPAD(nextval('rss_app.visit_report_seq')::text, 6, '0')
    INTO new_id;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate hardware asset tags
CREATE OR REPLACE FUNCTION rss_app.generate_asset_tag()
RETURNS TEXT AS $$
DECLARE
    new_tag TEXT;
BEGIN
    SELECT 'AST-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
           LPAD(nextval('rss_app.hardware_inventory_seq')::text, 6, '0')
    INTO new_tag;
    RETURN new_tag;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION rss_audit.log_changes()
RETURNS TRIGGER AS $$
DECLARE
    audit_data JSONB;
BEGIN
    -- Build audit data
    audit_data = jsonb_build_object(
        'table_name', TG_TABLE_NAME,
        'operation', TG_OP,
        'timestamp', CURRENT_TIMESTAMP,
        'user', current_user
    );
    
    -- Add old and new values for UPDATE
    IF TG_OP = 'UPDATE' THEN
        audit_data = audit_data || jsonb_build_object(
            'old_values', to_jsonb(OLD),
            'new_values', to_jsonb(NEW)
        );
    ELSIF TG_OP = 'DELETE' THEN
        audit_data = audit_data || jsonb_build_object(
            'old_values', to_jsonb(OLD)
        );
    ELSIF TG_OP = 'INSERT' THEN
        audit_data = audit_data || jsonb_build_object(
            'new_values', to_jsonb(NEW)
        );
    END IF;
    
    -- Insert into audit log
    INSERT INTO rss_audit.audit_log (table_name, operation, changed_data, changed_by)
    VALUES (TG_TABLE_NAME, TG_OP, audit_data, current_user);
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT USAGE ON SCHEMA rss_app TO rss_app_user;
GRANT USAGE ON SCHEMA rss_audit TO rss_app_user;
GRANT USAGE ON SCHEMA rss_config TO rss_app_user;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA rss_app TO rss_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA rss_app TO rss_app_user;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA rss_audit TO rss_app_user;
GRANT SELECT ON ALL TABLES IN SCHEMA rss_config TO rss_app_user;
GRANT UPDATE ON rss_config.app_settings TO rss_app_user;

-- Grant read-only permissions
GRANT USAGE ON SCHEMA rss_app TO rss_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA rss_app TO rss_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA rss_audit TO rss_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA rss_config TO rss_readonly;

-- Grant admin permissions
GRANT ALL ON SCHEMA rss_app TO rss_admin;
GRANT ALL ON SCHEMA rss_audit TO rss_admin;
GRANT ALL ON SCHEMA rss_config TO rss_admin;
GRANT ALL ON ALL TABLES IN SCHEMA rss_app TO rss_admin;
GRANT ALL ON ALL TABLES IN SCHEMA rss_audit TO rss_admin;
GRANT ALL ON ALL TABLES IN SCHEMA rss_config TO rss_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA rss_app TO rss_admin;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON rss_config.app_settings(category);
CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at ON rss_config.app_settings(updated_at);

-- Set up row level security (RLS) for multi-tenancy
ALTER TABLE rss_config.app_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for app settings
CREATE POLICY app_settings_policy ON rss_config.app_settings
    USING (NOT is_sensitive OR current_user = 'rss_admin');

-- Log initialization completion
INSERT INTO rss_audit.audit_log (table_name, operation, changed_data, changed_by)
VALUES ('system', 'INITIALIZE', 
        jsonb_build_object('event', 'database_initialized', 'timestamp', CURRENT_TIMESTAMP),
        current_user);

COMMIT;