import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './BasketScorekeeper.css';

interface PlayLogEntry {
    team: 1 | 2;
    points: number;
    quarter: number;
    timestamp: Date;
}

export const BasketScorekeeper = () => {
    const navigate = useNavigate();
    const [team1Name, setTeam1Name] = useState('Rojos');
    const [team2Name, setTeam2Name] = useState('Azules');
    const [team1Score, setTeam1Score] = useState(0);
    const [team2Score, setTeam2Score] = useState(0);
    const [quarter, setQuarter] = useState(1);
    const [timeSeconds, setTimeSeconds] = useState(10 * 60); // 10 min quarters
    const [isRunning, setIsRunning] = useState(false);
    const [playLog, setPlayLog] = useState<PlayLogEntry[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [quarterMinutes, setQuarterMinutes] = useState(10);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isRunning && timeSeconds > 0) {
            timerRef.current = setInterval(() => {
                setTimeSeconds(prev => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRunning]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const addPoints = (team: 1 | 2, points: number) => {
        if (team === 1) {
            setTeam1Score(prev => prev + points);
        } else {
            setTeam2Score(prev => prev + points);
        }

        setPlayLog(prev => [...prev, {
            team,
            points,
            quarter,
            timestamp: new Date()
        }]);
    };

    const undoLast = () => {
        if (playLog.length === 0) return;

        const last = playLog[playLog.length - 1];
        if (last.team === 1) {
            setTeam1Score(prev => Math.max(0, prev - last.points));
        } else {
            setTeam2Score(prev => Math.max(0, prev - last.points));
        }
        setPlayLog(prev => prev.slice(0, -1));
    };

    const nextQuarter = () => {
        if (quarter < 4) {
            setQuarter(prev => prev + 1);
            setTimeSeconds(quarterMinutes * 60);
            setIsRunning(false);
        }
    };

    const resetGame = () => {
        setTeam1Score(0);
        setTeam2Score(0);
        setQuarter(1);
        setTimeSeconds(quarterMinutes * 60);
        setIsRunning(false);
        setPlayLog([]);
    };

    const getQuarterStats = (q: number) => {
        const quarterPlays = playLog.filter(p => p.quarter === q);
        return {
            team1: quarterPlays.filter(p => p.team === 1).reduce((acc, p) => acc + p.points, 0),
            team2: quarterPlays.filter(p => p.team === 2).reduce((acc, p) => acc + p.points, 0)
        };
    };

    return (
        <div className="basket-screen">
            <header className="basket-header">
                <button className="back-btn" onClick={() => navigate('/utilities')}>
                    ← Volver
                </button>
                <h1>🏀 Basket</h1>
                <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
                    ⚙️
                </button>
            </header>

            {/* Settings */}
            {showSettings && (
                <div className="settings-panel">
                    <div className="setting-row">
                        <label>Minutos por cuarto:</label>
                        <div className="quarter-options">
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
                </div>
            )}

            {/* Timer & Quarter */}
            <div className="game-info">
                <div className="quarter-display">
                    {quarter <= 4 ? `Q${quarter}` : 'FIN'}
                </div>
                <div className={`timer-display ${timeSeconds <= 60 ? 'warning' : ''}`}>
                    {formatTime(timeSeconds)}
                </div>
                <div className="timer-controls">
                    <button
                        className={isRunning ? 'pause' : 'play'}
                        onClick={() => setIsRunning(!isRunning)}
                    >
                        {isRunning ? '⏸' : '▶'}
                    </button>
                    <button onClick={nextQuarter} disabled={quarter >= 4}>
                        Q{quarter + 1 > 4 ? 4 : quarter + 1} →
                    </button>
                </div>
            </div>

            {/* Score Boards */}
            <div className="score-boards">
                <div className={`score-board team1 ${team1Score > team2Score ? 'leading' : ''}`}>
                    <input
                        className="team-name"
                        value={team1Name}
                        onChange={e => setTeam1Name(e.target.value)}
                    />
                    <div className="score">{team1Score}</div>
                    <div className="point-buttons">
                        <button onClick={() => addPoints(1, 1)}>+1</button>
                        <button onClick={() => addPoints(1, 2)}>+2</button>
                        <button onClick={() => addPoints(1, 3)}>+3</button>
                    </div>
                </div>

                <div className="vs-divider">VS</div>

                <div className={`score-board team2 ${team2Score > team1Score ? 'leading' : ''}`}>
                    <input
                        className="team-name"
                        value={team2Name}
                        onChange={e => setTeam2Name(e.target.value)}
                    />
                    <div className="score">{team2Score}</div>
                    <div className="point-buttons">
                        <button onClick={() => addPoints(2, 1)}>+1</button>
                        <button onClick={() => addPoints(2, 2)}>+2</button>
                        <button onClick={() => addPoints(2, 3)}>+3</button>
                    </div>
                </div>
            </div>

            {/* Quarter Stats */}
            <div className="quarter-stats">
                <h3>Puntos por Cuarto</h3>
                <div className="stats-grid">
                    {[1, 2, 3, 4].map(q => {
                        const stats = getQuarterStats(q);
                        return (
                            <div key={q} className={`quarter-stat ${quarter === q ? 'current' : ''}`}>
                                <span className="q-label">Q{q}</span>
                                <span className={stats.team1 > stats.team2 ? 'highlight' : ''}>{stats.team1}</span>
                                <span className="separator">-</span>
                                <span className={stats.team2 > stats.team1 ? 'highlight' : ''}>{stats.team2}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Play Log */}
            {playLog.length > 0 && (
                <div className="play-log">
                    <div className="log-header">
                        <h3>Últimas Jugadas</h3>
                        <button className="undo-btn" onClick={undoLast}>↩ Deshacer</button>
                    </div>
                    <div className="log-entries">
                        {playLog.slice(-5).reverse().map((play, i) => (
                            <div key={i} className={`log-entry team${play.team}`}>
                                <span className="play-team">
                                    {play.team === 1 ? team1Name : team2Name}
                                </span>
                                <span className="play-points">+{play.points}</span>
                                <span className="play-quarter">Q{play.quarter}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Game Actions */}
            <div className="game-actions">
                <button className="reset-game-btn" onClick={resetGame}>
                    🔄 Nuevo Partido
                </button>
            </div>
        </div>
    );
};
