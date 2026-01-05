import { Router } from 'express';
import { authenticateToken, requirePatriarch } from '../middleware/auth';
import {
    createVerificationRequest,
    getPendingVerifications,
    approveVerification,
    rejectVerification,
    getAdminVerifications
} from '../controllers/verification';

const router = Router();

// Create a verification request (new user wants to be child of existing member)
router.post('/request', authenticateToken, createVerificationRequest);

// Get pending verifications (incoming + outgoing for current user)
router.get('/pending', authenticateToken, getPendingVerifications);

// Approve a verification request (parent confirms child)
router.post('/:id/approve', authenticateToken, approveVerification);

// Reject a verification request
router.post('/:id/reject', authenticateToken, rejectVerification);

// Admin: Get all pending/admin_review verifications
router.get('/admin', authenticateToken, requirePatriarch, getAdminVerifications);

export default router;
