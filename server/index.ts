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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// ==================== MIDDLEWARE ====================

// CORS
const allowedOrigins = isProduction
    ? [process.env.ALLOWED_ORIGIN || 'https://raices.renace.tech']
    : ['http://localhost:6789', 'http://localhost:5173', 'http://127.0.0.1:6789'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use(express.json());

// Security headers (production only)
if (isProduction) {
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    });
}

// Rate limiting for API
const apiLimiter = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests
const RATE_WINDOW = 60 * 1000; // 1 minute

app.use('/api', (req, res, next) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const record = apiLimiter.get(ip);

    if (!record || now > record.resetTime) {
        apiLimiter.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return next();
    }

    if (record.count >= RATE_LIMIT) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    record.count++;
    next();
});

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

// Members
import { claimProfile } from './controllers/members';
app.post('/api/members/claim', authenticateToken, claimProfile);

app.get('/api/members', async (req: Request, res: Response) => {
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

app.post('/api/members', async (req: any, res: Response) => {
    try {
        const { name, branchId, relation, birthDate, parentId, preferredColor } = req.body;
        const member = await prisma.familyMember.create({
            data: {
                name,
                branchId,
                relation,
                birthDate: birthDate ? new Date(birthDate) : null,
                parentId: parentId || null,
                userId: req.user?.id || null,
                preferredColor: preferredColor || null
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

// Feed
app.get('/api/feed', getFeed);
app.post('/api/feed', authenticateToken, createPost);
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

// ==================== SPA FALLBACK (Production) ====================
if (isProduction) {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}

// ==================== START SERVER ====================
app.listen(PORT, () => {
    console.log(`🚀 Raíces API running on http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});
