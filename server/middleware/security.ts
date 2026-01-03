import { Request, Response, NextFunction } from 'express';

// ==================== SECURITY HEADERS ====================
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // XSS Protection (legacy but still useful)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // HSTS (HTTP Strict Transport Security) - 1 year
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Content Security Policy
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://accounts.google.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https: blob:; " +
        "connect-src 'self' https://accounts.google.com https://*.googleapis.com; " +
        "frame-src 'self' https://accounts.google.com; " +
        "object-src 'none'; " +
        "base-uri 'self';"
    );

    // Permissions Policy (restrict browser features)
    res.setHeader('Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=()'
    );

    next();
};

// ==================== RATE LIMITER (Improved) ====================
interface RateLimitRecord {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore) {
        if (now > record.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

export const createRateLimiter = (limit: number, windowMs: number) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const record = rateLimitStore.get(ip);

        if (!record || now > record.resetTime) {
            rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
            return next();
        }

        if (record.count >= limit) {
            res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
            return res.status(429).json({
                error: 'Demasiadas solicitudes. Intenta en unos minutos.',
                retryAfter: Math.ceil((record.resetTime - now) / 1000)
            });
        }

        record.count++;
        next();
    };
};

// Pre-configured limiters
export const apiLimiter = createRateLimiter(200, 60 * 1000); // 200 req/min
export const authLimiter = createRateLimiter(30, 60 * 1000);  // 30 auth attempts/min
export const strictLimiter = createRateLimiter(10, 60 * 1000); // 10 req/min for sensitive ops

// ==================== JWT VALIDATION ====================
export const validateJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        console.error('❌ CRITICAL: JWT_SECRET must be at least 32 characters!');
        if (process.env.NODE_ENV === 'production') {
            process.exit(1); // Halt server in production if secret is weak
        }
    }
};

// ==================== ENVIRONMENT VALIDATION ====================
export const validateEnvironment = () => {
    const required = ['DATABASE_URL'];
    const productionRequired = ['JWT_SECRET', 'GOOGLE_CLIENT_ID', 'SMTP_USER', 'SMTP_PASS'];

    const missing: string[] = [];

    for (const key of required) {
        if (!process.env[key]) missing.push(key);
    }

    if (process.env.NODE_ENV === 'production') {
        for (const key of productionRequired) {
            if (!process.env[key]) missing.push(key);
        }
    }

    if (missing.length > 0) {
        console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }

    console.log('✅ Environment validation passed');
};
