import { useState, useEffect, useCallback } from 'react';
import { soundManager } from '../../../utils/SoundManager';
import { useNavigate } from 'react-router-dom';
import './WhoIsWhoGame.css';

interface FamilyMember {
    id: string;
    name: string;
    photo?: string;
}

interface GameRound {
    correctMember: FamilyMember;
    options: FamilyMember[];
    timeRemaining: number;
    answered: boolean;
    correct: boolean;
}

export const WhoIsWhoGame = () => {
    const navigate = useNavigate();
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [gameState, setGameState] = useState<'menu' | 'playing' | 'finished'>('menu');
    const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
    const [roundNumber, setRoundNumber] = useState(0);
    const [score, setScore] = useState(0);
    const [blur, setBlur] = useState(20);
    const [timeLeft, setTimeLeft] = useState(10);
    const [highScore, setHighScore] = useState(0);
    const [results, setResults] = useState<{ correct: boolean; name: string }[]>([]);

    const TOTAL_ROUNDS = 10;
    const TIME_PER_ROUND = 10;

    useEffect(() => {
        const saved = localStorage.getItem('whoIsWhoHighScore');
        if (saved) setHighScore(parseInt(saved));
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/members', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter members with photos
                const withPhotos = data.filter((m: FamilyMember) => m.photo);
                setMembers(withPhotos);
            }
        } catch (err) {
            console.error('Error fetching members:', err);
        } finally {
            setLoading(false);
        }
    };

    const shuffleArray = <T,>(array: T[]): T[] => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    const generateRound = useCallback(() => {
        if (members.length < 4) return null;

        const shuffled = shuffleArray(members);
        const correctMember = shuffled[0];
        const wrongOptions = shuffled.slice(1, 4);
        const options = shuffleArray([correctMember, ...wrongOptions]);

        return {
            correctMember,
            options,
            timeRemaining: TIME_PER_ROUND,
            answered: false,
            correct: false
        };
    }, [members]);

    const startGame = () => {
        setScore(0);
        setRoundNumber(1);
        setResults([]);
        setGameState('playing');
        const round = generateRound();
        setCurrentRound(round);
        setBlur(20);
        setBlur(20);
        // Level logic: Time decreases as you progress? Or static?
        // Let's make rounds 6-10 faster (7 seconds)
        setTimeLeft(roundNumber > 5 ? 7 : TIME_PER_ROUND);
    };

    // Timer effect
    useEffect(() => {
        if (gameState !== 'playing' || !currentRound || currentRound.answered) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleAnswer(null);
                    return 0;
                }
                if (prev <= 4) soundManager.playTone(800, 'triangle', 0.05); // Tick tock
                return prev - 1;
            });

            // Reduce blur over time
            setBlur(prev => Math.max(0, prev - 2));
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState, currentRound?.answered]);

    const handleAnswer = (selectedMember: FamilyMember | null) => {
        if (!currentRound || currentRound.answered) return;

        const isCorrect = selectedMember?.id === currentRound.correctMember.id;
        const timeBonus = Math.floor(timeLeft * 10);
        const roundScore = isCorrect ? 100 + timeBonus : 0;

        if (isCorrect) soundManager.playLevelUp(); // Reusing the happy sound
        else soundManager.playExplosion(); // Reusing the sad/error sound

        setCurrentRound({ ...currentRound, answered: true, correct: isCorrect });
        setScore(prev => prev + roundScore);
        setBlur(0);
        setResults(prev => [...prev, { correct: isCorrect, name: currentRound.correctMember.name }]);

        // Next round after delay
        setTimeout(() => {
            if (roundNumber >= TOTAL_ROUNDS) {
                endGame();
            } else {
                nextRound();
            }
        }, 1500);
    };

    const nextRound = () => {
        setRoundNumber(prev => prev + 1);
        const round = generateRound();
        setCurrentRound(round);
        setBlur(20);
        // Progressive difficulty: Next round is roundNumber + 1
        const nextRoundNum = roundNumber + 1;
        setTimeLeft(nextRoundNum > 5 ? 7 : TIME_PER_ROUND);
    };

    const endGame = () => {
        setGameState('finished');
        soundManager.playGameOver();
        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('whoIsWhoHighScore', score.toString());
        }
    };

    if (loading) {
        return (
            <div className="who-is-who-screen loading">
                <div className="loader">Cargando familiares...</div>
            </div>
        );
    }

    if (members.length < 4) {
        return (
            <div className="who-is-who-screen">
                <div className="not-enough">
                    <span className="icon">📷</span>
                    <h2>Necesitas más fotos</h2>
                    <p>Para jugar, al menos 4 familiares deben tener foto de perfil.</p>
                    <button onClick={() => navigate('/utilities')}>Volver</button>
                </div>
            </div>
        );
    }

    return (
        <div className="who-is-who-screen">
            {/* Menu State */}
            {gameState === 'menu' && (
                <div className="game-menu">
                    <button className="back-btn" onClick={() => navigate('/utilities')}>
                        ← Volver
                    </button>

                    <div className="menu-content">
                        <div className="game-logo">🎮</div>
                        <h1>¿Quién es Quién?</h1>
                        <p>Adivina a tus familiares por su foto</p>

                        <div className="game-rules">
                            <div className="rule">📷 10 rondas</div>
                            <div className="rule">⏱️ 10 segundos por foto</div>
                            <div className="rule">💯 +100 puntos + bonus tiempo</div>
                        </div>

                        {highScore > 0 && (
                            <div className="high-score">
                                🏆 Récord: {highScore} pts
                            </div>
                        )}

                        <button className="start-btn" onClick={startGame}>
                            ¡Jugar!
                        </button>
                    </div>
                </div>
            )}

            {/* Playing State */}
            {gameState === 'playing' && currentRound && (
                <div className="game-play">
                    <div className="game-header">
                        <div className="round-info">
                            Ronda {roundNumber}/{TOTAL_ROUNDS}
                        </div>
                        <div className="score-display">
                            {score} pts
                        </div>
                        <div className={`timer ${timeLeft <= 3 ? 'warning' : ''}`}>
                            ⏱️ {timeLeft}s
                        </div>
                    </div>

                    <div className="photo-container">
                        <div
                            className={`mystery-photo ${currentRound.answered ? 'revealed' : ''}`}
                            style={{
                                backgroundImage: `url(${currentRound.correctMember.photo})`,
                                filter: `blur(${blur}px)`
                            }}
                        />
                        {currentRound.answered && (
                            <div className={`answer-overlay ${currentRound.correct ? 'correct' : 'wrong'}`}>
                                {currentRound.correct ? '✓' : '✗'}
                            </div>
                        )}
                    </div>

                    <h2 className="question">¿Quién es?</h2>

                    <div className="options-grid">
                        {currentRound.options.map(member => (
                            <button
                                key={member.id}
                                className={`option-btn ${currentRound.answered
                                    ? member.id === currentRound.correctMember.id
                                        ? 'correct'
                                        : 'disabled'
                                    : ''
                                    }`}
                                onClick={() => handleAnswer(member)}
                                disabled={currentRound.answered}
                            >
                                {member.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Finished State */}
            {gameState === 'finished' && (
                <div className="game-finished">
                    <div className="finish-content">
                        <div className="trophy">
                            {score >= highScore && score > 0 ? '🏆' : '🎮'}
                        </div>
                        <h1>¡Juego Terminado!</h1>

                        <div className="final-score">
                            <span className="score-value">{score}</span>
                            <span className="score-label">puntos</span>
                        </div>

                        {score >= highScore && score > 0 && (
                            <div className="new-record">🎉 ¡Nuevo Récord!</div>
                        )}

                        <div className="results-summary">
                            <div className="result-stat correct">
                                ✓ {results.filter(r => r.correct).length} correctas
                            </div>
                            <div className="result-stat wrong">
                                ✗ {results.filter(r => !r.correct).length} incorrectas
                            </div>
                        </div>

                        <div className="results-list">
                            {results.map((r, i) => (
                                <div key={i} className={`result-item ${r.correct ? 'correct' : 'wrong'}`}>
                                    <span>{r.correct ? '✓' : '✗'}</span>
                                    <span>{r.name}</span>
                                </div>
                            ))}
                        </div>

                        <div className="finish-actions">
                            <button className="play-again-btn" onClick={startGame}>
                                🔄 Jugar de Nuevo
                            </button>
                            <button className="back-btn" onClick={() => navigate('/utilities')}>
                                ← Volver
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
