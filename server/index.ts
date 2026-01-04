/**
 * Raíces App - Main Server Entry Point
 * 
 * Clean, modular Express server with routes separated into individual modules.
 * All API routes are mounted from ./routes/index.ts
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Security middleware
import { securityHeaders, apiLimiter, authLimiter, validateEnvironment, validateJwtSecret } from './middleware/security';

// Main router (aggregates all route modules)
import apiRoutes from './routes/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// ==================== STARTUP VALIDATION ====================
validateEnvironment();
validateJwtSecret();

// ==================== MIDDLEWARE ====================

// Security Headers
app.use(securityHeaders);

// CORS Configuration
const allowedOrigins = isProduction
    ? [process.env.ALLOWED_ORIGIN || 'https://raices.renace.tech']
    : ['http://localhost:6789', 'http://localhost:5173', 'http://127.0.0.1:6789'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser
app.use(express.json({ limit: '1mb' }));

// Rate Limiting
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// ==================== STATIC FILES ====================

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Serve frontend in production
if (isProduction) {
    const distPath = path.join(__dirname, '../dist');
    app.use(express.static(distPath));
}

// ==================== API ROUTES ====================

// Mount all API routes
app.use('/api', apiRoutes);

// ==================== SPA FALLBACK ====================

if (isProduction) {
    app.get(/(.*)/, (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`🚀 Raíces API running on http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 Routes: auth, members, branches, feed, admin, features`);
});
