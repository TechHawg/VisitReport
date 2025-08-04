-- RSS Visit Report Database Schema
-- Core Tables for User Management, Organizations, and Visits
-- PostgreSQL 14+ Compatible

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create schemas for organization
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS files;

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'RSS_HQ', 'RSS_BRANCH_01'
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    region VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'technician',
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    phone VARCHAR(50),
    employee_id VARCHAR(50),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_role CHECK (role IN ('admin', 'manager', 'technician', 'auditor', 'readonly'))
);

-- User Sessions for security tracking
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Offices/Locations within organizations
CREATE TABLE offices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL, -- e.g., 'NYC_MAIN', 'LA_BRANCH'
    address TEXT,
    floor_plans JSONB DEFAULT '[]', -- Store floor plan metadata
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    office_hours JSONB DEFAULT '{}', -- Store operating hours
    access_instructions TEXT,
    special_requirements TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, code)
);

-- Visit Reports - Main entity
CREATE TABLE visit_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: VR-2025-001234
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    visit_date DATE NOT NULL,
    visit_start_time TIMESTAMP WITH TIME ZONE,
    visit_end_time TIMESTAMP WITH TIME ZONE,
    visit_purpose TEXT NOT NULL,
    summary_description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    priority VARCHAR(20) DEFAULT 'normal',
    
    -- Visit categorization
    visit_type VARCHAR(50) NOT NULL DEFAULT 'routine', -- routine, emergency, maintenance, audit
    scheduled_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approval_date TIMESTAMP WITH TIME ZONE,
    
    -- Completion tracking
    completion_percentage INTEGER DEFAULT 0,
    issues_found INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    
    -- Email tracking
    email_sent_at TIMESTAMP WITH TIME ZONE,
    email_recipients JSONB DEFAULT '[]',
    
    -- Attachments and files
    has_photos BOOLEAN DEFAULT false,
    has_documents BOOLEAN DEFAULT false,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled', 'archived')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    CONSTRAINT valid_visit_type CHECK (visit_type IN ('routine', 'emergency', 'maintenance', 'audit', 'installation', 'decommission'))
);

-- Create indexes for performance
CREATE INDEX idx_organizations_code ON organizations(code);
CREATE INDEX idx_organizations_region ON organizations(region);
CREATE INDEX idx_organizations_active ON organizations(is_active);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_org_id ON users(organization_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_employee_id ON users(employee_id);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX idx_offices_org_id ON offices(organization_id);
CREATE INDEX idx_offices_code ON offices(code);
CREATE INDEX idx_offices_active ON offices(is_active);

CREATE INDEX idx_visit_reports_org_id ON visit_reports(organization_id);
CREATE INDEX idx_visit_reports_office_id ON visit_reports(office_id);
CREATE INDEX idx_visit_reports_technician_id ON visit_reports(technician_id);
CREATE INDEX idx_visit_reports_date ON visit_reports(visit_date);
CREATE INDEX idx_visit_reports_status ON visit_reports(status);
CREATE INDEX idx_visit_reports_type ON visit_reports(visit_type);
CREATE INDEX idx_visit_reports_number ON visit_reports(report_number);

-- Full-text search indexes
CREATE INDEX idx_visit_reports_search ON visit_reports USING gin(to_tsvector('english', summary_description || ' ' || visit_purpose));
CREATE INDEX idx_offices_search ON offices USING gin(to_tsvector('english', name || ' ' || COALESCE(address, '')));

-- Updated timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offices_updated_at BEFORE UPDATE ON offices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_visit_reports_updated_at BEFORE UPDATE ON visit_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate unique report numbers
CREATE OR REPLACE FUNCTION generate_report_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part TEXT;
    sequence_num INTEGER;
    new_number TEXT;
BEGIN
    -- Get current year
    year_part := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(report_number FROM 'VR-' || year_part || '-(\d+)') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM visit_reports
    WHERE report_number LIKE 'VR-' || year_part || '-%';
    
    -- Generate new report number with zero-padding
    new_number := 'VR-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
    
    NEW.report_number := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_visit_report_number
    BEFORE INSERT ON visit_reports
    FOR EACH ROW
    WHEN (NEW.report_number IS NULL OR NEW.report_number = '')
    EXECUTE FUNCTION generate_report_number();