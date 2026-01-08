import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './OnboardingScreen.css';

interface Branch {
    id: string;
    name: string;
    color: string;
}

interface Member {
    id: string;
    name: string;
    branchId: string;
    branch?: { name: string; color: string };
    photo?: string;
}

export const OnboardingScreen = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [members, setMembers] = useState<Member[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [manualMode, setManualMode] = useState(false);

    // State
    const [formData, setFormData] = useState({
        // Personal
        nickname: '',
        birthDate: '',
        phone: '',
        whatsapp: '',
        bio: '',
        skills: [] as string[],

        // Parent Link (Preferred)
        parentMemberId: '',
        parentMemberName: '',

        // Manual Fallback
        branchId: '',
        parentName: '',
        parentType: 'MOTHER' as 'FATHER' | 'MOTHER',
        relation: 'GRANDCHILD'
    });

    // Photo
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        if (user?.familyMember && user.familyMember.id) {
            navigate('/app');
            return;
        }
        fetchData();
    }, [navigate, user?.familyMember]);

    const fetchData = async () => {
        try {
            const [membersRes, branchesRes] = await Promise.all([
                fetch('/api/members', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/branches', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (membersRes.ok) setMembers(await membersRes.json());
            if (branchesRes.ok) setBranches(await branchesRes.json());
        } catch (err) {
            console.error('Failed to fetch data', err);
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setMessage('');

        try {
            // Decision: Verification (Direct) or Registration (Manual)
            const isManual = !formData.parentMemberId;
            const endpoint = isManual ? '/api/registration-request' : '/api/verification/request';

            let payload: any;

            if (isManual) {
                // FormData for Registration
                const fd = new FormData();
                fd.append('name', user?.name || 'Usuario');
                fd.append('branchId', formData.branchId);
                fd.append('grandparentId', formData.branchId); // Legacy field
                fd.append('parentName', formData.parentName);
                fd.append('parentType', formData.parentType);
                fd.append('relation', formData.relation);

                // Add common fields
                if (formData.nickname) fd.append('nickname', formData.nickname);
                if (formData.birthDate) fd.append('birthDate', formData.birthDate);
                if (formData.phone) fd.append('phone', formData.phone);
                if (formData.whatsapp) fd.append('whatsapp', formData.whatsapp);
                if (formData.bio) fd.append('bio', formData.bio);
                if (photoFile) fd.append('photo', photoFile);

                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: fd
                });
                if (!res.ok) throw await res.json();

            } else {
                // JSON for Verification
                payload = {
                    parentMemberId: formData.parentMemberId,
                    childName: formData.nickname ? `${user?.name} (${formData.nickname})` : user?.name,
                    message: formData.bio
                };

                // Note: Verification endpoint doesn't support photo upload yet, 
                // but we can do it in a separate call if needed later, 
                // or we rely on User profile image.

                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw await res.json();
            }

            setStep(4); // Success

        } catch (err: any) {
            setMessage(err.error || 'Error al enviar solicitud');
            console.error(err);
        }
        setLoading(false);
    };

    const handleClaimProfile = async (memberId: string, memberName: string) => {
        if (!window.confirm(`¿Estás seguro que "${memberName}" es tu perfil?`)) return;

        setLoading(true);
        try {
            const res = await fetch('/api/members/claim', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ memberId })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Error al reclamar perfil');

            if (data.linked) {
                alert('✅ ¡Perfil vinculado exitosamente! Bienvenido de vuelta.');
                window.location.reload(); // Reload to refresh user context
            } else {
                setStep(4); // Success screen (pending approval)
                setMessage('Solicitud de reclamo enviada.');
            }

        } catch (err: any) {
            alert(err.message);
        }
        setLoading(false);
    };

    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="onboarding-screen">
            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(step / 4) * 100}%` }}></div>
            </div>

            <div className="onboarding-content">

                {/* Step 1: Who are you? */}
                {step === 1 && (
                    <div className="onboarding-step">
                        <div className="welcome-emoji">👋</div>
                        <h1>¡Hola, {user?.name?.split(' ')[0]}!</h1>
                        <p className="step-desc">Empecemos creando tu perfil.</p>

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
                            />
                        </div>

                        <div className="form-group">
                            <label>Apodo (Opcional)</label>
                            <input
                                type="text"
                                className="text-input"
                                placeholder="¿Cómo te dicen en la familia?"
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

                        <button className="next-btn" onClick={() => setStep(2)}>
                            Continuar →
                        </button>

                        <div style={{ marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
                            <p style={{ fontSize: '0.9rem', color: '#aaa' }}>¿Ya tienes un perfil en el árbol?</p>
                            <button
                                className="link-btn"
                                onClick={() => { setStep(0); setSearchTerm(user?.name || ''); }}
                                style={{ color: '#eb5e28' }}
                            >
                                ⚠️ Reclamar mi perfil existente
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Parent Selection (OR Step 0: Claim Mode) */}
                {(step === 2 || step === 0) && (
                    <div className="onboarding-step">
                        <button className="back-link" onClick={() => setStep(1)}>← Atrás</button>

                        {!manualMode ? (
                            <>
                                <h1>{step === 0 ? 'Encuentra tu perfil' : '¿Quién es tu padre o madre?'}</h1>
                                <p className="step-desc">
                                    {step === 0
                                        ? 'Busca tu nombre en la lista para reclamarlo.'
                                        : 'Busca a tu papá o mamá en la lista.'}
                                </p>

                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Buscar por nombre..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    autoFocus
                                />

                                {filteredMembers.slice(0, 10).map(member => (
                                    <div
                                        key={member.id}
                                        className={`member-option ${formData.parentMemberId === member.id ? 'selected' : ''}`}
                                        onClick={() => {
                                            if (manualMode) return; // Should not happen

                                            // CLAIM MODE LOGIC
                                            if (step === 0) { // Using Step 0 as "Claim Mode"
                                                handleClaimProfile(member.id, member.name);
                                                return;
                                            }

                                            setFormData({
                                                ...formData,
                                                parentMemberId: member.id,
                                                parentMemberName: member.name
                                            })
                                        }}
                                        style={{ borderLeftColor: member.branch?.color || '#ccc' }}
                                    >
                                        <div className="member-info">
                                            <strong>{member.name}</strong>
                                            <span>Rama: {member.branch?.name}</span>
                                        </div>
                                        {/* Show CHECK if selected parent, or BUTTON if Claim Mode */}
                                        {step === 0 ? (
                                            <button className="claim-btn-small">Este soy yo</button>
                                        ) : (
                                            formData.parentMemberId === member.id && <span className="check-icon">✓</span>
                                        )}
                                    </div>
                                ))}
                                {searchTerm && filteredMembers.length === 0 && (
                                    <p className="no-results">No se encontraron miembros</p>
                                )}

                                <div className="members-list-wrapper">
                                    {/* Toggle and Continue buttons for search mode */}
                                    {step === 2 && (
                                        <>
                                            <div className="toggle-mode">
                                                <p>¿No encuentras a tu padre/madre?</p>
                                                <button className="link-btn" onClick={() => setManualMode(true)}>
                                                    Ingresar manualmente
                                                </button>
                                            </div>

                                            <button
                                                className="next-btn"
                                                disabled={!formData.parentMemberId}
                                                onClick={() => setStep(3)}
                                            >
                                                Continuar →
                                            </button>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <h1>Ingreso Manual</h1>
                                <p className="step-desc">¿A qué rama de la familia perteneces?</p>

                                <div className="branches-grid mini-grid">
                                    {branches.map(branch => (
                                        <button
                                            key={branch.id}
                                            className={`branch-card ${formData.branchId === branch.id ? 'selected' : ''}`}
                                            style={{
                                                borderColor: formData.branchId === branch.id ? branch.color : 'transparent',
                                                backgroundColor: formData.branchId === branch.id ? `${branch.color}20` : undefined
                                            }}
                                            onClick={() => setFormData({ ...formData, branchId: branch.id })}
                                        >
                                            <span className="branch-initial" style={{ backgroundColor: branch.color }}>
                                                {branch.name.charAt(0)}
                                            </span>
                                            <span className="branch-name">{branch.name.split(' ')[0]}</span>
                                        </button>
                                    ))}
                                </div>

                                {formData.branchId && (
                                    <div className="manual-inputs fade-in">
                                        <div className="form-group">
                                            <label>Nombre de tu padre/madre</label>
                                            <input
                                                type="text"
                                                className="text-input"
                                                placeholder="Nombre completo"
                                                value={formData.parentName}
                                                onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                                            />
                                        </div>

                                        <div className="relation-options">
                                            <button
                                                className={`relation-btn ${formData.parentType === 'MOTHER' ? 'active' : ''}`}
                                                onClick={() => setFormData({ ...formData, parentType: 'MOTHER' })}
                                            >👩 Madre</button>
                                            <button
                                                className={`relation-btn ${formData.parentType === 'FATHER' ? 'active' : ''}`}
                                                onClick={() => setFormData({ ...formData, parentType: 'FATHER' })}
                                            >👨 Padre</button>
                                        </div>
                                    </div>
                                )}

                                <div className="toggle-mode">
                                    <button className="link-btn" onClick={() => setManualMode(false)}>
                                        Volver a buscar
                                    </button>
                                </div>

                                <button
                                    className="next-btn"
                                    disabled={!formData.branchId || !formData.parentName}
                                    onClick={() => setStep(3)}
                                >
                                    Continuar →
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Step 3: Confirmation */}
                {step === 3 && (
                    <div className="onboarding-step">
                        <button className="back-link" onClick={() => setStep(2)}>← Atrás</button>

                        <h1>Todo listo para enviar</h1>
                        <p className="step-desc">Revisa que la información sea correcta.</p>

                        <div className="summary-card">
                            <div className="summary-row">
                                <span>Nombre:</span>
                                <strong>{user?.name} {formData.nickname && `(${formData.nickname})`}</strong>
                            </div>
                            <div className="summary-row">
                                <span>Padre/Madre:</span>
                                <strong>
                                    {formData.parentMemberId ? formData.parentMemberName : formData.parentName}
                                </strong>
                            </div>
                            <div className="summary-row">
                                <span>Método:</span>
                                <span>{formData.parentMemberId ? 'Enlace Directo' : 'Solicitud Manual'}</span>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Mensaje (Opcional)</label>
                            <textarea
                                className="text-input"
                                placeholder="Algún detalle adicional..."
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
                            Hemos notificado a tu padre/madre.
                            Cuando aprueben tu solicitud, podrás acceder a todas las funciones.
                        </p>
                        <button className="next-btn" onClick={() => navigate('/app')}>
                            Ir al Inicio →
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};
