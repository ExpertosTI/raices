import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { soundManager } from '../../../utils/SoundManager';
import { GameMemberSelector } from './GameMemberSelector';
import './ImpostorGame.css';

type Role = 'Impostor' | 'Tripulante';

interface FamilyMember {
    id: string;
    name: string;
    photo?: string;
}

export const ImpostorGame = () => {
    const navigate = useNavigate();
    const [players, setPlayers] = useState<FamilyMember[]>([]);
    const [impostorCount, setImpostorCount] = useState(1);
    const [gameState, setGameState] = useState<'setup' | 'reveal' | 'finished'>('setup');
    const [roles, setRoles] = useState<Role[]>([]);
    const [currentRevealIndex, setCurrentRevealIndex] = useState(0);
    const [showRole, setShowRole] = useState(false);

    const startGame = (selectedMembers: FamilyMember[]) => {
        setPlayers(selectedMembers);

        // Assign roles
        const newRoles: Role[] = Array(selectedMembers.length).fill('Tripulante');

        // Assign impostors
        let assigned = 0;
        let attempts = 0;
        while (assigned < impostorCount && attempts < 100) {
            const idx = Math.floor(Math.random() * selectedMembers.length);
            if (newRoles[idx] !== 'Impostor') {
                newRoles[idx] = 'Impostor';
                assigned++;
            }
            attempts++;
        }

        setRoles(newRoles);
        setGameState('reveal');
        setCurrentRevealIndex(0);
        soundManager.playGameStart();
    };

    const nextPlayer = () => {
        setShowRole(false);
        if (currentRevealIndex < players.length - 1) {
            setCurrentRevealIndex(prev => prev + 1);
        } else {
            setGameState('finished');
        }
        soundManager.playClick();
    };

    const resetGame = () => {
        setPlayers([]);
        setGameState('setup');
        setImpostorCount(1);
    };

    return (
        <div className="impostor-game">
            <header className="game-header">
                <button onClick={() => navigate('/utilities')}>← Salir</button>
                <h1>🕵️ El Impostor</h1>
            </header>

            {gameState === 'setup' && (
                <div className="setup-wrapper">
                    <div className="settings">
                        <label>
                            Cantidad de Impostores:
                            <select
                                value={impostorCount}
                                onChange={(e) => setImpostorCount(Number(e.target.value))}
                            >
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                            </select>
                        </label>
                    </div>

                    <GameMemberSelector
                        onStart={startGame}
                        minPlayers={3}
                        gameTitle="El Impostor"
                    />
                </div>
            )}

            {gameState === 'reveal' && (
                <div className="reveal-phase">
                    <div className="player-reveal-card">
                        <div className="player-photo-wrapper">
                            {players[currentRevealIndex].photo ? (
                                <img
                                    src={players[currentRevealIndex].photo}
                                    alt={players[currentRevealIndex].name}
                                    className="player-photo-large"
                                />
                            ) : (
                                <div className="player-initial-large">
                                    {players[currentRevealIndex].name[0]}
                                </div>
                            )}
                        </div>

                        <h2>Turno de: {players[currentRevealIndex].name}</h2>

                        {!showRole ? (
                            <>
                                <p>Pasa el dispositivo a <strong>{players[currentRevealIndex].name}</strong> <br /> y presiona "Ver Rol".</p>
                                <button className="reveal-btn" onClick={() => setShowRole(true)}>
                                    👁️ Ver Rol
                                </button>
                            </>
                        ) : (
                            <div className={`role-card-revealed ${roles[currentRevealIndex].toLowerCase()} animate-pop`}>
                                <h3>Eres: {roles[currentRevealIndex]}</h3>
                                <p>
                                    {roles[currentRevealIndex] === 'Impostor'
                                        ? '🤫 Elimina a todos sin que te descubran.'
                                        : '🔍 Completa tareas y descubre al impostor.'}
                                </p>
                                <button className="next-btn" onClick={nextPlayer}>
                                    {currentRevealIndex < players.length - 1 ? 'Siguiente Jugador' : 'Finalizar Asignación'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {gameState === 'finished' && (
                <div className="finished-phase">
                    <h2>¡Roles Asignados!</h2>
                    <p>Que comience el juego. Nadie sabe quién es quién.</p>
                    <button onClick={resetGame}>Nueva Partida</button>
                </div>
            )}
        </div>
    );
};
