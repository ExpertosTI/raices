import { Request, Response } from 'express';
import { prisma } from '../db';
import { sendEmail, ADMIN_EMAIL } from '../services/email';
import { sanitizeString } from '../middleware/validation';

export const castVote = async (req: any, res: Response) => {
    try {
        const { sportName } = req.body;
        const userId = req.user.id;

        if (!sportName || typeof sportName !== 'string' || sportName.trim().length < 2) {
            return res.status(400).json({ error: 'Nombre del deporte inválido' });
        }

        const cleanSportName = sanitizeString(sportName);

        // Check if user already voted for this sport
        const existingVote = await prisma.vote.findUnique({
            where: {
                userId_sportName: {
                    userId,
                    sportName: cleanSportName
                }
            }
        });

        if (existingVote) {
            return res.status(400).json({ error: 'Ya votaste por este deporte' });
        }

        // Record Vote
        await prisma.vote.create({
            data: {
                userId,
                sportName: cleanSportName
            }
        });

        // Optional: Notify Admin on new suggestions
        // Could be noisy if many votes, but good for engagement initially
        await sendEmail(
            ADMIN_EMAIL,
            `Nuevo Voto/Sugerencia: ${cleanSportName}`,
            `<p>Un miembro ha votado por: <strong>${cleanSportName}</strong></p>`
        );

        res.json({ success: true, message: 'Voto registrado' });

    } catch (error) {
        console.error('Voting error:', error);
        res.status(500).json({ error: 'Failed to cast vote' });
    }
};

export const getVotes = async (req: Request, res: Response) => {
    try {
        // Group by sportName and count
        const votes = await prisma.vote.groupBy({
            by: ['sportName'],
            _count: {
                sportName: true
            },
            orderBy: {
                _count: {
                    sportName: 'desc'
                }
            }
        });

        // Format for frontend
        const result = votes.map(v => ({
            name: v.sportName,
            count: v._count.sportName
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch votes' });
    }
};
