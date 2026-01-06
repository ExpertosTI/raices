import React from 'react';
import type { FamilyMember } from '../../../types';
import { FAMILY_BRANCHES } from '../../family/constants';
import './HorizontalTree.css';

interface TreeProps {
    members: FamilyMember[];
    onMemberClick?: (member: FamilyMember) => void;
}

// Translation function for relation types
const getRelationLabel = (relation: string) => {
    const labels: Record<string, string> = {
        'PATRIARCH': 'Patriarca',
        'SIBLING': 'Hermano/a',
        'CHILD': 'Hijo/a',
        'GRANDCHILD': 'Nieto/a',
        'GREAT_GRANDCHILD': 'Bisnieto/a',
        'SPOUSE': 'Cónyuge',
        'NEPHEW': 'Sobrino/a',
        'OTHER': 'Otro'
    };
    return labels[relation] || relation;
};

export const HorizontalTree: React.FC<TreeProps> = ({ members, onMemberClick }) => {
    // ONLY siblings (12 hermanos) - NOT patriarchs
    const siblings = members.filter(m => m.relation === 'SIBLING' && !m.isPatriarch).sort((a, b) => {
        const branchA = FAMILY_BRANCHES.find(br => br.name === a.name);
        const branchB = FAMILY_BRANCHES.find(br => br.name === b.name);
        return (branchA?.order || 0) - (branchB?.order || 0);
    });

    // Descendants are everyone except patriarchs and siblings
    const descendants = members.filter(m => !m.isPatriarch && m.relation !== 'SIBLING');

    const getEmoji = (name: string) => {
        const femaleNames = ['Lorenza', 'Carmen', 'Andrea', 'Mercedes', 'Xiomara', 'Bernarda'];
        return femaleNames.some(n => name.includes(n)) ? '👩' : '👨';
    };

    // Prioriza color elegido por el miembro, luego color de rama
    const getColor = (member: FamilyMember) => {
        const branch = FAMILY_BRANCHES.find(b => b.name === member.name);
        return member.preferredColor || member.branch?.color || branch?.color || '#D4AF37';
    };

    return (
        <div className="horizontal-tree">
            {/* Column 1: Patriarchs */}
            <div className="tree-column">
                <div className="column-label">Los Patriarcas</div>
                <div className="patriarch-pair">
                    {members.filter(m => m.isPatriarch).map(patriarch => (
                        <div
                            key={patriarch.id}
                            className="tree-node patriarch"
                            onClick={() => onMemberClick?.(patriarch)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="node-avatar large">{patriarch.name.includes('Lorenza') || patriarch.name.includes('Mamá') || patriarch.name.includes('Abuela') ? '👵' : '👴'}</div>
                            <span className="node-name">{patriarch.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Connector */}
            <div className="connector-column">
                <div className="connector vertical long"></div>
            </div>

            {/* Column 2: 12 Siblings */}
            <div className="tree-column siblings-column">
                <div className="column-label">Los 12 Hermanos</div>
                <div className="siblings-grid">
                    {siblings.map((sibling) => {
                        return (
                            <div
                                key={sibling.id}
                                className="tree-node sibling"
                                style={{ borderColor: getColor(sibling), cursor: 'pointer' }}
                                onClick={() => onMemberClick?.(sibling)}
                            >
                                <div
                                    className="node-avatar"
                                    style={{ borderColor: getColor(sibling) }}
                                >
                                    {sibling.photo ? (
                                        <img src={sibling.photo} alt={sibling.name} className="node-photo" />
                                    ) : (
                                        getEmoji(sibling.name)
                                    )}
                                </div>
                                <span className="node-name">{sibling.name.split(' ')[0]}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Connector */}
            <div className="connector-column">
                <div className="connector vertical long"></div>
            </div>

            {/* Column 3: Descendants */}
            <div className="tree-column">
                <div className="column-label">Descendientes</div>
                <div className="descendants-list">
                    {descendants.length === 0 ? (
                        <div className="empty-message">Sin registros aún</div>
                    ) : (
                        descendants.map(member => (
                            <div key={member.id} className="tree-node descendant" onClick={() => onMemberClick?.(member)} style={{ cursor: 'pointer' }}>
                                <div className="node-avatar small">
                                    {member.photo ? (
                                        <img src={member.photo} alt={member.name} className="node-photo" />
                                    ) : (
                                        '👶'
                                    )}
                                </div>
                                <div className="node-info">
                                    <span className="node-name">{member.name}</span>
                                    <span className="node-relation">{getRelationLabel(member.relation)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
