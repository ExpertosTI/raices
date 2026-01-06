import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../../components/FloatingDock';
import { soundManager } from '../../../utils/SoundManager';
import { getFamilyMembers } from '../../../services/api';
import type { FamilyMember } from '../../../types';
import './BattleshipGame.css';

// Board size 8x8 for mobile friendliness
const BOARD_SIZE = 8;
type CellState = 'empty' | 'ship' | 'hit' | 'miss';
type Board = CellState[][];

const INITIAL_SHIPS = [
    { name: 'Portaaviones', size: 4, hits: 0 },
    { name: 'Submarino', size: 3, hits: 0 },
    { name: 'Destructor', size: 2, hits: 0 },
    { name: 'Patrulla', size: 2, hits: 0 },
];

export const BattleshipGame = () => {
    const navigate = useNavigate();
    const [gameState, setGameState] = useState<'CHAR_SELECT' | 'SETUP' | 'PASS' | 'PLAY' | 'GAME_OVER'>('CHAR_SELECT');
    const [turn, setTurn] = useState<1 | 2>(1);

    // Players
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [p1Character, setP1Character] = useState<FamilyMember | null>(null);
    const [p2Character, setP2Character] = useState<FamilyMember | null>(null);

    const [player1Board, setPlayer1Board] = useState<Board>(createEmptyBoard());
    const [player2Board, setPlayer2Board] = useState<Board>(createEmptyBoard());
    const [player1Guesses, setPlayer1Guesses] = useState<Board>(createEmptyBoard());
    const [player2Guesses, setPlayer2Guesses] = useState<Board>(createEmptyBoard());

    const [currentShipIndex, setCurrentShipIndex] = useState(0);
    const [orientation, setOrientation] = useState<'H' | 'V'>('H');
    const [message, setMessage] = useState('');

    // Powerups
    const [powerups, setPowerups] = useState<Record<number, { radar: boolean }>>({ 1: { radar: true }, 2: { radar: true } });
    const [activePowerup, setActivePowerup] = useState<'RADAR' | null>(null);

    useEffect(() => {
        getFamilyMembers().then(setMembers).catch(console.error);
    }, []);

    function createEmptyBoard(): Board {
        return Array(8).fill(null).map(() => Array(8).fill('empty'));
    }

    const currentPlayerBoard = turn === 1 ? player1Board : player2Board;
    const setCurrentPlayerBoard = turn === 1 ? setPlayer1Board : setPlayer2Board;

    const useRadar = (row: number, col: number) => {
        const enemyBoard = turn === 1 ? player2Board : player1Board;
        const myGuesses = turn === 1 ? player1Guesses : player2Guesses;
        const setMyGuesses = turn === 1 ? setPlayer1Guesses : setPlayer2Guesses;

        const newGuesses = [...myGuesses.map(r => [...r])];
        let found = false;

        // Reveal 3x3
        for (let r = row - 1; r <= row + 1; r++) {
            for (let c = col - 1; c <= col + 1; c++) {
                if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                    if (enemyBoard[r][c] === 'ship') {
                        newGuesses[r][c] = 'hit'; // Reveal ship!
                        found = true;
                    } else if (newGuesses[r][c] === 'empty') {
                        newGuesses[r][c] = 'miss';
                    }
                }
            }
        }

        setMyGuesses(newGuesses);
        setActivePowerup(null);
        setPowerups(p => ({ ...p, [turn]: { ...p[turn], radar: false } })); // Consume
        setMessage(found ? '¡Radar detectó objetivos!' : 'Radar no detectó nada.');
        soundManager.playTone(800, 'sawtooth', 0.5);
    };

    const handleCellClick = (row: number, col: number) => {
        if (gameState === 'SETUP') {
            const ship = INITIAL_SHIPS[currentShipIndex];
            if (!ship) return;

            // Check bounds
            if (orientation === 'H' && col + ship.size > BOARD_SIZE) return;
            if (orientation === 'V' && row + ship.size > BOARD_SIZE) return;

            // Check collision
            const newBoard = [...currentPlayerBoard.map(r => [...r])];
            for (let i = 0; i < ship.size; i++) {
                const r = orientation === 'V' ? row + i : row;
                const c = orientation === 'H' ? col + i : col;
                if (newBoard[r][c] !== 'empty') {
                    setMessage('¡Posición inválida! Ya hay un barco ahí.');
                    return;
                }
            }

            // Place ship
            for (let i = 0; i < ship.size; i++) {
                const r = orientation === 'V' ? row + i : row;
                const c = orientation === 'H' ? col + i : col;
                newBoard[r][c] = 'ship';
            }

            setCurrentPlayerBoard(newBoard);
            setMessage('');
            soundManager.playTone(600, 'square', 0.05); // Place sound

            if (currentShipIndex < INITIAL_SHIPS.length - 1) {
                setCurrentShipIndex(currentShipIndex + 1);
            } else {
                // Setup finished for player
                if (turn === 1) {
                    setGameState('PASS');
                    setMessage('Pasa el dispositivo al Jugador 2');
                } else {
                    setGameState('PASS');
                    setTurn(1); // Ready to start play
                    setMessage('¡Listos! Pasa al Jugador 1 para empezar');
                }
            }
        } else if (gameState === 'PLAY') {
            if (activePowerup === 'RADAR') {
                useRadar(row, col);
                return;
            }
            makeMove(row, col);
        }
    };

    const makeMove = (row: number, col: number) => {
        const enemyBoard = turn === 1 ? player2Board : player1Board;
        const myGuesses = turn === 1 ? player1Guesses : player2Guesses;
        const setMyGuesses = turn === 1 ? setPlayer1Guesses : setPlayer2Guesses;

        if (myGuesses[row][col] !== 'empty') return;

        const newGuesses = [...myGuesses.map(r => [...r])];
        let hit = false;

        if (enemyBoard[row][col] === 'ship') {
            newGuesses[row][col] = 'hit';
            hit = true;
            setMessage('¡IMPACTO! 💥');
            soundManager.playExplosion();
            checkWin(newGuesses, enemyBoard);
        } else {
            newGuesses[row][col] = 'miss';
            setMessage('Agua... 🌊');
            soundManager.playTone(200, 'sine', 0.3); // Splash sound
        }

        setMyGuesses(newGuesses);

        if (!hit) {
            setTimeout(() => {
                setGameState('PASS');
                setMessage(`Turno del Jugador ${turn === 1 ? 2 : 1}`);
            }, 1000);
        }
    };

    const checkWin = (guesses: Board, enemyShips: Board) => {
        // Count total ship cells
        let totalShipCells = 0;
        let totalHits = 0;

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (enemyShips[r][c] === 'ship') totalShipCells++;
                if (guesses[r][c] === 'hit') totalHits++;
            }
        }

        if (totalHits === totalShipCells) {
            setGameState('GAME_OVER');
            setMessage(`¡JUGADOR ${turn} GANA! 🏆`);
            soundManager.playLevelUp(); // Victory sound
        }
    };

    const startNextTurn = () => {
        if (gameState === 'PASS') {
            if (currentShipIndex === INITIAL_SHIPS.length - 1 && turn === 1 && player2Board[0][0] === 'empty' && player1Board[0][0] !== 'empty') {
                // Transition from P1 setup to P2 setup
                setTurn(2);
                setGameState('SETUP');
                setCurrentShipIndex(0);
                setCurrentShipIndex(0);
                // Don't show P1's selection
                // Wait, P2 needs their own empty board to place.
                // We already have player2Board state.
                return;
            }

            // Normal turn change
            if (turn === 1 && player2Board.some(r => r.some(c => c === 'ship'))) {
                setTurn(2);
                setGameState('PLAY');
            } else if (turn === 2) {
                setTurn(1);
                setGameState('PLAY');
            }
        }
    };

    const handleCharacterSelect = (member: FamilyMember) => {
        soundManager.playTone(600, 'sine', 0.1);
        if (!p1Character) {
            setP1Character(member);
            setMessage('Jugador 2: Elige tu Capitán');
        } else {
            setP2Character(member);
            setGameState('SETUP');
            setMessage('Jugador 1: Coloca tus barcos');
        }
    };

    return (
        <div className="battleship-screen">
            {/* Ambient Water Background */}
            <div className="water-bg"></div>

            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/utilities')}>
                    ← Salir
                </button>
                <h1>Batalla Naval</h1>
            </header>

            {gameState === 'CHAR_SELECT' ? (
                <div className="char-select-screen">
                    <h2>{!p1Character ? 'Jugador 1' : 'Jugador 2'}</h2>
                    <h3>Elige tu Comandante</h3>
                    <div className="char-grid">
                        {members.filter(m => m.photo).slice(0, 12).map(m => ( // Limit to 12 for UI sanity or filter
                            <div key={m.id} className="char-card" onClick={() => handleCharacterSelect(m)}>
                                <div className="char-avatar-lg">
                                    <img src={m.photo} alt={m.name} />
                                </div>
                                <span>{m.name.split(' ')[0]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : gameState === 'PASS' ? (
                <div className="pass-screen">
                    <div className="radar-animation"></div>
                    <div className="pass-icon">📱🔄📱</div>
                    <h2>Cambio de Turno</h2>
                    <p>{message}</p>
                    <button className="ready-btn" onClick={startNextTurn}>
                        Listo
                    </button>
                    <div className="next-player-preview">
                        {/* Logic to show who is next */}
                        {(() => {
                            const nextTurn = (turn === 1 && player1Board[0][0] !== 'empty' && player2Board[0][0] === 'empty') ? 2
                                : (turn === 1 && player2Board.some(r => r.some(c => c === 'ship'))) ? 2 // Switching to P2
                                    : 1; // Back to P1
                            const char = nextTurn === 1 ? p1Character : p2Character;
                            return (
                                <div className="preview-avatar">
                                    {char?.photo && <img src={char.photo} alt="Next" />}
                                    <span>Comandante {char?.name.split(' ')[0]}</span>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            ) : gameState === 'GAME_OVER' ? (
                <div className="game-over-screen">
                    <div className="trophy">🏆</div>
                    <div className="winner-avatar">
                        <img src={turn === 1 ? p1Character?.photo : p2Character?.photo} alt="Winner" />
                    </div>
                    <h2>¡{turn === 1 ? p1Character?.name : p2Character?.name} GANA!</h2>
                    <button className="restart-btn" onClick={() => window.location.reload()}>
                        Jugar Otra Vez
                    </button>
                </div>
            ) : (
                <div className="game-content">
                    <div className="status-bar">
                        <div className="player-info">
                            <div className="mini-avatar">
                                <img src={turn === 1 ? p1Character?.photo : p2Character?.photo} alt="Player" />
                            </div>
                            <span className={`player-badge p${turn}`}>
                                {turn === 1 ? p1Character?.name.split(' ')[0] : p2Character?.name.split(' ')[0]}
                            </span>
                        </div>
                        <span className="phase">{gameState === 'SETUP' ? 'DESPLIEGUE' : 'COMBATE'}</span>

                        {gameState === 'PLAY' && powerups[turn].radar && (
                            <button
                                className={`powerup-btn ${activePowerup === 'RADAR' ? 'active' : ''}`}
                                onClick={() => setActivePowerup(activePowerup === 'RADAR' ? null : 'RADAR')}
                            >
                                📡 Radar (1)
                            </button>
                        )}
                    </div>

                    {message && <div className="game-toast">{message}</div>}

                    <div className="battleship-layout" style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '400px', margin: '0 auto' }}>

                        {/* 1. OFFENSIVE BOARD (RADAR) - My guesses */}
                        <div className="board-section">
                            <h3>📡 RADAR (Tus ataques)</h3>
                            <div className="board-container">
                                <div className="grid-labels">
                                    <div className="corner"></div>
                                    {Array(8).fill(0).map((_, i) => <div key={i} className="col-label">{i + 1}</div>)}
                                    {Array(8).fill(0).map((_, i) => (
                                        <div key={`row-${i}`} style={{ display: 'contents' }}>
                                            <div className="row-label">{String.fromCharCode(65 + i)}</div>
                                            {Array(8).fill(0).map((_, j) => {
                                                const guesses = turn === 1 ? player1Guesses : player2Guesses;
                                                let cellClass = 'cell empty';
                                                let content = '';

                                                if (guesses[i][j] === 'hit') {
                                                    cellClass = 'cell hit';
                                                    content = '💥';
                                                } else if (guesses[i][j] === 'miss') {
                                                    cellClass = 'cell miss';
                                                    content = '🌊';
                                                }

                                                return (
                                                    <div
                                                        key={`${i}-${j}`}
                                                        className={cellClass}
                                                        onClick={() => handleCellClick(i, j)}
                                                    >
                                                        {content}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 2. DEFENSIVE BOARD (MY FLEET) - My ships and enemy hits */}
                        {gameState === 'PLAY' && (
                            <div className="board-section">
                                <h3>🚢 MI FLOTA (Tu territorio)</h3>
                                <div className="board-container small-board" style={{ transform: 'scale(0.9)' }}>
                                    <div className="grid-labels">
                                        <div className="corner"></div>
                                        {Array(8).fill(0).map((_, i) => <div key={i} className="col-label">{i + 1}</div>)}
                                        {Array(8).fill(0).map((_, i) => (
                                            <div key={`row-${i}`} style={{ display: 'contents' }}>
                                                <div className="row-label">{String.fromCharCode(65 + i)}</div>
                                                {Array(8).fill(0).map((_, j) => {
                                                    // My board (ships) vs Enemy guesses
                                                    const myBoard = turn === 1 ? player1Board : player2Board;
                                                    const enemyGuesses = turn === 1 ? player2Guesses : player1Guesses;

                                                    let cellClass = 'cell empty';
                                                    let content = '';

                                                    if (myBoard[i][j] === 'ship') {
                                                        cellClass = 'cell ship';
                                                        content = '⬜'; // Ship part
                                                    }

                                                    if (enemyGuesses[i][j] === 'hit') {
                                                        cellClass = 'cell hit';
                                                        content = '🔥'; // On fire!
                                                    } else if (enemyGuesses[i][j] === 'miss') {
                                                        cellClass = 'cell miss';
                                                        content = '🌊';
                                                    }

                                                    return (
                                                        <div
                                                            key={`${i}-${j}`}
                                                            className={cellClass}
                                                            // No click on my own board
                                                            style={{ cursor: 'default' }}
                                                        >
                                                            {content}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {gameState === 'SETUP' && (
                        <div className="setup-controls">
                            <p>Colocando: <strong>{INITIAL_SHIPS[currentShipIndex]?.name}</strong> ({INITIAL_SHIPS[currentShipIndex]?.size})</p>
                            <button className="rotate-btn" onClick={() => setOrientation(o => o === 'H' ? 'V' : 'H')}>
                                Rotar: {orientation === 'H' ? 'Horizontal ➡' : 'Vertical ⬇'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            <FloatingDock />
        </div>
    );
};
