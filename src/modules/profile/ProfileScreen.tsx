import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfileScreen.css';
import { EditProfileModal } from '../home/components/EditProfileModal';

interface FamilyMember {
    id: string;
    name: string;
    nickname?: string;
    birthDate?: string;
    phone?: string;
    whatsapp?: string;
    bio?: string;
    skills?: string[];
    branchId?: string; // Add this
    branch?: { id: string; name: string; color: string }; // Update this
    relation: string;
    isPatriarch?: boolean;
    children?: { id: string; name: string; birthDate?: string }[];
    preferredColor?: string;
    expectedChildCount?: number;
    userId?: string;
}

export const ProfileScreen = () => {
    const navigate = useNavigate();
    const [member, setMember] = useState<FamilyMember | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        nickname: '',
        phone: '',
        whatsapp: '',
        bio: ''
    });
    const [message, setMessage] = useState('');

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.familyMember) {
                    setMember(data.familyMember);
                    setFormData({
                        nickname: data.familyMember.nickname || '',
                        phone: data.familyMember.phone || '',
                        whatsapp: data.familyMember.whatsapp || '',
                        bio: data.familyMember.bio || ''
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch profile', err);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!member) return;
        setMessage('');

        try {
            const res = await fetch(`/api/members/${member.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setMessage('✅ Perfil actualizado');
                setEditing(false);
                fetchProfile();
            } else {
                setMessage('❌ Error al guardar');
            }
        } catch (err) {
            setMessage('❌ Error de conexión');
        }
    };

    if (loading) {
        return (
            <div className="profile-screen">
                <div className="loading">
                    <div className="loading-spinner">👤</div>
                    <p>Cargando perfil...</p>
                </div>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="profile-screen">
                <div className="profile-header">
                    <button className="back-btn" onClick={() => navigate('/app')}>←</button>
                    <h1>Mi Perfil</h1>
                </div>
                <div className="profile-content">
                    <div className="empty-profile">
                        <div className="empty-icon">🌱</div>
                        <h2>Aún no estás en el árbol</h2>
                        <p>Completa el onboarding para unirte a la familia.</p>
                        <button className="primary-btn" onClick={() => navigate('/onboarding')}>
                            Completar Registro →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const [showAddChild, setShowAddChild] = useState(false);
    const [childForm, setChildForm] = useState({ name: '', birthDate: '' });
    const [childToEdit, setChildToEdit] = useState<FamilyMember | null>(null);

    const handleAddChild = async () => {
        if (!childForm.name) return;
        try {
            const res = await fetch('/api/members/child', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(childForm)
            });
            if (res.ok) {
                setMessage('✅ Hijo/a agregado correctamente');
                setShowAddChild(false);
                setChildForm({ name: '', birthDate: '' });
                fetchProfile();
            } else {
                setMessage('❌ Error al agregar hijo');
            }
        } catch (error) {
            setMessage('❌ Error de conexión');
        }
    };

    return (
        <div className="profile-screen">
            <div className="profile-header">
                <button className="back-btn" onClick={() => navigate('/app')}>←</button>
                <h1>Mi Perfil</h1>
            </div>

            <div className="profile-content">
                {/* Avatar & Name */}
                <div className="profile-card glass-panel">
                    <div className="avatar-section">
                        <div
                            className="avatar-large"
                            style={{ backgroundColor: member.branch?.color || '#D4AF37' }}
                        >
                            {member.name.charAt(0)}
                        </div>
                        {member.isPatriarch && <span className="patriarch-badge">👑</span>}
                    </div>
                    <h2 className="profile-name">{member.name}</h2>
                    {member.nickname && <p className="profile-nickname">"{member.nickname}"</p>}
                    <div className="branch-tag" style={{ borderColor: member.branch?.color }}>
                        Rama de {member.branch?.name}
                    </div>
                </div>

                {/* Info Cards */}
                <div className="info-section">
                    {editing ? (
                        <div className="edit-form glass-panel">
                            <h3>Editar Información</h3>

                            <div className="form-group">
                                <label>Apodo</label>
                                <input
                                    type="text"
                                    className="text-input"
                                    value={formData.nickname}
                                    onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                                    placeholder="¿Cómo te dicen?"
                                />
                            </div>

                            <div className="form-group">
                                <label>Teléfono</label>
                                <input
                                    type="tel"
                                    className="text-input"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="809-000-0000"
                                />
                            </div>

                            <div className="form-group">
                                <label>WhatsApp</label>
                                <input
                                    type="tel"
                                    className="text-input"
                                    value={formData.whatsapp}
                                    onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                                    placeholder="809-000-0000"
                                />
                            </div>

                            <div className="form-group">
                                <label>Bio</label>
                                <textarea
                                    className="text-input textarea"
                                    value={formData.bio}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    placeholder="Cuéntanos sobre ti..."
                                    rows={3}
                                />
                            </div>

                            {message && <p className="message">{message}</p>}

                            <div className="form-actions">
                                <button className="cancel-btn" onClick={() => setEditing(false)}>
                                    Cancelar
                                </button>
                                <button className="save-btn" onClick={handleSave}>
                                    💾 Guardar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="info-card glass-panel">
                            <h3>📞 Contacto</h3>
                            <p><strong>Teléfono:</strong> {member.phone || 'No registrado'}</p>
                            <p><strong>WhatsApp:</strong> {member.whatsapp || 'No registrado'}</p>
                        </div>
                    )}

                    {!editing && (
                        <>
                            {member.bio && (
                                <div className="info-card glass-panel">
                                    <h3>📝 Bio</h3>
                                    <p>{member.bio}</p>
                                </div>
                            )}

                            {member.skills && member.skills.length > 0 && (
                                <div className="info-card glass-panel">
                                    <h3>⚡ Superpoderes</h3>
                                    <div className="skills-list">
                                        {member.skills.map(skill => (
                                            <span key={skill} className="skill-badge">{skill}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button className="edit-btn" onClick={() => setEditing(true)}>
                                ✏️ Editar Perfil
                            </button>
                        </>
                    )}
                </div>

                {/* Children Section - Moved Outside for Visibility */}
                <div className="info-card glass-panel children-section">
                    <div className="section-header">
                        <h3>👶 Mis Hijos ({member.children?.length || 0})</h3>
                        <button className="add-mini-btn" onClick={() => setShowAddChild(!showAddChild)}>
                            {showAddChild ? '✕' : '+'}
                        </button>
                    </div>

                    {showAddChild && (
                        <div className="add-child-form">
                            <input
                                type="text"
                                placeholder="Nombre completo"
                                className="text-input"
                                value={childForm.name}
                                onChange={e => setChildForm({ ...childForm, name: e.target.value })}
                            />
                            <input
                                type="date"
                                className="text-input"
                                value={childForm.birthDate}
                                onChange={e => setChildForm({ ...childForm, birthDate: e.target.value })}
                            />
                            <button className="save-mini-btn" onClick={handleAddChild}>Guardar</button>
                        </div>
                    )}

                    <div className="children-list">
                        {member.children && member.children.length > 0 ? (
                            <div className="children-grid">
                                {member.children.map(child => (
                                    <div key={child.id} className="child-card">
                                        <div className="child-card-header" style={{ backgroundColor: member.branch?.color || '#ccc' }}>
                                            <span className="child-initial">{child.name[0]}</span>
                                        </div>
                                        <div className="child-card-body">
                                            <h4 className="child-name">{child.name}</h4>
                                            {child.birthDate && <p className="child-age">
                                                {new Date().getFullYear() - new Date(child.birthDate).getFullYear()} años
                                            </p>}
                                            <button
                                                className="edit-child-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Load details
                                                    const tempChild: any = {
                                                        ...child,
                                                        nickname: '',
                                                        phone: '',
                                                        whatsapp: '',
                                                        bio: '',
                                                        skills: [],
                                                        branch: member.branch,
                                                        branchId: member.branch?.id || '',
                                                        relation: 'CHILD'
                                                    };
                                                    setChildToEdit(tempChild);
                                                }}
                                            >
                                                Editar Perfil
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-children">
                                <span className="empty-icon">👶</span>
                                <p>Aún no has registrado hijos</p>
                                <button className="add-first-child-btn" onClick={() => setShowAddChild(true)}>
                                    Registrar Primero
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Reuse EditProfileModal for Children */}
                {childToEdit && (
                    <div style={{ position: 'fixed', zIndex: 9999 }}>
                        <EditProfileModal
                            isOpen={true}
                            onClose={() => setChildToEdit(null)}
                            member={childToEdit as any}
                            onSuccess={() => {
                                setChildToEdit(null);
                                fetchProfile(); // Refresh list
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
