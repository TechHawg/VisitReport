-- Business Logic Functions and Stored Procedures
-- RSS Visit Report Database Schema

-- Function to calculate hardware depreciation
CREATE OR REPLACE FUNCTION calculate_hardware_depreciation(
    purchase_cost DECIMAL(10,2),
    purchase_date DATE,
    depreciation_method VARCHAR(50) DEFAULT 'straight_line',
    useful_life_years INTEGER DEFAULT 5
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    months_owned INTEGER;
    monthly_depreciation DECIMAL(10,2);
    current_value DECIMAL(10,2);
BEGIN
    -- Calculate months since purchase
    months_owned := EXTRACT(MONTH FROM age(CURRENT_DATE, purchase_date));
    
    CASE depreciation_method
        WHEN 'straight_line' THEN
            monthly_depreciation := purchase_cost / (useful_life_years * 12);
            current_value := purchase_cost - (monthly_depreciation * months_owned);
            
        WHEN 'declining_balance' THEN
            -- Double declining balance method
            current_value := purchase_cost * POWER(1 - (2.0 / useful_life_years), months_owned / 12.0);
            
        ELSE
            -- Default to straight line
            monthly_depreciation := purchase_cost / (useful_life_years * 12);
            current_value := purchase_cost - (monthly_depreciation * months_owned);
    END CASE;
    
    -- Ensure value doesn't go below 10% of original cost
    current_value := GREATEST(current_value, purchase_cost * 0.1);
    
    RETURN ROUND(current_value, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get user permissions for a resource
CREATE OR REPLACE FUNCTION get_user_permissions(
    p_user_id UUID,
    p_resource_type VARCHAR(50)
)
RETURNS TEXT[] AS $$
DECLARE
    permissions TEXT[] := '{}';
    user_roles RECORD;
BEGIN
    -- Get all active roles for the user
    FOR user_roles IN 
        SELECT ar.permissions
        FROM user_role_assignments ura
        JOIN access_roles ar ON ura.role_id = ar.id
        WHERE ura.user_id = p_user_id 
        AND ura.is_active = true
        AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
    LOOP
        -- Extract permissions for the requested resource type
        IF user_roles.permissions ? p_resource_type THEN
            permissions := permissions || ARRAY(
                SELECT jsonb_array_elements_text(user_roles.permissions->p_resource_type)
            );
        END IF;
    END LOOP;
    
    -- Remove duplicates
    SELECT ARRAY_AGG(DISTINCT permission) INTO permissions
    FROM unnest(permissions) AS permission;
    
    RETURN COALESCE(permissions, '{}');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id UUID,
    p_resource_type VARCHAR(50),
    p_action VARCHAR(50)
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN p_action = ANY(get_user_permissions(p_user_id, p_resource_type));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to generate next maintenance date
CREATE OR REPLACE FUNCTION calculate_next_maintenance_date(
    last_maintenance DATE,
    maintenance_interval_months INTEGER DEFAULT 12,
    hardware_category VARCHAR(100) DEFAULT NULL
)
RETURNS DATE AS $$
DECLARE
    base_date DATE;
    interval_months INTEGER;
BEGIN
    -- Use last maintenance date or current date if never maintained
    base_date := COALESCE(last_maintenance, CURRENT_DATE);
    
    -- Adjust interval based on hardware category
    interval_months := CASE 
        WHEN hardware_category IN ('Server', 'Network Equipment') THEN 6  -- Every 6 months
        WHEN hardware_category IN ('UPS', 'Storage') THEN 3  -- Every 3 months
        WHEN hardware_category IN ('Workstation', 'Laptop') THEN 12  -- Annually
        ELSE maintenance_interval_months
    END;
    
    RETURN base_date + (interval_months || ' months')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate recycling environmental impact score
CREATE OR REPLACE FUNCTION calculate_environmental_impact_score(
    p_category_id UUID,
    p_quantity INTEGER,
    p_weight_kg DECIMAL(8,2)
)
RETURNS INTEGER AS $$
DECLARE
    impact_level VARCHAR(20);
    base_score INTEGER;
    final_score INTEGER;
BEGIN
    -- Get environmental impact level from category
    SELECT environmental_impact_level INTO impact_level
    FROM recycling_categories
    WHERE id = p_category_id;
    
    -- Base scores by impact level
    base_score := CASE impact_level
        WHEN 'low' THEN 10
        WHEN 'medium' THEN 25
        WHEN 'high' THEN 50
        WHEN 'critical' THEN 100
        ELSE 25
    END;
    
    -- Multiply by quantity and weight factor
    final_score := base_score * p_quantity * GREATEST(1, COALESCE(p_weight_kg, 1.0)::INTEGER);
    
    RETURN final_score;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get hardware warranty status
CREATE OR REPLACE FUNCTION get_warranty_status(warranty_expiry DATE)
RETURNS VARCHAR(20) AS $$
BEGIN
    IF warranty_expiry IS NULL THEN
        RETURN 'unknown';
    ELSIF warranty_expiry < CURRENT_DATE THEN
        RETURN 'expired';
    ELSIF warranty_expiry <= CURRENT_DATE + INTERVAL '90 days' THEN
        RETURN 'expiring_soon';
    ELSIF warranty_expiry <= CURRENT_DATE + INTERVAL '180 days' THEN
        RETURN 'expiring_6_months';
    ELSE
        RETURN 'active';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Procedure to complete visit report
CREATE OR REPLACE FUNCTION complete_visit_report(
    p_report_id UUID,
    p_user_id UUID,
    p_completion_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    report_exists BOOLEAN;
    user_has_access BOOLEAN;
BEGIN
    -- Check if report exists and user has permission
    SELECT COUNT(*) > 0 INTO report_exists
    FROM visit_reports
    WHERE id = p_report_id;
    
    IF NOT report_exists THEN
        RAISE EXCEPTION 'Visit report not found';
    END IF;
    
    -- Check user permission
    user_has_access := user_has_permission(p_user_id, 'reports', 'update');
    
    IF NOT user_has_access THEN
        RAISE EXCEPTION 'Insufficient permissions to complete report';
    END IF;
    
    -- Update report status
    UPDATE visit_reports 
    SET 
        status = 'completed',
        completion_percentage = 100,
        updated_at = NOW(),
        metadata = jsonb_set(
            COALESCE(metadata, '{}'),
            '{completion_notes}',
            to_jsonb(p_completion_notes)
        )
    WHERE id = p_report_id;
    
    -- Update hardware current values based on depreciation
    UPDATE hardware_inventory
    SET current_value = calculate_hardware_depreciation(
        purchase_cost,
        purchase_date,
        COALESCE(metadata->>'depreciation_method', 'straight_line'),
        COALESCE((metadata->>'useful_life_years')::INTEGER, 5)
    )
    WHERE visit_report_id = p_report_id
    AND purchase_cost IS NOT NULL
    AND purchase_date IS NOT NULL;
    
    -- Update next maintenance dates
    UPDATE hardware_inventory
    SET next_maintenance = calculate_next_maintenance_date(
        last_maintenance,
        12,
        (SELECT name FROM hardware_categories WHERE id = category_id)
    )
    WHERE visit_report_id = p_report_id
    AND next_maintenance IS NULL;
    
    -- Log the completion
    INSERT INTO audit.audit_log (
        event_id, event_type, event_category, severity_level,
        table_name, record_id, operation, user_id,
        description, metadata
    ) VALUES (
        'REPORT_COMPLETED_' || p_report_id::text,
        'REPORT_COMPLETION',
        'BUSINESS_PROCESS',
        'info',
        'visit_reports',
        p_report_id,
        'UPDATE',
        p_user_id,
        'Visit report marked as completed',
        jsonb_build_object('completion_notes', p_completion_notes)
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive old records based on retention policy
CREATE OR REPLACE FUNCTION archive_old_records(
    p_organization_id UUID DEFAULT NULL,
    p_dry_run BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
    table_name VARCHAR(100),
    records_affected INTEGER,
    action_taken VARCHAR(50)
) AS $$
DECLARE
    policy RECORD;
    affected_count INTEGER;
    archive_date DATE;
BEGIN
    -- Process each retention policy
    FOR policy IN 
        SELECT * FROM data_retention_policies 
        WHERE is_active = true 
        AND (p_organization_id IS NULL OR organization_id = p_organization_id)
    LOOP
        archive_date := CURRENT_DATE - (policy.retention_period_days || ' days')::INTERVAL;
        affected_count := 0;
        
        -- Handle different tables
        CASE policy.table_name
            WHEN 'visit_reports' THEN
                IF p_dry_run THEN
                    SELECT COUNT(*) INTO affected_count
                    FROM visit_reports vr
                    WHERE vr.organization_id = policy.organization_id
                    AND vr.visit_date < archive_date
                    AND vr.status = 'completed';
                ELSE
                    -- Move to archive or soft delete based on policy
                    IF policy.deletion_method = 'archive' THEN
                        -- Implementation would move records to archive table
                        UPDATE visit_reports 
                        SET metadata = jsonb_set(
                            COALESCE(metadata, '{}'),
                            '{archived}',
                            'true'
                        )
                        WHERE organization_id = policy.organization_id
                        AND visit_date < archive_date
                        AND status = 'completed';
                        GET DIAGNOSTICS affected_count = ROW_COUNT;
                    END IF;
                END IF;
        END CASE;
        
        RETURN QUERY SELECT 
            policy.table_name,
            affected_count,
            CASE WHEN p_dry_run THEN 'dry_run' ELSE policy.deletion_method END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate visit report analytics
CREATE OR REPLACE FUNCTION generate_visit_analytics(
    p_organization_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '12 months',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH analytics_data AS (
        SELECT 
            COUNT(DISTINCT vr.id) as total_visits,
            COUNT(DISTINCT vr.technician_id) as unique_technicians,
            COUNT(DISTINCT vr.office_id) as offices_visited,
            COUNT(DISTINCT hi.id) as hardware_items_recorded,
            COUNT(DISTINCT rr.id) as recycling_items_processed,
            SUM(COALESCE(rr.total_cost, 0)) as total_recycling_cost,
            AVG(vr.completion_percentage) as avg_completion_rate,
            AVG(EXTRACT(EPOCH FROM (vr.visit_end_time - vr.visit_start_time))/3600) as avg_visit_duration_hours,
            
            -- Monthly breakdown
            json_agg(DISTINCT jsonb_build_object(
                'month', TO_CHAR(vr.visit_date, 'YYYY-MM'),
                'visits', COUNT(vr.id) OVER (PARTITION BY DATE_TRUNC('month', vr.visit_date))
            )) as monthly_visits,
            
            -- Category breakdown
            json_agg(DISTINCT jsonb_build_object(
                'category', hc.name,
                'count', COUNT(hi.id) OVER (PARTITION BY hc.id),
                'total_value', SUM(hi.current_value) OVER (PARTITION BY hc.id)
            )) as hardware_by_category,
            
            -- Status distribution
            json_object_agg(vr.status, COUNT(vr.id)) FILTER (WHERE vr.status IS NOT NULL) as status_distribution
            
        FROM visit_reports vr
        LEFT JOIN hardware_inventory hi ON vr.id = hi.visit_report_id
        LEFT JOIN hardware_categories hc ON hi.category_id = hc.id
        LEFT JOIN recycling_records rr ON vr.id = rr.visit_report_id
        WHERE vr.organization_id = p_organization_id
        AND vr.visit_date BETWEEN p_start_date AND p_end_date
    )
    SELECT to_json(analytics_data) INTO result FROM analytics_data;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to validate data integrity
CREATE OR REPLACE FUNCTION validate_data_integrity()
RETURNS TABLE(
    check_name VARCHAR(100),
    status VARCHAR(20),
    issue_count INTEGER,
    description TEXT
) AS $$
BEGIN
    -- Check for orphaned hardware records
    RETURN QUERY
    SELECT 
        'Orphaned Hardware Records'::VARCHAR(100),
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::VARCHAR(20),
        COUNT(*)::INTEGER,
        'Hardware inventory records without valid visit reports'::TEXT
    FROM hardware_inventory hi
    LEFT JOIN visit_reports vr ON hi.visit_report_id = vr.id
    WHERE vr.id IS NULL;
    
    -- Check for invalid IP addresses
    RETURN QUERY
    SELECT 
        'Invalid IP Addresses'::VARCHAR(100),
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::VARCHAR(20),
        COUNT(*)::INTEGER,
        'Hardware records with invalid IP address format'::TEXT
    FROM hardware_inventory hi
    WHERE hi.ip_address IS NOT NULL
    AND hi.ip_address::TEXT !~ '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$';
    
    -- Check for duplicate serial numbers
    RETURN QUERY
    SELECT 
        'Duplicate Serial Numbers'::VARCHAR(100),
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::VARCHAR(20),
        COUNT(*)::INTEGER,
        'Hardware records with duplicate serial numbers'::TEXT
    FROM (
        SELECT serial_number, COUNT(*)
        FROM hardware_inventory
        WHERE serial_number IS NOT NULL
        AND serial_number != ''
        GROUP BY serial_number
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- Check for expired sessions
    RETURN QUERY
    SELECT 
        'Expired User Sessions'::VARCHAR(100),
        'INFO'::VARCHAR(20),
        COUNT(*)::INTEGER,
        'User sessions that should be cleaned up'::TEXT
    FROM user_sessions
    WHERE expires_at < NOW();
    
    -- Check for unprocessed files
    RETURN QUERY
    SELECT 
        'Unprocessed Files'::VARCHAR(100),
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END::VARCHAR(20),
        COUNT(*)::INTEGER,
        'File attachments that have not been processed'::TEXT
    FROM files.file_attachments
    WHERE is_processed = false
    AND created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON FUNCTION calculate_hardware_depreciation IS 'Calculates current hardware value based on depreciation method and useful life';
COMMENT ON FUNCTION get_user_permissions IS 'Returns array of permissions for a user on a specific resource type';
COMMENT ON FUNCTION user_has_permission IS 'Checks if a user has a specific permission on a resource';
COMMENT ON FUNCTION complete_visit_report IS 'Completes a visit report and performs related business logic';
COMMENT ON FUNCTION archive_old_records IS 'Archives old records based on retention policies';
COMMENT ON FUNCTION generate_visit_analytics IS 'Generates comprehensive analytics for visit reports';
COMMENT ON FUNCTION validate_data_integrity IS 'Validates database integrity and reports issues';