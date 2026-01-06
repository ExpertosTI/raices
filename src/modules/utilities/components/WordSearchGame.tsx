import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../../components/FloatingDock';
import { getFamilyMembers } from '../../../services/api';
import './WordSearchGame.css';

const GRID_SIZE = 10;

export const WordSearchGame = () => {
    const navigate = useNavigate();
    const [grid, setGrid] = useState<string[][]>([]);
    const [words, setWords] = useState<string[]>([]);
    const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
    const [selectedCells, setSelectedCells] = useState<{ r: number, c: number }[]>([]);
    const [isSelecting, setIsSelecting] = useState(false);

    useEffect(() => {
        generateGame();
    }, []);

    const generateGame = async () => {
        try {
            const members = await getFamilyMembers();
            // Pick 5 random names
            const names = members
                .map(m => m.name.split(' ')[0].toUpperCase())
                .filter(n => n.length >= 3 && n.length <= 8)
                .sort(() => 0.5 - Math.random())
                .slice(0, 5);

            const newGrid = Array(GRID_SIZE).fill('').map(() => Array(GRID_SIZE).fill(''));

            // Place words
            names.forEach(word => {
                placeWord(newGrid, word);
            });

            // Fill empty
            const letters = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (!newGrid[r][c]) {
                        newGrid[r][c] = letters[Math.floor(Math.random() * letters.length)];
                    }
                }
            }

            setGrid(newGrid);
            setWords(names);
            setFoundWords(new Set());
        } catch (e) {
            console.error(e);
        }
    };

    const placeWord = (grid: string[][], word: string) => {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            const dir = Math.random() > 0.5 ? 'H' : 'V';
            const r = Math.floor(Math.random() * GRID_SIZE);
            const c = Math.floor(Math.random() * GRID_SIZE);

            if (canPlace(grid, word, r, c, dir)) {
                for (let i = 0; i < word.length; i++) {
                    if (dir === 'H') grid[r][c + i] = word[i];
                    else grid[r + i][c] = word[i];
                }
                placed = true;
            }
            attempts++;
        }
    };

    const canPlace = (grid: string[][], word: string, r: number, c: number, dir: string) => {
        if (dir === 'H' && c + word.length > GRID_SIZE) return false;
        if (dir === 'V' && r + word.length > GRID_SIZE) return false;

        for (let i = 0; i < word.length; i++) {
            const cell = dir === 'H' ? grid[r][c + i] : grid[r + i][c];
            if (cell !== '' && cell !== word[i]) return false;
        }
        return true;
    };

    const handleStartSelect = (r: number, c: number) => {
        setIsSelecting(true);
        setSelectedCells([{ r, c }]);
    };

    const handleEnterSelect = (r: number, c: number) => {
        if (!isSelecting) return;
        // Check if linear valid selection from start
        const start = selectedCells[0];

        // Horizontal
        if (start.r === r) {
            const cells = [];
            const min = Math.min(start.c, c);
            const max = Math.max(start.c, c);
            for (let i = min; i <= max; i++) cells.push({ r, c: i });
            setSelectedCells(cells);
        }
        // Vertical
        else if (start.c === c) {
            const cells = [];
            const min = Math.min(start.r, r);
            const max = Math.max(start.r, r);
            for (let i = min; i <= max; i++) cells.push({ r: i, c });
            setSelectedCells(cells);
        }
    };

    const handleEndSelect = () => {
        setIsSelecting(false);
        // Form word
        const chars = selectedCells.map(cell => grid[cell.r][cell.c]).join('');
        const revChars = chars.split('').reverse().join('');

        if (words.includes(chars) && !foundWords.has(chars)) {
            setFoundWords(prev => new Set([...prev, chars]));
        } else if (words.includes(revChars) && !foundWords.has(revChars)) {
            setFoundWords(prev => new Set([...prev, revChars]));
        }

        setSelectedCells([]);
    };

    const isCellSelected = (r: number, c: number) => {
        return selectedCells.some(cell => cell.r === r && cell.c === c);
    };



    return (
        <div className="word-search-screen">
            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/utilities')}>←</button>
                <h3>Sopa de Letras</h3>
            </header>

            <div className="word-list">
                {words.map(w => (
                    <span key={w} className={foundWords.has(w) ? 'found' : ''}>{w}</span>
                ))}
            </div>

            <div
                className="grid-container"
                onMouseLeave={handleEndSelect}
                onTouchEnd={handleEndSelect}
            >
                {grid.map((row, r) => (
                    <div key={r} className="grid-row">
                        {row.map((letter, c) => (
                            <div
                                key={c}
                                className={`grid-cell ${isCellSelected(r, c) ? 'selected' : ''}`}
                                onMouseDown={() => handleStartSelect(r, c)}
                                onMouseEnter={() => handleEnterSelect(r, c)}
                                onMouseUp={handleEndSelect}
                                // Simple touch support simulation
                                onTouchStart={() => handleStartSelect(r, c)}
                            >
                                {letter}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <button className="new-game-btn" onClick={generateGame}>Nueva Partida</button>
            <FloatingDock />
        </div>
    );
};
