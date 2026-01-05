import React, { useState } from 'react';
import { Phone, MessageCircle, Briefcase, Edit2 } from 'lucide-react';
import type { FamilyMember } from '../../../types';
import { EditProfileModal } from '../../home/components/EditProfileModal';
import './MemberDetailModal.css';

interface Props {
    member: FamilyMember | null;
    onClose: () => void;
}

export const MemberDetailModal: React.FC<Props> = ({ member, onClose }) => {
    const [isEditOpen, setIsEditOpen] = useState(false);

    if (!member) return null;

    const formatDate = (date?: string) => {
        if (!date) return 'Fecha desconocida';
        return new Date(date).toLocaleDateString('es-DO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const translateRelation = (relation: string) => {
        const translations: Record<string, string> = {
            'SIBLING': 'Hermano/a',
            'CHILD': 'Hijo/a',
            'GRANDCHILD': 'Nieto/a',
            'GREAT_GRANDCHILD': 'Bisnieto/a',
            'SPOUSE': 'Esposo/a',
            'PARENT': 'Padre/Madre',
            'PATRIARCH': 'Patriarca'
        };
        return translations[relation] || relation.replace('_', ' ');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>

                <div className="modal-header" style={{
                    borderColor: member.preferredColor || member.branch?.color || '#D4AF37'
                }}>
                    <div className="member-photo-large">
                        {member.photo ? (
                            <img src={member.photo} alt={member.name} />
                        ) : (
                            <span>{member.isPatriarch ? '👴' : '👤'}</span>
                        )}
                    </div>
                    <div className="header-info">
                        <h2>{member.name}</h2>
                        <span className="member-relation-badge">
                            {translateRelation(member.relation)}
                        </span>
                    </div>
                    <button
                        className="edit-member-btn"
                        onClick={() => setIsEditOpen(true)}
                        title="Editar perfil"
                    >
                        <Edit2 size={16} />
                    </button>
                </div>

                <div className="modal-body">
                    {member.branch && (
                        <div className="info-row">
                            <span className="label">Rama:</span>
                            <span className="value" style={{ color: member.branch.color }}>
                                {member.branch.name}
                            </span>
                        </div>
                    )}

                    <div className="info-row">
                        <span className="label">Nacimiento:</span>
                        <span className="value">{formatDate(member.birthDate)}</span>
                    </div>

                    {member.deathDate && (
                        <div className="info-row">
                            <span className="label">Fallecimiento:</span>
                            <span className="value">{formatDate(member.deathDate)}</span>
                        </div>
                    )}

                    {member.skills && member.skills.length > 0 && (
                        <div className="info-section">
                            <h4><Briefcase size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} /> Profesión / Habilidades</h4>
                            <div className="skills-tags">
                                {Array.isArray(member.skills) ? member.skills.map((skill: string, i: number) => (
                                    <span key={i} className="skill-tag">{skill}</span>
                                )) : <span className="skill-tag">{String(member.skills).replace(/[\[\]"]/g, '').split(',').join(', ')}</span>}
                            </div>
                        </div>
                    )}

                    {(member.phone || member.whatsapp) && (
                        <div className="info-section">
                            <h4>Contacto</h4>
                            <div className="contact-links">
                                {member.phone && (
                                    <a href={`tel:${member.phone}`} className="contact-link">
                                        <Phone size={16} /> {member.phone}
                                    </a>
                                )}
                                {member.whatsapp && (
                                    <a href={`https://wa.me/${member.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="contact-link whatsapp">
                                        <MessageCircle size={16} /> WhatsApp
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {member.bio && (
                        <div className="member-bio">
                            <h3>Historia</h3>
                            <p>{member.bio}</p>
                        </div>
                    )}
                </div>
            </div>

            <EditProfileModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                member={member}
                onSuccess={() => {
                    setIsEditOpen(false);
                    // Opcional: Trigger refresh if needed
                }}
            />
        </div>
    );
};
