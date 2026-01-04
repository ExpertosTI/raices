import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken } from '../middleware/auth';
import { getUpcomingBirthdays } from '../services/birthday';
import { registerTeam, getSportsParticipants } from '../controllers/sports';
import { castVote, getVotes } from '../controllers/votes';

const router = Router();

// ==================== EVENTS/BIRTHDAYS ====================
router.get('/events', async (req: Request, res: Response) => {
    try {
        const members = await prisma.familyMember.findMany();
        const birthdays = getUpcomingBirthdays(members);
        res.json(birthdays);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// ==================== SPORTS ====================
router.post('/sports/register', authenticateToken, registerTeam);
router.get('/sports/participants', authenticateToken, getSportsParticipants);

// ==================== VOTES ====================
router.post('/votes', authenticateToken, castVote);
router.get('/votes', authenticateToken, getVotes);

export default router;
