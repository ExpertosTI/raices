import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { FamilyMember } from '../../../types';
import './ThreeDTree.css';

interface ThreeDTreeProps {
    members: FamilyMember[];
    onMemberClick?: (member: FamilyMember) => void;
}

interface NodePosition {
    member: FamilyMember;
    x: number;
    y: number;
    z: number;
    scale: number;
}

// Calculate positions with better distribution
const calculatePositions = (members: FamilyMember[], filterBranchId: string | null): NodePosition[] => {
    const filtered = filterBranchId
        ? members.filter(m => m.branchId === filterBranchId)
        : members;

    const positions: NodePosition[] = [];
    const branchAngles = new Map<string, number>();

    const branches = Array.from(new Set(filtered.map(m => m.branchId).filter(Boolean)));
    branches.forEach((branchId, index) => {
        const angle = (index / branches.length) * 360;
        branchAngles.set(branchId!, angle);
    });

    const branchGenCounts = new Map<string, Map<string, number>>();

    filtered.forEach((member) => {
        const branchId = member.branchId;
        if (!branchId) return;

        if (!branchGenCounts.has(branchId)) {
            branchGenCounts.set(branchId, new Map());
        }
        const genCounts = branchGenCounts.get(branchId)!;
        const currentCount = genCounts.get(member.relation || 'OTHER') || 0;
        genCounts.set(member.relation || 'OTHER', currentCount + 1);

        const baseAngle = branchAngles.get(branchId) || 0;
        let radius = 100;
        let zOffset = 0;
        let scale = 1;
        let spreadFactor = 25;

        switch (member.relation) {
            case 'SIBLING':
                radius = 100;
                zOffset = 60;
                scale = 1.15;
                spreadFactor = 15;
                break;
            case 'CHILD':
                radius = 180;
                zOffset = 20;
                scale = 0.95;
                spreadFactor = 20;
                break;
            case 'GRANDCHILD':
                radius = 260;
                zOffset = -30;
                scale = 0.8;
                spreadFactor = 25;
                break;
            case 'GREAT_GRANDCHILD':
                radius = 340;
                zOffset = -80;
                scale = 0.65;
                spreadFactor = 30;
                break;
            default:
                radius = 200;
                zOffset = 0;
                scale = 0.85;
        }

        const hash = Math.abs(member.id.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0));
        const genIndex = currentCount;
        const angleOffset = (genIndex - 2) * spreadFactor + ((hash % 20) - 10);
        const angleRad = ((baseAngle + angleOffset) * Math.PI) / 180;
        const depthVariation = (hash % 60) - 30;

        positions.push({
            member,
            x: Math.cos(angleRad) * radius,
            y: Math.sin(angleRad) * radius,
            z: zOffset + depthVariation,
            scale
        });
    });

    return positions;
};

const getBranches = (members: FamilyMember[]) => {
    const branchMap = new Map<string, { id: string, name: string, color: string }>();
    members.forEach(m => {
        if (m.branch && !branchMap.has(m.branch.id)) {
            branchMap.set(m.branch.id, { id: m.branch.id, name: m.branch.name, color: m.branch.color });
        }
    });
    return Array.from(branchMap.values());
};

// Get connections (parent -> child)
const getConnections = (positions: NodePosition[]) => {
    const posMap = new Map<string, NodePosition>();
    positions.forEach(p => posMap.set(p.member.id, p));

    const connections: { fromX: number; fromY: number; toX: number; toY: number; color: string }[] = [];

    positions.forEach(pos => {
        if (pos.member.parentId && posMap.has(pos.member.parentId)) {
            const parent = posMap.get(pos.member.parentId)!;
            connections.push({
                fromX: parent.x,
                fromY: parent.y,
                toX: pos.x,
                toY: pos.y,
                color: pos.member.branch?.color || '#D4AF37'
            });
        }
    });

    return connections;
};

export const ThreeDTree: React.FC<ThreeDTreeProps> = ({ members, onMemberClick }) => {
    const [filterBranchId, setFilterBranchId] = useState<string | null>(null);
    const [rotationX, setRotationX] = useState(-20);
    const [rotationY, setRotationY] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const positions = useMemo(() => calculatePositions(members, filterBranchId), [members, filterBranchId]);
    const connections = useMemo(() => getConnections(positions), [positions]);
    const branches = useMemo(() => getBranches(members), [members]);

    // Auto rotation
    useEffect(() => {
        if (isDragging) return;
        const interval = setInterval(() => {
            setRotationY(prev => prev + 0.2);
        }, 50);
        return () => clearInterval(interval);
    }, [isDragging]);

    const handleStart = (clientX: number, clientY: number) => {
        setIsDragging(true);
        lastPos.current = { x: clientX, y: clientY };
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (!isDragging) return;
        const deltaX = clientX - lastPos.current.x;
        const deltaY = clientY - lastPos.current.y;
        setRotationY(prev => prev + deltaX * 0.4);
        setRotationX(prev => Math.max(-70, Math.min(70, prev - deltaY * 0.4)));
        lastPos.current = { x: clientX, y: clientY };
    };

    const handleEnd = () => setIsDragging(false);

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        setZoom(prev => Math.max(0.5, Math.min(2, prev - e.deltaY * 0.001)));
    };

    const handleReset = () => {
        setRotationX(-20);
        setRotationY(0);
        setZoom(1);
    };

    return (
        <div className="tree-3d-container">
            {/* Controls */}
            <div className="tree-3d-controls">
                <select
                    className="branch-filter"
                    value={filterBranchId || ''}
                    onChange={(e) => setFilterBranchId(e.target.value || null)}
                >
                    <option value="">Todas las ramas</option>
                    {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
                <div className="zoom-controls">
                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}>−</button>
                    <button onClick={() => setZoom(z => Math.min(2, z + 0.2))}>+</button>
                </div>
                <button className="reset-camera-btn" onClick={handleReset} title="Reiniciar">🎯</button>
            </div>

            {/* 3D Scene */}
            <div
                className="tree-3d-scene"
                onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
                onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchEnd={handleEnd}
                onWheel={handleWheel}
            >
                <div
                    className="tree-3d-world"
                    style={{ transform: `scale(${zoom}) rotateX(${rotationX}deg) rotateY(${rotationY}deg)` }}
                >
                    {/* CONNECTION LINES - Using divs for CSS 3D compatibility */}
                    {connections.map((conn, i) => {
                        const dx = conn.toX - conn.fromX;
                        const dy = conn.toY - conn.fromY;
                        const length = Math.sqrt(dx * dx + dy * dy);
                        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                        return (
                            <div
                                key={`line-${i}`}
                                className="tree-3d-line"
                                style={{
                                    width: `${length}px`,
                                    left: `${conn.fromX}px`,
                                    top: `${conn.fromY}px`,
                                    transform: `rotate(${angle}deg)`,
                                    backgroundColor: conn.color,
                                }}
                            />
                        );
                    })}

                    {/* Center */}
                    <div className="tree-3d-center">
                        <div className="center-orb"></div>
                        <span>👴👵</span>
                        <small>Los Patriarcas</small>
                    </div>

                    {/* Member nodes */}
                    {positions.map(({ member, x, y, z, scale }) => {
                        const color = member.preferredColor || member.branch?.color || '#D4AF37';
                        return (
                            <div
                                key={member.id}
                                className="tree-3d-node"
                                style={{
                                    transform: `translate3d(${x}px, ${y}px, ${z}px) scale(${scale})`,
                                    '--node-color': color
                                } as React.CSSProperties}
                                onClick={() => onMemberClick?.(member)}
                            >
                                <div className="node-avatar" style={{ borderColor: color }}>
                                    {member.photo ? (
                                        <img src={member.photo} alt={member.name} />
                                    ) : (
                                        <span className="node-initial">{member.name.charAt(0)}</span>
                                    )}
                                </div>
                                <span className="node-name">{member.name.split(' ')[0]}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Overlay */}
            <div className="tree-3d-overlay">
                <span className="tree-stats">{positions.length} miembros</span>
                <p>👆 Arrastra para girar • Rueda = Zoom • Toca avatar = Detalles</p>
            </div>
        </div>
    );
};
