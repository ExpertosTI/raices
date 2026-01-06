
import { Router } from 'express';
import { authenticateToken, requirePatriarch } from '../middleware/auth';
import {
    getExchanges,
    createExchange,
    joinExchange,
    getExchangeDetails,
    runMatching,
    getMyMatch
} from '../controllers/exchange';

const router = Router();

// Public / Member routes
router.get('/', authenticateToken, getExchanges);
router.get('/:id', authenticateToken, getExchangeDetails);
router.post('/:id/join', authenticateToken, joinExchange);
router.get('/:id/my-match', authenticateToken, getMyMatch);

// Admin routes
router.post('/', requirePatriarch, createExchange);
router.post('/:id/match', requirePatriarch, runMatching);

export default router;
