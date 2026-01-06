import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../db';
import { UserRole } from '@prisma/client';
import { sendEmail } from '../services/email';
import { getVerificationCodeTemplate, getPasswordResetTemplate, getWelcomeTemplate } from '../services/templates';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const SALT_ROUNDS = 12;

// Helper: Generate 6-digit verification code
const generateVerificationCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper: Create verification token with 15 min expiry
const createVerificationToken = async (identifier: string, type: 'email' | 'password-reset'): Promise<string> => {
    const code = generateVerificationCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing tokens for this identifier
    await prisma.verificationToken.deleteMany({
        where: { identifier: `${type}:${identifier}` }
    });

    // Create new token
    await prisma.verificationToken.create({
        data: {
            identifier: `${type}:${identifier}`,
            token: code,
            expires
        }
    });

    return code;
};

// ==================== EMAIL AUTHENTICATION ====================

// Register with Email/Password
export const registerWithEmail = async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser) {
            if (existingUser.password) {
                return res.status(400).json({ error: 'Este email ya está registrado. Intenta iniciar sesión.' });
            } else {
                // User exists via OAuth, allow adding password
                return res.status(400).json({
                    error: 'Este email ya está registrado con Google. Inicia sesión con Google.'
                });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user (not verified yet)
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: name || email.split('@')[0],
                role: 'MEMBER' as UserRole
            }
        });

        // Generate verification code and send email
        const code = await createVerificationToken(email, 'email');
        await sendEmail(
            email,
            'Verifica tu cuenta - Raíces',
            getVerificationCodeTemplate(user.name || 'Usuario', code)
        );

        res.json({
            success: true,
            message: 'Cuenta creada. Revisa tu email para el código de verificación.',
            requiresVerification: true
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Error al crear la cuenta' });
    }
};

// Verify Email with Code
export const verifyEmail = async (req: Request, res: Response) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ error: 'Email y código son requeridos' });
    }

    try {
        // Find valid token
        const token = await prisma.verificationToken.findFirst({
            where: {
                identifier: `email:${email}`,
                token: code,
                expires: { gte: new Date() }
            }
        });

        if (!token) {
            return res.status(400).json({ error: 'Código inválido o expirado' });
        }

        // Update user as verified
        const user = await prisma.user.update({
            where: { email },
            data: { emailVerified: new Date() },
            include: { familyMember: true }
        });

        // Delete used token
        await prisma.verificationToken.delete({
            where: { identifier_token: { identifier: token.identifier, token: token.token } }
        });

        // Send welcome email
        await sendEmail(email, '¡Bienvenido a Raíces!', getWelcomeTemplate(user.name || 'Usuario'));

        // Generate JWT
        const jwtToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token: jwtToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                familyMember: user.familyMember
            }
        });

    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({ error: 'Error al verificar el código' });
    }
};

// Resend Verification Code
export const resendVerification = async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email es requerido' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (user.emailVerified) {
            return res.status(400).json({ error: 'Este email ya está verificado' });
        }

        // Generate and send new code
        const code = await createVerificationToken(email, 'email');
        await sendEmail(
            email,
            'Nuevo código de verificación - Raíces',
            getVerificationCodeTemplate(user.name || 'Usuario', code)
        );

        res.json({ success: true, message: 'Código reenviado. Revisa tu email.' });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Error al reenviar el código' });
    }
};

// Login with Email/Password
export const loginWithEmail = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { familyMember: true }
        });

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        if (!user.password) {
            return res.status(400).json({
                error: 'Esta cuenta usa Google para iniciar sesión. Usa el botón de Google.'
            });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Check if email is verified
        if (!user.emailVerified) {
            // Send new verification code
            const code = await createVerificationToken(email, 'email');
            await sendEmail(
                email,
                'Verifica tu cuenta - Raíces',
                getVerificationCodeTemplate(user.name || 'Usuario', code)
            );

            return res.status(403).json({
                error: 'Email no verificado. Te enviamos un nuevo código.',
                requiresVerification: true
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                role: user.role,
                familyMember: user.familyMember
            }
        });

    } catch (error) {
        console.error('Email login error:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
};

// Forgot Password - Send Reset Code
export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email es requerido' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        // Always return success to prevent email enumeration
        if (!user || !user.password) {
            return res.json({ success: true, message: 'Si el email existe, recibirás un código.' });
        }

        const code = await createVerificationToken(email, 'password-reset');
        await sendEmail(
            email,
            'Recupera tu contraseña - Raíces',
            getPasswordResetTemplate(user.name || 'Usuario', code)
        );

        res.json({ success: true, message: 'Código enviado. Revisa tu email.' });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
};

// Reset Password with Code
export const resetPassword = async (req: Request, res: Response) => {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
        return res.status(400).json({ error: 'Email, código y nueva contraseña son requeridos' });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    try {
        // Find valid token
        const token = await prisma.verificationToken.findFirst({
            where: {
                identifier: `password-reset:${email}`,
                token: code,
                expires: { gte: new Date() }
            }
        });

        if (!token) {
            return res.status(400).json({ error: 'Código inválido o expirado' });
        }

        // Hash new password and update user
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });

        // Delete used token
        await prisma.verificationToken.delete({
            where: { identifier_token: { identifier: token.identifier, token: token.token } }
        });

        res.json({ success: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Error al cambiar la contraseña' });
    }
};

// ==================== GOOGLE OAUTH ====================

// Google OAuth Login
export const googleLogin = async (req: Request, res: Response) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ error: 'Google credential is required' });
    }

    try {
        // Verify Google Token
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload) {
            return res.status(400).json({ error: 'Invalid Google Token' });
        }

        const { email, name, picture, sub: googleId } = payload;

        if (!email) {
            return res.status(400).json({ error: 'Email not found in Google Token' });
        }

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { email },
            include: { familyMember: true }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    emailVerified: new Date(), // Google emails are pre-verified
                    name: name || email.split('@')[0],
                    image: picture,
                    role: ((email === process.env.ADMIN_EMAIL || email === 'expertostird@gmail.com') ? 'PATRIARCH' : 'MEMBER') as UserRole
                },
                include: { familyMember: true }
            });
        } else if (!user.emailVerified) {
            // Mark as verified if logging in via Google
            user = await prisma.user.update({
                where: { email },
                data: { emailVerified: new Date() },
                include: { familyMember: true }
            });
        }

        // Link Account if not exists
        const account = await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider: 'google',
                    providerAccountId: googleId
                }
            }
        });

        if (!account) {
            await prisma.account.create({
                data: {
                    userId: user.id,
                    type: 'oauth',
                    provider: 'google',
                    providerAccountId: googleId,
                    id_token: credential
                }
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                role: user.role,
                familyMember: user.familyMember
            }
        });

    } catch (error) {
        console.error('Google Login error:', error);
        res.status(500).json({ error: 'Failed to verify Google Token' });
    }
};

// ==================== UTILITY ====================

// Mock login for development
export const login = async (req: Request, res: Response) => {
    const { email, name } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    name: name || email.split('@')[0],
                    role: 'MEMBER'
                }
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
};

// Get current user from token
export const me = async (req: any, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                familyMember: {
                    include: {
                        branch: true,
                        children: {
                            orderBy: { birthDate: 'asc' },
                            select: { id: true, name: true, birthDate: true, photo: true, relation: true }
                        }
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            familyMember: user.familyMember,
            image: user.image,
            emailVerified: !!user.emailVerified
        });
    } catch (error) {
        console.error('Me error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};
