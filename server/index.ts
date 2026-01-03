import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './db';
import { login, me, googleLogin } from './controllers/auth';
import { authenticateToken } from './middleware/auth';
import { canEditMember } from './middleware/permissions';
import { getFeed, createPost, likePost, createComment } from './controllers/feed';
import { getUpcomingBirthdays } from './services/birthday';

// Security Imports
import { securityHeaders, apiLimiter, authLimiter, validateEnvironment, validateJwtSecret } from './middleware/security';
import { validateMemberInput, validatePostInput } from './middleware/validation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// ==================== STARTUP VALIDATION ====================
validateEnvironment();
validateJwtSecret();

// ==================== MIDDLEWARE ====================

// Security Headers (always apply)
app.use(securityHeaders);

// CORS
const allowedOrigins = isProduction
    ? [process.env.ALLOWED_ORIGIN || 'https://raices.renace.tech']
    : ['http://localhost:6789', 'http://localhost:5173', 'http://127.0.0.1:6789'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser with size limit
app.use(express.json({ limit: '1mb' }));

// Rate Limiting (improved version from security module)
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter); // Stricter limit for auth endpoints

// ==================== STATIC FILES (Production) ====================
if (isProduction) {
    const distPath = path.join(__dirname, '../dist');
    app.use(express.static(distPath));
}

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Auth
app.post('/api/auth/google', googleLogin);
app.get('/api/auth/me', authenticateToken, me);

// Dev-only mock login (disabled in production for security)
if (!isProduction) {
    app.post('/api/auth/login', login);
}

// Members
import { claimProfile } from './controllers/members';
app.post('/api/members/claim', authenticateToken, claimProfile);

// Admin Routes (require PATRIARCH role)
import {
    getPendingClaims, approveClaim, rejectClaim,
    getRegistrationRequests, approveRegistration, rejectRegistration,
    getAllUsers, updateUserRole
} from './controllers/admin';

// Middleware to check admin role
const requireAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'PATRIARCH') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

app.get('/api/admin/claims', authenticateToken, requireAdmin, getPendingClaims);
app.post('/api/admin/claims/:id/approve', authenticateToken, requireAdmin, approveClaim);
app.post('/api/admin/claims/:id/reject', authenticateToken, requireAdmin, rejectClaim);
app.get('/api/admin/registrations', authenticateToken, requireAdmin, getRegistrationRequests);
app.post('/api/admin/registrations/:id/approve', authenticateToken, requireAdmin, approveRegistration);
app.post('/api/admin/registrations/:id/reject', authenticateToken, requireAdmin, rejectRegistration);
app.get('/api/admin/users', authenticateToken, requireAdmin, getAllUsers);
app.put('/api/admin/users/:id/role', authenticateToken, requireAdmin, updateUserRole);

// Protected: Members list now requires authentication
app.get('/api/members', authenticateToken, async (req: Request, res: Response) => {
    try {
        const members = await prisma.familyMember.findMany({
            include: { branch: true },
            orderBy: { birthDate: 'asc' }
        });
        res.json(members);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// Protected + Validated: Member creation
app.post('/api/members', authenticateToken, validateMemberInput, async (req: any, res: Response) => {
    try {
        const { name, branchId, relation, birthDate, parentId, preferredColor } = req.body;
        const member = await prisma.familyMember.create({
            data: {
                name,
                branchId,
                relation,
                birthDate: birthDate ? new Date(birthDate) : null,
                parentId: parentId || null,
                preferredColor: preferredColor || null
                // Note: We do NOT assign userId here. The new member is a distinct entity.
                // They can claim their profile later if they create an account.
            }
        });
        res.json(member);
    } catch (error: any) {
        console.error('Error creating member:', error);

        // Handle foreign key constraint violation specifically
        if (error.code === 'P2003') {
            return res.status(400).json({
                error: 'Invalid parent ID',
                details: 'El padre seleccionado no existe o no es válido.'
            });
        }

        res.status(500).json({
            error: 'Failed to create member',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

app.put('/api/members/:id', authenticateToken, canEditMember, async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = req.body;
    try {
        const updated = await prisma.familyMember.update({
            where: { id },
            data: {
                name: data.name,
                birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
                bio: data.bio,
                phone: data.phone,
                whatsapp: data.whatsapp
            }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update member' });
    }
});

// Branches
app.get('/api/branches', async (req: Request, res: Response) => {
    try {
        const branches = await prisma.branch.findMany({
            orderBy: { order: 'asc' }
        });
        res.json(branches);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch branches' });
    }
});

app.put('/api/branches/:id', authenticateToken, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { color } = req.body;
    try {
        const updated = await prisma.branch.update({
            where: { id },
            data: { color }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update branch' });
    }
});

// Feed
import { upload, processImage } from './middleware/upload';

// Static uploads serving (both dev and prod) -> security: consider separate domain in future
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/feed', getFeed);
// Updated post creation with image support
app.post('/api/feed',
    authenticateToken,
    upload.single('image'),
    processImage,
    validatePostInput, // Make sure validation handles the now populated body
    createPost
);
app.post('/api/feed/:id/like', authenticateToken, likePost);
app.post('/api/feed/:id/comment', authenticateToken, createComment);

// Events
app.get('/api/events', async (req: Request, res: Response) => {
    try {
        const members = await prisma.familyMember.findMany();
        const birthdays = getUpcomingBirthdays(members);
        res.json(birthdays);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

import { registerTeam } from './controllers/sports';
app.post('/api/sports/register', authenticateToken, registerTeam);

import { castVote, getVotes } from './controllers/votes';
app.post('/api/votes', authenticateToken, castVote);
app.get('/api/votes', authenticateToken, getVotes);

// ==================== SPA FALLBACK (Production) ====================
if (isProduction) {
    app.get(/(.*)/, (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}

// ==================== START SERVER ====================
app.listen(PORT, () => {
    console.log(`🚀 Raíces API running on http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});
