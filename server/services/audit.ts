import { prisma } from '../db';

interface AuditLogInput {
    userId: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: Record<string, any>;
}

/**
 * Log an admin action for audit trail
 */
export async function logAudit(input: AuditLogInput): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                userId: input.userId,
                action: input.action,
                targetType: input.targetType,
                targetId: input.targetId,
                details: input.details ? JSON.stringify(input.details) : null
            }
        });
    } catch (error) {
        // Log but don't throw - audit failures shouldn't break the main operation
        console.error('[Audit] Failed to log action:', error);
    }
}

/**
 * Common audit actions
 */
export const AuditActions = {
    // Members
    DELETE_MEMBER: 'DELETE_MEMBER',
    UNCLAIM_MEMBER: 'UNCLAIM_MEMBER',
    UPDATE_MEMBER: 'UPDATE_MEMBER',

    // Claims
    APPROVE_CLAIM: 'APPROVE_CLAIM',
    REJECT_CLAIM: 'REJECT_CLAIM',

    // Registrations
    APPROVE_REGISTRATION: 'APPROVE_REGISTRATION',
    REJECT_REGISTRATION: 'REJECT_REGISTRATION',

    // Users
    UPDATE_USER_ROLE: 'UPDATE_USER_ROLE',

    // System
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT'
} as const;
