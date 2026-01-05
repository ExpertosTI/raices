import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import type { FamilyMember } from '../../../types';
import './ThreeDTree.css';
// No lucide icons needed - using emojis for simplicity

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

// Translation function for relation types
const getRelationLabel = (relation: string | undefined) => {
    if (!relation) return '';
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

// Calculate line properties
const getLineStyle = (from: NodePosition, to: NodePosition) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const midZ = (from.z + to.z) / 2;

    return {
        width: length,
        angle,
        x: from.x,
        y: from.y,
        z: midZ
    };
};

// Calculate lineage for highlighting
const getRelatedIds = (targetId: string, members: FamilyMember[]) => {
    const ids = new Set<string>();
    ids.add(targetId);

    // Map for O(1) access
    const memberMap = new Map(members.map(m => [m.id, m]));
    const childMap = new Map<string, FamilyMember[]>();
    members.forEach(m => {
        if (m.parentId) {
            if (!childMap.has(m.parentId)) childMap.set(m.parentId, []);
            childMap.get(m.parentId)!.push(m);
        }
    });

    // Ancestors
    let curr = memberMap.get(targetId);
    while (curr && curr.parentId) {
        ids.add(curr.parentId);
        curr = memberMap.get(curr.parentId);
    }

    // Descendants
    const queue = [targetId];
    while (queue.length > 0) {
        const pid = queue.shift()!;
        const children = childMap.get(pid) || [];
        children.forEach(c => {
            ids.add(c.id);
            queue.push(c.id);
        });
    }
    return ids;
};

export const ThreeDTree: React.FC<ThreeDTreeProps & { loading?: boolean }> = ({ members, onMemberClick, loading }) => {
    const [filterBranchId, setFilterBranchId] = useState<string | null>(null);
    const [rotationX, setRotationX] = useState(-20);
    const [rotationY, setRotationY] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [isResetting, setIsResetting] = useState(false);
    const [hoveredId, setHoveredId] = useState<string | null>(null); // Highlight state
    const [searchQuery, setSearchQuery] = useState(''); // Search state
    const [pan, setPan] = useState({ x: 0, y: 0 }); // Pan state
    const [isFullscreen, setIsFullscreen] = useState(false); // Fullscreen state
    const [showPatriarchMenu, setShowPatriarchMenu] = useState(false); // Menu for patriarchs
    const [soundEnabled] = useState(true); // Sound state

    // Layout targets ALL members (filtered by branch if active)
    // We don't filter by search here to keep the tree structure stable and allow dimming effect
    const positions = useMemo(() => calculatePositions(members, filterBranchId), [members, filterBranchId]);

    const branches = useMemo(() => getBranches(members), [members]);
    const connections = useMemo(() => getConnections(positions), [positions]);
    const patriarchs = useMemo(() => members.filter(m => !m.branchId || m.relation === 'PATRIARCH'), [members]);

    // Highlighted IDs logic
    const highlightedIds = useMemo(() => {
        if (hoveredId) return getRelatedIds(hoveredId, members);
        if (searchQuery) {
            // Find members matching search
            const matches = members.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
            return new Set(matches.map(m => m.id));
        }
        return null;
    }, [hoveredId, searchQuery, members]);

    // Sound effect helper
    const playSound = useCallback((type: 'hover' | 'click') => {
        if (!soundEnabled) return;
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'hover') {
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.02, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        } else {
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        }
    }, [soundEnabled]);

    // Branch Labels removed for cleaner UI

    const velocity = useRef({ x: 0.15, y: 0 });
    const isDraggingRef = useRef(false);
    const lastTime = useRef(Date.now());
    const requestRef = useRef<number>(0);
    const lastPinchDist = useRef<number | null>(null);

    // Physics Loop
    const animate = useCallback(() => {
        if (!isDraggingRef.current) {
            setRotationY(prev => prev + velocity.current.x);
            setRotationX(prev => {
                const next = prev - velocity.current.y;
                return Math.max(-70, Math.min(70, next));
            });

            // Apply friction
            velocity.current.x *= 0.95;
            velocity.current.y *= 0.95;

            // Maintain minimum auto-rotation if idle
            if (Math.abs(velocity.current.x) < 0.1 && Math.abs(velocity.current.y) < 0.01) {
                velocity.current.x = velocity.current.x > 0 ? 0.1 : -0.1;
            }
        }
        requestRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [animate]);

    const lastPos = useRef({ x: 0, y: 0 });
    const sceneRef = useRef<HTMLDivElement>(null);

    const handleStart = useCallback((clientX: number, clientY: number, touches?: React.TouchList) => {
        // Pinch Zoom Start (2 fingers)
        if (touches && touches.length === 2) {
            const dist = Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY
            );
            const centerX = (touches[0].clientX + touches[1].clientX) / 2;
            const centerY = (touches[0].clientY + touches[1].clientY) / 2;
            lastPinchDist.current = dist;
            lastPos.current = { x: centerX, y: centerY };
            isDraggingRef.current = false;
            return;
        }

        isDraggingRef.current = true;
        lastPos.current = { x: clientX, y: clientY };
        lastTime.current = Date.now();
        velocity.current = { x: 0, y: 0 };
    }, []);

    const handleMove = useCallback((clientX: number, clientY: number, touches?: React.TouchList) => {
        // Pinch Zoom + Two-finger Pan
        if (touches && touches.length === 2) {
            const dist = Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY
            );
            const centerX = (touches[0].clientX + touches[1].clientX) / 2;
            const centerY = (touches[0].clientY + touches[1].clientY) / 2;

            if (lastPinchDist.current) {
                const delta = dist - lastPinchDist.current;
                setZoom(z => Math.max(0.3, Math.min(3, z + delta * 0.008)));
            }

            const panDeltaX = centerX - lastPos.current.x;
            const panDeltaY = centerY - lastPos.current.y;
            setPan(p => ({ x: p.x + panDeltaX, y: p.y + panDeltaY }));

            lastPinchDist.current = dist;
            lastPos.current = { x: centerX, y: centerY };
            return;
        }

        if (!isDraggingRef.current) return;

        const now = Date.now();
        const deltaTime = now - lastTime.current;
        const deltaX = clientX - lastPos.current.x;
        const deltaY = clientY - lastPos.current.y;

        // More responsive rotation for mobile
        const sensitivity = 0.5;
        setRotationY(prev => prev + deltaX * sensitivity);
        setRotationX(prev => Math.max(-70, Math.min(70, prev - deltaY * sensitivity)));

        // Better velocity calculation for momentum (smooth release)
        const velocityFactor = deltaTime > 0 ? Math.min(1, 16 / deltaTime) : 1;
        velocity.current = {
            x: deltaX * sensitivity * velocityFactor,
            y: deltaY * sensitivity * velocityFactor
        };

        lastPos.current = { x: clientX, y: clientY };
        lastTime.current = now;
    }, []);

    const handleEnd = useCallback(() => {
        isDraggingRef.current = false;
        lastPinchDist.current = null;
    }, []);

    const handleZoomIn = useCallback(() => setZoom(z => Math.min(2, z + 0.2)), []);
    const handleZoomOut = useCallback(() => setZoom(z => Math.max(0.5, z - 0.2)), []);
    const handleReset = useCallback(() => {
        setIsResetting(true);
        setRotationX(-20);
        setRotationY(0);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        velocity.current = { x: 0.15, y: 0 }; // Restaurar rotación suave
        setTimeout(() => setIsResetting(false), 1000);
    }, []);

    const handleNodeDoubleClick = useCallback((e: React.MouseEvent, x: number, y: number) => {
        e.stopPropagation();
        velocity.current = { x: 0, y: 0 }; // Stop inertia
        setIsResetting(true); // Smooth transition

        // Calculate angle to rotate world so node faces camera (assuming camera at +Z)
        const angle = Math.atan2(y, x) * (180 / Math.PI);
        const targetRotationY = -angle - 90; // Adjust for initial orientation

        setRotationX(-10);
        setRotationY(targetRotationY);
        setZoom(1.8);
        setPan({ x: 0, y: 0 }); // Reset pan to center

        setTimeout(() => setIsResetting(false), 1000);
    }, []);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }

            const speed = 2; // Impulso por tecla

            switch (e.key) {
                case 'ArrowLeft': velocity.current.x -= speed; break;
                case 'ArrowRight': velocity.current.x += speed; break;
                case 'ArrowUp': velocity.current.y += speed; break;
                case 'ArrowDown': velocity.current.y -= speed; break;
                case '+': case '=': handleZoomIn(); break;
                case '-': case '_': handleZoomOut(); break;
                case 'r': case 'R': handleReset(); break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleZoomIn, handleZoomOut, handleReset]);

    return (
        <div className="tree-3d-container">
            {/* Old controls removed - now using floating bottom toolbar */}



            {/* Compass / Orientation Gizmo */}
            <div className="tree-compass glass-panel" style={{ transform: `rotateX(${-rotationX}deg) rotateY(${-rotationY}deg)` }}>
                <div className="compass-arrow north">N</div>
                <div className="compass-plane"></div>
            </div>

            {/* 3D Scene */}
            <div
                ref={sceneRef}
                className="tree-3d-scene"
                onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
                onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY, e.touches)}
                onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY, e.touches)}
                onTouchEnd={handleEnd}
                tabIndex={0}
                style={{ outline: 'none', touchAction: 'none' }}
            >
                <div
                    className={`tree-3d-world ${isResetting ? 'smooth-reset' : ''}`}
                    style={{
                        transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) rotateX(${rotationX}deg) rotateY(${rotationY}deg)`,
                        '--inv-rot-x': `${-rotationX}deg`,
                        '--inv-rot-y': `${-rotationY}deg`
                    } as React.CSSProperties}
                >
                    {/* Generation Rings */}
                    {[180, 320, 460, 600].map((d, i) => (
                        <div key={`ring-${i}`} className="generation-ring" style={{ width: d, height: d }} />
                    ))}

                    {/* CONNECTION LINES - Using 3D positioned divs */}
                    {connections.map((conn, i) => {
                        const lineStyle = getLineStyle(conn.from, conn.to);
                        const isLineHighlighted = highlightedIds ? (highlightedIds.has(conn.from.member.id) && highlightedIds.has(conn.to.member.id)) : false;
                        const isLineDimmed = highlightedIds ? !isLineHighlighted : false;

                        return (
                            <div
                                key={`line-${i}`}
                                className={`tree-3d-line ${isLineHighlighted ? 'highlighted' : ''} ${isLineDimmed ? 'dimmed' : ''}`}
                                style={{
                                    width: `${lineStyle.width}px`,
                                    transform: `translate3d(${lineStyle.x}px, ${lineStyle.y}px, ${lineStyle.z}px) rotateZ(${lineStyle.angle}deg)`,
                                    backgroundColor: conn.color,
                                }}
                            />
                        );
                    })}

                    {/* Center */}
                    <div
                        className="tree-3d-center"
                        onClick={(e) => { e.stopPropagation(); setShowPatriarchMenu(!showPatriarchMenu); }}
                        style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                    >
                        <div className="center-orb"></div>
                        <span>👴👵</span>
                        <small>Los Patriarcas</small>

                        {/* Patriarch Menu Popup */}
                        {showPatriarchMenu && (
                            <div className="patriarch-popup glass-panel">
                                <h4>Editar Patriarcas</h4>
                                {patriarchs.map(p => (
                                    <div
                                        key={p.id}
                                        className="patriarch-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onMemberClick?.(p);
                                            setShowPatriarchMenu(false);
                                        }}
                                    >
                                        <div className="p-avatar">
                                            {p.photo ? <img src={p.photo} alt={p.name} /> : <span className="text-sm">{p.name[0]}</span>}
                                        </div>
                                        <span>{p.name.split(' ')[0]}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Branch Labels - Hidden for cleaner view */}

                    {/* Member nodes */}
                    {positions.map(({ member, x, y, z, scale }) => {
                        const color = member.preferredColor || member.branch?.color || '#D4AF37';
                        const isHighlighted = highlightedIds ? highlightedIds.has(member.id) : false;
                        const isDimmed = highlightedIds ? !isHighlighted : false;

                        return (
                            <div
                                key={member.id}
                                className={`tree-3d-node ${isHighlighted ? 'highlighted' : ''} ${isDimmed ? 'dimmed' : ''}`}
                                style={{
                                    transform: `translate3d(${x}px, ${y}px, ${z}px) scale(${scale}) rotateY(var(--inv-rot-y)) rotateX(var(--inv-rot-x))`,
                                    '--node-color': color
                                } as React.CSSProperties}
                                onClick={() => { playSound('click'); onMemberClick?.(member); }}
                                onDoubleClick={(e) => handleNodeDoubleClick(e, x, y)}
                                onMouseEnter={() => { playSound('hover'); setHoveredId(member.id); }}
                                onMouseLeave={() => setHoveredId(null)}
                                title={`${member.name}\n${member.birthDate ? new Date(member.birthDate).getFullYear() : ''} - ${getRelationLabel(member.relation)}`}
                            >
                                <div className="node-shadow"></div> {/* #11 Anchoring Shadow */}
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
                {/* Search / Filter Overlay */}
                <div className="search-overlay">
                    <div className="search-bar">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar familiar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="clear-search" onClick={() => setSearchQuery('')}>×</button>
                        )}
                    </div>
                </div>

                {/* Loading Indicator */}
                {loading && (
                    <div className="tree-loading-overlay">
                        <div className="tree-spinner"></div>
                    </div>
                )}
            </div>

            {/* Modern Floating Bottom Toolbar */}
            <div className="floating-bottom-toolbar">
                {/* Branch Chips */}
                <div className="branch-chips">
                    <button
                        className={`branch-chip ${!filterBranchId ? 'active' : ''}`}
                        onClick={() => setFilterBranchId(null)}
                    >
                        Todos
                    </button>
                    {branches.slice(0, 4).map(b => (
                        <button
                            key={b.id}
                            className={`branch-chip ${filterBranchId === b.id ? 'active' : ''}`}
                            style={{ '--chip-color': b.color } as React.CSSProperties}
                            onClick={() => setFilterBranchId(filterBranchId === b.id ? null : b.id)}
                        >
                            {b.name.split(' ')[0]}
                        </button>
                    ))}
                    {branches.length > 4 && (
                        <button
                            className="branch-chip more"
                            onClick={() => setShowPatriarchMenu(!showPatriarchMenu)}
                        >
                            +{branches.length - 4}
                        </button>
                    )}
                </div>

                {/* Main Controls */}
                <div className="main-controls">
                    <button onClick={handleReset} title="Centrar vista" className="control-btn">
                        🎯
                    </button>
                    <button onClick={handleZoomOut} title="Alejar" className="control-btn">
                        ➖
                    </button>
                    <div className="zoom-indicator">
                        {Math.round(zoom * 100)}%
                    </div>
                    <button onClick={handleZoomIn} title="Acercar" className="control-btn">
                        ➕
                    </button>
                    <button
                        onClick={() => {
                            if (!document.fullscreenElement) {
                                sceneRef.current?.requestFullscreen();
                                setIsFullscreen(true);
                            } else {
                                document.exitFullscreen();
                                setIsFullscreen(false);
                            }
                        }}
                        title="Pantalla Completa"
                        className="control-btn"
                    >
                        {isFullscreen ? '🔲' : '⛶'}
                    </button>
                </div>

                {/* Stats */}
                <div className="toolbar-stats">
                    👥 {positions.length}
                </div>
            </div>

            {/* Extended Branch Menu */}
            {showPatriarchMenu && branches.length > 4 && (
                <div className="branch-menu-overlay" onClick={() => setShowPatriarchMenu(false)}>
                    <div className="branch-menu" onClick={e => e.stopPropagation()}>
                        <h4>Seleccionar Rama</h4>
                        <div className="branch-menu-grid">
                            {branches.map(b => (
                                <button
                                    key={b.id}
                                    className={`branch-menu-item ${filterBranchId === b.id ? 'active' : ''}`}
                                    style={{ borderColor: b.color }}
                                    onClick={() => { setFilterBranchId(b.id); setShowPatriarchMenu(false); }}
                                >
                                    <span className="branch-color-dot" style={{ background: b.color }}></span>
                                    {b.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
