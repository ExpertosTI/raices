import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../../components/FloatingDock';
import './TicTacToeUltimate.css';

// 0-8 for board indices
type Player = 'X' | 'O';
type CellValue = Player | null;
type BoardWinner = Player | 'T' | null;
// Unused types removed

export const TicTacToeUltimate = () => {
    const navigate = useNavigate();
    const [boards, setBoards] = useState<CellValue[][]>(Array(9).fill(Array(9).fill(null)));
    const [macroBoard, setMacroBoard] = useState<BoardWinner[]>(Array(9).fill(null));
    const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
    const [activeBoard, setActiveBoard] = useState<number | null>(null); // null means any board is valid
    const [winner, setWinner] = useState<BoardWinner>(null);
    const [lastMove, setLastMove] = useState<{ boardIdx: number, cellIdx: number } | null>(null);

    // Initialize clean state
    useEffect(() => {
        resetGame();
    }, []);

    const resetGame = () => {
        setBoards(Array(9).fill(null).map(() => Array(9).fill(null)));
        setMacroBoard(Array(9).fill(null));
        setCurrentPlayer('X');
        setActiveBoard(null);
        setWinner(null);
        setLastMove(null);
    };

    const checkWinner = (squares: (CellValue | BoardWinner)[]): BoardWinner => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return squares[a];
            }
        }
        return null;
    };

    const isBoardFull = (squares: CellValue[]): boolean => {
        return squares.every(cell => cell !== null);
    };

    const handleCellClick = (boardIdx: number, cellIdx: number) => {
        if (winner || (activeBoard !== null && activeBoard !== boardIdx)) return;
        if (boards[boardIdx][cellIdx] || macroBoard[boardIdx]) return;

        // Clone boards to avoid mutation
        const newBoards = [...boards];
        const newBoard = [...newBoards[boardIdx]];
        newBoard[cellIdx] = currentPlayer;
        newBoards[boardIdx] = newBoard;
        setBoards(newBoards);

        setLastMove({ boardIdx, cellIdx });

        // Check for local win
        const localWin = checkWinner(newBoard);
        const newMacroBoard = [...macroBoard];

        if (localWin) {
            newMacroBoard[boardIdx] = localWin;
            setMacroBoard(newMacroBoard);

            // Check global win
            const globalWin = checkWinner(newMacroBoard);
            if (globalWin) {
                setWinner(globalWin);
                return;
            }
        } else if (isBoardFull(newBoard)) {
            // Draw in local board? Currently effectively closes the board
            // Rules vary: some play it as a 'tied' board, some ignore.
            // Simplified: Just mark as 'T' for tie? Or leave null but unplayable?
            // Let's marking it as blocked but no winner.
            newMacroBoard[boardIdx] = 'T' as any; // Tie
            setMacroBoard(newMacroBoard);
        }

        // Determine next active board
        // Rule: The cell index you played in determines the board index for the next player
        // If that target board is won or full, the next player can play ANYWHERE
        const nextBoardIdx = cellIdx;

        if (newMacroBoard[nextBoardIdx] !== null) {
            setActiveBoard(null); // Free move
        } else {
            setActiveBoard(nextBoardIdx);
        }

        setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    };

    return (
        <div className="ultimate-tictactoe-screen">
            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/utilities')}>
                    ← Salir
                </button>
                <h1>Tateti Definitivo</h1>
                <div className="turn-indicator">
                    Turno: <span className={`player-${currentPlayer}`}>{currentPlayer}</span>
                </div>
            </header>

            <div className={`game-board ${winner ? 'game-over' : ''}`}>
                {boards.map((board, boardIdx) => {
                    const isClosed = macroBoard[boardIdx] !== null;
                    const isActive = !winner && !isClosed && (activeBoard === null || activeBoard === boardIdx);
                    const boardWinner = macroBoard[boardIdx];

                    return (
                        <div
                            key={boardIdx}
                            className={`mini-board ${isActive ? 'active' : ''} ${isClosed ? 'closed' : ''}`}
                            onClick={() => {
                                if (activeBoard !== null && activeBoard !== boardIdx && !macroBoard[activeBoard] && !winner) {
                                    // Visual feedback for wrong board
                                    const el = document.getElementById('game-message');
                                    if (el) {
                                        el.innerText = "¡Debes jugar en el tablero iluminado!";
                                        setTimeout(() => el.innerText = "", 2000);
                                    }
                                }
                            }}
                        >
                            {boardWinner ? (
                                <div className={`board-winner-overlay ${boardWinner === 'T' ? 'tie' : boardWinner}`}>
                                    {boardWinner === 'T' ? '-' : boardWinner}
                                </div>
                            ) : null}

                            {board.map((cell, cellIdx) => (
                                <button
                                    key={cellIdx}
                                    className={`cell ${cell} ${lastMove?.boardIdx === boardIdx && lastMove?.cellIdx === cellIdx ? 'last-move' : ''}`}
                                    onClick={() => handleCellClick(boardIdx, cellIdx)}
                                    disabled={!!winner || !!cell || !!boardWinner || (!isActive)}
                                >
                                    {cell}
                                </button>
                            ))}
                        </div>
                    );
                })}
            </div>

            <div id="game-message" className="game-toast"></div>

            {winner && (
                <div className="winner-modal">
                    <div className="winner-content">
                        <h2>¡Victoria!</h2>
                        <div className="winner-avatar">
                            {winner === 'X' ? '❌' : '⭕'}
                        </div>
                        <p>Ha ganado el jugador {winner}</p>
                        <button className="reset-btn" onClick={resetGame}>
                            Jugar de Nuevo
                        </button>
                    </div>
                </div>
            )}

            <FloatingDock />
        </div>
    );
};
