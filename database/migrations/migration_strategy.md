# Data Migration Strategy: localStorage to PostgreSQL Database

## Overview
This document outlines the comprehensive strategy for migrating RSS Visit Report data from client-side localStorage to a secure PostgreSQL database backend, including data transformation, validation, and rollback procedures.

## Current Data Structure Analysis

Based on the existing codebase, the localStorage currently stores data in the following structure:

```javascript
// Current localStorage data structure
const reportData = {
  // Basic visit information
  office: '',
  date: '2025-07-28',
  visitPurpose: '',
  summary: '',
  
  // Additional fields that would be present in the full application
  visitType: 'routine',
  priority: 'normal',
  status: 'draft',
  
  // Hardware inventory (would be arrays)
  hardwareItems: [],
  
  // Network configurations
  networkConfigurations: [],
  
  // Recycling records
  recyclingItems: [],
  
  // File attachments (would store file metadata/references)
  attachments: [],
  
  // User context
  technician: 'development-user@company.com',
  
  // Timestamps
  createdAt: '2025-07-28T...',
  updatedAt: '2025-07-28T...'
};
```

## Migration Architecture

### Phase 1: Pre-Migration Assessment (Duration: 1-2 days)

#### 1.1 Data Discovery and Inventory
```sql
-- Create temporary table to track migration progress
CREATE TABLE migration_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_session_id VARCHAR(255),
    migration_batch_id VARCHAR(100),
    original_data_size INTEGER,
    records_identified INTEGER,
    records_migrated INTEGER,
    migration_status VARCHAR(50) DEFAULT 'pending',
    error_details JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_status CHECK (migration_status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back'))
);
```

#### 1.2 Data Quality Assessment Script
```javascript
// Client-side data assessment function
function assessLocalStorageData() {
    const assessment = {
        totalKeys: 0,
        visitReports: 0,
        dataQualityIssues: [],
        estimatedMigrationTime: 0,
        clientInfo: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            storageSize: 0
        }
    };
    
    // Scan localStorage for RSS Visit Report data
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('officeVisitReport')) {
            assessment.totalKeys++;
            try {
                const data = JSON.parse(localStorage.getItem(key));
                assessment.visitReports++;
                
                // Validate data quality
                if (!data.office) assessment.dataQualityIssues.push('Missing office location');
                if (!data.date) assessment.dataQualityIssues.push('Missing visit date');
                if (!data.technician) assessment.dataQualityIssues.push('Missing technician info');
                
                assessment.clientInfo.storageSize += JSON.stringify(data).length;
            } catch (error) {
                assessment.dataQualityIssues.push(`Corrupted data in key: ${key}`);
            }
        }
    }
    
    assessment.estimatedMigrationTime = Math.ceil(assessment.visitReports * 0.5); // 0.5 seconds per record
    
    return assessment;
}
```

### Phase 2: Migration Infrastructure Setup (Duration: 2-3 days)

#### 2.1 Migration API Endpoints
```typescript
// POST /api/v1/migration/assess
interface MigrationAssessmentRequest {
    clientData: {
        userAgent: string;
        storageKeys: string[];
        totalSize: number;
    };
}

interface MigrationAssessmentResponse {
    migrationId: string;
    estimatedDuration: number;
    dataQualityIssues: string[];
    migrationPlan: {
        batches: number;
        recordsPerBatch: number;
        requiresUserMapping: boolean;
    };
}

// POST /api/v1/migration/execute
interface MigrationExecuteRequest {
    migrationId: string;
    batchData: LocalStorageDataBatch;
    userMapping?: {
        email: string;
        organizationId: string;
        officeId: string;
    };
}

interface LocalStorageDataBatch {
    batchId: string;
    records: LocalStorageRecord[];
}

interface LocalStorageRecord {
    key: string;
    data: any;
    timestamp: string;
    checksum: string;
}
```

#### 2.2 Data Transformation Engine
```typescript
class DataTransformationEngine {
    async transformVisitReport(localData: any, userContext: UserContext): Promise<VisitReportData> {
        // Map localStorage data to database schema
        const transformed: VisitReportData = {
            // Basic fields
            organizationId: userContext.organizationId,
            officeId: await this.resolveOfficeId(localData.office, userContext),
            technicianId: userContext.userId,
            visitDate: this.parseDate(localData.date),
            visitPurpose: this.sanitizeText(localData.visitPurpose),
            summaryDescription: this.sanitizeText(localData.summary),
            
            // Derived fields
            visitType: localData.visitType || 'routine',
            priority: localData.priority || 'normal',
            status: 'draft', // All migrated data starts as draft
            
            // Hardware items transformation
            hardwareItems: await this.transformHardwareItems(localData.hardwareItems || []),
            
            // Network configurations
            networkConfigurations: await this.transformNetworkConfigs(localData.networkConfigurations || []),
            
            // Recycling records
            recyclingItems: await this.transformRecyclingItems(localData.recyclingItems || []),
            
            // File attachments (handled separately)
            fileReferences: localData.attachments || [],
            
            // Metadata for migration tracking
            metadata: {
                migratedFromLocalStorage: true,
                originalClientTimestamp: localData.createdAt,
                migrationBatchId: userContext.migrationBatchId,
                clientUserAgent: userContext.clientUserAgent
            }
        };
        
        return transformed;
    }
    
    private async resolveOfficeId(officeName: string, userContext: UserContext): Promise<string> {
        // Try to match office name to existing office records
        const office = await this.db.query(`
            SELECT id FROM offices 
            WHERE organization_id = $1 
            AND (name ILIKE $2 OR code ILIKE $2)
            LIMIT 1
        `, [userContext.organizationId, officeName]);
        
        if (office.rows.length > 0) {
            return office.rows[0].id;
        }
        
        // Create new office if not found
        const newOffice = await this.db.query(`
            INSERT INTO offices (organization_id, name, code, is_active)
            VALUES ($1, $2, $3, true)
            RETURNING id
        `, [userContext.organizationId, officeName, this.generateOfficeCode(officeName)]);
        
        return newOffice.rows[0].id;
    }
    
    private async transformHardwareItems(hardwareData: any[]): Promise<HardwareItem[]> {
        return hardwareData.map(item => ({
            categoryId: this.mapHardwareCategory(item.type || 'Other'),
            deviceName: this.sanitizeText(item.name),
            manufacturer: this.sanitizeText(item.manufacturer),
            model: this.sanitizeText(item.model),
            serialNumber: this.sanitizeText(item.serialNumber),
            assetTag: this.sanitizeText(item.assetTag),
            ipAddress: this.validateIpAddress(item.ipAddress),
            macAddress: this.validateMacAddress(item.macAddress),
            status: item.status || 'active',
            conditionRating: this.parseConditionRating(item.condition),
            locationBuilding: this.sanitizeText(item.location?.building),
            locationFloor: this.sanitizeText(item.location?.floor),
            locationRoom: this.sanitizeText(item.location?.room),
            specifications: this.cleanJsonData(item.specifications || {}),
            metadata: {
                migratedFromLocalStorage: true,
                originalData: item
            }
        }));
    }
}
```

### Phase 3: Migration Execution (Duration: 1-2 hours per client)

#### 3.1 Client-Side Migration Script
```javascript
class MigrationExecutor {
    constructor(apiBaseUrl, authToken) {
        this.apiBaseUrl = apiBaseUrl;
        this.authToken = authToken;
        this.batchSize = 10; // Process 10 records per batch
    }
    
    async executeMigration() {
        try {
            // Step 1: Assess data
            const assessment = await this.assessData();
            console.log('Migration assessment:', assessment);
            
            // Step 2: Get migration plan
            const migrationPlan = await this.getMigrationPlan(assessment);
            console.log('Migration plan:', migrationPlan);
            
            // Step 3: Execute migration in batches
            const results = await this.executeBatchMigration(migrationPlan);
            
            // Step 4: Verify migration
            const verification = await this.verifyMigration(results);
            
            // Step 5: Cleanup (optional)
            if (verification.success) {
                await this.offerCleanup();
            }
            
            return {
                success: true,
                migrationId: migrationPlan.migrationId,
                recordsMigrated: results.totalRecords,
                results: results
            };
            
        } catch (error) {
            console.error('Migration failed:', error);
            await this.rollbackMigration();
            throw error;
        }
    }
    
    async executeBatchMigration(migrationPlan) {
        const localStorageData = this.extractLocalStorageData();
        const batches = this.createBatches(localStorageData, this.batchSize);
        
        const results = {
            totalRecords: 0,
            successfulBatches: 0,
            failedBatches: 0,
            errors: []
        };
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            
            try {
                console.log(`Processing batch ${i + 1}/${batches.length}...`);
                
                const response = await fetch(`${this.apiBaseUrl}/api/v1/migration/execute`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.authToken}`
                    },
                    body: JSON.stringify({
                        migrationId: migrationPlan.migrationId,
                        batchData: batch
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Batch ${i + 1} failed: ${response.statusText}`);
                }
                
                const batchResult = await response.json();
                results.totalRecords += batchResult.recordsProcessed;
                results.successfulBatches++;
                
                // Update progress indicator
                this.updateProgress((i + 1) / batches.length * 100);
                
                // Add delay between batches to avoid overwhelming the server
                await this.sleep(500);
                
            } catch (error) {
                console.error(`Batch ${i + 1} failed:`, error);
                results.failedBatches++;
                results.errors.push({
                    batchId: batch.batchId,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    extractLocalStorageData() {
        const data = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            if (key && key.includes('officeVisitReport')) {
                try {
                    const value = localStorage.getItem(key);
                    const parsedData = JSON.parse(value);
                    
                    data.push({
                        key: key,
                        data: parsedData,
                        timestamp: new Date().toISOString(),
                        checksum: this.calculateChecksum(value)
                    });
                } catch (error) {
                    console.warn(`Skipping corrupted data for key: ${key}`);
                }
            }
        }
        
        return data;
    }
    
    async offerCleanup() {
        const userConfirmed = confirm(
            'Migration completed successfully! Would you like to clear the old localStorage data? ' +
            'This action cannot be undone, but your data is now safely stored in the database.'
        );
        
        if (userConfirmed) {
            await this.cleanupLocalStorage();
            alert('Local storage cleanup completed. You can now use the new database-backed system.');
        }
    }
    
    async cleanupLocalStorage() {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('officeVisitReport')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        console.log(`Cleaned up ${keysToRemove.length} localStorage keys`);
    }
}
```

#### 3.2 Server-Side Migration Processing
```typescript
class MigrationProcessor {
    async processMigrationBatch(
        migrationId: string, 
        batchData: LocalStorageDataBatch,
        userContext: UserContext
    ): Promise<MigrationBatchResult> {
        
        const transaction = await this.db.begin();
        
        try {
            const results = {
                batchId: batchData.batchId,
                recordsProcessed: 0,
                recordsSuccessful: 0,
                recordsFailed: 0,
                errors: [],
                createdEntities: {
                    visitReports: [],
                    hardwareItems: [],
                    recyclingItems: [],
                    networkConfigs: []
                }
            };
            
            for (const record of batchData.records) {
                try {
                    // Transform the data
                    const transformedData = await this.transformationEngine.transformVisitReport(
                        record.data, 
                        userContext
                    );
                    
                    // Create visit report
                    const visitReport = await this.createVisitReport(transformedData, transaction);
                    results.createdEntities.visitReports.push(visitReport.id);
                    
                    // Create related hardware items
                    if (transformedData.hardwareItems?.length > 0) {
                        const hardwareItems = await this.createHardwareItems(
                            visitReport.id,
                            transformedData.hardwareItems,
                            transaction
                        );
                        results.createdEntities.hardwareItems.push(...hardwareItems.map(h => h.id));
                    }
                    
                    // Create recycling records
                    if (transformedData.recyclingItems?.length > 0) {
                        const recyclingItems = await this.createRecyclingItems(
                            visitReport.id,
                            transformedData.recyclingItems,
                            transaction
                        );
                        results.createdEntities.recyclingItems.push(...recyclingItems.map(r => r.id));
                    }
                    
                    // Create network configurations
                    if (transformedData.networkConfigurations?.length > 0) {
                        const networkConfigs = await this.createNetworkConfigurations(
                            visitReport.id,
                            transformedData.networkConfigurations,
                            transaction
                        );
                        results.createdEntities.networkConfigs.push(...networkConfigs.map(n => n.id));
                    }
                    
                    results.recordsSuccessful++;
                    
                } catch (recordError) {
                    console.error(`Failed to process record ${record.key}:`, recordError);
                    results.recordsFailed++;
                    results.errors.push({
                        recordKey: record.key,
                        error: recordError.message,
                        timestamp: new Date().toISOString()
                    });
                }
                
                results.recordsProcessed++;
            }
            
            // Update migration tracking
            await this.updateMigrationProgress(migrationId, results, transaction);
            
            // Commit transaction
            await transaction.commit();
            
            // Log successful migration
            await this.auditLogger.log({
                eventType: 'DATA_MIGRATION',
                severity: 'info',
                userId: userContext.userId,
                description: `Migration batch ${batchData.batchId} completed`,
                metadata: {
                    migrationId,
                    recordsProcessed: results.recordsProcessed,
                    recordsSuccessful: results.recordsSuccessful,
                    recordsFailed: results.recordsFailed
                }
            });
            
            return results;
            
        } catch (error) {
            // Rollback transaction
            await transaction.rollback();
            
            // Log failed migration
            await this.auditLogger.log({
                eventType: 'DATA_MIGRATION',
                severity: 'error',
                userId: userContext.userId,
                description: `Migration batch ${batchData.batchId} failed`,
                metadata: {
                    migrationId,
                    error: error.message
                }
            });
            
            throw error;
        }
    }
}
```

### Phase 4: Data Validation and Verification (Duration: 1 day)

#### 4.1 Migration Verification Queries
```sql
-- Verify visit reports were created correctly
CREATE OR REPLACE FUNCTION verify_migration_visit_reports(p_migration_id UUID)
RETURNS TABLE(
    verification_check VARCHAR(100),
    expected_count INTEGER,
    actual_count INTEGER,
    status VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Total Visit Reports'::VARCHAR(100),
        (SELECT COUNT(*)::INTEGER FROM migration_tracking WHERE id = p_migration_id),
        (SELECT COUNT(*)::INTEGER FROM visit_reports WHERE metadata->>'migrationBatchId' = p_migration_id::text),
        CASE WHEN 
            (SELECT COUNT(*) FROM migration_tracking WHERE id = p_migration_id) = 
            (SELECT COUNT(*) FROM visit_reports WHERE metadata->>'migrationBatchId' = p_migration_id::text)
        THEN 'PASS' ELSE 'FAIL' END::VARCHAR(10);
    
    RETURN QUERY
    SELECT 
        'Hardware Items'::VARCHAR(100),
        (SELECT COALESCE(SUM((metadata->>'hardwareItemCount')::INTEGER), 0)::INTEGER 
         FROM visit_reports WHERE metadata->>'migrationBatchId' = p_migration_id::text),
        (SELECT COUNT(*)::INTEGER FROM hardware_inventory hi 
         JOIN visit_reports vr ON hi.visit_report_id = vr.id 
         WHERE vr.metadata->>'migrationBatchId' = p_migration_id::text),
        CASE WHEN 
            (SELECT COALESCE(SUM((metadata->>'hardwareItemCount')::INTEGER), 0) 
             FROM visit_reports WHERE metadata->>'migrationBatchId' = p_migration_id::text) = 
            (SELECT COUNT(*) FROM hardware_inventory hi 
             JOIN visit_reports vr ON hi.visit_report_id = vr.id 
             WHERE vr.metadata->>'migrationBatchId' = p_migration_id::text)
        THEN 'PASS' ELSE 'FAIL' END::VARCHAR(10);
END;
$$ LANGUAGE plpgsql;

-- Data integrity checks
CREATE OR REPLACE FUNCTION validate_migrated_data_integrity(p_migration_id UUID)
RETURNS TABLE(
    integrity_check VARCHAR(100),
    issues_found INTEGER,
    status VARCHAR(10),
    details TEXT
) AS $$
BEGIN
    -- Check for orphaned hardware records
    RETURN QUERY
    SELECT 
        'Orphaned Hardware Records'::VARCHAR(100),
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::VARCHAR(10),
        'Hardware items without valid visit reports'::TEXT
    FROM hardware_inventory hi
    LEFT JOIN visit_reports vr ON hi.visit_report_id = vr.id
    WHERE vr.metadata->>'migrationBatchId' = p_migration_id::text
    AND vr.id IS NULL;
    
    -- Check for invalid dates
    RETURN QUERY
    SELECT 
        'Invalid Visit Dates'::VARCHAR(100),
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::VARCHAR(10),
        'Visit reports with invalid or future dates'::TEXT
    FROM visit_reports
    WHERE metadata->>'migrationBatchId' = p_migration_id::text
    AND (visit_date > CURRENT_DATE OR visit_date < '2020-01-01');
    
    -- Check for missing required fields
    RETURN QUERY
    SELECT 
        'Missing Required Fields'::VARCHAR(100),
        COUNT(*)::INTEGER,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::VARCHAR(10),
        'Visit reports missing office, technician, or purpose'::TEXT
    FROM visit_reports
    WHERE metadata->>'migrationBatchId' = p_migration_id::text
    AND (office_id IS NULL OR technician_id IS NULL OR visit_purpose IS NULL OR TRIM(visit_purpose) = '');
END;
$$ LANGUAGE plpgsql;
```

#### 4.2 Data Quality Report Generation
```typescript
class MigrationReportGenerator {
    async generateMigrationReport(migrationId: string): Promise<MigrationReport> {
        const report = {
            migrationId,
            timestamp: new Date().toISOString(),
            summary: await this.getMigrationSummary(migrationId),
            dataVerification: await this.getDataVerification(migrationId),
            dataQuality: await this.getDataQuality(migrationId),
            performanceMetrics: await this.getPerformanceMetrics(migrationId),
            recommendations: []
        };
        
        // Generate recommendations based on findings
        report.recommendations = this.generateRecommendations(report);
        
        return report;
    }
    
    private async getMigrationSummary(migrationId: string) {
        const result = await this.db.query(`
            SELECT 
                migration_status,
                records_identified,
                records_migrated,
                started_at,
                completed_at,
                EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds
            FROM migration_tracking 
            WHERE id = $1
        `, [migrationId]);
        
        return result.rows[0];
    }
    
    private generateRecommendations(report: MigrationReport): string[] {
        const recommendations = [];
        
        if (report.dataQuality.missingFields > 0) {
            recommendations.push(
                `Review and complete ${report.dataQuality.missingFields} records with missing required fields`
            );
        }
        
        if (report.dataQuality.invalidDates > 0) {
            recommendations.push(
                `Correct ${report.dataQuality.invalidDates} records with invalid visit dates`
            );
        }
        
        if (report.summary.records_migrated < report.summary.records_identified) {
            recommendations.push(
                `Investigate ${report.summary.records_identified - report.summary.records_migrated} failed migrations`
            );
        }
        
        if (report.performanceMetrics.averageRecordProcessingTime > 1000) {
            recommendations.push(
                'Consider optimizing database indexes for better performance in future migrations'
            );
        }
        
        return recommendations;
    }
}
```

### Phase 5: Rollback and Recovery Procedures

#### 5.1 Rollback Function
```sql
CREATE OR REPLACE FUNCTION rollback_migration(p_migration_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    migration_record RECORD;
    rollback_successful BOOLEAN := TRUE;
BEGIN
    -- Get migration details
    SELECT * INTO migration_record 
    FROM migration_tracking 
    WHERE id = p_migration_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Migration ID not found: %', p_migration_id;
    END IF;
    
    BEGIN
        -- Start transaction for rollback
        
        -- Delete visit report comments
        DELETE FROM visit_report_comments 
        WHERE visit_report_id IN (
            SELECT id FROM visit_reports 
            WHERE metadata->>'migrationBatchId' = p_migration_id::text
        );
        
        -- Delete file attachments (files themselves handled separately)
        DELETE FROM files.file_attachments 
        WHERE visit_report_id IN (
            SELECT id FROM visit_reports 
            WHERE metadata->>'migrationBatchId' = p_migration_id::text
        );
        
        -- Delete network configurations
        DELETE FROM network_configurations 
        WHERE visit_report_id IN (
            SELECT id FROM visit_reports 
            WHERE metadata->>'migrationBatchId' = p_migration_id::text
        );
        
        -- Delete recycling records
        DELETE FROM recycling_records 
        WHERE visit_report_id IN (
            SELECT id FROM visit_reports 
            WHERE metadata->>'migrationBatchId' = p_migration_id::text
        );
        
        -- Delete hardware maintenance records
        DELETE FROM hardware_maintenance 
        WHERE hardware_id IN (
            SELECT hi.id FROM hardware_inventory hi
            JOIN visit_reports vr ON hi.visit_report_id = vr.id
            WHERE vr.metadata->>'migrationBatchId' = p_migration_id::text
        );
        
        -- Delete hardware software relationships
        DELETE FROM hardware_software 
        WHERE hardware_id IN (
            SELECT hi.id FROM hardware_inventory hi
            JOIN visit_reports vr ON hi.visit_report_id = vr.id
            WHERE vr.metadata->>'migrationBatchId' = p_migration_id::text
        );
        
        -- Delete hardware inventory
        DELETE FROM hardware_inventory 
        WHERE visit_report_id IN (
            SELECT id FROM visit_reports 
            WHERE metadata->>'migrationBatchId' = p_migration_id::text
        );
        
        -- Delete visit collaborators
        DELETE FROM visit_collaborators 
        WHERE visit_report_id IN (
            SELECT id FROM visit_reports 
            WHERE metadata->>'migrationBatchId' = p_migration_id::text
        );
        
        -- Finally, delete visit reports
        DELETE FROM visit_reports 
        WHERE metadata->>'migrationBatchId' = p_migration_id::text;
        
        -- Update migration status
        UPDATE migration_tracking 
        SET 
            migration_status = 'rolled_back',
            error_details = jsonb_build_object(
                'rollback_timestamp', NOW(),
                'rollback_reason', 'Manual rollback requested'
            )
        WHERE id = p_migration_id;
        
        -- Log rollback
        INSERT INTO audit.audit_log (
            event_id, event_type, event_category, severity_level,
            description, metadata
        ) VALUES (
            'MIGRATION_ROLLBACK_' || p_migration_id::text,
            'DATA_MIGRATION',
            'SYSTEM',
            'warning',
            'Migration rolled back successfully',
            jsonb_build_object(
                'migration_id', p_migration_id,
                'rollback_timestamp', NOW()
            )
        );
        
    EXCEPTION WHEN OTHERS THEN
        rollback_successful := FALSE;
        
        -- Log rollback failure
        INSERT INTO audit.audit_log (
            event_id, event_type, event_category, severity_level,
            description, metadata
        ) VALUES (
            'MIGRATION_ROLLBACK_FAILED_' || p_migration_id::text,
            'DATA_MIGRATION',
            'SYSTEM',
            'error',
            'Migration rollback failed: ' || SQLERRM,
            jsonb_build_object(
                'migration_id', p_migration_id,
                'error', SQLERRM,
                'rollback_timestamp', NOW()
            )
        );
        
        RAISE;
    END;
    
    RETURN rollback_successful;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Phase 6: Post-Migration Tasks

#### 6.1 Post-Migration Checklist
```typescript
class PostMigrationTasks {
    async executePostMigrationTasks(migrationId: string): Promise<PostMigrationResults> {
        const tasks = [
            this.updateHardwareDepreciation,
            this.generateNextMaintenanceDates,
            this.validateEmailRecipients,
            this.optimizeIndexes,
            this.updateMaterializedViews,
            this.scheduleDataRetentionPolicies,
            this.sendMigrationSummaryEmail
        ];
        
        const results = {
            completedTasks: [],
            failedTasks: [],
            totalTasks: tasks.length
        };
        
        for (const task of tasks) {
            try {
                await task(migrationId);
                results.completedTasks.push(task.name);
            } catch (error) {
                console.error(`Post-migration task failed: ${task.name}`, error);
                results.failedTasks.push({
                    taskName: task.name,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    private async updateHardwareDepreciation(migrationId: string) {
        await this.db.query(`
            UPDATE hardware_inventory 
            SET current_value = calculate_hardware_depreciation(
                purchase_cost,
                purchase_date,
                COALESCE(metadata->>'depreciation_method', 'straight_line'),
                COALESCE((metadata->>'useful_life_years')::INTEGER, 5)
            )
            WHERE visit_report_id IN (
                SELECT id FROM visit_reports 
                WHERE metadata->>'migrationBatchId' = $1
            )
            AND purchase_cost IS NOT NULL 
            AND purchase_date IS NOT NULL
        `, [migrationId]);
    }
    
    private async generateNextMaintenanceDates(migrationId: string) {
        await this.db.query(`
            UPDATE hardware_inventory 
            SET next_maintenance = calculate_next_maintenance_date(
                last_maintenance,
                12,
                (SELECT name FROM hardware_categories WHERE id = category_id)
            )
            WHERE visit_report_id IN (
                SELECT id FROM visit_reports 
                WHERE metadata->>'migrationBatchId' = $1
            )
            AND next_maintenance IS NULL
        `, [migrationId]);
    }
}
```

## Migration Timeline and Resource Requirements

### Estimated Timeline
- **Phase 1 (Assessment)**: 1-2 days
- **Phase 2 (Infrastructure)**: 2-3 days  
- **Phase 3 (Execution)**: 1-2 hours per client (can be parallelized)
- **Phase 4 (Validation)**: 1 day
- **Phase 5 (Documentation)**: 1 day
- **Total**: 5-7 days for infrastructure + execution time per client

### Resource Requirements
- **Development Team**: 2-3 developers
- **Database Administrator**: 1 DBA for optimization and monitoring
- **Testing Environment**: Staging database with representative data
- **Monitoring Tools**: Database performance monitoring, application logs
- **Backup Strategy**: Full database backups before and after migration

### Success Criteria
1. **Data Integrity**: 100% of valid localStorage data successfully migrated
2. **Performance**: Migration completes within 2 hours per client session
3. **Validation**: All migrated data passes integrity checks
4. **Rollback**: Successful rollback capability demonstrated
5. **User Experience**: Seamless transition with minimal downtime
6. **Audit Trail**: Complete audit log of migration process

This comprehensive migration strategy ensures a smooth transition from localStorage to the PostgreSQL database while maintaining data integrity, security, and system performance.