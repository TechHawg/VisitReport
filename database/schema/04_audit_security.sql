-- Audit, Security, and Compliance Tables
-- RSS Visit Report Database Schema

-- Audit log for all database changes
CREATE TABLE audit.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event identification
    event_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    severity_level VARCHAR(20) NOT NULL DEFAULT 'info',
    
    -- Entity information
    table_name VARCHAR(100),
    record_id UUID,
    operation VARCHAR(20), -- INSERT, UPDATE, DELETE, SELECT
    
    -- User and session context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Request context
    request_method VARCHAR(10),
    request_path TEXT,
    request_query TEXT,
    response_status INTEGER,
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timing
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_time_ms INTEGER,
    
    CONSTRAINT valid_severity CHECK (severity_level IN ('debug', 'info', 'warning', 'error', 'critical')),
    CONSTRAINT valid_operation CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT', 'LOGIN', 'LOGOUT', 'FAILED_LOGIN'))
);

-- Security events and alerts
CREATE TABLE audit.security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event classification
    event_type VARCHAR(50) NOT NULL,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
    status VARCHAR(20) DEFAULT 'open',
    
    -- Event details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    source_ip INET,
    target_resource TEXT,
    
    -- User context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID,
    
    -- Attack details
    attack_vector VARCHAR(100),
    attack_indicators JSONB DEFAULT '[]',
    threat_intelligence JSONB DEFAULT '{}',
    
    -- Response tracking
    investigated BOOLEAN DEFAULT false,
    investigated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    investigation_notes TEXT,
    resolution_action TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Notification tracking
    notifications_sent JSONB DEFAULT '[]',
    escalated BOOLEAN DEFAULT false,
    escalated_at TIMESTAMP WITH TIME ZONE,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_risk_level CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_status CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive'))
);

-- Data classification and compliance
CREATE TABLE compliance_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    regulation_body VARCHAR(100), -- SOX, PCI-DSS, GDPR, etc.
    compliance_level VARCHAR(50),
    requirements JSONB DEFAULT '{}',
    data_retention_days INTEGER,
    data_classification VARCHAR(50),
    audit_frequency_days INTEGER DEFAULT 90,
    is_required BOOLEAN DEFAULT true,
    effective_date DATE,
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert common compliance requirements
INSERT INTO compliance_requirements (name, description, regulation_body, compliance_level, data_retention_days, data_classification, audit_frequency_days) VALUES
('SOX Section 404', 'Internal control over financial reporting', 'SOX', 'mandatory', 2555, 'confidential', 90),
('PCI-DSS Level 1', 'Payment Card Industry Data Security Standard', 'PCI', 'conditional', 1095, 'restricted', 90),
('GDPR Article 5', 'Principles relating to processing of personal data', 'GDPR', 'conditional', 1095, 'personal', 30),
('ISO 27001', 'Information security management systems', 'ISO', 'recommended', 2190, 'confidential', 365),
('NIST Cybersecurity Framework', 'Framework for improving critical infrastructure cybersecurity', 'NIST', 'recommended', 2190, 'confidential', 180);

-- Data retention policies
CREATE TABLE data_retention_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    compliance_requirement_id UUID REFERENCES compliance_requirements(id) ON DELETE SET NULL,
    
    -- Policy details
    policy_name VARCHAR(100) NOT NULL,
    data_category VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    retention_period_days INTEGER NOT NULL,
    
    -- Archive settings
    archive_after_days INTEGER,
    archive_location VARCHAR(255),
    archive_format VARCHAR(50),
    
    -- Deletion settings
    auto_delete BOOLEAN DEFAULT false,
    deletion_method VARCHAR(50) DEFAULT 'soft_delete',
    requires_approval BOOLEAN DEFAULT true,
    
    -- Legal hold settings
    legal_hold_override BOOLEAN DEFAULT false,
    legal_hold_reason TEXT,
    legal_hold_expires DATE,
    
    -- Compliance tracking
    last_compliance_review DATE,
    next_compliance_review DATE,
    compliance_status VARCHAR(50) DEFAULT 'compliant',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_deletion_method CHECK (deletion_method IN ('soft_delete', 'hard_delete', 'archive', 'anonymize')),
    CONSTRAINT valid_compliance_status CHECK (compliance_status IN ('compliant', 'warning', 'non_compliant', 'under_review'))
);

-- Role-based access control
CREATE TABLE access_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    resource_access JSONB DEFAULT '{}',
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO access_roles (name, description, permissions, is_system_role) VALUES
('System Administrator', 'Full system access and administration', 
 '{"users": ["create", "read", "update", "delete"], "reports": ["create", "read", "update", "delete"], "hardware": ["create", "read", "update", "delete"], "recycling": ["create", "read", "update", "delete"], "audit": ["read"], "system": ["configure", "backup", "restore"]}', 
 true),
('Manager', 'Department management and reporting access', 
 '{"users": ["read"], "reports": ["create", "read", "update"], "hardware": ["read", "update"], "recycling": ["read", "update"], "audit": ["read"]}', 
 true),
('Senior Technician', 'Full technical operations access', 
 '{"reports": ["create", "read", "update"], "hardware": ["create", "read", "update"], "recycling": ["create", "read", "update"], "files": ["upload", "download"]}', 
 true),
('Technician', 'Standard technician access', 
 '{"reports": ["create", "read", "update"], "hardware": ["read", "update"], "recycling": ["read", "update"], "files": ["upload", "download"]}', 
 true),
('Auditor', 'Read-only access for compliance auditing', 
 '{"reports": ["read"], "hardware": ["read"], "recycling": ["read"], "audit": ["read"]}', 
 true),
('Read Only', 'View-only access to reports and data', 
 '{"reports": ["read"], "hardware": ["read"], "recycling": ["read"]}', 
 true);

-- User role assignments
CREATE TABLE user_role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES access_roles(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(user_id, role_id)
);

-- Email notification settings and logs
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Notification preferences
    email_enabled BOOLEAN DEFAULT true,
    report_completion BOOLEAN DEFAULT true,
    hardware_alerts BOOLEAN DEFAULT true,
    recycling_reminders BOOLEAN DEFAULT true,
    security_alerts BOOLEAN DEFAULT true,
    system_maintenance BOOLEAN DEFAULT false,
    
    -- Frequency settings
    digest_frequency VARCHAR(20) DEFAULT 'daily',
    digest_time TIME DEFAULT '09:00:00',
    
    -- Email settings
    preferred_email VARCHAR(255),
    backup_email VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_digest_frequency CHECK (digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'disabled'))
);

-- Email delivery log
CREATE TABLE email_delivery_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Email details
    recipient_email VARCHAR(255) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    email_type VARCHAR(50) NOT NULL,
    
    -- Content and attachments
    has_attachments BOOLEAN DEFAULT false,
    attachment_count INTEGER DEFAULT 0,
    email_size_bytes INTEGER,
    
    -- Related entities
    visit_report_id UUID REFERENCES visit_reports(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Delivery tracking
    status VARCHAR(50) DEFAULT 'queued',
    delivery_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Provider tracking
    provider_message_id VARCHAR(255),
    provider_response JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('queued', 'sending', 'delivered', 'failed', 'bounced', 'spam')),
    CONSTRAINT valid_email_type CHECK (email_type IN ('report_notification', 'security_alert', 'system_notification', 'password_reset', 'welcome', 'digest'))
);

-- Create indexes for audit and security tables
CREATE INDEX idx_audit_log_timestamp ON audit.audit_log(event_timestamp);
CREATE INDEX idx_audit_log_user ON audit.audit_log(user_id);
CREATE INDEX idx_audit_log_table ON audit.audit_log(table_name);
CREATE INDEX idx_audit_log_operation ON audit.audit_log(operation);
CREATE INDEX idx_audit_log_severity ON audit.audit_log(severity_level);
CREATE INDEX idx_audit_log_event_type ON audit.audit_log(event_type);

CREATE INDEX idx_security_events_type ON audit.security_events(event_type);
CREATE INDEX idx_security_events_risk ON audit.security_events(risk_level);
CREATE INDEX idx_security_events_status ON audit.security_events(status);
CREATE INDEX idx_security_events_user ON audit.security_events(user_id);
CREATE INDEX idx_security_events_created ON audit.security_events(created_at);
CREATE INDEX idx_security_events_ip ON audit.security_events(source_ip);

CREATE INDEX idx_compliance_requirements_body ON compliance_requirements(regulation_body);
CREATE INDEX idx_compliance_requirements_level ON compliance_requirements(compliance_level);
CREATE INDEX idx_compliance_requirements_active ON compliance_requirements(is_required);

CREATE INDEX idx_data_retention_org ON data_retention_policies(organization_id);
CREATE INDEX idx_data_retention_compliance ON data_retention_policies(compliance_requirement_id);
CREATE INDEX idx_data_retention_category ON data_retention_policies(data_category);
CREATE INDEX idx_data_retention_active ON data_retention_policies(is_active);
CREATE INDEX idx_data_retention_review ON data_retention_policies(next_compliance_review);

CREATE INDEX idx_access_roles_system ON access_roles(is_system_role);

CREATE INDEX idx_user_role_assignments_user ON user_role_assignments(user_id);
CREATE INDEX idx_user_role_assignments_role ON user_role_assignments(role_id);
CREATE INDEX idx_user_role_assignments_active ON user_role_assignments(is_active);
CREATE INDEX idx_user_role_assignments_expires ON user_role_assignments(expires_at);

CREATE INDEX idx_notification_settings_user ON notification_settings(user_id);
CREATE INDEX idx_notification_settings_org ON notification_settings(organization_id);

CREATE INDEX idx_email_delivery_status ON email_delivery_log(status);
CREATE INDEX idx_email_delivery_type ON email_delivery_log(email_type);
CREATE INDEX idx_email_delivery_recipient ON email_delivery_log(recipient_email);
CREATE INDEX idx_email_delivery_created ON email_delivery_log(created_at);
CREATE INDEX idx_email_delivery_visit ON email_delivery_log(visit_report_id);

-- Add updated_at triggers
CREATE TRIGGER update_security_events_updated_at BEFORE UPDATE ON audit.security_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_requirements_updated_at BEFORE UPDATE ON compliance_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_retention_policies_updated_at BEFORE UPDATE ON data_retention_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_access_roles_updated_at BEFORE UPDATE ON access_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();