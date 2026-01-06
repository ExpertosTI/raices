import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, requireAdmin, requirePatriarch } from '../middleware/auth';
import { upload, processImage } from '../middleware/upload';

const router = Router();

// GET all events (public - includes birthdays + manual events)
router.get('/', async (req: Request, res: Response) => {
    try {
        // Get manual events
        const manualEvents = await prisma.event.findMany({
            where: {
                date: { gte: new Date() }
            },
            orderBy: { date: 'asc' },
            take: 50
        });

        // Get birthdays from members
        const members = await prisma.familyMember.findMany({
            where: { birthDate: { not: null } },
            select: { id: true, name: true, birthDate: true, photo: true, branchId: true }
        });

        const today = new Date();
        const birthdays = members
            .map(m => {
                if (!m.birthDate) return null;
                const bday = new Date(m.birthDate);
                const nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
                if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1);
                const age = today.getFullYear() - bday.getFullYear();
                return {
                    id: `bday-${m.id}`,
                    title: `Cumpleaños de ${m.name}`,
                    date: nextBday.toISOString(),
                    type: 'BIRTHDAY' as const,
                    memberId: m.id,
                    photo: m.photo,
                    age,
                    isAutomatic: true
                };
            })
            .filter(Boolean)
            .sort((a, b) => new Date(a!.date).getTime() - new Date(b!.date).getTime())
            .slice(0, 30);

        // Combine and sort all events
        const allEvents = [
            ...manualEvents.map(e => ({ ...e, isAutomatic: false })),
            ...birthdays
        ].sort((a, b) => new Date(a!.date).getTime() - new Date(b!.date).getTime());

        res.json(allEvents);
    } catch (error) {
        console.error('Events fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// GET single event
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const event = await prisma.event.findUnique({
            where: { id: req.params.id }
        });
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch event' });
    }
});

// CREATE event (admin only)
router.post('/', authenticateToken, requirePatriarch, upload.single('image'), processImage, async (req: any, res: Response) => {
    try {
        const { title, description, date, endDate, type, location, isRecurring } = req.body;
        const imageUrl = req.body.imageUrl;

        if (!title || !date) {
            return res.status(400).json({ error: 'Title and date are required' });
        }

        const event = await prisma.event.create({
            data: {
                title,
                description: description || null,
                date: new Date(date),
                endDate: endDate ? new Date(endDate) : null,
                type: type || 'OTHER',
                location: location || null,
                imageUrl: imageUrl || null,
                isRecurring: isRecurring === 'true' || isRecurring === true,
                createdBy: req.user?.id
            }
        });

        res.status(201).json(event);
    } catch (error) {
        console.error('Event creation error:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// UPDATE event (admin only)
router.put('/:id', authenticateToken, requirePatriarch, upload.single('image'), processImage, async (req: any, res: Response) => {
    try {
        const { title, description, date, endDate, type, location, isRecurring } = req.body;
        const imageUrl = req.body.imageUrl;

        const updateData: any = {};
        if (title) updateData.title = title;
        if (description !== undefined) updateData.description = description || null;
        if (date) updateData.date = new Date(date);
        if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
        if (type) updateData.type = type;
        if (location !== undefined) updateData.location = location || null;
        if (imageUrl) updateData.imageUrl = imageUrl;
        if (isRecurring !== undefined) updateData.isRecurring = isRecurring === 'true' || isRecurring === true;

        const event = await prisma.event.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json(event);
    } catch (error) {
        console.error('Event update error:', error);
        res.status(500).json({ error: 'Failed to update event' });
    }
});

// DELETE event (admin only)
router.delete('/:id', authenticateToken, requirePatriarch, async (req: Request, res: Response) => {
    try {
        await prisma.event.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Event deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

export default router;
