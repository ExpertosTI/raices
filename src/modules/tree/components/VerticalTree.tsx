import React, { useState, useMemo } from 'react';
import type { FamilyMember } from '../../../types';
import { FAMILY_BRANCHES } from '../../family/constants';
import './VerticalTree.css';

interface Props {
    members: FamilyMember[];
    onMemberClick?: (member: FamilyMember) => void;
}

// Helper to identify the 12 Branch Founders
const isFounder = (m: FamilyMember) => {
    const mName = m.name.toLowerCase().trim();
    const firstWord = mName.split(' ')[0];

    return FAMILY_BRANCHES.some(br => {
        const bName = br.name.toLowerCase();
        return mName.includes(bName) || bName.includes(mName) || bName.startsWith(firstWord);
    });
};

// Build a hierarchical tree structure
const buildTree = (members: FamilyMember[]) => {
    // Helper to check if member is a root patriarch (FOUNDER relation or isPatriarch flag)
    const isRootPatriarch = (m: FamilyMember) => {
        return m.relation === 'FOUNDER' || m.isPatriarch;
    };

    // Root Patriarchs are those with FOUNDER relation OR isPatriarch flag, but NOT in the founders list
    const patriarchs = members.filter(m => isRootPatriarch(m) && !isFounder(m));
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
        if (m.branchId && !isRootPatriarch(m)) {
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
                        <img src={member.photo} alt={member.name} className="node-photo" />
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

    // Separate: siblings are the 12 hermanos (Founders)
    const siblings = members.filter(m => isFounder(m));

    // Filter members by search
    const filteredSiblings = searchQuery
        ? siblings.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : siblings;

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

            {/* Patriarcas - Parents (from database) */}
            <div className="tree-section patriarchs">
                <h3 className="section-label">Los Patriarcas</h3>
                <div className="tree-level parents">
                    {patriarchs.length > 0 ? (
                        patriarchs.map(patriarch => (
                            <div
                                key={patriarch.id}
                                className="tree-node patriarch"
                                onClick={() => onMemberClick?.(patriarch)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="node-avatar">
                                    {patriarch.photo ? (
                                        <img src={patriarch.photo} alt={patriarch.name} className="node-photo" />
                                    ) : (
                                        patriarch.name.includes('Mamá') || patriarch.name.includes('Abuela') ? '👵' : '👴'
                                    )}
                                </div>
                                <span className="node-name">{patriarch.name}</span>
                            </div>
                        ))
                    ) : (
                        <>
                            <div className="tree-node patriarch placeholder">
                                <div className="node-avatar">👴</div>
                                <span className="node-name">Papá</span>
                            </div>
                            <div className="tree-connector horizontal" />
                            <div className="tree-node patriarch placeholder">
                                <div className="node-avatar">👵</div>
                                <span className="node-name">Mamá</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="tree-connector vertical main" />

            {/* 12 Siblings (founders) with descendants */}
            <div className="tree-section siblings">
                <h3 className="section-label">
                    Los 12 Hermanos (Fundadores)
                    <span className="member-count">({siblings.length})</span>
                </h3>
                <div className="tree-level children">
                    {filteredSiblings.map((sibling) => {
                        // Get children of this sibling
                        let children = byParent.get(sibling.id) || [];
                        if (children.length === 0 && sibling.branchId) {
                            // Fallback: get members in same branch that aren't the sibling
                            children = (byBranch.get(sibling.branchId) || [])
                                .filter(m => m.id !== sibling.id && !m.isPatriarch && m.relation !== 'SIBLING')
                                .slice(0, 10);
                        }

                        return (
                            <MemberNode
                                key={sibling.id}
                                member={sibling}
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
