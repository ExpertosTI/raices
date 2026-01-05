import { Router, Request, Response } from 'express';
import {
    googleLogin,
    me,
    login,
    registerWithEmail,
    loginWithEmail,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword
} from '../controllers/auth';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const isProduction = process.env.NODE_ENV === 'production';

// Google OAuth
router.post('/google', googleLogin);

// Email Authentication
router.post('/register', registerWithEmail);
router.post('/login-email', loginWithEmail);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Get current user
router.get('/me', authenticateToken, me);

// Dev-only mock login (disabled in production)
if (!isProduction) {
    router.post('/login', login);
}

export default router;
