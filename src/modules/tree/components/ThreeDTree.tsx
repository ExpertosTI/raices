import React, { useMemo, useRef, useState, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Billboard, Text, Stars, Line } from '@react-three/drei';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import type { FamilyMember } from '../../../types';

interface ThreeDTreeProps {
    members: FamilyMember[];
    onMemberClick?: (member: FamilyMember) => void;
}

// Hash helpers for deterministic positioning
const hashString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
};

const pseudoRandom = (seed: string, index: number): number => {
    const hash = hashString(seed + index.toString());
    return (hash % 1000) / 1000;
};

// Calculate positions in galaxy arrangement
const calculatePositions = (members: FamilyMember[]) => {
    const positions = new Map<string, THREE.Vector3>();
    const branchAngles = new Map<string, number>();

    const branches = Array.from(new Set(members.map(m => m.branchId).filter(Boolean)));
    branches.forEach((branchId, index) => {
        const angle = (index / branches.length) * Math.PI * 2;
        branchAngles.set(branchId!, angle);
    });

    const generationHeight = 4;

    members.forEach((member) => {
        const branchId = member.branchId;
        if (!branchId || !branchAngles.has(branchId)) {
            positions.set(member.id, new THREE.Vector3(0, 5, 0));
            return;
        }

        const angle = branchAngles.get(branchId)!;
        let generation = 0;
        let radius = 0;

        switch (member.relation) {
            case 'SIBLING': generation = 0; radius = 4; break;
            case 'CHILD': generation = 1; radius = 8; break;
            case 'GRANDCHILD': generation = 2; radius = 12; break;
            case 'GREAT_GRANDCHILD': generation = 3; radius = 16; break;
            default: generation = 1; radius = 8;
        }

        const jitterX = (pseudoRandom(member.id, 0) - 0.5) * 2;
        const jitterZ = (pseudoRandom(member.id, 1) - 0.5) * 2;
        const jitterY = (pseudoRandom(member.id, 2) - 0.5) * 1.5;

        positions.set(member.id, new THREE.Vector3(
            (radius * Math.cos(angle)) + jitterX,
            -(generation * generationHeight) + jitterY,
            (radius * Math.sin(angle)) + jitterZ
        ));
    });

    return positions;
};

// Photo Avatar Component
const PhotoAvatar = ({ url }: { url: string }) => {
    const texture = useLoader(TextureLoader, url);
    return (
        <mesh>
            <circleGeometry args={[0.8, 32]} />
            <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
        </mesh>
    );
};

// Initial Avatar Component
const InitialAvatar = ({ initial, color }: { initial: string, color: string }) => (
    <group>
        <mesh>
            <circleGeometry args={[0.8, 32]} />
            <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
        <Text position={[0, 0, 0.01]} fontSize={0.6} color="white" anchorX="center" anchorY="middle">
            {initial}
        </Text>
    </group>
);

// Member Node with Click and Highlight support
interface MemberNodeProps {
    position: THREE.Vector3;
    member: FamilyMember;
    color: string;
    onClick?: () => void;
    isHighlighted: boolean;
    isDimmed: boolean;
}

const MemberNode = ({ position, member, color, onClick, isHighlighted, isDimmed }: MemberNodeProps) => {
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.position.y = position.y + Math.sin(state.clock.elapsedTime * 0.5 + position.x) * 0.15;
        }
    });

    const initial = member.name.charAt(0).toUpperCase();
    const displayName = member.name.split(' ')[0];

    // Visual states
    const borderColor = hovered ? '#ffffff' : isHighlighted ? '#FFD700' : color;
    const scale = isHighlighted ? 1.2 : isDimmed ? 0.7 : 1;
    const opacity = isDimmed ? 0.4 : 1;

    return (
        <group ref={groupRef} position={position} scale={scale}>
            <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
                {/* Click area + border ring */}
                <mesh
                    onPointerOver={() => setHovered(true)}
                    onPointerOut={() => setHovered(false)}
                    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                >
                    <ringGeometry args={[0.75, 0.95, 32]} />
                    <meshBasicMaterial color={borderColor} side={THREE.DoubleSide} transparent opacity={opacity} />
                </mesh>

                {/* Avatar */}
                <Suspense fallback={<InitialAvatar initial={initial} color={color} />}>
                    <group>
                        <meshBasicMaterial transparent opacity={opacity} />
                        {member.photo ? (
                            <PhotoAvatar url={member.photo} />
                        ) : (
                            <InitialAvatar initial={initial} color={color} />
                        )}
                    </group>
                </Suspense>

                {/* Name label */}
                <Text
                    position={[0, -1.3, 0]}
                    fontSize={0.4}
                    color={isHighlighted ? '#FFD700' : '#F4E4BA'}
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.05}
                    outlineColor="#000000"
                >
                    {displayName}
                </Text>
            </Billboard>
        </group>
    );
};

// Connections with optional highlighting
interface ConnectionsProps {
    members: FamilyMember[];
    positions: Map<string, THREE.Vector3>;
    highlightedBranchId: string | null;
}

const Connections = ({ members, positions, highlightedBranchId }: ConnectionsProps) => {
    const lines = useMemo(() => {
        const result: { pts: THREE.Vector3[], highlighted: boolean }[] = [];
        members.forEach(member => {
            if (member.parentId && positions.has(member.id) && positions.has(member.parentId)) {
                const highlighted = highlightedBranchId ? member.branchId === highlightedBranchId : false;
                result.push({
                    pts: [positions.get(member.parentId)!, positions.get(member.id)!],
                    highlighted
                });
            }
        });
        return result;
    }, [members, positions, highlightedBranchId]);

    return (
        <group>
            {lines.map((line, i) => (
                <Line
                    key={i}
                    points={line.pts}
                    color={line.highlighted ? '#FFD700' : '#D4AF37'}
                    lineWidth={line.highlighted ? 3 : 1.5}
                    opacity={line.highlighted ? 0.9 : 0.4}
                    transparent
                />
            ))}
        </group>
    );
};

// Camera Reset Controller
const CameraController = ({ resetTrigger }: { resetTrigger: number }) => {
    const { camera } = useThree();
    const initialPosition = useRef(new THREE.Vector3(0, 5, 30));

    React.useEffect(() => {
        if (resetTrigger > 0) {
            camera.position.copy(initialPosition.current);
            camera.lookAt(0, 0, 0);
        }
    }, [resetTrigger, camera]);

    return null;
};

// Get unique branches for filter
const getBranches = (members: FamilyMember[]) => {
    const branchMap = new Map<string, { id: string, name: string, color: string }>();
    members.forEach(m => {
        if (m.branch && !branchMap.has(m.branch.id)) {
            branchMap.set(m.branch.id, { id: m.branch.id, name: m.branch.name, color: m.branch.color });
        }
    });
    return Array.from(branchMap.values());
};

// Main Component
export const ThreeDTree: React.FC<ThreeDTreeProps> = ({ members, onMemberClick }) => {
    const [contextLost, setContextLost] = useState(false);
    const [highlightedBranchId] = useState<string | null>(null);
    const [filterBranchId, setFilterBranchId] = useState<string | null>(null);
    const [resetTrigger, setResetTrigger] = useState(0);

    // Filter members by branch
    const filteredMembers = useMemo(() => {
        if (!filterBranchId) return members;
        return members.filter(m => m.branchId === filterBranchId);
    }, [members, filterBranchId]);

    const positions = useMemo(() => calculatePositions(filteredMembers), [filteredMembers]);
    const branches = useMemo(() => getBranches(members), [members]);

    const handleResetCamera = useCallback(() => {
        setResetTrigger(prev => prev + 1);
    }, []);

    return (
        <div style={{ width: '100%', height: '70vh', background: '#050510', borderRadius: '20px', overflow: 'hidden', position: 'relative' }}>
            {/* Control Panel */}
            <div className="tree-3d-controls">
                {/* Branch Filter */}
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

                {/* Reset Camera Button */}
                <button className="reset-camera-btn" onClick={handleResetCamera} title="Reiniciar vista">
                    🎯
                </button>
            </div>

            {/* Context Lost Overlay */}
            {contextLost && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', background: 'rgba(0,0,0,0.9)', zIndex: 10 }}>
                    <p>⚠️ El contexto 3D se perdió. Recarga la página.</p>
                </div>
            )}

            <Canvas
                camera={{ position: [0, 5, 30], fov: 50 }}
                gl={{ powerPreference: 'high-performance', antialias: true, preserveDrawingBuffer: true }}
                onCreated={({ gl }) => {
                    gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setContextLost(true); }, false);
                    gl.domElement.addEventListener('webglcontextrestored', () => setContextLost(false), false);
                }}
            >
                <color attach="background" args={['#050510']} />
                <fog attach="fog" args={['#050510', 15, 80]} />

                <ambientLight intensity={0.8} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#D4AF37" />
                <pointLight position={[-10, -5, -10]} intensity={0.8} color="#6366f1" />

                <Stars radius={120} depth={60} count={3000} factor={5} saturation={0} fade speed={0.8} />

                <CameraController resetTrigger={resetTrigger} />

                <Suspense fallback={null}>
                    <group position={[0, 0, 0]}>
                        {filteredMembers.map(member => {
                            const pos = positions.get(member.id);
                            if (!pos) return null;

                            // isFounder check available for future highlight on hover
                            const isHighlighted = highlightedBranchId === member.branchId;
                            const isDimmed = highlightedBranchId !== null && !isHighlighted;

                            return (
                                <MemberNode
                                    key={member.id}
                                    position={pos}
                                    member={member}
                                    color={member.preferredColor || member.branch?.color || '#D4AF37'}
                                    onClick={() => onMemberClick?.(member)}
                                    isHighlighted={isHighlighted}
                                    isDimmed={isDimmed}
                                />
                            );
                        })}
                        <Connections
                            members={filteredMembers}
                            positions={positions}
                            highlightedBranchId={highlightedBranchId}
                        />
                    </group>
                </Suspense>

                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    autoRotate={!highlightedBranchId}
                    autoRotateSpeed={0.3}
                    maxDistance={60}
                    minDistance={8}
                    maxPolarAngle={Math.PI * 0.85}
                    minPolarAngle={Math.PI * 0.15}
                />
            </Canvas>

            {/* Bottom Overlay */}
            <div className="tree-3d-overlay">
                <p>🖱️ Clic en avatar = Detalles • Arrastra = Girar • Rueda = Zoom</p>
            </div>
        </div>
    );
};
