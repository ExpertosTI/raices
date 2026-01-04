import { Router, Request, Response } from 'express';
import { googleLogin, me, login } from '../controllers/auth';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const isProduction = process.env.NODE_ENV === 'production';

// Google OAuth
router.post('/google', googleLogin);

// Get current user
router.get('/me', authenticateToken, me);

// Dev-only mock login (disabled in production)
if (!isProduction) {
    router.post('/login', login);
}

export default router;
