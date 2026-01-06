import { Router } from 'express';
import { createTable, joinTable, getTableState, dealRound, playerAction, botMove } from '../controllers/blackjack';

const router = Router();

router.post('/table', createTable);
router.post('/join', joinTable);
router.get('/table/:id', getTableState);
router.post('/table/:id/deal', dealRound);
router.post('/action', playerAction);
router.post('/bot-move', botMove);

export default router;
