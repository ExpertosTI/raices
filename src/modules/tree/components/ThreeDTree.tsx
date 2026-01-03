import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Stars, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { FamilyMember } from '../../../types';

interface ThreeDTreeProps {
    members: FamilyMember[];
}

// Helper to calculate 3D positions
const calculatePositions = (members: FamilyMember[]) => {
    const positions = new Map<string, THREE.Vector3>();
    const branchAngles = new Map<string, number>();

    // Find root (Grandparents/Patriarchs - usually earliest birth dates or no parents)
    // For this app, we know there are 12 main branches.
    // Let's group by branch.

    // Get unique branches
    const branches = Array.from(new Set(members.map(m => m.branchId).filter(Boolean)));
    branches.forEach((branchId, index) => {
        // Distribute 12 branches in a circle
        const angle = (index / branches.length) * Math.PI * 2;
        branchAngles.set(branchId!, angle);
    });

    const generationHeight = 4; // Height between generations
    // Unused baseRadius removed

    members.forEach(member => {
        const branchId = member.branchId;
        if (!branchId || !branchAngles.has(branchId)) {
            // Fallback for root or unknown
            positions.set(member.id, new THREE.Vector3(0, 5, 0));
            return;
        }

        const angle = branchAngles.get(branchId)!;

        // Estimate generation based on relation (simplified)
        let generation = 0;
        let radius = 0;

        switch (member.relation) {
            case 'SIBLING': // The original 12
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
            default: // Spouses, etc
                generation = 1; // Default
                radius = 6;
        }

        // Add some random jitter to avoid perfect overlaps
        const jitterX = (Math.random() - 0.5) * 1.5;
        const jitterZ = (Math.random() - 0.5) * 1.5;
        const jitterY = (Math.random() - 0.5) * 1;

        // Cylindrical to Cartesian
        // x = r * cos(theta)
        // z = r * sin(theta)
        // y = -generation * height

        const x = (radius * Math.cos(angle)) + jitterX;
        const z = (radius * Math.sin(angle)) + jitterZ;
        const y = -(generation * generationHeight) + jitterY;

        positions.set(member.id, new THREE.Vector3(x, y, z));
    });

    return positions;
};

const MemberNode = ({ position, member, color }: { position: THREE.Vector3, member: FamilyMember, color: string }) => {
    const [hovered, setHovered] = useState(false);
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current && hovered) {
            meshRef.current.rotation.y += 0.02;
            meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.1;
        }
    });

    return (
        <group position={position}>
            <mesh
                ref={meshRef}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshStandardMaterial
                    color={hovered ? '#ffffff' : (member.preferredColor || color)}
                    emissive={hovered ? '#D4AF37' : '#000000'}
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
    const points: THREE.Vector3[][] = [];

    members.forEach(member => {
        if (member.parentId && positions.has(member.id) && positions.has(member.parentId)) {
            points.push([positions.get(member.parentId)!, positions.get(member.id)!]);
        }
    });

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

    return (
        <div style={{ width: '100%', height: '70vh', background: '#050510', borderRadius: '20px', overflow: 'hidden' }}>
            <Canvas camera={{ position: [0, 10, 25], fov: 60 }}>
                <color attach="background" args={['#050510']} />
                <fog attach="fog" args={['#050510', 10, 50]} />

                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#D4AF37" />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4c1d95" />

                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

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
                />
            </Canvas>
            <div className="tree-3d-overlay">
                <p>🖱️ Arrastra para girar • Rueda para zoom</p>
            </div>
        </div>
    );
};
