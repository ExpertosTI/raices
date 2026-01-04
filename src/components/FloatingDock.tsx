import React from 'react';
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

export const FloatingDock: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className="floating-dock" aria-label="Navegación principal">
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
