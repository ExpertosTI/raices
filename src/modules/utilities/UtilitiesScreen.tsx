import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../components/FloatingDock';
import './UtilitiesScreen.css';

export const UtilitiesScreen = () => {
    const navigate = useNavigate();

    const utilities = [
        {
            id: 'who-is-who',
            icon: '🎮',
            title: '¿Quién es Quién?',
            description: 'Adivina a tus familiares por su foto',
            color: '#8B5CF6',
            path: '/utilities/who-is-who'
        },
        {
            id: 'domino',
            icon: '🁩',
            title: 'Dominó',
            description: 'Anota los puntos de la partida',
            color: '#059669',
            path: '/utilities/domino'
        },
        {
            id: 'basket',
            icon: '🏀',
            title: 'Basket',
            description: 'Marcador para partidos',
            color: '#EA580C',
            path: '/utilities/basket'
        }
    ];

    return (
        <div className="utilities-screen">
            <header className="utilities-header">
                <button className="back-btn" onClick={() => navigate('/app')}>
                    ← Volver
                </button>
                <h1>🧰 Utilidades</h1>
            </header>

            <div className="utilities-grid">
                {utilities.map(util => (
                    <div
                        key={util.id}
                        className="utility-card"
                        style={{ '--accent-color': util.color } as React.CSSProperties}
                        onClick={() => navigate(util.path)}
                    >
                        <div className="utility-icon">{util.icon}</div>
                        <h3>{util.title}</h3>
                        <p>{util.description}</p>
                        <div className="utility-arrow">→</div>
                    </div>
                ))}
            </div>

            <FloatingDock />
        </div>
    );
};
