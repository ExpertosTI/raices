import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../../components/FloatingDock';
import './BattleshipGame.css';

// Board size 8x8 for mobile friendliness
const BOARD_SIZE = 8;
type CellState = 'empty' | 'ship' | 'hit' | 'miss';
type Board = CellState[][];

// Ship interface removed as it was unused

const INITIAL_SHIPS = [
    { name: 'Portaaviones', size: 4, hits: 0 },
    { name: 'Submarino', size: 3, hits: 0 },
    { name: 'Destructor', size: 2, hits: 0 },
    { name: 'Patrulla', size: 2, hits: 0 },
];

export const BattleshipGame = () => {
    const navigate = useNavigate();
    const [gameState, setGameState] = useState<'SETUP' | 'PASS' | 'PLAY' | 'GAME_OVER'>('SETUP');
    const [turn, setTurn] = useState<1 | 2>(1);
    const [player1Board, setPlayer1Board] = useState<Board>(createEmptyBoard());
    const [player2Board, setPlayer2Board] = useState<Board>(createEmptyBoard()); // Where P2 places ships
    const [player1Guesses, setPlayer1Guesses] = useState<Board>(createEmptyBoard()); // Where P1 guesses P2
    const [player2Guesses, setPlayer2Guesses] = useState<Board>(createEmptyBoard()); // Where P2 guesses P1

    const [currentShipIndex, setCurrentShipIndex] = useState(0);
    const [orientation, setOrientation] = useState<'H' | 'V'>('H');
    const [message, setMessage] = useState('');

    function createEmptyBoard(): Board {
        return Array(8).fill(null).map(() => Array(8).fill('empty'));
    }

    const currentPlayerBoard = turn === 1 ? player1Board : player2Board;
    const setCurrentPlayerBoard = turn === 1 ? setPlayer1Board : setPlayer2Board;

    const handleCellClick = (row: number, col: number) => {
        if (gameState === 'SETUP') {
            placeShip(row, col);
        } else if (gameState === 'PLAY') {
            makeMove(row, col);
        }
    };

    const placeShip = (row: number, col: number) => {
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
            checkWin(newGuesses, enemyBoard);
        } else {
            newGuesses[row][col] = 'miss';
            setMessage('Agua... 🌊');
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

    return (
        <div className="battleship-screen">
            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/utilities')}>
                    ← Salir
                </button>
                <h1>Batalla Naval</h1>
            </header>

            {gameState === 'PASS' ? (
                <div className="pass-screen">
                    <div className="pass-icon">📱🔄📱</div>
                    <h2>Cambio de Turno</h2>
                    <p>{message}</p>
                    <button className="ready-btn" onClick={startNextTurn}>
                        ¡Soy {turn === 1 && player2Board.some(r => r.some(c => c === 'ship')) ? 'Jugador 2' :
                            turn === 2 ? 'Jugador 1' :
                                turn === 1 ? 'Jugador 2' : 'Jugador 1'}!
                    </button>
                </div>
            ) : gameState === 'GAME_OVER' ? (
                <div className="game-over-screen">
                    <div className="trophy">🏆</div>
                    <h2>¡Jugador {turn} GANA!</h2>
                    <button className="restart-btn" onClick={() => window.location.reload()}>
                        Jugar Otra Vez
                    </button>
                </div>
            ) : (
                <div className="game-content">
                    <div className="status-bar">
                        <span className={`player-badge p${turn}`}>Jugador {turn}</span>
                        <span className="phase">{gameState === 'SETUP' ? 'COLOCAR BARCOS' : 'ATACAR'}</span>
                    </div>

                    {message && <div className="game-toast">{message}</div>}

                    <div className="board-container">
                        <div className="grid-labels">
                            <div className="corner"></div>
                            {Array(8).fill(0).map((_, i) => <div key={i} className="col-label">{i + 1}</div>)}
                            {Array(8).fill(0).map((_, i) => (
                                <div key={`row-${i}`}>
                                    <div className="row-label">{String.fromCharCode(65 + i)}</div>
                                    {Array(8).fill(0).map((_, j) => {
                                        // Render logic
                                        let cellClass = 'cell empty';
                                        let content = '';

                                        if (gameState === 'SETUP') {
                                            const board = currentPlayerBoard;
                                            if (board[i][j] === 'ship') cellClass = 'cell ship';
                                        } else {
                                            const guesses = turn === 1 ? player1Guesses : player2Guesses;
                                            if (guesses[i][j] === 'hit') {
                                                cellClass = 'cell hit';
                                                content = '💥';
                                            } else if (guesses[i][j] === 'miss') {
                                                cellClass = 'cell miss';
                                                content = '🌊';
                                            }
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
