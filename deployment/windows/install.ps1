# RSS Visit Report - Windows Server Installation Script
# PowerShell script to install and configure the application on Windows Server

param(
    [Parameter(Mandatory=$false)]
    [string]$Domain = "company.local",
    
    [Parameter(Mandatory=$false)]
    [string]$SqlServer = "localhost\SQLEXPRESS",
    
    [Parameter(Mandatory=$false)]
    [string]$InstallPath = "C:\RSS-VisitReport",
    
    [Parameter(Mandatory=$false)]
    [string]$WebPath = "C:\inetpub\wwwroot\rss-visit-report",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipPreReqs,
    
    [Parameter(Mandatory=$false)]
    [switch]$ConfigureOnly
)

# Requires Administrator privileges
#Requires -RunAsAdministrator

# Set error action preference
$ErrorActionPreference = "Stop"

# Define log file
$LogFile = "$PSScriptRoot\install-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    Add-Content -Path $LogFile -Value $logMessage
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-Prerequisites {
    Write-Log "Installing prerequisites..."
    
    try {
        # Enable IIS and required features
        Write-Log "Enabling IIS features..."
        Enable-WindowsOptionalFeature -Online -FeatureName @(
            "IIS-WebServerRole",
            "IIS-WebServer", 
            "IIS-CommonHttpFeatures",
            "IIS-HttpErrors",
            "IIS-HttpLogging",
            "IIS-Security",
            "IIS-WindowsAuthentication",
            "IIS-RequestFiltering",
            "IIS-StaticContent",
            "IIS-DefaultDocument",
            "IIS-DirectoryBrowsing",
            "IIS-HttpCompressionStatic",
            "IIS-HttpCompressionDynamic",
            "IIS-ApplicationDevelopment",
            "IIS-NetFxExtensibility45",
            "IIS-ISAPIExtensions",
            "IIS-ISAPIFilter",
            "IIS-ASPNET45"
        ) -All
        
        # Install URL Rewrite Module
        Write-Log "Installing IIS URL Rewrite Module..."
        $urlRewriteUrl = "https://download.microsoft.com/download/1/2/8/128E2E22-C1A9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
        $urlRewriteInstaller = "$env:TEMP\urlrewrite.msi"
        
        if (!(Test-Path $urlRewriteInstaller)) {
            Invoke-WebRequest -Uri $urlRewriteUrl -OutFile $urlRewriteInstaller
        }
        Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", $urlRewriteInstaller, "/quiet" -Wait
        
        # Install Node.js if not present
        $nodeVersion = $null
        try { $nodeVersion = & node --version } catch { }
        
        if (!$nodeVersion -or $nodeVersion -lt "v18.0.0") {
            Write-Log "Installing Node.js..."
            $nodeUrl = "https://nodejs.org/dist/v18.19.0/node-v18.19.0-x64.msi"
            $nodeInstaller = "$env:TEMP\nodejs.msi"
            
            Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller
            Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", $nodeInstaller, "/quiet" -Wait
            
            # Refresh PATH
            $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
        }
        
        # Install PM2 for Windows service management
        Write-Log "Installing PM2..."
        & npm install -g pm2
        & npm install -g pm2-windows-service
        
        Write-Log "Prerequisites installed successfully"
        
    } catch {
        Write-Log "Error installing prerequisites: $($_.Exception.Message)" "ERROR"
        throw
    }
}

function Create-DirectoryStructure {
    Write-Log "Creating directory structure..."
    
    $directories = @(
        $InstallPath,
        "$InstallPath\api",
        "$InstallPath\config", 
        "$InstallPath\logs",
        "$InstallPath\backups",
        "$WebPath",
        "C:\SSL"
    )
    
    foreach ($dir in $directories) {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Log "Created directory: $dir"
        }
    }
}

function Copy-ApplicationFiles {
    Write-Log "Copying application files..."
    
    try {
        # Copy API files
        $apiSource = "$PSScriptRoot\..\..\"
        Copy-Item -Path "$apiSource\*" -Destination "$InstallPath\api" -Recurse -Force -Exclude @("node_modules", ".git", "dist")
        
        # Copy built frontend files
        if (Test-Path "$apiSource\dist") {
            Copy-Item -Path "$apiSource\dist\*" -Destination $WebPath -Recurse -Force
        } else {
            Write-Log "Frontend dist folder not found. Please run 'npm run build' first." "WARNING"
        }
        
        Write-Log "Application files copied successfully"
        
    } catch {
        Write-Log "Error copying application files: $($_.Exception.Message)" "ERROR"
        throw
    }
}

function Install-NodeDependencies {
    Write-Log "Installing Node.js dependencies..."
    
    try {
        Set-Location "$InstallPath\api"
        & npm ci --production
        
        Write-Log "Node.js dependencies installed successfully"
        
    } catch {
        Write-Log "Error installing Node.js dependencies: $($_.Exception.Message)" "ERROR"
        throw
    }
}

function Configure-Database {
    param([string]$ConnectionString)
    
    Write-Log "Configuring database..."
    
    try {
        # Test SQL Server connection
        Write-Log "Testing SQL Server connection..."
        $testQuery = "SELECT @@VERSION"
        
        # Use Windows Authentication to test connection
        $connection = New-Object System.Data.SqlClient.SqlConnection("Server=$SqlServer;Integrated Security=true;")
        $connection.Open()
        
        $command = New-Object System.Data.SqlClient.SqlCommand($testQuery, $connection)
        $result = $command.ExecuteScalar()
        Write-Log "SQL Server connection successful: $($result.Substring(0, 100))..."
        
        $connection.Close()
        
        # Create database if it doesn't exist
        Write-Log "Creating database if not exists..."
        $createDbQuery = @"
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'RSS_Visit_Reports')
BEGIN
    CREATE DATABASE [RSS_Visit_Reports]
    COLLATE SQL_Latin1_General_CP1_CI_AS;
END
"@
        
        $connection = New-Object System.Data.SqlClient.SqlConnection("Server=$SqlServer;Integrated Security=true;")
        $connection.Open()
        $command = New-Object System.Data.SqlClient.SqlCommand($createDbQuery, $connection)
        $command.ExecuteNonQuery() | Out-Null
        $connection.Close()
        
        # Run database schema scripts
        Write-Log "Running database schema scripts..."
        $schemaPath = "$InstallPath\api\database\schema"
        
        if (Test-Path $schemaPath) {
            $schemaFiles = Get-ChildItem -Path $schemaPath -Filter "*.sql" | Sort-Object Name
            
            foreach ($file in $schemaFiles) {
                Write-Log "Executing schema file: $($file.Name)"
                $sql = Get-Content -Path $file.FullName -Raw
                
                $connection = New-Object System.Data.SqlClient.SqlConnection("Server=$SqlServer;Database=RSS_Visit_Reports;Integrated Security=true;")
                $connection.Open()
                $command = New-Object System.Data.SqlClient.SqlCommand($sql, $connection)
                $command.CommandTimeout = 300  # 5 minutes
                $command.ExecuteNonQuery() | Out-Null
                $connection.Close()
            }
        }
        
        Write-Log "Database configuration completed successfully"
        
    } catch {
        Write-Log "Error configuring database: $($_.Exception.Message)" "ERROR"
        throw
    }
}

function Configure-IIS {
    Write-Log "Configuring IIS..."
    
    try {
        Import-Module WebAdministration
        
        # Create Application Pool
        $poolName = "RSS-VisitReport-Pool"
        if (!(Get-IISAppPool -Name $poolName -ErrorAction SilentlyContinue)) {
            New-WebAppPool -Name $poolName
            Set-ItemProperty -Path "IIS:\AppPools\$poolName" -Name "managedRuntimeVersion" -Value "v4.0"
            Set-ItemProperty -Path "IIS:\AppPools\$poolName" -Name "processModel.identityType" -Value "ApplicationPoolIdentity"
            Set-ItemProperty -Path "IIS:\AppPools\$poolName" -Name "processModel.idleTimeout" -Value "00:00:00"
            Write-Log "Created application pool: $poolName"
        }
        
        # Create Website
        $siteName = "RSS Visit Report" 
        if (Get-Website -Name $siteName -ErrorAction SilentlyContinue) {
            Remove-Website -Name $siteName
            Write-Log "Removed existing website: $siteName"
        }
        
        New-Website -Name $siteName -Port 80 -PhysicalPath $WebPath -ApplicationPool $poolName
        Write-Log "Created website: $siteName"
        
        # Configure Authentication
        Set-WebConfiguration -Filter "system.webServer/security/authentication/windowsAuthentication" -Value @{enabled="true"} -PSPath "IIS:\Sites\$siteName"
        Set-WebConfiguration -Filter "system.webServer/security/authentication/anonymousAuthentication" -Value @{enabled="false"} -PSPath "IIS:\Sites\$siteName"
        
        # Set permissions
        $acl = Get-Acl $WebPath
        $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS", "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
        $acl.SetAccessRule($accessRule)
        Set-Acl -Path $WebPath -AclObject $acl
        
        Write-Log "IIS configuration completed successfully"
        
    } catch {
        Write-Log "Error configuring IIS: $($_.Exception.Message)" "ERROR"
        throw
    }
}

function Configure-SSL {
    param([string]$CertPath, [string]$KeyPath)
    
    Write-Log "Configuring SSL certificate..."
    
    try {
        if ($CertPath -and $KeyPath -and (Test-Path $CertPath) -and (Test-Path $KeyPath)) {
            # Import SSL certificate
            $cert = Import-PfxCertificate -FilePath $CertPath -CertStoreLocation Cert:\LocalMachine\My
            
            # Add HTTPS binding
            $siteName = "RSS Visit Report"
            New-WebBinding -Name $siteName -Protocol "https" -Port 443 -HostHeader "rss-reports.$Domain" -SslFlags 1
            
            # Bind certificate
            $binding = Get-WebBinding -Name $siteName -Protocol "https"
            $binding.AddSslCertificate($cert.Thumbprint, "My")
            
            Write-Log "SSL certificate configured successfully"
        } else {
            Write-Log "SSL certificate files not found. Skipping SSL configuration." "WARNING"
        }
        
    } catch {
        Write-Log "Error configuring SSL: $($_.Exception.Message)" "ERROR"
        # Don't throw - SSL is optional for initial setup
    }
}

function Create-WindowsService {
    Write-Log "Creating Windows service for API..."
    
    try {
        # Create PM2 ecosystem file
        $ecosystemConfig = @{
            apps = @(
                @{
                    name = "rss-visit-report-api"
                    script = "server.js"
                    cwd = "$InstallPath\api"
                    instances = 1
                    exec_mode = "fork"
                    watch = $false
                    max_memory_restart = "500M"
                    env = @{
                        NODE_ENV = "production"
                        PORT = "3001"
                    }
                    log_file = "$InstallPath\logs\api.log"
                    error_file = "$InstallPath\logs\api-error.log"
                    out_file = "$InstallPath\logs\api-out.log"
                    log_date_format = "YYYY-MM-DD HH:mm:ss Z"
                }
            )
        } | ConvertTo-Json -Depth 5
        
        $ecosystemPath = "$InstallPath\ecosystem.config.json"
        $ecosystemConfig | Out-File -FilePath $ecosystemPath -Encoding utf8
        
        # Install PM2 service
        Set-Location $InstallPath
        & pm2 start $ecosystemPath
        & pm2 save
        & pm2-service-install -n "RSS-VisitReport-PM2"
        
        Write-Log "Windows service created successfully"
        
    } catch {
        Write-Log "Error creating Windows service: $($_.Exception.Message)" "ERROR"
        throw
    }
}

function Create-ConfigurationFile {
    Write-Log "Creating configuration file..."
    
    try {
        $configContent = @"
# RSS Visit Report - Production Configuration
NODE_ENV=production
PORT=3001

# Database Configuration
DB_TYPE=mssql
DB_SERVER=$SqlServer
DB_DATABASE=RSS_Visit_Reports
DB_INTEGRATED_SECURITY=true
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

# Active Directory Configuration
AD_ENABLED=true
AD_DOMAIN=$Domain
AD_SERVER=dc.$Domain
AD_BASE_DN=DC=$($Domain.Replace('.', ',DC=')),
AD_BIND_DN=CN=rss-service,OU=ServiceAccounts,DC=$($Domain.Replace('.', ',DC='))
AD_BIND_PASSWORD=

# Security Configuration  
JWT_SECRET=$(([System.Web.Security.Membership]::GeneratePassword(32, 8)))
SESSION_SECRET=$(([System.Web.Security.Membership]::GeneratePassword(32, 8)))
ENCRYPTION_KEY=$(([System.Web.Security.Membership]::GeneratePassword(32, 8)))

# CORS Configuration
CORS_ORIGIN=https://rss-reports.$Domain

# SSL Configuration
SSL_ENABLED=true
SSL_CERT_PATH=C:\SSL\rss-reports.$Domain.crt
SSL_KEY_PATH=C:\SSL\rss-reports.$Domain.key

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=$InstallPath\logs\app.log
AUDIT_ENABLED=true

# Performance Configuration
MAX_UPLOAD_SIZE=10MB
REQUEST_TIMEOUT=30000
SESSION_TIMEOUT=1800

# Email Configuration (SMTP)
SMTP_HOST=mail.$Domain
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=rss-reports@$Domain
SMTP_PASSWORD=
SMTP_FROM=rss-reports@$Domain
"@

        $configPath = "$InstallPath\config\.env.production"
        $configContent | Out-File -FilePath $configPath -Encoding utf8
        
        # Set secure permissions on config file
        $acl = Get-Acl $configPath
        $acl.SetAccessRuleProtection($true, $false)  # Disable inheritance
        $adminRule = New-Object System.Security.AccessControl.FileSystemAccessRule("Administrators", "FullControl", "Allow")
        $systemRule = New-Object System.Security.AccessControl.FileSystemAccessRule("SYSTEM", "FullControl", "Allow")
        $acl.SetAccessRule($adminRule)
        $acl.SetAccessRule($systemRule)
        Set-Acl -Path $configPath -AclObject $acl
        
        Write-Log "Configuration file created: $configPath"
        Write-Log "IMPORTANT: Please update the configuration file with your specific settings!" "WARNING"
        
    } catch {
        Write-Log "Error creating configuration file: $($_.Exception.Message)" "ERROR"
        throw
    }
}

function Configure-Firewall {
    Write-Log "Configuring Windows Firewall..."
    
    try {
        # Allow HTTP traffic
        New-NetFirewallRule -DisplayName "RSS Visit Report HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Profile Domain -ErrorAction SilentlyContinue
        
        # Allow HTTPS traffic
        New-NetFirewallRule -DisplayName "RSS Visit Report HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow -Profile Domain -ErrorAction SilentlyContinue
        
        # Allow API traffic (if needed externally)
        # New-NetFirewallRule -DisplayName "RSS Visit Report API" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow -Profile Domain -ErrorAction SilentlyContinue
        
        Write-Log "Firewall rules configured successfully"
        
    } catch {
        Write-Log "Error configuring firewall: $($_.Exception.Message)" "ERROR"
        # Don't throw - firewall configuration is not critical
    }
}

function Test-Installation {
    Write-Log "Testing installation..."
    
    try {
        # Test database connection
        $connection = New-Object System.Data.SqlClient.SqlConnection("Server=$SqlServer;Database=RSS_Visit_Reports;Integrated Security=true;")
        $connection.Open()
        $connection.Close()
        Write-Log "Database connection test: PASSED"
        
        # Test IIS site
        $response = Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Log "IIS site test: PASSED"
        }
        
        # Test API service (if running)
        try {
            $apiResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
            Write-Log "API service test: PASSED"
        } catch {
            Write-Log "API service test: Service may need to be started manually" "WARNING"
        }
        
        Write-Log "Installation tests completed"
        
    } catch {
        Write-Log "Installation test failed: $($_.Exception.Message)" "WARNING"
        # Don't throw - tests are informational
    }
}

function Main {
    Write-Log "=== RSS Visit Report Windows Installation Started ==="
    Write-Log "Installation Parameters:"
    Write-Log "  Domain: $Domain"
    Write-Log "  SQL Server: $SqlServer" 
    Write-Log "  Install Path: $InstallPath"
    Write-Log "  Web Path: $WebPath"
    Write-Log "  Log File: $LogFile"
    
    try {
        # Check administrator privileges
        if (!(Test-Administrator)) {
            throw "This script must be run as Administrator"
        }
        
        # Install prerequisites
        if (!$SkipPreReqs) {
            Install-Prerequisites
        }
        
        # Skip file operations if ConfigureOnly
        if (!$ConfigureOnly) {
            Create-DirectoryStructure
            Copy-ApplicationFiles
            Install-NodeDependencies
        }
        
        # Configure components
        Configure-Database
        Configure-IIS
        Configure-SSL
        Create-WindowsService
        Create-ConfigurationFile
        Configure-Firewall
        
        # Test installation
        Test-Installation
        
        Write-Log "=== RSS Visit Report Installation Completed Successfully ==="
        Write-Log ""
        Write-Log "Next Steps:"
        Write-Log "1. Update configuration file: $InstallPath\config\.env.production"
        Write-Log "2. Configure SSL certificates in C:\SSL\"
        Write-Log "3. Set up Active Directory service account"
        Write-Log "4. Start the API service: pm2 restart rss-visit-report-api"
        Write-Log "5. Access the application at: http://rss-reports.$Domain"
        Write-Log ""
        Write-Log "Installation log saved to: $LogFile"
        
        # Open configuration file for editing
        if (Test-Path "$InstallPath\config\.env.production") {
            Start-Process notepad.exe "$InstallPath\config\.env.production"
        }
        
    } catch {
        Write-Log "Installation failed: $($_.Exception.Message)" "ERROR"
        Write-Log "Please check the log file for details: $LogFile" "ERROR"
        exit 1
    }
}

# Run main installation
Main