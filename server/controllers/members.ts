import { Request, Response } from 'express';
import { prisma } from '../db';

// Claim a Patriarch Profile
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
            include: { user: true }
        });

        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        if (member.user) {
            return res.status(400).json({ error: 'This profile has already been claimed' });
        }

        // 2. Perform Link (Simulate Email Confirmation here)
        console.log(`[EMAIL SIMULATION] Sending confirmation email to user ${userId} for claiming member ${member.name}`);

        // Update Member with User ID
        await prisma.familyMember.update({
            where: { id: memberId },
            data: { userId: userId }
        });

        // Update User Role to PATRIARCH (if claiming a patriarch/sibling)
        // We assume the initial 12 are patriarchs/siblings
        if (member.relation === 'PATRIARCH' || member.relation === 'SIBLING') {
            await prisma.user.update({
                where: { id: userId },
                data: { role: 'PATRIARCH' }
            });
        }

        res.json({ message: 'Profile claimed successfully', member });

    } catch (error) {
        console.error('Claim Profile Error:', error);
        res.status(500).json({ error: 'Failed to claim profile' });
    }
};
