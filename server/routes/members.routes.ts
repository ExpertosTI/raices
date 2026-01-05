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
router.get('/', authenticateToken, async (req: Request, res: Response) => {
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

// Create new member
router.post('/', authenticateToken, validateMemberInput, async (req: any, res: Response) => {
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
            }
        });
        res.json(member);
    } catch (error: any) {
        console.error('Error creating member:', error);
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

export default router;
