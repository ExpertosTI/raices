import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './FamilySettingsScreen.css';

interface FamilyInfo {
    id: string;
    name: string;
    slug: string;
    description?: string;
    memberCount: number;
    userCount: number;
    createdAt: string;
}

interface Invite {
    token: string;
    url: string;
    expiresAt: string;
}

export const FamilySettingsScreen = () => {
    const navigate = useNavigate();
    const [family, setFamily] = useState<FamilyInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [invite, setInvite] = useState<Invite | null>(null);
    const [copied, setCopied] = useState(false);
    const [generating, setGenerating] = useState(false);

    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchFamilyInfo();
    }, [token, navigate]);

    const fetchFamilyInfo = async () => {
        try {
            const res = await fetch('/api/family', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setFamily(data.family);
            } else {
                const errData = await res.json();
                setError(errData.error || 'Error al cargar información');
            }
        } catch (err) {
            setError('Error de conexión');
        }
        setLoading(false);
    };

    const generateInviteLink = async () => {
        setGenerating(true);
        setError('');

        try {
            const res = await fetch('/api/family/invite', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ expiresInDays: 7 })
            });

            if (res.ok) {
                const data = await res.json();
                setInvite(data.invite);
            } else {
                const errData = await res.json();
                setError(errData.error || 'Error al generar invitación');
            }
        } catch (err) {
            setError('Error de conexión');
        }
        setGenerating(false);
    };

    const copyToClipboard = () => {
        if (invite?.url) {
            navigator.clipboard.writeText(invite.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="settings-screen">
                <div className="settings-loader">Cargando...</div>
            </div>
        );
    }

    return (
        <div className="settings-screen">
            <div className="settings-header">
                <button className="back-btn" onClick={() => navigate('/app')}>
                    ← Volver
                </button>
                <h1>⚙️ Ajustes</h1>
            </div>

            <div className="settings-content">
                {/* Profile Section */}
                <section className="settings-section">
                    <h2>👤 Tu Perfil</h2>
                    <div className="info-card">
                        <div className="info-row">
                            <span>Nombre:</span>
                            <strong>{user?.name}</strong>
                        </div>
                        <div className="info-row">
                            <span>Email:</span>
                            <strong>{user?.email}</strong>
                        </div>
                        <div className="info-row">
                            <span>Rol:</span>
                            <span className={`role-badge ${user?.role?.toLowerCase()}`}>
                                {user?.role === 'SUPERADMIN' ? '⭐ Super Admin' :
                                    user?.role === 'ADMIN' ? '👑 Admin' : '👤 Miembro'}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Family Section */}
                {family && (
                    <section className="settings-section">
                        <h2>👨‍👩‍👧‍👦 Tu Familia</h2>
                        <div className="info-card">
                            <div className="info-row">
                                <span>Nombre:</span>
                                <strong>{family.name}</strong>
                            </div>
                            <div className="info-row">
                                <span>Miembros en árbol:</span>
                                <strong>{family.memberCount}</strong>
                            </div>
                            <div className="info-row">
                                <span>Usuarios registrados:</span>
                                <strong>{family.userCount}</strong>
                            </div>
                            {family.description && (
                                <div className="info-row">
                                    <span>Descripción:</span>
                                    <span>{family.description}</span>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Invite Section (Admin Only) */}
                {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
                    <section className="settings-section">
                        <h2>📨 Invitar a la Familia</h2>
                        <p className="section-desc">
                            Genera un link para que otros se unan a tu familia.
                        </p>

                        {!invite ? (
                            <button
                                className="generate-btn"
                                onClick={generateInviteLink}
                                disabled={generating}
                            >
                                {generating ? 'Generando...' : '🔗 Generar Link de Invitación'}
                            </button>
                        ) : (
                            <div className="invite-card">
                                <div className="invite-url">
                                    <input
                                        type="text"
                                        value={invite.url}
                                        readOnly
                                    />
                                    <button
                                        className="copy-btn"
                                        onClick={copyToClipboard}
                                    >
                                        {copied ? '✅ Copiado!' : '📋 Copiar'}
                                    </button>
                                </div>
                                <p className="invite-expires">
                                    Expira: {new Date(invite.expiresAt).toLocaleDateString()}
                                </p>
                                <button
                                    className="new-link-btn"
                                    onClick={generateInviteLink}
                                    disabled={generating}
                                >
                                    Generar nuevo link
                                </button>
                            </div>
                        )}

                        {error && <p className="error-msg">{error}</p>}
                    </section>
                )}

                {/* Admin Panel (Admin/SuperAdmin Only) */}
                {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
                    <section className="settings-section">
                        <h2>🛠️ Administración</h2>
                        <p className="section-desc">
                            Gestiona solicitudes, usuarios, miembros y más.
                        </p>
                        <div className="admin-actions">
                            <button
                                className="admin-btn"
                                onClick={() => navigate('/admin')}
                            >
                                👥 Panel de Admin
                                <span>Solicitudes, usuarios, editar miembros</span>
                            </button>
                            <button
                                className="admin-btn"
                                onClick={() => navigate('/directory')}
                            >
                                📋 Directorio
                                <span>Ver todos los miembros</span>
                            </button>
                        </div>
                    </section>
                )}

                {/* Logout Section */}
                <section className="settings-section">
                    <button className="logout-btn" onClick={handleLogout}>
                        🚪 Cerrar Sesión
                    </button>
                </section>
            </div>
        </div>
    );
};
