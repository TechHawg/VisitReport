-- Hardware Inventory and Equipment Management Tables
-- RSS Visit Report Database Schema

-- Hardware Categories and Types
CREATE TABLE hardware_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50), -- Icon identifier for UI
    color VARCHAR(7), -- Hex color code
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default hardware categories
INSERT INTO hardware_categories (name, description, icon, color) VALUES
('Server', 'Physical and virtual servers', 'server', '#3b82f6'),
('Network Equipment', 'Switches, routers, firewalls, access points', 'network', '#22c55e'),
('Storage', 'NAS, SAN, external drives, backup devices', 'hard-drive', '#f97316'),
('Workstation', 'Desktop computers, workstations', 'monitor', '#ef4444'),
('Laptop', 'Portable computers, notebooks', 'laptop', '#8b5cf6'),
('Printer', 'Printers, scanners, multifunction devices', 'printer', '#facc15'),
('Mobile Device', 'Tablets, smartphones, mobile computers', 'smartphone', '#06b6d4'),
('Peripheral', 'Monitors, keyboards, mice, accessories', 'mouse', '#6b7280'),
('UPS', 'Uninterruptible Power Supplies', 'battery', '#84cc16'),
('Rack Equipment', 'Rack infrastructure, PDUs, cable management', 'server', '#ec4899');

-- Hardware inventory table
CREATE TABLE hardware_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_report_id UUID NOT NULL REFERENCES visit_reports(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES hardware_categories(id) ON DELETE RESTRICT,
    
    -- Basic hardware information
    device_name VARCHAR(255),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    asset_tag VARCHAR(50),
    purchase_date DATE,
    warranty_expiry DATE,
    
    -- Technical specifications
    specifications JSONB DEFAULT '{}', -- CPU, RAM, Storage, etc.
    
    -- Network information
    ip_address INET,
    mac_address MACADDR,
    hostname VARCHAR(255),
    domain VARCHAR(255),
    network_segment VARCHAR(100),
    
    -- Physical location
    location_building VARCHAR(100),
    location_floor VARCHAR(50),
    location_room VARCHAR(50),
    location_rack VARCHAR(50),
    location_rack_unit VARCHAR(20),
    location_notes TEXT,
    
    -- Status and condition
    status VARCHAR(50) DEFAULT 'active',
    condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 5),
    condition_notes TEXT,
    last_maintenance DATE,
    next_maintenance DATE,
    
    -- Software information
    operating_system VARCHAR(100),
    os_version VARCHAR(50),
    installed_software JSONB DEFAULT '[]',
    
    -- Security and access
    security_patches_current BOOLEAN DEFAULT false,
    access_level VARCHAR(50),
    admin_credentials TEXT, -- Encrypted storage needed
    
    -- Financial information
    purchase_cost DECIMAL(10,2),
    depreciation_method VARCHAR(50),
    current_value DECIMAL(10,2),
    
    -- Compliance and documentation
    compliance_status JSONB DEFAULT '{}',
    documentation_links JSONB DEFAULT '[]',
    
    -- Photos and attachments
    has_photos BOOLEAN DEFAULT false,
    photo_count INTEGER DEFAULT 0,
    
    -- Action items
    action_required BOOLEAN DEFAULT false,
    action_description TEXT,
    action_priority VARCHAR(20) DEFAULT 'normal',
    action_due_date DATE,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'maintenance', 'retired', 'missing', 'damaged')),
    CONSTRAINT valid_action_priority CHECK (action_priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Software licenses and installations
CREATE TABLE software_licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    software_name VARCHAR(255) NOT NULL,
    vendor VARCHAR(255),
    license_type VARCHAR(100), -- volume, oem, subscription, etc.
    license_key TEXT,
    total_licenses INTEGER,
    used_licenses INTEGER DEFAULT 0,
    purchase_date DATE,
    expiry_date DATE,
    annual_cost DECIMAL(10,2),
    support_included BOOLEAN DEFAULT false,
    support_expiry DATE,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track software installations on hardware
CREATE TABLE hardware_software (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hardware_id UUID NOT NULL REFERENCES hardware_inventory(id) ON DELETE CASCADE,
    software_license_id UUID REFERENCES software_licenses(id) ON DELETE SET NULL,
    software_name VARCHAR(255) NOT NULL,
    version VARCHAR(100),
    install_date DATE,
    license_compliant BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hardware maintenance history
CREATE TABLE hardware_maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hardware_id UUID NOT NULL REFERENCES hardware_inventory(id) ON DELETE CASCADE,
    visit_report_id UUID REFERENCES visit_reports(id) ON DELETE SET NULL,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    maintenance_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    date_performed DATE NOT NULL,
    time_spent INTERVAL,
    
    -- Before/after condition
    condition_before INTEGER CHECK (condition_before BETWEEN 1 AND 5),
    condition_after INTEGER CHECK (condition_after BETWEEN 1 AND 5),
    
    -- Parts and costs
    parts_replaced JSONB DEFAULT '[]',
    parts_cost DECIMAL(10,2),
    labor_cost DECIMAL(10,2),
    
    -- Follow-up requirements
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    follow_up_description TEXT,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_maintenance_type CHECK (maintenance_type IN ('routine', 'repair', 'upgrade', 'replacement', 'installation', 'decommission'))
);

-- Network configurations and settings
CREATE TABLE network_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_report_id UUID NOT NULL REFERENCES visit_reports(id) ON DELETE CASCADE,
    hardware_id UUID REFERENCES hardware_inventory(id) ON DELETE CASCADE,
    
    -- Network device details
    device_type VARCHAR(50) NOT NULL,
    device_name VARCHAR(255),
    management_ip INET,
    
    -- Configuration details
    vlan_configuration JSONB DEFAULT '[]',
    port_configuration JSONB DEFAULT '[]',
    routing_configuration JSONB DEFAULT '{}',
    security_settings JSONB DEFAULT '{}',
    
    -- Performance metrics
    port_utilization JSONB DEFAULT '{}',
    bandwidth_usage JSONB DEFAULT '{}',
    error_rates JSONB DEFAULT '{}',
    
    -- Firmware and software
    firmware_version VARCHAR(100),
    configuration_backup TEXT, -- Store config backup
    last_backup_date TIMESTAMP WITH TIME ZONE,
    
    -- Security and access
    admin_access JSONB DEFAULT '{}',
    snmp_configuration JSONB DEFAULT '{}',
    monitoring_enabled BOOLEAN DEFAULT false,
    
    -- Documentation
    network_diagram_url TEXT,
    configuration_notes TEXT,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_device_type CHECK (device_type IN ('switch', 'router', 'firewall', 'access_point', 'modem', 'gateway', 'load_balancer'))
);

-- Create indexes for hardware inventory
CREATE INDEX idx_hardware_inventory_visit_report ON hardware_inventory(visit_report_id);
CREATE INDEX idx_hardware_inventory_category ON hardware_inventory(category_id);
CREATE INDEX idx_hardware_inventory_serial ON hardware_inventory(serial_number);
CREATE INDEX idx_hardware_inventory_asset_tag ON hardware_inventory(asset_tag);
CREATE INDEX idx_hardware_inventory_ip ON hardware_inventory(ip_address);
CREATE INDEX idx_hardware_inventory_mac ON hardware_inventory(mac_address);
CREATE INDEX idx_hardware_inventory_status ON hardware_inventory(status);
CREATE INDEX idx_hardware_inventory_warranty ON hardware_inventory(warranty_expiry);
CREATE INDEX idx_hardware_inventory_maintenance ON hardware_inventory(next_maintenance);
CREATE INDEX idx_hardware_inventory_action ON hardware_inventory(action_required, action_due_date);

CREATE INDEX idx_software_licenses_org ON software_licenses(organization_id);
CREATE INDEX idx_software_licenses_expiry ON software_licenses(expiry_date);
CREATE INDEX idx_software_licenses_active ON software_licenses(is_active);

CREATE INDEX idx_hardware_software_hardware ON hardware_software(hardware_id);
CREATE INDEX idx_hardware_software_license ON hardware_software(software_license_id);

CREATE INDEX idx_hardware_maintenance_hardware ON hardware_maintenance(hardware_id);
CREATE INDEX idx_hardware_maintenance_visit ON hardware_maintenance(visit_report_id);
CREATE INDEX idx_hardware_maintenance_technician ON hardware_maintenance(technician_id);
CREATE INDEX idx_hardware_maintenance_date ON hardware_maintenance(date_performed);
CREATE INDEX idx_hardware_maintenance_follow_up ON hardware_maintenance(follow_up_required, follow_up_date);

CREATE INDEX idx_network_configurations_visit ON network_configurations(visit_report_id);
CREATE INDEX idx_network_configurations_hardware ON network_configurations(hardware_id);
CREATE INDEX idx_network_configurations_ip ON network_configurations(management_ip);
CREATE INDEX idx_network_configurations_type ON network_configurations(device_type);

-- Full-text search for hardware
CREATE INDEX idx_hardware_search ON hardware_inventory USING gin(
    to_tsvector('english', 
        COALESCE(device_name, '') || ' ' || 
        COALESCE(manufacturer, '') || ' ' || 
        COALESCE(model, '') || ' ' || 
        COALESCE(serial_number, '') || ' ' ||
        COALESCE(location_notes, '')
    )
);

-- Add updated_at triggers
CREATE TRIGGER update_hardware_categories_updated_at BEFORE UPDATE ON hardware_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hardware_inventory_updated_at BEFORE UPDATE ON hardware_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_software_licenses_updated_at BEFORE UPDATE ON software_licenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_network_configurations_updated_at BEFORE UPDATE ON network_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();