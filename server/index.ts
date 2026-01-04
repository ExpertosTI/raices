import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './db';
import { login, me, googleLogin } from './controllers/auth';
import { authenticateToken } from './middleware/auth';
import { canEditMember } from './middleware/permissions';
import { getFeed, createPost, likePost, createComment, deletePost } from './controllers/feed';
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

// Health check with DB status
app.get('/api/health', async (req: Request, res: Response) => {
    let dbStatus = 'unknown';
    try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
    } catch (e) {
        dbStatus = 'disconnected';
    }

    res.json({
        status: 'ok',
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development',
        database: dbStatus,
        uptime: process.uptime()
    });
});

// Stats endpoint for Admin Dashboard
app.get('/api/admin/stats', authenticateToken, async (req: any, res: Response) => {
    if (req.user?.role !== 'PATRIARCH') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        const [totalMembers, totalUsers, totalBranches, pendingRegistrations, pendingClaims] = await Promise.all([
            prisma.familyMember.count(),
            prisma.user.count(),
            prisma.branch.count(),
            prisma.registrationRequest.count({ where: { status: 'PENDING' } }),
            prisma.pendingClaim.count({ where: { status: 'PENDING' } })
        ]);

        // Members per branch
        const membersPerBranch = await prisma.branch.findMany({
            select: {
                name: true,
                color: true,
                _count: { select: { members: true } }
            },
            orderBy: { order: 'asc' }
        });

        res.json({
            totalMembers,
            totalUsers,
            totalBranches,
            pendingRegistrations,
            pendingClaims,
            membersPerBranch: membersPerBranch.map(b => ({
                name: b.name,
                color: b.color,
                count: b._count.members
            }))
        });
    } catch (error) {
        console.error('Stats Error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
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

// New Admin Endpoint for auditing
import { getAllMembers } from './controllers/admin';
app.get('/api/admin/members', authenticateToken, requireAdmin, getAllMembers);

// Delete a member (Admin only)
app.delete('/api/admin/members/:id', authenticateToken, requireAdmin, async (req: any, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.familyMember.delete({ where: { id } });
        res.json({ message: 'Miembro eliminado correctamente' });
    } catch (error) {
        console.error('Delete Member Error:', error);
        res.status(500).json({ error: 'Error al eliminar miembro' });
    }
});

// Unclaim a member (Admin only) - removes user link from a patriarch
app.post('/api/admin/members/:id/unclaim', authenticateToken, requireAdmin, async (req: any, res: Response) => {
    const { id } = req.params;
    try {
        const member = await prisma.familyMember.findUnique({ where: { id } });
        if (!member) {
            return res.status(404).json({ error: 'Miembro no encontrado' });
        }

        // Remove the user link
        await prisma.familyMember.update({
            where: { id },
            data: { userId: null }
        });

        res.json({ message: 'Perfil desvinculado correctamente' });
    } catch (error) {
        console.error('Unclaim Member Error:', error);
        res.status(500).json({ error: 'Error al desvincular perfil' });
    }
});

// Registration Request from Onboarding (creates pending request for admin approval)
app.post('/api/registration-request', authenticateToken, upload.single('photo'), processImage, async (req: any, res: Response) => {
    try {
        const userId = req.user?.id;
        const { name, nickname, branchId, grandparentId, parentName, parentType, relation, birthDate, phone, whatsapp, bio, skills } = req.body;
        // processImage middleware adds imageUrl to body if file exists
        const photoUrl = req.body.imageUrl;

        if (!branchId || !name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create registration request
        const request = await prisma.registrationRequest.create({
            data: {
                userId,
                name,
                nickname: nickname || null,
                branchId,
                grandparentId: grandparentId || null,
                parentName: parentName || null,
                parentType: parentType || null,
                relation,
                birthDate: birthDate ? new Date(birthDate) : null,
                phone: phone || null,
                whatsapp: whatsapp || null,
                bio: photoUrl ? `${bio || ''}\n\n[PHOTO_URL]: ${photoUrl}` : (bio || null),
                skills: skills ? JSON.parse(skills) : [],
                status: 'PENDING'
            }
        });

        // Send email notification to admin
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
            const { sendEmail } = await import('./services/email');
            try {
                await sendEmail(
                    adminEmail,
                    '📋 Nueva solicitud de registro - Raíces App',
                    `<h2>Nueva Solicitud de Registro</h2>
                    <p><strong>${name}</strong> quiere registrarse como descendiente.</p>
                    <p><strong>Padre/Madre:</strong> ${parentName || 'No especificado'}</p>
                    <p><strong>Relación:</strong> ${relation}</p>
                    <br>
                    <p><a href="https://raices.renace.tech/admin">Ir al Panel de Administración</a></p>`
                );
            } catch (emailError) {
                console.error('Failed to send admin notification:', emailError);
            }
        }

        res.json({ message: 'Solicitud enviada exitosamente', request });
    } catch (error) {
        console.error('Registration Request Error:', error);
        res.status(500).json({ error: 'Failed to create registration request' });
    }
});

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

app.put('/api/members/:id', authenticateToken, canEditMember, upload.single('photo'), processImage, async (req: any, res: Response) => {
    const { id } = req.params;
    const data = req.body;
    const photoUrl = req.body.imageUrl;

    try {
        const updateData: any = {
            name: data.name,
            birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
            bio: data.bio,
            phone: data.phone,
            whatsapp: data.whatsapp
        };

        if (data.skills) {
            try {
                // Handle both JSON string (from FormData) and direct array
                updateData.skills = typeof data.skills === 'string' ? JSON.parse(data.skills) : data.skills;
            } catch (e) {
                console.error('Error parsing skills:', e);
                updateData.skills = [];
            }
        }

        if (photoUrl) {
            updateData.photo = photoUrl;
        }

        const updated = await prisma.familyMember.update({
            where: { id },
            data: updateData
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
app.delete('/api/feed/:id', authenticateToken, deletePost);

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

import { registerTeam, getSportsParticipants } from './controllers/sports';
app.post('/api/sports/register', authenticateToken, registerTeam);
app.get('/api/sports/participants', authenticateToken, getSportsParticipants);

import { castVote, getVotes } from './controllers/votes';
app.post('/api/votes', authenticateToken, castVote);
app.get('/api/votes', authenticateToken, getVotes);

// ==================== SPA FALLBACK (Production) ====================
if (isProduction) {
    app.get(/(.*)/, (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}

// Admin: Unclaim Profile
app.post('/api/admin/members/:id/unclaim', authenticateToken, async (req: any, res: Response) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });

    const { id } = req.params;
    try {
        await prisma.familyMember.update({
            where: { id },
            data: { userId: null }
        });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to unclaim' });
    }
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
    console.log(`🚀 Raíces API running on http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});
