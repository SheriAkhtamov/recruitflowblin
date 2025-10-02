import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase, checkDatabaseConnection } from "./initDatabase";

const app = express();

// CORS configuration for development
app.use((req, res, next) => {
  // Allow specific origins or all in development
  const allowedOrigins = [
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://192.168.1.164:5000',
    req.headers.origin
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database with schema and default data
  if (process.env.DATABASE_URL) {
    log("🔍 Checking database connection...");
    const isConnected = await checkDatabaseConnection();
    
    if (isConnected) {
      log("✅ Database connection successful");
      log("🔧 Initializing database schema and data...");
      await initializeDatabase();
    } else {
      log("❌ Database connection failed. Please check your DATABASE_URL and ensure PostgreSQL is running.");
      log("⚠️  Server will continue in database-less mode.");
    }
  } else {
    log("⚠️  DATABASE_URL is not set. Skipping database initialization.");
    log("📖 Please set DATABASE_URL in .env file for full functionality.");
  }
  

  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  const host = process.env.HOST || "0.0.0.0"; // Default to 0.0.0.0 for public access
  server.listen({
    port,
    host,
  }, () => {
    log(`serving on http://${host}:${port}`);
    if (host === "0.0.0.0") {
      log(`Public access available at http://192.168.1.164:${port}`);
    }
  });
})();
