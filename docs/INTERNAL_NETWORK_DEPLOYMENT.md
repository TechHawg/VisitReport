# RSS Visit Report - Internal Network Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the RSS Visit Report application on internal corporate networks with enterprise-grade security, performance, and reliability.

## Prerequisites

### System Requirements

**Minimum Requirements:**
- **OS**: Ubuntu 20.04 LTS, CentOS 8+, or RHEL 8+
- **CPU**: 2 cores, 2.4 GHz
- **RAM**: 4 GB
- **Storage**: 50 GB available space
- **Network**: Internal network access with static IP

**Recommended for Production:**
- **OS**: Ubuntu 22.04 LTS or RHEL 9
- **CPU**: 4 cores, 3.0 GHz
- **RAM**: 8 GB
- **Storage**: 100 GB SSD
- **Network**: Redundant network connections

### Software Requirements

```bash
# Required Software
- Docker 24.0+
- Docker Compose 2.0+
- Node.js 18+ (for development)
- PostgreSQL 15+ (if not using Docker)
- Redis 7+ (for caching)
- Nginx 1.22+ (reverse proxy)
```

### Network Requirements

- **Internal IP Range**: 10.0.0.0/8, 172.16.0.0/12, or 192.168.0.0/16
- **DNS Resolution**: Internal DNS server with A record
- **Firewall**: Ports 80, 443, and application ports configured
- **SSL Certificate**: Valid internal CA certificate

## Pre-Deployment Setup

### 1. System Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip htop iotop

# Create application user
sudo useradd -m -s /bin/bash rss-app
sudo usermod -aG docker rss-app
```

### 2. Docker Installation

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Start Docker service
sudo systemctl enable docker
sudo systemctl start docker
```

### 3. Network Configuration

```bash
# Configure static IP (example for Ubuntu)
sudo nano /etc/netplan/01-network-manager-all.yaml
```

```yaml
# Example netplan configuration
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses:
          - 192.168.1.10  # Internal DNS
          - 192.168.1.11  # Secondary DNS
```

```bash
# Apply network configuration
sudo netplan apply
```

## Deployment Process

### 1. Download and Prepare Application

```bash
# Clone the application
git clone https://github.com/your-org/rss-visit-report.git
cd rss-visit-report

# Switch to application user
sudo su - rss-app
cd /home/rss-app/rss-visit-report
```

### 2. Environment Configuration

```bash
# Copy environment configuration
cp .env.example .env.production

# Edit production environment
nano .env.production
```

**Critical Environment Variables for Internal Network:**

```env
# Application Configuration
VITE_APP_ENVIRONMENT="production"
VITE_DEBUG_MODE="false"

# Internal Network API
VITE_API_BASE_URL="https://rss-reports.your-domain.local/api"
VITE_INTERNAL_NETWORK_ONLY="true"
VITE_ALLOWED_IP_RANGES="10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"

# Active Directory Integration
VITE_AD_ENABLED="true"
VITE_AD_DOMAIN="your-domain.local"
VITE_AD_BASE_DN="DC=your-domain,DC=local"

# Database (Internal)
DB_HOST="192.168.1.101"
DB_NAME="rss_visit_reports"
DB_USER="rss_user"
DB_PASSWORD="your-secure-password"
DB_SSL_MODE="require"

# Redis Cache (Internal)
REDIS_HOST="192.168.1.102"
REDIS_PASSWORD="your-redis-password"

# Security
VITE_CSP_ENABLED="true"
VITE_SECURITY_HEADERS="true"
VITE_AUDIT_LOGGING="true"

# Email (Internal SMTP)
VITE_SMTP_FROM="rss-reports@your-domain.local"
```

### 3. SSL Certificate Setup

**Option A: Internal CA Certificate (Recommended)**

```bash
# Create directory for certificates
sudo mkdir -p /etc/ssl/rss-visit-report

# Copy your internal CA certificates
sudo cp your-internal-ca.crt /etc/ssl/rss-visit-report/
sudo cp rss-reports.your-domain.local.crt /etc/ssl/rss-visit-report/
sudo cp rss-reports.your-domain.local.key /etc/ssl/rss-visit-report/

# Set proper permissions
sudo chmod 644 /etc/ssl/rss-visit-report/*.crt
sudo chmod 600 /etc/ssl/rss-visit-report/*.key
sudo chown root:root /etc/ssl/rss-visit-report/*
```

**Option B: Self-Signed Certificate (Development)**

```bash
# Generate self-signed certificate
./deployment/deploy.sh ssl
```

### 4. Database Setup

**If using external PostgreSQL:**

```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE rss_visit_reports;
CREATE USER rss_user WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE rss_visit_reports TO rss_user;

-- Create required extensions
\c rss_visit_reports
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

**Run database migrations:**

```bash
# Initialize database schema
psql -h 192.168.1.101 -U rss_user -d rss_visit_reports -f database/schema/01_core_tables.sql
psql -h 192.168.1.101 -U rss_user -d rss_visit_reports -f database/schema/02_hardware_inventory.sql
psql -h 192.168.1.101 -U rss_user -d rss_visit_reports -f database/schema/03_recycling_files.sql
psql -h 192.168.1.101 -U rss_user -d rss_visit_reports -f database/schema/04_audit_security.sql
```

### 5. Deploy Application

```bash
# Make deployment script executable
chmod +x deployment/deploy.sh

# Run full deployment
./deployment/deploy.sh deploy
```

### 6. Configure Reverse Proxy

```bash
# Setup Nginx reverse proxy
./deployment/deploy.sh nginx

# Configure firewall
./deployment/deploy.sh firewall

# Setup log rotation
./deployment/deploy.sh logs
```

## Post-Deployment Configuration

### 1. Active Directory Integration

**Configure LDAP Authentication:**

```bash
# Install LDAP utilities
sudo apt install -y ldap-utils

# Test LDAP connection
ldapsearch -x -H ldap://your-dc.domain.local -D "cn=service-account,ou=service-accounts,dc=domain,dc=local" -W -b "dc=domain,dc=local" "(sAMAccountName=testuser)"
```

**Update backend configuration for AD:**

```javascript
// backend/config/ldap.js
module.exports = {
  url: 'ldap://your-dc.domain.local:389',
  bindDN: 'cn=rss-service,ou=service-accounts,dc=domain,dc=local',
  bindCredentials: process.env.LDAP_PASSWORD,
  searchBase: 'dc=domain,dc=local',
  searchFilter: '(sAMAccountName={{username}})',
  searchAttributes: ['sAMAccountName', 'mail', 'displayName', 'memberOf']
};
```

### 2. Email Configuration

**Configure Internal SMTP:**

```env
# Internal SMTP settings
SMTP_HOST="mail.your-domain.local"
SMTP_PORT="587"
SMTP_SECURE="true"
SMTP_USER="rss-reports@your-domain.local"
SMTP_PASSWORD="your-email-password"
```

### 3. Backup Configuration

```bash
# Create backup script
sudo crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/rss-app/rss-visit-report/deployment/deploy.sh backup

# Add weekly log cleanup
0 3 * * 0 find /var/log/rss-visit-report -name "*.log.gz" -mtime +30 -delete
```

### 4. Monitoring Setup

```bash
# Install monitoring tools
sudo apt install -y prometheus-node-exporter

# Create health check script
cat > /usr/local/bin/rss-health-check.sh << EOF
#!/bin/bash
curl -f http://localhost:8080/health || exit 1
EOF

chmod +x /usr/local/bin/rss-health-check.sh

# Add to crontab for monitoring
echo "*/5 * * * * /usr/local/bin/rss-health-check.sh" | sudo crontab -
```

## Security Hardening

### 1. System Hardening

```bash
# Update system and enable automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure SSH security
sudo nano /etc/ssh/sshd_config
```

```
# SSH Security Configuration
Port 2222
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
X11Forwarding no
AllowUsers rss-app
```

### 2. Application Security

```bash
# Set proper file permissions
sudo chown -R rss-app:rss-app /home/rss-app/rss-visit-report
sudo chmod -R 755 /home/rss-app/rss-visit-report
sudo chmod 600 /home/rss-app/rss-visit-report/.env.production

# Secure configuration files
sudo chmod 600 /etc/ssl/rss-visit-report/*.key
sudo chown root:root /etc/ssl/rss-visit-report/*
```

### 3. Network Security

```bash
# Configure iptables for additional security
sudo iptables -A INPUT -p tcp --dport 22 -s 192.168.1.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -s 192.168.0.0/16 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -s 192.168.0.0/16 -j ACCEPT
sudo iptables -A INPUT -j DROP

# Save iptables rules
sudo iptables-save > /etc/iptables/rules.v4
```

## Troubleshooting

### Common Issues

**1. Application Won't Start**

```bash
# Check Docker containers
docker-compose -f deployment/docker-compose.yml ps

# Check logs
docker-compose -f deployment/docker-compose.yml logs -f

# Check disk space
df -h

# Check memory usage
free -h
```

**2. Database Connection Issues**

```bash
# Test database connection
psql -h 192.168.1.101 -U rss_user -d rss_visit_reports -c "SELECT version();"

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Verify firewall rules
sudo ufw status
```

**3. Authentication Problems**

```bash
# Test LDAP connectivity
ldapsearch -x -H ldap://your-dc.domain.local -D "cn=service-account,ou=service-accounts,dc=domain,dc=local" -W

# Check application logs
docker-compose -f deployment/docker-compose.yml logs backend

# Verify AD configuration
echo $VITE_AD_DOMAIN
echo $VITE_AD_BASE_DN
```

**4. SSL Certificate Issues**

```bash
# Check certificate validity
openssl x509 -in /etc/ssl/rss-visit-report/rss-reports.your-domain.local.crt -text -noout

# Test SSL connection
openssl s_client -connect rss-reports.your-domain.local:443

# Check Nginx configuration
sudo nginx -t
```

### Performance Optimization

**1. Database Optimization**

```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_visit_reports_created_at ON visit_reports(created_at);
CREATE INDEX CONCURRENTLY idx_hardware_inventory_office_id ON hardware_inventory(office_id);
CREATE INDEX CONCURRENTLY idx_audit_log_timestamp ON audit_log(timestamp);

-- Update statistics
ANALYZE;
```

**2. Application Optimization**

```bash
# Configure Redis memory policy
echo "maxmemory 1gb" >> /etc/redis/redis.conf
echo "maxmemory-policy allkeys-lru" >> /etc/redis/redis.conf

# Restart Redis
sudo systemctl restart redis
```

**3. Nginx Optimization**

```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 1024;

# Enable gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# Enable caching
location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Maintenance Procedures

### Daily Tasks

- Monitor application health endpoint
- Check disk space and memory usage
- Review error logs for anomalies
- Verify backup completion

### Weekly Tasks

- Update system packages
- Review security logs
- Check SSL certificate expiry
- Clean up old log files

### Monthly Tasks

- Security audit and vulnerability scan
- Database maintenance and optimization
- Review and update documentation
- Test disaster recovery procedures

## Support and Contact

**Internal IT Support:**
- **Email**: it-support@your-domain.local
- **Phone**: Extension 1234
- **Ticket System**: https://helpdesk.your-domain.local

**Application Logs Location:**
- Application: `/var/log/rss-visit-report/app.log`
- Database: `/var/log/postgresql/`
- Nginx: `/var/log/nginx/`
- System: `/var/log/syslog`

**Emergency Contacts:**
- **Primary Administrator**: admin@your-domain.local
- **Database Administrator**: dba@your-domain.local
- **Security Team**: security@your-domain.local