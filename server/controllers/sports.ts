import { Request, Response } from 'express';
import { prisma } from '../db';
import { sendEmail, ADMIN_EMAIL } from '../services/email';
import { getSportsRegistrationTemplate } from '../services/templates';

// Reuse Vote model for registrations to avoid schema migration requirement for now
// Ideally this should be a separate 'SportRegistration' model

export const registerTeam = async (req: any, res: Response) => {
    try {
        const { sportId, sportName } = req.body;
        const userId = req.user.id; // From authenticateToken middleware

        // Validate
        if (!sportId || !sportName) {
            return res.status(400).json({ error: 'Faltan datos del deporte' });
        }

        // 1. Get User Data
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { familyMember: { include: { branch: true } } }
        });

        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const userName = user.familyMember?.name || user.name || 'Usuario';
        const userEmail = user.email;
        const branchName = user.familyMember?.branch?.name || 'Rama no asignada';

        // 2. Check for existing registration (using Vote table)
        // We use "sportId" or "sportName" as the key. Let's use sportName to be consistent with Votes.
        // Or better: composite ID "sportId:sportName" if we want robustness, but simpler is unique by Name.
        // Frontend sends local IDs (softball, basketball). Let's use sportName for readability in Vote table.

        const existingRegistration = await prisma.vote.findUnique({
            where: {
                userId_sportName: {
                    userId,
                    sportName: sportName // This enforcement uniqueness
                }
            }
        });

        if (existingRegistration) {
            return res.status(400).json({ error: 'Ya estás inscrito en este deporte/evento.' });
        }

        // 3. Register (Create Vote)
        await prisma.vote.create({
            data: {
                userId,
                sportName
            }
        });

        // 4. Send Emails (Async to not block response too long, but catch errors)
        try {
            // User Email
            await sendEmail(
                userEmail,
                `Inscripción Confirmada: ${sportName} 🏆`,
                getSportsRegistrationTemplate(userName, sportName)
            );

            // Admin Notification
            await sendEmail(
                ADMIN_EMAIL,
                `Nueva Inscripción Copa: ${sportName}`,
                `
                <h2>Nueva Inscripción</h2>
                <p><strong>Miembro:</strong> ${userName}</p>
                <p><strong>Rama:</strong> ${branchName}</p>
                <p><strong>Deporte:</strong> ${sportName}</p>
                <p><strong>Email:</strong> ${userEmail}</p>
                `
            );
        } catch (emailError) {
            console.error('Email sending failed (non-fatal):', emailError);
        }

        res.json({ success: true, message: 'Inscripción realizada con éxito' });

    } catch (error) {
        console.error('Sports registration error:', error);
        res.status(500).json({ error: 'Error al procesar inscripción' });
    }
};

export const getSportsParticipants = async (req: Request, res: Response) => {
    try {
        // Fetch all "votes" aka registrations
        const registrations = await prisma.vote.findMany({
            include: {
                user: {
                    select: {
                        name: true,
                        image: true,
                        familyMember: {
                            select: {
                                name: true,
                                branch: {
                                    select: { name: true, color: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Group by sportName
        const grouped: Record<string, any[]> = {};

        registrations.forEach(reg => {
            if (!grouped[reg.sportName]) {
                grouped[reg.sportName] = [];
            }

            // Format participant data
            grouped[reg.sportName].push({
                userId: reg.userId,
                name: reg.user.familyMember?.name || reg.user.name || 'Anónimo',
                branch: reg.user.familyMember?.branch?.name || 'Sin Rama',
                color: reg.user.familyMember?.branch?.color || '#888',
                image: reg.user.image,
                date: reg.createdAt
            });
        });

        res.json(grouped);

    } catch (error) {
        console.error('Get participants error:', error);
        res.status(500).json({ error: 'Failed to fetch participants' });
    }
};
