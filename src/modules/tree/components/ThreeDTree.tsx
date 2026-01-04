import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { FamilyMember } from '../../../types';
import './ThreeDTree.css';

interface ThreeDTreeProps {
    members: FamilyMember[];
    onMemberClick?: (member: FamilyMember) => void;
}

// Calculate positions in a circular galaxy layout
const calculatePositions = (members: FamilyMember[], filterBranchId: string | null) => {
    const filtered = filterBranchId
        ? members.filter(m => m.branchId === filterBranchId)
        : members;

    const positions: { member: FamilyMember, x: number, y: number, z: number, scale: number }[] = [];
    const branchAngles = new Map<string, number>();

    const branches = Array.from(new Set(filtered.map(m => m.branchId).filter(Boolean)));
    branches.forEach((branchId, index) => {
        const angle = (index / branches.length) * 360;
        branchAngles.set(branchId!, angle);
    });

    filtered.forEach((member) => {
        const branchId = member.branchId;
        if (!branchId) return;

        const baseAngle = branchAngles.get(branchId) || 0;
        let radius = 150;
        let zOffset = 0;
        let scale = 1;

        switch (member.relation) {
            case 'SIBLING':
                radius = 120;
                zOffset = 50;
                scale = 1.1;
                break;
            case 'CHILD':
                radius = 200;
                zOffset = 0;
                scale = 0.9;
                break;
            case 'GRANDCHILD':
                radius = 280;
                zOffset = -50;
                scale = 0.75;
                break;
            case 'GREAT_GRANDCHILD':
                radius = 350;
                zOffset = -100;
                scale = 0.6;
                break;
        }

        // Add some variation within the branch
        const hash = member.id.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
        const variation = (hash % 30) - 15;
        const angleRad = ((baseAngle + variation) * Math.PI) / 180;

        positions.push({
            member,
            x: Math.cos(angleRad) * radius,
            y: Math.sin(angleRad) * radius,
            z: zOffset + (hash % 40) - 20,
            scale
        });
    });

    return positions;
};

// Get unique branches
const getBranches = (members: FamilyMember[]) => {
    const branchMap = new Map<string, { id: string, name: string, color: string }>();
    members.forEach(m => {
        if (m.branch && !branchMap.has(m.branch.id)) {
            branchMap.set(m.branch.id, { id: m.branch.id, name: m.branch.name, color: m.branch.color });
        }
    });
    return Array.from(branchMap.values());
};

export const ThreeDTree: React.FC<ThreeDTreeProps> = ({ members, onMemberClick }) => {
    const [filterBranchId, setFilterBranchId] = useState<string | null>(null);
    const [rotationX, setRotationX] = useState(-15);
    const [rotationY, setRotationY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const positions = useMemo(() => calculatePositions(members, filterBranchId), [members, filterBranchId]);
    const branches = useMemo(() => getBranches(members), [members]);

    // Auto rotation
    useEffect(() => {
        if (isDragging) return;
        const interval = setInterval(() => {
            setRotationY(prev => prev + 0.3);
        }, 50);
        return () => clearInterval(interval);
    }, [isDragging]);

    // Mouse/Touch handlers
    const handleStart = (clientX: number, clientY: number) => {
        setIsDragging(true);
        lastPos.current = { x: clientX, y: clientY };
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (!isDragging) return;
        const deltaX = clientX - lastPos.current.x;
        const deltaY = clientY - lastPos.current.y;
        setRotationY(prev => prev + deltaX * 0.5);
        setRotationX(prev => Math.max(-60, Math.min(60, prev - deltaY * 0.5)));
        lastPos.current = { x: clientX, y: clientY };
    };

    const handleEnd = () => setIsDragging(false);

    const handleReset = () => {
        setRotationX(-15);
        setRotationY(0);
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
                <button className="reset-camera-btn" onClick={handleReset} title="Reiniciar vista">
                    🎯
                </button>
            </div>

            {/* 3D Scene */}
            <div
                ref={containerRef}
                className="tree-3d-scene"
                onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
                onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchEnd={handleEnd}
            >
                <div
                    className="tree-3d-world"
                    style={{
                        transform: `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`
                    }}
                >
                    {/* Center indicator */}
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

            {/* Instructions */}
            <div className="tree-3d-overlay">
                <p>👆 Arrastra para girar • Toca un avatar para ver detalles</p>
            </div>
        </div>
    );
};
