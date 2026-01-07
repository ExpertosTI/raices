import React, { useState, useRef } from 'react';
import { X, User, Calendar, Save, Camera } from 'lucide-react';
import './AddChildModal.css';

interface AddChildModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (message: string) => void;
}

export const AddChildModal: React.FC<AddChildModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        birthDate: '',
        gender: 'unknown'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);

            const reader = new FileReader();
            reader.onload = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError('El nombre es requerido');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');

            // Use FormData to support photo upload
            const data = new FormData();
            data.append('name', formData.name.trim());
            if (formData.birthDate) data.append('birthDate', formData.birthDate);
            data.append('gender', formData.gender);
            if (photoFile) data.append('photo', photoFile);

            const res = await fetch('/api/members/child', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Don't set Content-Type for FormData
                },
                body: data
            });

            const responseData = await res.json();

            if (res.ok) {
                onSuccess(`✅ ${formData.name} agregado/a al árbol familiar`);
                setFormData({ name: '', birthDate: '', gender: 'unknown' });
                setPhotoFile(null);
                setPhotoPreview(null);
                onClose();
            } else {
                setError(responseData.error || 'Error al agregar');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="add-child-overlay" onClick={onClose}>
            <div className="add-child-modal" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="modal-header">
                    <span className="modal-icon">👶</span>
                    <h2>Agregar Hijo/a</h2>
                    <p>Crea un perfil para tu hijo/a. Cuando se registre, podrá reclamarlo.</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {/* Photo Upload */}
                    <div className="photo-upload-section">
                        <div
                            className="photo-preview"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {photoPreview ? (
                                <img src={photoPreview} alt="Foto" />
                            ) : (
                                <div className="photo-placeholder">
                                    <Camera size={32} />
                                    <span>Agregar foto</span>
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="childName">
                            <User size={16} /> Nombre Completo *
                        </label>
                        <input
                            id="childName"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej: María José Henríquez"
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="childBirthDate">
                            <Calendar size={16} /> Fecha de Nacimiento
                        </label>
                        <input
                            id="childBirthDate"
                            type="date"
                            value={formData.birthDate}
                            onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Género</label>
                        <div className="gender-options">
                            <button
                                type="button"
                                className={`gender-btn ${formData.gender === 'male' ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, gender: 'male' })}
                            >
                                👦 Hijo
                            </button>
                            <button
                                type="button"
                                className={`gender-btn ${formData.gender === 'female' ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, gender: 'female' })}
                            >
                                👧 Hija
                            </button>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Guardando...' : (
                                <>
                                    <Save size={18} /> Agregar al Árbol
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
