import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

// Get all posts (feed) - filtered by user's family
export const getFeed = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;

        // Get user's familyId
        const user = userId ? await prisma.user.findUnique({
            where: { id: userId },
            select: { familyId: true }
        }) : null;

        // If user has no family, return empty feed
        if (!user?.familyId) {
            return res.json([]);
        }

        const posts = await prisma.post.findMany({
            where: { familyId: user.familyId }, // Filter by family
            include: {
                user: { select: { name: true, image: true, id: true } },
                comments: {
                    include: {
                        user: { select: { name: true, image: true } }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch feed' });
    }
};

// Create a post - assigns user's familyId
export const createPost = async (req: any, res: Response) => {
    const { content, imageUrl } = req.body;
    const userId = req.user?.id;

    if (!content) return res.status(400).json({ error: 'Content required' });

    try {
        // Get user's familyId
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { familyId: true }
        });

        if (!user?.familyId) {
            return res.status(403).json({ error: 'Debes pertenecer a una familia' });
        }

        const post = await prisma.post.create({
            data: {
                content,
                imageUrl,
                userId,
                familyId: user.familyId // Multi-tenant
            }
        });
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create post' });
    }
};

// Like a post
export const likePost = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Increment like count (simple implementation)
        const post = await prisma.post.update({
            where: { id },
            data: { likes: { increment: 1 } }
        });
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: 'Failed to like post' });
    }
};

// Create a comment on a post
export const createComment = async (req: any, res: Response) => {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) return res.status(400).json({ error: 'Content required' });

    try {
        const comment = await prisma.comment.create({
            data: {
                content,
                postId: id,
                userId: req.user.id
            },
            include: {
                user: { select: { name: true, image: true } }
            }
        });
        res.json(comment);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create comment' });
    }
};

// Delete a post
export const deletePost = async (req: any, res: Response) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        const post = await prisma.post.findUnique({ where: { id } });
        if (!post) return res.status(404).json({ error: 'Post not found' });

        if (post.userId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await prisma.post.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
};
