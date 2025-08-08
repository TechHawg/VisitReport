-- RSS Visit Report - Migration Strategy from localStorage to SQL Server
-- This migration handles the transition from client-side localStorage to enterprise SQL Server

-- Migration Step 1: Create migration tracking table
CREATE TABLE [dbo].[data_migrations] (
    [id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [migration_name] NVARCHAR(255) NOT NULL,
    [user_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [users]([id]),
    [source_type] NVARCHAR(50) NOT NULL, -- 'localStorage', 'import', 'manual'
    [source_data] NVARCHAR(MAX), -- Original JSON data
    [migration_status] NVARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    [records_migrated] INT DEFAULT 0,
    [error_message] NVARCHAR(MAX),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [completed_at] DATETIME2
);

-- Migration Step 2: Create temporary import table for localStorage data
CREATE TABLE [dbo].[temp_localStorage_imports] (
    [id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [user_email] NVARCHAR(255) NOT NULL,
    [import_batch] NVARCHAR(255) NOT NULL,
    [data_key] NVARCHAR(255) NOT NULL, -- 'officeVisitReport', 'theme', etc.
    [data_value] NVARCHAR(MAX) NOT NULL, -- Raw JSON data
    [imported_at] DATETIME2 DEFAULT GETDATE(),
    [processed] BIT DEFAULT 0
);

-- Migration Step 3: Stored procedure to process localStorage report data
CREATE OR ALTER PROCEDURE [dbo].[sp_MigrateLocalStorageReport]
    @UserEmail NVARCHAR(255),
    @ReportDataJson NVARCHAR(MAX),
    @ImportBatch NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @UserId UNIQUEIDENTIFIER;
    DECLARE @OrgId UNIQUEIDENTIFIER;
    DECLARE @ReportId UNIQUEIDENTIFIER;
    DECLARE @ErrorMessage NVARCHAR(MAX);
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Set default import batch if not provided
        IF @ImportBatch IS NULL
            SET @ImportBatch = 'localStorage_' + FORMAT(GETDATE(), 'yyyyMMdd_HHmmss');
        
        -- Find user
        SELECT @UserId = u.[id], @OrgId = u.[organization_id]
        FROM [users] u
        WHERE u.[email] = @UserEmail;
        
        -- Create user if doesn't exist (for migration purposes)
        IF @UserId IS NULL
        BEGIN
            -- Get default organization
            SELECT TOP 1 @OrgId = [id] FROM [organizations];
            
            -- Create user
            INSERT INTO [users] ([organization_id], [email], [username], [display_name], [role])
            VALUES (@OrgId, @UserEmail, LEFT(@UserEmail, CHARINDEX('@', @UserEmail) - 1), 'Migrated User', 'viewer');
            
            SET @UserId = SCOPE_IDENTITY();
        END;
        
        -- Record the migration attempt
        INSERT INTO [data_migrations] ([migration_name], [user_id], [source_type], [source_data], [migration_status])
        VALUES ('localStorage_report', @UserId, 'localStorage', @ReportDataJson, 'processing');
        
        -- Parse and validate JSON
        IF ISJSON(@ReportDataJson) = 0
        BEGIN
            RAISERROR('Invalid JSON format in report data', 16, 1);
            RETURN;
        END;
        
        -- Extract basic report information from JSON
        DECLARE @Title NVARCHAR(255);
        DECLARE @Office NVARCHAR(255);
        DECLARE @Date DATETIME2;
        DECLARE @Status NVARCHAR(50) = 'draft';
        
        SELECT 
            @Title = COALESCE(JSON_VALUE(@ReportDataJson, '$.office'), 'Migrated Report'),
            @Office = JSON_VALUE(@ReportDataJson, '$.office'),
            @Date = TRY_CAST(JSON_VALUE(@ReportDataJson, '$.date') AS DATETIME2);
        
        IF @Date IS NULL
            SET @Date = GETDATE();
        
        -- Create saved report record
        INSERT INTO [saved_reports] (
            [user_id], 
            [organization_id], 
            [title], 
            [description], 
            [report_type], 
            [status], 
            [report_data],
            [created_at]
        )
        VALUES (
            @UserId,
            @OrgId,
            @Title + ' - ' + FORMAT(@Date, 'yyyy-MM-dd'),
            'Migrated from localStorage on ' + FORMAT(GETDATE(), 'yyyy-MM-dd HH:mm'),
            'visit',
            @Status,
            @ReportDataJson,
            @Date
        );
        
        SET @ReportId = SCOPE_IDENTITY();
        
        -- Update migration status
        UPDATE [data_migrations] 
        SET [migration_status] = 'completed',
            [records_migrated] = 1,
            [completed_at] = GETDATE()
        WHERE [user_id] = @UserId 
        AND [migration_name] = 'localStorage_report'
        AND [migration_status] = 'processing';
        
        -- Log successful migration
        INSERT INTO [audit_log] (
            [user_id], 
            [event_type], 
            [event_category], 
            [resource_type], 
            [resource_id], 
            [message],
            [severity]
        )
        VALUES (
            @UserId,
            'data_migration',
            'system',
            'report',
            CAST(@ReportId AS NVARCHAR(255)),
            'Successfully migrated localStorage report data',
            'info'
        );
        
        COMMIT TRANSACTION;
        
        -- Return success
        SELECT 
            @ReportId as [report_id],
            'SUCCESS' as [status],
            'Report migrated successfully' as [message];
            
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        
        SET @ErrorMessage = ERROR_MESSAGE();
        
        -- Update migration status to failed
        UPDATE [data_migrations] 
        SET [migration_status] = 'failed',
            [error_message] = @ErrorMessage,
            [completed_at] = GETDATE()
        WHERE [user_id] = @UserId 
        AND [migration_name] = 'localStorage_report'
        AND [migration_status] = 'processing';
        
        -- Log failed migration
        INSERT INTO [audit_log] (
            [user_id], 
            [event_type], 
            [event_category], 
            [message],
            [severity]
        )
        VALUES (
            @UserId,
            'data_migration_failed',
            'system',
            'localStorage migration failed: ' + @ErrorMessage,
            'high'
        );
        
        -- Return error
        SELECT 
            NULL as [report_id],
            'ERROR' as [status],
            @ErrorMessage as [message];
    END CATCH;
END;

-- Migration Step 4: Bulk migration procedure for multiple users
CREATE OR ALTER PROCEDURE [dbo].[sp_BulkMigrateLocalStorage]
    @ImportBatch NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ProcessedCount INT = 0;
    DECLARE @ErrorCount INT = 0;
    
    -- Set default batch name
    IF @ImportBatch IS NULL
        SET @ImportBatch = 'bulk_localStorage_' + FORMAT(GETDATE(), 'yyyyMMdd_HHmmss');
    
    -- Cursor for processing all unprocessed localStorage imports
    DECLARE migration_cursor CURSOR FOR
    SELECT [user_email], [data_value]
    FROM [temp_localStorage_imports]
    WHERE [data_key] = 'officeVisitReport' 
    AND [processed] = 0
    ORDER BY [imported_at];
    
    DECLARE @UserEmail NVARCHAR(255);
    DECLARE @ReportData NVARCHAR(MAX);
    
    OPEN migration_cursor;
    
    FETCH NEXT FROM migration_cursor INTO @UserEmail, @ReportData;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        BEGIN TRY
            -- Migrate individual report
            EXEC [dbo].[sp_MigrateLocalStorageReport] 
                @UserEmail = @UserEmail,
                @ReportDataJson = @ReportData,
                @ImportBatch = @ImportBatch;
            
            -- Mark as processed
            UPDATE [temp_localStorage_imports]
            SET [processed] = 1
            WHERE [user_email] = @UserEmail 
            AND [data_key] = 'officeVisitReport'
            AND [data_value] = @ReportData;
            
            SET @ProcessedCount = @ProcessedCount + 1;
            
        END TRY
        BEGIN CATCH
            SET @ErrorCount = @ErrorCount + 1;
            
            -- Log error but continue processing
            INSERT INTO [audit_log] ([event_type], [event_category], [message], [severity])
            VALUES (
                'bulk_migration_error',
                'system',
                'Failed to migrate data for user: ' + @UserEmail + '. Error: ' + ERROR_MESSAGE(),
                'medium'
            );
        END CATCH;
        
        FETCH NEXT FROM migration_cursor INTO @UserEmail, @ReportData;
    END;
    
    CLOSE migration_cursor;
    DEALLOCATE migration_cursor;
    
    -- Return summary
    SELECT 
        @ImportBatch as [batch_name],
        @ProcessedCount as [processed_count],
        @ErrorCount as [error_count],
        'COMPLETED' as [status];
END;

-- Migration Step 5: Data validation and cleanup procedures
CREATE OR ALTER PROCEDURE [dbo].[sp_ValidateMigratedData]
    @UserEmail NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Validation results table structure
    SELECT 
        'Report Count Validation' as [validation_type],
        COUNT(*) as [migrated_reports],
        (SELECT COUNT(*) FROM [temp_localStorage_imports] 
         WHERE [data_key] = 'officeVisitReport' 
         AND [processed] = 1
         AND (@UserEmail IS NULL OR [user_email] = @UserEmail)) as [source_records],
        CASE 
            WHEN COUNT(*) = (SELECT COUNT(*) FROM [temp_localStorage_imports] 
                           WHERE [data_key] = 'officeVisitReport' 
                           AND [processed] = 1
                           AND (@UserEmail IS NULL OR [user_email] = @UserEmail))
            THEN 'PASS' 
            ELSE 'FAIL' 
        END as [validation_result]
    FROM [saved_reports] sr
    INNER JOIN [users] u ON sr.[user_id] = u.[id]
    WHERE sr.[title] LIKE '%Migrated%'
    AND (@UserEmail IS NULL OR u.[email] = @UserEmail)
    
    UNION ALL
    
    SELECT 
        'JSON Data Integrity' as [validation_type],
        COUNT(*) as [valid_json_reports],
        COUNT(*) as [total_reports],
        CASE 
            WHEN COUNT(*) = COUNT(CASE WHEN ISJSON(sr.[report_data]) = 1 THEN 1 END)
            THEN 'PASS' 
            ELSE 'FAIL' 
        END as [validation_result]
    FROM [saved_reports] sr
    INNER JOIN [users] u ON sr.[user_id] = u.[id]
    WHERE sr.[title] LIKE '%Migrated%'
    AND (@UserEmail IS NULL OR u.[email] = @UserEmail);
END;

-- Migration Step 6: Cleanup temporary migration data
CREATE OR ALTER PROCEDURE [dbo].[sp_CleanupMigrationData]
    @DaysOld INT = 30,
    @ConfirmCleanup BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CutoffDate DATETIME2 = DATEADD(DAY, -@DaysOld, GETDATE());
    DECLARE @TempImportCount INT;
    DECLARE @MigrationLogCount INT;
    
    -- Count records to be cleaned
    SELECT @TempImportCount = COUNT(*) 
    FROM [temp_localStorage_imports]
    WHERE [imported_at] < @CutoffDate;
    
    SELECT @MigrationLogCount = COUNT(*)
    FROM [data_migrations]
    WHERE [created_at] < @CutoffDate 
    AND [migration_status] IN ('completed', 'failed');
    
    IF @ConfirmCleanup = 1
    BEGIN
        -- Clean up temporary imports
        DELETE FROM [temp_localStorage_imports]
        WHERE [imported_at] < @CutoffDate;
        
        -- Clean up completed/failed migration logs (keep for audit)
        -- NOTE: Consider archiving instead of deleting for compliance
        UPDATE [data_migrations]
        SET [source_data] = NULL -- Remove large JSON data but keep metadata
        WHERE [created_at] < @CutoffDate 
        AND [migration_status] IN ('completed', 'failed');
        
        -- Log cleanup activity
        INSERT INTO [audit_log] ([event_type], [event_category], [message], [severity])
        VALUES (
            'migration_cleanup',
            'system',
            'Cleaned up ' + CAST(@TempImportCount AS NVARCHAR(10)) + ' temp imports and ' + 
            CAST(@MigrationLogCount AS NVARCHAR(10)) + ' migration logs older than ' + 
            CAST(@DaysOld AS NVARCHAR(10)) + ' days',
            'info'
        );
        
        SELECT 
            'COMPLETED' as [status],
            @TempImportCount as [temp_imports_cleaned],
            @MigrationLogCount as [migration_logs_cleaned];
    END
    ELSE
    BEGIN
        -- Preview what would be cleaned
        SELECT 
            'PREVIEW' as [status],
            @TempImportCount as [temp_imports_to_clean],
            @MigrationLogCount as [migration_logs_to_clean],
            'Set @ConfirmCleanup = 1 to proceed with cleanup' as [message];
    END;
END;

-- Migration Step 7: Create indexes for migration performance
CREATE NONCLUSTERED INDEX [IX_temp_localStorage_imports_processed] 
ON [temp_localStorage_imports]([processed]) 
INCLUDE ([user_email], [data_key], [data_value]);

CREATE NONCLUSTERED INDEX [IX_data_migrations_status] 
ON [data_migrations]([migration_status]) 
INCLUDE ([user_id], [migration_name], [created_at]);

-- Sample usage examples (commented out for safety):

-- Example 1: Import single user's localStorage data
/*
-- Step 1: Insert localStorage data
INSERT INTO [temp_localStorage_imports] ([user_email], [import_batch], [data_key], [data_value])
VALUES ('user@company.local', 'manual_import_20250107', 'officeVisitReport', '{"office": "Main Office", "date": "2025-01-07", "rss": "John Doe", ...}');

-- Step 2: Migrate the data
EXEC [dbo].[sp_MigrateLocalStorageReport] 
    @UserEmail = 'user@company.local',
    @ReportDataJson = '{"office": "Main Office", "date": "2025-01-07", ...}';
*/

-- Example 2: Bulk import from CSV file (would be done via SSIS or bulk insert)
/*
-- After bulk insert into temp_localStorage_imports:
EXEC [dbo].[sp_BulkMigrateLocalStorage] @ImportBatch = 'production_migration_20250107';
*/

-- Example 3: Validate migration results
/*
EXEC [dbo].[sp_ValidateMigratedData] @UserEmail = 'user@company.local';
*/

-- Example 4: Cleanup old migration data (preview mode)
/*
EXEC [dbo].[sp_CleanupMigrationData] @DaysOld = 30, @ConfirmCleanup = 0;
*/