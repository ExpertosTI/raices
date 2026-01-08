import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import './FamilyOnboardingScreen.css';

// Google Client ID
const GOOGLE_CLIENT_ID = '609647959676-2jdrb9ursfnqi3uu6gmk2i6gj6ker42b.apps.googleusercontent.com';
// Facebook App ID
const FACEBOOK_APP_ID = '1216780823884014';

declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
    }
}

type OnboardingMode = 'choice' | 'create' | 'join' | 'success';

export const FamilyOnboardingScreen = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState<OnboardingMode>('choice');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fbReady, setFbReady] = useState(false);

    // Create Family Form
    const [familyName, setFamilyName] = useState('');
    const [familyDescription, setFamilyDescription] = useState('');

    // Join Family Form
    const [inviteToken, setInviteToken] = useState('');
    const [inviteInfo, setInviteInfo] = useState<{ family: { name: string; logo?: string } } | null>(null);

    // Success Data
    const [successData, setSuccessData] = useState<{ familyName: string; isCreator: boolean } | null>(null);

    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;

    useEffect(() => {
        // Facebook Init
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
            const script = document.createElement('script');
            script.src = 'https://connect.facebook.net/es_LA/sdk.js';
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);
        } else {
            setFbReady(true);
        }

        // REFRESH USER DATA (Fix for stale localStorage after migration)
        if (token) {
            fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => {
                    if (res.ok) return res.json();
                    // If 401, token is invalid.
                    if (res.status === 401) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        window.location.reload();
                    }
                    throw new Error('Failed to create refresh');
                })
                .then(userData => {
                    console.log('User data refreshed:', userData);
                    // Update local storage
                    localStorage.setItem('user', JSON.stringify(userData));
                    // Redirect if family exists
                    if (userData.familyId) {
                        navigate('/app');
                    }
                })
                .catch(err => console.error('Auto-refresh failed', err));
        } else {
            // Not logged in, stay here (UI shows login buttons)
        }

        // If local storage already has familyId (fast path)
        if (token && user?.familyId) {
            navigate('/app');
            return;
        }

        // Check for invite token in URL
        const urlToken = searchParams.get('token');
        if (urlToken) {
            setInviteToken(urlToken);
            setMode('join');
            validateToken(urlToken);
        }
    }, [token, user?.familyId, navigate, searchParams]);

    const validateToken = async (tokenToValidate: string) => {
        try {
            const res = await fetch(`/api/family/invite/${tokenToValidate}`);
            const data = await res.json();

            if (res.ok && data.valid) {
                setInviteInfo(data);
                setError('');
            } else {
                setError(data.error || 'Invitación inválida');
                setInviteInfo(null);
            }
        } catch (err) {
            setError('Error al validar la invitación');
        }
    };

    const handleCreateFamily = async () => {
        if (!token) {
            setError('Debes iniciar sesión primero');
            return;
        }
        if (!familyName.trim()) {
            setError('El nombre de la familia es requerido');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/family', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: familyName.trim(),
                    description: familyDescription.trim() || null
                })
            });

            const data = await res.json();

            if (res.ok) {
                // Update local storage with new user data
                const updatedUser = { ...user, familyId: data.family.id, role: data.user.role };
                localStorage.setItem('user', JSON.stringify(updatedUser));

                setSuccessData({ familyName: data.family.name, isCreator: true });
                setMode('success');
            } else {
                setError(data.error || 'Error al crear la familia');
            }
        } catch (err) {
            setError('Error de conexión');
        }

        setLoading(false);
    };

    const handleJoinFamily = async () => {
        if (!token) {
            setError('Debes iniciar sesión primero');
            return;
        }
        if (!inviteToken.trim()) {
            setError('El código de invitación es requerido');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/family/join', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: inviteToken.trim() })
            });

            const data = await res.json();

            if (res.ok) {
                // Update local storage
                const updatedUser = { ...user, familyId: data.family.id, role: data.user.role };
                localStorage.setItem('user', JSON.stringify(updatedUser));

                setSuccessData({ familyName: data.family.name, isCreator: false });
                setMode('success');
            } else {
                setError(data.error || 'Error al unirse a la familia');
            }
        } catch (err) {
            setError('Error de conexión');
        }

        setLoading(false);
    };

    // Auth Handlers
    const handleGoogleSuccess = async (credentialResponse: any) => {
        setLoading(true);
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
                if (data.user.familyId) {
                    navigate('/app');
                } else {
                    window.location.reload();
                }
            } else {
                setError('No pudimos verificar tu cuenta.');
            }
        } catch (error) {
            setError('Error de conexión.');
        }
        setLoading(false);
    };

    const handleFacebookLogin = () => {
        if (!window.FB) {
            setError('Facebook SDK no cargado.');
            return;
        }
        setLoading(true);
        window.FB.login((response: any) => {
            if (response.authResponse) {
                fetch('/api/auth/facebook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        accessToken: response.authResponse.accessToken,
                        userID: response.authResponse.userID
                    }),
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.token) {
                            localStorage.setItem('token', data.token);
                            localStorage.setItem('user', JSON.stringify(data.user));
                            if (data.user.familyId) {
                                navigate('/app');
                            } else {
                                window.location.reload();
                            }
                        } else {
                            setError('Error al verificar con Facebook.');
                        }
                    })
                    .catch(() => setError('Error de conexión.'))
                    .finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        }, { scope: 'email,public_profile' });
    };

    // Helper for Logout (Switch Account)
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
    };

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div className="family-onboarding">
                <div className="onboarding-card">

                    {/* Choice Mode */}
                    {mode === 'choice' && (
                        <div className="onboarding-step fade-in">
                            <div className="welcome-icon">🌳</div>
                            <h1>¡Bienvenido a Raíces!</h1>

                            {!token ? (
                                <>
                                    <p className="subtitle">
                                        Inicia sesión para continuar.
                                    </p>
                                    <div className="choice-buttons">
                                        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '10px' }}>
                                            <GoogleLogin
                                                onSuccess={handleGoogleSuccess}
                                                onError={() => setError('Falló Google Login')}
                                                theme="filled_black"
                                                shape="pill"
                                                text="continue_with"
                                                width="280"
                                            />
                                        </div>

                                        <button
                                            className="choice-btn"
                                            onClick={handleFacebookLogin}
                                            style={{ justifyContent: 'center', textAlign: 'center', background: '#1877F2', borderColor: '#1877F2' }}
                                            disabled={!fbReady || loading}
                                        >
                                            <span className="btn-text" style={{ flexDirection: 'row', gap: '10px', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>f</span>
                                                <strong style={{ fontSize: '1rem' }}>Continuar con Facebook</strong>
                                            </span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="subtitle">
                                        Hola <strong>{user?.name || 'Usuario'}</strong>.<br />
                                        Estás conectado. Para empezar, crea o únete a una familia.
                                    </p>

                                    <div className="choice-buttons">
                                        <button
                                            className="choice-btn create"
                                            onClick={() => setMode('create')}
                                        >
                                            <span className="btn-icon">🏠</span>
                                            <span className="btn-text">
                                                <strong>Crear Mi Familia</strong>
                                                <small>Soy el primero en unirme</small>
                                            </span>
                                        </button>

                                        <button
                                            className="choice-btn join"
                                            onClick={() => setMode('join')}
                                        >
                                            <span className="btn-icon">🔗</span>
                                            <span className="btn-text">
                                                <strong>Tengo una Invitación</strong>
                                                <small>Me invitaron a una familia</small>
                                            </span>
                                        </button>

                                        <button
                                            onClick={handleLogout}
                                            className="text-link-btn"
                                            style={{
                                                marginTop: '1rem',
                                                background: 'none',
                                                border: 'none',
                                                color: 'rgba(255,255,255,0.5)',
                                                textDecoration: 'underline',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            ¿No eres tú? Cambiar cuenta
                                        </button>

                                        <button
                                            onClick={() => navigate('/utilities')}
                                            className="text-link-btn"
                                            style={{
                                                marginTop: '0.5rem',
                                                background: 'none',
                                                border: 'none',
                                                color: '#4CAF50',
                                                textDecoration: 'underline',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            🎮 Ir a Juegos / Utilidades
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Create Family Mode */}
                    {mode === 'create' && (
                        <div className="onboarding-step fade-in">
                            <button className="back-btn" onClick={() => setMode('choice')}>
                                ← Volver
                            </button>

                            <div className="welcome-icon">🏠</div>
                            <h1>Crea Tu Familia</h1>
                            <p className="subtitle">
                                Serás el administrador de tu árbol genealógico.
                            </p>

                            <div className="form-group">
                                <label>Nombre de la Familia *</label>
                                <input
                                    type="text"
                                    className="text-input"
                                    placeholder="Ej: Familia Pérez, Los García..."
                                    value={familyName}
                                    onChange={(e) => setFamilyName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label>Descripción (Opcional)</label>
                                <textarea
                                    className="text-input"
                                    placeholder="Una breve descripción de tu familia..."
                                    value={familyDescription}
                                    onChange={(e) => setFamilyDescription(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            {error && <p className="error-msg">{error}</p>}

                            <button
                                className="submit-btn"
                                onClick={handleCreateFamily}
                                disabled={loading || !familyName.trim()}
                            >
                                {loading ? 'Creando...' : '✨ Crear Familia'}
                            </button>
                        </div>
                    )}

                    {/* Join Family Mode */}
                    {mode === 'join' && (
                        <div className="onboarding-step fade-in">
                            <button className="back-btn" onClick={() => { setMode('choice'); setInviteToken(''); setInviteInfo(null); setError(''); }}>
                                ← Volver
                            </button>

                            <div className="welcome-icon">🔗</div>
                            <h1>Únete a una Familia</h1>
                            <p className="subtitle">
                                Ingresa el código de invitación que te compartieron.
                            </p>

                            <div className="form-group">
                                <label>Código de Invitación</label>
                                <input
                                    type="text"
                                    className="text-input token-input"
                                    placeholder="Pega tu código aquí..."
                                    value={inviteToken}
                                    onChange={(e) => {
                                        setInviteToken(e.target.value);
                                        if (e.target.value.length > 20) {
                                            validateToken(e.target.value);
                                        }
                                    }}
                                    autoFocus
                                />
                            </div>

                            {inviteInfo && (
                                <div className="invite-preview">
                                    <p>Te unirás a:</p>
                                    <div className="family-preview">
                                        {inviteInfo.family.logo && (
                                            <img src={inviteInfo.family.logo} alt="" className="family-logo" />
                                        )}
                                        <strong>{inviteInfo.family.name}</strong>
                                    </div>
                                </div>
                            )}

                            {error && <p className="error-msg">{error}</p>}

                            <button
                                className="submit-btn"
                                onClick={handleJoinFamily}
                                disabled={loading || !inviteToken.trim()}
                            >
                                {loading ? 'Uniéndote...' : '🎉 Unirse a la Familia'}
                            </button>
                        </div>
                    )}

                    {/* Success Mode */}
                    {mode === 'success' && successData && (
                        <div className="onboarding-step fade-in success-step">
                            <div className="success-icon">🎉</div>
                            <h1>
                                {successData.isCreator
                                    ? '¡Familia Creada!'
                                    : '¡Te has unido!'}
                            </h1>
                            <p className="subtitle">
                                {successData.isCreator
                                    ? `Ahora eres el administrador de "${successData.familyName}".`
                                    : `Bienvenido a "${successData.familyName}".`}
                            </p>

                            {successData.isCreator && (
                                <div className="next-steps">
                                    <p>📋 Próximos pasos:</p>
                                    <ul>
                                        <li>Construye tu árbol genealógico</li>
                                        <li>Invita a tus familiares</li>
                                        <li>Comparte historias y fotos</li>
                                    </ul>
                                </div>
                            )}

                            <button
                                className="submit-btn"
                                onClick={() => navigate('/onboarding')}
                            >
                                Continuar con Mi Perfil →
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </GoogleOAuthProvider>
    );
};
