import React, { useState } from 'react';
import { X, User, Calendar, Save } from 'lucide-react';
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
            const res = await fetch('/api/members/child', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    birthDate: formData.birthDate || undefined,
                    gender: formData.gender
                })
            });

            const data = await res.json();

            if (res.ok) {
                onSuccess(`✅ ${formData.name} agregado/a al árbol familiar`);
                setFormData({ name: '', birthDate: '', gender: 'unknown' });
                onClose();
            } else {
                setError(data.error || 'Error al agregar');
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
