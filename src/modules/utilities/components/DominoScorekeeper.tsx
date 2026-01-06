import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../../../components/ConfirmDialog';
import './DominoScorekeeper.css';

interface Round {
    team1: number;
    team2: number;
}

const TEAM_COLORS = [
    { name: 'Rojo', value: '#ef4444' },
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Verde', value: '#22c55e' },
    { name: 'Morado', value: '#8b5cf6' },
    { name: 'Naranja', value: '#f97316' },
    { name: 'Rosa', value: '#ec4899' },
];

export const DominoScorekeeper = () => {
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [team1Name, setTeam1Name] = useState('Equipo 1');
    const [team2Name, setTeam2Name] = useState('Equipo 2');
    const [team1Color, setTeam1Color] = useState('#22c55e');
    const [team2Color, setTeam2Color] = useState('#3b82f6');
    const [team1Score, setTeam1Score] = useState(0);
    const [team2Score, setTeam2Score] = useState(0);
    const [targetScore, setTargetScore] = useState(150);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [winner, setWinner] = useState<1 | 2 | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [currentRound, setCurrentRound] = useState({ team1: 0, team2: 0 });
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [showColorPicker, setShowColorPicker] = useState<1 | 2 | null>(null);
    const [customInput1, setCustomInput1] = useState('');
    const [customInput2, setCustomInput2] = useState('');

    // Numpad state
    const [selectedTeam, setSelectedTeam] = useState<1 | 2>(1);
    const [numpadInput, setNumpadInput] = useState('');

    const handleCustomAdd = (team: 1 | 2) => {
        const value = team === 1 ? customInput1 : customInput2;
        const points = parseInt(value, 10);
        if (!isNaN(points) && points > 0) {
            addPoints(team, points);
            if (team === 1) setCustomInput1('');
            else setCustomInput2('');
        }
    };

    // Numpad key handler
    const handleNumpadKey = (key: string) => {
        if (winner) return;
        playSound('click');

        if (key === 'C') {
            setNumpadInput('');
        } else if (key === '⌫') {
            setNumpadInput(prev => prev.slice(0, -1));
        } else if (key === '✓') {
            const points = parseInt(numpadInput, 10);
            if (!isNaN(points) && points > 0) {
                addPoints(selectedTeam, points);
                setNumpadInput('');
            }
        } else {
            if (numpadInput.length < 3) {
                setNumpadInput(prev => prev + key);
            }
        }
    };

    const audioContextRef = useRef<AudioContext | null>(null);

    const pointButtons = [5, 10, 15, 20, 25, 30];

    // Initialize audio context
    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        return () => {
            audioContextRef.current?.close();
        };
    }, []);

    // Play sound effect
    const playSound = (type: 'click' | 'score' | 'win' | 'undo') => {
        if (!soundEnabled || !audioContextRef.current) return;

        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        switch (type) {
            case 'click':
                oscillator.frequency.value = 600;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.1;
                oscillator.start();
                oscillator.stop(ctx.currentTime + 0.05);
                break;
            case 'score':
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.15;
                oscillator.start();
                setTimeout(() => {
                    oscillator.frequency.value = 1000;
                }, 100);
                oscillator.stop(ctx.currentTime + 0.2);
                break;
            case 'win':
                // Victory fanfare
                const notes = [523, 659, 784, 1047];
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    gain.gain.value = 0.2;
                    osc.start(ctx.currentTime + i * 0.15);
                    osc.stop(ctx.currentTime + i * 0.15 + 0.3);
                });
                break;
            case 'undo':
                oscillator.frequency.value = 400;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.1;
                oscillator.start();
                oscillator.stop(ctx.currentTime + 0.1);
                break;
        }
    };

    useEffect(() => {
        if (team1Score >= targetScore && !winner) {
            setWinner(1);
            playSound('win');
        } else if (team2Score >= targetScore && !winner) {
            setWinner(2);
            playSound('win');
        }
    }, [team1Score, team2Score, targetScore]);

    const addPoints = (team: 1 | 2, points: number) => {
        if (winner) return;
        playSound('click');

        if (team === 1) {
            setCurrentRound(prev => ({ ...prev, team1: prev.team1 + points }));
        } else {
            setCurrentRound(prev => ({ ...prev, team2: prev.team2 + points }));
        }
    };

    const confirmRound = () => {
        if (currentRound.team1 === 0 && currentRound.team2 === 0) return;
        playSound('score');

        setTeam1Score(prev => prev + currentRound.team1);
        setTeam2Score(prev => prev + currentRound.team2);
        setRounds(prev => [...prev, currentRound]);
        setCurrentRound({ team1: 0, team2: 0 });
    };

    const undoLastRound = () => {
        if (rounds.length === 0) return;
        playSound('undo');

        const lastRound = rounds[rounds.length - 1];
        setTeam1Score(prev => prev - lastRound.team1);
        setTeam2Score(prev => prev - lastRound.team2);
        setRounds(prev => prev.slice(0, -1));
        setWinner(null);
    };

    const resetGame = async () => {
        const confirmed = await confirm('¿Reiniciar la partida?', 'Se perderán todos los puntos.');
        if (confirmed) {
            playSound('undo');
            setTeam1Score(0);
            setTeam2Score(0);
            setRounds([]);
            setCurrentRound({ team1: 0, team2: 0 });
            setWinner(null);
        }
    };

    const resetCurrentRound = () => {
        playSound('undo');
        setCurrentRound({ team1: 0, team2: 0 });
    };

    return (
        <div className="domino-screen">
            <header className="domino-header">
                <button className="back-btn" onClick={() => navigate('/utilities')}>
                    ←
                </button>
                <h1>🁩 Dominó</h1>
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

            {/* Settings Panel */}
            {showSettings && (
                <div className="settings-panel">
                    <div className="setting-row">
                        <span>Meta:</span>
                        <div className="target-options">
                            {[100, 150, 200].map(t => (
                                <button
                                    key={t}
                                    className={targetScore === t ? 'active' : ''}
                                    onClick={() => setTargetScore(t)}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="target-display">
                Gana quien llegue a <strong>{targetScore}</strong>
            </div>

            {/* Score Boards - Click to select for numpad */}
            <div className="score-boards">
                <div
                    className={`score-board team1 ${winner === 1 ? 'winner' : ''} ${team1Score > team2Score ? 'leading' : ''} ${selectedTeam === 1 ? 'selected' : ''}`}
                    style={{ '--team-color': team1Color } as React.CSSProperties}
                    onClick={() => setSelectedTeam(1)}
                >
                    <div className="team-header">
                        <input
                            className="team-name"
                            value={team1Name}
                            onChange={e => setTeam1Name(e.target.value)}
                        />
                        <button
                            className="color-picker-btn"
                            style={{ background: team1Color }}
                            onClick={() => setShowColorPicker(showColorPicker === 1 ? null : 1)}
                        />
                    </div>

                    {showColorPicker === 1 && (
                        <div className="color-options">
                            {TEAM_COLORS.map(c => (
                                <button
                                    key={c.value}
                                    style={{ background: c.value }}
                                    className={team1Color === c.value ? 'selected' : ''}
                                    onClick={() => { setTeam1Color(c.value); setShowColorPicker(null); }}
                                />
                            ))}
                        </div>
                    )}

                    <div className="score">{team1Score}</div>
                    {currentRound.team1 > 0 && (
                        <div className="pending-points">+{currentRound.team1}</div>
                    )}
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${Math.min(100, (team1Score / targetScore) * 100)}%` }}
                        />
                    </div>
                    <div className="point-buttons">
                        {pointButtons.map(p => (
                            <button key={p} onClick={() => addPoints(1, p)} disabled={!!winner}>
                                +{p}
                            </button>
                        ))}
                    </div>
                    <div className="custom-input">
                        <input
                            type="number"
                            placeholder="Otro"
                            value={customInput1}
                            onChange={e => setCustomInput1(e.target.value)}
                            disabled={!!winner}
                        />
                        <button onClick={() => handleCustomAdd(1)} disabled={!!winner || !customInput1}>+</button>
                    </div>
                </div>

                <div className="vs-divider">
                    <span>VS</span>
                </div>

                <div
                    className={`score-board team2 ${winner === 2 ? 'winner' : ''} ${team2Score > team1Score ? 'leading' : ''} ${selectedTeam === 2 ? 'selected' : ''}`}
                    style={{ '--team-color': team2Color } as React.CSSProperties}
                    onClick={() => setSelectedTeam(2)}
                >
                    <div className="team-header">
                        <input
                            className="team-name"
                            value={team2Name}
                            onChange={e => setTeam2Name(e.target.value)}
                        />
                        <button
                            className="color-picker-btn"
                            style={{ background: team2Color }}
                            onClick={() => setShowColorPicker(showColorPicker === 2 ? null : 2)}
                        />
                    </div>

                    {showColorPicker === 2 && (
                        <div className="color-options">
                            {TEAM_COLORS.map(c => (
                                <button
                                    key={c.value}
                                    style={{ background: c.value }}
                                    className={team2Color === c.value ? 'selected' : ''}
                                    onClick={() => { setTeam2Color(c.value); setShowColorPicker(null); }}
                                />
                            ))}
                        </div>
                    )}

                    <div className="score">{team2Score}</div>
                    {currentRound.team2 > 0 && (
                        <div className="pending-points">+{currentRound.team2}</div>
                    )}
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${Math.min(100, (team2Score / targetScore) * 100)}%` }}
                        />
                    </div>
                    <div className="point-buttons">
                        {pointButtons.map(p => (
                            <button key={p} onClick={() => addPoints(2, p)} disabled={!!winner}>
                                +{p}
                            </button>
                        ))}
                    </div>
                    <div className="custom-input">
                        <input
                            type="number"
                            placeholder="Otro"
                            value={customInput2}
                            onChange={e => setCustomInput2(e.target.value)}
                            disabled={!!winner}
                        />
                        <button onClick={() => handleCustomAdd(2)} disabled={!!winner || !customInput2}>+</button>
                    </div>
                </div>
            </div>

            {/* Round Actions */}
            <div className="round-actions">
                <button
                    className="confirm-round-btn"
                    onClick={confirmRound}
                    disabled={currentRound.team1 === 0 && currentRound.team2 === 0}
                >
                    ✓ Confirmar Ronda
                </button>
                <button className="reset-round-btn" onClick={resetCurrentRound}>
                    ↩
                </button>
            </div>

            {/* Rounds History */}
            {rounds.length > 0 && (
                <div className="rounds-history">
                    <div className="history-header">
                        <h3>Rondas ({rounds.length})</h3>
                        <button className="undo-btn" onClick={undoLastRound}>
                            ↩ Deshacer
                        </button>
                    </div>
                    <div className="rounds-list">
                        {rounds.map((r, i) => (
                            <div key={i} className="round-row">
                                <span className="round-num">{i + 1}</span>
                                <span
                                    className={r.team1 > r.team2 ? 'highlight' : ''}
                                    style={{ color: r.team1 > r.team2 ? team1Color : undefined }}
                                >
                                    {r.team1}
                                </span>
                                <span className="separator">-</span>
                                <span
                                    className={r.team2 > r.team1 ? 'highlight' : ''}
                                    style={{ color: r.team2 > r.team1 ? team2Color : undefined }}
                                >
                                    {r.team2}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Winner Modal */}
            {winner && (
                <div className="winner-modal">
                    <div className="winner-content">
                        <div className="confetti">
                            {[...Array(30)].map((_, i) => (
                                <div
                                    key={i}
                                    className="confetti-piece"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        animationDelay: `${Math.random() * 2}s`,
                                        background: i % 2 === 0 ? team1Color : team2Color
                                    }}
                                />
                            ))}
                        </div>
                        <div className="trophy-container">
                            <div className="trophy">🏆</div>
                            <div className="glow" style={{ background: winner === 1 ? team1Color : team2Color }} />
                        </div>
                        <h2 style={{ color: winner === 1 ? team1Color : team2Color }}>
                            ¡{winner === 1 ? team1Name : team2Name} Gana!
                        </h2>
                        <div className="final-score">
                            <span style={{ color: team1Color }}>{team1Score}</span>
                            <span className="dash"> - </span>
                            <span style={{ color: team2Color }}>{team2Score}</span>
                        </div>
                        <button onClick={resetGame} className="new-game-btn">
                            🔄 Nueva Partida
                        </button>
                    </div>
                </div>
            )}

            {/* Game Actions */}
            <div className="game-actions">
                <button className="reset-game-btn" onClick={resetGame}>
                    🔄 Reiniciar Partida
                </button>
            </div>
        </div>
    );
};
