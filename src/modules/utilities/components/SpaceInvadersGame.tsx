import { useState, useEffect, useRef } from 'react';
import type { TouchEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../../components/FloatingDock';
import { getFamilyMembers } from '../../../services/api';
import './SpaceInvadersGame.css';

const CANVAS_WIDTH = 350;
const CANVAS_HEIGHT = 500;
const ENEMY_SIZE = 25;
const BULLET_SIZE = 5;

export const SpaceInvadersGame = () => {
    const navigate = useNavigate();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [victory, setVictory] = useState(false);

    // Game State
    const playerX = useRef(CANVAS_WIDTH / 2);
    const bullets = useRef<{ x: number, y: number }[]>([]);
    const enemies = useRef<{ x: number, y: number, image?: HTMLImageElement }[]>([]);
    const enemyDirection = useRef(1); // 1 right, -1 left
    const enemySpeed = useRef(1);
    const animationFrame = useRef<number | undefined>(undefined);
    const lastShot = useRef(0);
    const imagesCache = useRef<HTMLImageElement[]>([]);

    useEffect(() => {
        loadAssets();
        return () => {
            if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
        };
    }, []);

    const loadAssets = async () => {
        try {
            const members = await getFamilyMembers();
            // Preload 5-10 images
            const valid = members.filter(m => m.photo).slice(0, 10);

            const loaded: HTMLImageElement[] = [];
            for (const m of valid) {
                const img = new Image();
                img.src = m.photo!;
                loaded.push(img);
            }
            imagesCache.current = loaded;
            initGame();
        } catch (e) {
            console.error(e);
            initGame();
        }
    };

    const initGame = () => {
        // Create grid of enemies
        const rows = 4;
        const cols = 6;
        const padding = 10;
        const startX = 20;
        const startY = 40;

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

        setScore(0);
        setGameOver(false);
        setVictory(false);
        setScore(0);
        loop();
    };

    const loop = () => {
        update();
        draw();

        if (!gameOver && !victory) {
            animationFrame.current = requestAnimationFrame(loop);
        }
    };

    const update = () => {
        if (gameOver || victory) return;

        // Move Bullets
        bullets.current = bullets.current
            .map(b => ({ ...b, y: b.y - 5 }))
            .filter(b => b.y > 0);

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
                e.y += 10; // Move down
                // Game Over check
                if (e.y + ENEMY_SIZE >= CANVAS_HEIGHT - 50) {
                    setGameOver(true);
                }
            });
        }

        // Collision Detection
        bullets.current.forEach((b, bIdx) => {
            enemies.current.forEach((e, eIdx) => {
                if (
                    b.x < e.x + ENEMY_SIZE &&
                    b.x + BULLET_SIZE > e.x &&
                    b.y < e.y + ENEMY_SIZE &&
                    b.y + BULLET_SIZE > e.y
                ) {
                    // Hit!
                    bullets.current.splice(bIdx, 1);
                    enemies.current.splice(eIdx, 1);
                    setScore(s => s + 100);
                    // Increase speed slightly
                    enemySpeed.current += 0.05;
                }
            });
        });

        if (enemies.current.length === 0) {
            setVictory(true);
        }
    };

    const draw = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Stars
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 10; i++) {
            ctx.fillRect(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT, 1, 1);
        }

        // Draw Player
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.moveTo(playerX.current, CANVAS_HEIGHT - 30);
        ctx.lineTo(playerX.current - 15, CANVAS_HEIGHT - 10);
        ctx.lineTo(playerX.current + 15, CANVAS_HEIGHT - 10);
        ctx.fill();

        // Draw Bullets
        ctx.fillStyle = '#ef4444';
        bullets.current.forEach(b => {
            ctx.fillRect(b.x, b.y, BULLET_SIZE, 8);
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
            } else {
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(e.x, e.y, ENEMY_SIZE, ENEMY_SIZE);
            }
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
        if (now - lastShot.current > 300) { // Cooldown
            bullets.current.push({ x: playerX.current - 2, y: CANVAS_HEIGHT - 30 });
            lastShot.current = now;
        }
    };

    return (
        <div className="space-invaders-screen">
            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/utilities')}>←</button>
                <h3>Space Cousins</h3>
                <span className="score">{score}</span>
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
                        <h2>{victory ? '¡VICTORIA!' : 'GAME OVER'}</h2>
                        <button onClick={() => { loadAssets(); }}>Reiniciar</button>
                    </div>
                )}
            </div>

            <p className="instructions">
                Desliza para mover • Toca para disparar
            </p>

            <FloatingDock />
        </div>
    );
};
