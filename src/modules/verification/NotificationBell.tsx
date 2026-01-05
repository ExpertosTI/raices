import React from 'react';
import { Bell } from 'lucide-react';

interface NotificationBellProps {
    count: number;
    onClick: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ count, onClick }) => {
    return (
        <button
            className="notification-bell"
            onClick={onClick}
            aria-label={`Notificaciones ${count > 0 ? `(${count} nuevas)` : ''}`}
            style={{
                position: 'relative',
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <Bell size={24} color={count > 0 ? '#D4AF37' : 'rgba(255,255,255,0.7)'} />

            {count > 0 && (
                <span
                    style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: '#ef5350',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        minWidth: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2px'
                    }}
                >
                    {count > 9 ? '9+' : count}
                </span>
            )}
        </button>
    );
};
