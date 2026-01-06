import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../../components/FloatingDock';
import { getFamilyMembers } from '../../../services/api';
import type { FamilyMember } from '../../../types';
import { soundManager } from '../../../utils/SoundManager';
import './SnakeGame.css';

const GRID_SIZE = 20;
const TILE_COUNT = 20; // 400x400 board

interface Point {
    x: number;
    y: number;
}

export const SnakeGame = () => {
    const navigate = useNavigate();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [highScore, setHighScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [paused, setPaused] = useState(false);
    const [members, setMembers] = useState<FamilyMember[]>([]);

    // Game State Refs (avoid stale closures in loop)
    const snake = useRef<Point[]>([{ x: 10, y: 10 }]);
    const food = useRef<Point>({ x: 15, y: 15 });
    const velocity = useRef<Point>({ x: 0, y: 0 });
    const currentMember = useRef<FamilyMember | null>(null);
    const speed = useRef(150);
    const timerRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        loadMembers();
        const savedHigh = localStorage.getItem('snakeHelper_highScore');
        if (savedHigh) setHighScore(parseInt(savedHigh));

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const loadMembers = async () => {
        try {
            const data = await getFamilyMembers();
            setMembers(data);
            spawnFood(data);
        } catch (e) {
            console.error(e);
        }
    };

    const foodImageRef = useRef<HTMLImageElement | null>(null);

    // ... existing refs ...

    const spawnFood = (availableMembers: FamilyMember[]) => {
        food.current = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };

        // Reset image
        foodImageRef.current = null;

        if (availableMembers.length > 0) {
            const member = availableMembers[Math.floor(Math.random() * availableMembers.length)];
            currentMember.current = member;

            if (member.photo) {
                const img = new Image();
                img.src = member.photo;
                img.onload = () => {
                    foodImageRef.current = img;
                };
            }
        }
    };

    const startGame = () => {
        snake.current = [{ x: 10, y: 10 }];
        velocity.current = { x: 1, y: 0 }; // Start moving right
        setScore(0);
        setLevel(1);
        setGameOver(false);
        setPaused(false);
        spawnFood(members);
        speed.current = 150;
        soundManager.playLevelUp();

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = window.setInterval(gameLoop, speed.current);
    };

    const gameLoop = () => {
        if (paused) return;

        const head = { ...snake.current[0] };
        head.x += velocity.current.x;
        head.y += velocity.current.y;

        // Wall Collision (Wrap around or Die? Let's die for challenge)
        if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
            handleGameOver();
            return;
        }

        // Self Collision
        if (snake.current.some(segment => segment.x === head.x && segment.y === head.y)) {
            handleGameOver();
            return;
        }

        snake.current.unshift(head);

        // Eat Food
        if (head.x === food.current.x && head.y === food.current.y) {
            setScore(s => {
                const newScore = s + 10;
                if (newScore > highScore) {
                    setHighScore(newScore);
                    localStorage.setItem('snakeHelper_highScore', newScore.toString());
                }
                // Level Up every 50 points
                if (newScore % 50 === 0) {
                    setLevel(l => l + 1);
                    soundManager.playLevelUp();
                    speed.current = Math.max(50, speed.current - 15);
                } else {
                    soundManager.playEat();
                }
                return newScore;
            });
            spawnFood(members);

            clearInterval(timerRef.current);
            timerRef.current = window.setInterval(gameLoop, speed.current);
        } else {
            snake.current.pop();
        }

        draw();
    };

    const handleGameOver = () => {
        setGameOver(true);
        soundManager.playGameOver();
        clearInterval(timerRef.current);
    };

    const draw = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        // IMPORTANT: Clear entire canvas first to avoid "infinite growth" visual bug
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 400, 400);

        // Draw grid lines faintly
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= TILE_COUNT; i++) {
            ctx.beginPath();
            ctx.moveTo(i * GRID_SIZE, 0);
            ctx.lineTo(i * GRID_SIZE, 400);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * GRID_SIZE);
            ctx.lineTo(400, i * GRID_SIZE);
            ctx.stroke();
        }

        // Draw Food (Avatar) - larger and more visible
        const fx = food.current.x * GRID_SIZE;
        const fy = food.current.y * GRID_SIZE;
        const foodSize = GRID_SIZE * 1.2; // Slightly larger
        const foodOffset = (foodSize - GRID_SIZE) / 2;

        if (foodImageRef.current && foodImageRef.current.complete) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(fx + GRID_SIZE / 2, fy + GRID_SIZE / 2, foodSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(foodImageRef.current, fx - foodOffset, fy - foodOffset, foodSize, foodSize);
            ctx.restore();
            // Gold border to make it stand out
            ctx.beginPath();
            ctx.arc(fx + GRID_SIZE / 2, fy + GRID_SIZE / 2, foodSize / 2, 0, Math.PI * 2);
            ctx.strokeStyle = '#D4AF37';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.closePath();
        } else {
            // Fallback - pulsing red circle
            const pulse = 0.8 + Math.sin(Date.now() / 200) * 0.2;
            ctx.beginPath();
            ctx.arc(fx + GRID_SIZE / 2, fy + GRID_SIZE / 2, (GRID_SIZE / 2) * pulse, 0, Math.PI * 2);
            ctx.fillStyle = '#ef4444';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();
        }

        // Draw Snake with gradient effect
        snake.current.forEach((segment, i) => {
            const brightness = 1 - (i / snake.current.length) * 0.4;
            if (i === 0) {
                // Head - brighter with eyes
                ctx.fillStyle = '#4ade80';
                ctx.fillRect(
                    segment.x * GRID_SIZE + 1,
                    segment.y * GRID_SIZE + 1,
                    GRID_SIZE - 2,
                    GRID_SIZE - 2
                );
                // Eyes based on direction
                ctx.fillStyle = '#000';
                const eyeSize = 3;
                const cx = segment.x * GRID_SIZE + GRID_SIZE / 2;
                const cy = segment.y * GRID_SIZE + GRID_SIZE / 2;
                if (velocity.current.x === 1) { // Right
                    ctx.fillRect(cx + 4, cy - 4, eyeSize, eyeSize);
                    ctx.fillRect(cx + 4, cy + 2, eyeSize, eyeSize);
                } else if (velocity.current.x === -1) { // Left
                    ctx.fillRect(cx - 6, cy - 4, eyeSize, eyeSize);
                    ctx.fillRect(cx - 6, cy + 2, eyeSize, eyeSize);
                } else if (velocity.current.y === -1) { // Up
                    ctx.fillRect(cx - 4, cy - 6, eyeSize, eyeSize);
                    ctx.fillRect(cx + 2, cy - 6, eyeSize, eyeSize);
                } else { // Down
                    ctx.fillRect(cx - 4, cy + 4, eyeSize, eyeSize);
                    ctx.fillRect(cx + 2, cy + 4, eyeSize, eyeSize);
                }
            } else {
                ctx.fillStyle = `rgba(34, 197, 94, ${brightness})`;
                ctx.fillRect(
                    segment.x * GRID_SIZE + 1,
                    segment.y * GRID_SIZE + 1,
                    GRID_SIZE - 2,
                    GRID_SIZE - 2
                );
            }
        });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowUp': if (velocity.current.y !== 1) velocity.current = { x: 0, y: -1 }; break;
            case 'ArrowDown': if (velocity.current.y !== -1) velocity.current = { x: 0, y: 1 }; break;
            case 'ArrowLeft': if (velocity.current.x !== 1) velocity.current = { x: -1, y: 0 }; break;
            case 'ArrowRight': if (velocity.current.x !== -1) velocity.current = { x: 1, y: 0 }; break;
        }
    };

    // Touch Controls
    const handleTouch = (direction: string) => {
        const e = { key: direction } as any;
        handleKeyDown(e);
    };

    return (
        <div className="snake-game-screen">
            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/utilities')}>←</button>
                <div className="scores">
                    <span className="level-badge">Nivel {level}</span>
                    <span>Score: {score}</span>
                    <span className="high-score">High: {highScore}</span>
                </div>
            </header>

            <div className="canvas-container">
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={400}
                    className="game-canvas"
                />

                {gameOver && (
                    <div className="snake-overlay">
                        <h2>¡Juego Terminado!</h2>
                        <button onClick={startGame}>Reintentar</button>
                    </div>
                )}

                {!gameOver && score === 0 && velocity.current.x === 0 && (
                    <div className="snake-overlay">
                        <button onClick={startGame}>Comenzar</button>
                    </div>
                )}
            </div>

            <div className="current-target">
                {currentMember.current ? (
                    <p>Busca a: <strong>{currentMember.current.name.split(' ')[0]}</strong></p>
                ) : (
                    <p>¡Come las manzanas!</p>
                )}
                {currentMember.current?.photo && <img src={currentMember.current.photo} alt="target" className="target-img" />}
            </div>

            <div className="d-pad">
                <button onClick={() => handleTouch('ArrowUp')}>⬆️</button>
                <div className="d-pad-row">
                    <button onClick={() => handleTouch('ArrowLeft')}>⬅️</button>
                    <button onClick={() => handleTouch('ArrowDown')}>⬇️</button>
                    <button onClick={() => handleTouch('ArrowRight')}>➡️</button>
                </div>
            </div>

            <FloatingDock />
        </div>
    );
};
