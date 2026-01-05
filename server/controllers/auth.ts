import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../db';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Google OAuth Login - supports both ID token (credential) and Access Token flows
export const googleLogin = async (req: Request, res: Response) => {
    const { credential, accessToken } = req.body;

    if (!credential && !accessToken) {
        return res.status(400).json({ error: 'Google credential or accessToken is required' });
    }

    try {
        let email: string | undefined;
        let name: string | undefined;
        let picture: string | undefined;
        let googleId: string;

        if (credential) {
            // ID Token flow (web browser with popup)
            const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();

            if (!payload) {
                return res.status(400).json({ error: 'Invalid Google Token' });
            }

            email = payload.email;
            name = payload.name;
            picture = payload.picture;
            googleId = payload.sub;
        } else {
            // Access Token flow (Capacitor / mobile WebView)
            const userInfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);

            if (!userInfoRes.ok) {
                return res.status(400).json({ error: 'Invalid access token' });
            }

            const userInfo = await userInfoRes.json();
            email = userInfo.email;
            name = userInfo.name;
            picture = userInfo.picture;
            googleId = userInfo.sub;
        }

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
                    name: name || email.split('@')[0],
                    image: picture,
                    role: ((email === process.env.ADMIN_EMAIL || email === 'expertostird@gmail.com') ? 'PATRIARCH' : 'MEMBER') as UserRole
                },
                include: { familyMember: true }
            });
        }

        // Link Account if not exists (optional but good for tracking)
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
                    id_token: credential || undefined,
                    access_token: accessToken || undefined
                }
            });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
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
        console.error(`Config Check: CLIENT_ID_LEN=${process.env.GOOGLE_CLIENT_ID?.length}`);
        res.status(500).json({ error: 'Failed to verify Google Token', details: error instanceof Error ? error.message : String(error) });
    }
};

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
                    include: { branch: true }
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
            image: user.image
        });
    } catch (error) {
        console.error('Me error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};
