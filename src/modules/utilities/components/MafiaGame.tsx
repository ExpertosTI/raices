
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { soundManager } from '../../../utils/SoundManager';
import { GameMemberSelector } from './GameMemberSelector';
import './ImpostorGame.css'; // Reuse styles for now as layout is identical

type Role = 'Asesino' | 'Detective' | 'Doctor' | 'Pueblo';

interface FamilyMember {
    id: string;
    name: string;
    photo?: string;
}

export const MafiaGame = () => {
    const navigate = useNavigate();
    const [players, setPlayers] = useState<FamilyMember[]>([]);
    const [gameState, setGameState] = useState<'setup' | 'reveal' | 'finished'>('setup');
    const [roles, setRoles] = useState<Role[]>([]);
    const [currentRevealIndex, setCurrentRevealIndex] = useState(0);
    const [showRole, setShowRole] = useState(false);

    const startGame = (selectedMembers: FamilyMember[]) => {
        setPlayers(selectedMembers);

        // Roles distribution logic
        const newRoles: Role[] = Array(selectedMembers.length).fill('Pueblo');
        const indices = Array.from({ length: selectedMembers.length }, (_, i) => i);
        const shuffledIndices = indices.sort(() => Math.random() - 0.5);

        // Assign Asesino
        newRoles[shuffledIndices[0]] = 'Asesino';
        // Assign Detective
        newRoles[shuffledIndices[1]] = 'Detective';
        // Assign Doctor (if enough players)
        if (selectedMembers.length >= 5) {
            newRoles[shuffledIndices[2]] = 'Doctor';
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
    };

    return (
        <div className="impostor-game">
            <header className="game-header">
                <button onClick={() => navigate('/utilities')}>← Salir</button>
                <h1>🔪 El Asesino</h1>
            </header>

            {gameState === 'setup' && (
                <div className="setup-wrapper">
                    <p className="hint">Se recomienda mínimo 5 jugadores para incluir al Doctor.</p>

                    <GameMemberSelector
                        onStart={startGame}
                        minPlayers={4}
                        gameTitle="El Asesino"
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
                            <div className={`role-card-revealed ${roles[currentRevealIndex].toLowerCase()} animate-pop`} style={{
                                borderColor: roles[currentRevealIndex] === 'Asesino' ? '#ef4444' :
                                    roles[currentRevealIndex] === 'Detective' ? '#3b82f6' :
                                        roles[currentRevealIndex] === 'Doctor' ? '#22c55e' : '#D4AF37'
                            }}>
                                <h3>Eres: {roles[currentRevealIndex]}</h3>
                                <p>
                                    {roles[currentRevealIndex] === 'Asesino' && '🔪 Elimina a un jugador cada noche.'}
                                    {roles[currentRevealIndex] === 'Detective' && '🔍 Investiga a un jugador cada noche.'}
                                    {roles[currentRevealIndex] === 'Doctor' && '💊 Protege a un jugador cada noche.'}
                                    {roles[currentRevealIndex] === 'Pueblo' && '🏘️ Duerme y trata de sobrevivir y votar al culpable.'}
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
                    <p>La noche cae en el pueblo...</p>
                    <p>El narrador dirige el juego.</p>
                    <button onClick={resetGame}>Nueva Partida</button>
                </div>
            )}
        </div>
    );
};
