-- RSS Visit Report - SQL Server Enterprise Schema
-- Database schema for corporate deployment with Active Directory integration

-- Enable advanced features
USE [RSS_Visit_Reports]
GO

-- Organizations table for multi-tenant support
CREATE TABLE [dbo].[organizations] (
    [id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [name] NVARCHAR(255) NOT NULL,
    [domain] NVARCHAR(255) NOT NULL UNIQUE,
    [ad_domain] NVARCHAR(255),
    [is_active] BIT DEFAULT 1,
    [settings] NVARCHAR(MAX), -- JSON settings
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE()
);

-- Users table with AD integration
CREATE TABLE [dbo].[users] (
    [id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [organization_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [organizations]([id]) ON DELETE CASCADE,
    [email] NVARCHAR(255) NOT NULL,
    [username] NVARCHAR(255) NOT NULL,
    [display_name] NVARCHAR(255),
    [first_name] NVARCHAR(100),
    [last_name] NVARCHAR(100),
    [role] NVARCHAR(50) NOT NULL DEFAULT 'viewer', -- admin, manager, technician, viewer
    [is_active] BIT DEFAULT 1,
    [last_login] DATETIME2,
    [password_hash] NVARCHAR(255), -- For local accounts only
    [preferences] NVARCHAR(MAX), -- JSON preferences
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE(),
    
    UNIQUE([organization_id], [email]),
    UNIQUE([organization_id], [username])
);

-- Active Directory user mapping
CREATE TABLE [dbo].[ad_user_mapping] (
    [id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [user_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [users]([id]) ON DELETE CASCADE,
    [ad_domain] NVARCHAR(255) NOT NULL,
    [ad_username] NVARCHAR(255) NOT NULL,
    [ad_guid] NVARCHAR(255) UNIQUE,
    [ad_dn] NVARCHAR(1000),
    [ad_groups] NVARCHAR(MAX), -- JSON array of AD groups
    [last_sync] DATETIME2 DEFAULT GETDATE(),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    
    UNIQUE([ad_domain], [ad_username])
);

-- User sessions for authentication
CREATE TABLE [dbo].[user_sessions] (
    [id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [user_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [users]([id]) ON DELETE CASCADE,
    [session_token] NVARCHAR(255) UNIQUE NOT NULL,
    [refresh_token] NVARCHAR(255) UNIQUE NOT NULL,
    [ip_address] NVARCHAR(45),
    [user_agent] NVARCHAR(MAX),
    [expires_at] DATETIME2 NOT NULL,
    [is_active] BIT DEFAULT 1,
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE()
);

-- Login attempts for security
CREATE TABLE [dbo].[login_attempts] (
    [id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [email] NVARCHAR(255),
    [ip_address] NVARCHAR(45),
    [user_agent] NVARCHAR(MAX),
    [success] BIT NOT NULL,
    [failure_reason] NVARCHAR(255),
    [session_id] UNIQUEIDENTIFIER REFERENCES [user_sessions]([id]) ON DELETE SET NULL,
    [attempted_at] DATETIME2 DEFAULT GETDATE()
);

-- Saved reports with user ownership
CREATE TABLE [dbo].[saved_reports] (
    [id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [user_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [users]([id]) ON DELETE CASCADE,
    [organization_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [organizations]([id]) ON DELETE CASCADE,
    [title] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(MAX),
    [report_type] NVARCHAR(50) NOT NULL DEFAULT 'visit',
    [status] NVARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, submitted, archived
    [report_data] NVARCHAR(MAX) NOT NULL, -- JSON report data
    [location_data] NVARCHAR(MAX), -- JSON location data
    [submitted_at] DATETIME2,
    [submitted_by] UNIQUEIDENTIFIER REFERENCES [users]([id]),
    [version] INT DEFAULT 1,
    [is_template] BIT DEFAULT 0,
    [tags] NVARCHAR(MAX), -- JSON array of tags
    [metadata] NVARCHAR(MAX) DEFAULT '{}', -- JSON metadata
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE()
);

-- Report sharing and collaboration
CREATE TABLE [dbo].[report_shares] (
    [id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [report_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [saved_reports]([id]) ON DELETE CASCADE,
    [shared_by] UNIQUEIDENTIFIER NOT NULL REFERENCES [users]([id]) ON DELETE CASCADE,
    [shared_with] UNIQUEIDENTIFIER REFERENCES [users]([id]) ON DELETE CASCADE,
    [shared_with_role] NVARCHAR(50), -- Alternative to specific user
    [permission_level] NVARCHAR(20) NOT NULL DEFAULT 'view', -- view, edit, admin
    [expires_at] DATETIME2,
    [created_at] DATETIME2 DEFAULT GETDATE()
);

-- Report exports tracking
CREATE TABLE [dbo].[report_exports] (
    [id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [report_id] UNIQUEIDENTIFIER NOT NULL REFERENCES [saved_reports]([id]) ON DELETE CASCADE,
    [exported_by] UNIQUEIDENTIFIER NOT NULL REFERENCES [users]([id]) ON DELETE CASCADE,
    [export_type] NVARCHAR(50) NOT NULL DEFAULT 'pdf',
    [file_path] NVARCHAR(500),
    [file_size] INT,
    [export_settings] NVARCHAR(MAX) DEFAULT '{}', -- JSON settings
    [email_recipients] NVARCHAR(MAX), -- JSON array of emails
    [email_sent_at] DATETIME2,
    [created_at] DATETIME2 DEFAULT GETDATE()
);

-- Comprehensive audit logging
CREATE TABLE [dbo].[audit_log] (
    [id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [organization_id] UNIQUEIDENTIFIER REFERENCES [organizations]([id]),
    [user_id] UNIQUEIDENTIFIER REFERENCES [users]([id]),
    [session_id] UNIQUEIDENTIFIER REFERENCES [user_sessions]([id]),
    [event_type] NVARCHAR(100) NOT NULL, -- login, logout, create_report, etc.
    [event_category] NVARCHAR(50) NOT NULL, -- auth, data, security, system
    [resource_type] NVARCHAR(50), -- report, user, organization
    [resource_id] NVARCHAR(255),
    [old_values] NVARCHAR(MAX), -- JSON of old values
    [new_values] NVARCHAR(MAX), -- JSON of new values
    [ip_address] NVARCHAR(45),
    [user_agent] NVARCHAR(MAX),
    [severity] NVARCHAR(20) DEFAULT 'info', -- critical, high, medium, low, info
    [message] NVARCHAR(MAX),
    [metadata] NVARCHAR(MAX) DEFAULT '{}', -- JSON additional data
    [timestamp] DATETIME2 DEFAULT GETDATE()
);

-- Performance indexes
CREATE NONCLUSTERED INDEX [IX_users_organization_id] ON [users]([organization_id]);
CREATE NONCLUSTERED INDEX [IX_users_email] ON [users]([email]);
CREATE NONCLUSTERED INDEX [IX_users_role] ON [users]([role]);

CREATE NONCLUSTERED INDEX [IX_user_sessions_token] ON [user_sessions]([session_token]);
CREATE NONCLUSTERED INDEX [IX_user_sessions_user_id] ON [user_sessions]([user_id]);
CREATE NONCLUSTERED INDEX [IX_user_sessions_expires] ON [user_sessions]([expires_at]);

CREATE NONCLUSTERED INDEX [IX_ad_mapping_user_id] ON [ad_user_mapping]([user_id]);
CREATE NONCLUSTERED INDEX [IX_ad_mapping_ad_username] ON [ad_user_mapping]([ad_domain], [ad_username]);

CREATE NONCLUSTERED INDEX [IX_login_attempts_email] ON [login_attempts]([email]);
CREATE NONCLUSTERED INDEX [IX_login_attempts_ip] ON [login_attempts]([ip_address]);
CREATE NONCLUSTERED INDEX [IX_login_attempts_time] ON [login_attempts]([attempted_at] DESC);

CREATE NONCLUSTERED INDEX [IX_saved_reports_user_id] ON [saved_reports]([user_id]);
CREATE NONCLUSTERED INDEX [IX_saved_reports_org_id] ON [saved_reports]([organization_id]);
CREATE NONCLUSTERED INDEX [IX_saved_reports_status] ON [saved_reports]([status]);
CREATE NONCLUSTERED INDEX [IX_saved_reports_type] ON [saved_reports]([report_type]);
CREATE NONCLUSTERED INDEX [IX_saved_reports_created] ON [saved_reports]([created_at] DESC);

CREATE NONCLUSTERED INDEX [IX_audit_log_user_id] ON [audit_log]([user_id]);
CREATE NONCLUSTERED INDEX [IX_audit_log_event_type] ON [audit_log]([event_type]);
CREATE NONCLUSTERED INDEX [IX_audit_log_timestamp] ON [audit_log]([timestamp] DESC);
CREATE NONCLUSTERED INDEX [IX_audit_log_severity] ON [audit_log]([severity]);

-- Full-text search for reports (if full-text search is enabled)
-- CREATE FULLTEXT CATALOG [ft_rss_reports];
-- CREATE FULLTEXT INDEX ON [saved_reports]([title], [description]) KEY INDEX [PK__saved_re__3213E83F] ON [ft_rss_reports];

-- Triggers for updated_at columns
CREATE TRIGGER [TR_organizations_updated_at] ON [organizations]
    AFTER UPDATE AS
    UPDATE [organizations] SET [updated_at] = GETDATE()
    WHERE [id] IN (SELECT [id] FROM inserted);

CREATE TRIGGER [TR_users_updated_at] ON [users]
    AFTER UPDATE AS
    UPDATE [users] SET [updated_at] = GETDATE()
    WHERE [id] IN (SELECT [id] FROM inserted);

CREATE TRIGGER [TR_user_sessions_updated_at] ON [user_sessions]
    AFTER UPDATE AS
    UPDATE [user_sessions] SET [updated_at] = GETDATE()
    WHERE [id] IN (SELECT [id] FROM inserted);

CREATE TRIGGER [TR_saved_reports_updated_at] ON [saved_reports]
    AFTER UPDATE AS
    UPDATE [saved_reports] SET [updated_at] = GETDATE()
    WHERE [id] IN (SELECT [id] FROM inserted);

-- Sample data for initial setup
INSERT INTO [organizations] ([name], [domain], [ad_domain]) 
VALUES ('Default Organization', 'company.local', 'COMPANY');

-- Create default admin user (password should be changed on first login)
DECLARE @org_id UNIQUEIDENTIFIER = (SELECT [id] FROM [organizations] WHERE [domain] = 'company.local');
INSERT INTO [users] ([organization_id], [email], [username], [display_name], [role], [password_hash])
VALUES (@org_id, 'admin@company.local', 'admin', 'System Administrator', 'admin', '$2a$10$rA8QrQ8QrQ8QrQ8QrQ8QrO'); -- Default: admin123