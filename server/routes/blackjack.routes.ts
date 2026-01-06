import { Router } from 'express';
import { createTable, joinTable, getTableState, getTableByNumber, dealRound, playerAction, botMove, getActiveTables, updateBet } from '../controllers/blackjack';

const router = Router();

router.post('/table', createTable);
router.post('/join', joinTable);
router.get('/table/:id', getTableState);
router.get('/table/number/:num', getTableByNumber);
router.post('/table/:id/deal', dealRound);
router.post('/action', playerAction);
router.post('/bot-move', botMove);

router.get('/tables/active', getActiveTables);
router.post('/bet', updateBet);

export default router;
