import React, { useState } from 'react';
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

    if (isMinimized) {
        return (
            <button
                className="dock-expand-btn"
                onClick={toggleMinimize}
                aria-label="Mostrar navegación"
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
