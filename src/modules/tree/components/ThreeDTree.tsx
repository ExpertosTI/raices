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

// Calculate positions
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
        let spreadFactor = 20;

        switch (member.relation) {
            case 'SIBLING':
                radius = 90;
                zOffset = 40;
                scale = 1.1;
                spreadFactor = 12;
                break;
            case 'CHILD':
                radius = 160;
                zOffset = 10;
                scale = 0.9;
                spreadFactor = 18;
                break;
            case 'GRANDCHILD':
                radius = 230;
                zOffset = -20;
                scale = 0.75;
                spreadFactor = 22;
                break;
            case 'GREAT_GRANDCHILD':
                radius = 300;
                zOffset = -50;
                scale = 0.6;
                spreadFactor = 25;
                break;
            default:
                radius = 180;
                zOffset = 0;
                scale = 0.8;
        }

        const hash = Math.abs(member.id.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0));
        const genIndex = currentCount;
        const angleOffset = (genIndex - 2) * spreadFactor + ((hash % 15) - 7);
        const angleRad = ((baseAngle + angleOffset) * Math.PI) / 180;
        const depthVariation = (hash % 40) - 20;

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

    const connections: { from: NodePosition; to: NodePosition; color: string }[] = [];

    positions.forEach(pos => {
        if (pos.member.parentId && posMap.has(pos.member.parentId)) {
            const parent = posMap.get(pos.member.parentId)!;
            connections.push({
                from: parent,
                to: pos,
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
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ w: 600, h: 400 });

    const positions = useMemo(() => calculatePositions(members, filterBranchId), [members, filterBranchId]);
    const connections = useMemo(() => getConnections(positions), [positions]);
    const branches = useMemo(() => getBranches(members), [members]);

    // Get container size for SVG
    useEffect(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setContainerSize({ w: rect.width, h: rect.height });
        }
    }, []);

    // Auto rotation
    useEffect(() => {
        if (isDragging) return;
        const interval = setInterval(() => {
            setRotationY(prev => prev + 0.15);
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

    // Transform 2D position based on rotation (simplified projection)
    const project = (x: number, y: number, z: number) => {
        const radY = (rotationY * Math.PI) / 180;
        const radX = (rotationX * Math.PI) / 180;

        // Rotate around Y
        const x1 = x * Math.cos(radY) - z * Math.sin(radY);
        const z1 = x * Math.sin(radY) + z * Math.cos(radY);

        // Rotate around X
        const y1 = y * Math.cos(radX) - z1 * Math.sin(radX);

        return {
            x: (containerSize.w / 2) + x1 * zoom,
            y: (containerSize.h / 2) + y1 * zoom
        };
    };

    return (
        <div className="tree-3d-container" ref={containerRef}>
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

            {/* SVG Layer for connection lines (OUTSIDE 3D world, uses projection) */}
            <svg className="tree-3d-svg-layer">
                {connections.map((conn, i) => {
                    const from = project(conn.from.x, conn.from.y, conn.from.z);
                    const to = project(conn.to.x, conn.to.y, conn.to.z);
                    return (
                        <line
                            key={`line-${i}`}
                            x1={from.x}
                            y1={from.y}
                            x2={to.x}
                            y2={to.y}
                            stroke={conn.color}
                            strokeWidth="2"
                            strokeOpacity="0.5"
                        />
                    );
                })}
            </svg>

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
                    {/* Center */}
                    <div className="tree-3d-center">
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
