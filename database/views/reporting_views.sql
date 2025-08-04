-- Reporting Views and Materialized Views
-- RSS Visit Report Database Schema

-- Visit report summary view with aggregated data
CREATE VIEW v_visit_report_summary AS
SELECT 
    vr.id,
    vr.report_number,
    vr.visit_date,
    vr.visit_type,
    vr.status,
    vr.priority,
    
    -- Organization and office details
    o.name as organization_name,
    o.code as organization_code,
    off.name as office_name,
    off.code as office_code,
    
    -- Technician details
    u.first_name || ' ' || u.last_name as technician_name,
    u.email as technician_email,
    
    -- Aggregated counts
    COALESCE(hi.hardware_count, 0) as hardware_items_count,
    COALESCE(rr.recycling_count, 0) as recycling_items_count,
    COALESCE(fa.file_count, 0) as file_attachments_count,
    COALESCE(nc.network_configs_count, 0) as network_configurations_count,
    
    -- Status indicators
    CASE 
        WHEN vr.status = 'completed' THEN true 
        ELSE false 
    END as is_completed,
    
    CASE 
        WHEN vr.visit_date > CURRENT_DATE THEN 'future'
        WHEN vr.visit_date = CURRENT_DATE THEN 'today'
        WHEN vr.visit_date >= CURRENT_DATE - INTERVAL '7 days' THEN 'recent'
        ELSE 'historical'
    END as visit_recency,
    
    -- Duration calculation
    CASE 
        WHEN vr.visit_end_time IS NOT NULL AND vr.visit_start_time IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (vr.visit_end_time - vr.visit_start_time))/3600 
        ELSE NULL 
    END as visit_duration_hours,
    
    vr.created_at,
    vr.updated_at
    
FROM visit_reports vr
JOIN organizations o ON vr.organization_id = o.id
JOIN offices off ON vr.office_id = off.id
JOIN users u ON vr.technician_id = u.id
LEFT JOIN (
    SELECT visit_report_id, COUNT(*) as hardware_count
    FROM hardware_inventory 
    GROUP BY visit_report_id
) hi ON vr.id = hi.visit_report_id
LEFT JOIN (
    SELECT visit_report_id, COUNT(*) as recycling_count
    FROM recycling_records 
    GROUP BY visit_report_id
) rr ON vr.id = rr.visit_report_id
LEFT JOIN (
    SELECT visit_report_id, COUNT(*) as file_count
    FROM files.file_attachments 
    WHERE visit_report_id IS NOT NULL
    GROUP BY visit_report_id
) fa ON vr.id = fa.visit_report_id
LEFT JOIN (
    SELECT visit_report_id, COUNT(*) as network_configs_count
    FROM network_configurations 
    GROUP BY visit_report_id
) nc ON vr.id = nc.visit_report_id;

-- Hardware inventory summary view
CREATE VIEW v_hardware_summary AS
SELECT 
    hi.id,
    hi.device_name,
    hi.manufacturer,
    hi.model,
    hi.serial_number,
    hi.asset_tag,
    hi.status,
    hi.condition_rating,
    hi.ip_address,
    hi.mac_address,
    
    -- Category information
    hc.name as category_name,
    hc.icon as category_icon,
    hc.color as category_color,
    
    -- Location information
    hi.location_building,
    hi.location_floor,
    hi.location_room,
    hi.location_rack,
    
    -- Visit report information
    vr.report_number,
    vr.visit_date,
    
    -- Organization and office
    o.name as organization_name,
    off.name as office_name,
    
    -- Technician
    u.first_name || ' ' || u.last_name as technician_name,
    
    -- Warranty and maintenance
    hi.warranty_expiry,
    hi.next_maintenance,
    CASE 
        WHEN hi.warranty_expiry < CURRENT_DATE THEN 'expired'
        WHEN hi.warranty_expiry <= CURRENT_DATE + INTERVAL '90 days' THEN 'expiring_soon'
        ELSE 'active'
    END as warranty_status,
    
    CASE 
        WHEN hi.next_maintenance < CURRENT_DATE THEN 'overdue'
        WHEN hi.next_maintenance <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
        ELSE 'scheduled'
    END as maintenance_status,
    
    -- Action items
    hi.action_required,
    hi.action_description,
    hi.action_priority,
    hi.action_due_date,
    
    -- Photos and files
    hi.has_photos,
    hi.photo_count,
    
    hi.created_at,
    hi.updated_at
    
FROM hardware_inventory hi
JOIN hardware_categories hc ON hi.category_id = hc.id
JOIN visit_reports vr ON hi.visit_report_id = vr.id
JOIN organizations o ON vr.organization_id = o.id
JOIN offices off ON vr.office_id = off.id
JOIN users u ON vr.technician_id = u.id;

-- Recycling tracking view
CREATE VIEW v_recycling_tracking AS
SELECT 
    rr.id,
    rr.item_description,
    rr.manufacturer,
    rr.model,
    rr.serial_number,
    rr.quantity,
    rr.unit_type,
    rr.status,
    rr.disposal_method,
    rr.contains_sensitive_data,
    rr.data_destruction_certified,
    
    -- Category information
    rc.name as category_name,
    rc.icon as category_icon,
    rc.color as category_color,
    rc.disposal_method as category_disposal_method,
    rc.environmental_impact_level,
    
    -- Cost information
    rr.environmental_fee,
    rr.recycling_fee,
    rr.total_cost,
    
    -- Pickup tracking
    rr.pickup_scheduled,
    rr.pickup_date,
    rr.pickup_company,
    
    -- Visit and organization info
    vr.report_number,
    vr.visit_date,
    o.name as organization_name,
    off.name as office_name,
    u.first_name || ' ' || u.last_name as technician_name,
    
    -- Status indicators
    CASE 
        WHEN rr.status = 'completed' THEN true 
        ELSE false 
    END as is_completed,
    
    CASE 
        WHEN rr.pickup_date < CURRENT_DATE AND rr.status != 'completed' THEN 'overdue'
        WHEN rr.pickup_date <= CURRENT_DATE + INTERVAL '7 days' AND rr.pickup_scheduled THEN 'due_soon'
        ELSE 'on_track'
    END as pickup_status,
    
    rr.created_at,
    rr.updated_at
    
FROM recycling_records rr
JOIN recycling_categories rc ON rr.category_id = rc.id
JOIN visit_reports vr ON rr.visit_report_id = vr.id
JOIN organizations o ON vr.organization_id = o.id
JOIN offices off ON vr.office_id = off.id
JOIN users u ON vr.technician_id = u.id;

-- Compliance and audit summary view
CREATE VIEW v_compliance_summary AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.code as organization_code,
    
    -- Visit report compliance
    COUNT(DISTINCT vr.id) as total_reports,
    COUNT(DISTINCT CASE WHEN vr.status = 'completed' THEN vr.id END) as completed_reports,
    COUNT(DISTINCT CASE WHEN vr.visit_date >= CURRENT_DATE - INTERVAL '30 days' THEN vr.id END) as recent_reports,
    
    -- Hardware compliance
    COUNT(DISTINCT hi.id) as total_hardware,
    COUNT(DISTINCT CASE WHEN hi.warranty_expiry < CURRENT_DATE THEN hi.id END) as expired_warranties,
    COUNT(DISTINCT CASE WHEN hi.next_maintenance < CURRENT_DATE THEN hi.id END) as overdue_maintenance,
    COUNT(DISTINCT CASE WHEN hi.action_required = true THEN hi.id END) as hardware_requiring_action,
    
    -- Recycling compliance
    COUNT(DISTINCT rr.id) as total_recycling_items,
    COUNT(DISTINCT CASE WHEN rr.contains_sensitive_data = true THEN rr.id END) as items_with_sensitive_data,
    COUNT(DISTINCT CASE WHEN rr.contains_sensitive_data = true AND rr.data_destruction_certified = false THEN rr.id END) as uncertified_data_destruction,
    COUNT(DISTINCT CASE WHEN rr.status != 'completed' AND rr.pickup_date < CURRENT_DATE THEN rr.id END) as overdue_pickups,
    
    -- File management
    COUNT(DISTINCT fa.id) as total_files,
    SUM(COALESCE(fa.file_size_bytes, 0)) as total_file_size_bytes,
    COUNT(DISTINCT CASE WHEN fa.virus_scanned = false THEN fa.id END) as unscanned_files,
    
    -- Recent activity
    MAX(vr.created_at) as last_report_date,
    MAX(hi.created_at) as last_hardware_update,
    MAX(rr.created_at) as last_recycling_update
    
FROM organizations o
LEFT JOIN visit_reports vr ON o.id = vr.organization_id
LEFT JOIN hardware_inventory hi ON vr.id = hi.visit_report_id
LEFT JOIN recycling_records rr ON vr.id = rr.visit_report_id
LEFT JOIN files.file_attachments fa ON vr.id = fa.visit_report_id
WHERE o.is_active = true
GROUP BY o.id, o.name, o.code;

-- User activity dashboard view
CREATE VIEW v_user_activity_dashboard AS
SELECT 
    u.id as user_id,
    u.first_name || ' ' || u.last_name as user_name,
    u.email,
    u.role,
    o.name as organization_name,
    
    -- Report statistics
    COUNT(DISTINCT vr.id) as total_reports,
    COUNT(DISTINCT CASE WHEN vr.status = 'completed' THEN vr.id END) as completed_reports,
    COUNT(DISTINCT CASE WHEN vr.visit_date >= CURRENT_DATE - INTERVAL '30 days' THEN vr.id END) as reports_last_30_days,
    
    -- Hardware statistics
    COUNT(DISTINCT hi.id) as total_hardware_items,
    COUNT(DISTINCT CASE WHEN hi.action_required = true THEN hi.id END) as hardware_action_items,
    
    -- Recycling statistics
    COUNT(DISTINCT rr.id) as total_recycling_items,
    SUM(COALESCE(rr.total_cost, 0)) as total_recycling_cost,
    
    -- Activity timeline
    MAX(vr.created_at) as last_report_created,
    MAX(u.last_login) as last_login,
    
    -- Performance metrics
    AVG(CASE 
        WHEN vr.visit_end_time IS NOT NULL AND vr.visit_start_time IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (vr.visit_end_time - vr.visit_start_time))/3600 
        ELSE NULL 
    END) as avg_visit_duration_hours,
    
    AVG(vr.completion_percentage) as avg_completion_percentage
    
FROM users u
JOIN organizations o ON u.organization_id = o.id
LEFT JOIN visit_reports vr ON u.id = vr.technician_id
LEFT JOIN hardware_inventory hi ON vr.id = hi.visit_report_id
LEFT JOIN recycling_records rr ON vr.id = rr.visit_report_id
WHERE u.is_active = true
GROUP BY u.id, u.first_name, u.last_name, u.email, u.role, o.name;

-- Materialized view for performance - refresh daily
CREATE MATERIALIZED VIEW mv_organization_metrics AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.code as organization_code,
    o.region,
    
    -- Report metrics (last 12 months)
    COUNT(DISTINCT CASE WHEN vr.visit_date >= CURRENT_DATE - INTERVAL '12 months' THEN vr.id END) as reports_12_months,
    COUNT(DISTINCT CASE WHEN vr.visit_date >= CURRENT_DATE - INTERVAL '3 months' THEN vr.id END) as reports_3_months,
    COUNT(DISTINCT CASE WHEN vr.visit_date >= CURRENT_DATE - INTERVAL '1 month' THEN vr.id END) as reports_1_month,
    
    -- Hardware metrics
    COUNT(DISTINCT hi.id) as total_hardware_assets,
    COUNT(DISTINCT CASE WHEN hi.status = 'active' THEN hi.id END) as active_hardware,
    COUNT(DISTINCT CASE WHEN hi.warranty_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' THEN hi.id END) as warranties_expiring_90_days,
    
    -- Cost metrics
    SUM(COALESCE(hi.current_value, 0)) as total_hardware_value,
    SUM(COALESCE(rr.total_cost, 0)) as total_recycling_costs,
    
    -- Environmental metrics
    COUNT(DISTINCT rr.id) as total_items_recycled,
    SUM(COALESCE(rr.weight_kg, 0)) as total_weight_recycled_kg,
    COUNT(DISTINCT CASE WHEN rr.contains_sensitive_data = true THEN rr.id END) as sensitive_items_processed,
    
    -- Efficiency metrics
    AVG(vr.completion_percentage) as avg_completion_rate,
    COUNT(DISTINCT vr.technician_id) as unique_technicians,
    
    -- Data freshness
    MAX(vr.created_at) as last_report_date,
    CURRENT_TIMESTAMP as last_refreshed
    
FROM organizations o
LEFT JOIN visit_reports vr ON o.id = vr.organization_id AND vr.visit_date >= CURRENT_DATE - INTERVAL '12 months'
LEFT JOIN hardware_inventory hi ON vr.id = hi.visit_report_id
LEFT JOIN recycling_records rr ON vr.id = rr.visit_report_id
WHERE o.is_active = true
GROUP BY o.id, o.name, o.code, o.region;

-- Create unique index for materialized view
CREATE UNIQUE INDEX idx_mv_organization_metrics_id ON mv_organization_metrics(organization_id);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_reporting_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_organization_metrics;
    
    -- Log the refresh
    INSERT INTO audit.audit_log (
        event_id, event_type, event_category, severity_level, 
        description, event_timestamp
    ) VALUES (
        'VIEW_REFRESH_' || extract(epoch from now())::text,
        'SYSTEM_MAINTENANCE',
        'DATABASE',
        'info',
        'Materialized views refreshed successfully',
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Create indexes on views for better performance
CREATE INDEX idx_v_visit_report_summary_org ON visit_reports(organization_id, visit_date);
CREATE INDEX idx_v_visit_report_summary_status ON visit_reports(status, priority);
CREATE INDEX idx_v_hardware_summary_category ON hardware_inventory(category_id, status);
CREATE INDEX idx_v_recycling_tracking_status ON recycling_records(status, pickup_date);

-- Comments for documentation
COMMENT ON VIEW v_visit_report_summary IS 'Comprehensive view of visit reports with aggregated counts and calculated fields';
COMMENT ON VIEW v_hardware_summary IS 'Hardware inventory with category information, warranty status, and maintenance tracking';
COMMENT ON VIEW v_recycling_tracking IS 'Recycling items with pickup status and environmental compliance tracking';
COMMENT ON VIEW v_compliance_summary IS 'Organization-level compliance metrics and audit statistics';
COMMENT ON VIEW v_user_activity_dashboard IS 'User performance and activity metrics for dashboard display';
COMMENT ON MATERIALIZED VIEW mv_organization_metrics IS 'Pre-calculated organization metrics for high-performance reporting';