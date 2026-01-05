import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, Calendar, MessageCircle } from 'lucide-react';
import './EditProfileModal.css';

interface FamilyMember {
    id: string;
    userId?: string;
    branchId: string;
    name: string;
    birthDate?: string;
    photo?: string;
    bio?: string;
    phone?: string;
    whatsapp?: string;
    nickname?: string;
    skills?: string[];
    preferredColor?: string;
    parentId?: string;
    relation?: string;
    branch?: { color: string };
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
        whatsapp: '',
        skills: '', // Comma separated string
        preferredColor: '#D4AF37',
        parentId: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [availableParents, setAvailableParents] = useState<FamilyMember[]>([]);

    useEffect(() => {
        const fetchMembers = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch('/api/members', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                const data = await res.json();
                if (Array.isArray(data)) {
                    // Filter out self to avoid cycles
                    setAvailableParents(data.filter((m: FamilyMember) => m.id !== member.id));
                }
            } catch (e) {
                console.error("Failed to load members for parent selector");
            }
        };
        if (isOpen) {
            fetchMembers();
        }
    }, [isOpen, member.id]);

    useEffect(() => {
        if (member) {
            setFormData({
                name: member.name || '',
                bio: member.bio || '',
                birthDate: member.birthDate ? new Date(member.birthDate).toISOString().split('T')[0] : '',
                phone: member.phone || '',
                whatsapp: member.whatsapp || '',
                skills: Array.isArray(member.skills)
                    ? member.skills.join(', ')
                    : (typeof member.skills === 'string' ? member.skills : ''),
                preferredColor: member.preferredColor || member.branch?.color || '#D4AF37',
                parentId: member.parentId || ''
            });
            if (member.photo) {
                setPhotoPreview(member.photo);
            }
        }
    }, [member]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const data = new FormData();

            data.append('name', formData.name);
            data.append('bio', formData.bio);
            if (formData.birthDate) data.append('birthDate', formData.birthDate);
            if (formData.phone) data.append('phone', formData.phone);
            if (formData.whatsapp) data.append('whatsapp', formData.whatsapp);

            if (formData.skills) {
                const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(Boolean);
                data.append('skills', JSON.stringify(skillsArray));
            }

            if (formData.preferredColor) data.append('preferredColor', formData.preferredColor);

            if (formData.parentId) {
                data.append('parentId', formData.parentId);
            }

            if (photoFile) data.append('photo', photoFile);

            const res = await fetch(`/api/members/${member.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: data
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

                <h2 id="edit-profile-title">Editar Perfil ✏️</h2>


                {error && <div className="error-message" role="alert">{error}</div>}

                <form onSubmit={handleSubmit} className="edit-form">

                    {/* Photo Upload */}
                    <div className="photo-upload-container">
                        <div className="profile-photo-preview" onClick={() => document.getElementById('edit-photo-input')?.click()}>
                            {photoPreview ? (
                                <img src={photoPreview} alt="Foto de perfil" />
                            ) : (
                                <div className="photo-placeholder-icon">
                                    <User size={40} />
                                </div>
                            )}
                            <div className="photo-overlay">
                                <span>Cambiar</span>
                            </div>
                        </div>
                        <input
                            id="edit-photo-input"
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            style={{ display: 'none' }}
                        />
                    </div>

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
                        <label htmlFor="parentId">Padre / Madre (Ancestro Directo)</label>
                        <div className="input-wrapper">
                            <select
                                id="parentId"
                                value={formData.parentId}
                                onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'white',
                                    padding: '0.5rem',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="" style={{ color: 'black' }}>-- Sin Padre Asignado --</option>
                                {availableParents.map(p => (
                                    <option key={p.id} value={p.id} style={{ color: 'black' }}>
                                        {p.name} ({p.relation})
                                    </option>
                                ))}
                            </select>
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

                    <div className="form-group">
                        <label htmlFor="skills">Profesión / Habilidades (separadas por comas)</label>
                        <div className="input-wrapper">
                            <input
                                id="skills"
                                type="text"
                                value={formData.skills}
                                onChange={e => setFormData({ ...formData, skills: e.target.value })}
                                placeholder="Ej: Ingeniero, Cocina, Guitarra..."
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="preferredColor">Color de Perfil (Tema)</label>
                        <div className="input-wrapper color-input-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                id="preferredColor"
                                type="color"
                                value={formData.preferredColor}
                                onChange={e => setFormData({ ...formData, preferredColor: e.target.value })}
                                style={{ width: '50px', height: '40px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                            />
                            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                                {formData.preferredColor || 'Default'}
                            </span>
                        </div>
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
