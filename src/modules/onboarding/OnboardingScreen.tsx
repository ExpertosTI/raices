import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './OnboardingScreen.css';

interface Branch {
    id: string;
    name: string;
    color: string;
    birthDate: string;
}

export const OnboardingScreen = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const [formData, setFormData] = useState({
        grandparentId: '',
        grandparentName: '',
        parentName: '',
        relation: 'GRANDCHILD',
        birthDate: '',
        phone: '',
        whatsapp: '',
        bio: ''
    });

    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            const res = await fetch('/api/branches', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBranches(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch branches', err);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setMessage('');

        try {
            const res = await fetch('/api/registration-request', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: user?.name || 'Usuario',
                    branchId: formData.grandparentId,
                    grandparentId: formData.grandparentId,
                    parentName: formData.parentName,
                    relation: formData.relation,
                    birthDate: formData.birthDate || null,
                    phone: formData.phone,
                    whatsapp: formData.whatsapp,
                    bio: formData.bio
                })
            });

            if (res.ok) {
                setStep(4); // Success step
            } else {
                const data = await res.json();
                setMessage(data.error || 'Error al enviar solicitud');
            }
        } catch (err) {
            setMessage('Error de conexión');
        }

        setLoading(false);
    };

    const selectedBranch = branches.find(b => b.id === formData.grandparentId);

    return (
        <div className="onboarding-screen">
            {/* Progress Bar */}
            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(step / 4) * 100}%` }}></div>
            </div>

            <div className="onboarding-content">
                {/* Step 1: Welcome + Select Grandparent */}
                {step === 1 && (
                    <div className="onboarding-step">
                        <div className="welcome-emoji">👋</div>
                        <h1>¡Bienvenido, {user?.name?.split(' ')[0]}!</h1>
                        <p className="step-desc">
                            Para completar tu registro, necesitamos saber de qué rama eres descendiente.
                        </p>

                        <h2 className="question">¿Quién es tu abuelo/a de los 12 hermanos?</h2>

                        <div className="branches-grid">
                            {branches.map(branch => (
                                <button
                                    key={branch.id}
                                    className={`branch-card ${formData.grandparentId === branch.id ? 'selected' : ''}`}
                                    style={{
                                        borderColor: formData.grandparentId === branch.id ? branch.color : 'transparent',
                                        backgroundColor: formData.grandparentId === branch.id ? `${branch.color}20` : undefined
                                    }}
                                    onClick={() => setFormData({ ...formData, grandparentId: branch.id, grandparentName: branch.name })}
                                >
                                    <span className="branch-initial" style={{ backgroundColor: branch.color }}>
                                        {branch.name.charAt(0)}
                                    </span>
                                    <span className="branch-name">{branch.name.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            className="next-btn"
                            disabled={!formData.grandparentId}
                            onClick={() => setStep(2)}
                        >
                            Continuar →
                        </button>
                    </div>
                )}

                {/* Step 2: Parent Info */}
                {step === 2 && (
                    <div className="onboarding-step">
                        <button className="back-link" onClick={() => setStep(1)}>← Atrás</button>

                        <div className="selected-branch" style={{ borderColor: selectedBranch?.color }}>
                            <span>Rama de</span>
                            <strong>{selectedBranch?.name}</strong>
                        </div>

                        <h2 className="question">¿Cómo se llama tu papá o mamá?</h2>
                        <p className="step-hint">El que sea hijo/a de {selectedBranch?.name?.split(' ')[0]}</p>

                        <input
                            type="text"
                            className="text-input"
                            placeholder="Ej: María García"
                            value={formData.parentName}
                            onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                        />

                        <h3 className="sub-question">¿Cuál es tu relación con {selectedBranch?.name?.split(' ')[0]}?</h3>
                        <div className="relation-options">
                            <button
                                className={`relation-btn ${formData.relation === 'GRANDCHILD' ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, relation: 'GRANDCHILD' })}
                            >
                                Nieto/a
                            </button>
                            <button
                                className={`relation-btn ${formData.relation === 'GREAT_GRANDCHILD' ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, relation: 'GREAT_GRANDCHILD' })}
                            >
                                Bisnieto/a
                            </button>
                            <button
                                className={`relation-btn ${formData.relation === 'CHILD' ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, relation: 'CHILD' })}
                            >
                                Hijo/a directo
                            </button>
                        </div>

                        <button
                            className="next-btn"
                            disabled={!formData.parentName}
                            onClick={() => setStep(3)}
                        >
                            Continuar →
                        </button>
                    </div>
                )}

                {/* Step 3: Contact Info */}
                {step === 3 && (
                    <div className="onboarding-step">
                        <button className="back-link" onClick={() => setStep(2)}>← Atrás</button>

                        <h2 className="question">Información de contacto</h2>
                        <p className="step-hint">Opcional, pero ayuda a mantenernos conectados</p>

                        <div className="form-group">
                            <label>Fecha de Nacimiento</label>
                            <input
                                type="date"
                                className="text-input"
                                value={formData.birthDate}
                                onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Teléfono</label>
                                <input
                                    type="tel"
                                    className="text-input"
                                    placeholder="809-000-0000"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>WhatsApp</label>
                                <input
                                    type="tel"
                                    className="text-input"
                                    placeholder="809-000-0000"
                                    value={formData.whatsapp}
                                    onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Algo sobre ti (opcional)</label>
                            <textarea
                                className="text-input textarea"
                                placeholder="Cuéntanos algo..."
                                value={formData.bio}
                                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                rows={3}
                            />
                        </div>

                        {message && <p className="error-msg">{message}</p>}

                        <button
                            className="submit-btn"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? 'Enviando...' : '✅ Enviar Solicitud'}
                        </button>
                    </div>
                )}

                {/* Step 4: Success */}
                {step === 4 && (
                    <div className="onboarding-step success-step">
                        <div className="success-icon">🎉</div>
                        <h1>¡Solicitud Enviada!</h1>
                        <p className="step-desc">
                            Un administrador revisará tu información y aprobará tu registro.
                            Te notificaremos por correo cuando estés listo.
                        </p>

                        <div className="summary-card">
                            <h3>Resumen</h3>
                            <p><strong>Rama:</strong> {selectedBranch?.name}</p>
                            <p><strong>Padre/Madre:</strong> {formData.parentName}</p>
                            <p><strong>Relación:</strong> {formData.relation}</p>
                        </div>

                        <button className="next-btn" onClick={() => navigate('/app')}>
                            Ir al Inicio →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
