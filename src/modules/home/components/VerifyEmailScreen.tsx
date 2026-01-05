import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GrowingRoots } from './GrowingRoots';
import './LoginScreen.css';
import './EmailAuthScreen.css';

export const VerifyEmailScreen = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || '';

    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (!email) {
            navigate('/register-email');
        }
    }, [email, navigate]);

    useEffect(() => {
        // Focus first input on mount
        inputRefs.current[0]?.focus();
    }, []);

    useEffect(() => {
        // Resend cooldown timer
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only digits

        const newCode = [...code];
        newCode[index] = value.slice(-1); // Only last digit
        setCode(newCode);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when complete
        if (newCode.every(d => d) && newCode.join('').length === 6) {
            handleSubmit(newCode.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (/^\d{6}$/.test(pastedData)) {
            const newCode = pastedData.split('');
            setCode(newCode);
            handleSubmit(pastedData);
        }
    };

    const handleSubmit = async (codeStr?: string) => {
        const verificationCode = codeStr || code.join('');

        if (verificationCode.length !== 6) {
            setError('Ingresa el código de 6 dígitos');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: verificationCode }),
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setSuccess('¡Email verificado! Redirigiendo...');

                setTimeout(() => {
                    if (!data.user.familyMember) {
                        navigate('/onboarding');
                    } else {
                        navigate('/app');
                    }
                }, 1500);
            } else {
                setError(data.error || 'Código inválido');
                setCode(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } catch (err) {
            console.error('Verify error:', err);
            setError('Error de conexión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;

        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess('Código reenviado. Revisa tu email.');
                setResendCooldown(60);
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.error || 'Error al reenviar');
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

            <div className="login-card email-auth-card verify-card">
                <h1>Verifica tu Email</h1>
                <p className="login-subtitle">
                    Enviamos un código de 6 dígitos a<br />
                    <strong>{email}</strong>
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

                <div className="code-inputs" onPaste={handlePaste}>
                    {code.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => { inputRefs.current[index] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            className="code-input"
                            disabled={isLoading}
                        />
                    ))}
                </div>

                <button
                    type="button"
                    className="submit-btn"
                    onClick={() => handleSubmit()}
                    disabled={isLoading || code.join('').length !== 6}
                >
                    {isLoading ? 'Verificando...' : 'Verificar'}
                </button>

                <div className="resend-section">
                    <p>¿No recibiste el código?</p>
                    <button
                        type="button"
                        className="resend-btn"
                        onClick={handleResend}
                        disabled={resendCooldown > 0 || isLoading}
                    >
                        {resendCooldown > 0
                            ? `Reenviar en ${resendCooldown}s`
                            : 'Reenviar código'
                        }
                    </button>
                </div>

                <button
                    className="back-link"
                    onClick={() => navigate('/register-email')}
                >
                    ← Usar otro email
                </button>
            </div>
        </div>
    );
};
