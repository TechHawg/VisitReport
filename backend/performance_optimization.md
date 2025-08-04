# Performance Optimization Strategy
## RSS Visit Report Backend Performance

## Overview
This document outlines comprehensive performance optimization strategies for the RSS Visit Report backend system, covering database optimization, caching strategies, query optimization, and scalability considerations for handling multiple offices and concurrent users.

## Database Performance Optimization

### Connection Pooling Configuration
```typescript
// Database connection pool configuration
const poolConfig = {
  // Connection settings
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
    ca: process.env.DB_SSL_CA,
    cert: process.env.DB_SSL_CERT,
    key: process.env.DB_SSL_KEY
  } : false,
  
  // Pool sizing - critical for performance
  min: 2,                    // Minimum connections to maintain
  max: 20,                   // Maximum connections in pool
  acquireTimeoutMillis: 30000,   // Time to wait for connection
  createTimeoutMillis: 30000,    // Time to wait for new connection creation
  destroyTimeoutMillis: 5000,    // Time to wait for connection destruction
  idleTimeoutMillis: 30000,      // Time before idle connection is destroyed
  reapIntervalMillis: 1000,      // How often to check for idle connections
  
  // Connection validation
  createRetryIntervalMillis: 200,
  
  // Performance monitoring
  afterCreate: (conn: any, done: Function) => {
    // Set timezone for consistent date handling
    conn.query('SET timezone="UTC";', (err: any) => {
      if (err) {
        console.error('Failed to set timezone:', err);
      }
      done(err, conn);
    });
  },
  
  // Logging for monitoring
  log: (message: string, logLevel: string) => {
    if (logLevel === 'error') {
      console.error('Database pool error:', message);
    }
  }
};

// Connection pool monitoring
class DatabaseMonitor {
  private pool: any;
  
  constructor(pool: any) {
    this.pool = pool;
    this.startMonitoring();
  }
  
  private startMonitoring(): void {
    setInterval(() => {
      const stats = {
        totalConnections: this.pool.totalCount(),
        idleConnections: this.pool.idleCount(),
        waitingClients: this.pool.waitingCount(),
        timestamp: new Date().toISOString()
      };
      
      // Log if pool is under stress
      if (stats.waitingClients > 5) {
        console.warn('Database pool under stress:', stats);
      }
      
      // Log metrics for monitoring
      console.log('DB Pool Stats:', stats);
    }, 30000); // Check every 30 seconds
  }
}
```

### Query Optimization Patterns
```sql
-- Performance-optimized queries with proper indexing

-- 1. Visit reports with efficient filtering and pagination
CREATE OR REPLACE FUNCTION get_visit_reports_optimized(
    p_organization_id UUID,
    p_office_id UUID DEFAULT NULL,
    p_technician_id UUID DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_search_text TEXT DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
    total_count BIGINT,
    visit_data JSONB
) AS $$
DECLARE
    offset_value INTEGER;
    where_conditions TEXT := '';
    params_array TEXT[] := ARRAY[p_organization_id::TEXT];
    param_count INTEGER := 1;
BEGIN
    offset_value := (p_page - 1) * p_limit;
    
    -- Build dynamic WHERE conditions
    where_conditions := 'WHERE vr.organization_id = $1';
    
    IF p_office_id IS NOT NULL THEN
        param_count := param_count + 1;
        where_conditions := where_conditions || ' AND vr.office_id = $' || param_count;
        params_array := array_append(params_array, p_office_id::TEXT);
    END IF;
    
    IF p_technician_id IS NOT NULL THEN
        param_count := param_count + 1;
        where_conditions := where_conditions || ' AND vr.technician_id = $' || param_count;
        params_array := array_append(params_array, p_technician_id::TEXT);
    END IF;
    
    IF p_status IS NOT NULL THEN
        param_count := param_count + 1;
        where_conditions := where_conditions || ' AND vr.status = $' || param_count;
        params_array := array_append(params_array, p_status);
    END IF;
    
    IF p_start_date IS NOT NULL THEN
        param_count := param_count + 1;
        where_conditions := where_conditions || ' AND vr.visit_date >= $' || param_count;
        params_array := array_append(params_array, p_start_date::TEXT);
    END IF;
    
    IF p_end_date IS NOT NULL THEN
        param_count := param_count + 1;
        where_conditions := where_conditions || ' AND vr.visit_date <= $' || param_count;
        params_array := array_append(params_array, p_end_date::TEXT);
    END IF;
    
    -- Full-text search with proper indexing
    IF p_search_text IS NOT NULL THEN
        param_count := param_count + 1;
        where_conditions := where_conditions || ' AND (
            to_tsvector(\'english\', vr.visit_purpose || \' \' || COALESCE(vr.summary_description, \'\')) 
            @@ plainto_tsquery(\'english\', $' || param_count || ')
            OR vr.report_number ILIKE $' || param_count || '
            OR o.name ILIKE $' || param_count || '
        )';
        params_array := array_append(params_array, '%' || p_search_text || '%');
    END IF;
    
    -- Execute optimized query with aggregated counts
    RETURN QUERY EXECUTE format('
        WITH visit_counts AS (
            SELECT 
                COUNT(*) OVER() as total_count,
                vr.id,
                vr.report_number,
                vr.visit_date,
                vr.visit_type,
                vr.status,
                vr.priority,
                vr.completion_percentage,
                o.name as organization_name,
                off.name as office_name,
                u.first_name || '' '' || u.last_name as technician_name,
                
                -- Aggregated counts using window functions for better performance
                COUNT(hi.id) OVER (PARTITION BY vr.id) as hardware_count,
                COUNT(rr.id) OVER (PARTITION BY vr.id) as recycling_count,
                COUNT(fa.id) OVER (PARTITION BY vr.id) as file_count,
                
                vr.created_at,
                vr.updated_at
            FROM visit_reports vr
            JOIN organizations o ON vr.organization_id = o.id
            JOIN offices off ON vr.office_id = off.id
            JOIN users u ON vr.technician_id = u.id
            LEFT JOIN hardware_inventory hi ON vr.id = hi.visit_report_id
            LEFT JOIN recycling_records rr ON vr.id = rr.visit_report_id
            LEFT JOIN files.file_attachments fa ON vr.id = fa.visit_report_id
            %s
            ORDER BY vr.visit_date DESC, vr.created_at DESC
            LIMIT %s OFFSET %s
        )
        SELECT 
            COALESCE(MAX(total_count), 0) as total_count,
            jsonb_agg(
                jsonb_build_object(
                    ''id'', id,
                    ''reportNumber'', report_number,
                    ''visitDate'', visit_date,
                    ''visitType'', visit_type,
                    ''status'', status,
                    ''priority'', priority,
                    ''completionPercentage'', completion_percentage,
                    ''organizationName'', organization_name,
                    ''officeName'', office_name,
                    ''technicianName'', technician_name,
                    ''hardwareCount'', hardware_count,
                    ''recyclingCount'', recycling_count,
                    ''fileCount'', file_count,
                    ''createdAt'', created_at,
                    ''updatedAt'', updated_at
                )
            ) as visit_data
        FROM visit_counts
    ', where_conditions, p_limit, offset_value);
    
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Hardware inventory with optimized joins and filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hardware_inventory_composite 
ON hardware_inventory (visit_report_id, category_id, status, warranty_expiry);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hardware_inventory_location 
ON hardware_inventory (location_building, location_floor, location_room);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hardware_inventory_search 
ON hardware_inventory USING gin(
    to_tsvector('english', 
        COALESCE(device_name, '') || ' ' || 
        COALESCE(manufacturer, '') || ' ' || 
        COALESCE(model, '') || ' ' || 
        COALESCE(serial_number, '')
    )
);

-- 3. Optimized recycling tracking query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recycling_records_composite
ON recycling_records (visit_report_id, category_id, status, pickup_date);

-- 4. File attachments optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_attachments_composite
ON files.file_attachments (visit_report_id, file_type, created_at);
```

### Database Partitioning Strategy
```sql
-- Partition visit_reports by date for better performance with large datasets
CREATE TABLE visit_reports_partitioned (
    LIKE visit_reports INCLUDING ALL
) PARTITION BY RANGE (visit_date);

-- Create monthly partitions for current and future months
CREATE TABLE visit_reports_2025_01 PARTITION OF visit_reports_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE visit_reports_2025_02 PARTITION OF visit_reports_partitioned
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Function to automatically create new partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || TO_CHAR(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I
                   FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
    
    -- Create indexes on partition
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (organization_id, status)',
                   partition_name || '_org_status_idx', partition_name);
END;
$$ LANGUAGE plpgsql;

-- Scheduled job to create future partitions
CREATE OR REPLACE FUNCTION maintain_partitions()
RETURNS VOID AS $$
DECLARE
    current_month DATE;
    future_month DATE;
BEGIN
    current_month := DATE_TRUNC('month', CURRENT_DATE);
    
    -- Create partitions for next 3 months
    FOR i IN 0..3 LOOP
        future_month := current_month + (i || ' months')::INTERVAL;
        PERFORM create_monthly_partition('visit_reports_partitioned', future_month);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## Redis Caching Strategy

### Multi-Layer Caching Implementation
```typescript
import Redis from 'ioredis';
import { createHash } from 'crypto';

interface CacheConfig {
  ttl: number;
  prefix: string;
  serialize?: boolean;
}

class CacheService {
  private redis: Redis;
  private localCache: Map<string, { data: any; expires: number }>;
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      
      // Connection optimization
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      
      // Performance settings
      maxmemoryPolicy: 'allkeys-lru',
      
      // Connection pooling
      family: 4,
      keepAlive: 30000,
      
      // Cluster support (if using Redis Cluster)
      enableReadyCheck: true,
      connectTimeout: 10000,
      commandTimeout: 5000
    });
    
    // Local in-memory cache for frequently accessed data
    this.localCache = new Map();
    
    // Clear local cache every 5 minutes
    setInterval(() => {
      this.cleanupLocalCache();
    }, 5 * 60 * 1000);
  }
  
  // Multi-level cache get
  async get<T>(key: string, config: CacheConfig): Promise<T | null> {
    const fullKey = `${config.prefix}:${key}`;
    
    // Check local cache first (fastest)
    const localData = this.localCache.get(fullKey);
    if (localData && localData.expires > Date.now()) {
      return localData.data;
    }
    
    try {
      // Check Redis cache
      const redisData = await this.redis.get(fullKey);
      if (redisData) {
        const parsed = config.serialize !== false ? JSON.parse(redisData) : redisData;
        
        // Store in local cache for immediate future access
        this.localCache.set(fullKey, {
          data: parsed,
          expires: Date.now() + (60 * 1000) // 1 minute local cache
        });
        
        return parsed;
      }
    } catch (error) {
      console.error('Redis cache get error:', error);
    }
    
    return null;
  }
  
  // Multi-level cache set
  async set<T>(key: string, value: T, config: CacheConfig): Promise<void> {
    const fullKey = `${config.prefix}:${key}`;
    const serialized = config.serialize !== false ? JSON.stringify(value) : value as string;
    
    try {
      // Set in Redis with TTL
      await this.redis.setex(fullKey, config.ttl, serialized);
      
      // Set in local cache
      this.localCache.set(fullKey, {
        data: value,
        expires: Date.now() + (60 * 1000) // 1 minute local cache
      });
    } catch (error) {
      console.error('Redis cache set error:', error);
    }
  }
  
  // Cache invalidation
  async invalidate(pattern: string): Promise<void> {
    try {
      // Invalidate Redis cache
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      
      // Invalidate local cache
      for (const key of this.localCache.keys()) {
        if (key.includes(pattern.replace('*', ''))) {
          this.localCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
  
  private cleanupLocalCache(): void {
    const now = Date.now();
    for (const [key, data] of this.localCache.entries()) {
      if (data.expires < now) {
        this.localCache.delete(key);
      }
    }
  }
}

// Cache configurations for different data types
const CACHE_CONFIGS = {
  USER_PERMISSIONS: {
    ttl: 15 * 60, // 15 minutes
    prefix: 'perms',
    serialize: true
  },
  VISIT_REPORTS: {
    ttl: 5 * 60, // 5 minutes
    prefix: 'reports',
    serialize: true
  },
  HARDWARE_INVENTORY: {
    ttl: 10 * 60, // 10 minutes
    prefix: 'hardware',
    serialize: true
  },
  ORGANIZATION_DATA: {
    ttl: 60 * 60, // 1 hour
    prefix: 'org',
    serialize: true
  },
  SESSION_DATA: {
    ttl: 30 * 60, // 30 minutes
    prefix: 'sess',
    serialize: true
  }
};

// Cached data access layer
class CachedDataService {
  private cache: CacheService;
  private db: any; // Database connection
  
  constructor(cache: CacheService, db: any) {
    this.cache = cache;
    this.db = db;
  }
  
  async getUserPermissions(userId: string): Promise<string[]> {
    const cacheKey = `user:${userId}`;
    
    // Try cache first
    let permissions = await this.cache.get<string[]>(cacheKey, CACHE_CONFIGS.USER_PERMISSIONS);
    
    if (!permissions) {
      // Cache miss - fetch from database
      const result = await this.db.query(`
        SELECT ARRAY_AGG(DISTINCT permission) as permissions
        FROM (
          SELECT jsonb_array_elements_text(ar.permissions->resource_type) as permission
          FROM user_role_assignments ura
          JOIN access_roles ar ON ura.role_id = ar.id
          JOIN LATERAL jsonb_object_keys(ar.permissions) resource_type ON true
          WHERE ura.user_id = $1 
          AND ura.is_active = true
          AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
        ) perms
      `, [userId]);
      
      permissions = result.rows[0]?.permissions || [];
      
      // Cache the result
      await this.cache.set(cacheKey, permissions, CACHE_CONFIGS.USER_PERMISSIONS);
    }
    
    return permissions;
  }
  
  async getVisitReportSummary(organizationId: string, filters: any): Promise<any> {
    // Create cache key based on filters
    const filterHash = createHash('md5').update(JSON.stringify(filters)).digest('hex');
    const cacheKey = `summary:${organizationId}:${filterHash}`;
    
    let data = await this.cache.get(cacheKey, CACHE_CONFIGS.VISIT_REPORTS);
    
    if (!data) {
      // Fetch from database using the optimized function
      const result = await this.db.query(`
        SELECT * FROM get_visit_reports_optimized($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        organizationId,
        filters.officeId,
        filters.technicianId,
        filters.status,
        filters.startDate,
        filters.endDate,
        filters.search,
        filters.page || 1,
        filters.limit || 20
      ]);
      
      data = {
        totalCount: result.rows[0]?.total_count || 0,
        visits: result.rows[0]?.visit_data || []
      };
      
      await this.cache.set(cacheKey, data, CACHE_CONFIGS.VISIT_REPORTS);
    }
    
    return data;
  }
  
  // Cache warming for frequently accessed data
  async warmCache(): Promise<void> {
    console.log('Starting cache warming...');
    
    try {
      // Warm up organization data
      const organizations = await this.db.query('SELECT id FROM organizations WHERE is_active = true');
      
      for (const org of organizations.rows) {
        // Warm visit report summaries for last 30 days
        const filters = {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          page: 1,
          limit: 20
        };
        
        await this.getVisitReportSummary(org.id, filters);
      }
      
      console.log('Cache warming completed');
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }
}
```

## Application-Level Performance Optimization

### Request Processing Optimization
```typescript
import compression from 'compression';
import { promisify } from 'util';

// Compression middleware for response optimization
const compressionMiddleware = compression({
  // Only compress responses larger than 1kb
  threshold: 1024,
  
  // Compression level (1-9, 6 is default)
  level: 6,
  
  // Only compress certain mime types
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
});

// Response time middleware
const responseTimeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const responseTime = Number(end - start) / 1000000; // Convert to milliseconds
    
    res.setHeader('X-Response-Time', `${responseTime.toFixed(2)}ms`);
    
    // Log slow requests
    if (responseTime > 1000) { // Log requests over 1 second
      console.warn(`Slow request: ${req.method} ${req.originalUrl} - ${responseTime.toFixed(2)}ms`);
    }
  });
  
  next();
};

// Async error handling optimization
const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Bulk operations for better database performance
class BulkOperationsService {
  async bulkCreateHardware(visitReportId: string, hardwareItems: any[]): Promise<any[]> {
    if (hardwareItems.length === 0) return [];
    
    // Use UNNEST for efficient bulk insert
    const values = hardwareItems.map((item, index) => {
      const params = [
        visitReportId,
        item.categoryId,
        item.deviceName,
        item.manufacturer,
        item.model,
        item.serialNumber,
        item.assetTag,
        item.ipAddress,
        item.macAddress,
        item.status || 'active',
        item.conditionRating,
        item.locationBuilding,
        item.locationFloor,
        item.locationRoom,
        JSON.stringify(item.specifications || {}),
        JSON.stringify({ bulkCreated: true, batchIndex: index })
      ];
      return `($${params.map((_, i) => (index * 16) + i + 1).join(', $')})`;
    });
    
    const flatParams = hardwareItems.flatMap(item => [
      visitReportId,
      item.categoryId,
      item.deviceName,
      item.manufacturer,
      item.model,
      item.serialNumber,
      item.assetTag,
      item.ipAddress,
      item.macAddress,
      item.status || 'active',
      item.conditionRating,
      item.locationBuilding,
      item.locationFloor,
      item.locationRoom,
      JSON.stringify(item.specifications || {}),
      JSON.stringify({ bulkCreated: true })
    ]);
    
    const result = await this.db.query(`
      INSERT INTO hardware_inventory (
        visit_report_id, category_id, device_name, manufacturer, model,
        serial_number, asset_tag, ip_address, mac_address, status,
        condition_rating, location_building, location_floor, location_room,
        specifications, metadata
      )
      VALUES ${values.join(', ')}
      RETURNING *
    `, flatParams);
    
    return result.rows;
  }
  
  async bulkUpdateHardware(updates: Array<{id: string, data: any}>): Promise<any[]> {
    if (updates.length === 0) return [];
    
    // Use UPDATE with CASE statements for bulk updates
    const setClause = Object.keys(updates[0].data).map(field => {
      const cases = updates.map((update, index) => 
        `WHEN id = $${index * 2 + 1} THEN $${index * 2 + 2}`
      ).join(' ');
      
      return `${field} = CASE ${cases} ELSE ${field} END`;
    }).join(', ');
    
    const params = updates.flatMap(update => [update.id, update.data[Object.keys(update.data)[0]]]);
    const idList = updates.map(update => `'${update.id}'`).join(', ');
    
    const result = await this.db.query(`
      UPDATE hardware_inventory 
      SET ${setClause}, updated_at = NOW()
      WHERE id IN (${idList})
      RETURNING *
    `, params);
    
    return result.rows;
  }
}
```

### Background Job Processing
```typescript
import Bull from 'bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

// Job queue setup
const redis = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
};

// Define job queues
const emailQueue = new Bull('email processing', { redis });
const fileProcessingQueue = new Bull('file processing', { redis });
const reportGenerationQueue = new Bull('report generation', { redis });
const dataArchivalQueue = new Bull('data archival', { redis });

// Email processing jobs
emailQueue.process('send-notification', 5, async (job) => {
  const { recipientEmail, subject, template, data } = job.data;
  
  try {
    await emailService.sendEmail({
      to: recipientEmail,
      subject,
      template,
      data
    });
    
    // Log successful email
    await auditLogger.log({
      eventType: 'EMAIL_SENT',
      eventCategory: 'NOTIFICATION',
      severity: 'info',
      description: `Email sent to ${recipientEmail}`,
      metadata: { subject, template }
    });
    
    return { success: true, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error('Email processing error:', error);
    throw error;
  }
});

// File processing jobs
fileProcessingQueue.process('process-upload', 3, async (job) => {
  const { fileId, filePath } = job.data;
  
  try {
    // Update progress
    job.progress(10);
    
    // Virus scan
    const virusScanResult = await virusScanner.scan(filePath);
    job.progress(30);
    
    if (!virusScanResult.clean) {
      throw new Error('File failed virus scan');
    }
    
    // Generate thumbnail for images
    if (job.data.isImage) {
      await imageProcessor.generateThumbnail(filePath, fileId);
      job.progress(60);
    }
    
    // Extract metadata
    const metadata = await metadataExtractor.extract(filePath);
    job.progress(80);
    
    // Update database
    await db.query(`
      UPDATE files.file_attachments 
      SET is_processed = true, virus_scanned = true, virus_scan_result = 'clean',
          metadata = $1, updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(metadata), fileId]);
    
    job.progress(100);
    
    return { success: true, fileId, metadata };
  } catch (error) {
    // Mark file as failed
    await db.query(`
      UPDATE files.file_attachments 
      SET virus_scan_result = 'failed', updated_at = NOW()
      WHERE id = $1
    `, [fileId]);
    
    throw error;
  }
});

// Report generation jobs
reportGenerationQueue.process('generate-analytics', 2, async (job) => {
  const { organizationId, reportType, parameters } = job.data;
  
  try {
    job.progress(10);
    
    // Generate report data
    const reportData = await analyticsService.generateReport(organizationId, reportType, parameters);
    job.progress(50);
    
    // Generate PDF
    const pdfBuffer = await pdfGenerator.generateReport(reportData);
    job.progress(80);
    
    // Store report
    const reportId = await reportStorage.store(pdfBuffer, {
      organizationId,
      reportType,
      generatedAt: new Date(),
      parameters
    });
    
    job.progress(100);
    
    return { success: true, reportId, size: pdfBuffer.length };
  } catch (error) {
    console.error('Report generation error:', error);
    throw error;
  }
});

// Bull board for monitoring
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [
    new BullAdapter(emailQueue),
    new BullAdapter(fileProcessingQueue),
    new BullAdapter(reportGenerationQueue),
    new BullAdapter(dataArchivalQueue)
  ],
  serverAdapter: serverAdapter,
});

// Queue monitoring and cleanup
class QueueMonitor {
  private queues: Bull.Queue[];
  
  constructor(queues: Bull.Queue[]) {
    this.queues = queues;
    this.startMonitoring();
  }
  
  private startMonitoring(): void {
    setInterval(async () => {
      for (const queue of this.queues) {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();
        
        console.log(`Queue ${queue.name}:`, {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length
        });
        
        // Clean up old jobs (keep last 100 of each type)
        await queue.clean(24 * 60 * 60 * 1000, 'completed', 100); // 24 hours old
        await queue.clean(24 * 60 * 60 * 1000, 'failed', 100);
      }
    }, 60000); // Check every minute
  }
}
```

## Monitoring and Performance Metrics

### Application Performance Monitoring
```typescript
import prometheus from 'prom-client';

// Create metrics registry
const register = new prometheus.Registry();

// Custom metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const databaseQueryDuration = new prometheus.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

const cacheHitRate = new prometheus.Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'result'] // hit, miss, error
});

const activeConnections = new prometheus.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections'
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(databaseQueryDuration);
register.registerMetric(cacheHitRate);
register.registerMetric(activeConnections);

// Middleware to collect HTTP metrics
const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);
  });
  
  next();
};

// Database query performance tracking
class DatabaseMetrics {
  static trackQuery<T>(queryType: string, table: string, queryFn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    
    return queryFn().then(
      (result) => {
        const duration = (Date.now() - start) / 1000;
        databaseQueryDuration.labels(queryType, table).observe(duration);
        return result;
      },
      (error) => {
        const duration = (Date.now() - start) / 1000;
        databaseQueryDuration.labels(queryType, table).observe(duration);
        throw error;
      }
    );
  }
}

// Health check with performance indicators
class HealthCheckService {
  async getHealthStatus(): Promise<any> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkFileSystem(),
      this.checkExternalServices()
    ]);
    
    const results = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      services: {
        database: this.getCheckResult(checks[0]),
        redis: this.getCheckResult(checks[1]),
        fileSystem: this.getCheckResult(checks[2]),
        external: this.getCheckResult(checks[3])
      },
      performance: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        eventLoopLag: await this.measureEventLoopLag(),
        activeHandles: (process as any)._getActiveHandles().length,
        activeRequests: (process as any)._getActiveRequests().length
      }
    };
    
    // Determine overall status
    const serviceStatuses = Object.values(results.services).map(s => s.status);
    if (serviceStatuses.includes('down')) {
      results.status = 'unhealthy';
    } else if (serviceStatuses.includes('degraded')) {
      results.status = 'degraded';
    }
    
    return results;
  }
  
  private async checkDatabase(): Promise<{status: string, responseTime: number, error?: string}> {
    const start = Date.now();
    
    try {
      await db.query('SELECT 1');
      return {
        status: 'up',
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - start,
        error: error.message
      };
    }
  }
  
  private async measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
        resolve(lag);
      });
    });
  }
}

// Performance optimization recommendations
class PerformanceAnalyzer {
  async analyzePerformance(): Promise<any> {
    const recommendations = [];
    
    // Check database performance
    const dbStats = await this.getDatabaseStats();
    if (dbStats.avgQueryTime > 100) {
      recommendations.push({
        type: 'database',
        severity: 'high',
        message: 'Average query time is high. Consider optimizing slow queries.',
        details: dbStats
      });
    }
    
    // Check cache hit rate
    const cacheStats = await this.getCacheStats();
    if (cacheStats.hitRate < 0.8) {
      recommendations.push({
        type: 'cache',
        severity: 'medium',
        message: 'Cache hit rate is low. Consider caching more frequently accessed data.',
        details: cacheStats
      });
    }
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 80) {
      recommendations.push({
        type: 'memory',
        severity: 'high',
        message: 'High memory usage detected. Consider implementing memory cleanup.',
        details: { memoryUsagePercent, memoryUsage }
      });
    }
    
    return {
      timestamp: new Date().toISOString(),
      overallScore: this.calculatePerformanceScore(dbStats, cacheStats, memoryUsagePercent),
      recommendations
    };
  }
  
  private calculatePerformanceScore(dbStats: any, cacheStats: any, memoryUsage: number): number {
    let score = 100;
    
    // Penalize slow database queries
    if (dbStats.avgQueryTime > 100) score -= 20;
    if (dbStats.avgQueryTime > 500) score -= 30;
    
    // Penalize low cache hit rate
    if (cacheStats.hitRate < 0.9) score -= 10;
    if (cacheStats.hitRate < 0.7) score -= 20;
    
    // Penalize high memory usage
    if (memoryUsage > 80) score -= 15;
    if (memoryUsage > 90) score -= 25;
    
    return Math.max(0, score);
  }
}
```

## Scalability Considerations

### Horizontal Scaling Architecture
```typescript
// Load balancer configuration for multiple instances
const clusterConfig = {
  // PM2 cluster configuration
  instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
  exec_mode: 'cluster',
  
  // Instance management
  max_memory_restart: '1G',
  node_args: '--max-old-space-size=1024',
  
  // Health monitoring
  min_uptime: '10s',
  max_restarts: 5,
  
  // Environment-specific settings
  env: {
    NODE_ENV: 'development',
    PORT: 3000
  },
  env_production: {
    NODE_ENV: 'production',
    PORT: process.env.PORT || 3000
  }
};

// Session affinity handling for cluster mode
class SessionAffinityHandler {
  private sessionStore: Map<string, string> = new Map();
  
  getInstanceForSession(sessionId: string): string {
    if (!this.sessionStore.has(sessionId)) {
      // Assign to least loaded instance
      const instanceId = this.getLeastLoadedInstance();
      this.sessionStore.set(sessionId, instanceId);
    }
    
    return this.sessionStore.get(sessionId)!;
  }
  
  private getLeastLoadedInstance(): string {
    // Implementation would check actual instance loads
    // For now, return a simple round-robin assignment
    const instances = process.env.CLUSTER_INSTANCES?.split(',') || ['instance-1'];
    return instances[Math.floor(Math.random() * instances.length)];
  }
}

// Auto-scaling based on performance metrics
class AutoScaler {
  private currentInstances: number = 1;
  private readonly minInstances: number = 2;
  private readonly maxInstances: number = 10;
  
  async checkScalingNeeds(): Promise<void> {
    const metrics = await this.getPerformanceMetrics();
    
    // Scale up conditions
    if (metrics.cpuUsage > 80 && metrics.responseTime > 1000 && this.currentInstances < this.maxInstances) {
      await this.scaleUp();
    }
    
    // Scale down conditions
    if (metrics.cpuUsage < 30 && metrics.responseTime < 200 && this.currentInstances > this.minInstances) {
      await this.scaleDown();
    }
  }
  
  private async scaleUp(): Promise<void> {
    console.log(`Scaling up from ${this.currentInstances} to ${this.currentInstances + 1} instances`);
    // Implementation would actually spawn new instances
    this.currentInstances++;
  }
  
  private async scaleDown(): Promise<void> {
    console.log(`Scaling down from ${this.currentInstances} to ${this.currentInstances - 1} instances`);
    // Implementation would gracefully shutdown instances
    this.currentInstances--;
  }
}
```

This comprehensive performance optimization strategy ensures the RSS Visit Report system can handle multiple offices and concurrent users efficiently while maintaining fast response times and data consistency.