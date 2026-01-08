import { useState, useEffect, useCallback } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { GrowingRoots } from './GrowingRoots';
import './LoginScreen.css';
import './EmailAuthScreen.css';

// Google Client ID - MUST match server configuration
const GOOGLE_CLIENT_ID = '609647959676-2jdrb9ursfnqi3uu6gmk2i6gj6ker42b.apps.googleusercontent.com';

// Facebook App ID from Meta Console
const FACEBOOK_APP_ID = '1216780823884014';

// Initialize Facebook SDK
declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
    }
}

export const LoginScreen = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [fbReady, setFbReady] = useState(false);

    // Initialize Facebook SDK
    useEffect(() => {
        // Auto-redirect if already logged in
        if (localStorage.getItem('token')) {
            navigate('/app');
            return;
        }

        // Load Facebook SDK
        if (!window.FB) {
            window.fbAsyncInit = function () {
                window.FB.init({
                    appId: FACEBOOK_APP_ID,
                    cookie: true,
                    xfbml: true,
                    version: 'v18.0'
                });
                setFbReady(true);
            };

            // Load the SDK asynchronously
            const script = document.createElement('script');
            script.src = 'https://connect.facebook.net/es_LA/sdk.js';
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);
        } else {
            setFbReady(true);
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

    const handleFacebookLogin = useCallback(() => {
        if (!window.FB) {
            setError('Facebook SDK no cargado. Recarga la página.');
            return;
        }

        setIsLoading(true);
        setError('');

        window.FB.login((response: any) => {
            if (response.authResponse) {
                // Handle async logic inside a separate function
                const handleFbResponse = async () => {
                    try {
                        const res = await fetch('/api/auth/facebook', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                accessToken: response.authResponse.accessToken,
                                userID: response.authResponse.userID
                            }),
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
                            setError(errData.error || 'Error al verificar con Facebook.');
                            setIsLoading(false);
                        }
                    } catch (error) {
                        console.error('Error with Facebook login:', error);
                        setError('Error de conexión.');
                        setIsLoading(false);
                    }
                };
                handleFbResponse();
            } else {
                setIsLoading(false);
            }
        }, { scope: 'email,public_profile' });
    }, [navigate]);

    // Unified Authentication Options (Google + Facebook + Email)
    const renderAuthOptions = () => (
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

            {/* Facebook Login Button */}
            <button
                className="facebook-login-btn"
                onClick={handleFacebookLogin}
                disabled={!fbReady || isLoading}
            >
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Continuar con Facebook
            </button>

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
                    <h1 className="app-title" style={{
                        fontSize: '2.5rem',
                        fontWeight: '700',
                        color: '#D4AF37',
                        margin: '0.5rem 0 0.25rem 0',
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}>Raíces</h1>
                    <p className="app-slogan" style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '0.95rem',
                        margin: '0 0 1rem 0',
                        fontStyle: 'italic'
                    }}>Conectando generaciones, preservando memorias</p>
                </div>

                {error && (
                    <div className="login-error">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <div className="auth-container">
                    {isLoading ? (
                        <div className="login-loader">Verificando credenciales...</div>
                    ) : (
                        renderAuthOptions()
                    )}
                </div>

                <div className="login-footer">
                    <button
                        onClick={() => navigate('/utilities')}
                        className="explore-btn"
                        style={{
                            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))',
                            border: '2px solid rgba(212, 175, 55, 0.6)',
                            color: '#D4AF37',
                            padding: '12px 24px',
                            borderRadius: '30px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            marginBottom: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            justifyContent: 'center',
                            width: '100%',
                            maxWidth: '280px',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.15)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.4), rgba(212, 175, 55, 0.2))';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(212, 175, 55, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(212, 175, 55, 0.15)';
                        }}
                    >
                        🎮 Solo quiero jugar
                    </button>
                    <div className="legal-links">
                        <a href="/privacy">Privacidad</a>
                        <span>•</span>
                        <a href="/terms">Términos</a>
                        <span>•</span>
                        <a href="/help">Ayuda</a>
                    </div>
                </div>
            </div>
        </div>
    );
};
