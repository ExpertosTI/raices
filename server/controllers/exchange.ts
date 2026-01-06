
import { Request, Response } from 'express';
import { prisma } from '../db';

// ==================== CONTROLLERS ====================

export const getExchanges = async (req: Request, res: Response) => {
    try {
        const exchanges = await prisma.gameExchange.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { participants: true }
                }
            }
        });
        res.json(exchanges);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching exchanges' });
    }
};

export const createExchange = async (req: Request, res: Response) => {
    try {
        const { title, year, description, budget } = req.body;

        const exchange = await prisma.gameExchange.create({
            data: {
                title,
                year: Number(year),
                description,
                budget,
                status: 'REGISTRATION_OPEN'
            }
        });

        res.json(exchange);
    } catch (error) {
        res.status(500).json({ error: 'Error creating exchange' });
    }
};

export const joinExchange = async (req: Request, res: Response) => {
    // User selects which family member they are representing (or themselves)
    const { exchangeId } = req.params;
    const { memberId, wishes } = req.body;
    const userId = (req as any).user?.id;

    try {
        // Validation: Check if exchange is open
        const exchange = await prisma.gameExchange.findUnique({ where: { id: exchangeId } });
        if (!exchange || exchange.status !== 'REGISTRATION_OPEN') {
            return res.status(400).json({ error: 'El intercambio ya no acepta registros.' });
        }

        // Check if member already exists in this exchange
        const existing = await prisma.exchangeParticipant.findUnique({
            where: {
                exchangeId_memberId: {
                    exchangeId,
                    memberId
                }
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'Este miembro ya está participando.' });
        }

        const participant = await prisma.exchangeParticipant.create({
            data: {
                exchangeId,
                memberId,
                userId, // Can be null if manually added by admin, but here we assume user action
                wishes,
                status: 'CONFIRMED'
            }
        });

        res.json(participant);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al unirse al intercambio.' });
    }
};

export const getExchangeDetails = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const exchange = await prisma.gameExchange.findUnique({
            where: { id },
            include: {
                participants: {
                    include: {
                        member: true // To show names
                    }
                }
            }
        });

        if (!exchange) return res.status(404).json({ error: 'Intercambio no encontrado' });

        // Hide secret targets!
        // We only return the list of WHO is participating, but not who they have assigned.
        // Although the schema has 'assignedMemberId', we should perhaps scrub it or trust the frontend not to peek?
        // Better scrub it for security.

        const safeParticipants = exchange.participants.map(p => ({
            ...p,
            assignedMemberId: undefined, // Hide secrets
            assignedMember: undefined
        }));

        res.json({ ...exchange, participants: safeParticipants });
    } catch (error) {
        res.status(500).json({ error: 'Error loading details' });
    }
};

export const getMyMatch = async (req: Request, res: Response) => {
    const { id } = req.params; // Exchange ID
    const userId = (req as any).user?.id;

    // There can be multiple participants managed by one user (e.g. parent managing children)
    // We return all matches for this user in this exchange

    try {
        const myParticipations = await prisma.exchangeParticipant.findMany({
            where: {
                exchangeId: id,
                userId: userId
            },
            include: {
                member: true, // Who is giving (Me/My Child)
                assignedMember: true // The target (Angelito)
            }
        });

        // Filter out if not matched yet
        const matches = myParticipations
            .filter(p => p.assignedMemberId)
            .map(p => ({
                myMember: p.member,
                targetMember: p.assignedMember,
                wishes: p.wishes // Maybe wishes of the target? No, wishes column is my wishes.
                // We need to fetch wishes of the target!
            }));

        // To get target wishes, we need a separate query or better relation
        // Let's do a quick enrichment
        const enrichedMatches = await Promise.all(matches.map(async (m) => {
            const targetParticipant = await prisma.exchangeParticipant.findUnique({
                where: {
                    exchangeId_memberId: {
                        exchangeId: id,
                        memberId: m.targetMember!.id
                    }
                },
                select: { wishes: true }
            });
            return {
                ...m,
                targetWishes: targetParticipant?.wishes
            };
        }));

        res.json(enrichedMatches);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching matches' });
    }
};

// ==================== ADMIN: MATCHING ALGORITHM ====================

export const runMatching = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const exchange = await prisma.gameExchange.findUnique({ where: { id }, include: { participants: true } });
        if (!exchange) return res.status(404).json({ error: 'Not found' });

        if (exchange.participants.length < 2) {
            return res.status(400).json({ error: 'Se necesitan al menos 2 participantes.' });
        }

        const participants = exchange.participants;
        const ids = participants.map(p => p.id); // Participant IDs (not memberIDs, internal IDs to easy update)

        // Derangement Shuffle (Sattolo's or simple retry)
        // Simple retry approach for N < 100 is instant.

        let shuffled = [...ids];
        let isValid = false;
        let attempts = 0;

        while (!isValid && attempts < 1000) {
            // Fisher-Yates shuffle
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            // Check constraints
            // 1. No self match
            // 2. Optional: Avoid spouses? (Maybe too complex for now, keep it simple)

            isValid = true;
            for (let i = 0; i < ids.length; i++) {
                if (ids[i] === shuffled[i]) {
                    isValid = false;
                    break;
                }
            }
            attempts++;
        }

        if (!isValid) {
            return res.status(400).json({ error: 'No se pudo generar un sorteo válido tras 1000 intentos. Intenta de nuevo.' });
        }

        // Apply matches
        // ids[i] (Participant) gives to shuffled[i] (Participant)
        // We need to store memberId of shuffled[i] into assignedMemberId of ids[i]

        // Map Participant ID -> Member ID
        const pIdToMemberId = new Map<string, string>();
        participants.forEach(p => pIdToMemberId.set(p.id, p.memberId));

        // Transaction
        const updates = ids.map((pId, index) => {
            const targetPId = shuffled[index];
            const targetMemberId = pIdToMemberId.get(targetPId);

            return prisma.exchangeParticipant.update({
                where: { id: pId },
                data: { assignedMemberId: targetMemberId }
            });
        });

        await prisma.$transaction([
            ...updates,
            prisma.gameExchange.update({
                where: { id },
                data: { status: 'MATCHED' }
            })
        ]);

        res.json({ success: true, message: `Sorteo realizado para ${ids.length} participantes` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error executing match' });
    }
};
