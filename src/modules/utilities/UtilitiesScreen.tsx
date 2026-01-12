import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../components/FloatingDock';
import { soundManager } from '../../utils/SoundManager';
import './UtilitiesScreen.css';

// Domino tiles animation
const DOMINO_TILES = ['🁩', '🁫', '🁭', '🁮', '🁯', '🁰', '🁱'];

// Game categories
type GameCategory = 'all' | 'arcade' | 'board' | 'family' | 'score';

interface GameItem {
    id: string;
    icon: string | (() => string);
    iconClass: string;
    title: string;
    description: string;
    color: string;
    path: string;
    category: GameCategory;
    requiresAuth?: boolean;
}

export const UtilitiesScreen = () => {
    const navigate = useNavigate();
    const [dominoIndex, setDominoIndex] = useState(0);
    const [activeCategory, setActiveCategory] = useState<GameCategory>('all');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [highScores, setHighScores] = useState<Record<string, number>>({});
    const [showSettings, setShowSettings] = useState(false);
    const [volume, setVolume] = useState(soundManager.volume);
    const [muted, setMuted] = useState(soundManager.muted);

    // Load favorites and high scores
    useEffect(() => {
        const savedFavorites = localStorage.getItem('game_favorites');
        const savedScores = localStorage.getItem('game_high_scores');
        if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
        if (savedScores) setHighScores(JSON.parse(savedScores));
    }, []);

    // Animate domino tile
    useEffect(() => {
        const interval = setInterval(() => {
            setDominoIndex(prev => (prev + 1) % DOMINO_TILES.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const toggleFavorite = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        soundManager.playClick();
        const newFavorites = favorites.includes(id)
            ? favorites.filter(f => f !== id)
            : [...favorites, id];
        setFavorites(newFavorites);
        localStorage.setItem('game_favorites', JSON.stringify(newFavorites));
    };

    const handleVolumeChange = (value: number) => {
        setVolume(value);
        soundManager.volume = value;
        soundManager.playClick();
    };

    const handleMuteToggle = () => {
        const newMuted = soundManager.toggleMute();
        setMuted(newMuted);
    };

    const categories: { id: GameCategory; label: string; icon: string }[] = [
        { id: 'all', label: 'Todos', icon: '🎮' },
        { id: 'arcade', label: 'Arcade', icon: '👾' },
        { id: 'board', label: 'Mesa', icon: '🎲' },
        { id: 'family', label: 'Familiar', icon: '👨‍👩‍👧‍👦' },
        { id: 'score', label: 'Marcador', icon: '📊' },
    ];

    const utilities: GameItem[] = [
        {
            id: 'who-is-who',
            icon: '🎮',
            iconClass: 'icon-gamepad',
            title: '¿Quién es Quién?',
            description: 'Adivina a tus familiares por su foto',
            color: '#8B5CF6',
            path: '/utilities/who-is-who',
            category: 'family',
            requiresAuth: true
        },
        {
            id: 'domino',
            icon: () => DOMINO_TILES[dominoIndex],
            iconClass: 'icon-domino',
            title: 'Dominó',
            description: 'Anota los puntos de la partida',
            color: '#059669',
            path: '/utilities/domino',
            category: 'score'
        },
        {
            id: 'basket',
            icon: '🏀',
            iconClass: 'icon-basket',
            title: 'Basket',
            description: 'Marcador para partidos',
            color: '#EA580C',
            path: '/utilities/basket',
            category: 'score'
        },
        {
            id: 'tictactoe',
            icon: '❌',
            iconClass: 'icon-tictactoe',
            title: 'Tateti Definitivo',
            description: '9 tableros en 1. Estrategia pura.',
            color: '#3B82F6',
            path: '/utilities/tictactoe',
            category: 'board'
        },
        {
            id: 'battleship',
            icon: '🚢',
            iconClass: 'icon-battleship',
            title: 'Batalla Naval',
            description: 'Hunde la flota enemiga. Pasar y Jugar.',
            color: '#0ea5e9',
            path: '/utilities/battleship',
            category: 'board'
        },
        {
            id: 'timeline',
            icon: '📅',
            iconClass: 'icon-timeline',
            title: 'Línea de Tiempo',
            description: 'Ordena los nacimientos cronológicamente.',
            color: '#dc2626',
            path: '/utilities/timeline',
            category: 'family',
            requiresAuth: true
        },
        {
            id: 'snake',
            icon: '🐍',
            iconClass: 'icon-snake',
            title: 'Snake Familiar',
            description: 'Come manzanas... ¡o primos!',
            color: '#22c55e',
            path: '/utilities/snake',
            category: 'arcade'
        },
        {
            id: 'space',
            icon: '👾',
            iconClass: 'icon-space',
            title: 'Space Cousins',
            description: 'Defiende la galaxia familiar.',
            color: '#8b5cf6',
            path: '/utilities/space-invaders',
            category: 'arcade'
        },
        {
            id: 'wordsearch',
            icon: '🔠',
            iconClass: 'icon-word',
            title: 'Sopa de Letras',
            description: 'Encuentra los nombres.',
            color: '#f59e0b',
            path: '/utilities/word-search',
            category: 'family'
        },
        {
            id: 'compass',
            icon: '🧭',
            iconClass: 'icon-compass',
            title: 'Apunta al Norte',
            description: 'Reto de orientación.',
            color: '#10b981',
            path: '/utilities/compass',
            category: 'arcade'
        },
        {
            id: 'blackjack',
            icon: '🃏',
            iconClass: 'icon-cards',
            title: 'BlackJack Online',
            description: 'Juega con amigos. Mesas compartidas.',
            color: '#064e3b',
            path: '/utilities/blackjack',
            category: 'board'
        },
        {
            id: 'angelito',
            icon: '🎅',
            iconClass: 'icon-angelito',
            title: 'Angelito',
            description: 'Intercambio de regalos Secreto.',
            color: '#be123c',
            path: '/utilities/angelito',
            category: 'family',
            requiresAuth: true
        },
        {
            id: 'impostor',
            icon: '🕵️',
            iconClass: 'icon-spy',
            title: 'El Impostor',
            description: 'Descubre al intruso.',
            color: '#ef4444',
            path: '/utilities/impostor',
            category: 'arcade'
        },
        {
            id: 'mafia',
            icon: '🔪',
            iconClass: 'icon-knife',
            title: 'El Asesino',
            description: 'Juego de roles ocultos.',
            color: '#111827',
            path: '/utilities/mafia',
            category: 'arcade'
        },
        {
            id: 'basta',
            icon: '🛑',
            iconClass: 'icon-hand',
            title: '¡Basta!',
            description: 'Juego de palabras rápido.',
            color: '#ec4899',
            path: '/utilities/basta',
            category: 'board'
        }
    ];

    // Filter and sort games
    const filteredGames = utilities
        .filter(game => activeCategory === 'all' || game.category === activeCategory)
        .sort((a, b) => {
            // Favorites first
            const aFav = favorites.includes(a.id) ? -1 : 0;
            const bFav = favorites.includes(b.id) ? -1 : 0;
            return aFav - bFav;
        });

    const handleGameClick = (game: GameItem) => {
        soundManager.playClick();
        soundManager.vibrate(30);
        navigate(game.path);
    };

    return (
        <div className="utilities-screen">
            <header className="utilities-header">
                <button className="back-btn" onClick={() => navigate('/app')}>
                    ← Volver
                </button>
                <h1>🎮 Juegos y Utilidades</h1>
                <button
                    className={`settings-btn ${showSettings ? 'active' : ''}`}
                    onClick={() => setShowSettings(!showSettings)}
                    title="Configuración de sonido"
                >
                    {muted ? '🔇' : '🔊'}
                </button>
            </header>

            {/* Volume Control Panel */}
            {showSettings && (
                <div className="settings-panel">
                    <div className="volume-control">
                        <button
                            className={`mute-btn ${muted ? 'muted' : ''}`}
                            onClick={handleMuteToggle}
                        >
                            {muted ? '🔇' : '🔊'}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={volume}
                            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                            disabled={muted}
                            className="volume-slider"
                        />
                        <span className="volume-label">{Math.round(volume * 100)}%</span>
                    </div>
                </div>
            )}

            {/* Category Tabs */}
            <div className="category-tabs">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
                        onClick={() => {
                            setActiveCategory(cat.id);
                            soundManager.playClick();
                        }}
                    >
                        <span className="cat-icon">{cat.icon}</span>
                        <span className="cat-label">{cat.label}</span>
                    </button>
                ))}
            </div>

            {/* Games Grid */}
            <div className="utilities-grid">
                {filteredGames.map(util => (
                    <div
                        key={util.id}
                        className={`utility-card ${util.requiresAuth ? 'requires-auth' : ''}`}
                        style={{ '--accent-color': util.color } as React.CSSProperties}
                        onClick={() => handleGameClick(util)}
                    >
                        {/* Favorite Button */}
                        <button
                            className={`favorite-btn ${favorites.includes(util.id) ? 'favorited' : ''}`}
                            onClick={(e) => toggleFavorite(util.id, e)}
                            title={favorites.includes(util.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        >
                            {favorites.includes(util.id) ? '⭐' : '☆'}
                        </button>

                        {/* High Score Badge */}
                        {highScores[util.id] && (
                            <div className="high-score-badge">
                                🏆 {highScores[util.id]}
                            </div>
                        )}

                        <div className={`utility-icon ${util.iconClass}`}>
                            {typeof util.icon === 'function' ? util.icon() : util.icon}
                        </div>
                        <h3>{util.title}</h3>
                        <p>{util.description}</p>

                        {/* Category badge */}
                        <div className="category-badge" style={{ background: util.color }}>
                            {categories.find(c => c.id === util.category)?.icon}
                        </div>

                        <div className="utility-arrow">→</div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {filteredGames.length === 0 && (
                <div className="empty-state">
                    <span className="empty-icon">🎲</span>
                    <p>No hay juegos en esta categoría</p>
                </div>
            )}

            <FloatingDock />
        </div>
    );
};
