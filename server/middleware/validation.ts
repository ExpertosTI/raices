import { Request, Response, NextFunction } from 'express';

// Simple validation helpers
export const sanitizeString = (input: any): string => {
    if (typeof input !== 'string') return '';
    // Remove potential XSS vectors
    return input
        .trim()
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .slice(0, 500); // Max length
};

export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const isValidDate = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
};

// Middleware: Validate Member Creation
export const validateMemberInput = (req: Request, res: Response, next: NextFunction) => {
    const { name, branchId, relation, birthDate } = req.body;

    const errors: string[] = [];

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        errors.push('El nombre debe tener al menos 2 caracteres.');
    }

    if (!branchId || typeof branchId !== 'string') {
        errors.push('Rama familiar es requerida.');
    }

    if (birthDate && !isValidDate(birthDate)) {
        errors.push('Fecha de nacimiento inválida.');
    }

    const validRelations = ['CHILD', 'GRANDCHILD', 'GREAT_GRANDCHILD', 'SPOUSE', 'NEPHEW', 'OTHER'];
    if (relation && !validRelations.includes(relation)) {
        errors.push('Tipo de relación inválido.');
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // Sanitize inputs
    req.body.name = sanitizeString(name);
    req.body.bio = req.body.bio ? sanitizeString(req.body.bio) : null;
    req.body.phone = req.body.phone ? sanitizeString(req.body.phone).slice(0, 20) : null;
    req.body.whatsapp = req.body.whatsapp ? sanitizeString(req.body.whatsapp).slice(0, 20) : null;

    next();
};

// Middleware: Validate Post Creation
export const validatePostInput = (req: Request, res: Response, next: NextFunction) => {
    const { content, imageUrl } = req.body;

    // Allow post if it has EITHER content OR an image (imageUrl is set by processImage middleware)
    if ((!content || !content.trim()) && !imageUrl) {
        return res.status(400).json({ error: 'La publicación debe tener texto o una imagen.' });
    }

    if (content && content.length > 2000) {
        return res.status(400).json({ error: 'El contenido excede el límite de 2000 caracteres.' });
    }

    if (content) {
        req.body.content = sanitizeString(content);
    }

    next();
};
