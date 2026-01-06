import { useState, useEffect } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { GrowingRoots } from './GrowingRoots';
import './LoginScreen.css';
import './EmailAuthScreen.css';

// Google Client ID - MUST match server configuration
const GOOGLE_CLIENT_ID = '609647959676-2jdrb9ursfnqi3uu6gmk2i6gj6ker42b.apps.googleusercontent.com';

export const LoginScreen = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const isNative = Capacitor.isNativePlatform();

    useEffect(() => {
        // Auto-redirect if already logged in
        if (localStorage.getItem('token')) {
            navigate('/app');
        }
    }, [navigate]);

    const handleGoogleSuccess = async (credentialResponse: any) => {
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

                if (!data.user.familyMember) {
                    navigate('/onboarding');
                } else {
                    navigate('/app');
                }
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

    // For native apps, we'll use email login primarily
    // Google Sign-In on native requires SHA-1 fingerprint configuration
    const renderNativeLogin = () => (
        <>
            <button
                className="email-auth-btn primary"
                onClick={() => navigate('/login-email')}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 7l-10 6L2 7" />
                </svg>
                Iniciar con Email
            </button>

            <div className="auth-divider">
                <span>o</span>
            </div>

            <button
                className="email-auth-btn secondary"
                onClick={() => navigate('/register-email')}
            >
                Crear cuenta nueva
            </button>
        </>
    );

    // For web, use Google OAuth + Email option
    const renderWebLogin = () => (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div className="google-btn-wrapper">
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Falló la conexión con Google.')}
                    theme="filled_black"
                    shape="pill"
                    text="continue_with"
                    width="250"
                />
            </div>

            <div className="auth-divider">
                <span>o</span>
            </div>

            <button
                className="email-auth-btn"
                onClick={() => navigate('/login-email')}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 7l-10 6L2 7" />
                </svg>
                Continuar con Email
            </button>
        </GoogleOAuthProvider>
    );

    return (
        <div className="login-screen">
            <GrowingRoots />

            <div className="login-card">
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
                        isNative ? renderNativeLogin() : renderWebLogin()
                    )}
                </div>

                {/* Utilidades públicas - sin login */}
                <div className="public-utilities">
                    <p>Explora sin iniciar sesión:</p>
                    <div className="utilities-buttons">
                        <button onClick={() => navigate('/utilities/domino')} className="utility-mini-btn">
                            <span>🁩</span>
                            <span>Dominó</span>
                        </button>
                        <button onClick={() => navigate('/utilities/basket')} className="utility-mini-btn">
                            <span>🏀</span>
                            <span>Basket</span>
                        </button>
                    </div>
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

