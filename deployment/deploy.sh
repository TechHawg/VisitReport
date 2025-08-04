#!/bin/bash

# RSS Visit Report Deployment Script
# This script handles the deployment of the application to internal networks

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="rss-visit-report"
DOCKER_COMPOSE_FILE="deployment/docker-compose.yml"
ENV_FILE="deployment/.env"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_warn "Environment file not found. Copying from example..."
        cp "deployment/.env.example" "$ENV_FILE"
        log_warn "Please update the environment variables in $ENV_FILE before continuing."
        read -p "Press Enter to continue after updating the .env file..."
    fi
    
    log_info "Prerequisites check completed."
}

build_application() {
    log_info "Building the application..."
    
    # Install dependencies and build
    npm ci
    npm run build
    
    # Run tests
    log_info "Running tests..."
    npm run test -- --run
    
    # Run security audit
    log_info "Running security audit..."
    npm audit --audit-level moderate
    
    log_info "Application build completed."
}

deploy_with_docker() {
    log_info "Deploying with Docker Compose..."
    
    # Pull latest images
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
    
    # Build and start services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --build
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check if services are running
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
        log_info "Services are running successfully!"
    else
        log_error "Some services failed to start. Check logs with: docker-compose -f $DOCKER_COMPOSE_FILE logs"
        exit 1
    fi
}

setup_nginx_reverse_proxy() {
    log_info "Setting up reverse proxy configuration..."
    
    # Create nginx directory if it doesn't exist
    sudo mkdir -p /etc/nginx/sites-available
    sudo mkdir -p /etc/nginx/sites-enabled
    
    # Copy nginx configuration
    sudo cp deployment/nginx/rss-visit-report.conf /etc/nginx/sites-available/
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/rss-visit-report.conf /etc/nginx/sites-enabled/
    
    # Test nginx configuration
    if sudo nginx -t; then
        log_info "Nginx configuration is valid."
        sudo systemctl reload nginx
    else
        log_error "Nginx configuration is invalid. Please check the configuration."
        exit 1
    fi
}

setup_ssl_certificates() {
    log_info "Setting up SSL certificates..."
    
    # Check if certificates exist
    if [ ! -f "/etc/ssl/certs/rss-visit-report.crt" ]; then
        log_warn "SSL certificates not found. Generating self-signed certificates for development..."
        
        # Generate self-signed certificate
        sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/ssl/private/rss-visit-report.key \
            -out /etc/ssl/certs/rss-visit-report.crt \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        log_warn "Self-signed certificates generated. For production, use proper SSL certificates."
    else
        log_info "SSL certificates found."
    fi
}

setup_firewall() {
    log_info "Configuring firewall rules..."
    
    # Check if ufw is installed
    if command -v ufw &> /dev/null; then
        # Allow SSH
        sudo ufw allow ssh
        
        # Allow HTTP and HTTPS
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        
        # Allow internal network access to application port
        sudo ufw allow from 192.168.0.0/16 to any port 8080
        sudo ufw allow from 10.0.0.0/8 to any port 8080
        sudo ufw allow from 172.16.0.0/12 to any port 8080
        
        # Enable firewall if not already enabled
        sudo ufw --force enable
        
        log_info "Firewall rules configured."
    else
        log_warn "UFW firewall not found. Please configure firewall manually."
    fi
}

setup_log_rotation() {
    log_info "Setting up log rotation..."
    
    # Create logrotate configuration
    sudo tee /etc/logrotate.d/rss-visit-report > /dev/null <<EOF
/var/log/rss-visit-report/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    create 0644 www-data www-data
    postrotate
        docker-compose -f $PWD/$DOCKER_COMPOSE_FILE restart rss-frontend
    endscript
}
EOF
    
    log_info "Log rotation configured."
}

health_check() {
    log_info "Performing health check..."
    
    # Check if the application responds
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        log_info "Application health check passed!"
    else
        log_error "Application health check failed!"
        exit 1
    fi
}

backup_database() {
    log_info "Creating database backup..."
    
    timestamp=$(date +"%Y%m%d_%H%M%S")
    backup_file="backup_${timestamp}.sql"
    
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T rss-database pg_dump -U rss_user rss_visit_report > "backups/$backup_file"
    
    log_info "Database backup created: backups/$backup_file"
}

show_deployment_info() {
    log_info "Deployment completed successfully!"
    echo ""
    echo "Application URLs:"
    echo "  Frontend: http://localhost:8080"
    echo "  API: http://localhost:3001"
    echo ""
    echo "Useful commands:"
    echo "  View logs: docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
    echo "  Stop services: docker-compose -f $DOCKER_COMPOSE_FILE down"
    echo "  Restart services: docker-compose -f $DOCKER_COMPOSE_FILE restart"
    echo ""
}

main() {
    log_info "Starting deployment of $PROJECT_NAME..."
    
    # Parse command line arguments
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            build_application
            deploy_with_docker
            health_check
            show_deployment_info
            ;;
        "ssl")
            setup_ssl_certificates
            ;;
        "nginx")
            setup_nginx_reverse_proxy
            ;;
        "firewall")
            setup_firewall
            ;;
        "logs")
            setup_log_rotation
            ;;
        "backup")
            backup_database
            ;;
        "health")
            health_check
            ;;
        "stop")
            log_info "Stopping services..."
            docker-compose -f "$DOCKER_COMPOSE_FILE" down
            ;;
        "restart")
            log_info "Restarting services..."
            docker-compose -f "$DOCKER_COMPOSE_FILE" restart
            ;;
        *)
            echo "Usage: $0 {deploy|ssl|nginx|firewall|logs|backup|health|stop|restart}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Full deployment (default)"
            echo "  ssl      - Setup SSL certificates"
            echo "  nginx    - Setup reverse proxy"
            echo "  firewall - Configure firewall"
            echo "  logs     - Setup log rotation"
            echo "  backup   - Create database backup"
            echo "  health   - Check application health"
            echo "  stop     - Stop all services"
            echo "  restart  - Restart all services"
            exit 1
            ;;
    esac
}

# Create necessary directories
mkdir -p logs backups

# Run main function
main "$@"