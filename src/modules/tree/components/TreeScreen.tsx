import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch('/api/members', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
            .then(res => res.json())
            .then(data => {
                setMembers(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleMemberClick = (member: FamilyMember) => {
        setSelectedMember(member);
    };

    if (loading) {
        return (
            <div className="tree-screen loading">
                <div className="loading-spinner">🌳</div>
                <p>Cargando Árbol Familiar...</p>
            </div>
        );
    }

    return (
        <div className="tree-screen">
            <header className="tree-header">
                <button className="back-btn" onClick={() => navigate('/app')}>
                    ← Volver
                </button>
                <h1 className="tree-title">🌳 Árbol Genealógico</h1>
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
