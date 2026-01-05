import { Router, Request, Response } from 'express';
import { googleLogin, me, login } from '../controllers/auth';
import { facebookLogin } from '../controllers/auth.facebook';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const isProduction = process.env.NODE_ENV === 'production';

// Google OAuth
router.post('/google', googleLogin);

// Facebook OAuth
router.post('/facebook', facebookLogin);

// Get current user
router.get('/me', authenticateToken, me);

// Dev-only mock login (disabled in production)
if (!isProduction) {
    router.post('/login', login);
}

export default router;
