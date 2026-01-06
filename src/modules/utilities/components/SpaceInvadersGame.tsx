import { useState, useEffect, useRef } from 'react';
import type { TouchEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../../components/FloatingDock';
import { getFamilyMembers } from '../../../services/api';
import { soundManager } from '../../../utils/SoundManager';
import './SpaceInvadersGame.css';

const CANVAS_WIDTH = 350;
const CANVAS_HEIGHT = 500;
const ENEMY_SIZE = 30; // Slightly bigger
const BULLET_SIZE = 5;

// Powerup types
type PowerupType = 'TRIPLE' | 'LASER' | 'SHIELD';
const POWERUP_DURATION = 5000; // 5 seconds

export const SpaceInvadersGame = () => {
    const navigate = useNavigate();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [victory, setVictory] = useState(false);
    const [activePowerup, setActivePowerup] = useState<PowerupType | null>(null);

    // Game State
    const playerX = useRef(CANVAS_WIDTH / 2);
    const bullets = useRef<{ x: number; y: number; type: 'NORMAL' | 'LASER' }[]>([]);
    const enemies = useRef<{ x: number; y: number; image?: HTMLImageElement }[]>([]);
    const fallingUncles = useRef<{ x: number; y: number; type: PowerupType; image?: HTMLImageElement }[]>([]);

    const enemyDirection = useRef(1);
    const enemySpeed = useRef(1);
    const animationFrame = useRef<number | undefined>(undefined);
    const lastShot = useRef(0);
    const powerupTimer = useRef<NodeJS.Timeout | null>(null);

    // Assets
    const imagesCache = useRef<HTMLImageElement[]>([]);
    const uncleImages = useRef<HTMLImageElement[]>([]); // Subset for powerups

    useEffect(() => {
        loadAssets();
        return () => {
            if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
            if (powerupTimer.current) clearTimeout(powerupTimer.current);
        };
    }, []);

    const loadAssets = async () => {
        try {
            const members = await getFamilyMembers();
            // All with photos
            const valid = members.filter(m => m.photo);

            // Use all available photos for both enemies and uncles to ensure variety
            const allImages: HTMLImageElement[] = [];

            for (const member of valid) {
                const img = new Image();
                img.src = member.photo!;
                allImages.push(img);
            }

            // Shuffle for enemies
            imagesCache.current = [...allImages].sort(() => 0.5 - Math.random());

            // Shuffle differently for uncles
            uncleImages.current = [...allImages].sort(() => 0.5 - Math.random());

            initGame(1);
        } catch (e) {
            console.error(e);
            initGame(1);
        }
    };

    const initGame = (lvl: number) => {
        setLevel(lvl);
        enemySpeed.current = 1 + (lvl * 0.2); // Increase speed per level

        // Rows increase with level (max 6)
        const rows = Math.min(3 + Math.floor(lvl / 2), 6);
        const cols = 5;
        const padding = 15;
        const startX = 20;
        const startY = 50;

        enemies.current = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                enemies.current.push({
                    x: startX + c * (ENEMY_SIZE + padding),
                    y: startY + r * (ENEMY_SIZE + padding),
                    image: imagesCache.current.length > 0
                        ? imagesCache.current[(r * cols + c) % imagesCache.current.length]
                        : undefined
                });
            }
        }

        bullets.current = [];
        fallingUncles.current = [];

        // Reset player if level 1, keep if progressing?
        if (lvl === 1) {
            setScore(0);
            playerX.current = CANVAS_WIDTH / 2;
            setActivePowerup(null);
        }

        setGameOver(false);
        setVictory(false);
        loop();
    };

    const spawnUncle = () => {
        if (Math.random() < 0.005) { // 0.5% chance per frame
            const type: PowerupType = Math.random() < 0.4 ? 'TRIPLE' : Math.random() < 0.7 ? 'LASER' : 'SHIELD';
            fallingUncles.current.push({
                x: Math.random() * (CANVAS_WIDTH - 30),
                y: 0,
                type,
                image: uncleImages.current.length > 0
                    ? uncleImages.current[Math.floor(Math.random() * uncleImages.current.length)]
                    : undefined
            });
        }
    };

    const loop = () => {
        update();
        draw();

        if (!gameOver && !victory) {
            animationFrame.current = requestAnimationFrame(loop);
        }
    };

    const activatePowerup = (type: PowerupType) => {
        setActivePowerup(type);
        soundManager.playLevelUp(); // Positive sound

        if (powerupTimer.current) clearTimeout(powerupTimer.current);
        powerupTimer.current = setTimeout(() => {
            setActivePowerup(null);
        }, POWERUP_DURATION);
    };

    const update = () => {
        if (gameOver || victory) return;

        // Spawn Uncles
        spawnUncle();

        // Move Bullets
        bullets.current.forEach(b => {
            b.y -= (activePowerup === 'LASER' ? 10 : 5);
        });
        bullets.current = bullets.current.filter(b => b.y > -50);

        // Move Falling Uncles & Check Collision with Player
        fallingUncles.current.forEach(u => u.y += 2);

        // Check Player vs Uncle Collision
        // Player is approx at (playerX-15, HEIGHT-30) size 30x30
        const pRect = { x: playerX.current - 15, y: CANVAS_HEIGHT - 30, w: 30, h: 30 };

        fallingUncles.current = fallingUncles.current.filter(u => {
            if (
                pRect.x < u.x + 30 &&
                pRect.x + pRect.w > u.x &&
                pRect.y < u.y + 30 &&
                pRect.y + pRect.h > u.y
            ) {
                // Caught!
                activatePowerup(u.type);
                return false; // Remove
            }
            return u.y < CANVAS_HEIGHT;
        });

        // Move Enemies
        let hitWall = false;
        enemies.current.forEach(e => {
            e.x += enemySpeed.current * enemyDirection.current;
            if (e.x <= 0 || e.x + ENEMY_SIZE >= CANVAS_WIDTH) {
                hitWall = true;
            }
        });

        if (hitWall) {
            enemyDirection.current *= -1;
            enemies.current.forEach(e => {
                e.y += 10;
                if (e.y + ENEMY_SIZE >= CANVAS_HEIGHT - 50) {
                    setGameOver(true);
                    soundManager.playGameOver();
                }
            });
        }

        // Collision: Bullets vs Enemies
        bullets.current.forEach((b, bIdx) => {
            let bHit = false;
            // Raycast for laser? No, simplified laser: fast bullet piercing?
            // For now, laser is just very fast bullet.

            enemies.current.forEach((e, eIdx) => {
                if (bHit && activePowerup !== 'LASER') return; // Normal bullets hit one target

                if (
                    b.x < e.x + ENEMY_SIZE &&
                    b.x + BULLET_SIZE > e.x &&
                    b.y < e.y + ENEMY_SIZE &&
                    b.y + BULLET_SIZE > e.y
                ) {
                    // Hit!
                    enemies.current.splice(eIdx, 1);
                    setScore(s => s + 100);
                    soundManager.playExplosion();
                    bHit = true;
                    // Dont remove bullet if Laser
                }
            });

            if (bHit && activePowerup !== 'LASER') {
                bullets.current.splice(bIdx, 1);
            }
        });

        if (enemies.current.length === 0) {
            if (level < 5) { // Max 5 levels for demo
                soundManager.playLevelUp();
                initGame(level + 1); // Next Level
            } else {
                setVictory(true);
                soundManager.playLevelUp();
            }
        }
    };

    const draw = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Stars
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 15; i++) {
            ctx.globalAlpha = Math.random();
            ctx.fillRect(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT, 1, 1);
        }
        ctx.globalAlpha = 1;

        // Draw Player
        ctx.fillStyle = activePowerup ? '#f59e0b' : '#0ea5e9'; // Gold if powerup
        ctx.beginPath();
        // Ship shape
        ctx.moveTo(playerX.current, CANVAS_HEIGHT - 40);
        ctx.lineTo(playerX.current - 15, CANVAS_HEIGHT - 10);
        ctx.lineTo(playerX.current + 15, CANVAS_HEIGHT - 10);
        ctx.fill();

        // Powerup Shield Visual
        if (activePowerup === 'SHIELD') {
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(playerX.current, CANVAS_HEIGHT - 20, 25, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw Bullets
        bullets.current.forEach(b => {
            ctx.fillStyle = b.type === 'LASER' ? '#ef4444' : '#fbbf24';
            const w = b.type === 'LASER' ? 4 : BULLET_SIZE;
            const h = b.type === 'LASER' ? 20 : 8;
            ctx.fillRect(b.x, b.y, w, h);
        });

        // Draw Enemies
        enemies.current.forEach(e => {
            if (e.image) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(e.x + ENEMY_SIZE / 2, e.y + ENEMY_SIZE / 2, ENEMY_SIZE / 2, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(e.image, e.x, e.y, ENEMY_SIZE, ENEMY_SIZE);
                ctx.restore();
                // Red Border
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(e.x, e.y, ENEMY_SIZE, ENEMY_SIZE);
            }
        });

        // Draw Falling Uncles (Powerups)
        fallingUncles.current.forEach(u => {
            const size = 30;
            // Glow logic
            ctx.shadowBlur = 15;
            ctx.shadowColor = u.type === 'TRIPLE' ? '#3b82f6' : u.type === 'LASER' ? '#ef4444' : '#22c55e';

            if (u.image) {
                ctx.drawImage(u.image, u.x, u.y, size, size);
            } else {
                ctx.fillStyle = '#fff';
                ctx.fillRect(u.x, u.y, size, size);
            }

            // Reset shadow
            ctx.shadowBlur = 0;

            // Icon
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.fillText(u.type === 'TRIPLE' ? '3x' : u.type === 'LASER' ? '⚡' : '🛡️', u.x + 8, u.y - 5);
        });
    };

    const handleTouchMove = (e: TouchEvent) => {
        const touch = e.touches[0];
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            const x = touch.clientX - rect.left;
            playerX.current = Math.max(15, Math.min(CANVAS_WIDTH - 15, x));
        }
    };

    const handleShoot = () => {
        const now = Date.now();
        // Faster fire rate with powerups
        const cooldown = activePowerup === 'LASER' ? 100 : activePowerup === 'TRIPLE' ? 200 : 300;

        if (now - lastShot.current > cooldown) {
            if (activePowerup === 'TRIPLE') {
                bullets.current.push({ x: playerX.current - 15, y: CANVAS_HEIGHT - 30, type: 'NORMAL' });
                bullets.current.push({ x: playerX.current, y: CANVAS_HEIGHT - 40, type: 'NORMAL' });
                bullets.current.push({ x: playerX.current + 15, y: CANVAS_HEIGHT - 30, type: 'NORMAL' });
            } else if (activePowerup === 'LASER') {
                bullets.current.push({ x: playerX.current, y: CANVAS_HEIGHT - 40, type: 'LASER' });
            } else {
                bullets.current.push({ x: playerX.current, y: CANVAS_HEIGHT - 30, type: 'NORMAL' });
            }
            soundManager.playShoot();
            lastShot.current = now;
        }
    };

    return (
        <div className="space-invaders-screen">
            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/utilities')}>←</button>
                <div className="game-stats">
                    <h3>Nivel {level}</h3>
                    <span className="score">PTS: {score}</span>
                </div>
            </header>

            <div className="canvas-wrapper">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    onTouchMove={handleTouchMove}
                    onClick={handleShoot}
                />

                {(gameOver || victory) && (
                    <div className="overlay">
                        <h2>{victory ? '¡VICTORIA TOTAL!' : 'GAME OVER'}</h2>
                        <button onClick={() => initGame(1)}>Reiniciar</button>
                    </div>
                )}

                {activePowerup && (
                    <div className="powerup-indicator">
                        ACTIVADO: {activePowerup}
                    </div>
                )}
            </div>

            <p className="instructions">
                Mueve con el dedo • Toca para disparar • Atrapa a los Tíos 📷
            </p>

            <FloatingDock />
        </div>
    );
};
