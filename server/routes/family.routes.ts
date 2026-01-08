import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Helper to generate URL-friendly slug
function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// ==================== CREATE FAMILY ====================
// POST /api/family - Create a new family (user becomes ADMIN)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { name, description } = req.body;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: 'El nombre de la familia es requerido (mínimo 2 caracteres)' });
    }

    try {
        // Check if user already belongs to a family
        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { familyId: true }
        });

        if (existingUser?.familyId) {
            return res.status(400).json({ error: 'Ya perteneces a una familia. Debes salir primero para crear una nueva.' });
        }

        // Generate unique slug
        let baseSlug = generateSlug(name);
        let slug = baseSlug;
        let counter = 1;

        while (await prisma.family.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        // Create family and update user in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create the family
            const family = await tx.family.create({
                data: {
                    name: name.trim(),
                    slug,
                    description: description?.trim() || null
                }
            });

            // Update user to be ADMIN of the new family
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    familyId: family.id,
                    role: 'ADMIN'
                },
                include: { family: true }
            });

            return { family, user: updatedUser };
        });

        res.status(201).json({
            success: true,
            message: 'Familia creada exitosamente',
            family: {
                id: result.family.id,
                name: result.family.name,
                slug: result.family.slug
            },
            user: {
                id: result.user.id,
                role: result.user.role,
                familyId: result.user.familyId
            }
        });

    } catch (error) {
        console.error('Error creating family:', error);
        res.status(500).json({ error: 'Error al crear la familia' });
    }
});

// ==================== GET FAMILY INFO ====================
// GET /api/family - Get current user's family info
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                family: {
                    include: {
                        _count: {
                            select: {
                                users: true,
                                members: true
                            }
                        }
                    }
                }
            }
        });

        if (!user?.family) {
            return res.status(404).json({ error: 'No perteneces a ninguna familia' });
        }

        res.json({
            family: {
                id: user.family.id,
                name: user.family.name,
                slug: user.family.slug,
                description: user.family.description,
                logo: user.family.logo,
                memberCount: user.family._count.members,
                userCount: user.family._count.users,
                createdAt: user.family.createdAt
            }
        });

    } catch (error) {
        console.error('Error fetching family:', error);
        res.status(500).json({ error: 'Error al obtener información de la familia' });
    }
});

// ==================== GENERATE INVITE ====================
// POST /api/family/invite - Generate an invite token (ADMIN only)
router.post('/invite', authenticateToken, async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { email, role = 'MEMBER', expiresInDays = 7 } = req.body;

    if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { familyId: true, role: true }
        });

        if (!user?.familyId) {
            return res.status(400).json({ error: 'No perteneces a una familia' });
        }

        // Only ADMIN or SUPERADMIN can create invites
        if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
            return res.status(403).json({ error: 'Solo administradores pueden crear invitaciones' });
        }

        // Generate unique token
        const token = crypto.randomBytes(16).toString('hex');

        // Calculate expiration
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + Math.min(expiresInDays, 30)); // Max 30 days

        const invite = await prisma.familyInvite.create({
            data: {
                token,
                familyId: user.familyId,
                email: email?.trim().toLowerCase() || null,
                role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
                expiresAt
            },
            include: {
                family: { select: { name: true, slug: true } }
            }
        });

        const inviteUrl = `${process.env.APP_URL || 'https://raices.renace.tech'}/join/${invite.token}`;

        res.status(201).json({
            success: true,
            invite: {
                token: invite.token,
                url: inviteUrl,
                email: invite.email,
                role: invite.role,
                expiresAt: invite.expiresAt,
                familyName: invite.family.name
            }
        });

    } catch (error) {
        console.error('Error creating invite:', error);
        res.status(500).json({ error: 'Error al crear la invitación' });
    }
});

// ==================== VALIDATE INVITE TOKEN ====================
// GET /api/family/invite/:token - Validate an invite token (public)
router.get('/invite/:token', async (req: Request, res: Response) => {
    const { token } = req.params;

    if (!token) {
        return res.status(400).json({ error: 'Token requerido' });
    }

    try {
        const invite = await prisma.familyInvite.findUnique({
            where: { token },
            include: {
                family: { select: { id: true, name: true, logo: true } }
            }
        });

        if (!invite) {
            return res.status(404).json({ error: 'Invitación no encontrada', valid: false });
        }

        if (invite.usedAt) {
            return res.status(410).json({ error: 'Esta invitación ya fue utilizada', valid: false });
        }

        if (new Date() > invite.expiresAt) {
            return res.status(410).json({ error: 'Esta invitación ha expirado', valid: false });
        }

        res.json({
            valid: true,
            family: invite.family,
            email: invite.email, // If email-restricted
            role: invite.role
        });

    } catch (error) {
        console.error('Error validating invite:', error);
        res.status(500).json({ error: 'Error al validar la invitación' });
    }
});

// ==================== JOIN FAMILY ====================
// POST /api/family/join - Join a family using invite token
router.post('/join', authenticateToken, async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { token } = req.body;

    if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    if (!token) {
        return res.status(400).json({ error: 'Token de invitación requerido' });
    }

    try {
        // Check if user already has a family
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { familyId: true, email: true }
        });

        if (user?.familyId) {
            return res.status(400).json({ error: 'Ya perteneces a una familia' });
        }

        // Validate the invite
        const invite = await prisma.familyInvite.findUnique({
            where: { token },
            include: { family: true }
        });

        if (!invite) {
            return res.status(404).json({ error: 'Invitación no encontrada' });
        }

        if (invite.usedAt) {
            return res.status(410).json({ error: 'Esta invitación ya fue utilizada' });
        }

        if (new Date() > invite.expiresAt) {
            return res.status(410).json({ error: 'Esta invitación ha expirado' });
        }

        // Check email restriction
        if (invite.email && invite.email.toLowerCase() !== user?.email?.toLowerCase()) {
            return res.status(403).json({ error: 'Esta invitación es para otro email' });
        }

        // Join the family
        const result = await prisma.$transaction(async (tx) => {
            // Mark invite as used
            await tx.familyInvite.update({
                where: { id: invite.id },
                data: {
                    usedAt: new Date(),
                    usedBy: userId
                }
            });

            // Update user
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    familyId: invite.familyId,
                    role: invite.role
                },
                include: {
                    family: { select: { id: true, name: true, slug: true } }
                }
            });

            return updatedUser;
        });

        res.json({
            success: true,
            message: `Te has unido a ${result.family?.name}`,
            user: {
                id: result.id,
                role: result.role,
                familyId: result.familyId
            },
            family: result.family
        });

    } catch (error) {
        console.error('Error joining family:', error);
        res.status(500).json({ error: 'Error al unirse a la familia' });
    }
});

// ==================== LEAVE FAMILY ====================
// POST /api/family/leave - Leave current family
router.post('/leave', authenticateToken, async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { familyId: true, role: true }
        });

        if (!user?.familyId) {
            return res.status(400).json({ error: 'No perteneces a ninguna familia' });
        }

        // Check if user is the only ADMIN
        if (user.role === 'ADMIN') {
            const adminCount = await prisma.user.count({
                where: {
                    familyId: user.familyId,
                    role: 'ADMIN'
                }
            });

            if (adminCount === 1) {
                return res.status(400).json({
                    error: 'Eres el único administrador. Debes asignar otro admin antes de salir.'
                });
            }
        }

        // Remove from family
        await prisma.user.update({
            where: { id: userId },
            data: {
                familyId: null,
                role: 'MEMBER' // Reset to member
            }
        });

        res.json({
            success: true,
            message: 'Has salido de la familia'
        });

    } catch (error) {
        console.error('Error leaving family:', error);
        res.status(500).json({ error: 'Error al salir de la familia' });
    }
});

export default router;
