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
        parentType: 'MOTHER' as 'FATHER' | 'MOTHER', // Default to mother
        relation: 'GRANDCHILD',
        nickname: '',
        birthDate: '',
        phone: '',
        whatsapp: '',
        bio: '',
        skills: [] as string[]
    });

    // New state for photo upload
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const SKILLS_LIST = [
        "Ordenado/a", "Puntual", "Deportista", "Cocinero/a", "Estudioso/a",
        "Amable", "Solidario/a", "Creativo/a", "Valiente", "Líder",
        "Tecnológico/a", "Músico/a", "Aventurero/a", "Paciente", "Trabajador/a"
    ];

    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        // If user is already linked to a family member, redirect to app
        // Check both stored user and fetch latest to be sure
        if (user?.familyMember && user.familyMember.id) {
            navigate('/app');
            return;
        }

        fetchBranches();
    }, [navigate, user?.familyMember]);

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

    const toggleSkill = (skill: string) => {
        if (formData.skills.includes(skill)) {
            setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
        } else {
            setFormData({ ...formData, skills: [...formData.skills, skill] });
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setMessage('');

        try {
            const formDataPayload = new FormData();

            // Append all string/blob fields
            formDataPayload.append('name', user?.name || 'Usuario');
            formDataPayload.append('branchId', formData.grandparentId);
            formDataPayload.append('grandparentId', formData.grandparentId);
            if (formData.parentName) formDataPayload.append('parentName', formData.parentName);
            if (formData.parentType) formDataPayload.append('parentType', formData.parentType);
            formDataPayload.append('relation', formData.relation);
            if (formData.nickname) formDataPayload.append('nickname', formData.nickname);
            if (formData.birthDate) formDataPayload.append('birthDate', formData.birthDate);
            if (formData.phone) formDataPayload.append('phone', formData.phone);
            if (formData.whatsapp) formDataPayload.append('whatsapp', formData.whatsapp);
            if (formData.bio) formDataPayload.append('bio', formData.bio);
            if (formData.skills && formData.skills.length > 0) {
                formDataPayload.append('skills', JSON.stringify(formData.skills));
            }
            if (photoFile) {
                formDataPayload.append('photo', photoFile); // 'photo' matches backend
            }

            const res = await fetch('/api/registration-request', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Do NOT set Content-Type header when using FormData; browser sets it automatically with boundary
                },
                body: formDataPayload
            });

            if (res.ok) {
                setStep(5); // Success step
            } else {
                const data = await res.json();
                setMessage(data.error || 'Error al enviar solicitud');
            }
        } catch (err) {
            setMessage('Error de conexión - Intenta nuevamente');
            console.error(err);
        }

        setLoading(false);
    };

    const selectedBranch = branches.find(b => b.id === formData.grandparentId);

    return (
        <div className="onboarding-screen">
            {/* Progress Bar */}
            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(step / 5) * 100}%` }}></div>
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

                {/* Step 2: Parent Info / Relation */}
                {step === 2 && (
                    <div className="onboarding-step">
                        <button className="back-link" onClick={() => setStep(1)}>← Atrás</button>

                        <div className="selected-branch" style={{ borderColor: selectedBranch?.color }}>
                            <span>Rama de</span>
                            <strong>{selectedBranch?.name}</strong>
                        </div>

                        {/* First ask for relation type */}
                        <h2 className="question">¿Cuál es tu relación con {selectedBranch?.name?.split(' ')[0]}?</h2>
                        <div className="relation-options">
                            <button
                                className={`relation-btn ${formData.relation === 'CHILD' ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, relation: 'CHILD', parentName: selectedBranch?.name || '' })}
                            >
                                👶 Hijo/a directo
                            </button>
                            <button
                                className={`relation-btn ${formData.relation === 'GRANDCHILD' ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, relation: 'GRANDCHILD' })}
                            >
                                🧒 Nieto/a
                            </button>
                            <button
                                className={`relation-btn ${formData.relation === 'GREAT_GRANDCHILD' ? 'active' : ''}`}
                                onClick={() => setFormData({ ...formData, relation: 'GREAT_GRANDCHILD' })}
                            >
                                👶 Bisnieto/a
                            </button>
                        </div>

                        {/* Only show parent info if NOT a direct child */}
                        {formData.relation !== 'CHILD' && (
                            <>
                                <h3 className="sub-question">¿Cómo se llama tu papá o mamá?</h3>
                                <p className="step-hint">El que sea hijo/a de {selectedBranch?.name?.split(' ')[0]}</p>

                                <input
                                    type="text"
                                    className="text-input"
                                    placeholder="Ej: María García"
                                    value={formData.parentName}
                                    onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                                />

                                <h3 className="sub-question">¿Es tu padre o madre?</h3>
                                <div className="relation-options">
                                    <button
                                        className={`relation-btn ${formData.parentType === 'MOTHER' ? 'active' : ''}`}
                                        onClick={() => setFormData({ ...formData, parentType: 'MOTHER' })}
                                    >
                                        👩 Madre
                                    </button>
                                    <button
                                        className={`relation-btn ${formData.parentType === 'FATHER' ? 'active' : ''}`}
                                        onClick={() => setFormData({ ...formData, parentType: 'FATHER' })}
                                    >
                                        👨 Padre
                                    </button>
                                </div>
                            </>
                        )}

                        <button
                            className="next-btn"
                            disabled={formData.relation !== 'CHILD' && !formData.parentName}
                            onClick={() => setStep(3)}
                        >
                            Continuar →
                        </button>
                    </div>
                )}

                {/* Step 3: Personal Info + Nickname */}
                {step === 3 && (
                    <div className="onboarding-step">
                        <button className="back-link" onClick={() => setStep(2)}>← Atrás</button>

                        <h2 className="question">Más sobre ti</h2>
                        <p className="step-hint">Cuéntanos quién eres y sube tu mejor foto</p>

                        <div className="form-group photo-upload-section">
                            <div className="photo-preview-wrapper" onClick={() => document.getElementById('photo-upload')?.click()}>
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Tu foto" className="photo-preview-img" />
                                ) : (
                                    <div className="photo-placeholder">
                                        <span>📷</span>
                                        <small>Subir Foto</small>
                                    </div>
                                )}
                            </div>
                            <input
                                id="photo-upload"
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                style={{ display: 'none' }}
                                aria-label="Subir foto de perfil"
                            />
                            {photoFile && <button className="remove-photo-btn" onClick={() => {
                                setPhotoFile(null);
                                setPhotoPreview(null);
                            }}>Quitar foto</button>}
                        </div>

                        <div className="form-group">
                            <label>Apodo (¿Cómo te dicen?)</label>
                            <input
                                type="text"
                                className="text-input"
                                placeholder="Ej: Juancito, La rubia..."
                                value={formData.nickname}
                                onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                            />
                        </div>

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

                        <button
                            className="next-btn"
                            onClick={() => setStep(4)}
                        >
                            Continuar →
                        </button>
                    </div>
                )}

                {/* Step 4: Superpowers (Skills) */}
                {step === 4 && (
                    <div className="onboarding-step">
                        <button className="back-link" onClick={() => setStep(3)}>← Atrás</button>

                        <h2 className="question">Tus Superpoderes ⚡</h2>
                        <p className="step-hint">Selecciona tus fortalezas y bondades (Multiselección)</p>

                        <div className="skills-grid">
                            {SKILLS_LIST.map(skill => (
                                <button
                                    key={skill}
                                    className={`skill-tag ${formData.skills.includes(skill) ? 'selected' : ''}`}
                                    onClick={() => toggleSkill(skill)}
                                >
                                    {skill}
                                </button>
                            ))}
                        </div>

                        <div className="form-group" style={{ marginTop: '2rem' }}>
                            <label>Algo más que quieras contar (Bio)</label>
                            <textarea
                                className="text-input textarea"
                                placeholder="Me encanta organizar eventos..."
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

                {/* Step 5: Success */}
                {step === 5 && (
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
                            <p><strong>{formData.parentType === 'FATHER' ? 'Padre' : 'Madre'}:</strong> {formData.parentName}</p>
                            <p><strong>Relación:</strong> {
                                formData.relation === 'GRANDCHILD' ? 'Nieto/a' :
                                    formData.relation === 'GREAT_GRANDCHILD' ? 'Bisnieto/a' :
                                        formData.relation === 'CHILD' ? 'Hijo/a directo' : formData.relation
                            }</p>
                            {formData.nickname && <p><strong>Apodo:</strong> {formData.nickname}</p>}
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
