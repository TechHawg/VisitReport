-- Recycling and File Management Tables
-- RSS Visit Report Database Schema

-- Recycling categories and disposal methods
CREATE TABLE recycling_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    disposal_method VARCHAR(100),
    environmental_impact_level VARCHAR(20) DEFAULT 'medium',
    requires_certification BOOLEAN DEFAULT false,
    cost_per_unit DECIMAL(8,2),
    unit_type VARCHAR(20) DEFAULT 'item', -- item, kg, pound, etc.
    icon VARCHAR(50),
    color VARCHAR(7),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_impact_level CHECK (environmental_impact_level IN ('low', 'medium', 'high', 'critical'))
);

-- Insert default recycling categories
INSERT INTO recycling_categories (name, description, disposal_method, environmental_impact_level, requires_certification, cost_per_unit, unit_type, icon, color) VALUES
('Computer Equipment', 'Desktop computers, laptops, servers', 'Certified E-Waste Recycling', 'high', true, 25.00, 'item', 'monitor', '#3b82f6'),
('Network Equipment', 'Switches, routers, modems', 'Electronic Component Recovery', 'medium', true, 15.00, 'item', 'wifi', '#22c55e'),
('Monitors and Displays', 'CRT and LCD monitors, projectors', 'CRT/LCD Specialized Recycling', 'high', true, 20.00, 'item', 'monitor', '#f97316'),
('Printers and Peripherals', 'Printers, scanners, keyboards, mice', 'General E-Waste Processing', 'medium', true, 10.00, 'item', 'printer', '#ef4444'),
('Mobile Devices', 'Phones, tablets, mobile computers', 'Data Destruction and Recycling', 'critical', true, 30.00, 'item', 'smartphone', '#8b5cf6'),
('Cables and Accessories', 'Power cables, network cables, adapters', 'Metal and Plastic Recovery', 'low', false, 2.00, 'kg', 'cable', '#6b7280'),
('Batteries and UPS', 'Backup batteries, UPS units', 'Hazardous Waste Disposal', 'critical', true, 50.00, 'item', 'battery', '#dc2626'),
('Hard Drives and Storage', 'HDDs, SSDs, tape drives', 'Secure Data Destruction', 'critical', true, 40.00, 'item', 'hard-drive', '#7c3aed'),
('Office Furniture', 'Desks, chairs, filing cabinets', 'Furniture Donation/Recycling', 'low', false, 15.00, 'item', 'chair', '#059669'),
('Paper and Documentation', 'Manuals, documentation, certificates', 'Secure Paper Shredding', 'medium', true, 0.50, 'kg', 'file-text', '#ea580c');

-- Recycling records
CREATE TABLE recycling_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_report_id UUID NOT NULL REFERENCES visit_reports(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES recycling_categories(id) ON DELETE RESTRICT,
    
    -- Item details
    item_description TEXT NOT NULL,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    asset_tag VARCHAR(50),
    
    -- Quantity and measurements
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_type VARCHAR(20) DEFAULT 'item',
    weight_kg DECIMAL(8,2),
    estimated_value DECIMAL(10,2),
    
    -- Condition and disposal
    condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 5),
    condition_notes TEXT,
    disposal_method VARCHAR(100),
    disposal_reason VARCHAR(100),
    
    -- Data security
    contains_sensitive_data BOOLEAN DEFAULT false,
    data_destruction_method VARCHAR(100),
    data_destruction_certified BOOLEAN DEFAULT false,
    destruction_certificate_number VARCHAR(100),
    destruction_date DATE,
    destruction_witness VARCHAR(255),
    
    -- Pickup and processing
    pickup_scheduled BOOLEAN DEFAULT false,
    pickup_date DATE,
    pickup_company VARCHAR(255),
    pickup_contact VARCHAR(255),
    pickup_reference VARCHAR(100),
    
    -- Environmental compliance
    environmental_fee DECIMAL(8,2),
    recycling_fee DECIMAL(8,2),
    total_cost DECIMAL(8,2),
    cost_center VARCHAR(50),
    
    -- Documentation
    has_photos BOOLEAN DEFAULT false,
    photo_count INTEGER DEFAULT 0,
    disposal_documentation JSONB DEFAULT '[]',
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'identified',
    status_notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('identified', 'scheduled', 'picked_up', 'processed', 'completed', 'cancelled')),
    CONSTRAINT valid_unit_type CHECK (unit_type IN ('item', 'kg', 'pound', 'ton', 'cubic_meter'))
);

-- File attachments and photos
CREATE TABLE files.file_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- File metadata
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(255) NOT NULL, -- SHA-256 hash for integrity
    
    -- File categorization
    file_type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    tags JSONB DEFAULT '[]',
    
    -- Relationships
    visit_report_id UUID REFERENCES visit_reports(id) ON DELETE CASCADE,
    hardware_id UUID REFERENCES hardware_inventory(id) ON DELETE CASCADE,
    recycling_id UUID REFERENCES recycling_records(id) ON DELETE CASCADE,
    
    -- Security and access
    access_level VARCHAR(50) DEFAULT 'internal',
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_encrypted BOOLEAN DEFAULT false,
    encryption_key_id VARCHAR(100),
    
    -- Image-specific metadata (if applicable)
    image_width INTEGER,
    image_height INTEGER,
    image_format VARCHAR(20),
    exif_data JSONB DEFAULT '{}',
    
    -- Document-specific metadata
    document_pages INTEGER,
    document_title VARCHAR(255),
    document_author VARCHAR(255),
    
    -- Processing status
    is_processed BOOLEAN DEFAULT false,
    thumbnail_generated BOOLEAN DEFAULT false,
    virus_scanned BOOLEAN DEFAULT false,
    virus_scan_result VARCHAR(50),
    
    -- Audit trail
    download_count INTEGER DEFAULT 0,
    last_downloaded TIMESTAMP WITH TIME ZONE,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_file_type CHECK (file_type IN ('photo', 'document', 'video', 'audio', 'other')),
    CONSTRAINT valid_access_level CHECK (access_level IN ('public', 'internal', 'confidential', 'restricted')),
    CONSTRAINT at_least_one_reference CHECK (
        (visit_report_id IS NOT NULL)::integer + 
        (hardware_id IS NOT NULL)::integer + 
        (recycling_id IS NOT NULL)::integer >= 1
    )
);

-- File access log for security auditing
CREATE TABLE files.file_access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files.file_attachments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    access_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_action CHECK (action IN ('view', 'download', 'upload', 'delete', 'modify'))
);

-- Visit report collaborators (for multi-user reports)
CREATE TABLE visit_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_report_id UUID NOT NULL REFERENCES visit_reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'contributor',
    permissions JSONB DEFAULT '{}',
    added_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(visit_report_id, user_id),
    CONSTRAINT valid_role CHECK (role IN ('owner', 'editor', 'contributor', 'viewer'))
);

-- Report comments and notes
CREATE TABLE visit_report_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_report_id UUID NOT NULL REFERENCES visit_reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    comment_text TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT true,
    parent_comment_id UUID REFERENCES visit_report_comments(id) ON DELETE CASCADE,
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for recycling and files
CREATE INDEX idx_recycling_categories_active ON recycling_categories(is_active);

CREATE INDEX idx_recycling_records_visit ON recycling_records(visit_report_id);
CREATE INDEX idx_recycling_records_category ON recycling_records(category_id);
CREATE INDEX idx_recycling_records_status ON recycling_records(status);
CREATE INDEX idx_recycling_records_pickup ON recycling_records(pickup_scheduled, pickup_date);
CREATE INDEX idx_recycling_records_serial ON recycling_records(serial_number);
CREATE INDEX idx_recycling_records_asset_tag ON recycling_records(asset_tag);

CREATE INDEX idx_file_attachments_visit ON files.file_attachments(visit_report_id);
CREATE INDEX idx_file_attachments_hardware ON files.file_attachments(hardware_id);
CREATE INDEX idx_file_attachments_recycling ON files.file_attachments(recycling_id);
CREATE INDEX idx_file_attachments_type ON files.file_attachments(file_type);
CREATE INDEX idx_file_attachments_uploader ON files.file_attachments(uploaded_by);
CREATE INDEX idx_file_attachments_hash ON files.file_attachments(file_hash);
CREATE INDEX idx_file_attachments_processed ON files.file_attachments(is_processed);

CREATE INDEX idx_file_access_log_file ON files.file_access_log(file_id);
CREATE INDEX idx_file_access_log_user ON files.file_access_log(user_id);
CREATE INDEX idx_file_access_log_time ON files.file_access_log(access_time);
CREATE INDEX idx_file_access_log_action ON files.file_access_log(action);

CREATE INDEX idx_visit_collaborators_visit ON visit_collaborators(visit_report_id);
CREATE INDEX idx_visit_collaborators_user ON visit_collaborators(user_id);

CREATE INDEX idx_visit_comments_visit ON visit_report_comments(visit_report_id);
CREATE INDEX idx_visit_comments_user ON visit_report_comments(user_id);
CREATE INDEX idx_visit_comments_parent ON visit_report_comments(parent_comment_id);
CREATE INDEX idx_visit_comments_resolved ON visit_report_comments(resolved);

-- Full-text search for recycling items
CREATE INDEX idx_recycling_search ON recycling_records USING gin(
    to_tsvector('english', 
        COALESCE(item_description, '') || ' ' || 
        COALESCE(manufacturer, '') || ' ' || 
        COALESCE(model, '') || ' ' ||
        COALESCE(condition_notes, '')
    )
);

-- Add updated_at triggers
CREATE TRIGGER update_recycling_categories_updated_at BEFORE UPDATE ON recycling_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recycling_records_updated_at BEFORE UPDATE ON recycling_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_file_attachments_updated_at BEFORE UPDATE ON files.file_attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_visit_comments_updated_at BEFORE UPDATE ON visit_report_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();