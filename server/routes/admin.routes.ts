import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';
import { upload, processImage } from '../middleware/upload';
import { logAudit } from '../services/audit';
import {
    getPendingClaims, approveClaim, rejectClaim,
    getRegistrationRequests, approveRegistration, rejectRegistration,
    getAllUsers, updateUserRole, getAllMembers, linkUserToMember
} from '../controllers/admin';

const router = Router();

// Middleware: Require PATRIARCH role
const requireAdmin = (req: any, res: Response, next: any) => {
    if (req.user?.role !== 'PATRIARCH') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Apply middleware to all routes
router.use(authenticateToken, requireAdmin);

// ==================== STATS ====================
router.get('/stats', async (req: any, res: Response) => {
    try {
        const [totalMembers, totalUsers, totalBranches, pendingRegistrations, pendingClaims] = await Promise.all([
            prisma.familyMember.count(),
            prisma.user.count(),
            prisma.branch.count(),
            prisma.registrationRequest.count({ where: { status: 'PENDING' } }),
            prisma.pendingClaim.count({ where: { status: 'PENDING' } })
        ]);

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

// ==================== CLAIMS ====================
router.get('/claims', getPendingClaims);
router.post('/claims/:id/approve', approveClaim);
router.post('/claims/:id/reject', rejectClaim);

// ==================== REGISTRATIONS ====================
router.get('/registrations', getRegistrationRequests);
router.post('/registrations/:id/approve', approveRegistration);
router.post('/registrations/:id/reject', rejectRegistration);

// ==================== USERS ====================
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.post('/users/:id/link', linkUserToMember);

// ==================== MEMBERS (Admin) ====================
router.get('/members', getAllMembers);

router.delete('/members/:id', async (req: any, res: Response) => {
    const { id } = req.params;
    try {
        const member = await prisma.familyMember.findUnique({ where: { id } });
        await prisma.familyMember.delete({ where: { id } });

        // Audit log
        await logAudit({
            userId: req.user.id,
            action: 'DELETE_MEMBER',
            targetType: 'FamilyMember',
            targetId: id,
            details: { memberName: member?.name }
        });

        res.json({ message: 'Miembro eliminado correctamente' });
    } catch (error) {
        console.error('Delete Member Error:', error);
        res.status(500).json({ error: 'Error al eliminar miembro' });
    }
});

router.post('/members/:id/unclaim', async (req: any, res: Response) => {
    const { id } = req.params;
    try {
        const member = await prisma.familyMember.findUnique({ where: { id } });
        if (!member) {
            return res.status(404).json({ error: 'Miembro no encontrado' });
        }

        await prisma.familyMember.update({
            where: { id },
            data: { userId: null }
        });

        // Audit log
        await logAudit({
            userId: req.user.id,
            action: 'UNCLAIM_MEMBER',
            targetType: 'FamilyMember',
            targetId: id,
            details: { memberName: member.name }
        });

        res.json({ message: 'Perfil desvinculado correctamente' });
    } catch (error) {
        console.error('Unclaim Member Error:', error);
        res.status(500).json({ error: 'Error al desvincular perfil' });
    }
});

// ==================== AUDIT LOGS ====================
router.get('/audit-logs', async (req: any, res: Response) => {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { user: { select: { name: true, email: true } } }
        });
        res.json(logs);
    } catch (error) {
        console.error('Audit Logs Error:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

export default router;
