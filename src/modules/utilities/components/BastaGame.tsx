import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { soundManager } from '../../../utils/SoundManager';
import './BastaGame.css';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const BastaGame = () => {
    const navigate = useNavigate();
    const [currentLetter, setCurrentLetter] = useState('?');
    const [isSpinning, setIsSpinning] = useState(false);
    const [timer, setTimer] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(60); // Default 60s
    const [gameState, setGameState] = useState<'ready' | 'playing' | 'stopped'>('ready');

    const spinLetter = () => {
        if (isSpinning) return;
        setIsSpinning(true);
        setGameState('ready');
        soundManager.playClick();

        let iterations = 0;
        const maxIterations = 20;
        const interval = setInterval(() => {
            setCurrentLetter(LETTERS[Math.floor(Math.random() * LETTERS.length)]);
            iterations++;
            if (iterations >= maxIterations) {
                clearInterval(interval);
                setIsSpinning(false);
                setGameState('playing');
                startTimer();
                soundManager.playSuccess();
            }
        }, 100);
    };

    const startTimer = () => {
        setTimeLeft(60);
        if (timer) clearInterval(timer);
        const newTimer = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    stopGame();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        setTimer(newTimer);
    };

    const stopGame = () => {
        if (timer) clearInterval(timer);
        setTimer(null);
        setGameState('stopped');
        soundManager.playNotification();
    };

    const handleBasta = () => {
        stopGame();
    };

    useEffect(() => {
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [timer]);

    return (
        <div className="basta-game">
            <header className="game-header">
                <button onClick={() => navigate('/utilities')}>← Salir</button>
                <h1>🛑 ¡Basta!</h1>
            </header>

            <div className="game-board">
                <div className={`letter-display ${isSpinning ? 'spinning' : ''}`}>
                    {currentLetter}
                </div>

                <div className="timer-display" style={{ color: timeLeft < 10 ? '#ef4444' : 'white' }}>
                    ⏱️ {timeLeft}s
                </div>

                <div className="controls">
                    {gameState === 'ready' || gameState === 'stopped' ? (
                        <button className="spin-btn" onClick={spinLetter} disabled={isSpinning}>
                            {isSpinning ? 'Girando...' : 'Nueva Letra'}
                        </button>
                    ) : (
                        <button className="basta-btn" onClick={handleBasta}>
                            ¡BASTA! 🛑
                        </button>
                    )}
                </div>

                <div className="categories-hint">
                    <h3>Categorías Sugeridas:</h3>
                    <ul>
                        <li>Nombre</li>
                        <li>Apellido</li>
                        <li>Ciudad/País</li>
                        <li>Animal</li>
                        <li>Color</li>
                        <li>Fruta/Verdura</li>
                        <li>Cosa</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
