import React, { useMemo, useState } from 'react';
import type { FamilyMember } from '../../../types';
import './RadialTree.css';

interface TreeProps {
    members: FamilyMember[];
    onMemberClick?: (member: FamilyMember) => void;
}

// Statistics calculator
const calculateStats = (members: FamilyMember[]) => {
    const stats = {
        total: members.length,
        byGeneration: {
            SIBLING: 0,
            CHILD: 0,
            GRANDCHILD: 0,
            GREAT_GRANDCHILD: 0,
            OTHER: 0
        },
        byBranch: new Map<string, { name: string; color: string; count: number }>()
    };

    members.forEach(m => {
        // Count by generation
        const gen = m.relation as keyof typeof stats.byGeneration || 'OTHER';
        if (stats.byGeneration[gen] !== undefined) {
            stats.byGeneration[gen]++;
        } else {
            stats.byGeneration.OTHER++;
        }

        // Count by branch
        if (m.branch) {
            if (!stats.byBranch.has(m.branch.id)) {
                stats.byBranch.set(m.branch.id, { name: m.branch.name, color: m.branch.color, count: 0 });
            }
            stats.byBranch.get(m.branch.id)!.count++;
        }
    });

    return stats;
};

export const RadialTree: React.FC<TreeProps> = ({ members, onMemberClick }) => {
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
    const stats = useMemo(() => calculateStats(members), [members]);
    const branchArray = useMemo(() => Array.from(stats.byBranch.values()), [stats]);

    // Filter members by selected branch
    const displayMembers = useMemo(() => {
        if (!selectedBranch) return members;
        return members.filter(m => m.branch?.id === selectedBranch);
    }, [members, selectedBranch]);

    // Calculate max for bar scaling
    const maxBranchCount = Math.max(...branchArray.map(b => b.count), 1);

    return (
        <div className="radial-stats-container">
            {/* Header Stats */}
            <div className="stats-header">
                <div className="stat-card total">
                    <span className="stat-value">{stats.total}</span>
                    <span className="stat-label">Miembros Totales</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{stats.byGeneration.SIBLING}</span>
                    <span className="stat-label">Fundadores</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{stats.byGeneration.CHILD}</span>
                    <span className="stat-label">Hijos</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{stats.byGeneration.GRANDCHILD}</span>
                    <span className="stat-label">Nietos</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{stats.byGeneration.GREAT_GRANDCHILD}</span>
                    <span className="stat-label">Bisnietos</span>
                </div>
            </div>

            {/* Branch Distribution Chart */}
            <div className="chart-section">
                <h3>📊 Distribución por Rama</h3>
                <div className="branch-chart">
                    {branchArray.map(branch => (
                        <div
                            key={branch.name}
                            className={`chart-bar-row ${selectedBranch === branch.name ? 'selected' : ''}`}
                            onClick={() => setSelectedBranch(selectedBranch === branch.name ? null : branch.name)}
                        >
                            <span className="bar-label">{branch.name.split(' ')[0]}</span>
                            <div className="bar-container">
                                <div
                                    className="bar-fill"
                                    style={{
                                        width: `${(branch.count / maxBranchCount) * 100}%`,
                                        backgroundColor: branch.color
                                    }}
                                />
                            </div>
                            <span className="bar-value">{branch.count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Member Grid */}
            <div className="members-section">
                <h3>
                    👨‍👩‍👧‍👦 {selectedBranch ? `Rama: ${selectedBranch}` : 'Todos los Miembros'}
                    <span className="member-count">({displayMembers.length})</span>
                    {selectedBranch && (
                        <button className="clear-filter" onClick={() => setSelectedBranch(null)}>✕ Limpiar</button>
                    )}
                </h3>
                <div className="members-grid">
                    {displayMembers.slice(0, 24).map(member => (
                        <div
                            key={member.id}
                            className="member-chip"
                            style={{ borderColor: member.branch?.color || '#D4AF37' }}
                            onClick={() => onMemberClick?.(member)}
                            title={member.name}
                        >
                            {member.photo ? (
                                <img src={member.photo} alt={member.name} />
                            ) : (
                                <span className="chip-initial">{member.name.charAt(0)}</span>
                            )}
                            <span className="chip-name">{member.name.split(' ')[0]}</span>
                        </div>
                    ))}
                    {displayMembers.length > 24 && (
                        <div className="more-badge">+{displayMembers.length - 24} más</div>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="stats-legend">
                <span>👆 Toca una barra para filtrar</span>
                <span>👆 Toca un miembro para ver detalles</span>
            </div>
        </div>
    );
};
