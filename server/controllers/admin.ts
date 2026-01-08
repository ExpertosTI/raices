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

        // Note: We don't change user role here - admin assigns roles manually

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
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({ error: 'Esta solicitud ya fue procesada' });
        }

        // Check if user already has a FamilyMember linked
        const existingMember = await prisma.familyMember.findUnique({
            where: { userId: request.userId }
        });

        if (existingMember) {
            return res.status(400).json({
                error: `Este usuario ya está vinculado a "${existingMember.name}". Primero debes desvincular ese perfil desde la pestaña Usuarios.`
            });
        }

        // Create the FamilyMember from the request
        const member = await prisma.familyMember.create({
            data: {
                userId: request.userId,
                branchId: request.branchId,
                name: request.name,
                birthDate: request.birthDate,
                relation: request.relation as any,
                phone: request.phone || null,
                whatsapp: request.whatsapp || null,
                bio: request.bio || null,
                preferredColor: request.preferredColor || null,
                parentId: null,

                nickname: request.nickname || null,
                skills: request.skills || []
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

        res.json({ message: 'Registro aprobado', member });
    } catch (error: any) {
        console.error('Approve Registration Error:', error);
        console.error('Error details:', error.message);
        res.status(500).json({ error: 'Error al aprobar registro. Detalles: ' + (error.message || 'Unknown') });
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

// Get all users (Admin only) - filtered by family
export const getAllUsers = async (req: any, res: Response) => {
    try {
        const familyId = req.user?.familyId;
        const users = await prisma.user.findMany({
            where: familyId ? { familyId } : {},
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

    if (!['MEMBER', 'ADMIN', 'SUPERADMIN'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Valid roles: MEMBER, ADMIN, SUPERADMIN' });
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

// Get all family members (Admin Audit) - filtered by family
export const getAllMembers = async (req: any, res: Response) => {
    try {
        const familyId = req.user?.familyId;
        const members = await prisma.familyMember.findMany({
            where: familyId ? { familyId } : {},
            include: {
                branch: { select: { name: true, color: true } },
                user: { select: { id: true, email: true, name: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.json(members);
    } catch (error) {
        console.error('Get All Members Error:', error);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
};

// Link a user to a family member (Admin only)
export const linkUserToMember = async (req: any, res: Response) => {
    const { id: userId } = req.params;
    const { memberId, createNew, name, branchId, relation, parentId } = req.body;

    try {
        // Check user exists
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Check if user is already linked
        const existingLink = await prisma.familyMember.findUnique({ where: { userId } });
        if (existingLink) {
            return res.status(400).json({
                error: `Este usuario ya está vinculado a "${existingLink.name}". Primero desvincúlalo.`
            });
        }

        let member;

        if (createNew) {
            // Create a new family member for this user
            if (!name || !branchId) {
                return res.status(400).json({ error: 'Nombre y rama son requeridos para crear un nuevo miembro' });
            }

            member = await prisma.familyMember.create({
                data: {
                    name,
                    branchId,
                    relation: relation || 'CHILD',
                    parentId: parentId || null,
                    userId
                }
            });
        } else {
            // Link to existing member
            if (!memberId) {
                return res.status(400).json({ error: 'Se requiere memberId para vincular a un miembro existente' });
            }

            const targetMember = await prisma.familyMember.findUnique({ where: { id: memberId } });
            if (!targetMember) {
                return res.status(404).json({ error: 'Miembro no encontrado' });
            }

            if (targetMember.userId) {
                return res.status(400).json({ error: 'Este miembro ya está vinculado a otro usuario' });
            }

            member = await prisma.familyMember.update({
                where: { id: memberId },
                data: { userId }
            });
        }

        // Send notification email to the user
        try {
            await sendEmail(
                user.email,
                '🔗 Tu cuenta ha sido vinculada - Raíces App',
                `<h2>¡Hola ${user.name || 'Usuario'}!</h2>
                <p>Un administrador te ha vinculado al perfil de <strong>${member.name}</strong> en el árbol familiar.</p>
                <p>Ya puedes ver y editar tu perfil en la aplicación.</p>
                <br><p>- El equipo de Raíces</p>`
            );
        } catch (emailError) {
            console.error('Failed to send link notification email:', emailError);
        }

        res.json({
            message: `✅ Usuario vinculado a "${member.name}" correctamente`,
            member
        });

    } catch (error) {
        console.error('Link User to Member Error:', error);
        res.status(500).json({ error: 'Error al vincular usuario' });
    }
};
