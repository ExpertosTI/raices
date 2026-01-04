import React, { useMemo, useState } from 'react';
import type { FamilyMember } from '../../../types';
import './RadialTree.css';

interface TreeProps {
    members: FamilyMember[];
    onMemberClick?: (member: FamilyMember) => void;
}

// Group members by branch and generation
const organizeData = (members: FamilyMember[]) => {
    const branches = new Map<string, {
        branch: { id: string; name: string; color: string };
        members: FamilyMember[];
    }>();

    members.forEach(member => {
        if (!member.branch) return;
        if (!branches.has(member.branch.id)) {
            branches.set(member.branch.id, {
                branch: member.branch,
                members: []
            });
        }
        branches.get(member.branch.id)!.members.push(member);
    });

    return Array.from(branches.values());
};

export const RadialTree: React.FC<TreeProps> = ({ members, onMemberClick }) => {
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);

    const branchData = useMemo(() => organizeData(members), [members]);
    const totalMembers = members.length;
    const anglePerBranch = 360 / branchData.length;

    // Stats
    const stats = useMemo(() => {
        const gens = { SIBLING: 0, CHILD: 0, GRANDCHILD: 0, GREAT_GRANDCHILD: 0, OTHER: 0 };
        members.forEach(m => {
            if (m.relation && gens[m.relation as keyof typeof gens] !== undefined) {
                gens[m.relation as keyof typeof gens]++;
            } else {
                gens.OTHER++;
            }
        });
        return gens;
    }, [members]);

    return (
        <div className="radial-tree-container">
            {/* Controls */}
            <div className="radial-controls">
                <button onClick={() => setZoom(z => Math.min(2, z + 0.2))}>+</button>
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}>−</button>
                <button onClick={() => { setZoom(1); setSelectedBranch(null); }}>🎯</button>
            </div>

            {/* Stats Panel */}
            <div className="radial-stats">
                <div className="stat-item">
                    <span className="stat-number">{totalMembers}</span>
                    <span className="stat-label">Total</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{stats.SIBLING}</span>
                    <span className="stat-label">Fundadores</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{stats.CHILD}</span>
                    <span className="stat-label">Hijos</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{stats.GRANDCHILD}</span>
                    <span className="stat-label">Nietos</span>
                </div>
            </div>

            {/* Radial Chart */}
            <div className="radial-chart" style={{ transform: `scale(${zoom})` }}>
                {/* Center */}
                <div className="radial-center">
                    <span>👴👵</span>
                    <small>Los Patriarcas</small>
                </div>

                {/* Generation rings (visual guides) */}
                <div className="radial-ring ring-1"></div>
                <div className="radial-ring ring-2"></div>
                <div className="radial-ring ring-3"></div>

                {/* Branches as sectors */}
                {branchData.map((data, index) => {
                    const angle = index * anglePerBranch;
                    const isSelected = selectedBranch === data.branch.id;

                    // Count by generation
                    const siblings = data.members.filter(m => m.relation === 'SIBLING');
                    const children = data.members.filter(m => m.relation === 'CHILD');
                    const grandchildren = data.members.filter(m => m.relation === 'GRANDCHILD' || m.relation === 'GREAT_GRANDCHILD');

                    return (
                        <div
                            key={data.branch.id}
                            className={`radial-sector ${isSelected ? 'selected' : ''}`}
                            style={{
                                '--sector-angle': `${angle}deg`,
                                '--sector-color': data.branch.color,
                            } as React.CSSProperties}
                            onClick={() => setSelectedBranch(isSelected ? null : data.branch.id)}
                        >
                            {/* Branch label */}
                            <div className="sector-label" style={{ transform: `rotate(${angle}deg) translateY(-200px) rotate(-${angle}deg)` }}>
                                <span className="sector-name">{data.branch.name.split(' ')[0]}</span>
                                <span className="sector-count">{data.members.length}</span>
                            </div>

                            {/* Member dots by generation */}
                            {siblings.map((member, i) => (
                                <div
                                    key={member.id}
                                    className="radial-dot dot-gen-1"
                                    style={{
                                        transform: `rotate(${angle + (i - siblings.length / 2) * 5}deg) translateY(-80px)`,
                                        backgroundColor: data.branch.color
                                    }}
                                    onClick={(e) => { e.stopPropagation(); onMemberClick?.(member); }}
                                    title={member.name}
                                >
                                    {member.photo ? (
                                        <img src={member.photo} alt="" />
                                    ) : (
                                        <span>{member.name.charAt(0)}</span>
                                    )}
                                </div>
                            ))}

                            {children.map((member, i) => (
                                <div
                                    key={member.id}
                                    className="radial-dot dot-gen-2"
                                    style={{
                                        transform: `rotate(${angle + (i - children.length / 2) * 4}deg) translateY(-130px)`,
                                        backgroundColor: data.branch.color
                                    }}
                                    onClick={(e) => { e.stopPropagation(); onMemberClick?.(member); }}
                                    title={member.name}
                                />
                            ))}

                            {grandchildren.slice(0, 10).map((member, i) => (
                                <div
                                    key={member.id}
                                    className="radial-dot dot-gen-3"
                                    style={{
                                        transform: `rotate(${angle + (i - grandchildren.length / 2) * 3}deg) translateY(-170px)`,
                                        backgroundColor: data.branch.color
                                    }}
                                    onClick={(e) => { e.stopPropagation(); onMemberClick?.(member); }}
                                    title={member.name}
                                />
                            ))}

                            {/* Connection line from center to branch */}
                            <div
                                className="sector-line"
                                style={{
                                    transform: `rotate(${angle}deg)`,
                                    backgroundColor: data.branch.color
                                }}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="radial-legend">
                <div className="legend-item"><span className="dot-lg"></span> Fundadores</div>
                <div className="legend-item"><span className="dot-md"></span> Hijos</div>
                <div className="legend-item"><span className="dot-sm"></span> Nietos+</div>
            </div>
        </div>
    );
};
