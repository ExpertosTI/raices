import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';
import { upload, processImage } from '../middleware/upload';

// Import route modules
import authRoutes from './auth.routes';
import membersRoutes from './members.routes';
import branchesRoutes from './branches.routes';
import feedRoutes from './feed.routes';
import adminRoutes from './admin.routes';
import featuresRoutes from './features.routes';
import verificationRoutes from './verification.routes';
import exchangeRoutes from './exchange.routes';

const router = Router();

// ==================== HEALTH CHECK ====================
router.get('/health', async (req: Request, res: Response) => {
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

// ==================== REGISTRATION REQUEST ====================
router.post('/registration-request', authenticateToken, upload.single('photo'), processImage, async (req: any, res: Response) => {
    try {
        const userId = req.user?.id;
        const { name, nickname, branchId, grandparentId, parentName, parentType, relation, birthDate, phone, whatsapp, bio, skills } = req.body;
        const photoUrl = req.body.imageUrl;

        if (!branchId || !name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

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
            const { sendEmail } = await import('../services/email');
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

// ==================== MOUNT ROUTE MODULES ====================
router.use('/auth', authRoutes);
router.use('/members', membersRoutes);
router.use('/branches', branchesRoutes);
router.use('/feed', feedRoutes);
router.use('/admin', adminRoutes);
router.use('/verification', verificationRoutes);
router.use('/exchange', exchangeRoutes);

// Features (events, sports, votes)
router.use('/', featuresRoutes);

export default router;
