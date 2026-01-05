import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GrowingRoots } from './GrowingRoots';
import './LoginScreen.css';
import './EmailAuthScreen.css';

type Step = 'email' | 'code' | 'password';

export const ForgotPasswordScreen = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email) {
            setError('Ingresa tu email');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess('Si el email existe, recibirás un código.');
                setStep('code');
            } else {
                setError(data.error || 'Error al enviar el código');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (code.length !== 6) {
            setError('El código debe tener 6 dígitos');
            return;
        }

        // Move to password step (we'll verify code when submitting new password)
        setStep('password');
        setSuccess('');
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess('¡Contraseña actualizada! Redirigiendo...');
                setTimeout(() => navigate('/login-email'), 2000);
            } else {
                setError(data.error || 'Error al cambiar la contraseña');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-screen">
            <GrowingRoots />

            <div className="login-card email-auth-card">
                <button className="back-btn" onClick={() => navigate('/login-email')}>
                    ← Volver
                </button>

                <h1>Recuperar Contraseña</h1>

                {step === 'email' && (
                    <>
                        <p className="login-subtitle">
                            Ingresa tu email y te enviaremos un código
                        </p>

                        {error && (
                            <div className="login-error">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <form onSubmit={handleSendCode} className="email-auth-form">
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

                            <button
                                type="submit"
                                className="submit-btn"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Enviando...' : 'Enviar código'}
                            </button>
                        </form>
                    </>
                )}

                {step === 'code' && (
                    <>
                        <p className="login-subtitle">
                            Ingresa el código de 6 dígitos enviado a<br />
                            <strong>{email}</strong>
                        </p>

                        {success && (
                            <div className="login-success">
                                <span>✅</span> {success}
                            </div>
                        )}

                        {error && (
                            <div className="login-error">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <form onSubmit={handleVerifyCode} className="email-auth-form">
                            <div className="form-group">
                                <label htmlFor="code">Código</label>
                                <input
                                    type="text"
                                    id="code"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="123456"
                                    inputMode="numeric"
                                    maxLength={6}
                                    className="code-single-input"
                                />
                            </div>

                            <button
                                type="submit"
                                className="submit-btn"
                                disabled={code.length !== 6}
                            >
                                Continuar
                            </button>
                        </form>
                    </>
                )}

                {step === 'password' && (
                    <>
                        <p className="login-subtitle">
                            Crea tu nueva contraseña
                        </p>

                        {error && (
                            <div className="login-error">
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        {success && (
                            <div className="login-success">
                                <span>✅</span> {success}
                            </div>
                        )}

                        <form onSubmit={handleResetPassword} className="email-auth-form">
                            <div className="form-group">
                                <label htmlFor="newPassword">Nueva contraseña</label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Mínimo 8 caracteres"
                                    autoComplete="new-password"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirmar contraseña</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repite tu contraseña"
                                    autoComplete="new-password"
                                />
                            </div>

                            <button
                                type="submit"
                                className="submit-btn"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Cambiando...' : 'Cambiar contraseña'}
                            </button>
                        </form>
                    </>
                )}

                <p className="auth-link">
                    <Link to="/login-email">Volver al login</Link>
                </p>
            </div>
        </div>
    );
};
