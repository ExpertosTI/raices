import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../../components/FloatingDock';
import './CompassGame.css';

export const CompassGame = () => {
    const navigate = useNavigate();
    const [orientation, setOrientation] = useState(0);
    const [target, setTarget] = useState(0); // 0 = North
    const [score, setScore] = useState(0);
    const [permissionGranted, setPermissionGranted] = useState(false);

    useEffect(() => {
        setNewTarget();
        // @ts-ignore
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS requires permission
        } else {
            setPermissionGranted(true);
            window.addEventListener('deviceorientation', handleOrientation);
        }
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, []);

    const requestAccess = () => {
        // @ts-ignore
        DeviceOrientationEvent.requestPermission()
            .then((response: string) => {
                if (response === 'granted') {
                    setPermissionGranted(true);
                    window.addEventListener('deviceorientation', handleOrientation);
                }
            })
            .catch(console.error);
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
        if (e.alpha !== null) {
            // Android gives absolute (0=North), iOS webkitCompassHeading
            // @ts-ignore
            const heading = e.webkitCompassHeading || (360 - e.alpha);
            setOrientation(heading);
        }
    };

    const setNewTarget = () => {
        setTarget(Math.floor(Math.random() * 360));
    };

    const diff = Math.abs(orientation - target);
    const isAligned = diff < 10 || diff > 350;

    useEffect(() => {
        if (isAligned) {
            const timer = setTimeout(() => {
                setScore(s => s + 1);
                setNewTarget();
                if ('vibrate' in navigator) navigator.vibrate(50);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isAligned]);

    return (
        <div className="compass-screen">
            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/utilities')}>←</button>
                <h3>Apunta al Norte</h3>
            </header>

            {!permissionGranted && (
                <button className="start-btn" onClick={requestAccess}>
                    Permitir Sensores
                </button>
            )}

            <div className="compass-container">
                <div
                    className="compass-dial"
                    style={{ transform: `rotate(${-orientation}deg)` }}
                >
                    <div className="marker north">N</div>
                    <div className="marker east">E</div>
                    <div className="marker south">S</div>
                    <div className="marker west">W</div>
                </div>

                <div
                    className="target-needle"
                    style={{ transform: `rotate(${target - orientation}deg)`, opacity: isAligned ? 1 : 0.5 }}
                >
                    🎯
                </div>

                <div className="static-needle">⬆</div>
            </div>

            <div className="instructions">
                <h2>{score} Puntos</h2>
                <p>{isAligned ? "¡MANTENLO AHÍ!" : "Gira buscando el objetivo 🎯"}</p>
                <small>Rumbo actual: {Math.round(orientation)}°</small>
            </div>

            <FloatingDock />
        </div>
    );
};
