import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SplashScreen.css';

export const SplashScreen: React.FC = () => {
    const navigate = useNavigate();
    const [isExiting, setIsExiting] = useState(false);

    const handleEnter = () => {
        setIsExiting(true);
        setTimeout(() => {
            navigate('/login');
        }, 800);
    };

    return (
        <div className={`splash-screen ${isExiting ? 'hidden' : ''}`}>
            {/* Background Particles (Simple CSS implementation via class) */}
            <div className="particles"></div>

            {/* Animated SVG Tree */}
            <div className="logo-container">
                <svg className="splash-logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        className="tree-path"
                        d="M50 90C50 90 55 80 55 70C55 55 70 50 80 40C85 35 80 20 70 25C65 27.5 65 35 60 40C60 40 65 25 55 15C50 10 45 15 45 20C45 20 40 10 30 15C20 20 25 35 30 40C30 40 20 30 15 40C10 50 25 55 35 60C35 60 45 65 45 70C45 80 50 90 50 90Z"
                        stroke="#D4AF37"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        className="tree-path-inner"
                        d="M50 90V70M50 70L35 60M50 70L60 60M55 55L50 40M60 40L65 30M40 45L35 35"
                        stroke="#D4AF37"
                        strokeWidth="1"
                        strokeLinecap="round"
                        opacity="0.6"
                    />
                </svg>
            </div>

            {/* Title with Fade Up */}
            <div className="title-container">
                <h1 className="splash-title">
                    <span style={{ animationDelay: '0.1s' }}>R</span>
                    <span style={{ animationDelay: '0.2s' }}>a</span>
                    <span style={{ animationDelay: '0.3s' }}>í</span>
                    <span style={{ animationDelay: '0.4s' }}>c</span>
                    <span style={{ animationDelay: '0.5s' }}>e</span>
                    <span style={{ animationDelay: '0.6s' }}>s</span>
                </h1>
                <p className="splash-subtitle">Familia Henríquez Cruz</p>
            </div>

            {/* Premium Warning Card (Glassmorphism) */}
            <div className="splash-warning glass-card">
                <div className="warning-header">
                    <span className="warning-icon-glow">⚠️</span>
                    <h3 className="warning-title">Proyecto Ambicioso</h3>
                </div>
                <div className="warning-content">
                    <p className="warning-text">Buscamos excelencia, no ideas vagas.</p>
                    <p className="warning-details">
                        Aporta con <strong>datos específicos</strong>, historias documentadas y contribuciones reales.
                    </p>
                </div>
            </div>

            {/* Shine Button */}
            <button className="splash-enter-btn shine-effect" onClick={handleEnter}>
                <span className="btn-text">Explorar mi Legado</span>
            </button>
        </div>
    );
};
