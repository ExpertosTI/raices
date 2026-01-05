import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import type { FamilyMember } from '../../../types';
import './ThreeDTree.css';
import { Maximize, Minimize, RotateCw, Move, Search } from 'lucide-react';

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

export const ThreeDTree: React.FC<ThreeDTreeProps> = ({ members, onMemberClick }) => {
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
    const [tool, setTool] = useState<'rotate' | 'move'>('rotate');

    const filteredMembers = useMemo(() => {
        return searchQuery
            ? members.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
            : members;
    }, [members, searchQuery]);

    const positions = useMemo(() => calculatePositions(filteredMembers, filterBranchId), [filteredMembers, filterBranchId]);
    const branches = useMemo(() => getBranches(members), [members]);
    const connections = useMemo(() => getConnections(positions), [positions]);
    const patriarchs = useMemo(() => members.filter(m => !m.branchId || m.relation === 'PATRIARCH'), [members]);

    // Highlighted IDs logic
    const highlightedIds = useMemo(() => {
        if (hoveredId) return getRelatedIds(hoveredId, members);
        if (searchQuery) return new Set(filteredMembers.map(m => m.id));
        return null;
    }, [hoveredId, searchQuery, members, filteredMembers]);

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

    // Branch Labels Calculation
    const branchLabels = useMemo(() => {
        const labels: { id: string, name: string, x: number, y: number, z: number, color: string }[] = [];
        // Calculate average position for each branch
        branches.forEach(branch => {
            const branchMembers = positions.filter(p => p.member.branchId === branch.id);
            if (branchMembers.length === 0) return;

            // Find centroid (average x, y, z) - emphasizing the outer edge for visibility
            // Find centroid (average x, y, z) - emphasizing the outer edge for visibility

            // Use the furthest members to place label outside
            const maxRadiusMember = branchMembers.reduce((prev, current) =>
                (Math.hypot(current.x, current.y) > Math.hypot(prev.x, prev.y)) ? current : prev
            );

            const angle = Math.atan2(maxRadiusMember.y, maxRadiusMember.x);
            const radius = Math.hypot(maxRadiusMember.x, maxRadiusMember.y) + 120; // 120px out from furthest member

            labels.push({
                id: branch.id,
                name: branch.name,
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                z: 50, // Floating above
                color: branch.color || '#FFF'
            });
        });
        return labels;
    }, [branches, positions]);

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
        // Pinch Zoom Start
        if (touches && touches.length === 2) {
            const dist = Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY
            );
            lastPinchDist.current = dist;
            isDraggingRef.current = false;
            return;
        }

        isDraggingRef.current = true;
        lastPos.current = { x: clientX, y: clientY };
        lastTime.current = Date.now();
        velocity.current = { x: 0, y: 0 }; // Stop inertia on grab
    }, []);

    const handleMove = useCallback((clientX: number, clientY: number, touches?: React.TouchList) => {
        // Pinch Zoom Move
        if (touches && touches.length === 2) {
            const dist = Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY
            );

            if (lastPinchDist.current) {
                const delta = dist - lastPinchDist.current;
                setZoom(z => Math.max(0.5, Math.min(2.5, z + delta * 0.005)));
            }

            lastPinchDist.current = dist;
            return;
        }

        if (!isDraggingRef.current) return;

        const now = Date.now();

        const deltaX = clientX - lastPos.current.x;
        const deltaY = clientY - lastPos.current.y;

        if (tool === 'move') {
            setPan(p => ({ x: p.x + deltaX, y: p.y + deltaY }));
        } else {
            // Immediate update
            setRotationY(prev => prev + deltaX * 0.4);
            setRotationX(prev => Math.max(-70, Math.min(70, prev - deltaY * 0.4)));

            // Calculate velocity for release (pixels per frame approx)
            velocity.current = {
                x: deltaX * 0.4,
                y: deltaY * 0.4
            };
        }

        lastPos.current = { x: clientX, y: clientY };
        lastTime.current = now;
    }, [tool]);

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
            {/* Controls */}
            <div className="tree-3d-controls">
                <div className="search-box glass-panel">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Buscar miembro..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <select
                    className="branch-select glass-panel"
                    value={filterBranchId || ''}
                    onChange={(e) => setFilterBranchId(e.target.value || null)}
                >
                    <option value="">Todas las ramas</option>
                    {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>

                <div className="toolbar-glass glass-panel">
                    <button
                        className={`tool-btn ${tool === 'rotate' ? 'active' : ''}`}
                        onClick={() => setTool('rotate')}
                        title="Rotar"
                    >
                        <RotateCw size={18} />
                    </button>
                    <button
                        className={`tool-btn ${tool === 'move' ? 'active' : ''}`}
                        onClick={() => setTool('move')}
                        title="Mover (Pan)"
                    >
                        <Move size={18} />
                    </button>

                    <div className="divider" />

                    <button onClick={handleZoomOut} title="Zoom Out"><Minimize size={14} /></button>
                    <button onClick={handleZoomIn} title="Zoom In"><Maximize size={14} /></button>

                    <div className="divider" />

                    <button onClick={handleReset} title="Reiniciar Cámara">🎯</button>
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
                    >
                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                </div>
            </div>



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
                tabIndex={0} // Make focusable
                style={{ outline: 'none' }}
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

                    {/* Branch Labels (#18) */}
                    {branchLabels.map(label => (
                        <div
                            key={label.id}
                            className="tree-branch-label"
                            style={{
                                transform: `translate3d(${label.x}px, ${label.y}px, ${label.z}px) rotateX(var(--inv-rot-x)) rotateY(var(--inv-rot-y))`,
                                color: label.color,
                                borderColor: label.color
                            } as React.CSSProperties}
                        >
                            {label.name}
                        </div>
                    ))}

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
                                title={`${member.name}\n${member.birthDate ? new Date(member.birthDate).getFullYear() : ''} - ${member.relation || ''}`}
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
            </div>

            {/* Overlay */}
            <div className="tree-3d-overlay">
                <span className="tree-stats">{positions.length} miembros</span>
                <p>
                    {tool === 'rotate' ? '👆 Arrastra para girar' : '✋ Arrastra para mover'}
                    {' • '}
                    Rueda/Pinch = Zoom • 2x Clic = Centrar
                </p>
            </div>
        </div >
    );
};
