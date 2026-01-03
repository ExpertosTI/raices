import { Request, Response } from 'express';
import { prisma } from '../db';
import { sendEmail } from '../services/email';

// Claim a Patriarch Profile - Creates pending request for admin approval
export const claimProfile = async (req: any, res: Response) => {
    const { memberId } = req.body;
    const userId = req.user?.id;

    if (!memberId) {
        return res.status(400).json({ error: 'Member ID is required' });
    }

    try {
        // 1. Check if Member exists and is valid for claiming
        const member = await prisma.familyMember.findUnique({
            where: { id: memberId },
            include: { user: true, branch: true }
        });

        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        if (member.user) {
            return res.status(400).json({ error: 'Este perfil ya ha sido reclamado' });
        }

        // 2. Check if there's already a pending claim
        const existingClaim = await prisma.pendingClaim.findFirst({
            where: { userId, memberId, status: 'PENDING' }
        });

        if (existingClaim) {
            return res.status(400).json({ error: 'Ya tienes una solicitud pendiente para este perfil' });
        }

        // 3. Create PendingClaim
        const claim = await prisma.pendingClaim.create({
            data: { userId, memberId }
        });

        // 4. Get user info for email
        const user = await prisma.user.findUnique({ where: { id: userId } });

        // 5. Send email to Admin
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
            try {
                await sendEmail(
                    adminEmail,
                    `🔔 Nueva solicitud de reclamo - ${member.name}`,
                    `<h2>Nueva Solicitud de Reclamo</h2>
                    <p><strong>${user?.name || user?.email}</strong> quiere reclamar el perfil de <strong>${member.name}</strong>.</p>
                    <p><strong>Rama:</strong> ${member.branch.name}</p>
                    <p><strong>Email del solicitante:</strong> ${user?.email}</p>
                    <br>
                    <p>Ingresa al panel de administración para aprobar o rechazar esta solicitud.</p>
                    <p><a href="https://raices.renace.tech/admin">Ir al Panel de Administración</a></p>`
                );
            } catch (emailError) {
                console.error('Failed to send admin notification:', emailError);
            }
        }

        res.json({
            message: '✅ Solicitud enviada. Un administrador revisará tu reclamo.',
            claim,
            pending: true
        });

    } catch (error) {
        console.error('Claim Profile Error:', error);
        res.status(500).json({ error: 'Failed to create claim request' });
    }
};
