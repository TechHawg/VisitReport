# Security Implementation Guide
## RSS Visit Report Backend Security

## Overview
This document provides comprehensive security implementation guidelines for the RSS Visit Report backend, addressing authentication, authorization, data protection, and compliance requirements identified in the security analysis.

## Authentication System

### JWT Token Implementation
```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

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

class AuthenticationService {
  private readonly JWT_SECRET = process.env.JWT_SECRET!;
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
  private readonly SALT_ROUNDS = 12;
  
  async login(email: string, password: string, ipAddress: string, userAgent: string): Promise<AuthResult> {
    try {
      // Rate limiting check
      await this.checkLoginRateLimit(email, ipAddress);
      
      // Get user with failed attempt count
      const user = await this.getUserByEmail(email);
      if (!user) {
        await this.logSecurityEvent('LOGIN_FAILURE', 'User not found', { email, ipAddress });
        throw new UnauthorizedError('Invalid credentials');
      }
      
      // Check if account is locked
      if (user.locked_until && user.locked_until > new Date()) {
        await this.logSecurityEvent('LOGIN_BLOCKED', 'Account locked', { email, ipAddress });
        throw new UnauthorizedError('Account temporarily locked');
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        await this.handleFailedLogin(user.id, ipAddress);
        throw new UnauthorizedError('Invalid credentials');
      }
      
      // Check if user is active
      if (!user.is_active) {
        await this.logSecurityEvent('LOGIN_BLOCKED', 'Inactive account', { email, ipAddress });
        throw new UnauthorizedError('Account disabled');
      }
      
      // Reset failed attempts on successful login
      await this.resetFailedAttempts(user.id);
      
      // Get user permissions
      const permissions = await this.getUserPermissions(user.id);
      
      // Create session
      const sessionId = crypto.randomUUID();
      await this.createUserSession(user.id, sessionId, ipAddress, userAgent);
      
      // Generate tokens
      const accessToken = this.generateAccessToken(user, permissions, sessionId);
      const refreshToken = this.generateRefreshToken(user.id, sessionId);
      
      // Update last login
      await this.updateLastLogin(user.id);
      
      // Log successful login
      await this.logSecurityEvent('LOGIN_SUCCESS', 'User logged in successfully', {
        userId: user.id,
        email,
        ipAddress,
        sessionId
      });
      
      return {
        user: this.sanitizeUser(user),
        accessToken,
        refreshToken,
        expiresIn: 30 * 60, // 30 minutes
        permissions
      };
      
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        await this.logSecurityEvent('LOGIN_ERROR', 'Login system error', {
          email,
          ipAddress,
          error: error.message
        });
      }
      throw error;
    }
  }
  
  async refreshToken(refreshToken: string, ipAddress: string): Promise<RefreshResult> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as RefreshTokenPayload;
      
      // Check if session exists and is valid
      const session = await this.getSessionById(decoded.sessionId);
      if (!session || session.expires_at < new Date()) {
        throw new UnauthorizedError('Invalid or expired session');
      }
      
      // Get user and permissions
      const user = await this.getUserById(decoded.userId);
      if (!user || !user.is_active) {
        throw new UnauthorizedError('User not found or inactive');
      }
      
      const permissions = await this.getUserPermissions(user.id);
      
      // Generate new access token
      const accessToken = this.generateAccessToken(user, permissions, decoded.sessionId);
      
      // Update session activity
      await this.updateSessionActivity(decoded.sessionId);
      
      return {
        accessToken,
        expiresIn: 30 * 60
      };
      
    } catch (error) {
      await this.logSecurityEvent('TOKEN_REFRESH_ERROR', 'Token refresh failed', {
        ipAddress,
        error: error.message
      });
      throw new UnauthorizedError('Invalid refresh token');
    }
  }
  
  private generateAccessToken(user: any, permissions: string[], sessionId: string): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      organizationId: user.organization_id,
      roles: user.roles || [],
      permissions,
      sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 60) // 30 minutes
    };
    
    return jwt.sign(payload, this.JWT_SECRET, {
      algorithm: 'HS256',
      issuer: 'rss-visit-report',
      audience: 'rss-visit-report-frontend'
    });
  }
  
  private async handleFailedLogin(userId: string, ipAddress: string): Promise<void> {
    const result = await this.db.query(`
      UPDATE users 
      SET failed_login_attempts = failed_login_attempts + 1,
          locked_until = CASE 
            WHEN failed_login_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
            ELSE locked_until
          END
      WHERE id = $1
      RETURNING failed_login_attempts, locked_until
    `, [userId]);
    
    const attempts = result.rows[0]?.failed_login_attempts || 0;
    
    await this.logSecurityEvent('LOGIN_FAILURE', `Failed login attempt ${attempts}`, {
      userId,
      ipAddress,
      attempts,
      locked: result.rows[0]?.locked_until !== null
    });
  }
}
```

### Authentication Middleware
```typescript
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  permissions?: string[];
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || crypto.randomUUID()
        }
      });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Check if session is still valid
    const session = await checkSessionValidity(decoded.sessionId);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Session expired or invalid',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || crypto.randomUUID()
        }
      });
    }
    
    // Update session activity
    await updateSessionActivity(decoded.sessionId);
    
    // Attach user info to request
    req.user = decoded;
    req.permissions = decoded.permissions;
    
    next();
    
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || crypto.randomUUID()
        }
      });
    }
    
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Authentication system error',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || crypto.randomUUID()
      }
    });
  }
};
```

## Authorization System

### Role-Based Access Control (RBAC)
```typescript
class AuthorizationService {
  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    context?: any
  ): Promise<boolean> {
    // Get user permissions from cache or database
    const permissions = await this.getUserPermissions(userId);
    
    // Check direct permission
    const directPermission = `${resource}:${action}`;
    if (permissions.includes(directPermission)) {
      return true;
    }
    
    // Check wildcard permissions
    const wildcardPermission = `${resource}:*`;
    if (permissions.includes(wildcardPermission)) {
      return true;
    }
    
    // Check admin permissions
    if (permissions.includes('*:*')) {
      return true;
    }
    
    // Context-based permissions (e.g., own data access)
    if (context && await this.checkContextualPermission(userId, resource, action, context)) {
      return true;
    }
    
    return false;
  }
  
  private async checkContextualPermission(
    userId: string,
    resource: string,
    action: string,
    context: any
  ): Promise<boolean> {
    switch (resource) {
      case 'reports':
        // Users can read/update their own reports
        if (action === 'read' || action === 'update') {
          const report = await this.getVisitReport(context.reportId);
          return report?.technician_id === userId;
        }
        break;
        
      case 'hardware':
        // Users can manage hardware from their own reports
        if (action === 'read' || action === 'update') {
          const hardware = await this.getHardwareItem(context.hardwareId);
          if (hardware) {
            const report = await this.getVisitReport(hardware.visit_report_id);
            return report?.technician_id === userId;
          }
        }
        break;
    }
    
    return false;
  }
}

// Permission checking middleware
export const requirePermission = (resource: string, action: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    }
    
    const authService = new AuthorizationService();
    const hasPermission = await authService.checkPermission(
      req.user.userId,
      resource,
      action,
      { ...req.params, ...req.query }
    );
    
    if (!hasPermission) {
      await logSecurityEvent('UNAUTHORIZED_ACCESS', 'Insufficient permissions', {
        userId: req.user.userId,
        resource,
        action,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    }
    
    next();
  };
};
```

## Input Validation and Sanitization

### Comprehensive Validation Schema
```typescript
import Joi from 'joi';
import DOMPurify from 'isomorphic-dompurify';

class ValidationService {
  // Visit report validation
  static readonly visitReportSchema = Joi.object({
    organizationId: Joi.string().uuid().required(),
    officeId: Joi.string().uuid().required(),
    visitDate: Joi.date().iso().max('now').required(),
    visitType: Joi.string().valid('routine', 'emergency', 'maintenance', 'audit', 'installation', 'decommission').required(),
    visitPurpose: Joi.string().min(10).max(2000).required(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
    summaryDescription: Joi.string().max(5000).optional(),
    scheduledStartTime: Joi.date().iso().optional(),
    scheduledEndTime: Joi.date().iso().greater(Joi.ref('scheduledStartTime')).optional()
  });
  
  // Hardware inventory validation
  static readonly hardwareSchema = Joi.object({
    categoryId: Joi.string().uuid().required(),
    deviceName: Joi.string().min(1).max(255).required(),
    manufacturer: Joi.string().max(100).optional(),
    model: Joi.string().max(100).optional(),
    serialNumber: Joi.string().pattern(/^[A-Za-z0-9\-_]{1,100}$/).optional(),
    assetTag: Joi.string().pattern(/^[A-Za-z0-9\-_]{1,50}$/).optional(),
    ipAddress: Joi.string().ip({ version: ['ipv4', 'ipv6'] }).optional(),
    macAddress: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).optional(),
    status: Joi.string().valid('active', 'inactive', 'maintenance', 'retired', 'missing', 'damaged').default('active'),
    conditionRating: Joi.number().integer().min(1).max(5).optional(),
    locationBuilding: Joi.string().max(100).optional(),
    locationFloor: Joi.string().max(50).optional(),
    locationRoom: Joi.string().max(50).optional(),
    locationRack: Joi.string().max(50).optional(),
    purchaseDate: Joi.date().max('now').optional(),
    warrantyExpiry: Joi.date().greater('now').optional(),
    specifications: Joi.object().optional()
  });
  
  // File upload validation
  static readonly fileUploadSchema = Joi.object({
    visitReportId: Joi.string().uuid().optional(),
    hardwareId: Joi.string().uuid().optional(),
    recyclingId: Joi.string().uuid().optional(),
    category: Joi.string().max(100).optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    accessLevel: Joi.string().valid('internal', 'confidential', 'restricted').default('internal')
  }).xor('visitReportId', 'hardwareId', 'recyclingId'); // At least one reference required
  
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return input;
    
    // Remove potential XSS vectors
    let sanitized = DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
    
    // Remove script-related content
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+=/gi, '');
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    return sanitized;
  }
  
  static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeInput(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  }
}

// Validation middleware
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Sanitize input data
    req.body = ValidationService.sanitizeObject(req.body);
    req.query = ValidationService.sanitizeObject(req.query);
    req.params = ValidationService.sanitizeObject(req.params);
    
    // Validate against schema
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input validation failed',
          details: validationErrors,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    }
    
    // Replace body with validated/sanitized data
    req.body = value;
    next();
  };
};
```

## File Upload Security

### Secure File Upload Implementation
```typescript
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { createHash } from 'crypto';

class FileUploadService {
  private readonly UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  private readonly ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.docx'];
  
  getMulterConfig(): multer.Options {
    return {
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          // Organize by date and type
          const date = new Date().toISOString().split('T')[0];
          const fileType = this.getFileType(file.mimetype);
          const uploadDir = path.join(this.UPLOAD_PATH, date, fileType);
          
          // Ensure directory exists
          this.ensureDirectoryExists(uploadDir);
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          // Generate secure filename
          const ext = path.extname(file.originalname).toLowerCase();
          const filename = crypto.randomBytes(16).toString('hex') + ext;
          cb(null, filename);
        }
      }),
      fileFilter: (req, file, cb) => {
        // Validate file type
        if (!this.isValidFileType(file)) {
          return cb(new Error('Invalid file type'));
        }
        
        // Check file extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
          return cb(new Error('Invalid file extension'));
        }
        
        cb(null, true);
      },
      limits: {
        fileSize: this.MAX_FILE_SIZE,
        files: 10 // Maximum 10 files per upload
      }
    };
  }
  
  async processUploadedFile(
    file: Express.Multer.File,
    userId: string,
    metadata: any
  ): Promise<FileAttachment> {
    try {
      // Calculate file hash for integrity
      const fileBuffer = await fs.readFile(file.path);
      const fileHash = createHash('sha256').update(fileBuffer).digest('hex');
      
      // Scan for viruses (placeholder - integrate with actual AV solution)
      const virusScanResult = await this.scanFileForViruses(file.path);
      
      if (!virusScanResult.clean) {
        await fs.unlink(file.path); // Delete infected file
        throw new Error('File failed virus scan');
      }
      
      // Process image files
      let imageMetadata = {};
      if (file.mimetype.startsWith('image/')) {
        imageMetadata = await this.processImageFile(file.path);
      }
      
      // Create database record
      const fileRecord = await this.db.query(`
        INSERT INTO files.file_attachments (
          original_filename, stored_filename, file_path, file_size_bytes,
          mime_type, file_hash, file_type, category, access_level,
          uploaded_by, image_width, image_height, image_format,
          virus_scanned, virus_scan_result, is_processed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `, [
        file.originalname,
        file.filename,
        file.path,
        file.size,
        file.mimetype,
        fileHash,
        this.getFileType(file.mimetype),
        metadata.category || 'general',
        metadata.accessLevel || 'internal',
        userId,
        imageMetadata.width || null,
        imageMetadata.height || null,
        imageMetadata.format || null,
        true,
        'clean',
        true
      ]);
      
      // Generate thumbnail for images
      if (file.mimetype.startsWith('image/')) {
        await this.generateThumbnail(file.path, fileRecord.rows[0].id);
      }
      
      // Log file upload
      await this.logSecurityEvent('FILE_UPLOAD', 'File uploaded successfully', {
        userId,
        fileId: fileRecord.rows[0].id,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      });
      
      return fileRecord.rows[0];
      
    } catch (error) {
      // Clean up file on error
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up file:', unlinkError);
      }
      
      throw error;
    }
  }
  
  private async processImageFile(filePath: string): Promise<any> {
    try {
      const metadata = await sharp(filePath).metadata();
      
      // Security check: validate image is actually an image
      if (!metadata.format || !metadata.width || !metadata.height) {
        throw new Error('Invalid image file');
      }
      
      // Check for embedded scripts or suspicious content
      const buffer = await fs.readFile(filePath);
      const content = buffer.toString('ascii');
      
      if (content.includes('<script') || content.includes('javascript:')) {
        throw new Error('Suspicious content detected in image');
      }
      
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        hasAlpha: metadata.hasAlpha,
        channels: metadata.channels
      };
      
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error('Failed to process image file');
    }
  }
  
  private async scanFileForViruses(filePath: string): Promise<{clean: boolean, result: string}> {
    // Placeholder for virus scanning integration
    // In production, integrate with ClamAV, Windows Defender, or cloud AV service
    
    try {
      // Basic file content check for known malicious patterns
      const buffer = await fs.readFile(filePath);
      const content = buffer.toString('ascii', 0, Math.min(buffer.length, 1024));
      
      const maliciousPatterns = [
        'eval(',
        'exec(',
        'system(',
        'shell_exec(',
        'passthru(',
        '<script',
        'javascript:',
        'vbscript:',
        'onload=',
        'onerror='
      ];
      
      for (const pattern of maliciousPatterns) {
        if (content.toLowerCase().includes(pattern.toLowerCase())) {
          return { clean: false, result: `Suspicious pattern detected: ${pattern}` };
        }
      }
      
      return { clean: true, result: 'clean' };
      
    } catch (error) {
      console.error('Virus scan error:', error);
      return { clean: false, result: 'scan_error' };
    }
  }
}
```

## Rate Limiting and DDoS Protection

### Advanced Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

class RateLimitService {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
  }
  
  // General API rate limiting
  getGeneralRateLimit() {
    return rateLimit({
      store: new RedisStore({
        sendCommand: (...args: string[]) => this.redis.call(...args),
      }),
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // requests per window per IP
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          timestamp: new Date().toISOString()
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Skip rate limiting for successful requests in some cases
      skip: (req, res) => {
        // Skip for health checks
        return req.path === '/api/v1/health';
      },
      // Custom key generator for more sophisticated limiting
      keyGenerator: (req) => {
        // Combine IP with user ID if authenticated
        const baseKey = req.ip;
        const userKey = req.user?.userId;
        return userKey ? `${baseKey}:${userKey}` : baseKey;
      }
    });
  }
  
  // Strict rate limiting for authentication endpoints
  getAuthRateLimit() {
    return rateLimit({
      store: new RedisStore({
        sendCommand: (...args: string[]) => this.redis.call(...args),
      }),
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 login attempts per window
      skipSuccessfulRequests: true,
      message: {
        success: false,
        error: {
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          message: 'Too many authentication attempts, please try again later',
          timestamp: new Date().toISOString()
        }
      },
      keyGenerator: (req) => {
        // Rate limit by IP and email combination
        const email = req.body?.email || 'unknown';
        return `auth:${req.ip}:${email}`;
      },
      onLimitReached: async (req, res, options) => {
        // Log potential brute force attack
        await this.logSecurityEvent('RATE_LIMIT_EXCEEDED', 'Authentication rate limit exceeded', {
          ipAddress: req.ip,
          email: req.body?.email,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
      }
    });
  }
  
  // File upload rate limiting
  getUploadRateLimit() {
    return rateLimit({
      store: new RedisStore({
        sendCommand: (...args: string[]) => this.redis.call(...args),
      }),
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 50, // 50 uploads per hour
      message: {
        success: false,
        error: {
          code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
          message: 'Upload limit exceeded, please try again later',
          timestamp: new Date().toISOString()
        }
      }
    });
  }
  
  // Advanced DDoS protection
  getDDoSProtection() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const clientIp = req.ip;
      const currentTime = Date.now();
      const windowSize = 60 * 1000; // 1 minute
      const maxRequests = 100; // requests per minute
      const suspiciousThreshold = 200; // requests per minute
      
      try {
        // Track request patterns
        const key = `ddos:${clientIp}`;
        const requestCount = await this.redis.incr(key);
        
        if (requestCount === 1) {
          await this.redis.expire(key, 60); // 1 minute expiry
        }
        
        // Check for suspicious activity
        if (requestCount > suspiciousThreshold) {
          // Temporarily block IP
          await this.redis.setex(`blocked:${clientIp}`, 300, 'ddos'); // 5 minute block
          
          await this.logSecurityEvent('DDOS_ATTACK', 'Potential DDoS attack detected', {
            ipAddress: clientIp,
            requestCount,
            userAgent: req.get('User-Agent'),
            blocked: true
          });
          
          return res.status(429).json({
            success: false,
            error: {
              code: 'DDOS_PROTECTION',
              message: 'Request blocked due to suspicious activity',
              timestamp: new Date().toISOString()
            }
          });
        }
        
        // Check if IP is blocked
        const isBlocked = await this.redis.get(`blocked:${clientIp}`);
        if (isBlocked) {
          return res.status(429).json({
            success: false,
            error: {
              code: 'IP_BLOCKED',
              message: 'IP address temporarily blocked',
              timestamp: new Date().toISOString()
            }
          });
        }
        
        // Standard rate limiting
        if (requestCount > maxRequests) {
          return res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded',
              timestamp: new Date().toISOString()
            }
          });
        }
        
        next();
        
      } catch (error) {
        console.error('DDoS protection error:', error);
        next(); // Don't block requests on Redis errors
      }
    };
  }
}
```

## Security Headers and Middleware

### Comprehensive Security Headers
```typescript
import helmet from 'helmet';

export const securityMiddleware = [
  // Helmet for basic security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // TODO: Replace with nonces
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),
  
  // Custom security headers
  (req: Request, res: Response, next: NextFunction) => {
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=self, microphone=none, geolocation=none');
    
    // Remove server information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    // Add request ID for tracking
    if (!req.headers['x-request-id']) {
      req.headers['x-request-id'] = crypto.randomUUID();
    }
    res.setHeader('X-Request-ID', req.headers['x-request-id']);
    
    next();
  }
];
```

## Audit Logging and Monitoring

### Comprehensive Audit System
```typescript
interface AuditLogEntry {
  eventId: string;
  eventType: string;
  eventCategory: string;
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  tableName?: string;
  recordId?: string;
  operation?: string;
  oldValues?: any;
  newValues?: any;
  changedFields?: string[];
  description: string;
  metadata?: any;
  timestamp: Date;
}

class AuditLogger {
  async log(entry: Partial<AuditLogEntry>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      eventId: entry.eventId || crypto.randomUUID(),
      eventType: entry.eventType || 'GENERAL',
      eventCategory: entry.eventCategory || 'APPLICATION',
      severity: entry.severity || 'info',
      description: entry.description || 'No description provided',
      timestamp: new Date(),
      ...entry
    };
    
    try {
      // Store in database
      await this.db.query(`
        INSERT INTO audit.audit_log (
          event_id, event_type, event_category, severity_level,
          user_id, session_id, ip_address, user_agent,
          table_name, record_id, operation,
          old_values, new_values, changed_fields,
          description, metadata, event_timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [
        auditEntry.eventId,
        auditEntry.eventType,
        auditEntry.eventCategory,
        auditEntry.severity,
        auditEntry.userId,
        auditEntry.sessionId,
        auditEntry.ipAddress,
        auditEntry.userAgent,
        auditEntry.tableName,
        auditEntry.recordId,
        auditEntry.operation,
        auditEntry.oldValues ? JSON.stringify(auditEntry.oldValues) : null,
        auditEntry.newValues ? JSON.stringify(auditEntry.newValues) : null,
        auditEntry.changedFields,
        auditEntry.description,
        auditEntry.metadata ? JSON.stringify(auditEntry.metadata) : null,
        auditEntry.timestamp
      ]);
      
      // Send to external logging service if critical
      if (auditEntry.severity === 'critical' || auditEntry.severity === 'error') {
        await this.sendToExternalLogging(auditEntry);
      }
      
      // Trigger alerts for security events
      if (auditEntry.eventCategory === 'SECURITY') {
        await this.triggerSecurityAlert(auditEntry);
      }
      
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      // Don't throw error to avoid disrupting application flow
    }
  }
  
  // Middleware to automatically log database changes
  createAuditMiddleware() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      
      res.send = function(body) {
        // Log the request if it modifies data
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          const auditEntry = {
            eventType: 'API_REQUEST',
            eventCategory: 'APPLICATION',
            severity: 'info' as const,
            userId: req.user?.userId,
            sessionId: req.user?.sessionId,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            operation: req.method,
            description: `${req.method} ${req.originalUrl}`,
            metadata: {
              requestId: req.headers['x-request-id'],
              statusCode: res.statusCode,
              requestBody: req.body,
              responseTime: Date.now() - req.startTime
            }
          };
          
          // Don't await to avoid blocking response
          auditLogger.log(auditEntry).catch(error => {
            console.error('Audit logging error:', error);
          });
        }
        
        return originalSend.call(this, body);
      };
      
      req.startTime = Date.now();
      next();
    };
  }
}
```

This comprehensive security implementation addresses all the critical security issues identified in the security analysis and provides a robust foundation for the RSS Visit Report system with enterprise-grade security controls.