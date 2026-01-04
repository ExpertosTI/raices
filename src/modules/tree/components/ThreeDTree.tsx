import React, { useMemo, useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Billboard, Text, Stars, Line } from '@react-three/drei';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import type { FamilyMember } from '../../../types';

interface ThreeDTreeProps {
    members: FamilyMember[];
}

// Helper to create deterministic "random" value from string (hash-based)
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

// Helper to calculate 3D positions in a galaxy-like arrangement
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
            case 'SIBLING':
                generation = 0;
                radius = 4;
                break;
            case 'CHILD':
                generation = 1;
                radius = 8;
                break;
            case 'GRANDCHILD':
                generation = 2;
                radius = 12;
                break;
            case 'GREAT_GRANDCHILD':
                generation = 3;
                radius = 16;
                break;
            default:
                generation = 1;
                radius = 8;
        }

        const jitterX = (pseudoRandom(member.id, 0) - 0.5) * 2;
        const jitterZ = (pseudoRandom(member.id, 1) - 0.5) * 2;
        const jitterY = (pseudoRandom(member.id, 2) - 0.5) * 1.5;

        const x = (radius * Math.cos(angle)) + jitterX;
        const z = (radius * Math.sin(angle)) + jitterZ;
        const y = -(generation * generationHeight) + jitterY;

        positions.set(member.id, new THREE.Vector3(x, y, z));
    });

    return positions;
};

// Avatar with photo texture loaded dynamically
const PhotoAvatar = ({ url }: { url: string }) => {
    const texture = useLoader(TextureLoader, url);
    return (
        <mesh>
            <circleGeometry args={[0.8, 32]} />
            <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
        </mesh>
    );
};

// Fallback avatar with initial letter
const InitialAvatar = ({ initial, color }: { initial: string, color: string }) => {
    return (
        <group>
            <mesh>
                <circleGeometry args={[0.8, 32]} />
                <meshBasicMaterial color={color} side={THREE.DoubleSide} />
            </mesh>
            <Text
                position={[0, 0, 0.01]}
                fontSize={0.6}
                color="white"
                anchorX="center"
                anchorY="middle"
                font="/fonts/Inter-Bold.woff"
            >
                {initial}
            </Text>
        </group>
    );
};

// Member Node using Billboard (always faces camera)
const MemberNode = ({ position, member, color }: { position: THREE.Vector3, member: FamilyMember, color: string }) => {
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.position.y = position.y + Math.sin(state.clock.elapsedTime * 0.5 + position.x) * 0.15;
        }
    });

    const initial = member.name.charAt(0).toUpperCase();
    const displayName = member.name.split(' ')[0];
    const borderColor = hovered ? '#ffffff' : color;

    return (
        <group ref={groupRef} position={position}>
            <Billboard
                follow={true}
                lockX={false}
                lockY={false}
                lockZ={false}
            >
                {/* Outer ring for border effect */}
                <mesh
                    onPointerOver={() => setHovered(true)}
                    onPointerOut={() => setHovered(false)}
                >
                    <ringGeometry args={[0.75, 0.9, 32]} />
                    <meshBasicMaterial color={borderColor} side={THREE.DoubleSide} />
                </mesh>

                {/* Avatar content */}
                <Suspense fallback={<InitialAvatar initial={initial} color={color} />}>
                    {member.photo ? (
                        <PhotoAvatar url={member.photo} />
                    ) : (
                        <InitialAvatar initial={initial} color={color} />
                    )}
                </Suspense>

                {/* Name label below avatar */}
                <Text
                    position={[0, -1.3, 0]}
                    fontSize={0.4}
                    color="#F4E4BA"
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

// Connection lines between members
const Connections = ({ members, positions }: { members: FamilyMember[], positions: Map<string, THREE.Vector3> }) => {
    const lines = useMemo(() => {
        const result: THREE.Vector3[][] = [];
        members.forEach(member => {
            if (member.parentId && positions.has(member.id) && positions.has(member.parentId)) {
                result.push([positions.get(member.parentId)!, positions.get(member.id)!]);
            }
        });
        return result;
    }, [members, positions]);

    return (
        <group>
            {lines.map((pts, i) => (
                <Line
                    key={i}
                    points={pts}
                    color="#D4AF37"
                    lineWidth={1.5}
                    opacity={0.4}
                    transparent
                />
            ))}
        </group>
    );
};

export const ThreeDTree: React.FC<ThreeDTreeProps> = ({ members }) => {
    const positions = useMemo(() => calculatePositions(members), [members]);
    const [contextLost, setContextLost] = useState(false);

    return (
        <div style={{ width: '100%', height: '70vh', background: '#050510', borderRadius: '20px', overflow: 'hidden', position: 'relative' }}>
            {contextLost && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', background: 'rgba(0,0,0,0.9)', zIndex: 10 }}>
                    <p>⚠️ El contexto 3D se perdió. Recarga la página.</p>
                </div>
            )}
            <Canvas
                camera={{ position: [0, 5, 30], fov: 50 }}
                gl={{
                    powerPreference: 'high-performance',
                    antialias: true,
                    preserveDrawingBuffer: true
                }}
                onCreated={({ gl }) => {
                    gl.domElement.addEventListener('webglcontextlost', (e) => {
                        e.preventDefault();
                        setContextLost(true);
                    }, false);
                    gl.domElement.addEventListener('webglcontextrestored', () => {
                        setContextLost(false);
                    }, false);
                }}
            >
                <color attach="background" args={['#050510']} />
                <fog attach="fog" args={['#050510', 15, 80]} />

                <ambientLight intensity={0.8} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#D4AF37" />
                <pointLight position={[-10, -5, -10]} intensity={0.8} color="#6366f1" />

                <Stars radius={120} depth={60} count={3000} factor={5} saturation={0} fade speed={0.8} />

                <Suspense fallback={null}>
                    <group position={[0, 0, 0]}>
                        {members.map(member => {
                            const pos = positions.get(member.id);
                            if (!pos) return null;
                            return (
                                <MemberNode
                                    key={member.id}
                                    position={pos}
                                    member={member}
                                    color={member.preferredColor || member.branch?.color || '#D4AF37'}
                                />
                            );
                        })}
                        <Connections members={members} positions={positions} />
                    </group>
                </Suspense>

                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    autoRotate={true}
                    autoRotateSpeed={0.3}
                    maxDistance={60}
                    minDistance={8}
                    maxPolarAngle={Math.PI * 0.85}
                    minPolarAngle={Math.PI * 0.15}
                />
            </Canvas>
            <div className="tree-3d-overlay">
                <p>🖱️ Arrastra para girar • Rueda para zoom</p>
            </div>
        </div>
    );
};
