import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. Multer Config (Memory Storage)
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.'));
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit before compression
});

// 2. Image Processing Middleware
export const processImage = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) return next();

    try {
        const filename = `${uuidv4()}.webp`;
        const outputPath = path.join(uploadDir, filename);

        // Security: Sharp sanitizes basic metadata by default when creating new images
        await sharp(req.file.buffer)
            .resize(1200, 1200, { // Max 1200x1200px
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({ quality: 80, effort: 4 }) // 80% quality, effort 4 (balanced)
            .toFile(outputPath);

        // Replace req.file information with the new processed file
        req.file.filename = filename;
        req.file.path = outputPath;
        req.file.mimetype = 'image/webp';

        // Expose the public URL
        req.body.imageUrl = `/uploads/${filename}`;

        next();
    } catch (error) {
        console.error('Image processing error:', error);
        res.status(500).json({ error: 'Error processing image' });
    }
};
