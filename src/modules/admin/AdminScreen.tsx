import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const [activeTab, setActiveTab] = useState<'claims' | 'registrations' | 'users' | 'members' | 'stats'>('stats');
    const [claims, setClaims] = useState<PendingClaim[]>([]);
    const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
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
            const headers = { 'Authorization': `Bearer ${token}` };
            if (activeTab === 'stats') {
                const res = await fetch('/api/admin/stats', { headers });
                if (res.ok) setStats(await res.json());
            } else if (activeTab === 'claims') {
                const res = await fetch('/api/admin/claims', { headers });
                if (res.ok) setClaims(await res.json());
            } else if (activeTab === 'registrations') {
                const res = await fetch('/api/admin/registrations', { headers });
                if (res.ok) setRegistrations(await res.json());
            } else if (activeTab === 'users') {
                const res = await fetch('/api/admin/users', { headers });
                if (res.ok) setUsers(await res.json());
            } else if (activeTab === 'members') {
                const res = await fetch('/api/admin/members', { headers });
                if (res.ok) setMembers(await res.json());
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
            const res = await fetch(`/api/admin/claims/${id}/approve`, {
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
                    </>
                )}
            </div>

            <FloatingDock />
        </div>
    );
};
