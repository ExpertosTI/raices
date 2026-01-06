import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EditProfileModal } from '../home/components/EditProfileModal';
import { useConfirm } from '../../components/ConfirmDialog';
import { FloatingDock } from '../../components/FloatingDock';
import './AdminScreen.css';

interface PendingClaim {
    id: string;
    status: string;
    createdAt: string;
    user: { id: string; email: string; name: string; image?: string };
    member: { id: string; name: string; birthDate: string; relation: string };
}

interface RegistrationRequest {
    id: string;
    name: string;
    parentName: string;
    parentType?: 'FATHER' | 'MOTHER';
    status: string;
    createdAt: string;
    user: { id: string; email: string; name: string; image?: string };
    branch: { id: string; name: string; color: string };
}

interface FamilyVerificationRequest {
    id: string;
    childName: string;
    message?: string;
    status: string;
    createdAt: string;
    requester: { id: string; email: string; name: string; image?: string };
    parentMember: { id: string; name: string; branch?: { name: string; color: string } };
}

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    image?: string;
    familyMember?: { id: string; name: string; relation: string };
}

export const AdminScreen = () => {
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [activeTab, setActiveTab] = useState<'claims' | 'registrations' | 'verifications' | 'users' | 'members' | 'stats' | 'settings' | 'events'>('stats');
    const [founders, setFounders] = useState<any[]>([]);
    const [patriarchs, setPatriarchs] = useState<any[]>([]);
    const [inputModal, setInputModal] = useState<{
        show: boolean;
        title: string;
        placeholder: string;
        onConfirm: (val: string) => void;
    } | null>(null);

    // Edit Profile Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingMember, setEditingMember] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<any>(null);
    const [claims, setClaims] = useState<PendingClaim[]>([]);
    const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
    const [verifications, setVerifications] = useState<FamilyVerificationRequest[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token} ` };
            if (activeTab === 'stats') {
                const res = await fetch('/api/admin/stats', { headers });
                if (res.ok) setStats(await res.json());
            } else if (activeTab === 'claims') {
                const res = await fetch('/api/admin/claims', { headers });
                if (res.ok) setClaims(await res.json());
            } else if (activeTab === 'registrations') {
                const res = await fetch('/api/admin/registrations', { headers });
                if (res.ok) setRegistrations(await res.json());
            } else if (activeTab === 'verifications') {
                const res = await fetch('/api/verification/admin', { headers });
                if (res.ok) setVerifications(await res.json());
            } else if (activeTab === 'users') {
                const res = await fetch('/api/admin/users', { headers });
                if (res.ok) setUsers(await res.json());
            } else if (activeTab === 'members') {
                const res = await fetch('/api/admin/members', { headers });
                if (res.ok) setMembers(await res.json());
            } else if (activeTab === 'settings') {
                const [foundersRes, patriarchsRes] = await Promise.all([
                    fetch('/api/members?relation=SIBLING', { headers }),
                    fetch('/api/members?relation=PATRIARCH', { headers })
                ]);

                if (foundersRes.ok) setFounders(await foundersRes.json());
                if (patriarchsRes.ok) setPatriarchs(await patriarchsRes.json());
            } else if (activeTab === 'events') {
                const res = await fetch('/api/events', { headers });
                if (res.ok) {
                    const data = await res.json();
                    setEvents(data.filter((e: any) => !e.isAutomatic));
                }
            }
        } catch (err) {
            console.error('Failed to fetch data', err);
        }
        setLoading(false);
    };

    const handleDeleteMember = async (id: string) => {
        const confirmed = await confirm('¿Seguro que deseas eliminar este miembro? Esta acción es irreversible.');
        if (!confirmed) return;
        try {
            const res = await fetch(`/api/admin/members/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setMessage('✅ Miembro eliminado');
                fetchData();
            } else {
                setMessage('❌ Error al eliminar');
            }
        } catch (err) {
            setMessage('❌ Error de conexión');
        }
    };

    const handleApproveClaim = async (id: string) => {
        try {
            const res = await fetch(`/ api / admin / claims / ${id}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setMessage('✅ Reclamo aprobado');
                fetchData();
            }
        } catch (err) {
            setMessage('❌ Error al aprobar');
        }
    };

    const handleRejectClaim = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/claims/${id}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: 'No verificado' })
            });
            if (res.ok) {
                setMessage('❌ Reclamo rechazado');
                fetchData();
            }
        } catch (err) {
            setMessage('Error al rechazar');
        }
    };

    const handleApproveRegistration = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/registrations/${id}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setMessage('✅ Registro aprobado');
                fetchData();
            } else {
                const data = await res.json();
                setMessage(`❌ Error: ${data.error || 'No se pudo aprobar'}`);
            }
        } catch (err) {
            setMessage('❌ Error de conexión');
        }
    };

    const handleRejectRegistration = async (id: string) => {
        const confirmed = await confirm('¿Seguro que deseas rechazar este registro?');
        if (!confirmed) return;
        try {
            const res = await fetch(`/api/admin/registrations/${id}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: 'Información no verificada' })
            });
            if (res.ok) {
                setMessage('❌ Registro rechazado');
                fetchData();
            }
        } catch (err) {
            setMessage('Error al rechazar');
        }
    };

    const handleChangeRole = async (userId: string, newRole: string) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) {
                setMessage(`✅ Rol actualizado a ${newRole}`);
                fetchData();
            }
        } catch (err) {
            setMessage('❌ Error al cambiar rol');
        }
    };

    const handleUnclaimUser = async (memberId: string) => {
        const confirmed = await confirm('¿Seguro que deseas desvincular este perfil del usuario?');
        if (!confirmed) return;
        try {
            const res = await fetch(`/api/admin/members/${memberId}/unclaim`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setMessage('✅ Perfil desvinculado correctamente');
                fetchData();
            } else {
                setMessage('❌ Error al desvincular');
            }
        } catch (err) {
            setMessage('❌ Error de conexión');
        }
    };

    return (
        <div className="admin-screen">
            <header className="admin-header">
                <button className="back-btn" onClick={() => navigate('/app')}>
                    ← Volver
                </button>
                <h1 className="admin-title">Panel de Administración</h1>
            </header>

            {/* Tabs */}
            <div className="admin-tabs">
                <button
                    className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stats')}
                >
                    📊 Dashboard
                </button>
                <button
                    className={`tab-btn ${activeTab === 'claims' ? 'active' : ''}`}
                    onClick={() => setActiveTab('claims')}
                >
                    Reclamos ({claims.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'registrations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('registrations')}
                >
                    Registros ({registrations.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'verifications' ? 'active' : ''}`}
                    onClick={() => setActiveTab('verifications')}
                >
                    Verificaciones ({verifications.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    Usuarios
                </button>
                <button
                    className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
                    onClick={() => setActiveTab('members')}
                >
                    Miembros ({members.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    ⚙️ Configuración
                </button>
                <button
                    className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                    onClick={() => setActiveTab('events')}
                >
                    📅 Eventos
                </button>
            </div>

            {message && <div className="admin-message">{message}</div>}

            <div className="admin-content">
                {loading ? (
                    <div className="loading">Cargando...</div>
                ) : (
                    <>
                        {/* Stats Dashboard Tab */}
                        {activeTab === 'stats' && stats && (
                            <div className="stats-dashboard">
                                <div className="stat-cards">
                                    <div className="stat-card">
                                        <div className="stat-number">{stats.totalMembers}</div>
                                        <div className="stat-label">Miembros</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-number">{stats.totalUsers}</div>
                                        <div className="stat-label">Usuarios</div>
                                    </div>
                                    <div className="stat-card pending">
                                        <div className="stat-number">{stats.pendingRegistrations}</div>
                                        <div className="stat-label">Pendientes</div>
                                    </div>
                                </div>

                                <div className="branch-chart glass-panel">
                                    <h3>Miembros por Rama</h3>
                                    {stats.membersPerBranch?.map((branch: any) => (
                                        <div key={branch.name} className="branch-bar-row">
                                            <span className="branch-label">{branch.name.split(' ')[0]}</span>
                                            <div className="branch-bar-track">
                                                <div
                                                    className="branch-bar-fill"
                                                    style={{
                                                        width: `${Math.max(5, (branch.count / (stats.totalMembers || 1)) * 100)}%`,
                                                        backgroundColor: branch.color
                                                    }}
                                                />
                                            </div>
                                            <span className="branch-count">{branch.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Claims Tab */}
                        {activeTab === 'claims' && (
                            <div className="admin-list">
                                {claims.length === 0 ? (
                                    <p className="empty-msg">No hay reclamos pendientes</p>
                                ) : (
                                    claims.map(claim => (
                                        <div key={claim.id} className="admin-card">
                                            <div className="card-header">
                                                <img src={claim.user.image || '/img/avatar.png'} alt="" className="card-avatar" />
                                                <div>
                                                    <h3>{claim.user.name || claim.user.email}</h3>
                                                    <p>Quiere ser: <strong>{claim.member.name}</strong></p>
                                                </div>
                                            </div>
                                            <div className="card-actions">
                                                <button className="approve-btn" onClick={() => handleApproveClaim(claim.id)}>
                                                    ✅ Aprobar
                                                </button>
                                                <button className="reject-btn" onClick={() => handleRejectClaim(claim.id)}>
                                                    ❌ Rechazar
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Registrations Tab */}
                        {activeTab === 'registrations' && (
                            <div className="admin-list">
                                {registrations.length === 0 ? (
                                    <p className="empty-msg">No hay registros pendientes</p>
                                ) : (
                                    registrations.map(reg => (
                                        <div key={reg.id} className="admin-card">
                                            <div className="card-header">
                                                <div className="branch-badge" style={{ backgroundColor: reg.branch.color }}>
                                                    {reg.branch.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3>{reg.name}</h3>
                                                    <p>Rama: <strong>{reg.branch.name}</strong></p>
                                                    {reg.parentName && (
                                                        <p>
                                                            {reg.parentType === 'FATHER' ? '👨 Padre' : '👩 Madre'}: {reg.parentName}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="card-actions">
                                                <button className="approve-btn" onClick={() => handleApproveRegistration(reg.id)}>
                                                    ✅ Aprobar
                                                </button>
                                                <button className="reject-btn" onClick={() => handleRejectRegistration(reg.id)}>
                                                    ❌ Rechazar
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Verifications Tab */}
                        {activeTab === 'verifications' && (
                            <div className="claims-list">
                                {verifications.length === 0 ? (
                                    <div className="empty-state">No hay verificaciones pendientes de revisión administrativa</div>
                                ) : (
                                    verifications.map(req => (
                                        <div key={req.id} className="claim-card">
                                            <div className="claim-header">
                                                <div className="claim-user">
                                                    {req.requester.image ? (
                                                        <img src={req.requester.image} alt={req.requester.name} />
                                                    ) : (
                                                        <div className="user-avatar-placeholder">{req.requester.name[0]}</div>
                                                    )}
                                                    <div>
                                                        <h4>{req.requester.name}</h4>
                                                        <span>{req.requester.email}</span>
                                                    </div>
                                                </div>
                                                <span className={`status-badge ${req.status.toLowerCase()}`}>
                                                    {req.status}
                                                </span>
                                            </div>

                                            <div className="claim-details">
                                                <div className="detail-row">
                                                    <span className="label">Solicita ser hijo/a de:</span>
                                                    <span className="value" style={{ color: req.parentMember?.branch?.color }}>
                                                        {req.parentMember?.name} ({req.parentMember?.branch?.name})
                                                    </span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="label">Nombre solicitado:</span>
                                                    <span className="value">{req.childName}</span>
                                                </div>
                                                {req.message && (
                                                    <div className="detail-row">
                                                        <span className="label">Mensaje:</span>
                                                        <span className="value">"{req.message}"</span>
                                                    </div>
                                                )}
                                                <div className="claim-date">
                                                    Solicitado el {new Date(req.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>

                                            <div className="claim-actions">
                                                <button
                                                    className="reject-btn"
                                                    onClick={async () => {
                                                        const confirmReject = await confirm('¿Rechazar solicitud?');
                                                        if (!confirmReject) return;
                                                        await fetch(`/api/verification/${req.id}/reject`, {
                                                            method: 'POST',
                                                            headers: { 'Authorization': `Bearer ${token}` }
                                                        });
                                                        fetchData();
                                                    }}
                                                >
                                                    ✕ Rechazar
                                                </button>
                                                <button
                                                    className="approve-btn"
                                                    onClick={async () => {
                                                        await fetch(`/api/verification/${req.id}/approve`, {
                                                            method: 'POST',
                                                            headers: { 'Authorization': `Bearer ${token}` }
                                                        });
                                                        fetchData();
                                                    }}
                                                >
                                                    ✓ Aprobar Manualmente
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Users Tab */}
                        {activeTab === 'users' && (
                            <div className="admin-list">
                                {users.map(user => (
                                    <div key={user.id} className="admin-card user-card">
                                        <div className="card-header">
                                            <img src={user.image || '/img/avatar.png'} alt="" className="card-avatar" />
                                            <div>
                                                <h3>{user.name || user.email}</h3>
                                                <p className={`role-badge ${user.role.toLowerCase()}`}>
                                                    {user.role}
                                                </p>
                                                {user.familyMember && (
                                                    <p className="linked-member">
                                                        Vinculado: {user.familyMember.name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="card-actions">
                                            {user.familyMember && (
                                                <button
                                                    className="reject-btn"
                                                    onClick={() => handleUnclaimUser(user.familyMember!.id)}
                                                >
                                                    🔗 Desvincular
                                                </button>
                                            )}
                                            {user.role === 'MEMBER' ? (
                                                <button
                                                    className="role-btn promote"
                                                    onClick={() => handleChangeRole(user.id, 'PATRIARCH')}
                                                >
                                                    Promover a Patriarca
                                                </button>
                                            ) : (
                                                <button
                                                    className="role-btn demote"
                                                    onClick={() => handleChangeRole(user.id, 'MEMBER')}
                                                >
                                                    Degradar a Miembro
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Members Tab (Audit) */}
                        {activeTab === 'members' && (
                            <div className="admin-list">
                                {members.map(member => (
                                    <div key={member.id} className="admin-card">
                                        <div className="card-header">
                                            <div className="branch-badge" style={{ backgroundColor: member.branch?.color }}>
                                                {member.branch?.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3>{member.name}</h3>
                                                <p>Rama: <strong>{member.branch?.name}</strong></p>
                                                <p style={{ fontSize: '0.8rem', color: '#888' }}>
                                                    {member.isPatriarch ? '👑 Patriarca' : '👤 Miembro'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="card-actions">
                                            <button className="reject-btn" onClick={() => handleDeleteMember(member.id)}>
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Settings Tab */}
                        {activeTab === 'settings' && (
                            <div className="settings-panel">
                                <h2>⚙️ Configuración de la Familia</h2>

                                {/* Section 1: Los Patriarcas */}
                                <div className="settings-group patriarch-section">
                                    <div className="section-header">
                                        <span className="section-icon">👴👵</span>
                                        <div>
                                            <h3>Los Patriarcas</h3>
                                            <p className="settings-desc">
                                                <strong>Papá y Mamá</strong> - Los padres de los 12 hermanos.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="founders-grid patriarch-grid">
                                        {patriarchs.map(patriarch => (
                                            <div key={patriarch.id} className="founder-card patriarch-card" onClick={() => {
                                                setEditingMember(patriarch);
                                                setShowEditModal(true);
                                            }}>
                                                <div className="patriarch-badge">👑</div>
                                                <div className="founder-avatar" style={{ borderColor: '#D4AF37' }}>
                                                    {patriarch.photo ? (
                                                        <img src={patriarch.photo} alt={patriarch.name} />
                                                    ) : (
                                                        <span>{patriarch.name.charAt(0)}</span>
                                                    )}
                                                    <label className="photo-upload-btn" title="Cambiar foto">
                                                        📷
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            style={{ display: 'none' }}
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                const formData = new FormData();
                                                                formData.append('photo', file);
                                                                try {
                                                                    const res = await fetch(`/api/members/${patriarch.id}/photo`, {
                                                                        method: 'POST',
                                                                        headers: { 'Authorization': `Bearer ${token}` },
                                                                        body: formData
                                                                    });
                                                                    if (res.ok) {
                                                                        setMessage('✅ Foto actualizada');
                                                                        fetchData();
                                                                    } else {
                                                                        setMessage('❌ Error al subir foto');
                                                                    }
                                                                } catch {
                                                                    setMessage('❌ Error de conexión');
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                                <div className="founder-info">
                                                    <input
                                                        type="text"
                                                        defaultValue={patriarch.name}
                                                        className="founder-name-input"
                                                        placeholder="Nombre del patriarca"
                                                        onBlur={async (e) => {
                                                            const newName = e.target.value.trim();
                                                            if (newName && newName !== patriarch.name) {
                                                                try {
                                                                    const res = await fetch(`/api/members/${patriarch.id}`, {
                                                                        method: 'PUT',
                                                                        headers: {
                                                                            'Authorization': `Bearer ${token}`,
                                                                            'Content-Type': 'application/json'
                                                                        },
                                                                        body: JSON.stringify({ name: newName })
                                                                    });
                                                                    if (res.ok) {
                                                                        setMessage(`✅ Nombre actualizado a "${newName}"`);
                                                                        fetchData();
                                                                    }
                                                                } catch {
                                                                    setMessage('❌ Error al actualizar nombre');
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <span className="founder-role">Patriarca</span>
                                                </div>
                                                <button
                                                    className="delete-founder-btn"
                                                    title="Eliminar"
                                                    onClick={async () => {
                                                        const confirmed = await confirm(
                                                            `¿Estás seguro de eliminar a ${patriarch.name}?`,
                                                            'Eliminar Patriarca'
                                                        );
                                                        if (confirmed) {
                                                            handleDeleteMember(patriarch.id);
                                                        }
                                                    }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        ))}

                                        {/* Add New Patriarch Button */}
                                        <div
                                            className="founder-card add-new-card"
                                            onClick={() => {
                                                setInputModal({
                                                    show: true,
                                                    title: 'Agregar Patriarca',
                                                    placeholder: 'Nombre (ej: Papá Juan)',
                                                    onConfirm: async (name) => {
                                                        try {
                                                            const res = await fetch('/api/members', {
                                                                method: 'POST',
                                                                headers: {
                                                                    'Authorization': `Bearer ${token}`,
                                                                    'Content-Type': 'application/json'
                                                                },
                                                                body: JSON.stringify({
                                                                    name: name.trim(),
                                                                    relation: 'PATRIARCH',
                                                                    isPatriarch: true
                                                                })
                                                            });
                                                            if (res.ok) {
                                                                setMessage(`✅ Patriarca "${name}" agregado`);
                                                                fetchData();
                                                                setInputModal(null);
                                                            } else {
                                                                setMessage('❌ Error al agregar');
                                                            }
                                                        } catch {
                                                            setMessage('❌ Error de conexión');
                                                        }
                                                    }
                                                });
                                            }}
                                        >
                                            <div className="add-icon">➕</div>
                                            <span>Agregar Patriarca</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Los 12 Hermanos/Fundadores */}
                                <div className="settings-group founders-section">
                                    <div className="section-header">
                                        <span className="section-icon">👨‍👩‍👧‍👦</span>
                                        <div>
                                            <h3>Los 12 Hermanos</h3>
                                            <p className="settings-desc">
                                                <strong>Los hijos de los patriarcas</strong> - Cada uno representa una rama
                                                del árbol familiar con su propio color distintivo.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="founders-grid siblings-grid">
                                        {founders.map(founder => (
                                            <div key={founder.id} className="founder-card" onClick={() => {
                                                setEditingMember(founder);
                                                setShowEditModal(true);
                                            }}>
                                                <div className="founder-avatar" style={{ borderColor: founder.branch?.color || '#D4AF37' }}>
                                                    {founder.photo ? (
                                                        <img src={founder.photo} alt={founder.name} />
                                                    ) : (
                                                        <span>{founder.name.charAt(0)}</span>
                                                    )}
                                                    <label className="photo-upload-btn" title="Cambiar foto">
                                                        📷
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            style={{ display: 'none' }}
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                const formData = new FormData();
                                                                formData.append('photo', file);
                                                                try {
                                                                    const res = await fetch(`/api/members/${founder.id}/photo`, {
                                                                        method: 'POST',
                                                                        headers: { 'Authorization': `Bearer ${token}` },
                                                                        body: formData
                                                                    });
                                                                    if (res.ok) {
                                                                        setMessage('✅ Foto actualizada');
                                                                        fetchData();
                                                                    } else {
                                                                        setMessage('❌ Error al subir foto');
                                                                    }
                                                                } catch {
                                                                    setMessage('❌ Error de conexión');
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                                <div className="founder-info">
                                                    <input
                                                        type="text"
                                                        defaultValue={founder.name}
                                                        className="founder-name-input"
                                                        onBlur={async (e) => {
                                                            const newName = e.target.value.trim();
                                                            if (newName && newName !== founder.name) {
                                                                try {
                                                                    const res = await fetch(`/api/members/${founder.id}`, {
                                                                        method: 'PUT',
                                                                        headers: {
                                                                            'Authorization': `Bearer ${token}`,
                                                                            'Content-Type': 'application/json'
                                                                        },
                                                                        body: JSON.stringify({ name: newName })
                                                                    });
                                                                    if (res.ok) {
                                                                        setMessage(`✅ Nombre actualizado a "${newName}"`);
                                                                        fetchData();
                                                                    }
                                                                } catch {
                                                                    setMessage('❌ Error al actualizar nombre');
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <span className="founder-branch" style={{ color: founder.branch?.color }}>
                                                        {founder.branch?.name || 'Sin rama'}
                                                    </span>
                                                </div>
                                                <button
                                                    className="delete-founder-btn"
                                                    title="Eliminar"
                                                    onClick={async () => {
                                                        const confirmed = await confirm(
                                                            `¿Estás seguro de eliminar a ${founder.name}?`,
                                                            'Eliminar Fundador'
                                                        );
                                                        if (confirmed) {
                                                            handleDeleteMember(founder.id);
                                                        }
                                                    }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        ))}

                                        {/* Add New Founder Button */}
                                        <div
                                            className="founder-card add-new-card"
                                            onClick={() => {
                                                setInputModal({
                                                    show: true,
                                                    title: 'Nuevo Fundador (Rama)',
                                                    placeholder: 'Nombre del fundador',
                                                    onConfirm: async (name) => {
                                                        try {
                                                            const res = await fetch('/api/members', {
                                                                method: 'POST',
                                                                headers: {
                                                                    'Authorization': `Bearer ${token}`,
                                                                    'Content-Type': 'application/json'
                                                                },
                                                                body: JSON.stringify({
                                                                    name: name,
                                                                    relation: 'SIBLING'
                                                                })
                                                            });
                                                            if (res.ok) {
                                                                setMessage(`✅ Fundador "${name}" agregado`);
                                                                fetchData();
                                                                setInputModal(null);
                                                            } else {
                                                                setMessage('❌ Error al agregar');
                                                            }
                                                        } catch {
                                                            setMessage('❌ Error de conexión');
                                                        }
                                                    }
                                                });
                                            }}
                                        >
                                            <div className="add-icon">➕</div>
                                            <span>Agregar Fundador</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Events Tab */}
                        {activeTab === 'events' && (
                            <div className="events-admin-section">
                                <div className="events-header-row">
                                    <h2>📅 Gestión de Eventos</h2>
                                    <button
                                        className="add-event-btn"
                                        onClick={() => { setEditingEvent(null); setShowEventModal(true); }}
                                    >
                                        + Crear Evento
                                    </button>
                                </div>

                                {events.length === 0 ? (
                                    <div className="empty-msg">No hay eventos creados. Crea el primero.</div>
                                ) : (
                                    <div className="events-list">
                                        {events.map(event => (
                                            <div key={event.id} className="event-admin-card">
                                                <div className="event-date-box">
                                                    <span className="event-day">{new Date(event.date).getDate()}</span>
                                                    <span className="event-month">{new Date(event.date).toLocaleDateString('es', { month: 'short' })}</span>
                                                </div>
                                                <div className="event-info">
                                                    <h4>{event.title}</h4>
                                                    <p>{event.type} {event.location && `• ${event.location}`}</p>
                                                </div>
                                                <div className="event-actions">
                                                    <button
                                                        className="edit-btn"
                                                        onClick={() => { setEditingEvent(event); setShowEventModal(true); }}
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        className="reject-btn"
                                                        onClick={async () => {
                                                            const ok = await confirm('¿Eliminar este evento?');
                                                            if (!ok) return;
                                                            try {
                                                                const res = await fetch(`/api/events/${event.id}`, {
                                                                    method: 'DELETE',
                                                                    headers: { 'Authorization': `Bearer ${token}` }
                                                                });
                                                                if (res.ok) {
                                                                    setMessage('✅ Evento eliminado');
                                                                    fetchData();
                                                                }
                                                            } catch { setMessage('❌ Error'); }
                                                        }}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Event Modal */}
                                {showEventModal && (
                                    <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
                                        <div className="modal-content event-modal" onClick={e => e.stopPropagation()}>
                                            <h3>{editingEvent ? 'Editar Evento' : 'Nuevo Evento'}</h3>
                                            <form onSubmit={async (e) => {
                                                e.preventDefault();
                                                const form = e.target as HTMLFormElement;
                                                const formData = new FormData(form);

                                                const url = editingEvent
                                                    ? `/api/events/${editingEvent.id}`
                                                    : '/api/events';
                                                const method = editingEvent ? 'PUT' : 'POST';

                                                try {
                                                    const res = await fetch(url, {
                                                        method,
                                                        headers: {
                                                            'Authorization': `Bearer ${token}`,
                                                            'Content-Type': 'application/json'
                                                        },
                                                        body: JSON.stringify({
                                                            title: formData.get('title'),
                                                            description: formData.get('description'),
                                                            date: formData.get('date'),
                                                            type: formData.get('type'),
                                                            location: formData.get('location')
                                                        })
                                                    });
                                                    if (res.ok) {
                                                        setMessage(editingEvent ? '✅ Evento actualizado' : '✅ Evento creado');
                                                        setShowEventModal(false);
                                                        fetchData();
                                                    } else {
                                                        setMessage('❌ Error al guardar');
                                                    }
                                                } catch { setMessage('❌ Error de conexión'); }
                                            }}>
                                                <input
                                                    name="title"
                                                    placeholder="Título del evento"
                                                    defaultValue={editingEvent?.title || ''}
                                                    required
                                                />
                                                <textarea
                                                    name="description"
                                                    placeholder="Descripción (opcional)"
                                                    defaultValue={editingEvent?.description || ''}
                                                />
                                                <input
                                                    type="date"
                                                    name="date"
                                                    defaultValue={editingEvent?.date?.split('T')[0] || ''}
                                                    required
                                                />
                                                <select name="type" defaultValue={editingEvent?.type || 'OTHER'}>
                                                    <option value="REUNION">🏠 Reunión Familiar</option>
                                                    <option value="ANNIVERSARY">💍 Aniversario</option>
                                                    <option value="BIRTHDAY">🎂 Cumpleaños Especial</option>
                                                    <option value="MEMORIAL">🕯️ En Memoria</option>
                                                    <option value="CELEBRATION">🎉 Celebración</option>
                                                    <option value="OTHER">📌 Otro</option>
                                                </select>
                                                <input
                                                    name="location"
                                                    placeholder="Ubicación (opcional)"
                                                    defaultValue={editingEvent?.location || ''}
                                                />
                                                <div className="modal-actions">
                                                    <button type="button" className="cancel-btn" onClick={() => setShowEventModal(false)}>
                                                        Cancelar
                                                    </button>
                                                    <button type="submit" className="approve-btn">
                                                        {editingEvent ? 'Guardar' : 'Crear'}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Generic Input Modal */}
            {inputModal && (
                <div className="modal-overlay" onClick={() => setInputModal(null)}>
                    <div className="modal-content input-modal" onClick={e => e.stopPropagation()}>
                        <h3>{inputModal.title}</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const val = (e.target as any).inputVal.value;
                            if (val && val.trim()) {
                                inputModal.onConfirm(val.trim());
                            }
                        }}>
                            <input
                                name="inputVal"
                                className="text-input"
                                placeholder={inputModal.placeholder}
                                autoFocus
                                defaultValue=""
                            />
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setInputModal(null)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="approve-btn">
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Profile Modal */}
            {showEditModal && editingMember && (
                <EditProfileModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    member={editingMember}
                    onSuccess={() => {
                        fetchData();
                        setMessage('✅ Perfil actualizado');
                    }}
                />
            )}

            <FloatingDock />
        </div>
    );
};
