import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload, VerifyErrors } from 'jsonwebtoken';
import { prisma } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

// Typed user payload from JWT
export interface UserPayload extends JwtPayload {
    id: string;
    email: string;
    role: 'MEMBER' | 'PATRIARCH';
    name?: string;
}

export interface AuthRequest extends Request {
    user?: UserPayload;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: VerifyErrors | null, decoded: string | JwtPayload | undefined) => {
        if (err) return res.sendStatus(403);

        const user = decoded as UserPayload;
        req.user = user;

        // Update lastSeen (fire and forget)
        if (user?.id) {
            prisma.user.update({
                where: { id: user.id },
                data: { lastSeen: new Date() }
            }).catch(() => { }); // Ignore errors
        }

        next();
    });
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    if (!req.user || req.user.role !== 'PATRIARCH') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    next();
}

export function requirePatriarch(req: AuthRequest, res: Response, next: NextFunction) {
    if (!req.user || req.user.role !== 'PATRIARCH') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de patriarca.' });
    }
    next();
}
