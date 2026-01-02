import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import './RegisterScreen.css';

const COLOR_OPTIONS = [
    { name: 'Rojo', value: '#DC2626' },
    { name: 'Naranja', value: '#EA580C' },
    { name: 'Ámbar', value: '#D97706' },
    { name: 'Verde', value: '#16A34A' },
    { name: 'Esmeralda', value: '#059669' },
    { name: 'Azul', value: '#2563EB' },
    { name: 'Índigo', value: '#4F46E5' },
    { name: 'Violeta', value: '#7C3AED' },
    { name: 'Rosa', value: '#DB2777' },
    { name: 'Fucsia', value: '#C026D3' },
    { name: 'Teal', value: '#0D9488' },
    { name: 'Dorado', value: '#D4AF37' },
];

const RELATIONS = [
    { value: 'CHILD', label: 'Hijo/a' },
    { value: 'GRANDCHILD', label: 'Nieto/a' },
    { value: 'GREAT_GRANDCHILD', label: 'Bisnieto/a' },
    { value: 'SPOUSE', label: 'Cónyuge' },
    { value: 'NEPHEW', label: 'Sobrino/a' },
    { value: 'OTHER', label: 'Otro' },
];

export const RegisterScreen: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        birthDate: '',
        branchId: '',
        relation: 'CHILD',
        phone: '',
        whatsapp: '',
        bio: '',
        parentId: '',
        preferredColor: '#D4AF37',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    const [members, setMembers] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [availableParents, setAvailableParents] = useState<any[]>([]);

    useEffect(() => {
        // Auth Check
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (!token) {
            navigate('/login');
            return;
        }

        // Pre-fill data from logged user
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.familyMember) {
                setFormData(prev => ({
                    ...prev,
                    branchId: user.familyMember.branchId,
                    parentId: user.familyMember.id, // Assume registering a child by default
                    relation: 'CHILD'
                }));
            }
        }

        // Fetch branches
        fetch('/api/branches')
            .then(res => res.json())
            .then(data => setBranches(data))
            .catch(err => console.error('Failed to fetch branches', err));

        // Fetch members
        fetch('/api/members')
            .then(res => res.json())
            .then(data => setMembers(data))
            .catch(err => console.error('Failed to fetch members', err));
    }, [navigate]);

    // Actualizar padres disponibles cuando cambia la rama
    useEffect(() => {
        if (formData.branchId) {
            const parents = members.filter(m =>
                m.branchId === formData.branchId &&
                true
            );
            setAvailableParents(parents);
            // Reset parent selection when branch changes
            setFormData(prev => ({ ...prev, parentId: '' }));
        } else {
            setAvailableParents([]);
            setFormData(prev => ({ ...prev, parentId: '' }));
        }
    }, [formData.branchId, members]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validar padre si es requerido
        const needsParent = ['CHILD', 'GRANDCHILD', 'GREAT_GRANDCHILD'].includes(formData.relation);
        if (needsParent && !formData.parentId) {
            setMessage('❌ Debes seleccionar quién es tu padre/madre');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const res = await fetch('/api/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setMessage('✅ Miembro registrado exitosamente');
                setTimeout(() => navigate('/app'), 2000);
            } else {
                const data = await res.json();
                setMessage(`❌ Error: ${data.details || data.error || 'Error desconocido'}`);
            }
        } catch {
            setMessage('❌ Error de conexión');
        }

        setIsSubmitting(false);
    };

    return (
        <div className="register-screen">
            <header className="register-header">
                <button className="back-btn" onClick={() => navigate('/app')}>
                    ← Volver
                </button>
                <h1 className="register-title">Registrar Miembro</h1>
            </header>

            <form className="register-form" onSubmit={handleSubmit}>
                {/* Name */}
                <div className="form-group">
                    <label>Nombre Completo</label>
                    <input
                        type="text"
                        placeholder="Ej: María García Henríquez"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </div>

                {/* Birth Date */}
                <div className="form-group">
                    <label>Fecha de Nacimiento</label>
                    <input
                        type="date"
                        value={formData.birthDate}
                        onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                        required
                    />
                </div>

                {/* Branch */}
                <div className="form-group">
                    <label>Rama Familiar (Patriarca)</label>
                    <select
                        value={formData.branchId}
                        onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                        required
                    >
                        <option value="">Selecciona una rama</option>
                        {branches.map(branch => (
                            <option key={branch.id} value={branch.id}>
                                {branch.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Relation */}
                <div className="form-group">
                    <label>Relación</label>
                    <select
                        value={formData.relation}
                        onChange={e => setFormData({ ...formData, relation: e.target.value })}
                    >
                        {RELATIONS.map(rel => (
                            <option key={rel.value} value={rel.value}>{rel.label}</option>
                        ))}
                    </select>
                </div>

                {/* Parent Selection (Conditional) */}
                {['CHILD', 'GRANDCHILD', 'GREAT_GRANDCHILD'].includes(formData.relation) && (
                    <div className="form-group">
                        <label>¿De quién eres hijo/a?</label>
                        <select
                            value={formData.parentId}
                            onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                            required
                        >
                            <option value="">Selecciona tu padre/madre</option>
                            {availableParents.map(parent => (
                                <option key={parent.id} value={parent.id}>
                                    {parent.name} ({new Date(parent.birthDate).getFullYear()})
                                </option>
                            ))}
                        </select>
                        {availableParents.length === 0 && (
                            <p className="field-hint">No se encontraron miembros en esta rama. Registra primero a tus padres.</p>
                        )}
                    </div>
                )}

                {/* Phone */}
                <div className="form-row">
                    <div className="form-group">
                        <label>Teléfono</label>
                        <input
                            type="tel"
                            placeholder="809-000-0000"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>WhatsApp</label>
                        <input
                            type="tel"
                            placeholder="809-000-0000"
                            value={formData.whatsapp}
                            onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                        />
                    </div>
                </div>

                {/* Bio */}
                <div className="form-group">
                    <label>Biografía Corta</label>
                    <textarea
                        placeholder="Cuéntanos algo sobre ti..."
                        value={formData.bio}
                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                        rows={3}
                    />
                </div>

                {/* Color Picker */}
                <div className="form-group">
                    <label>Tu Color Favorito</label>
                    <div className="color-picker">
                        {COLOR_OPTIONS.map(color => (
                            <button
                                key={color.value}
                                type="button"
                                className={`color-option ${formData.preferredColor === color.value ? 'selected' : ''}`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => setFormData({ ...formData, preferredColor: color.value })}
                                title={color.name}
                            />
                        ))}
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    className="submit-btn"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Registrando...' : 'Registrar Miembro'}
                </button>

                {message && <p className="form-message">{message}</p>}
            </form>

            {/* Bottom Navigation */}
            <nav className="app-nav">
                <div className="nav-item" onClick={() => navigate('/app')}>
                    <span>🏠</span>
                    <span>Inicio</span>
                </div>
                <div className="nav-item" onClick={() => navigate('/tree')}>
                    <span>🌳</span>
                    <span>Árbol</span>
                </div>
                <div className="nav-item" onClick={() => navigate('/events')}>
                    <span>📅</span>
                    <span>Eventos</span>
                </div>
                <div className="nav-item" onClick={() => navigate('/feed')}>
                    <span>💬</span>
                    <span>Feed</span>
                </div>
            </nav>
        </div>
    );
};
