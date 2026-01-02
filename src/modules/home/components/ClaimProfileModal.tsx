import { useState, useEffect } from 'react';
import './ClaimProfileModal.css';

interface Member {
    id: string;
    name: string;
    birthDate: string;
    photo?: string;
}

interface ClaimProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const ClaimProfileModal: React.FC<ClaimProfileModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState<'SELECT' | 'CONFIRM' | 'SUCCESS'>('SELECT');
    const [candidates, setCandidates] = useState<Member[]>([]);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchCandidates();
        }
    }, [isOpen]);

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/members');
            const data = await res.json();
            // Filter only Siblings/Patriarchs who are not claimed yet (this check ideally happens on backend too, but filtering here for UI)
            // Note: In a real app we might want a specific endpoint for this. 
            // For now, we filter by relation and checks if userId is null (if backend exposes it, checked schema, it does)

            // We need to fetch members who are candidates. 
            // The /api/members endpoint returns all members.
            const siblings = data.filter((m: any) =>
                (m.relation === 'SIBLING' || m.relation === 'PATRIARCH') && !m.userId
            );
            setCandidates(siblings);
        } catch (err) {
            console.error('Failed to fetch candidates', err);
            setError('Error al cargar candidatos');
        } finally {
            setLoading(false);
        }
    };

    const handleClaim = async () => {
        if (!selectedMember) return;
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/members/claim', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ memberId: selectedMember.id })
            });

            if (res.ok) {
                setStep('SUCCESS');
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
            } else {
                const data = await res.json();
                setError(data.error || 'Error al reclamar perfil');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close" onClick={onClose}>×</button>

                {step === 'SELECT' && (
                    <>
                        <h2>Reclamar Identidad</h2>
                        <p className="modal-desc">
                            Si eres uno de los 12 hermanos fundadores, selecciona tu nombre de la lista para verificar tu cuenta.
                        </p>

                        {loading ? (
                            <div className="loading-spinner">Cargando...</div>
                        ) : (
                            <div className="candidates-grid">
                                {candidates.map(member => (
                                    <div
                                        key={member.id}
                                        className={`candidate-card ${selectedMember?.id === member.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedMember(member)}
                                    >
                                        <div className="candidate-avatar">
                                            {member.name.charAt(0)}
                                        </div>
                                        <span className="candidate-name">{member.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            className="primary-btn"
                            disabled={!selectedMember}
                            onClick={() => setStep('CONFIRM')}
                        >
                            Continuar
                        </button>
                    </>
                )}

                {step === 'CONFIRM' && selectedMember && (
                    <>
                        <h2>Confirmación</h2>
                        <p className="modal-desc">
                            Se enviará un correo de verificación para confirmar que eres <strong>{selectedMember.name}</strong>.
                        </p>
                        <p className="modal-note">
                            Al confirmar, tendrás permisos de Patriarca para gestionar tu rama familiar.
                        </p>

                        {error && <p className="error-msg">{error}</p>}

                        <div className="modal-actions">
                            <button className="secondary-btn" onClick={() => setStep('SELECT')}>Volver</button>
                            <button
                                className="primary-btn"
                                onClick={handleClaim}
                                disabled={loading}
                            >
                                {loading ? 'Enviando...' : 'Confirmar y Reclamar'}
                            </button>
                        </div>
                    </>
                )}

                {step === 'SUCCESS' && (
                    <div className="success-view">
                        <div className="success-icon">✅</div>
                        <h2>¡Perfil Reclamado!</h2>
                        <p>Tu identidad ha sido verificada.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
