import { useState } from 'react';
import './InvitePanel.css';

interface InviteData {
    token: string;
    url: string;
    email?: string;
    role: string;
    expiresAt: string;
    familyName: string;
}

export const InvitePanel = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [invites, setInvites] = useState<InviteData[]>([]);

    // Form State
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
    const [expiresDays, setExpiresDays] = useState(7);

    const token = localStorage.getItem('token');

    const generateInvite = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/family/invite', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email.trim() || undefined,
                    role,
                    expiresInDays: expiresDays
                })
            });

            const data = await res.json();

            if (res.ok) {
                setInvites([data.invite, ...invites]);
                setSuccess('¡Invitación creada!');
                setEmail('');
            } else {
                setError(data.error || 'Error al crear invitación');
            }
        } catch (err) {
            setError('Error de conexión');
        }

        setLoading(false);
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setSuccess('¡Link copiado al portapapeles!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Error al copiar');
        }
    };

    const shareViaWhatsApp = (invite: InviteData) => {
        const message = encodeURIComponent(
            `¡Te invito a unirte a nuestra familia "${invite.familyName}" en Raíces!\n\n` +
            `Haz clic en este link para unirte:\n${invite.url}`
        );
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    return (
        <div className="invite-panel">
            <div className="invite-header">
                <h2>🔗 Invitar Familiares</h2>
                <p>Genera un link de invitación para que otros se unan a tu familia.</p>
            </div>

            <div className="invite-form">
                <div className="form-row">
                    <div className="form-group">
                        <label>Email (Opcional)</label>
                        <input
                            type="email"
                            placeholder="Limitar a un email específico..."
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="text-input"
                        />
                        <small>Deja vacío para permitir que cualquiera use el link.</small>
                    </div>
                </div>

                <div className="form-row two-cols">
                    <div className="form-group">
                        <label>Rol</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as 'MEMBER' | 'ADMIN')}
                            className="select-input"
                        >
                            <option value="MEMBER">Miembro</option>
                            <option value="ADMIN">Administrador</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Expira en</label>
                        <select
                            value={expiresDays}
                            onChange={(e) => setExpiresDays(Number(e.target.value))}
                            className="select-input"
                        >
                            <option value={1}>1 día</option>
                            <option value={7}>7 días</option>
                            <option value={14}>14 días</option>
                            <option value={30}>30 días</option>
                        </select>
                    </div>
                </div>

                {error && <p className="error-msg">{error}</p>}
                {success && <p className="success-msg">{success}</p>}

                <button
                    className="generate-btn"
                    onClick={generateInvite}
                    disabled={loading}
                >
                    {loading ? 'Generando...' : '✨ Generar Invitación'}
                </button>
            </div>

            {invites.length > 0 && (
                <div className="invites-list">
                    <h3>Invitaciones Creadas</h3>
                    {invites.map((invite, index) => (
                        <div key={index} className="invite-card">
                            <div className="invite-info">
                                <span className="invite-token">{invite.token.substring(0, 12)}...</span>
                                <span className="invite-role">{invite.role === 'ADMIN' ? '👑 Admin' : '👤 Miembro'}</span>
                                {invite.email && <span className="invite-email">Para: {invite.email}</span>}
                                <span className="invite-expires">
                                    Expira: {new Date(invite.expiresAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="invite-actions">
                                <button
                                    className="action-btn copy"
                                    onClick={() => copyToClipboard(invite.url)}
                                    title="Copiar link"
                                >
                                    📋
                                </button>
                                <button
                                    className="action-btn whatsapp"
                                    onClick={() => shareViaWhatsApp(invite)}
                                    title="Compartir por WhatsApp"
                                >
                                    💬
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
