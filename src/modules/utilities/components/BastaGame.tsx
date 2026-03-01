import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { soundManager } from '../../../utils/SoundManager';
import './BastaGame.css';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const BastaGame = () => {
    const navigate = useNavigate();
    const [rotation, setRotation] = useState(0);

    const spinLetter = () => {
        if (isSpinning) return;
        setIsSpinning(true);
        setGameState('ready');
        setCurrentLetter('?');
        soundManager.playClick();

        // Calculate a random rotation that lands on a clear letter
        // 26 letters, 360 / 26 = ~13.84 degrees per letter
        // We want to spin at least 5 times (360 * 5) plus a random letter index
        const letterIndex = Math.floor(Math.random() * LETTERS.length);
        const letterAngle = 360 / LETTERS.length;
        // Adjust formula so the letter aligns with top pointer (which is at 0 degrees visually if we start there)
        // Actually, CSS rotation is clockwise. 
        // If 'A' is at top (0 deg), to get 'B' (which is at +13.84 deg) to top, we rotate wheel -13.84 deg.
        // So target rotation = -(letterIndex * letterAngle) - (360 * 5)

        const extraSpins = 5;
        const targetRotation = -(letterIndex * letterAngle) - (360 * extraSpins);

        setRotation(targetRotation);

        // Wait for animation to finish (3s as defined in CSS)
        setTimeout(() => {
            setCurrentLetter(LETTERS[letterIndex]);
            setIsSpinning(false);
            setGameState('playing');
            startTimer();
            soundManager.playSuccess();
        }, 3000);
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
                <button className="exit-btn" onClick={() => navigate('/utilities')}>← Salir</button>
                <h1>¡BASTA!</h1>
            </header>

            <div className="game-board">

                <div className="wheel-container">
                    <div className="wheel" style={{ transform: `rotate(${rotation}deg)` }}>
                        {LETTERS.map((char, index) => {
                            const angle = index * (360 / LETTERS.length);
                            return (
                                <div
                                    key={char}
                                    className="wheel-letter"
                                    style={{ transform: `translateX(-50%) rotate(${angle}deg) translateY(-50%)` }} // Adjust for center origin
                                >
                                    <div style={{ transform: `translateY(-120px)` }}> {/* Push out to edge */}
                                        <span>{char}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Central Button */}
                    <button
                        className={`center-button ${isSpinning ? 'spinning' : ''}`}
                        onClick={gameState === 'playing' ? handleBasta : spinLetter}
                        disabled={isSpinning}
                    >
                        {gameState === 'playing' ? '¡BASTA!' : 'GIRAR'}
                    </button>
                </div>

                {gameState === 'playing' && (
                    <div className="game-result">
                        {currentLetter}
                    </div>
                )}

                {gameState === 'stopped' && (
                    <div className="game-result" style={{ color: '#fff' }}>
                        {currentLetter}
                    </div>
                )}

                <div className="timer-display" style={{ color: timeLeft < 10 ? '#ef4444' : '#FCD34D' }}>
                    ⏱️ {timeLeft}s
                </div>

                <div className="categories-card">
                    <h3>📝 Categorías</h3>
                    <ul>
                        <li>Nombre</li>
                        <li>Apellido</li>
                        <li>Ciudad/País</li>
                        <li>Animal</li>
                        <li>Color</li>
                        <li>Fruta/Verdura</li>
                        <li>Objeto</li>
                        <li>Marca</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
