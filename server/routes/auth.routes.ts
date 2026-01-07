import { Router, Request, Response } from 'express';
import {
    googleLogin,
    facebookLogin,
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

// Facebook OAuth
router.post('/facebook', facebookLogin);

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

// GDPR Data Deletion Request
router.post('/data-deletion-request', async (req: Request, res: Response) => {
    const { email, reason } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email es requerido' });
    }

    try {
        // Import prisma and sendEmail
        const { prisma } = await import('../db');
        const { sendEmail } = await import('../services/email');

        // Check if user exists
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(404).json({ error: 'No se encontró una cuenta con ese email' });
        }

        // Generate confirmation code
        const confirmationCode = `DEL-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        // Log the request (for audit purposes)
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'DATA_DELETION_REQUEST',
                targetType: 'User',
                targetId: user.id,
                details: JSON.stringify({ reason, confirmationCode, requestedAt: new Date() })
            }
        });

        // Send notification to admin
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@renace.tech';
        await sendEmail(
            adminEmail,
            '🗑️ Solicitud de eliminación de datos - Raíces App',
            `<h2>Solicitud de Eliminación de Datos</h2>
            <p><strong>Usuario:</strong> ${user.name || email}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Código:</strong> ${confirmationCode}</p>
            <p><strong>Razón:</strong> ${reason || 'No especificada'}</p>
            <br>
            <p>Procesar esta solicitud en un plazo de 30 días según GDPR.</p>`
        );

        // Send confirmation to user
        await sendEmail(
            email,
            '📧 Solicitud de eliminación recibida - Raíces',
            `<h2>Hemos recibido tu solicitud</h2>
            <p>Tu código de confirmación es: <strong>${confirmationCode}</strong></p>
            <p>Procesaremos tu solicitud en un plazo de 30 días.</p>
            <p>Si tienes preguntas, contacta: info@renace.space</p>`
        );

        res.json({
            message: 'Solicitud recibida',
            confirmationCode
        });
    } catch (error) {
        console.error('Data deletion request error:', error);
        res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
});

export default router;
