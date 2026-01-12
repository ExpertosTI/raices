import { useState, useEffect } from 'react';
import { soundManager } from '../../../utils/SoundManager';
import './GameMemberSelector.css';

interface FamilyMember {
    id: string;
    name: string;
    photo?: string;
}

interface GameMemberSelectorProps {
    onStart: (selectedMembers: FamilyMember[]) => void;
    minPlayers: number;
    gameTitle?: string;
}

export const GameMemberSelector = ({ onStart, minPlayers, gameTitle }: GameMemberSelectorProps) => {
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [manualName, setManualName] = useState('');

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/members', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMembers(data);
            }
        } catch (err) {
            console.error('Error fetching members:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleMember = (member: FamilyMember) => {
        soundManager.playClick();
        if (selectedIds.includes(member.id)) {
            setSelectedIds(selectedIds.filter(id => id !== member.id));
        } else {
            setSelectedIds([...selectedIds, member.id]);
        }
    };

    const handleManualAdd = () => {
        if (!manualName.trim()) return;
        // Mock a member for manual entry
        const newMember: FamilyMember = {
            id: `manual-${Date.now()}`,
            name: manualName.trim(),
            photo: undefined
        };
        setMembers([newMember, ...members]);
        setSelectedIds([...selectedIds, newMember.id]);
        setManualName('');
        soundManager.playSuccess();
    };

    const getSelectedMembers = () => {
        return members.filter(m => selectedIds.includes(m.id));
    };

    const handleStart = () => {
        const selected = getSelectedMembers();
        if (selected.length >= minPlayers) {
            onStart(selected);
        } else {
            soundManager.playError();
        }
    };

    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="selector-loading">Cargando la familia...</div>;

    return (
        <div className="game-member-selector">
            <h3>Seleccionar Jugadores {gameTitle ? `para ${gameTitle}` : ''} ({selectedIds.length})</h3>

            <div className="selector-tools">
                <input
                    type="text"
                    placeholder="🔍 Buscar familiar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <div className="manual-add">
                    <input
                        type="text"
                        placeholder="+ Agregar externo"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
                    />
                    <button onClick={handleManualAdd}>Add</button>
                </div>
            </div>

            <div className="members-grid">
                {filteredMembers.map(member => (
                    <div
                        key={member.id}
                        className={`member-card ${selectedIds.includes(member.id) ? 'selected' : ''}`}
                        onClick={() => toggleMember(member)}
                    >
                        {member.photo ? (
                            <img src={member.photo} alt={member.name} className="member-photo" />
                        ) : (
                            <div className="member-initial">{member.name[0]}</div>
                        )}
                        <span className="member-name">{member.name}</span>
                        {selectedIds.includes(member.id) && <div className="check-badge">✓</div>}
                    </div>
                ))}
            </div>

            <div className="selector-footer">
                <p>{selectedIds.length < minPlayers ? `Faltan ${minPlayers - selectedIds.length} jugadores` : '¡Listos para jugar!'}</p>
                <button
                    className="start-game-btn"
                    disabled={selectedIds.length < minPlayers}
                    onClick={handleStart}
                >
                    Comenzar con {selectedIds.length} Jugadores
                </button>
            </div>
        </div>
    );
};
