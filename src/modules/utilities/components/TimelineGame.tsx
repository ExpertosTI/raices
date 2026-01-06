import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../../components/FloatingDock';
import { getFamilyMembers } from '../../../services/api';
import { soundManager } from '../../../utils/SoundManager';
// dnd-kit imports removed as they were unused
import './TimelineGame.css';

interface GameEvent {
    id: string;
    date: Date;
    year: number;
    title: string;
    photo?: string;
    description: string;
}

// Draggable components removed until needed


export const TimelineGame = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<GameEvent[]>([]);
    const [currentPayload, setCurrentPayload] = useState<GameEvent | null>(null); // The card to place
    const [placedEvents, setPlacedEvents] = useState<GameEvent[]>([]); // Events correctly placed on timeline
    const [lives, setLives] = useState(3);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<'LOADING' | 'PLAYING' | 'GAME_OVER' | 'VICTORY'>('LOADING');


    useEffect(() => {
        loadGameData();
    }, []);

    const loadGameData = async () => {
        try {
            const members = await getFamilyMembers();
            const validMembers = members.filter(m => m.birthDate);

            if (validMembers.length < 5) {
                alert("Necesitas al menos 5 miembros con fecha de nacimiento para jugar.");
                navigate('/utilities');
                return;
            }

            // Create events from births
            const allEvents: GameEvent[] = validMembers.map(m => {
                const date = new Date(m.birthDate!);
                return {
                    id: m.id,
                    date: date,
                    year: date.getFullYear(),
                    title: `Nacimiento de ${m.name.split(' ')[0]}`,
                    photo: m.photo,
                    description: m.name
                };
            });

            // Shuffle and pick
            const shuffled = allEvents.sort(() => 0.5 - Math.random());
            const queue = shuffled.slice(0, 10); // 10 rounds

            // Initial seed: Place one random event to start the timeline logic
            const seedEvent = queue.pop()!;

            setEvents(queue); // Remaining to play
            setPlacedEvents([seedEvent]); // Start with one reference point
            setCurrentPayload(queue[0]); // Current one to play
            setEvents(queue.slice(1)); // Remove current from queue

            setLives(3);
            setScore(0);
            setGameState('PLAYING');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };



    // Simplified Logic: Buttons to choose "Before" or "After" specific points?
    // OR Drag to gaps?
    // Let's do: Show current card. User drags it to the gaps between placed cards.

    // Gap Detection
    // If placedEvents is [A, B] sorted by date.
    // Gaps are: Before A, Between A & B, After B. (3 gaps)

    const handleGapClick = (gapIndex: number) => {
        if (!currentPayload || gameState !== 'PLAYING') return;

        const sortedPlaced = [...placedEvents].sort((a, b) => a.date.getTime() - b.date.getTime());

        // Validation
        let correctGapIndex = 0;

        // Find where it SHOULD go
        if (sortedPlaced.length === 0) {
            correctGapIndex = 0;
        } else {
            // Check before first
            if (currentPayload.date < sortedPlaced[0].date) {
                correctGapIndex = 0;
            } else if (currentPayload.date > sortedPlaced[sortedPlaced.length - 1].date) {
                correctGapIndex = sortedPlaced.length;
            } else {
                // Somewhere in between
                for (let i = 0; i < sortedPlaced.length - 1; i++) {
                    if (currentPayload.date > sortedPlaced[i].date && currentPayload.date < sortedPlaced[i + 1].date) {
                        correctGapIndex = i + 1;
                        break;
                    }
                }
            }
        }

        if (gapIndex === correctGapIndex) {
            // Correct!
            setScore(s => s + 100);
            setPlacedEvents([...placedEvents, currentPayload]);
            playSound('correct');

            // Next card
            if (events.length > 0) {
                setCurrentPayload(events[0]);
                setEvents(prev => prev.slice(1));
            } else {
                setGameState('VICTORY');
                playSound('victory');
            }
        } else {
            // Wrong!
            setLives(l => {
                const newLives = l - 1;
                if (newLives <= 0) setGameState('GAME_OVER');
                return newLives;
            });
            playSound('error');
        }
    };

    const playSound = (type: 'correct' | 'error' | 'victory') => {
        if (type === 'correct') {
            soundManager.playLevelUp();
        } else if (type === 'error') {
            soundManager.playGameOver(); // or Explosion
        } else if (type === 'victory') {
            // Arpeggio
            setTimeout(() => soundManager.playTone(400, 'sine', 0.1), 0);
            setTimeout(() => soundManager.playTone(500, 'sine', 0.1), 100);
            setTimeout(() => soundManager.playTone(600, 'sine', 0.1), 200);
            setTimeout(() => soundManager.playTone(800, 'sine', 0.4), 300);
        }
    };

    // Sort placed events for rendering
    const sortedTimeline = [...placedEvents].sort((a, b) => a.date.getTime() - b.date.getTime());

    return (
        <div className="timeline-game-screen">
            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/utilities')}>← Salir</button>
                <div className="lives">
                    {Array(3).fill(0).map((_, i) => (
                        <span key={i} className={i < lives ? 'heart full' : 'heart empty'}>❤️</span>
                    ))}
                </div>
                <div className="score">{score} pts</div>
            </header>

            {loading ? (
                <div className="loading">Cargando historia familiar...</div>
            ) : gameState === 'GAME_OVER' ? (
                <div className="game-over">
                    <h1>¡Fin del Juego!</h1>
                    <p>Puntuación Final: {score}</p>
                    <button className="restart-btn" onClick={loadGameData}>Jugar de Nuevo</button>
                </div>
            ) : gameState === 'VICTORY' ? (
                <div className="victory">
                    <h1>¡Cronista Experto! 📜</h1>
                    <p>Has ordenado toda la línea temporal correctamente.</p>
                    <button className="restart-btn" onClick={loadGameData}>Jugar de Nuevo</button>
                </div>
            ) : (
                <div className="game-area">
                    {/* Current Card to Place */}
                    <div className="current-card-area">
                        <h3>¿Cuándo ocurrió esto?</h3>
                        {currentPayload && (
                            <div className="card-preview shake-entrance">
                                <div className="card-avatar large">
                                    {currentPayload.photo ? <img src={currentPayload.photo} alt="avatar" /> : <span>👤</span>}
                                </div>
                                <h4>{currentPayload.title}</h4>
                                <p className="hint">Sucedió el día {currentPayload.date.getDate()} de...</p>
                            </div>
                        )}
                        <p className="instruction">Toca una flecha ⬇ en la línea de tiempo para colocar la tarjeta</p>
                    </div>

                    {/* Timeline */}
                    <div className="timeline-container">
                        <div className="timeline-track"></div>

                        {/* Render Slots (Gaps) + Events */}
                        <div className="gap-button" onClick={() => handleGapClick(0)}>⬇</div>

                        {sortedTimeline.map((ev, i) => (
                            <Fragment key={ev.id}>
                                <div className="timeline-node bounce-in">
                                    <div className="year-bubble">{ev.year}</div>
                                    <div className="node-content">
                                        <div className="small-avatar">
                                            {ev.photo ? <img src={ev.photo} alt="" /> : '👤'}
                                        </div>
                                        <span className="node-name">{ev.title}</span>
                                    </div>
                                </div>
                                <div className="gap-button" onClick={() => handleGapClick(i + 1)}>⬇</div>
                            </Fragment>
                        ))}
                    </div>
                </div>
            )}

            <FloatingDock />
        </div>
    );
};
