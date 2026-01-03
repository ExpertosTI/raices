import React from 'react';
import type { FamilyMember } from '../../../types';
import './MemberDetailModal.css';

interface Props {
    member: FamilyMember | null;
    onClose: () => void;
}

export const MemberDetailModal: React.FC<Props> = ({ member, onClose }) => {
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
                    <h2>{member.name}</h2>
                    <span className="member-relation-badge">
                        {translateRelation(member.relation)}
                    </span>
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

                    {member.bio && (
                        <div className="member-bio">
                            <h3>Historia</h3>
                            <p>{member.bio}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
