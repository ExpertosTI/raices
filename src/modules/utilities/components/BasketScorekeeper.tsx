import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../../../components/ConfirmDialog';
import './BasketScorekeeper.css';

type GameMode = 'quarters' | '3x3-16' | '3x3-21';

interface PlayLogEntry {
    team: 1 | 2;
    points: number;
    quarter: number;
    type: 'score' | 'foul';
}

export const BasketScorekeeper = () => {
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [team1Name, setTeam1Name] = useState('Rojos');
    const [team2Name, setTeam2Name] = useState('Azules');
    const [team1Score, setTeam1Score] = useState(0);
    const [team2Score, setTeam2Score] = useState(0);
    const [team1Fouls, setTeam1Fouls] = useState(0);
    const [team2Fouls, setTeam2Fouls] = useState(0);
    const [gameMode, setGameMode] = useState<GameMode>('quarters');
    const [quarter, setQuarter] = useState(1);
    const [timeSeconds, setTimeSeconds] = useState(10 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [playLog, setPlayLog] = useState<PlayLogEntry[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [quarterMinutes, setQuarterMinutes] = useState(10);
    const [winner, setWinner] = useState<1 | 2 | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Get target score for 3x3 modes
    const targetScore = gameMode === '3x3-16' ? 16 : gameMode === '3x3-21' ? 21 : 0;

    // Initialize audio
    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        return () => { audioContextRef.current?.close(); };
    }, []);

    const playSound = (type: 'score' | 'foul' | 'buzzer' | 'win') => {
        if (!soundEnabled || !audioContextRef.current) return;
        const ctx = audioContextRef.current;

        if (type === 'score') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.value = 0.1;
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'foul') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 300;
            osc.type = 'sawtooth';
            gain.gain.value = 0.1;
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } else if (type === 'buzzer') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 200;
            osc.type = 'square';
            gain.gain.value = 0.15;
            osc.start();
            osc.stop(ctx.currentTime + 0.8);
        } else if (type === 'win') {
            [523, 659, 784, 1047].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                gain.gain.value = 0.15;
                osc.start(ctx.currentTime + i * 0.12);
                osc.stop(ctx.currentTime + i * 0.12 + 0.25);
            });
        }
    };

    // Timer logic
    useEffect(() => {
        if (gameMode !== 'quarters') return;

        if (isRunning && timeSeconds > 0) {
            timerRef.current = setInterval(() => {
                setTimeSeconds(prev => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        playSound('buzzer');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRunning, gameMode]);

    // Check for 3x3 winner
    useEffect(() => {
        if (gameMode.startsWith('3x3') && !winner) {
            if (team1Score >= targetScore) {
                setWinner(1);
                playSound('win');
            } else if (team2Score >= targetScore) {
                setWinner(2);
                playSound('win');
            }
        }
    }, [team1Score, team2Score, targetScore, gameMode]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const addPoints = (team: 1 | 2, points: number) => {
        if (winner) return;
        playSound('score');

        if (team === 1) {
            setTeam1Score(prev => prev + points);
        } else {
            setTeam2Score(prev => prev + points);
        }

        setPlayLog(prev => [...prev, { team, points, quarter, type: 'score' }]);
    };

    const addFoul = (team: 1 | 2) => {
        playSound('foul');

        if (team === 1) {
            setTeam1Fouls(prev => prev + 1);
        } else {
            setTeam2Fouls(prev => prev + 1);
        }

        setPlayLog(prev => [...prev, { team, points: 0, quarter, type: 'foul' }]);
    };

    const undoLast = () => {
        if (playLog.length === 0) return;

        const last = playLog[playLog.length - 1];
        if (last.type === 'score') {
            if (last.team === 1) {
                setTeam1Score(prev => Math.max(0, prev - last.points));
            } else {
                setTeam2Score(prev => Math.max(0, prev - last.points));
            }
        } else {
            if (last.team === 1) {
                setTeam1Fouls(prev => Math.max(0, prev - 1));
            } else {
                setTeam2Fouls(prev => Math.max(0, prev - 1));
            }
        }
        setPlayLog(prev => prev.slice(0, -1));
    };

    const nextQuarter = () => {
        if (quarter < 4) {
            setQuarter(prev => prev + 1);
            setTimeSeconds(quarterMinutes * 60);
            setIsRunning(false);
            setTeam1Fouls(0);
            setTeam2Fouls(0);
        }
    };

    const resetGame = async () => {
        const confirmed = await confirm('¿Reiniciar el partido?', 'Se perderán todos los puntos.');
        if (confirmed) {
            setTeam1Score(0);
            setTeam2Score(0);
            setTeam1Fouls(0);
            setTeam2Fouls(0);
            setQuarter(1);
            setTimeSeconds(quarterMinutes * 60);
            setIsRunning(false);
            setPlayLog([]);
            setWinner(null);
        }
    };

    const getQuarterStats = (q: number) => {
        const quarterPlays = playLog.filter(p => p.quarter === q && p.type === 'score');
        return {
            team1: quarterPlays.filter(p => p.team === 1).reduce((acc, p) => acc + p.points, 0),
            team2: quarterPlays.filter(p => p.team === 2).reduce((acc, p) => acc + p.points, 0)
        };
    };

    const changeGameMode = (mode: GameMode) => {
        setGameMode(mode);
        setTeam1Score(0);
        setTeam2Score(0);
        setTeam1Fouls(0);
        setTeam2Fouls(0);
        setQuarter(1);
        setPlayLog([]);
        setWinner(null);
        setIsRunning(false);
    };

    return (
        <div className="basket-screen">
            <header className="basket-header">
                <button className="back-btn" onClick={() => navigate('/utilities')}>←</button>
                <h1>🏀 Basket</h1>
                <div className="header-actions">
                    <button
                        className={`sound-btn ${soundEnabled ? 'on' : 'off'}`}
                        onClick={() => setSoundEnabled(!soundEnabled)}
                    >
                        {soundEnabled ? '🔊' : '🔇'}
                    </button>
                    <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
                        ⚙️
                    </button>
                </div>
            </header>

            {/* Settings */}
            {showSettings && (
                <div className="settings-panel">
                    <div className="setting-group">
                        <span>Modo de juego:</span>
                        <div className="mode-options">
                            <button
                                className={gameMode === 'quarters' ? 'active' : ''}
                                onClick={() => changeGameMode('quarters')}
                            >
                                4 Cuartos
                            </button>
                            <button
                                className={gameMode === '3x3-16' ? 'active' : ''}
                                onClick={() => changeGameMode('3x3-16')}
                            >
                                3x3 (16)
                            </button>
                            <button
                                className={gameMode === '3x3-21' ? 'active' : ''}
                                onClick={() => changeGameMode('3x3-21')}
                            >
                                3x3 (21)
                            </button>
                        </div>
                    </div>
                    {gameMode === 'quarters' && (
                        <div className="setting-group">
                            <span>Minutos/cuarto:</span>
                            <div className="mode-options">
                                {[5, 8, 10, 12].map(m => (
                                    <button
                                        key={m}
                                        className={quarterMinutes === m ? 'active' : ''}
                                        onClick={() => {
                                            setQuarterMinutes(m);
                                            if (!isRunning) setTimeSeconds(m * 60);
                                        }}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Game Info */}
            <div className="game-info">
                {gameMode === 'quarters' ? (
                    <>
                        <div className="quarter-badge">Q{quarter}</div>
                        <div className={`timer ${timeSeconds <= 60 ? 'warning' : ''}`}>
                            {formatTime(timeSeconds)}
                        </div>
                        <div className="timer-controls">
                            <button
                                className={isRunning ? 'pause' : 'play'}
                                onClick={() => setIsRunning(!isRunning)}
                            >
                                {isRunning ? '⏸' : '▶'}
                            </button>
                            <button onClick={nextQuarter} disabled={quarter >= 4}>→</button>
                        </div>
                    </>
                ) : (
                    <div className="target-info">
                        Primero en llegar a <strong>{targetScore}</strong> puntos
                    </div>
                )}
            </div>

            {/* Score Boards */}
            <div className="score-container">
                <div className={`score-panel team1 ${team1Score > team2Score ? 'leading' : ''}`}>
                    <input
                        className="team-name"
                        value={team1Name}
                        onChange={e => setTeam1Name(e.target.value)}
                    />
                    <div className="score">{team1Score}</div>

                    <div className="fouls-display">
                        <span>Faltas:</span>
                        <div className="foul-dots">
                            {[...Array(5)].map((_, i) => (
                                <span key={i} className={`foul-dot ${i < team1Fouls ? 'active' : ''}`} />
                            ))}
                        </div>
                        <button className="add-foul-btn" onClick={() => addFoul(1)}>+F</button>
                    </div>

                    {gameMode.startsWith('3x3') && (
                        <div className="progress-to-win">
                            <div
                                className="progress-fill"
                                style={{ width: `${Math.min(100, (team1Score / targetScore) * 100)}%` }}
                            />
                        </div>
                    )}

                    <div className="score-buttons">
                        <button onClick={() => addPoints(1, 1)} disabled={!!winner}>+1</button>
                        <button onClick={() => addPoints(1, 2)} disabled={!!winner}>+2</button>
                        {!gameMode.startsWith('3x3') && (
                            <button onClick={() => addPoints(1, 3)} disabled={!!winner}>+3</button>
                        )}
                    </div>
                </div>

                <div className="vs-center">
                    <span>VS</span>
                </div>

                <div className={`score-panel team2 ${team2Score > team1Score ? 'leading' : ''}`}>
                    <input
                        className="team-name"
                        value={team2Name}
                        onChange={e => setTeam2Name(e.target.value)}
                    />
                    <div className="score">{team2Score}</div>

                    <div className="fouls-display">
                        <span>Faltas:</span>
                        <div className="foul-dots">
                            {[...Array(5)].map((_, i) => (
                                <span key={i} className={`foul-dot ${i < team2Fouls ? 'active' : ''}`} />
                            ))}
                        </div>
                        <button className="add-foul-btn" onClick={() => addFoul(2)}>+F</button>
                    </div>

                    {gameMode.startsWith('3x3') && (
                        <div className="progress-to-win">
                            <div
                                className="progress-fill"
                                style={{ width: `${Math.min(100, (team2Score / targetScore) * 100)}%` }}
                            />
                        </div>
                    )}

                    <div className="score-buttons">
                        <button onClick={() => addPoints(2, 1)} disabled={!!winner}>+1</button>
                        <button onClick={() => addPoints(2, 2)} disabled={!!winner}>+2</button>
                        {!gameMode.startsWith('3x3') && (
                            <button onClick={() => addPoints(2, 3)} disabled={!!winner}>+3</button>
                        )}
                    </div>
                </div>
            </div>

            {/* Quarter Stats - Only for quarters mode */}
            {gameMode === 'quarters' && (
                <div className="quarter-stats">
                    <div className="stats-row">
                        {[1, 2, 3, 4].map(q => {
                            const stats = getQuarterStats(q);
                            return (
                                <div key={q} className={`quarter-cell ${quarter === q ? 'current' : ''}`}>
                                    <span className="q-num">Q{q}</span>
                                    <span className={stats.team1 > stats.team2 ? 't1' : ''}>{stats.team1}</span>
                                    <span className="dash">-</span>
                                    <span className={stats.team2 > stats.team1 ? 't2' : ''}>{stats.team2}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="game-actions">
                {playLog.length > 0 && (
                    <button className="undo-btn" onClick={undoLast}>↩ Deshacer</button>
                )}
                <button className="reset-btn" onClick={resetGame}>🔄 Nuevo Partido</button>
            </div>

            {/* Winner Modal */}
            {winner && (
                <div className="winner-overlay">
                    <div className="winner-modal">
                        <div className="winner-trophy">🏆</div>
                        <h2 className={winner === 1 ? 'team1-color' : 'team2-color'}>
                            ¡{winner === 1 ? team1Name : team2Name} Gana!
                        </h2>
                        <div className="final-score-display">
                            <span className="team1-color">{team1Score}</span>
                            <span className="separator"> - </span>
                            <span className="team2-color">{team2Score}</span>
                        </div>
                        <button className="new-game-btn" onClick={resetGame}>
                            🔄 Nuevo Partido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
