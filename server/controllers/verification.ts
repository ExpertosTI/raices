import { Request, Response } from 'express';
import { prisma } from '../db';
import { sendEmail } from '../services/email';

// Create a verification request (child wants to link to parent)
export const createVerificationRequest = async (req: any, res: Response) => {
    const { parentMemberId, childName, message } = req.body;
    const userId = req.user?.id;

    if (!parentMemberId || !childName) {
        return res.status(400).json({ error: 'Se requiere ID del padre y nombre del hijo' });
    }

    try {
        // Check if parent member exists
        const parentMember = await prisma.familyMember.findUnique({
            where: { id: parentMemberId },
            include: { user: true, branch: true }
        });

        if (!parentMember) {
            return res.status(404).json({ error: 'Miembro no encontrado' });
        }

        // Check if there's already a pending request
        const existingRequest = await prisma.familyVerification.findFirst({
            where: { requesterId: userId, parentMemberId, status: 'PENDING' }
        });

        if (existingRequest) {
            return res.status(400).json({ error: 'Ya tienes una solicitud pendiente' });
        }

        // Create verification request
        const verification = await prisma.familyVerification.create({
            data: {
                requesterId: userId,
                parentMemberId,
                childName: childName.trim(),
                message: message?.trim() || null
            },
            include: {
                requester: { select: { id: true, email: true, name: true, image: true } },
                parentMember: { include: { user: true, branch: true } }
            }
        });

        // Send email notification to parent if they have an email
        if (parentMember.user?.email) {
            try {
                await sendEmail(
                    parentMember.user.email,
                    `🔔 Nueva solicitud de verificación familiar`,
                    `<h2>¡Hola ${parentMember.name}!</h2>
                    <p><strong>${verification.requester.name || verification.requester.email}</strong> quiere registrarse como tu hijo/a en el árbol familiar.</p>
                    <p><strong>Nombre solicitado:</strong> ${childName}</p>
                    ${message ? `<p><strong>Mensaje:</strong> ${message}</p>` : ''}
                    <br>
                    <p>Ingresa a la aplicación para aprobar o rechazar esta solicitud.</p>
                    <p><a href="https://raices.renace.tech">Ir a Raíces</a></p>`
                );
            } catch (emailError) {
                console.error('Failed to send verification email:', emailError);
            }
        }

        res.json({
            message: '✅ Solicitud enviada. El padre recibirá una notificación para confirmar.',
            verification,
            pending: true
        });

    } catch (error) {
        console.error('Create Verification Error:', error);
        res.status(500).json({ error: 'Error al crear solicitud de verificación' });
    }
};

// Get pending verifications for a parent (notifications)
export const getPendingVerifications = async (req: any, res: Response) => {
    const userId = req.user?.id;

    try {
        // Get the family member linked to this user
        const familyMember = await prisma.familyMember.findUnique({
            where: { userId }
        });

        if (!familyMember) {
            return res.json({ incoming: [], outgoing: [] });
        }

        // Get incoming requests (where user is the parent)
        const incoming = await prisma.familyVerification.findMany({
            where: { parentMemberId: familyMember.id, status: 'PENDING' },
            include: {
                requester: { select: { id: true, email: true, name: true, image: true } },
                parentMember: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Get outgoing requests (user's own requests)
        const outgoing = await prisma.familyVerification.findMany({
            where: { requesterId: userId },
            include: {
                parentMember: { select: { id: true, name: true, branch: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ incoming, outgoing });

    } catch (error) {
        console.error('Get Verifications Error:', error);
        res.status(500).json({ error: 'Error al obtener verificaciones' });
    }
};

// Approve a verification request
export const approveVerification = async (req: any, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { reviewNote } = req.body;

    try {
        // Get the verification request
        const verification = await prisma.familyVerification.findUnique({
            where: { id },
            include: { parentMember: true, requester: true }
        });

        if (!verification) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        // Check if user owns the parent member
        const parentMember = await prisma.familyMember.findUnique({
            where: { id: verification.parentMemberId }
        });

        if (!parentMember) {
            return res.status(404).json({ error: 'Miembro padre no encontrado' });
        }

        if (parentMember.userId !== userId) {
            return res.status(403).json({ error: 'No tienes permiso para aprobar esta solicitud' });
        }

        // Get the branch from parent
        const branchId = parentMember.branchId;

        // Determine the relation based on parent's relation
        let childRelation = 'CHILD';
        if (parentMember.relation === 'CHILD') childRelation = 'GRANDCHILD';
        if (parentMember.relation === 'GRANDCHILD') childRelation = 'GREAT_GRANDCHILD';

        // Check if user is already linked to a family member
        const existingMember = await prisma.familyMember.findUnique({
            where: { userId: verification.requesterId }
        });

        let newMember;

        if (existingMember) {
            // Update the existing member to link to this parent
            newMember = await prisma.familyMember.update({
                where: { id: existingMember.id },
                data: {
                    parentId: parentMember.id,
                    branchId: branchId || existingMember.branchId,
                    relation: childRelation as any
                }
            });
        } else {
            // Create the new family member
            newMember = await prisma.familyMember.create({
                data: {
                    name: verification.childName,
                    branchId,
                    relation: childRelation as any,
                    parentId: parentMember.id,
                    userId: verification.requesterId // Link to the requester's account
                }
            });
        }

        // Update verification status
        await prisma.familyVerification.update({
            where: { id },
            data: {
                status: 'APPROVED',
                reviewedAt: new Date(),
                reviewNote
            }
        });

        // Send email to requester
        if (verification.requester.email) {
            try {
                await sendEmail(
                    verification.requester.email,
                    `✅ ¡Bienvenido a la familia!`,
                    `<h2>¡Felicidades ${verification.childName}!</h2>
                    <p>${parentMember.name} ha confirmado tu relación familiar.</p>
                    <p>Ya estás vinculado/a al árbol genealógico de la familia.</p>
                    <br>
                    <p><a href="https://raices.renace.tech">Ver el árbol familiar</a></p>`
                );
            } catch (emailError) {
                console.error('Failed to send approval email:', emailError);
            }
        }

        res.json({
            message: '✅ Verificación aprobada. El nuevo miembro ha sido agregado al árbol.',
            member: newMember
        });

    } catch (error) {
        console.error('Approve Verification Error:', error);
        res.status(500).json({ error: 'Error al aprobar verificación' });
    }
};

// Reject a verification request
export const rejectVerification = async (req: any, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { reviewNote, sendToAdmin } = req.body;

    try {
        const verification = await prisma.familyVerification.findUnique({
            where: { id },
            include: { parentMember: true, requester: true }
        });

        if (!verification) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        const parentMember = await prisma.familyMember.findUnique({
            where: { id: verification.parentMemberId }
        });

        if (!parentMember) {
            return res.status(404).json({ error: 'Miembro padre no encontrado' });
        }

        if (parentMember.userId !== userId) {
            return res.status(403).json({ error: 'No tienes permiso para rechazar esta solicitud' });
        }

        // Update to rejected or admin review
        await prisma.familyVerification.update({
            where: { id },
            data: {
                status: sendToAdmin ? 'ADMIN_REVIEW' : 'REJECTED',
                reviewedAt: new Date(),
                reviewNote
            }
        });

        // Send email to requester
        if (verification.requester.email) {
            try {
                await sendEmail(
                    verification.requester.email,
                    sendToAdmin ? '🔍 Solicitud en revisión' : '❌ Solicitud no aprobada',
                    sendToAdmin
                        ? `<p>Tu solicitud para ser hijo/a de ${parentMember.name} ha sido enviada a revisión por un administrador.</p>`
                        : `<p>Tu solicitud para ser hijo/a de ${parentMember.name} no fue aprobada.</p>
                           ${reviewNote ? `<p><strong>Motivo:</strong> ${reviewNote}</p>` : ''}`
                );
            } catch (emailError) {
                console.error('Failed to send rejection email:', emailError);
            }
        }

        res.json({
            message: sendToAdmin
                ? 'Solicitud enviada a revisión administrativa'
                : 'Solicitud rechazada'
        });

    } catch (error) {
        console.error('Reject Verification Error:', error);
        res.status(500).json({ error: 'Error al rechazar verificación' });
    }
};

// Get all verifications for admin
export const getAdminVerifications = async (req: any, res: Response) => {
    try {
        const verifications = await prisma.familyVerification.findMany({
            where: { status: { in: ['PENDING', 'ADMIN_REVIEW'] } },
            include: {
                requester: { select: { id: true, email: true, name: true, image: true } },
                parentMember: { include: { branch: true, user: { select: { email: true } } } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const registrations = await prisma.registrationRequest.findMany({
            where: { status: 'PENDING' },
            include: {
                user: { select: { id: true, email: true, name: true, image: true } },
                branch: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Normalize data for UI
        const normalized = [
            ...verifications.map(v => ({
                id: v.id,
                type: 'VERIFICATION',
                childName: v.childName,
                message: v.message,
                status: v.status,
                createdAt: v.createdAt,
                requester: v.requester,
                parentMember: v.parentMember,
                reviewNote: v.reviewNote
            })),
            ...registrations.map(r => ({
                id: r.id,
                type: 'REGISTRATION',
                childName: r.name, // The person registering
                message: `Solicitud Manual: Hijo de ${r.parentName} (${r.parentType || 'Padre/Madre'})`,
                status: r.status,
                createdAt: r.createdAt,
                requester: r.user,
                parentMember: {
                    name: r.parentName || 'Desconocido',
                    branch: r.branch
                },
                details: {
                    nickname: r.nickname,
                    birthDate: r.birthDate,
                    phone: r.phone,
                    skills: r.skills,
                    grandparentId: r.grandparentId
                }
            }))
        ];

        // Sort by date desc
        normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json(normalized);

    } catch (error) {
        console.error('Get Admin Verifications Error:', error);
        res.status(500).json({ error: 'Error al obtener verificaciones' });
    }
};
