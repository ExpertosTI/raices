import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/FloatingDock.css';

interface DockItem {
    path: string;
    icon: string;
    label: string;
}

const DOCK_ITEMS: DockItem[] = [
    { path: '/app', icon: '🏠', label: 'Inicio' },
    { path: '/tree', icon: '🌳', label: 'Árbol' },
    { path: '/directory', icon: '📇', label: 'Directorio' },
    { path: '/events', icon: '📅', label: 'Eventos' },
    { path: '/feed', icon: '💬', label: 'Feed' }
];

// Paths where dock should be minimizable (games/utilities)
const MINIMIZABLE_PATHS = [
    '/utilities',
    '/utilities/'
];

interface FloatingDockProps {
    forceMinimized?: boolean;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({ forceMinimized }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [minimized, setMinimized] = useState(() => {
        const saved = localStorage.getItem('dock_minimized');
        return saved === 'true';
    });

    // Check if we're in a minimizable area
    const isMinimizableArea = MINIMIZABLE_PATHS.some(p => location.pathname.startsWith(p));
    const showMinimizeButton = isMinimizableArea;
    const isMinimized = forceMinimized !== undefined ? forceMinimized : (minimized && isMinimizableArea);

    const isActive = (path: string) => location.pathname === path;

    const toggleMinimize = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newState = !minimized;
        setMinimized(newState);
        localStorage.setItem('dock_minimized', String(newState));
    };

    // Drag Logic
    const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const dragStartRef = useRef<{ x: number, y: number } | null>(null);

    const onDown = (clientX: number, clientY: number) => {
        setIsPressed(true);
        setIsDragging(false);
        dragStartRef.current = { x: clientX, y: clientY };
    };

    useEffect(() => {
        if (!isPressed) return;

        const handleMove = (e: MouseEvent | TouchEvent) => {
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

            if (!dragStartRef.current) return;
            const dx = clientX - dragStartRef.current.x;
            const dy = clientY - dragStartRef.current.y;

            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                setIsDragging(true);
                const btn = document.getElementById('dock-expand-btn');
                if (btn) {
                    const rect = btn.getBoundingClientRect();
                    setPosition({
                        x: rect.left + dx,
                        y: rect.top + dy
                    });
                    dragStartRef.current = { x: clientX, y: clientY };
                }
            }
        };

        const handleEnd = () => {
            setIsPressed(false);
            dragStartRef.current = null;
            setTimeout(() => setIsDragging(false), 100);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchend', handleEnd);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isPressed]);

    if (isMinimized) {
        return (
            <button
                id="dock-expand-btn"
                className="dock-expand-btn"
                onClick={(e) => {
                    if (!isDragging) toggleMinimize(e);
                }}
                onMouseDown={(e) => onDown(e.clientX, e.clientY)}
                onTouchStart={(e) => onDown(e.touches[0].clientX, e.touches[0].clientY)}
                aria-label="Mostrar navegación"
                style={position ? { left: position.x, top: position.y, bottom: 'auto', transform: 'none' } : {}}
            >
                <span>☰</span>
            </button>
        );
    }

    return (
        <nav className={`floating-dock ${showMinimizeButton ? 'with-toggle' : ''}`} aria-label="Navegación principal">
            {showMinimizeButton && (
                <button
                    className="dock-minimize-btn"
                    onClick={toggleMinimize}
                    aria-label="Minimizar navegación"
                >
                    ✕
                </button>
            )}
            {DOCK_ITEMS.map((item) => (
                <button
                    key={item.path}
                    className={`dock-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => navigate(item.path)}
                    aria-label={item.label}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                >
                    <span className="dock-icon" aria-hidden="true">{item.icon}</span>
                    <span className="dock-label" aria-hidden="true">{item.label}</span>
                </button>
            ))}
        </nav>
    );
};
