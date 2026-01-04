import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get all branches
router.get('/', async (req: Request, res: Response) => {
    try {
        const branches = await prisma.branch.findMany({
            orderBy: { order: 'asc' }
        });
        res.json(branches);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch branches' });
    }
});

// Update branch color
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
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

export default router;
