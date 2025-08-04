# RSS Visit Report API Design and Architecture

## Overview
This document outlines the comprehensive API design and backend architecture for the RSS Visit Report system, including endpoints, authentication, security patterns, and performance considerations.

## Technology Stack

### Backend Framework
- **Node.js** with **Express.js** for API server
- **TypeScript** for type safety and development experience
- **PostgreSQL 14+** for primary database
- **Redis** for session storage and caching
- **JWT** for authentication tokens
- **Multer** for file upload handling
- **Sharp** for image processing
- **node-cron** for scheduled tasks

### Additional Services
- **PM2** for process management and clustering
- **Winston** for structured logging
- **Helmet** for security headers
- **Rate limiting** with express-rate-limit
- **CORS** configuration for frontend integration
- **Swagger/OpenAPI** for API documentation

## API Architecture

### Base Structure
```
/api/v1/
├── auth/                 # Authentication and session management
├── organizations/        # Organization management
├── offices/             # Office/location management
├── users/               # User management and profiles
├── visits/              # Visit reports CRUD operations
├── hardware/            # Hardware inventory management
├── recycling/           # Recycling records management
├── files/               # File upload and management
├── reports/             # Analytics and reporting
├── admin/               # Administrative functions
└── health/              # Health checks and system status
```

### Response Format Standards
```typescript
// Success Response
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    hasNext?: boolean;
  };
  timestamp: string;
}

// Error Response
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}
```

## Authentication & Authorization

### JWT Token Structure
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  iat: number;
  exp: number;
}
```

### Role-Based Access Control (RBAC)
```typescript
enum UserRole {
  SYSTEM_ADMIN = 'system_admin',
  MANAGER = 'manager',
  SENIOR_TECHNICIAN = 'senior_technician',
  TECHNICIAN = 'technician',
  AUDITOR = 'auditor',
  READ_ONLY = 'read_only'
}

enum Permission {
  // Users
  USERS_CREATE = 'users:create',
  USERS_READ = 'users:read',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',
  
  // Reports
  REPORTS_CREATE = 'reports:create',
  REPORTS_READ = 'reports:read',
  REPORTS_UPDATE = 'reports:update',
  REPORTS_DELETE = 'reports:delete',
  REPORTS_APPROVE = 'reports:approve',
  
  // Hardware
  HARDWARE_CREATE = 'hardware:create',
  HARDWARE_READ = 'hardware:read',
  HARDWARE_UPDATE = 'hardware:update',
  HARDWARE_DELETE = 'hardware:delete',
  
  // Files
  FILES_UPLOAD = 'files:upload',
  FILES_DOWNLOAD = 'files:download',
  FILES_DELETE = 'files:delete',
  
  // Admin
  SYSTEM_CONFIGURE = 'system:configure',
  AUDIT_READ = 'audit:read'
}
```

## Core API Endpoints

### Authentication Endpoints

#### POST /api/v1/auth/login
```typescript
interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  user: UserProfile;
  token: string;
  refreshToken: string;
  expiresIn: number;
  permissions: string[];
}
```

#### POST /api/v1/auth/refresh
```typescript
interface RefreshRequest {
  refreshToken: string;
}

interface RefreshResponse {
  token: string;
  expiresIn: number;
}
```

#### POST /api/v1/auth/logout
```typescript
// Invalidates current session and token
// Returns 204 No Content
```

### Visit Reports Endpoints

#### GET /api/v1/visits
```typescript
interface GetVisitsQuery {
  page?: number;
  limit?: number;
  organizationId?: string;
  officeId?: string;
  technicianId?: string;
  status?: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  startDate?: string; // ISO date
  endDate?: string;   // ISO date
  search?: string;    // Full-text search
  sortBy?: 'date' | 'status' | 'office' | 'technician';
  sortOrder?: 'asc' | 'desc';
}

interface VisitReportSummary {
  id: string;
  reportNumber: string;
  organizationName: string;
  officeName: string;
  technicianName: string;
  visitDate: string;
  visitType: string;
  status: string;
  priority: string;
  hardwareCount: number;
  recyclingCount: number;
  fileCount: number;
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
}
```

#### POST /api/v1/visits
```typescript
interface CreateVisitRequest {
  organizationId: string;
  officeId: string;
  visitDate: string;
  visitType: 'routine' | 'emergency' | 'maintenance' | 'audit';
  visitPurpose: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledStartTime?: string;
  scheduledEndTime?: string;
}

interface VisitReportDetail extends VisitReportSummary {
  visitPurpose: string;
  summaryDescription?: string;
  visitStartTime?: string;
  visitEndTime?: string;
  scheduledBy?: string;
  approvedBy?: string;
  approvalDate?: string;
  issuesFound: number;
  tasksCompleted: number;
  emailSentAt?: string;
  emailRecipients: string[];
  hasPhotos: boolean;
  hasDocuments: boolean;
  metadata: Record<string, any>;
}
```

#### GET /api/v1/visits/:id
Returns detailed visit report with related data.

#### PUT /api/v1/visits/:id
Updates visit report. Requires appropriate permissions.

#### DELETE /api/v1/visits/:id
Soft deletes visit report. Requires admin permissions.

#### POST /api/v1/visits/:id/complete
Marks visit as completed and triggers business logic.

#### POST /api/v1/visits/:id/submit
Submits report for approval and sends notifications.

### Hardware Inventory Endpoints

#### GET /api/v1/hardware
```typescript
interface GetHardwareQuery {
  visitReportId?: string;
  categoryId?: string;
  status?: 'active' | 'inactive' | 'maintenance' | 'retired';
  warrantyStatus?: 'active' | 'expiring_soon' | 'expired';
  maintenanceStatus?: 'current' | 'due_soon' | 'overdue';
  location?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface HardwareItem {
  id: string;
  visitReportId: string;
  categoryName: string;
  deviceName: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  assetTag: string;
  ipAddress?: string;
  macAddress?: string;
  status: string;
  conditionRating: number;
  location: {
    building: string;
    floor: string;
    room: string;
    rack?: string;
    rackUnit?: string;
  };
  warrantyExpiry?: string;
  nextMaintenance?: string;
  currentValue?: number;
  actionRequired: boolean;
  actionDescription?: string;
  actionPriority?: string;
  hasPhotos: boolean;
  photoCount: number;
  createdAt: string;
  updatedAt: string;
}
```

#### POST /api/v1/hardware
Creates new hardware inventory item.

#### PUT /api/v1/hardware/:id
Updates hardware inventory item.

#### DELETE /api/v1/hardware/:id
Removes hardware inventory item.

#### POST /api/v1/hardware/bulk
Bulk import/update hardware items from CSV or JSON.

### Recycling Management Endpoints

#### GET /api/v1/recycling
```typescript
interface GetRecyclingQuery {
  visitReportId?: string;
  categoryId?: string;
  status?: 'identified' | 'scheduled' | 'picked_up' | 'processed' | 'completed';
  pickupStatus?: 'scheduled' | 'overdue' | 'completed';
  sensitiveData?: boolean;
  page?: number;
  limit?: number;
}

interface RecyclingItem {
  id: string;
  visitReportId: string;
  categoryName: string;
  itemDescription: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  quantity: number;
  unitType: string;
  status: string;
  disposalMethod: string;
  containsSensitiveData: boolean;
  dataDestructionCertified: boolean;
  pickupScheduled: boolean;
  pickupDate?: string;
  pickupCompany?: string;
  totalCost?: number;
  environmentalFee?: number;
  recyclingFee?: number;
  hasPhotos: boolean;
  createdAt: string;
  updatedAt: string;
}
```

#### POST /api/v1/recycling
Creates new recycling record.

#### PUT /api/v1/recycling/:id
Updates recycling record.

#### POST /api/v1/recycling/:id/schedule-pickup
Schedules pickup for recycling item.

#### POST /api/v1/recycling/:id/certify-destruction
Records data destruction certification.

### File Management Endpoints

#### POST /api/v1/files/upload
```typescript
interface FileUploadRequest {
  file: File; // multipart/form-data
  visitReportId?: string;
  hardwareId?: string;
  recyclingId?: string;
  category?: string;
  tags?: string[];
  accessLevel?: 'internal' | 'confidential' | 'restricted';
}

interface FileAttachment {
  id: string;
  originalFilename: string;
  storedFilename: string;
  fileSize: number;
  mimeType: string;
  fileType: 'photo' | 'document' | 'video' | 'other';
  category?: string;
  tags: string[];
  accessLevel: string;
  uploadedBy: string;
  isProcessed: boolean;
  thumbnailGenerated: boolean;
  virusScanned: boolean;
  downloadCount: number;
  createdAt: string;
}
```

#### GET /api/v1/files/:id
Downloads file with access control checks.

#### GET /api/v1/files/:id/thumbnail
Returns thumbnail for image files.

#### DELETE /api/v1/files/:id
Deletes file (soft delete with audit trail).

#### GET /api/v1/files
Lists files with filtering and pagination.

### Analytics and Reporting Endpoints

#### GET /api/v1/reports/dashboard
```typescript
interface DashboardMetrics {
  totalVisits: number;
  completedVisits: number;
  pendingVisits: number;
  totalHardwareItems: number;
  hardwareRequiringAction: number;
  totalRecyclingItems: number;
  recyclingCost: number;
  recentActivity: ActivityItem[];
  upcomingTasks: TaskItem[];
  warningAlerts: AlertItem[];
}
```

#### GET /api/v1/reports/analytics
```typescript
interface AnalyticsQuery {
  organizationId?: string;
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
  metrics?: string[]; // Array of metric names
}

interface AnalyticsResponse {
  summary: {
    totalVisits: number;
    uniqueTechnicians: number;
    officesVisited: number;
    avgCompletionRate: number;
    totalHardwareValue: number;
    totalRecyclingCost: number;
  };
  timeSeries: TimeSeriesData[];
  breakdowns: {
    byCategory: CategoryBreakdown[];
    byStatus: StatusBreakdown[];
    byTechnician: TechnicianBreakdown[];
  };
}
```

#### GET /api/v1/reports/compliance
Returns compliance status and audit information.

#### GET /api/v1/reports/export
Exports data in various formats (CSV, PDF, Excel).

### Administrative Endpoints

#### GET /api/v1/admin/system-health
Returns system health metrics and status.

#### GET /api/v1/admin/audit-logs
```typescript
interface AuditLogQuery {
  startDate?: string;
  endDate?: string;
  userId?: string;
  eventType?: string;
  severity?: string;
  tableName?: string;
  page?: number;
  limit?: number;
}
```

#### POST /api/v1/admin/maintenance/archive
Triggers data archival process.

#### POST /api/v1/admin/maintenance/cleanup
Cleans up old sessions and temporary data.

## Security Implementation

### Input Validation
```typescript
import Joi from 'joi';

const createVisitSchema = Joi.object({
  organizationId: Joi.string().uuid().required(),
  officeId: Joi.string().uuid().required(),
  visitDate: Joi.date().iso().required(),
  visitType: Joi.string().valid('routine', 'emergency', 'maintenance', 'audit').required(),
  visitPurpose: Joi.string().min(10).max(1000).required(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional()
});
```

### Rate Limiting Configuration
```typescript
const rateLimitConfig = {
  // General API limits
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // requests per window
    message: 'Too many requests, please try again later'
  },
  
  // Authentication limits
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5, // login attempts per window
    skipSuccessfulRequests: true
  },
  
  // File upload limits
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // uploads per hour
    skipSuccessfulRequests: false
  }
};
```

### CORS Configuration
```typescript
const corsOptions = {
  origin: process.env.FRONTEND_URLS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};
```

## Performance Optimization

### Database Connection Pooling
```typescript
const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production',
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
```

### Redis Caching Strategy
```typescript
interface CacheConfig {
  // Session storage
  sessions: {
    ttl: 30 * 60, // 30 minutes
    prefix: 'sess:'
  };
  
  // API response caching
  reports: {
    ttl: 5 * 60, // 5 minutes
    prefix: 'reports:'
  };
  
  // User permissions caching
  permissions: {
    ttl: 15 * 60, // 15 minutes
    prefix: 'perms:'
  };
}
```

### Query Optimization Guidelines
1. Use database views for complex joins
2. Implement pagination for all list endpoints
3. Use proper indexes on frequently queried columns
4. Cache frequently accessed reference data
5. Use database connection pooling
6. Implement query result caching for read-heavy operations

## Error Handling

### Error Types and HTTP Status Codes
```typescript
enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',                    // 401
  FORBIDDEN = 'FORBIDDEN',                         // 403
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',                 // 401
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',           // 400
  INVALID_INPUT = 'INVALID_INPUT',                 // 400
  
  // Resource Management
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',       // 404
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',         // 409
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',             // 423
  
  // Business Logic
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION', // 422
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS', // 403
  
  // System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR', // 500
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',     // 503
  DATABASE_ERROR = 'DATABASE_ERROR',               // 500
  
  // File Management
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',               // 413
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE', // 415
  FILE_PROCESSING_ERROR = 'FILE_PROCESSING_ERROR'  // 500
}
```

## Logging Strategy

### Log Levels and Categories
```typescript
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: 'auth' | 'api' | 'database' | 'file' | 'business' | 'security';
  message: string;
  metadata?: {
    userId?: string;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
    executionTime?: number;
    [key: string]: any;
  };
}
```

## Deployment Considerations

### Environment Configuration
```typescript
interface EnvironmentConfig {
  NODE_ENV: 'development' | 'staging' | 'production';
  PORT: number;
  
  // Database
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  
  // Redis
  REDIS_URL: string;
  
  // JWT
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  
  // File Storage
  UPLOAD_PATH: string;
  MAX_FILE_SIZE: number;
  
  // Email
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  
  // External Services
  FRONTEND_URLS: string;
  API_BASE_URL: string;
}
```

### Health Check Endpoint
```typescript
// GET /api/v1/health
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    fileSystem: ServiceStatus;
  };
  metrics: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    activeConnections: number;
  };
}

interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
  lastCheck: string;
}
```

This comprehensive API design provides a robust foundation for the RSS Visit Report system with proper security, performance optimization, and scalability considerations built in from the ground up.