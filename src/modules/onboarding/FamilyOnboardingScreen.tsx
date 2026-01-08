import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './FamilyOnboardingScreen.css';

type OnboardingMode = 'choice' | 'create' | 'join' | 'success';

export const FamilyOnboardingScreen = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState<OnboardingMode>('choice');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
        // Redirect if not logged in
        if (!token) {
            navigate('/login');
            return;
        }

        // If user already has a family, go to app
        if (user?.familyId) {
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

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="family-onboarding">
            <button className="logout-btn-top" onClick={handleLogout} title="Cerrar Sesión">
                <span className="icon">🚪</span>
                <span className="text">Salir</span>
            </button>
            <div className="onboarding-card">

                {/* Choice Mode */}
                {mode === 'choice' && (
                    <div className="onboarding-step fade-in">
                        <div className="welcome-icon">🌳</div>
                        <h1>¡Bienvenido a Raíces!</h1>
                        <p className="subtitle">
                            Conecta con tu familia y preserva tu historia.
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

                            <div className="divider">
                                <span>o</span>
                            </div>

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
                        </div>
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
    );
};
