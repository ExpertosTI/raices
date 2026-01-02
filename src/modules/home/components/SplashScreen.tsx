import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SplashScreen.css';

export const SplashScreen: React.FC = () => {
    const navigate = useNavigate();
    const [isExiting, setIsExiting] = useState(false);

    const handleEnter = () => {
        setIsExiting(true);
        setTimeout(() => {
            navigate('/select');
        }, 800);
    };

    return (
        <div className={`splash-screen ${isExiting ? 'hidden' : ''}`}>
            {/* Animated Tree */}
            <div className="splash-tree">🌳</div>

            {/* Title */}
            <h1 className="splash-title">Raíces</h1>
            <p className="splash-subtitle">Familia Henríquez Cruz</p>

            {/* Warning Card */}
            <div className="splash-warning">
                <div className="warning-icon">⚠️</div>
                <h3 className="warning-title">PROYECTO AMBICIOSO</h3>
                <p className="warning-text">NO queremos ideas vagas.</p>
                <p className="warning-details">
                    Si deseas aportar, hazlo con <strong>datos específicos, detallados y coherentes</strong>:
                    fechas, lugares, fotos digitalizadas, historias documentadas, o contribuciones técnicas reales.
                </p>
            </div>

            {/* Enter Button */}
            <button className="splash-enter-btn" onClick={handleEnter}>
                Explorar mi Legado
            </button>
        </div>
    );
};
