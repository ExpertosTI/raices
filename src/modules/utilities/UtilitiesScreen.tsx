import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../components/FloatingDock';
import './UtilitiesScreen.css';

// Diferentes fichas de dominó
const DOMINO_TILES = ['🁩', '🁫', '🁭', '🁮', '🁯', '🁰', '🁱'];

export const UtilitiesScreen = () => {
    const navigate = useNavigate();
    const [dominoIndex, setDominoIndex] = useState(0);

    // Cambiar ficha de dominó cada 2 segundos
    useEffect(() => {
        const interval = setInterval(() => {
            setDominoIndex(prev => (prev + 1) % DOMINO_TILES.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const utilities = [
        {
            id: 'who-is-who',
            icon: '🎮',
            iconClass: 'icon-gamepad',
            title: '¿Quién es Quién?',
            description: 'Adivina a tus familiares por su foto',
            color: '#8B5CF6',
            path: '/utilities/who-is-who'
        },
        {
            id: 'domino',
            icon: DOMINO_TILES[dominoIndex],
            iconClass: 'icon-domino',
            title: 'Dominó',
            description: 'Anota los puntos de la partida',
            color: '#059669',
            path: '/utilities/domino'
        },
        {
            id: 'basket',
            icon: '🏀',
            iconClass: 'icon-basket',
            title: 'Basket',
            description: 'Marcador para partidos',
            color: '#EA580C',
            path: '/utilities/basket'
        },
        {
            id: 'tictactoe',
            icon: '❌',
            iconClass: 'icon-tictactoe',
            title: 'Tateti Definitivo',
            description: '9 tableros en 1. Estrategia pura.',
            color: '#3B82F6',
            path: '/utilities/tictactoe'
        },
        {
            id: 'battleship',
            icon: '🚢',
            iconClass: 'icon-battleship',
            title: 'Batalla Naval',
            description: 'Hunde la flota enemiga. Pasar y Jugar.',
            color: '#0ea5e9',
            path: '/utilities/battleship'
        },
        {
            id: 'timeline',
            icon: '📅',
            iconClass: 'icon-timeline',
            title: 'Línea de Tiempo',
            description: 'Ordena los nacimientos cronológicamente.',
            color: '#dc2626',
            path: '/utilities/timeline'
        },
        {
            id: 'snake',
            icon: '🐍',
            iconClass: 'icon-snake',
            title: 'Snake Familiar',
            description: 'Come manzanas... ¡o primos!',
            color: '#22c55e',
            path: '/utilities/snake'
        },
        {
            id: 'space',
            icon: '👾',
            iconClass: 'icon-space',
            title: 'Space Cousins',
            description: 'Defiende la galaxia familiar.',
            color: '#8b5cf6',
            path: '/utilities/space-invaders'
        },
        {
            id: 'wordsearch',
            icon: '🔠',
            iconClass: 'icon-word',
            title: 'Sopa de Letras',
            description: 'Encuentra los nombres.',
            color: '#f59e0b',
            path: '/utilities/word-search'
        },
        {
            id: 'compass',
            icon: '🧭',
            iconClass: 'icon-compass',
            title: 'Apunta al Norte',
            description: 'Reto de orientación.',
            color: '#10b981',
            path: '/utilities/compass'
        },
        {
            id: 'blackjack',
            icon: '🃏',
            iconClass: 'icon-cards',
            title: 'BlackJack',
            description: 'Gana a la banca. Sin dinero real.',
            color: '#064e3b',
            path: '/utilities/blackjack'
        },
        {
            id: 'angelito',
            icon: '🎅',
            iconClass: 'icon-angelito',
            title: 'Angelito',
            description: 'Intercambio de regalos Secreto.',
            color: '#be123c',
            path: '/utilities/angelito'
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
                        <div className={`utility-icon ${util.iconClass}`}>{util.icon}</div>
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

