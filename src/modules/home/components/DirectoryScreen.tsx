import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, MessageCircle, User, Users, X } from 'lucide-react';
import { FloatingDock } from '../../../components/FloatingDock';
import type { FamilyMember } from '../../../types';
import './DirectoryScreen.css';

export const DirectoryScreen: React.FC = () => {
    const navigate = useNavigate();
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
    const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
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

    // Get unique branches
    const branches = useMemo(() => {
        const branchMap = new Map<string, { id: string; name: string; color: string }>();
        members.forEach(m => {
            if (m.branch && !branchMap.has(m.branch.id)) {
                branchMap.set(m.branch.id, m.branch);
            }
        });
        return Array.from(branchMap.values());
    }, [members]);

    // Get all unique skills
    const allSkills = useMemo(() => {
        const skills = new Set<string>();
        members.forEach(m => {
            if (m.skills && Array.isArray(m.skills)) {
                m.skills.forEach(s => skills.add(s));
            }
        });
        return Array.from(skills).sort();
    }, [members]);

    // Filter members
    const filteredMembers = useMemo(() => {
        return members.filter(m => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesName = m.name.toLowerCase().includes(query);
                const matchesSkills = m.skills?.some(s => s.toLowerCase().includes(query));
                if (!matchesName && !matchesSkills) return false;
            }
            // Branch filter
            if (selectedBranch && m.branchId !== selectedBranch) return false;
            // Skill filter
            if (selectedSkill && (!m.skills || !m.skills.includes(selectedSkill))) return false;
            return true;
        });
    }, [members, searchQuery, selectedBranch, selectedSkill]);

    // Group by branch
    const groupedMembers = useMemo(() => {
        const groups = new Map<string, { branch: { name: string; color: string }; members: FamilyMember[] }>();
        filteredMembers.forEach(m => {
            if (!m.branch) return;
            if (!groups.has(m.branch.id)) {
                groups.set(m.branch.id, { branch: m.branch, members: [] });
            }
            groups.get(m.branch.id)!.members.push(m);
        });
        return Array.from(groups.values());
    }, [filteredMembers]);

    const handleCall = (phone: string) => {
        window.location.href = `tel:${phone}`;
    };

    const handleWhatsApp = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    if (loading) {
        return (
            <div className="directory-screen loading">
                <div className="loading-spinner">📇</div>
                <p>Cargando directorio...</p>
            </div>
        );
    }

    return (
        <div className="directory-screen">
            <header className="directory-header">
                <button className="back-btn" onClick={() => navigate('/app')}>← Volver</button>
                <h1>📇 Directorio Familiar</h1>
            </header>

            {/* Search & Filters */}
            <div className="directory-filters">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o habilidad..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="clear-btn" onClick={() => setSearchQuery('')}>
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="filter-row">
                    <select
                        value={selectedBranch || ''}
                        onChange={(e) => setSelectedBranch(e.target.value || null)}
                    >
                        <option value="">Todas las ramas</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>

                    <select
                        value={selectedSkill || ''}
                        onChange={(e) => setSelectedSkill(e.target.value || null)}
                    >
                        <option value="">Todas las habilidades</option>
                        {allSkills.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats */}
            <div className="directory-stats">
                <span><Users size={16} /> {filteredMembers.length} contactos</span>
                {selectedBranch && <span className="filter-tag">Rama: {branches.find(b => b.id === selectedBranch)?.name}</span>}
                {selectedSkill && <span className="filter-tag">{selectedSkill}</span>}
            </div>

            {/* Contact List */}
            <div className="directory-list">
                {groupedMembers.length === 0 ? (
                    <div className="empty-state">
                        <User size={48} />
                        <p>No se encontraron contactos</p>
                    </div>
                ) : (
                    groupedMembers.map(({ branch, members: branchMembers }) => (
                        <div key={branch.name} className="branch-group">
                            <h3 className="branch-title" style={{ borderColor: branch.color }}>
                                <span style={{ backgroundColor: branch.color }} className="branch-dot"></span>
                                {branch.name}
                                <span className="member-count">{branchMembers.length}</span>
                            </h3>
                            <div className="contacts-grid">
                                {branchMembers.map(member => (
                                    <div key={member.id} className="contact-card" onClick={() => setSelectedMember(member)}>
                                        <div className="contact-avatar" style={{ borderColor: branch.color }}>
                                            {member.photo ? (
                                                <img src={member.photo} alt={member.name} />
                                            ) : (
                                                <span>{member.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div className="contact-info">
                                            <h4>{member.name}</h4>
                                            {member.skills && member.skills.length > 0 && (
                                                <p className="contact-skills">
                                                    {member.skills.slice(0, 2).join(', ')}
                                                </p>
                                            )}
                                        </div>
                                        <div className="contact-actions">
                                            {member.phone && (
                                                <button
                                                    className="action-btn call"
                                                    onClick={(e) => { e.stopPropagation(); handleCall(member.phone!); }}
                                                    title="Llamar"
                                                >
                                                    <Phone size={18} />
                                                </button>
                                            )}
                                            {member.whatsapp && (
                                                <button
                                                    className="action-btn whatsapp"
                                                    onClick={(e) => { e.stopPropagation(); handleWhatsApp(member.whatsapp!); }}
                                                    title="WhatsApp"
                                                >
                                                    <MessageCircle size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Member Detail Modal */}
            {selectedMember && (
                <div className="member-modal-overlay" onClick={() => setSelectedMember(null)}>
                    <div className="member-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal" onClick={() => setSelectedMember(null)}>×</button>
                        <div className="modal-avatar" style={{ borderColor: selectedMember.branch?.color || '#D4AF37' }}>
                            {selectedMember.photo ? (
                                <img src={selectedMember.photo} alt={selectedMember.name} />
                            ) : (
                                <span>{selectedMember.name.charAt(0)}</span>
                            )}
                        </div>
                        <h2>{selectedMember.name}</h2>
                        <p className="modal-branch">{selectedMember.branch?.name}</p>

                        {selectedMember.bio && (
                            <p className="modal-bio">{selectedMember.bio}</p>
                        )}

                        {selectedMember.skills && selectedMember.skills.length > 0 && (
                            <div className="modal-skills">
                                {selectedMember.skills.map(s => (
                                    <span key={s} className="skill-tag">{s}</span>
                                ))}
                            </div>
                        )}

                        <div className="modal-actions">
                            {selectedMember.phone && (
                                <button className="action-lg call" onClick={() => handleCall(selectedMember.phone!)}>
                                    <Phone size={20} /> Llamar
                                </button>
                            )}
                            {selectedMember.whatsapp && (
                                <button className="action-lg whatsapp" onClick={() => handleWhatsApp(selectedMember.whatsapp!)}>
                                    <MessageCircle size={20} /> WhatsApp
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <FloatingDock />
        </div>
    );
};
