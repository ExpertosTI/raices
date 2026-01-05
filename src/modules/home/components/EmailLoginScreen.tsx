import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GrowingRoots } from './GrowingRoots';
import './LoginScreen.css';
import './EmailAuthScreen.css';

export const EmailLoginScreen = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Email y contraseña son requeridos');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/login-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                if (!data.user.familyMember) {
                    navigate('/onboarding');
                } else {
                    navigate('/app');
                }
            } else if (res.status === 403 && data.requiresVerification) {
                // Redirect to verification
                navigate('/verify-email', { state: { email } });
            } else {
                setError(data.error || 'Error al iniciar sesión');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Error de conexión. Verifica tu internet.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-screen">
            <GrowingRoots />

            <div className="login-card email-auth-card">
                <button className="back-btn" onClick={() => navigate('/login')}>
                    ← Volver
                </button>

                <h1>Iniciar Sesión</h1>
                <p className="login-subtitle">
                    Ingresa con tu email y contraseña
                </p>

                {error && (
                    <div className="login-error">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="email-auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@email.com"
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Contraseña</label>
                        <div className="password-input">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Tu contraseña"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    <Link to="/forgot-password" className="forgot-link">
                        ¿Olvidaste tu contraseña?
                    </Link>

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Iniciando...' : 'Iniciar sesión'}
                    </button>
                </form>

                <p className="auth-link">
                    ¿No tienes cuenta? <Link to="/register-email">Regístrate</Link>
                </p>
            </div>
        </div>
    );
};
