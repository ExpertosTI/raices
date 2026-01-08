import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireFamily, requireFamilyAdmin } from '../middleware/family';
import { upload, processImage } from '../middleware/upload';

const router = Router();

// GET all events (filtered by user's family)
router.get('/', authenticateToken, requireFamily, async (req: AuthRequest, res: Response) => {
    try {
        const familyId = req.familyId!;

        // Get manual events for this family
        const manualEvents = await prisma.event.findMany({
            where: {
                familyId, // Multi-tenant filter
                date: { gte: new Date() }
            },
            orderBy: { date: 'asc' },
            take: 50
        });

        // Get birthdays from family members
        const members = await prisma.familyMember.findMany({
            where: {
                familyId, // Multi-tenant filter
                birthDate: { not: null }
            },
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

// GET single event (verify family ownership)
router.get('/:id', authenticateToken, requireFamily, async (req: AuthRequest, res: Response) => {
    try {
        const event = await prisma.event.findFirst({
            where: {
                id: req.params.id,
                familyId: req.familyId // Verify event belongs to user's family
            }
        });
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch event' });
    }
});

// CREATE event (family admin only)
router.post('/', authenticateToken, requireFamilyAdmin, upload.single('image'), processImage, async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, date, endDate, type, location, isRecurring } = req.body;
        const imageUrl = (req as any).body.imageUrl;
        const familyId = req.familyId!;

        if (!title || !date) {
            return res.status(400).json({ error: 'Title and date are required' });
        }

        const event = await prisma.event.create({
            data: {
                familyId, // Multi-tenant
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

// UPDATE event (family admin only)
router.put('/:id', authenticateToken, requireFamilyAdmin, upload.single('image'), processImage, async (req: AuthRequest, res: Response) => {
    try {
        const familyId = req.familyId!;
        const { title, description, date, endDate, type, location, isRecurring } = req.body;
        const imageUrl = (req as any).body.imageUrl;

        // Verify event belongs to user's family
        const existingEvent = await prisma.event.findFirst({
            where: { id: req.params.id, familyId }
        });
        if (!existingEvent) {
            return res.status(404).json({ error: 'Event not found' });
        }

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

// DELETE event (family admin only)
router.delete('/:id', authenticateToken, requireFamilyAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const familyId = req.familyId!;

        // Verify event belongs to user's family
        const existingEvent = await prisma.event.findFirst({
            where: { id: req.params.id, familyId }
        });
        if (!existingEvent) {
            return res.status(404).json({ error: 'Event not found' });
        }

        await prisma.event.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Event deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

export default router;
