import React from 'react';
import type { FamilyMember } from '../../../types';
import './VerticalTree.css';

interface Props {
    members: FamilyMember[];
}

export const VerticalTree: React.FC<Props> = ({ members }) => {
    // Group patriarch members (the 12 siblings)
    const patriarchs = members.filter(m => m.isPatriarch);

    const getEmoji = (name: string) => {
        const femaleNames = ['Lorenza', 'Carmen', 'Andrea', 'Mercedes', 'Xiomara', 'Bernarda'];
        const isFemale = femaleNames.some(n => name.includes(n));
        return isFemale ? '👩' : '👨';
    };

    const getYear = (dateStr: string | undefined) => {
        if (!dateStr) return '';
        return new Date(dateStr).getFullYear();
    };

    // Prioriza color elegido por el miembro, luego color de rama
    const getColor = (member: FamilyMember) => {
        return member.preferredColor || member.branch?.color || '#D4AF37';
    };

    return (
        <div className="vertical-tree">
            {/* Patriarcas - Parents */}
            <div className="tree-section patriarchs">
                <h3 className="section-label">Los Patriarcas</h3>
                <div className="tree-level parents">
                    <div className="tree-node patriarch">
                        <div className="node-avatar">👴</div>
                        <span className="node-name">Papá</span>
                    </div>
                    <div className="tree-connector horizontal"></div>
                    <div className="tree-node patriarch">
                        <div className="node-avatar">👵</div>
                        <span className="node-name">Mamá</span>
                    </div>
                </div>
            </div>

            <div className="tree-connector vertical main"></div>

            {/* 12 Siblings */}
            <div className="tree-section siblings">
                <h3 className="section-label">Primera Generación - Los 12 Hermanos</h3>
                <div className="tree-level children">
                    {patriarchs.map((member) => (
                        <div
                            key={member.id}
                            className="tree-node sibling"
                            style={{ borderColor: getColor(member) }}
                        >
                            <div
                                className="node-avatar"
                                style={{ borderColor: getColor(member) }}
                            >
                                {getEmoji(member.name)}
                            </div>
                            <span className="node-name">{member.name.split(' ')[0]}</span>
                            <span className="node-year">{getYear(member.birthDate)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
