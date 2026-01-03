import React, { useEffect, useRef } from 'react';
import './GrowingRoots.css';

export const GrowingRoots: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;
        // Randomize slight variations if needed, or just CSS anims
    }, []);

    // Complex root paths
    // Starting from bottom center (50% 100%)
    const rootPaths = [
        "M50 100 C 50 80, 45 70, 40 60 C 35 50, 20 55, 10 40", // Left branch
        "M50 100 C 50 80, 55 70, 60 60 C 65 50, 80 55, 90 40", // Right branch
        "M50 100 C 50 70, 50 60, 50 40 C 50 20, 40 10, 50 0",   // Center tall
        "M40 60 C 30 50, 40 40, 30 30", // Sub-branch left
        "M60 60 C 70 50, 60 40, 70 30", // Sub-branch right
        "M50 100 Q 20 90 10 70", // Low left
        "M50 100 Q 80 90 90 70", // Low right
    ];

    return (
        <div className="roots-container">
            <svg
                className="roots-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                ref={svgRef}
            >
                <defs>
                    <linearGradient id="goldGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#8B6914" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#F4E4BA" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {rootPaths.map((d, i) => (
                    <path
                        key={i}
                        d={d}
                        className="root-path"
                        stroke="url(#goldGradient)"
                        strokeWidth="0.5"
                        fill="none"
                        style={{ animationDelay: `${i * 0.2}s` }}
                    />
                ))}
            </svg>
        </div>
    );
};
