-- Enhanced Authentication Schema
-- Add to existing core tables or create as migration

-- Add authentication tokens table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add active directory user mapping
CREATE TABLE IF NOT EXISTS ad_user_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ad_domain VARCHAR(255) NOT NULL,
    ad_username VARCHAR(255) NOT NULL,
    ad_guid VARCHAR(255) UNIQUE,
    ad_dn TEXT,
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(ad_domain, ad_username)
);

-- Add login audit trail
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(255),
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add report persistence tables
CREATE TABLE IF NOT EXISTS saved_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL DEFAULT 'visit',
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, submitted, archived
    report_data JSONB NOT NULL,
    location_data JSONB,
    submitted_at TIMESTAMP WITH TIME ZONE,
    submitted_by UUID REFERENCES users(id),
    version INTEGER DEFAULT 1,
    is_template BOOLEAN DEFAULT false,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add search indexes
    INDEX idx_saved_reports_user_id (user_id),
    INDEX idx_saved_reports_org_id (organization_id),
    INDEX idx_saved_reports_status (status),
    INDEX idx_saved_reports_type (report_type),
    INDEX idx_saved_reports_created (created_at DESC)
);

-- Add report sharing/collaboration
CREATE TABLE IF NOT EXISTS report_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with UUID REFERENCES users(id) ON DELETE CASCADE,
    shared_with_role VARCHAR(50), -- Alternative to specific user
    permission_level VARCHAR(20) NOT NULL DEFAULT 'view', -- view, edit, admin
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add PDF export tracking
CREATE TABLE IF NOT EXISTS report_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
    exported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL DEFAULT 'pdf',
    file_path VARCHAR(500),
    file_size INTEGER,
    export_settings JSONB DEFAULT '{}',
    email_recipients TEXT[],
    email_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_ad_mapping_user_id ON ad_user_mapping(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_mapping_ad_username ON ad_user_mapping(ad_domain, ad_username);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at DESC);

-- Full-text search for reports
CREATE INDEX IF NOT EXISTS idx_saved_reports_search 
    ON saved_reports USING gin(to_tsvector('english', title || ' ' || description));

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_sessions_updated_at 
    BEFORE UPDATE ON user_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_reports_updated_at 
    BEFORE UPDATE ON saved_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
