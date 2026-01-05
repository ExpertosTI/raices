import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { VerticalTree } from './VerticalTree';
import { HorizontalTree } from './HorizontalTree';
import { RadialTree } from './RadialTree';
import { ThreeDTree } from './ThreeDTree';
import { MemberDetailModal } from './MemberDetailModal';
import { FloatingDock } from '../../../components/FloatingDock';
import type { FamilyMember } from '../../../types';
import './TreeScreen.css';

export const TreeScreen: React.FC = () => {
    const navigate = useNavigate();
    const [view, setView] = useState<'vertical' | 'horizontal' | 'radial' | '3d'>('vertical');
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

    // Global Search State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredMembers = searchQuery.length > 0
        ? members.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    useEffect(() => {
        // ... (existing fetch logic)
    }, []);

    const handleMemberClick = (member: FamilyMember) => {
        setSelectedMember(member);
        setIsSearchOpen(false);
        setSearchQuery('');
    };

    // ... (rest of loading check)

    return (
        <div className="tree-screen">
            <header className="tree-header">
                <button className="back-btn" onClick={() => navigate('/app')}>
                    ← Volver
                </button>
                <h1 className="tree-title">🌳 Árbol Genealógico</h1>

                {/* Global Search Bar */}
                <div className={`global-search-container ${isSearchOpen ? 'expanded' : ''}`}>
                    <div className="search-bar glass-panel">
                        <Search size={18} className="search-icon" onClick={() => setIsSearchOpen(true)} />
                        <input
                            type="text"
                            placeholder="Buscar familiar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchOpen(true)}
                        />
                        {searchQuery && (
                            <button className="clear-search" onClick={() => setSearchQuery('')}>
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {isSearchOpen && searchQuery && (
                        <div className="search-results-dropdown glass-panel">
                            {filteredMembers.length > 0 ? (
                                filteredMembers.map(member => (
                                    <div
                                        key={member.id}
                                        className="search-result-item"
                                        onClick={() => handleMemberClick(member)}
                                    >
                                        <div className="result-avatar">
                                            {member.photo ? (
                                                <img src={member.photo} alt={member.name} />
                                            ) : (
                                                <span>{member.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div className="result-info">
                                            <span className="result-name">{member.name}</span>
                                            <span className="result-relation">{member.relation}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-results">No se encontraron miembros</div>
                            )}
                        </div>
                    )}
                </div>

                <div className="view-toggles">
                    <button
                        className={`toggle-btn ${view === 'vertical' ? 'active' : ''}`}
                        onClick={() => setView('vertical')}
                    >
                        Vertical
                    </button>
                    <button
                        className={`toggle-btn ${view === 'horizontal' ? 'active' : ''}`}
                        onClick={() => setView('horizontal')}
                    >
                        Horizontal
                    </button>
                    <button
                        className={`toggle-btn ${view === 'radial' ? 'active' : ''}`}
                        onClick={() => setView('radial')}
                    >
                        Radial
                    </button>
                    <button
                        className={`toggle-btn ${view === '3d' ? 'active' : ''}`}
                        onClick={() => setView('3d')}
                    >
                        3D 🪐
                    </button>
                </div>
            </header>

            <div className="tree-content">
                {members.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🌳</div>
                        <h3>El árbol está creciendo</h3>
                        <p>Aún no hay miembros registrados en la base de datos.</p>
                        <button className="empty-action" onClick={() => navigate('/register')}>
                            Registrar Primer Miembro
                        </button>
                    </div>
                ) : (
                    <>
                        {view === 'vertical' && <VerticalTree members={members} onMemberClick={handleMemberClick} />}
                        {view === 'horizontal' && <HorizontalTree members={members} />}
                        {view === 'radial' && <RadialTree members={members} onMemberClick={handleMemberClick} />}
                        {view === '3d' && <ThreeDTree members={members} onMemberClick={handleMemberClick} />}
                    </>
                )}
            </div>

            {/* Member Detail Modal */}
            {selectedMember && (
                <MemberDetailModal
                    member={selectedMember}
                    onClose={() => setSelectedMember(null)}
                />
            )}

            <FloatingDock />
        </div>
    );
};
