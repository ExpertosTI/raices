import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { upload, processImage } from '../middleware/upload';
import { validatePostInput } from '../middleware/validation';
import { getFeed, createPost, likePost, createComment, deletePost } from '../controllers/feed';

const router = Router();

// Get feed posts
router.get('/', getFeed);

// Create post with optional image
router.post('/',
    authenticateToken,
    upload.single('image'),
    processImage,
    validatePostInput,
    createPost
);

// Like a post
router.post('/:id/like', authenticateToken, likePost);

// Comment on a post
router.post('/:id/comment', authenticateToken, createComment);

// Delete a post
router.delete('/:id', authenticateToken, deletePost);

export default router;
