import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { GrowingRoots } from './GrowingRoots';
import './LoginScreen.css';

export const LoginScreen = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (localStorage.getItem('token')) {
            navigate('/app');
        }
    }, [navigate]);

    const completeLogin = (data: any) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        if (!data.user.familyMember) {
            navigate('/onboarding');
        } else {
            navigate('/app');
        }
    };

    const handleGoogleSuccess = async (accessToken: string) => {
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken }),
            });

            if (res.ok) {
                const data = await res.json();
                completeLogin(data);
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

    const googleLogin = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            handleGoogleSuccess(tokenResponse.access_token);
        },
        onError: () => {
            setError('Falló la conexión con Google.');
        },
        flow: 'implicit',
    });

    return (
        <div className="login-screen">
            <GrowingRoots />

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
                        <div className="auth-buttons-column" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                            <button
                                onClick={() => googleLogin()}
                                className="google-login-btn"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    padding: '12px 24px',
                                    backgroundColor: '#1a1a2e',
                                    border: '1px solid rgba(212, 175, 55, 0.3)',
                                    borderRadius: '50px',
                                    color: '#fff',
                                    fontSize: '16px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    minWidth: '280px',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Continuar con Google
                            </button>
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

