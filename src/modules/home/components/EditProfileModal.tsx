import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, Calendar, MessageCircle } from 'lucide-react';
import './EditProfileModal.css';

interface FamilyMember {
    id: string;
    userId?: string;
    branchId: string;
    name: string;
    birthDate?: string;
    bio?: string;
    phone?: string;
    whatsapp?: string;
    nickname?: string;
    skills?: string[];
    preferredColor?: string;
}

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    member: FamilyMember;
    onSuccess: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, member, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        bio: '',
        birthDate: '',
        phone: '',
        whatsapp: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (member) {
            setFormData({
                name: member.name || '',
                bio: member.bio || '',
                birthDate: member.birthDate ? new Date(member.birthDate).toISOString().split('T')[0] : '',
                phone: member.phone || '',
                whatsapp: member.whatsapp || ''
            });
        }
    }, [member]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/members/${member.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Error al actualizar perfil');

            onSuccess();
            onClose();
        } catch (err) {
            setError('No se pudo guardar los cambios');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="modal-overlay-glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
        >
            <div className="modal-content-glass premium-form">
                <button
                    className="close-btn"
                    onClick={onClose}
                    aria-label="Cerrar modal"
                >
                    <X size={24} />
                </button>

                <h2 id="edit-profile-title">Editar Perfil</h2>

                {error && <div className="error-message" role="alert">{error}</div>}

                <form onSubmit={handleSubmit} className="edit-form">
                    <div className="form-group">
                        <label htmlFor="name">Nombre Completo</label>
                        <div className="input-wrapper">
                            <User size={18} aria-hidden="true" />
                            <input
                                id="name"
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="birthDate">Fecha de Nacimiento</label>
                        <div className="input-wrapper">
                            <Calendar size={18} aria-hidden="true" />
                            <input
                                id="birthDate"
                                type="date"
                                value={formData.birthDate}
                                onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="phone">Teléfono</label>
                            <div className="input-wrapper">
                                <Phone size={18} aria-hidden="true" />
                                <input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+1 800..."
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="whatsapp">WhatsApp</label>
                            <div className="input-wrapper">
                                <MessageCircle size={18} aria-hidden="true" />
                                <input
                                    id="whatsapp"
                                    type="tel"
                                    value={formData.whatsapp}
                                    onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                                    placeholder="+1 800..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="bio">Biografía</label>
                        <textarea
                            id="bio"
                            value={formData.bio}
                            onChange={e => setFormData({ ...formData, bio: e.target.value })}
                            rows={3}
                            placeholder="Cuéntanos sobre ti..."
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Guardando...' : (
                                <>
                                    <Save size={18} aria-hidden="true" />
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
