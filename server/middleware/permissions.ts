import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

export const requirePatriarch = async (req: any, res: Response, next: NextFunction) => {
    if (!req.user) return res.sendStatus(401);

    try {
        // Check if user is linked to a patriarch or has admin rights
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { familyMember: true }
        });

        // Strategy 1: User Role PATRIARCH
        if (user?.role === 'PATRIARCH') {
            return next();
        }

        // Strategy 2: If modifying their own branch (Advanced)
        // For now, simple check:
        res.status(403).json({ error: 'Requires Patriarch Privileges' });

    } catch (error) {
        res.sendStatus(500);
    }
};

export const canEditMember = async (req: any, res: Response, next: NextFunction) => {
    const targetMemberId = req.params.id;
    const userId = req.user.id;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { familyMember: true }
        });

        // 1. Admin/Patriarch global can edit anyone
        if (user?.role === 'PATRIARCH') return next();

        // 2. Regular user can UPDATE THEMSELVES (if linked)
        if (user?.familyMember?.id === targetMemberId) return next();

        // 3. Patriarch of a Branch can update descendants of that branch?
        // Let's implement this rule: "Patriarchs can edit their descendants"
        if (user?.familyMember?.isPatriarch) {
            const targetMember = await prisma.familyMember.findUnique({ where: { id: targetMemberId } });
            if (targetMember && targetMember.branchId === user.familyMember.branchId) {
                return next();
            }
        }

        res.status(403).json({ error: 'You do not have permission to edit this member' });
    } catch (error) {
        res.sendStatus(500);
    }
}
