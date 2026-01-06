import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../../components/FloatingDock';
import { getFamilyMembers } from '../../../services/api';
import type { FamilyMember } from '../../../types';
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

    const spawnFood = (availableMembers: FamilyMember[]) => {
        food.current = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };
        if (availableMembers.length > 0) {
            currentMember.current = availableMembers[Math.floor(Math.random() * availableMembers.length)];
        }
    };

    const startGame = () => {
        snake.current = [{ x: 10, y: 10 }];
        velocity.current = { x: 1, y: 0 }; // Start moving right
        setScore(0);
        setGameOver(false);
        setPaused(false);
        spawnFood(members);
        speed.current = 150;

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
                return newScore;
            });
            spawnFood(members);
            // Don't pop tail
            // Increase speed slightly
            if (speed.current > 50) speed.current -= 2;
            clearInterval(timerRef.current);
            timerRef.current = window.setInterval(gameLoop, speed.current);
        } else {
            snake.current.pop();
        }

        draw();
    };

    const handleGameOver = () => {
        setGameOver(true);
        clearInterval(timerRef.current);
    };

    const draw = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw Food (Avatar)
        const fx = food.current.x * GRID_SIZE;
        const fy = food.current.y * GRID_SIZE;

        ctx.beginPath();
        ctx.arc(fx + GRID_SIZE / 2, fy + GRID_SIZE / 2, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.closePath();

        // Draw Snake
        ctx.fillStyle = '#22c55e';
        snake.current.forEach((segment, i) => {
            // Head is different color
            if (i === 0) ctx.fillStyle = '#4ade80';
            else ctx.fillStyle = '#22c55e';

            ctx.fillRect(
                segment.x * GRID_SIZE + 1,
                segment.y * GRID_SIZE + 1,
                GRID_SIZE - 2,
                GRID_SIZE - 2
            );
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
