import { Request, Response } from 'express';
import { prisma } from '../db';

// Get all posts (feed)
export const getFeed = async (req: Request, res: Response) => {
    try {
        const posts = await prisma.post.findMany({
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

// Create a post
export const createPost = async (req: any, res: Response) => {
    const { content, imageUrl } = req.body;

    if (!content) return res.status(400).json({ error: 'Content required' });

    try {
        const post = await prisma.post.create({
            data: {
                content,
                imageUrl,
                userId: req.user.id
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
