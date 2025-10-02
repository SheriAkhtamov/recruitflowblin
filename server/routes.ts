import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import express from "express";
import session from "express-session";
import multer from "multer";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { authService } from "./services/auth";
import { openAIService } from "./services/openai";
import { emailService } from "./services/email";
import { 
  insertUserSchema, insertUserSchemaForAPI, insertVacancySchema, insertCandidateSchema, 
  insertInterviewStageSchema, insertInterviewSchema, insertMessageSchema, insertDocumentationAttachmentSchema 
} from "@shared/schema";

// Configure multer for file uploads
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure uploads directory exists
    if (!fs.existsSync('uploads/')) {
      fs.mkdirSync('uploads/', { recursive: true });
    }
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename while preserving extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

// Configure multer for photo uploads specifically
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure photos directory exists
    if (!fs.existsSync('uploads/photos/')) {
      fs.mkdirSync('uploads/photos/', { recursive: true });
    }
    cb(null, 'uploads/photos/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename for photos
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `photo-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File upload attempt:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    const allowedTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'text/plain'
    ];
    
    const isAllowed = allowedTypes.includes(file.mimetype);
    console.log(`File ${file.originalname} (${file.mimetype}) - ${isAllowed ? 'ALLOWED' : 'REJECTED'}`);
    
    cb(null, isAllowed);
  },
});

// Multer configuration specifically for photos
const uploadPhoto = multer({
  storage: photoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for photos
  },
  fileFilter: (req, file, cb) => {
    console.log('Photo upload attempt:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    const allowedPhotoTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png'
    ];
    
    const isAllowed = allowedPhotoTypes.includes(file.mimetype);
    console.log(`Photo ${file.originalname} (${file.mimetype}) - ${isAllowed ? 'ALLOWED' : 'REJECTED'}`);
    
    cb(null, isAllowed);
  },
});

// Custom multer configuration for documentation candidates (photos + documents)
const documentationUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Use different folders based on file type
      if (file.fieldname === 'photo') {
        if (!fs.existsSync('uploads/photos/')) {
          fs.mkdirSync('uploads/photos/', { recursive: true });
        }
        cb(null, 'uploads/photos/');
      } else {
        if (!fs.existsSync('uploads/')) {
          fs.mkdirSync('uploads/', { recursive: true });
        }
        cb(null, 'uploads/');
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      
      if (file.fieldname === 'photo') {
        cb(null, `photo-${uniqueSuffix}${ext}`);
      } else {
        const baseName = path.basename(file.originalname, ext);
        cb(null, `${baseName}-${uniqueSuffix}${ext}`);
      }
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('Documentation file upload attempt:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    if (file.fieldname === 'photo') {
      const allowedPhotoTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const isAllowed = allowedPhotoTypes.includes(file.mimetype);
      console.log(`Photo ${file.originalname} (${file.mimetype}) - ${isAllowed ? 'ALLOWED' : 'REJECTED'}`);
      cb(null, isAllowed);
    } else {
      const allowedDocTypes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg', 'image/jpg', 'image/png',
        'text/plain'
      ];
      const isAllowed = allowedDocTypes.includes(file.mimetype);
      console.log(`Document ${file.originalname} (${file.mimetype}) - ${isAllowed ? 'ALLOWED' : 'REJECTED'}`);
      cb(null, isAllowed);
    }
  },
});

// Import session store for memory storage
import MemoryStore from 'memorystore';
const MemoryStoreSession = MemoryStore(session);

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'recruit-pro-secret-key',
  resave: false, // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something stored
  name: 'connect.sid', // Explicit session name
  store: new MemoryStoreSession({
    checkPeriod: 86400000, // prune expired entries every 24h
  }),
  cookie: {
    secure: false, // Disable secure cookies for development
    httpOnly: false, // Allow client-side access for debugging
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' as const,
    domain: undefined, // Let browser decide
    path: '/', // Explicit path
  },
};

// WebSocket clients management
const wsClients = new Set<WebSocket>();

function broadcastToClients(data: any) {
  const message = JSON.stringify(data);
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure CORS for ngrok and development
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
    
    // Allow ngrok domains (they contain .ngrok.io)
    if (origin && (allowedOrigins.includes(origin) || origin.includes('.ngrok.io'))) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-bot-token');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  app.use(session(sessionConfig));

  // Development auth bypass when no database configured
  if (!process.env.DATABASE_URL) {
    app.use((req: any, _res: any, next: any) => {
      if (!req.session.user) {
        req.session.user = {
          id: 1,
          email: 'admin@synergyhire.com',
          fullName: 'SynergyHire Admin',
          role: 'admin',
        };
      }
      next();
    });
  }

  // Debug middleware to log session info
  app.use((req: any, res: any, next: any) => {
    if (req.path.startsWith('/api/')) {
      console.log(`[Session Debug] ${req.method} ${req.path}`);
      console.log(`  - Session ID: ${req.sessionID}`);
      console.log(`  - User: ${req.session?.user?.email || 'none'}`);
      console.log(`  - Cookie: ${req.headers.cookie || 'none'}`);
      console.log(`  - User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'none'}`);
      console.log(`  - Origin: ${req.headers.origin || 'none'}`);
      console.log(`  - Referer: ${req.headers.referer || 'none'}`);
      console.log(`  - Session exists: ${!!req.session}`);
      console.log(`  - Session user exists: ${!!req.session?.user}`);
      
      // Force set cookie debugging headers for browsers
      if (req.headers['user-agent']?.includes('Mozilla')) {
        res.setHeader('Set-Cookie-Debug', 'connect.sid=' + req.sessionID + '; Path=/; HttpOnly=false; SameSite=Lax');
      }
    }
    next();
  });

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    console.log(`[Auth Check] Checking authentication for ${req.method} ${req.path}`);
    console.log(`  - Session ID: ${req.sessionID}`);
    console.log(`  - Session user: ${req.session?.user?.email || 'none'}`);
    console.log(`  - Session object: ${JSON.stringify(req.session || {}, null, 2)}`);
    
    if (!req.session?.user) {
      console.log(`[Auth Check] FAILED - No user in session`);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.log(`[Auth Check] PASSED - User ${req.session.user.email} authenticated`);
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  const requireAnalyticsAccess = (req: any, res: any, next: any) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const user = req.session.user;
    // Admin users or users with hasReportAccess can access analytics
    if (user.role === 'admin' || Boolean(user.hasReportAccess)) {
      next();
    } else {
      return res.status(403).json({ error: 'Analytics access not allowed. Contact administrator to enable report access.' });
    }
  };

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    console.log(`[LOGIN] Starting login process`);
    console.log(`[LOGIN] Request body:`, req.body);
    console.log(`[LOGIN] Session ID before login:`, req.sessionID);
    console.log(`[LOGIN] Session before login:`, req.session);
    
    try {
      const { email, password } = req.body;
      console.log(`[LOGIN] Attempting authentication for email: ${email}`);
      
      const user = await authService.authenticateUser(email, password);
      console.log(`[LOGIN] Authentication result:`, user ? 'SUCCESS' : 'FAILED');
      
      if (!user) {
        console.log(`[LOGIN] Invalid credentials for: ${email}`);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Set user in session
      const sanitizedUser = authService.sanitizeUser(user) as any;
      console.log(`[LOGIN] Setting user in session:`, sanitizedUser);
      req.session.user = sanitizedUser;
      
      console.log(`[LOGIN] Session after setting user:`, req.session);
      console.log(`[LOGIN] Session ID after setting user:`, req.sessionID);
      
      // Force session save with explicit callback
      req.session.save((err) => {
        if (err) {
          console.error('[LOGIN] Session save error:', err);
          return res.status(500).json({ error: 'Session save failed' });
        }
        console.log(`[LOGIN] Session saved successfully for user: ${user.email}`);
        console.log(`[LOGIN] Final session ID: ${req.sessionID}`);
        console.log(`[LOGIN] Final session user: ${req.session.user?.email}`);
        
        res.json({ user: req.session.user });
      });
    } catch (error) {
      console.error('[LOGIN] Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get('/api/auth/me', (req, res) => {
    console.log(`[AUTH/ME] Checking current user`);
    console.log(`[AUTH/ME] Session ID: ${req.sessionID}`);
    console.log(`[AUTH/ME] Session exists: ${!!req.session}`);
    console.log(`[AUTH/ME] Session user exists: ${!!req.session?.user}`);
    console.log(`[AUTH/ME] Session user: ${req.session?.user?.email || 'none'}`);
    console.log(`[AUTH/ME] Full session: ${JSON.stringify(req.session || {}, null, 2)}`);
    
    if (req.session?.user) {
      console.log(`[AUTH/ME] User authenticated: ${req.session.user.email}`);
      res.json({ user: req.session.user });
    } else {
      console.log(`[AUTH/ME] User NOT authenticated`);
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  // User management routes
  app.get('/api/users', requireAuth, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users.map(user => authService.sanitizeUser(user)));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', requireAdmin, async (req, res) => {
    console.log(`[CREATE USER] Starting user creation process`);
    console.log(`[CREATE USER] Request body:`, req.body);
    console.log(`[CREATE USER] Session user:`, req.session?.user);
    
    try {
      console.log(`[CREATE USER] Parsing user data with schema`);
      const userData = insertUserSchemaForAPI.parse(req.body);
      console.log(`[CREATE USER] Parsed user data:`, userData);
      
      console.log(`[CREATE USER] Generating temporary password`);
      const temporaryPassword = await authService.generateRandomPassword();
      console.log(`[CREATE USER] Temporary password generated: ${temporaryPassword}`);
      
      // Convert dateOfBirth string to Date object if provided
      const processedUserData = {
        ...userData,
        password: temporaryPassword,
        dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : undefined,
      };
      console.log(`[CREATE USER] Processed user data:`, processedUserData);
      
      console.log(`[CREATE USER] Creating user in database`);
      const user = await authService.createUser(processedUserData);
      console.log(`[CREATE USER] User created successfully:`, user);

      // No email sending - credentials will be shown in admin panel
      console.log(`[CREATE USER] Skipping email send - user can view credentials in admin panel`);
      console.log(`[CREATE USER] User credentials - Email: ${user.email}, Password: ${temporaryPassword}`);
      
      console.log(`[CREATE USER] Creating audit log`);
      // Create audit log
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'CREATE_USER',
        entityType: 'user',
        entityId: user.id,
        newValues: authService.sanitizeUser(user),
      });
      console.log(`[CREATE USER] Audit log created`);

      const responseUser = authService.sanitizeUser(user);
      console.log(`[CREATE USER] Sending response:`, responseUser);
      res.json(responseUser);
    } catch (error) {
      console.error('[CREATE USER] Error creating user:', error);
      
      // Check if it's a duplicate email error
      if ((error as any).code === '23505' && (error as any).constraint === 'users_email_unique') {
        console.log(`[CREATE USER] Duplicate email error detected`);
        return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
      }
      
      console.log(`[CREATE USER] General error, sending 500 response`);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // Get user with password (admin only)
  app.get('/api/users/:id/credentials', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      
      const user = await storage.getUserWithPassword(id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        email: user.email,
        plainPassword: user.plainPassword || 'Password not available',
        fullName: user.fullName,
        position: user.position,
        role: user.role
      });
    } catch (error) {
      console.error('Error fetching user credentials:', error);
      res.status(500).json({ error: 'Failed to fetch credentials' });
    }
  });

  app.put('/api/users/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = req.session?.user;
      
      // Users can only update their own profile, unless they're admin
      if (currentUser?.id !== id && currentUser?.role !== 'admin') {
        return res.status(403).json({ error: 'Cannot update other users profile' });
      }
      
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Prepare update data
      const updateData = {
        fullName: req.body.fullName,
        email: req.body.email,
        position: req.body.position,
        phone: req.body.phone || null,
        location: req.body.location || null,
        role: req.body.role,
      };
      
      // Only admins can change roles and hasReportAccess
      if (currentUser?.role !== 'admin') {
        updateData.role = existingUser.role;
      } else {
        // Admin can update hasReportAccess for other users
        if (req.body.hasReportAccess !== undefined) {
          (updateData as any).hasReportAccess = Boolean(req.body.hasReportAccess);
        }
      }
      
      const updatedUser = await storage.updateUser(id, updateData);
      
      // Update session if user updated their own profile
      if (currentUser?.id === id) {
        req.session.user = { ...req.session.user, ...(authService.sanitizeUser(updatedUser) as any) };
        req.session.save();
      }
      
      res.json(authService.sanitizeUser(updatedUser));
    } catch (error) {
      console.error('Error updating user:', error);
      if ((error as any).code === '23505' && (error as any).constraint === 'users_email_unique') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  app.delete('/api/users/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if user exists
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Prevent deletion of the main admin account
      if (user.email === 'admin@synergyhire.com' || user.email === 'admin@recruitpro.com') {
        return res.status(403).json({ error: 'Cannot delete the main administrator account' });
      }
      
      // Only admins can delete other users
      if (req.session!.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can delete users' });
      }
      
      await storage.deleteUser(id);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Vacancy routes
  app.get('/api/vacancies', requireAuth, async (req, res) => {
    try {
      const vacancies = await storage.getVacancies();
      res.json(vacancies);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch vacancies' });
    }
  });

  app.get('/api/vacancies/active', requireAuth, async (req, res) => {
    try {
      const vacancies = await storage.getVacancies();
      // Include only active vacancies for candidate assignment
      const activeVacancies = vacancies.filter(v => v.status === 'active');
      res.json(activeVacancies);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch active vacancies' });
    }
  });

  app.post('/api/vacancies', requireAuth, async (req, res) => {
    try {
      console.log('Creating vacancy with data:', req.body);
      
      const vacancyData = insertVacancySchema.parse({
        ...req.body,
        createdBy: req.session!.user!.id,
      });
      
      const vacancy = await storage.createVacancy(vacancyData);
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'CREATE_VACANCY',
        entityType: 'vacancy',
        entityId: vacancy.id,
        newValues: vacancy,
      });

      broadcastToClients({
        type: 'VACANCY_CREATED',
        data: vacancy,
      });

      res.json(vacancy);
    } catch (error: any) {
      console.error('Vacancy creation error:', error);
      if (error.errors) {
        console.error('Validation errors:', error.errors);
        res.status(400).json({ error: 'Validation failed', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create vacancy' });
      }
    }
  });

  app.put('/api/vacancies/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const oldVacancy = await storage.getVacancy(id);
      const vacancy = await storage.updateVacancy(id, updates);
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'UPDATE_VACANCY',
        entityType: 'vacancy',
        entityId: id,
        oldValues: oldVacancy,
        newValues: vacancy,
      });

      broadcastToClients({
        type: 'VACANCY_UPDATED',
        data: vacancy,
      });

      res.json(vacancy);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update vacancy' });
    }
  });

  app.delete('/api/vacancies/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const vacancy = await storage.getVacancy(id);
      if (!vacancy) {
        return res.status(404).json({ error: 'Vacancy not found' });
      }

      await storage.deleteVacancy(id);
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'DELETE_VACANCY',
        entityType: 'vacancy',
        entityId: id,
        oldValues: [vacancy],
      });

      broadcastToClients({
        type: 'VACANCY_DELETED',
        data: { id },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting vacancy:', error);
      res.status(500).json({ error: 'Failed to delete vacancy' });
    }
  });

  // Candidate routes
  app.get('/api/candidates', requireAuth, async (req, res) => {
    try {
      const userRole = req.session!.user!.role;
      const userId = req.session!.user!.id;
      
      let candidates;
      
      // Admin and HR managers can see all candidates
      if (userRole === 'admin' || userRole === 'hr_manager') {
        candidates = await storage.getCandidates();
      } else {
        // Regular employees only see candidates assigned to them for interviews
        candidates = await storage.getCandidatesByInterviewer(userId);
      }
      
      res.json(candidates);
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
      res.status(500).json({ error: 'Failed to fetch candidates' });
    }
  });

  // Get candidates assigned to specific interviewer (for employees)
  app.get('/api/candidates/interviewer/:id', requireAuth, async (req, res) => {
    try {
      const interviewerId = parseInt(req.params.id);
      const userId = req.session!.user!.id;
      
      // Security check: employees can only see their own assigned candidates
      if (req.session!.user!.role === 'employee' && interviewerId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const candidates = await storage.getCandidatesByInterviewer(interviewerId);
      res.json(candidates);
    } catch (error) {
      console.error('Failed to fetch interviewer candidates:', error);
      res.status(500).json({ error: 'Failed to fetch interviewer candidates' });
    }
  });

  app.get('/api/candidates/archived', requireAuth, async (req, res) => {
    console.log('Archived candidates route hit');
    try {
      const candidates = await storage.getArchivedCandidatesWithAttachments();
      console.log('Retrieved archived candidates with attachments:', candidates.length);
      res.json(candidates);
    } catch (error) {
      console.error('Archive candidates error:', error);
      res.status(500).json({ error: 'Failed to fetch archived candidates' });
    }
  });

  app.get('/api/candidates/:id', requireAuth, async (req, res) => {
    console.log('Single candidate route hit with ID:', req.params.id);
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid candidate ID' });
      }
      
      const candidate = await storage.getCandidate(id);
      
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      const stages = await storage.getInterviewStagesByCandidate(id);
      const documentationAttachments = await storage.getDocumentationAttachments(id);
      
      res.json({ ...candidate, stages, documentationAttachments });
    } catch (error) {
      console.error('Single candidate error:', error);
      res.status(500).json({ error: 'Failed to fetch candidate' });
    }
  });

  // Debug middleware to log multipart form data
  const debugMultipart = (req: any, res: any, next: any) => {
    console.log('=== MULTIPART DEBUG ===');
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Raw body keys:', Object.keys(req.body || {}));
    console.log('Body:', req.body);
    console.log('Files:', req.file);
    console.log('======================');
    next();
  };

  app.post('/api/candidates', requireAuth, upload.array('files', 5), debugMultipart, async (req, res) => {
    try {
      console.log('Received candidate data:', req.body);
      console.log('Request files:', req.files);
      
      // Ensure all required fields are present
      if (!req.body.fullName) {
        console.error('Missing required fields:', { fullName: req.body.fullName });
        return res.status(400).json({ 
          error: 'Missing required fields',
          details: { fullName: !!req.body.fullName }
        });
      }
      
      // Convert and validate data
      const processedData = {
        fullName: req.body.fullName,
        email: req.body.email || null,
        phone: req.body.phone || '',
        city: req.body.city || '',
        vacancyId: req.body.vacancyId ? parseInt(req.body.vacancyId) : null,
        source: req.body.source || '',
        currentStageIndex: 0,
        interviewStageChain: req.body.interviewStageChain ? JSON.parse(req.body.interviewStageChain) : null,
        createdBy: req.session!.user!.id,
      };
      
      console.log('Processed candidate data with stage chain:', processedData);
      
      if (!processedData.vacancyId) {
        return res.status(400).json({ error: 'Vacancy ID is required' });
      }
      
      if (!processedData.interviewStageChain || processedData.interviewStageChain.length === 0) {
        return res.status(400).json({ error: 'Interview stage chain is required' });
      }
      
      const candidateData = insertCandidateSchema.parse(processedData);
      
      let resumeUrl = '';
      let resumeFilename = '';
      let parsedResumeData = null;

      // Handle file uploads (take first file as resume if any)
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const files = req.files as Express.Multer.File[];
        const firstFile = files[0];
        resumeUrl = `/api/files/${firstFile.filename}`;
        resumeFilename = firstFile.originalname;

        // Parse resume with OpenAI
        try {
          const { extractTextFromFile, parseResumeWithAI } = await import('./services/resumeParser');
          const resumeText = await extractTextFromFile(firstFile.path);
          parsedResumeData = await parseResumeWithAI(resumeText);
        } catch (parseError) {
          console.error('Resume parsing failed:', parseError);
        }
      }

      const candidate = await storage.createCandidate({
        ...candidateData,
        resumeUrl,
        resumeFilename,
        parsedResumeData,
      });

      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'CREATE_CANDIDATE',
        entityType: 'candidate',
        entityId: candidate.id,
        newValues: [candidate],
      });

      broadcastToClients({
        type: 'CANDIDATE_CREATED',
        data: candidate,
      });

      res.json(candidate);
    } catch (error) {
      console.error('Error creating candidate:', error);
      res.status(500).json({ error: 'Failed to create candidate' });
    }
  });

  app.put('/api/candidates/:id', requireAuth, upload.array('files', 5), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log('=== UPDATE CANDIDATE DEBUG ===');
      console.log('Candidate ID:', id);
      console.log('Body:', req.body);
      console.log('Files:', req.files);
      console.log('==============================');

      const oldCandidate = await storage.getCandidate(id);
      if (!oldCandidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      // Process form data - only include fields that are provided
      const updates: any = {};
      
      if (req.body.fullName) updates.fullName = req.body.fullName;
      if (req.body.email) updates.email = req.body.email;
      if (req.body.phone) updates.phone = req.body.phone;
      if (req.body.city) updates.city = req.body.city;
      if (req.body.source) updates.source = req.body.source;
      if (req.body.notes) updates.notes = req.body.notes;
      
      // Handle status updates (like rejection)
      if (req.body.status) updates.status = req.body.status;
      if (req.body.rejectionReason) updates.rejectionReason = req.body.rejectionReason;
      if (req.body.rejectionStage !== undefined) updates.rejectionStage = parseInt(req.body.rejectionStage);

      // Handle vacancy ID
      if (req.body.vacancyId && req.body.vacancyId !== '') {
        updates.vacancyId = parseInt(req.body.vacancyId);
      }

      // Handle file uploads if any
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const files = req.files as Express.Multer.File[];
        const firstFile = files[0];
        updates.resumeUrl = `/api/files/${firstFile.filename}`;
      }

      // Handle interview stage chain updates
      if (req.body.interviewStageChain) {
        const newStageChain = JSON.parse(req.body.interviewStageChain);
        console.log('Updating interview stage chain:', newStageChain);
        
        // Delete existing stages
        await storage.deleteInterviewStagesByCandidate(id);
        
        // Create new stages
        for (let i = 0; i < newStageChain.length; i++) {
          const stage = newStageChain[i];
          await storage.createInterviewStage({
            candidateId: id,
            stageIndex: i,
            stageName: stage.stageName,
            interviewerId: stage.interviewerId,
            status: i === (oldCandidate.currentStageIndex || 0) ? 'pending' : 
                    i < (oldCandidate.currentStageIndex || 0) ? 'passed' : 'waiting',
          });
        }
        
        updates.interviewStageChain = newStageChain;
      }

      const candidate = await storage.updateCandidate(id, updates);
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'UPDATE_CANDIDATE',
        entityType: 'candidate',
        entityId: id,
        oldValues: [oldCandidate],
        newValues: [candidate],
      });

      broadcastToClients({
        type: 'CANDIDATE_UPDATED',
        data: candidate,
      });

      res.json(candidate);
    } catch (error) {
      console.error('Error updating candidate:', error);
      res.status(500).json({ error: 'Failed to update candidate' });
    }
  });

  app.delete('/api/candidates/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = req.session!.user!;
      
      // Only allow admin users to delete candidates
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can delete candidates' });
      }
      
      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      await storage.deleteCandidate(id);
      
      await storage.createAuditLog({
        userId: currentUser.id,
        action: 'DELETE_CANDIDATE',
        entityType: 'candidate',
        entityId: id,
        oldValues: [candidate],
      });

      broadcastToClients({
        type: 'CANDIDATE_DELETED',
        data: { 
          id,
          deletedBy: currentUser.fullName,
          candidateName: candidate.fullName,
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting candidate:', error);
      res.status(500).json({ error: 'Failed to delete candidate' });
    }
  });

  // Upload photo for candidate
  app.post('/api/candidates/:id/photo', requireAuth, uploadPhoto.single('photo'), async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No photo file provided' });
      }

      const photoUrl = `/api/files/photos/${req.file.filename}`;
      
      // Update candidate with photo URL
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        photoUrl: photoUrl
      });
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'UPLOAD_CANDIDATE_PHOTO',
        entityType: 'candidate',
        entityId: candidateId,
        oldValues: [candidate],
        newValues: [updatedCandidate],
      });

      broadcastToClients({
        type: 'CANDIDATE_PHOTO_UPLOADED',
        data: { candidateId, photoUrl },
      });

      res.json({ success: true, photoUrl });
    } catch (error) {
      console.error('Error uploading candidate photo:', error);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  });

  // Delete photo for candidate
  app.delete('/api/candidates/:id/photo', requireAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      // Delete the file from filesystem if it exists
      if (candidate.photoUrl) {
        const filename = path.basename(candidate.photoUrl);
        const filePath = path.join('uploads/photos', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      // Update candidate to remove photo URL
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        photoUrl: null
      });
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'DELETE_CANDIDATE_PHOTO',
        entityType: 'candidate',
        entityId: candidateId,
        oldValues: [candidate],
        newValues: [updatedCandidate],
      });

      broadcastToClients({
        type: 'CANDIDATE_PHOTO_DELETED',
        data: { candidateId },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting candidate photo:', error);
      res.status(500).json({ error: 'Failed to delete photo' });
    }
  });

  // Dismiss candidate endpoint
  app.put('/api/candidates/:id/dismiss', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { dismissalReason, dismissalDate } = req.body;
      
      // Check if user is admin
      if (req.session!.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can dismiss candidates' });
      }
      
      // Check if candidate exists and is hired
      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      
      if (candidate.status !== 'hired') {
        return res.status(400).json({ error: 'Only hired candidates can be dismissed' });
      }
      
      // Dismiss the candidate
      const dismissedCandidate = await storage.dismissCandidate(id, dismissalReason, new Date(dismissalDate));
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'DISMISS_CANDIDATE',
        entityType: 'candidate',
        entityId: id,
        oldValues: [candidate],
        newValues: [dismissedCandidate],
      });

      broadcastToClients({
        type: 'CANDIDATE_DISMISSED',
        data: dismissedCandidate,
      });

      res.json(dismissedCandidate);
    } catch (error) {
      console.error('Error dismissing candidate:', error);
      res.status(500).json({ error: 'Failed to dismiss candidate' });
    }
  });

  // Test route to create sample documentation candidate (development only)
  app.post('/api/test/create-documentation-candidate', requireAuth, async (req, res) => {
    try {
      // First, ensure we have a vacancy
      let vacancies = await storage.getVacancies();
      let vacancy;
      
      if (vacancies.length === 0) {
        // Create a test vacancy
        const vacancyData = {
          title: 'Test Position',
          department: 'IT',
          description: 'Sample position for testing documentation workflow',
          requirements: 'Basic requirements',
          location: 'Remote',
          status: 'active',
          createdBy: req.session!.user!.id,
        };
        vacancy = await storage.createVacancy(vacancyData);
      } else {
        vacancy = vacancies[0];
      }
      
      // Create candidate directly with documentation status
      const candidateData = {
        fullName: 'Test Candidate For Documentation',
        email: 'test.candidate@example.com',
        phone: '+1234567890',
        city: 'Test City',
        vacancyId: vacancy.id,
        status: 'documentation',
        source: 'test_data',
        createdBy: req.session!.user!.id,
      };
      
      const candidate = await storage.createCandidate(candidateData);
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'CREATE_TEST_DOCUMENTATION_CANDIDATE',
        entityType: 'candidate',
        entityId: candidate.id,
        newValues: [candidate],
      });
      
      broadcastToClients({
        type: 'TEST_DOCUMENTATION_CANDIDATE_CREATED',
        data: candidate,
      });
      
      res.json({ success: true, candidate, vacancy });
    } catch (error) {
      console.error('Error creating test documentation candidate:', error);
      res.status(500).json({ error: 'Failed to create test documentation candidate' });
    }
  });

  // Documentation routes for candidates in documentation status
  app.get('/api/documentation/candidates', requireAuth, async (req, res) => {
    try {
      const candidates = await storage.getCandidatesByStatus('documentation');
      res.json(candidates);
    } catch (error) {
      console.error('Failed to fetch documentation candidates:', error);
      res.status(500).json({ error: 'Failed to fetch documentation candidates' });
    }
  });

  app.post('/api/documentation/candidates', requireAuth, documentationUpload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'documents', maxCount: 10 }
  ]), async (req, res) => {
    try {
      console.log('Creating manual documentation candidate:', req.body);
      console.log('Files:', req.files);
      
      // Validate required fields
      if (!req.body.fullName) {
        return res.status(400).json({ error: 'Full name is required' });
      }
      
      if (!req.body.vacancyId) {
        return res.status(400).json({ error: 'Vacancy is required' });
      }
      
      // Create candidate with documentation status
      const candidateData: any = {
        fullName: req.body.fullName,
        email: req.body.email || '',
        phone: req.body.phone || '',
        city: req.body.city || '',
        vacancyId: parseInt(req.body.vacancyId),
        status: 'documentation',
        source: 'manual_documentation',
        createdBy: req.session!.user!.id,
      };
      
      // Handle photo upload
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files && files.photo && files.photo[0]) {
        const photoFile = files.photo[0];
        candidateData.photoUrl = `/api/files/photos/${photoFile.filename}`;
        console.log('Photo uploaded for documentation candidate:', candidateData.photoUrl);
      }
      
      const candidate = await storage.createCandidate(candidateData);
      
      // Handle document uploads
      if (files && files.documents && files.documents.length > 0) {
        const documentFiles = files.documents;
        for (const file of documentFiles) {
          await storage.createDocumentationAttachment({
            candidateId: candidate.id,
            filename: file.filename,
            originalName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            uploadedBy: req.session!.user!.id,
          });
        }
      }
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'CREATE_DOCUMENTATION_CANDIDATE',
        entityType: 'candidate',
        entityId: candidate.id,
        newValues: [candidate],
      });
      
      broadcastToClients({
        type: 'DOCUMENTATION_CANDIDATE_CREATED',
        data: candidate,
      });
      
      res.json(candidate);
    } catch (error) {
      console.error('Error creating documentation candidate:', error);
      res.status(500).json({ error: 'Failed to create documentation candidate' });
    }
  });

  app.put('/api/documentation/candidates/:id/upload', requireAuth, upload.array('documents', 10), async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      
      if (candidate.status !== 'documentation') {
        return res.status(400).json({ error: 'Candidate is not in documentation status' });
      }
      
      const attachments = [];
      
      // Handle document uploads
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const files = req.files as Express.Multer.File[];
        for (const file of files) {
          const attachment = await storage.createDocumentationAttachment({
            candidateId: candidateId,
            filename: file.filename,
            originalName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            uploadedBy: req.session!.user!.id,
          });
          attachments.push(attachment);
        }
      }
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'UPLOAD_DOCUMENTATION',
        entityType: 'candidate',
        entityId: candidateId,
        newValues: attachments,
      });
      
      broadcastToClients({
        type: 'DOCUMENTATION_UPLOADED',
        data: { candidateId, attachments },
      });
      
      res.json({ success: true, attachments });
    } catch (error) {
      console.error('Error uploading documentation:', error);
      res.status(500).json({ error: 'Failed to upload documentation' });
    }
  });

  app.get('/api/documentation/candidates/:id/attachments', requireAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const attachments = await storage.getDocumentationAttachments(candidateId);
      res.json(attachments);
    } catch (error) {
      console.error('Error fetching documentation attachments:', error);
      res.status(500).json({ error: 'Failed to fetch documentation attachments' });
    }
  });

  app.delete('/api/documentation/attachments/:id', requireAuth, async (req, res) => {
    try {
      const attachmentId = parseInt(req.params.id);
      
      const attachment = await storage.getDocumentationAttachment(attachmentId);
      if (!attachment) {
        return res.status(404).json({ error: 'Attachment not found' });
      }
      
      // Delete the file from filesystem
      const filePath = path.join('uploads', attachment.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      await storage.deleteDocumentationAttachment(attachmentId);
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'DELETE_DOCUMENTATION_ATTACHMENT',
        entityType: 'documentation_attachment',
        entityId: attachmentId,
        oldValues: [attachment],
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting documentation attachment:', error);
      res.status(500).json({ error: 'Failed to delete attachment' });
    }
  });

  app.put('/api/documentation/candidates/:id/complete', requireAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      
      if (candidate.status !== 'documentation') {
        return res.status(400).json({ error: 'Candidate is not in documentation status' });
      }
      
      // Update candidate status to hired
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: 'hired'
      });
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'COMPLETE_DOCUMENTATION',
        entityType: 'candidate',
        entityId: candidateId,
        oldValues: [candidate],
        newValues: [updatedCandidate],
      });
      
      broadcastToClients({
        type: 'CANDIDATE_HIRED',
        data: updatedCandidate,
      });
      
      res.json(updatedCandidate);
    } catch (error) {
      console.error('Error completing documentation:', error);
      res.status(500).json({ error: 'Failed to complete documentation' });
    }
  });

  // Update candidate status to documentation when all interview stages are passed
  app.put('/api/candidates/:id/move-to-documentation', requireAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      
      if (candidate.status !== 'active') {
        return res.status(400).json({ error: 'Candidate is not in active status' });
      }
      
      // Verify all interview stages are completed successfully
      const stages = await storage.getInterviewStagesByCandidate(candidateId);
      const allPassed = stages.every(stage => stage.status === 'passed');
      
      if (!allPassed) {
        return res.status(400).json({ error: 'Not all interview stages have been passed' });
      }
      
      // Update candidate status to documentation
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        status: 'documentation'
      });
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'MOVE_TO_DOCUMENTATION',
        entityType: 'candidate',
        entityId: candidateId,
        oldValues: [candidate],
        newValues: [updatedCandidate],
      });
      
      broadcastToClients({
        type: 'CANDIDATE_MOVED_TO_DOCUMENTATION',
        data: updatedCandidate,
      });
      
      res.json(updatedCandidate);
    } catch (error) {
      console.error('Error moving candidate to documentation:', error);
      res.status(500).json({ error: 'Failed to move candidate to documentation' });
    }
  });

  // Interview stage routes
  app.post('/api/interview-stages', requireAuth, async (req, res) => {
    try {
      const stageData = insertInterviewStageSchema.parse(req.body);
      const stage = await storage.createInterviewStage(stageData);
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'CREATE_INTERVIEW_STAGE',
        entityType: 'interview_stage',
        entityId: stage.id,
        newValues: [stage],
      });

      res.json(stage);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create interview stage' });
    }
  });

  app.put('/api/interview-stages/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      console.log('Updating interview stage:', id, updates);
      
      // If marking as passed or failed, require feedback
      if ((updates.status === 'passed' || updates.status === 'failed') && 
          (!updates.comments || updates.comments.trim() === '')) {
        return res.status(400).json({ error: 'Feedback is required when completing interview stages' });
      }
      
      const stage = await storage.updateInterviewStage(id, updates);
      
      // Also update any related interview records
      const relatedInterviews = await storage.getInterviewsByStage(id);
      if (relatedInterviews.length > 0) {
        const interviewOutcome = updates.status === 'passed' ? 'passed' : 
                                updates.status === 'failed' ? 'failed' : null;
        
        if (interviewOutcome) {
          for (const interview of relatedInterviews) {
            await storage.updateInterview(interview.id, {
              outcome: interviewOutcome,
              status: 'completed',
              notes: updates.comments || '',
            });
          }
        }
      }
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'UPDATE_INTERVIEW_STAGE',
        entityType: 'interview_stage',
        entityId: id,
        newValues: [stage],
      });

      broadcastToClients({
        type: 'INTERVIEW_STAGE_UPDATED',
        data: stage,
      });

      res.json(stage);
    } catch (error) {
      console.error('Update interview stage error:', error);
      res.status(500).json({ error: 'Failed to update interview stage' });
    }
  });

  // Interview routes
  app.get('/api/interviews', requireAuth, async (req, res) => {
    try {
      const { start, end, interviewerId, stageId } = req.query;
      
      let interviews;
      if (start && end) {
        interviews = await storage.getInterviewsByDateRange(
          new Date(start as string),
          new Date(end as string)
        );
      } else if (interviewerId) {
        interviews = await storage.getInterviewsByInterviewer(
          parseInt(interviewerId as string)
        );
      } else if (stageId) {
        interviews = await storage.getInterviewsByStage(
          parseInt(stageId as string)
        );
      } else {
        interviews = await storage.getInterviews();
      }
      
      res.json(interviews);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch interviews' });
    }
  });

  // Add specific route for interviewer-based interviews  
  app.get('/api/interviews/interviewer/:interviewerId', requireAuth, async (req, res) => {
    try {
      const interviewerId = parseInt(req.params.interviewerId);
      if (isNaN(interviewerId)) {
        return res.status(400).json({ error: 'Invalid interviewer ID' });
      }
      
      const interviews = await storage.getInterviewsByInterviewer(interviewerId);
      res.json(interviews);
    } catch (error) {
      console.error('Error fetching interviews by interviewer:', error);
      res.status(500).json({ error: 'Failed to fetch interviews' });
    }
  });

  app.post('/api/interviews', requireAuth, async (req, res) => {
    try {
      const { stageId, candidateId, interviewerId, scheduledAt, duration, notes } = req.body;
      
      console.log('Creating interview:', req.body);
      
      // Check if user is the creator of the candidate (responsible manager)
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      
      if (candidate.createdBy !== req.session!.user!.id) {
        return res.status(403).json({ error: 'Only the responsible manager can schedule interviews' });
      }
      
      const interview = await storage.scheduleInterview(
        stageId,
        interviewerId,
        new Date(scheduledAt),
        duration || 30
      );
      
      // Send notification to interviewer
      const interviewer = await storage.getUser(interviewerId);
      
      if (interviewer && candidate) {
        await emailService.sendInterviewNotification(
          interviewer.email,
          candidate.fullName,
          new Date(scheduledAt),
          interviewer.fullName
        );
        

      }
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'SCHEDULE_INTERVIEW',
        entityType: 'interview',
        entityId: interview.id,
        newValues: [interview],
      });

      broadcastToClients({
        type: 'INTERVIEW_SCHEDULED',
        data: interview,
      });

      res.json(interview);
    } catch (error) {
      console.error('Schedule interview error:', error);
      res.status(500).json({ error: 'Failed to schedule interview' });
    }
  });

  app.put('/api/interviews/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      console.log('Updating interview:', id, updates);
      
      // Check if this is a reschedule operation
      const isReschedule = updates.scheduledAt && updates.scheduledAt !== '';
      let oldInterview = null;
      
      if (isReschedule) {
        // Get the interview details before updating for comparison
        oldInterview = await storage.getInterview(id);
      }
      
      const interview = await storage.updateInterview(id, updates);
      
      // Handle reschedule notifications
      if (isReschedule && oldInterview) {
        // Get candidate and interviewer details for notifications
        const candidate = await storage.getCandidate(oldInterview.candidateId);
        const interviewer = await storage.getUser(oldInterview.interviewerId);
        

        
        // Create in-app notification for interviewer
        await storage.createNotification({
          userId: oldInterview.interviewerId,
          type: 'interview_rescheduled',
          title: 'Собеседование перенесено',
          message: `Собеседование с ${candidate?.fullName || 'кандидатом'} перенесено на ${new Date(updates.scheduledAt).toLocaleString('ru-RU')}`,
          relatedEntityType: 'interview',
          relatedEntityId: interview.id,
          isRead: false,
        });
      }
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: isReschedule ? 'RESCHEDULE_INTERVIEW' : 'UPDATE_INTERVIEW',
        entityType: 'interview',
        entityId: id,
        newValues: [interview],
      });

      broadcastToClients({
        type: isReschedule ? 'INTERVIEW_RESCHEDULED' : 'INTERVIEW_UPDATED',
        data: interview,
      });

      res.json(interview);
    } catch (error) {
      console.error('Update interview error:', error);
      res.status(500).json({ error: 'Failed to update interview' });
    }
  });

  // Get all interview stages for dashboard
  app.get('/api/interview-stages', requireAuth, async (req, res) => {
    try {
      const stages = await storage.getAllInterviewStages();
      res.json(stages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch interview stages' });
    }
  });

  // Analytics routes
  app.get('/api/analytics/dashboard', requireAnalyticsAccess, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });

  app.get('/api/analytics/conversion-funnel', requireAnalyticsAccess, async (req, res) => {
    try {
      const funnel = await storage.getConversionFunnel();
      res.json(funnel);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch conversion funnel' });
    }
  });

  app.get('/api/analytics/hiring-trends', requireAnalyticsAccess, async (req, res) => {
    try {
      const trends = await storage.getHiringTrends();
      res.json(trends);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch hiring trends' });
    }
  });

  app.get('/api/analytics/department-stats', requireAnalyticsAccess, async (req, res) => {
    try {
      const stats = await storage.getDepartmentStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch department stats' });
    }
  });

  app.get('/api/analytics/time-to-hire', requireAnalyticsAccess, async (req, res) => {
    try {
      const stats = await storage.getTimeToHireStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch time to hire stats' });
    }
  });

  app.get('/api/analytics/rejections-by-stage', requireAnalyticsAccess, async (req, res) => {
    try {
      const { month, year } = req.query;
      let rejections;
      
      if (month && year) {
        rejections = await storage.getRejectionsByStageByMonth(month as string, year as string);
      } else {
        rejections = await storage.getRejectionsByStage();
      }
      
      res.json(rejections);
    } catch (error) {
      console.error('Error fetching rejections by stage:', error);
      res.status(500).json({ error: 'Failed to fetch rejections by stage' });
    }
  });

  app.get('/api/analytics/dashboard-by-month', requireAnalyticsAccess, async (req, res) => {
    try {
      const { month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ error: 'Month and year are required' });
      }
      
      const stats = await storage.getDashboardStatsByMonth(month as string, year as string);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats by month:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats by month' });
    }
  });

  app.get('/api/analytics/conversion-funnel-by-month', requireAnalyticsAccess, async (req, res) => {
    try {
      const { month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ error: 'Month and year are required' });
      }
      
      const funnel = await storage.getConversionFunnelByMonth(month as string, year as string);
      res.json(funnel);
    } catch (error) {
      console.error('Error fetching conversion funnel by month:', error);
      res.status(500).json({ error: 'Failed to fetch conversion funnel by month' });
    }
  });

  app.get('/api/analytics/available-periods', requireAnalyticsAccess, async (req, res) => {
    try {
      const periods = await storage.getAvailableDataPeriods();
      res.json(periods);
    } catch (error) {
      console.error('Error fetching available periods:', error);
      res.status(500).json({ error: 'Failed to fetch available periods' });
    }
  });

  // Hired and dismissed analytics routes
  app.get('/api/analytics/hired-dismissed-stats', requireAnalyticsAccess, async (req, res) => {
    try {
      const stats = await storage.getHiredAndDismissedStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching hired and dismissed stats:', error);
      res.status(500).json({ error: 'Failed to fetch hired and dismissed stats' });
    }
  });

  app.get('/api/analytics/hired-dismissed-by-month', requireAnalyticsAccess, async (req, res) => {
    try {
      const stats = await storage.getHiredAndDismissedStatsByMonth();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching hired and dismissed stats by month:', error);
      res.status(500).json({ error: 'Failed to fetch hired and dismissed stats by month' });
    }
  });

  app.get('/api/analytics/hired-dismissed-by-year', requireAnalyticsAccess, async (req, res) => {
    try {
      const stats = await storage.getHiredAndDismissedStatsByYear();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching hired and dismissed stats by year:', error);
      res.status(500).json({ error: 'Failed to fetch hired and dismissed stats by year' });
    }
  });

  // Department routes
  app.get('/api/departments', requireAuth, async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).json({ error: 'Failed to fetch departments' });
    }
  });

  app.post('/api/departments', requireAuth, async (req, res) => {
    try {
      const { name, description } = req.body;
      
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Name is required' });
      }

      const department = await storage.createDepartment({
        name: name.trim(),
        description: description?.trim() || null,
      });

      res.status(201).json(department);
    } catch (error: any) {
      console.error('Error creating department:', error);
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        return res.status(400).json({ error: 'Department with this name already exists' });
      }
      res.status(500).json({ error: 'Failed to create department' });
    }
  });

  app.put('/api/departments/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Name is required' });
      }

      const department = await storage.updateDepartment(id, {
        name: name.trim(),
        description: description?.trim() || null,
      });

      res.json(department);
    } catch (error: any) {
      console.error('Error updating department:', error);
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Department with this name already exists' });
      }
      res.status(500).json({ error: 'Failed to update department' });
    }
  });

  app.delete('/api/departments/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Check if any vacancies use this department
      const vacancies = await storage.getVacancies();
      const departmentInUse = vacancies.some(v => v.departmentId === id);

      if (departmentInUse) {
        return res.status(400).json({ 
          error: 'Cannot delete department that is used by vacancies' 
        });
      }

      await storage.deleteDepartment(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting department:', error);
      res.status(500).json({ error: 'Failed to delete department' });
    }
  });

  // Enhanced interview management routes
  app.put('/api/interviews/:id/outcome', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { outcome, notes } = req.body;
      
      // Validate that notes/feedback is provided
      if (!notes || notes.trim() === '') {
        return res.status(400).json({ error: 'Feedback is required for interview outcomes' });
      }
      
      const interview = await storage.updateInterviewOutcome(id, outcome, notes);
      
      // Also update the corresponding interview stage
      if (interview.stageId) {
        const stageStatus = outcome === 'passed' ? 'passed' : outcome === 'failed' ? 'failed' : 'pending';
        await storage.updateInterviewStage(interview.stageId, {
          status: stageStatus,
          completedAt: new Date(),
          comments: notes,
        });
        
        // If stage passed, update candidate's current stage index
        if (outcome === 'passed') {
          const stage = await storage.getInterviewStage(interview.stageId);
          if (stage && interview.candidateId) {
            const nextStageIndex = stage.stageIndex + 1;
            await storage.updateCandidate(interview.candidateId, {
              currentStageIndex: nextStageIndex
            });
          }
        }
      }
      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'UPDATE_INTERVIEW_OUTCOME',
        entityType: 'interview',
        entityId: id,
        newValues: [{ outcome, notes }],
      });

      broadcastToClients({
        type: 'INTERVIEW_COMPLETED',
        data: interview,
      });
      
      res.json(interview);
    } catch (error) {
      console.error('Update interview outcome error:', error);
      res.status(500).json({ error: 'Failed to update interview outcome' });
    }
  });

  app.put('/api/interviews/:id/reschedule', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { newDateTime } = req.body;
      
      console.log('Rescheduling interview:', { id, newDateTime });
      
      // Get the interview details before updating
      const interviewDetails = await storage.getInterview(id);
      if (!interviewDetails) {
        return res.status(404).json({ error: 'Interview not found' });
      }
      
      const interview = await storage.rescheduleInterview(id, new Date(newDateTime));
      
      // Get candidate and interviewer details for notifications
      const candidate = await storage.getCandidate(interviewDetails.candidateId);
      const interviewer = await storage.getUser(interviewDetails.interviewerId);
      

      
      await storage.createAuditLog({
        userId: req.session!.user!.id,
        action: 'RESCHEDULE_INTERVIEW',
        entityType: 'interview',
        entityId: id,
        newValues: [{ oldDateTime: interviewDetails.scheduledAt, newDateTime }],
      });

      broadcastToClients({
        type: 'INTERVIEW_RESCHEDULED',
        data: interview,
      });
      
      res.json(interview);
    } catch (error) {
      console.error('Reschedule interview error:', error);
      res.status(500).json({ error: 'Failed to reschedule interview' });
    }
  });

  app.get('/api/interview-stages/candidate/:candidateId', requireAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      const stages = await storage.getInterviewStagesByCandidate(candidateId);
      res.json(stages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch interview stages' });
    }
  });

  // Update interview stage comments (for feedback editing)
  app.put('/api/interview-stages/:id/comments', requireAuth, async (req, res) => {
    try {
      const stageId = parseInt(req.params.id);
      const { comments } = req.body;
      const currentUserId = req.session!.user!.id;
      const currentUser = req.session!.user!;
      
      // Get the interview stage to check permissions
      const stage = await storage.getInterviewStage(stageId);
      if (!stage) {
        return res.status(404).json({ error: 'Interview stage not found' });
      }
      
      // Only allow the interviewer or admin to edit feedback
      if (stage.interviewerId !== currentUserId && currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'You can only edit your own feedback' });
      }
      
      // Update only the comments field
      const updatedStage = await storage.updateInterviewStage(stageId, {
        comments
      });
      
      await storage.createAuditLog({
        userId: currentUserId,
        action: 'UPDATE_INTERVIEW_STAGE_COMMENTS',
        entityType: 'interview_stage',
        entityId: stageId,
        oldValues: [{ comments: stage.comments }],
        newValues: [{ comments }],
      });

      // Broadcast the update to all connected clients for real-time sync
      broadcastToClients({
        type: 'INTERVIEW_STAGE_COMMENTS_UPDATED',
        data: {
          stageId,
          candidateId: stage.candidateId,
          comments,
          updatedBy: currentUser.fullName,
        },
      });

      res.json(updatedStage);
    } catch (error) {
      console.error('Update interview stage comments error:', error);
      res.status(500).json({ error: 'Failed to update interview stage comments' });
    }
  });

  app.post('/api/interviews/schedule', requireAuth, async (req, res) => {
    try {
      const { stageId, interviewerId, scheduledAt, duration } = req.body;
      
      // Validate required fields
      if (!stageId || !interviewerId || !scheduledAt) {
        return res.status(400).json({ error: 'Missing required fields: stageId, interviewerId, and scheduledAt are required' });
      }
      
      const interview = await storage.scheduleInterview(
        parseInt(stageId),
        parseInt(interviewerId),
        new Date(scheduledAt),
        duration || 30
      );
      
      // If we get here, the interview was scheduled successfully
      broadcastToClients({
        type: 'INTERVIEW_SCHEDULED',
        data: interview,
      });
      
      res.json(interview);
    } catch (error) {
      console.error('Schedule interview error:', error);
      
      // Check for specific database constraint errors
      if ((error as any).code === '23503') {
        return res.status(404).json({ error: 'Referenced stage or interviewer not found' });
      }
      
      // Check for time conflict errors
      if ((error as any).message?.includes('занят') || (error as any).message?.includes('busy') || (error as any).message?.includes('conflict')) {
        return res.status(409).json({ error: (error as any).message || 'Interviewer is busy at this time' });
      }
      
      // For other errors, return 500 (internal server error)
      res.status(500).json({ error: 'Failed to schedule interview' });
    }
  });

  app.get('/api/analytics/funnel', requireAnalyticsAccess, async (req, res) => {
    try {
      const funnel = await storage.getConversionFunnel();
      res.json(funnel);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch conversion funnel' });
    }
  });

  // Notification routes
  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getNotificationsByUser(req.session!.user!.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.put('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  // Delete notification
  app.delete('/api/notifications/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUserId = req.session!.user!.id;
      
      // Check if notification belongs to current user
      const notification = await storage.getNotification(id);
      if (!notification || notification.userId !== currentUserId) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      await storage.deleteNotification(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  });

  // Messages routes
  app.get('/api/messages/conversations', requireAuth, async (req, res) => {
    try {
      const currentUserId = req.session!.user!.id;
      const conversations = await storage.getConversationsByUser(currentUserId);
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  app.get('/api/messages/:receiverId', requireAuth, async (req, res) => {
    try {
      const receiverId = parseInt(req.params.receiverId);
      const currentUserId = req.session!.user!.id;
      
      console.log('Fetching messages for:', { currentUserId, receiverId });
      
      if (isNaN(receiverId)) {
        return res.status(400).json({ error: 'Invalid receiver ID' });
      }
      
      const messages = await storage.getMessagesBetweenUsers(currentUserId, receiverId);
      console.log('Found messages:', messages?.length || 0);
      
      // Ensure we always return an array
      const result = Array.isArray(messages) ? messages : [];
      res.json(result);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.post('/api/messages', requireAuth, async (req, res) => {
    try {
      const { receiverId, content } = req.body;
      const senderId = req.session!.user!.id;
      
      if (!receiverId || !content) {
        return res.status(400).json({ error: 'Receiver ID and content are required' });
      }
      
      const message = await storage.createMessage({
        senderId,
        receiverId: parseInt(receiverId),
        content: content.trim(),
      });
      
      // Broadcast message to WebSocket clients
      broadcastToClients({
        type: 'NEW_MESSAGE',
        data: message,
      });
      
      res.json(message);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  app.put('/api/messages/:id/read', requireAuth, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const currentUserId = req.session!.user!.id;
      
      if (isNaN(messageId)) {
        return res.status(400).json({ error: 'Invalid message ID' });
      }
      
      const message = await storage.markMessageAsRead(messageId, currentUserId);
      res.json(message);
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({ error: 'Failed to mark message as read' });
    }
  });

  // Online status routes
  app.post('/api/users/online-status', requireAuth, async (req, res) => {
    try {
      const userId = req.session!.user!.id;
      const { isOnline } = req.body;
      
      await storage.updateUserOnlineStatus(userId, isOnline);
      
      // Broadcast status change to all clients
      broadcastToClients({
        type: 'USER_STATUS_CHANGED',
        data: { userId, isOnline, lastSeenAt: new Date() },
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating online status:', error);
      res.status(500).json({ error: 'Failed to update online status' });
    }
  });

  app.get('/api/users/online-status', requireAuth, async (req, res) => {
    try {
      const users = await storage.getUsersWithOnlineStatus();
      res.json(users);
    } catch (error) {
      console.error('Error fetching online status:', error);
      res.status(500).json({ error: 'Failed to fetch online status' });
    }
  });

  // Photo serving route with display headers (not download)
  app.get('/api/files/photos/:filename', requireAuth, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join('uploads/photos', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // Get file stats
    const stat = fs.statSync(filePath);
    
    // Set proper headers for display (not download)
    res.setHeader('Content-Length', stat.size);
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png'
    };
    
    const contentType = contentTypes[ext] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  });

  // File download route with proper headers
  app.get('/api/files/:filename', requireAuth, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join('uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get file stats
    const stat = fs.statSync(filePath);
    
    // Set proper headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.txt': 'text/plain'
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  });
  
  // Legacy static file serving (for backward compatibility)
  app.use('/uploads', express.static('uploads'));

  const httpServer = createServer(app);

  // WebSocket server with user tracking
  const userSocketMap = new Map<number, WebSocket>();
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    wsClients.add(ws);
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'USER_CONNECT' && message.userId) {
          userSocketMap.set(message.userId, ws);
          await storage.updateUserOnlineStatus(message.userId, true);
          
          // Broadcast user came online
          broadcastToClients({
            type: 'USER_STATUS_CHANGED',
            data: { userId: message.userId, isOnline: true, lastSeenAt: new Date() },
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', async () => {
      wsClients.delete(ws);
      
      // Find and remove user from online status
      for (const [userId, socket] of userSocketMap.entries()) {
        if (socket === ws) {
          userSocketMap.delete(userId);
          await storage.updateUserOnlineStatus(userId, false);
          
          // Broadcast user went offline
          broadcastToClients({
            type: 'USER_STATUS_CHANGED',
            data: { userId, isOnline: false, lastSeenAt: new Date() },
          });
          break;
        }
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsClients.delete(ws);
    });
  });

  return httpServer;
}
