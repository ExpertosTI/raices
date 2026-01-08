import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../db';

/**
 * Middleware to require that the authenticated user belongs to a family.
 * If the user has no familyId, returns 403 Forbidden.
 * Also attaches req.familyId for downstream route handlers.
 */
export const requireFamily = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { familyId: true }
        });

        if (!user?.familyId) {
            return res.status(403).json({
                error: 'Debes pertenecer a una familia para acceder a este recurso',
                code: 'NO_FAMILY'
            });
        }

        // Attach familyId to the request for use in route handlers
        req.familyId = user.familyId;
        next();
    } catch (error) {
        console.error('requireFamily middleware error:', error);
        res.status(500).json({ error: 'Error verificando familia' });
    }
};

/**
 * Middleware to require that the user is an ADMIN or SUPERADMIN of their family.
 */
export const requireFamilyAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
            return res.status(403).json({
                error: 'Debes pertenecer a una familia',
                code: 'NO_FAMILY'
            });
        }

        if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
            return res.status(403).json({
                error: 'Solo administradores pueden realizar esta acción',
                code: 'NOT_ADMIN'
            });
        }

        req.familyId = user.familyId;
        next();
    } catch (error) {
        console.error('requireFamilyAdmin middleware error:', error);
        res.status(500).json({ error: 'Error verificando permisos' });
    }
};
