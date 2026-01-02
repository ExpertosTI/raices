import { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import './LoginScreen.css';

export const LoginScreen = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Auto-redirect if already logged in
        if (localStorage.getItem('token')) {
            navigate('/app');
        }
    }, [navigate]);

    const handleSuccess = async (credentialResponse: any) => {
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: credentialResponse.credential }),
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/app');
            } else {
                const errData = await res.json();
                setError(errData.error || 'No pudimos verificar tu cuenta. Intenta de nuevo.');
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Error logging in:', error);
            setError('Error de conexión. Verifica tu internet.');
            setIsLoading(false);
        }
    };

    return (
        <div className="login-screen">
            <div className="login-particles"></div>

            <div className="login-card">
                {/* Reusing SVG Logo Concept */}
                <div className="logo-container">
                    <svg className="login-logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M50 90C50 90 55 80 55 70C55 55 70 50 80 40C85 35 80 20 70 25C65 27.5 65 35 60 40C60 40 65 25 55 15C50 10 45 15 45 20C45 20 40 10 30 15C20 20 25 35 30 40C30 40 20 30 15 40C10 50 25 55 35 60C35 60 45 65 45 70C45 80 50 90 50 90Z"
                            stroke="#D4AF37"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>

                <h1>Bienvenido</h1>
                <p className="login-subtitle">
                    Inicia sesión para reconectar con tus raíces<br />
                    y descubrir la historia de la Familia Henríquez Cruz.
                </p>

                {error && (
                    <div className="login-error">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <div className="auth-container">
                    {isLoading ? (
                        <div className="login-loader">Verificando credenciales...</div>
                    ) : (
                        <div className="google-btn-wrapper">
                            <GoogleLogin
                                onSuccess={handleSuccess}
                                onError={() => setError('Falló la conexión con Google.')}
                                theme="filled_black"
                                shape="pill"
                                text="continue_with"
                                width="250"
                            />
                        </div>
                    )}
                </div>

                <div className="login-footer">
                    <a href="/privacy">Privacidad</a>
                    <span>•</span>
                    <a href="/terms">Términos</a>
                    <span>•</span>
                    <a href="/help">Ayuda</a>
                </div>
            </div>
        </div>
    );
};
