import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Stars, Line } from '@react-three/drei';
import * as THREE from 'three';
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
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

const pseudoRandom = (seed: string, index: number): number => {
    const hash = hashString(seed + index.toString());
    return (hash % 1000) / 1000; // Returns 0-1
};

// Helper to calculate 3D positions
const calculatePositions = (members: FamilyMember[]) => {
    const positions = new Map<string, THREE.Vector3>();
    const branchAngles = new Map<string, number>();

    // Get unique branches
    const branches = Array.from(new Set(members.map(m => m.branchId).filter(Boolean)));
    branches.forEach((branchId, index) => {
        // Distribute 12 branches in a circle
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
                radius = 3;
                break;
            case 'CHILD':
                generation = 1;
                radius = 6;
                break;
            case 'GRANDCHILD':
                generation = 2;
                radius = 9;
                break;
            case 'GREAT_GRANDCHILD':
                generation = 3;
                radius = 12;
                break;
            default:
                generation = 1;
                radius = 6;
        }

        // Deterministic jitter based on member ID (consistent across renders)
        const jitterX = (pseudoRandom(member.id, 0) - 0.5) * 1.5;
        const jitterZ = (pseudoRandom(member.id, 1) - 0.5) * 1.5;
        const jitterY = (pseudoRandom(member.id, 2) - 0.5) * 1;

        const x = (radius * Math.cos(angle)) + jitterX;
        const z = (radius * Math.sin(angle)) + jitterZ;
        const y = -(generation * generationHeight) + jitterY;

        positions.set(member.id, new THREE.Vector3(x, y, z));
    });

    return positions;
};

// Shared geometry to reduce GPU memory usage
const sphereGeo = new THREE.SphereGeometry(0.5, 32, 32);

const MemberNode = ({ position, member, color }: { position: THREE.Vector3, member: FamilyMember, color: string }) => {
    const [hovered, setHovered] = useState(false);
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current && hovered) {
            meshRef.current.rotation.y += 0.02;
            meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.1;
        }
    });

    const materialColor = hovered ? '#ffffff' : (member.preferredColor || color);
    const materialEmissive = hovered ? '#D4AF37' : '#000000';

    return (
        <group position={position}>
            <mesh
                ref={meshRef}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
                geometry={sphereGeo}
            >
                <meshStandardMaterial
                    color={materialColor}
                    emissive={materialEmissive}
                    roughness={0.3}
                    metalness={0.8}
                />
            </mesh>

            <Html distanceFactor={15}>
                <div className={`tree-label-3d ${hovered ? 'visible' : ''}`}>
                    <div className="label-content">
                        <strong>{member.name}</strong>
                    </div>
                </div>
            </Html>
        </group>
    );
};

const Connections = ({ members, positions }: { members: FamilyMember[], positions: Map<string, THREE.Vector3> }) => {
    const points = useMemo(() => {
        const pts: THREE.Vector3[][] = [];
        members.forEach(member => {
            if (member.parentId && positions.has(member.id) && positions.has(member.parentId)) {
                pts.push([positions.get(member.parentId)!, positions.get(member.id)!]);
            }
        });
        return pts;
    }, [members, positions])

    return (
        <group>
            {points.map((linePoints, i) => (
                <Line
                    key={i}
                    points={linePoints}
                    color="rgba(255,255,255,0.2)"
                    lineWidth={1}
                    transparent
                    opacity={0.3}
                />
            ))}
        </group>
    );
};


export const ThreeDTree: React.FC<ThreeDTreeProps> = ({ members }) => {
    const positions = useMemo(() => calculatePositions(members), [members]);

    // Handle context loss gracefully
    const [contextLost, setContextLost] = useState(false);

    return (
        <div style={{ width: '100%', height: '70vh', background: '#050510', borderRadius: '20px', overflow: 'hidden', position: 'relative' }}>
            {contextLost && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', background: 'rgba(0,0,0,0.8)', zIndex: 10 }}>
                    <p>⚠️ El contexto 3D se perdió. Recarga la página.</p>
                </div>
            )}
            <Canvas
                camera={{ position: [0, 10, 25], fov: 60 }}
                gl={{
                    powerPreference: 'high-performance',
                    antialias: true,
                    preserveDrawingBuffer: true
                }}
                onCreated={({ gl }) => {
                    gl.domElement.addEventListener('webglcontextlost', (e) => {
                        e.preventDefault();
                        setContextLost(true);
                        console.warn('WebGL Context Lost');
                    }, false);
                    gl.domElement.addEventListener('webglcontextrestored', () => {
                        setContextLost(false);
                        console.log('WebGL Context Restored');
                    }, false);
                }}
            >
                <color attach="background" args={['#050510']} />
                <fog attach="fog" args={['#050510', 10, 60]} />

                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#D4AF37" />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4c1d95" />

                <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />

                <group position={[0, 2, 0]}>
                    {members.map(member => {
                        const pos = positions.get(member.id);
                        if (!pos) return null;
                        return (
                            <MemberNode
                                key={member.id}
                                position={pos}
                                member={member}
                                color={member.preferredColor || '#D4AF37'}
                            />
                        );
                    })}
                    <Connections members={members} positions={positions} />
                </group>

                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    autoRotate={true}
                    autoRotateSpeed={0.5}
                    maxDistance={40}
                    minDistance={5}
                />
            </Canvas>
            <div className="tree-3d-overlay">
                <p>🖱️ Arrastra para girar • Rueda para zoom</p>
            </div>
        </div>
    );
};
