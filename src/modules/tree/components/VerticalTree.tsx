import React, { useState, useMemo } from 'react';
import type { FamilyMember } from '../../../types';
import './VerticalTree.css';

interface Props {
    members: FamilyMember[];
    onMemberClick?: (member: FamilyMember) => void;
}

// Build a hierarchical tree structure
const buildTree = (members: FamilyMember[]) => {
    const patriarchs = members.filter(m => m.isPatriarch);
    const byParent = new Map<string, FamilyMember[]>();

    // Group members by their parentId
    members.forEach(m => {
        if (m.parentId) {
            const children = byParent.get(m.parentId) || [];
            children.push(m);
            byParent.set(m.parentId, children);
        }
    });

    // Also group by branchId for descendants without direct parentId
    const byBranch = new Map<string, FamilyMember[]>();
    members.forEach(m => {
        if (m.branchId && !m.isPatriarch) {
            const branchMembers = byBranch.get(m.branchId) || [];
            branchMembers.push(m);
            byBranch.set(m.branchId, branchMembers);
        }
    });

    return { patriarchs, byParent, byBranch };
};

const getEmoji = (name: string, gender?: string) => {
    if (gender === 'MALE') return '👨';
    if (gender === 'FEMALE') return '👩';
    const femaleNames = ['Lorenza', 'Carmen', 'Andrea', 'Mercedes', 'Xiomara', 'Bernarda', 'Maria', 'Ana', 'Josefa'];
    return femaleNames.some(n => name.includes(n)) ? '👩' : '👨';
};

const getYear = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    return new Date(dateStr).getFullYear();
};

const getColor = (member: FamilyMember) => {
    return member.preferredColor || member.branch?.color || '#D4AF37';
};

const getRelationLabel = (relation: string | undefined) => {
    switch (relation) {
        case 'GRANDCHILD': return 'Nieto/a';
        case 'GREAT_GRANDCHILD': return 'Bisnieto/a';
        case 'CHILD': return 'Hijo/a';
        default: return '';
    }
};

interface MemberNodeProps {
    member: FamilyMember;
    children: FamilyMember[];
    byParent: Map<string, FamilyMember[]>;
    level: number;
    onMemberClick?: (member: FamilyMember) => void;
    expandedNodes: Set<string>;
    toggleExpand: (id: string) => void;
}

const MemberNode: React.FC<MemberNodeProps> = ({
    member, children, byParent, level, onMemberClick, expandedNodes, toggleExpand
}) => {
    const isExpanded = expandedNodes.has(member.id);
    const hasChildren = children.length > 0;
    const color = getColor(member);

    return (
        <div className="member-branch">
            <div
                className={`tree-node member level-${level}`}
                style={{ borderColor: color }}
                onClick={() => onMemberClick?.(member)}
            >
                <div className="node-avatar" style={{ borderColor: color }}>
                    {member.photo ? (
                        <img src={member.photo} alt={member.name} />
                    ) : (
                        getEmoji(member.name)
                    )}
                </div>
                <div className="node-info">
                    <span className="node-name">{member.name.split(' ')[0]}</span>
                    <span className="node-year">{getYear(member.birthDate)}</span>
                    {level > 0 && <span className="node-relation">{getRelationLabel(member.relation)}</span>}
                </div>
                {hasChildren && (
                    <button
                        className={`expand-btn ${isExpanded ? 'expanded' : ''}`}
                        onClick={(e) => { e.stopPropagation(); toggleExpand(member.id); }}
                    >
                        {isExpanded ? '−' : '+'}
                    </button>
                )}
            </div>

            {hasChildren && isExpanded && (
                <div className="children-container">
                    <div className="connector-line" style={{ backgroundColor: color }} />
                    <div className="children-list">
                        {children.map(child => {
                            const grandchildren = byParent.get(child.id) || [];
                            return (
                                <MemberNode
                                    key={child.id}
                                    member={child}
                                    children={grandchildren}
                                    byParent={byParent}
                                    level={level + 1}
                                    onMemberClick={onMemberClick}
                                    expandedNodes={expandedNodes}
                                    toggleExpand={toggleExpand}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export const VerticalTree: React.FC<Props> = ({ members, onMemberClick }) => {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    const { patriarchs, byParent, byBranch } = useMemo(() => buildTree(members), [members]);

    const toggleExpand = (id: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const expandAll = () => {
        const allIds = new Set(members.map(m => m.id));
        setExpandedNodes(allIds);
    };

    const collapseAll = () => {
        setExpandedNodes(new Set());
    };

    // Filter members by search
    const filteredPatriarchs = searchQuery
        ? patriarchs.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : patriarchs;

    return (
        <div className="vertical-tree">
            {/* Search and Controls */}
            <div className="tree-controls">
                <input
                    type="text"
                    className="tree-search"
                    placeholder="🔍 Buscar miembro..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="tree-actions">
                    <button className="action-btn" onClick={expandAll}>Expandir todo</button>
                    <button className="action-btn" onClick={collapseAll}>Colapsar</button>
                </div>
            </div>

            {/* Patriarcas - Parents */}
            <div className="tree-section patriarchs">
                <h3 className="section-label">Los Patriarcas</h3>
                <div className="tree-level parents">
                    <div className="tree-node patriarch">
                        <div className="node-avatar">👴</div>
                        <span className="node-name">Papá</span>
                    </div>
                    <div className="tree-connector horizontal" />
                    <div className="tree-node patriarch">
                        <div className="node-avatar">👵</div>
                        <span className="node-name">Mamá</span>
                    </div>
                </div>
            </div>

            <div className="tree-connector vertical main" />

            {/* 12 Siblings with descendants */}
            <div className="tree-section siblings">
                <h3 className="section-label">
                    Primera Generación - Los 12 Hermanos
                    <span className="member-count">({patriarchs.length})</span>
                </h3>
                <div className="tree-level children">
                    {filteredPatriarchs.map((patriarch) => {
                        // Get children - first check byParent, then by branch
                        let children = byParent.get(patriarch.id) || [];
                        if (children.length === 0 && patriarch.branchId) {
                            // Fallback: get members in same branch that aren't patriarchs
                            children = (byBranch.get(patriarch.branchId) || [])
                                .filter(m => m.id !== patriarch.id)
                                .slice(0, 10); // Limit for performance
                        }

                        return (
                            <MemberNode
                                key={patriarch.id}
                                member={patriarch}
                                children={children}
                                byParent={byParent}
                                level={0}
                                onMemberClick={onMemberClick}
                                expandedNodes={expandedNodes}
                                toggleExpand={toggleExpand}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="tree-legend">
                <span className="legend-item"><span className="dot" style={{ background: '#D4AF37' }} /> Patriarca</span>
                <span className="legend-item"><span className="dot" style={{ background: '#4ade80' }} /> Hijo/a</span>
                <span className="legend-item"><span className="dot" style={{ background: '#60a5fa' }} /> Nieto/a</span>
            </div>
        </div>
    );
};
