import React from 'react';
import type { FamilyMember } from '../../../types';
import { FAMILY_BRANCHES } from '../../family/constants';
import './RadialTree.css';

interface TreeProps {
    members: FamilyMember[];
}

export const RadialTree: React.FC<TreeProps> = ({ members }) => {
    const siblings = members.filter(m => m.relation === 'SIBLING' || m.isPatriarch).sort((a, b) => {
        const branchA = FAMILY_BRANCHES.find(br => br.name === a.name);
        const branchB = FAMILY_BRANCHES.find(br => br.name === b.name);
        return (branchA?.order || 0) - (branchB?.order || 0);
    });

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
        <div className="radial-tree">
            {/* Center: Patriarchs */}
            <div className="radial-center">
                <span>👴</span>
                <span>👵</span>
            </div>

            {/* Ring 1: 12 Siblings */}
            {siblings.map((sibling, i) => {
                const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
                const radius = 150;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const color = getColor(sibling);

                return (
                    <div
                        key={sibling.id}
                        className="radial-node sibling"
                        style={{
                            transform: `translate(${x}px, ${y}px)`,
                            borderColor: color,
                            boxShadow: `0 0 15px ${color}50`
                        }}
                        title={sibling.name}
                    >
                        {getEmoji(sibling.name)}
                    </div>
                );
            })}

            {/* Ring 2: Descendants */}
            {descendants.map((member, i) => {
                const angle = (i / Math.max(descendants.length, 8)) * 2 * Math.PI - Math.PI / 2;
                const radius = 250;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                return (
                    <div
                        key={member.id}
                        className="radial-node descendant"
                        style={{
                            transform: `translate(${x}px, ${y}px)`,
                        }}
                        title={member.name}
                    >
                        👶
                    </div>
                );
            })}

            {/* Orbit Lines */}
            <div className="orbit orbit-1"></div>
            <div className="orbit orbit-2"></div>
        </div>
    );
};
