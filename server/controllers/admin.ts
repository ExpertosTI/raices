import { Request, Response } from 'express';
import { prisma } from '../db';
import { sendEmail } from '../services/email';

// Get all pending claims (Admin only)
export const getPendingClaims = async (req: any, res: Response) => {
    try {
        const claims = await prisma.pendingClaim.findMany({
            where: { status: 'PENDING' },
            include: {
                user: { select: { id: true, email: true, name: true, image: true } },
                member: { select: { id: true, name: true, birthDate: true, relation: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(claims);
    } catch (error) {
        console.error('Get Pending Claims Error:', error);
        res.status(500).json({ error: 'Failed to fetch pending claims' });
    }
};

// Approve a claim (Admin only)
export const approveClaim = async (req: any, res: Response) => {
    const { id } = req.params;

    try {
        const claim = await prisma.pendingClaim.findUnique({
            where: { id },
            include: { user: true, member: true }
        });

        if (!claim) {
            return res.status(404).json({ error: 'Claim not found' });
        }

        if (claim.status !== 'PENDING') {
            return res.status(400).json({ error: 'Claim already processed' });
        }

        // Link user to member
        await prisma.familyMember.update({
            where: { id: claim.memberId },
            data: { userId: claim.userId }
        });

        // Update user role to PATRIARCH
        await prisma.user.update({
            where: { id: claim.userId },
            data: { role: 'PATRIARCH' }
        });

        // Update claim status
        await prisma.pendingClaim.update({
            where: { id },
            data: { status: 'APPROVED' }
        });

        // Send approval email
        try {
            await sendEmail(
                claim.user.email,
                '✅ Tu reclamo ha sido aprobado - Raíces App',
                `<h2>¡Felicidades, ${claim.user.name}!</h2>
                <p>Tu reclamo como <strong>${claim.member.name}</strong> ha sido aprobado.</p>
                <p>Ahora tienes permisos de Patriarca y puedes gestionar tu rama familiar.</p>
                <br><p>- El equipo de Raíces</p>`
            );
        } catch (emailError) {
            console.error('Failed to send approval email:', emailError);
        }

        res.json({ message: 'Claim approved successfully' });
    } catch (error) {
        console.error('Approve Claim Error:', error);
        res.status(500).json({ error: 'Failed to approve claim' });
    }
};

// Reject a claim (Admin only)
export const rejectClaim = async (req: any, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    try {
        const claim = await prisma.pendingClaim.findUnique({
            where: { id },
            include: { user: true, member: true }
        });

        if (!claim) {
            return res.status(404).json({ error: 'Claim not found' });
        }

        await prisma.pendingClaim.update({
            where: { id },
            data: { status: 'REJECTED' }
        });

        // Send rejection email
        try {
            await sendEmail(
                claim.user.email,
                '❌ Tu reclamo no fue aprobado - Raíces App',
                `<h2>Hola ${claim.user.name},</h2>
                <p>Lamentamos informarte que tu reclamo como <strong>${claim.member.name}</strong> no fue aprobado.</p>
                ${reason ? `<p><strong>Razón:</strong> ${reason}</p>` : ''}
                <p>Si crees que esto es un error, contacta al administrador.</p>
                <br><p>- El equipo de Raíces</p>`
            );
        } catch (emailError) {
            console.error('Failed to send rejection email:', emailError);
        }

        res.json({ message: 'Claim rejected' });
    } catch (error) {
        console.error('Reject Claim Error:', error);
        res.status(500).json({ error: 'Failed to reject claim' });
    }
};

// Get all registration requests (Admin only)
export const getRegistrationRequests = async (req: any, res: Response) => {
    try {
        const requests = await prisma.registrationRequest.findMany({
            where: { status: 'PENDING' },
            include: {
                user: { select: { id: true, email: true, name: true, image: true } },
                branch: { select: { id: true, name: true, color: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    } catch (error) {
        console.error('Get Registration Requests Error:', error);
        res.status(500).json({ error: 'Failed to fetch registration requests' });
    }
};

// Approve a registration request (Admin only)
export const approveRegistration = async (req: any, res: Response) => {
    const { id } = req.params;

    try {
        const request = await prisma.registrationRequest.findUnique({
            where: { id },
            include: { user: true, branch: true }
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({ error: 'Request already processed' });
        }

        // Create the FamilyMember from the request
        const member = await prisma.familyMember.create({
            data: {
                userId: request.userId,
                branchId: request.branchId,
                name: request.name,
                birthDate: request.birthDate,
                relation: request.relation as any,
                phone: request.phone,
                whatsapp: request.whatsapp,
                bio: request.bio,
                preferredColor: request.preferredColor,
                parentId: request.grandparentId // Link to the grandparent initially
            }
        });

        // Update request status
        await prisma.registrationRequest.update({
            where: { id },
            data: { status: 'APPROVED' }
        });

        // Send approval email
        try {
            await sendEmail(
                request.user.email,
                '✅ Tu registro ha sido aprobado - Raíces App',
                `<h2>¡Bienvenido a la familia, ${request.name}!</h2>
                <p>Tu registro como descendiente de <strong>${request.branch.name}</strong> ha sido aprobado.</p>
                <p>Ya puedes ver tu perfil en el árbol familiar.</p>
                <br><p>- El equipo de Raíces</p>`
            );
        } catch (emailError) {
            console.error('Failed to send approval email:', emailError);
        }

        res.json({ message: 'Registration approved', member });
    } catch (error) {
        console.error('Approve Registration Error:', error);
        res.status(500).json({ error: 'Failed to approve registration' });
    }
};

// Reject a registration request (Admin only)
export const rejectRegistration = async (req: any, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    try {
        const request = await prisma.registrationRequest.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        await prisma.registrationRequest.update({
            where: { id },
            data: { status: 'REJECTED' }
        });

        // Send rejection email
        try {
            await sendEmail(
                request.user.email,
                '❌ Tu registro no fue aprobado - Raíces App',
                `<h2>Hola ${request.name},</h2>
                <p>Lamentamos informarte que tu solicitud de registro no fue aprobada.</p>
                ${reason ? `<p><strong>Razón:</strong> ${reason}</p>` : ''}
                <p>Si crees que esto es un error, contacta al administrador.</p>
                <br><p>- El equipo de Raíces</p>`
            );
        } catch (emailError) {
            console.error('Failed to send rejection email:', emailError);
        }

        res.json({ message: 'Registration rejected' });
    } catch (error) {
        console.error('Reject Registration Error:', error);
        res.status(500).json({ error: 'Failed to reject registration' });
    }
};

// Get all users (Admin only)
export const getAllUsers = async (req: any, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                familyMember: { select: { id: true, name: true, relation: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        console.error('Get All Users Error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

// Update user role (Admin only)
export const updateUserRole = async (req: any, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!['MEMBER', 'PATRIARCH'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    try {
        const user = await prisma.user.update({
            where: { id },
            data: { role }
        });

        res.json({ message: 'Role updated', user });
    } catch (error) {
        console.error('Update User Role Error:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
};
