import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const [activeTab, setActiveTab] = useState<'claims' | 'registrations' | 'users' | 'members'>('claims');
    const [claims, setClaims] = useState<PendingClaim[]>([]);
    const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [members, setMembers] = useState<any[]>([]); // Use simplified type for now
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
            if (activeTab === 'claims') {
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
            }
        } catch (err) {
            setMessage('❌ Error al aprobar');
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
                                                    {reg.parentName && <p>Padre: {reg.parentName}</p>}
                                                </div>
                                            </div>
                                            <div className="card-actions">
                                                <button className="approve-btn" onClick={() => handleApproveRegistration(reg.id)}>
                                                    ✅ Aprobar
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
                                            {/* Future: Add Delete/Edit buttons here */}
                                            <button className="reject-btn" onClick={() => {
                                                if (window.confirm('¿Borrar miembro? Esto es irreversible.')) {
                                                    // Implement delete logic
                                                }
                                            }}>🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

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
                <div className="nav-item active">
                    <span>⚙️</span>
                    <span>Admin</span>
                </div>
                <div className="nav-item" onClick={() => navigate('/feed')}>
                    <span>💬</span>
                    <span>Feed</span>
                </div>
            </nav>
        </div>
    );
};
