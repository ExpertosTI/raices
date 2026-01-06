import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';
import { canEditMember } from '../middleware/permissions';
import { validateMemberInput } from '../middleware/validation';
import { upload, processImage } from '../middleware/upload';
import { claimProfile } from '../controllers/members';

const router = Router();

// Claim a profile (for founding members)
router.post('/claim', authenticateToken, claimProfile);

// Get all members
// Get all members
router.get('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { branchId, relation } = req.query;
        const where: any = {};

        if (branchId) where.branchId = String(branchId);
        if (relation) where.relation = String(relation);

        const members = await prisma.familyMember.findMany({
            where,
            include: { branch: true },
            orderBy: { birthDate: 'asc' }
        });
        res.json(members);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// Create new member
// Create new member (or register self)
router.post('/', authenticateToken, validateMemberInput, async (req: any, res: Response) => {
    try {
        const { name, branchId, relation, birthDate, parentId, preferredColor, expectedChildCount } = req.body;
        const userId = req.user?.id;

        // Check if user already has a member profile
        const existingMember = await prisma.familyMember.findUnique({
            where: { userId }
        });

        // 1. If parentId is provided, we need to verify instead of linking directly
        if (parentId) {
            // Check Parent
            const parentMember = await prisma.familyMember.findUnique({
                where: { id: parentId },
                include: { user: true }
            });

            if (!parentMember) {
                return res.status(404).json({ error: 'Padre no encontrado' });
            }

            // Create Member (Unlinked from tree initially)
            // We link it to the User so they have a profile
            const member = await prisma.familyMember.create({
                data: {
                    name,
                    branchId,
                    relation,
                    birthDate: birthDate ? new Date(birthDate) : null,
                    parentId: null, // PENDING VERIFICATION
                    preferredColor: preferredColor || null,
                    expectedChildCount: expectedChildCount || 0,
                    userId: existingMember ? undefined : userId // Link to user if they don't have one
                }
            });

            // Create Verification Request
            const { createVerificationRequest } = await import('../controllers/verification');
            // We simulate a request body for the controller or call prisma directly
            // Calling prisma directly here is cleaner
            const verification = await prisma.familyVerification.create({
                data: {
                    requesterId: userId,
                    parentMemberId: parentId,
                    childName: name,
                    message: 'Solicitud de registro inicial'
                },
                include: { requester: true }
            });

            // Send Email to Parent
            if (parentMember.user?.email) {
                const { sendEmail } = await import('../services/email');
                try {
                    await sendEmail(
                        parentMember.user.email,
                        `🔔 Solicitud de confirmación de hijo/a`,
                        `<h2>¡Hola ${parentMember.name}!</h2>
                        <p><strong>${name}</strong> se ha registrado como tu hijo/a.</p>
                        <p>Por favor ingresa a la aplicación para confirmar esta relación.</p>
                        <p><a href="https://raices.renace.tech">Ir a Raíces</a></p>`
                    );
                } catch (e) { console.error(e); }
            }

            return res.json({
                message: '✅ Perfil creado. Se ha enviado una solicitud de verificación a tu padre/madre.',
                member,
                verificationPending: true
            });
        }

        // 2. If no parentId (e.g. Patriarch or special case), create normally
        const member = await prisma.familyMember.create({
            data: {
                name,
                branchId,
                relation,
                birthDate: birthDate ? new Date(birthDate) : null,
                parentId: null,
                preferredColor: preferredColor || null,
                expectedChildCount: expectedChildCount || 0,
                userId: existingMember ? undefined : userId
            }
        });

        res.json(member);

    } catch (error: any) {
        console.error('Error creating member:', error);
        res.status(500).json({
            error: 'Failed to create member',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

// Update member
router.put('/:id', authenticateToken, canEditMember, upload.single('photo'), processImage, async (req: any, res: Response) => {
    const { id } = req.params;
    const data = req.body;
    const photoUrl = req.body.imageUrl;

    try {
        const updateData: any = {
            name: data.name,
            birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
            bio: data.bio,
            phone: data.phone,
            whatsapp: data.whatsapp,
            preferredColor: data.preferredColor
        };

        if (data.parentId !== undefined) {
            updateData.parentId = data.parentId === '' ? null : data.parentId;
        }

        // Update expected child count if provided
        if (data.expectedChildCount !== undefined) {
            updateData.expectedChildCount = parseInt(data.expectedChildCount) || 0;
        }

        if (data.skills) {
            try {
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


// Add child to current user
router.post('/child', authenticateToken, async (req: any, res: Response) => {
    try {
        const userId = req.user?.id;
        const { name, birthDate, gender } = req.body; // gender/relation

        // Get parent (current user)
        const parent = await prisma.familyMember.findUnique({
            where: { userId },
            include: { branch: true }
        });

        if (!parent) {
            return res.status(404).json({ error: 'Debes tener un perfil activado para agregar hijos.' });
        }

        // Determine relation (if parent is CHILD, child is GRANDCHILD, etc)
        let childRelation = 'GREAT_GRANDCHILD';
        if (parent.relation === 'PATRIARCH') childRelation = 'SIBLING'; // Should not happen usually as patriarchs are set
        else if (parent.relation === 'SIBLING') childRelation = 'CHILD';
        else if (parent.relation === 'CHILD') childRelation = 'GRANDCHILD';
        else if (parent.relation === 'GRANDCHILD') childRelation = 'GREAT_GRANDCHILD';

        const child = await prisma.familyMember.create({
            data: {
                name,
                branchId: parent.branchId,
                relation: childRelation as any,
                birthDate: birthDate ? new Date(birthDate) : null,
                parentId: parent.id,
                user: undefined // No user account yet
            }
        });

        res.json(child);
    } catch (error) {
        console.error('Add child error:', error);
        res.status(500).json({ error: 'Error al agregar hijo' });
    }
});

export default router;
