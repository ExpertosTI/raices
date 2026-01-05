import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { registerTeam, getSportsParticipants } from '../controllers/sports';
import { castVote, getVotes } from '../controllers/votes';
import eventsRoutes from './events.routes';

const router = Router();

// ==================== EVENTS (includes birthdays + manual events) ====================
router.use('/events', eventsRoutes);

// ==================== SPORTS ====================
router.post('/sports/register', authenticateToken, registerTeam);
router.get('/sports/participants', authenticateToken, getSportsParticipants);

// ==================== VOTES ====================
router.post('/votes', authenticateToken, castVote);
router.get('/votes', authenticateToken, getVotes);

export default router;
