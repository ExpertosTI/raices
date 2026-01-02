import { Request, Response } from 'express';
import { prisma } from '../db';
import { sendEmail, ADMIN_EMAIL } from '../services/email';
import { getSportsRegistrationTemplate } from '../services/templates';

export const registerTeam = async (req: any, res: Response) => {
    try {
        const { sportId, sportName } = req.body;
        const userId = req.user.id; // From authenticateToken middleware

        // Get User Info
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { familyMember: true }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        const userName = user.familyMember?.name || user.name || 'Usuario';
        const userEmail = user.email;

        // 1. Send Confirmation to User
        await sendEmail(
            userEmail,
            `Inscripción Confirmada: ${sportName} 🏆`,
            getSportsRegistrationTemplate(userName, sportName)
        );

        // 2. Send Notification to Admin
        await sendEmail(
            ADMIN_EMAIL,
            `Nueva Inscripción en Copa Familia: ${sportName}`,
            `
            <h2>Nueva Inscripción</h2>
            <p><strong>Miembro:</strong> ${userName}</p>
            <p><strong>Rama:</strong> ${user.familyMember?.branch?.name || 'No asignada'}</p>
            <p><strong>Deporte:</strong> ${sportName} (${sportId})</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            `
        );

        res.json({ success: true, message: 'Inscripción enviada' });

    } catch (error) {
        console.error('Sports registration error:', error);
        res.status(500).json({ error: 'Failed to register' });
    }
};
