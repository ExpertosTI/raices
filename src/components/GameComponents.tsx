import React from 'react';
import './GamePause.css';

interface GamePauseProps {
    title?: string;
    onResume: () => void;
    onRestart?: () => void;
    onExit?: () => void;
    score?: number;
    highScore?: number;
    showMuteControl?: boolean;
}

export const GamePause: React.FC<GamePauseProps> = ({
    title = 'Pausa',
    onResume,
    onRestart,
    onExit,
    score,
    highScore,
    showMuteControl = false
}) => {
    return (
        <div className="game-pause-overlay">
            <div className="game-pause-modal">
                <h2>{title}</h2>

                {(score !== undefined || highScore !== undefined) && (
                    <div className="pause-scores">
                        {score !== undefined && (
                            <div className="pause-score">
                                <span className="label">Puntos</span>
                                <span className="value">{score}</span>
                            </div>
                        )}
                        {highScore !== undefined && (
                            <div className="pause-score high">
                                <span className="label">Récord</span>
                                <span className="value">{highScore}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="pause-actions">
                    <button className="pause-btn resume" onClick={onResume}>
                        ▶️ Continuar
                    </button>
                    {onRestart && (
                        <button className="pause-btn restart" onClick={onRestart}>
                            🔄 Reiniciar
                        </button>
                    )}
                    {onExit && (
                        <button className="pause-btn exit" onClick={onExit}>
                            🚪 Salir
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Game Over component
interface GameOverProps {
    title?: string;
    message?: string;
    score: number;
    highScore?: number;
    isNewRecord?: boolean;
    onRestart: () => void;
    onExit?: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({
    title = '¡Juego Terminado!',
    message,
    score,
    highScore,
    isNewRecord = false,
    onRestart,
    onExit
}) => {
    return (
        <div className="game-pause-overlay game-over">
            <div className="game-pause-modal">
                <h2>{title}</h2>

                {isNewRecord && (
                    <div className="new-record">
                        🏆 ¡Nuevo Récord!
                    </div>
                )}

                <div className="pause-scores">
                    <div className="pause-score main">
                        <span className="label">Tu Puntuación</span>
                        <span className="value">{score}</span>
                    </div>
                    {highScore !== undefined && !isNewRecord && (
                        <div className="pause-score high">
                            <span className="label">Récord</span>
                            <span className="value">{highScore}</span>
                        </div>
                    )}
                </div>

                {message && <p className="game-over-message">{message}</p>}

                <div className="pause-actions">
                    <button className="pause-btn restart" onClick={onRestart}>
                        🔄 Jugar de Nuevo
                    </button>
                    {onExit && (
                        <button className="pause-btn exit" onClick={onExit}>
                            🚪 Salir
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Loading component for games
interface GameLoadingProps {
    message?: string;
}

export const GameLoading: React.FC<GameLoadingProps> = ({
    message = 'Cargando...'
}) => {
    return (
        <div className="game-loading">
            <div className="loading-spinner">🎮</div>
            <p>{message}</p>
        </div>
    );
};

// Tutorial overlay for first-time players
interface GameTutorialProps {
    steps: Array<{ icon: string; text: string }>;
    onStart: () => void;
    gameName: string;
}

export const GameTutorial: React.FC<GameTutorialProps> = ({
    steps,
    onStart,
    gameName
}) => {
    const tutorialKey = `tutorial_${gameName}_seen`;
    const [show, setShow] = React.useState(() => {
        return !localStorage.getItem(tutorialKey);
    });

    const handleStart = () => {
        localStorage.setItem(tutorialKey, 'true');
        setShow(false);
        onStart();
    };

    if (!show) return null;

    return (
        <div className="game-pause-overlay tutorial">
            <div className="game-pause-modal tutorial-modal">
                <h2>Cómo Jugar</h2>

                <div className="tutorial-steps">
                    {steps.map((step, i) => (
                        <div key={i} className="tutorial-step">
                            <span className="step-icon">{step.icon}</span>
                            <span className="step-text">{step.text}</span>
                        </div>
                    ))}
                </div>

                <button className="pause-btn resume" onClick={handleStart}>
                    ¡Entendido! 🎮
                </button>
            </div>
        </div>
    );
};
