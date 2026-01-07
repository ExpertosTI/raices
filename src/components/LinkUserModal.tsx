import { useState } from 'react';
import './LinkUserModal.css';

interface Branch {
    id: string;
    name: string;
    color: string;
}

interface LinkUserModalProps {
    user: { id: string; name: string; email: string };
    branches: Branch[];
    onClose: () => void;
    onLink: (userId: string, data: { name: string; branchId: string; relation: string }) => Promise<void>;
}

export const LinkUserModal: React.FC<LinkUserModalProps> = ({ user, branches, onClose, onLink }) => {
    const [name, setName] = useState(user.name || '');
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [relation, setRelation] = useState('CHILD');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError('El nombre es requerido');
            return;
        }
        if (!selectedBranch) {
            setError('Selecciona una rama');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await onLink(user.id, { name: name.trim(), branchId: selectedBranch, relation });
            onClose();
        } catch (e: any) {
            setError(e.message || 'Error al vincular');
        }
        setLoading(false);
    };

    return (
        <div className="link-modal-overlay" onClick={onClose}>
            <div className="link-modal" onClick={(e) => e.stopPropagation()}>
                <div className="link-modal-header">
                    <h2>🔗 Vincular a la Familia</h2>
                    <button className="link-modal-close" onClick={onClose}>×</button>
                </div>

                <div className="link-modal-body">
                    <div className="link-user-info">
                        <span className="link-user-email">{user.email}</span>
                    </div>

                    <div className="link-form-group">
                        <label>Nombre en el árbol</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nombre completo"
                        />
                    </div>

                    <div className="link-form-group">
                        <label>Selecciona la Rama</label>
                        <div className="branch-grid">
                            {branches.map((branch) => (
                                <div
                                    key={branch.id}
                                    className={`branch-option ${selectedBranch === branch.id ? 'selected' : ''}`}
                                    style={{
                                        borderColor: branch.color,
                                        backgroundColor: selectedBranch === branch.id ? `${branch.color}30` : 'transparent'
                                    }}
                                    onClick={() => setSelectedBranch(branch.id)}
                                >
                                    <div className="branch-color" style={{ backgroundColor: branch.color }}></div>
                                    <span>{branch.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="link-form-group">
                        <label>Relación</label>
                        <select value={relation} onChange={(e) => setRelation(e.target.value)}>
                            <option value="CHILD">Hijo/a</option>
                            <option value="GRANDCHILD">Nieto/a</option>
                            <option value="GREAT_GRANDCHILD">Bisnieto/a</option>
                        </select>
                    </div>

                    {error && <div className="link-error">{error}</div>}
                </div>

                <div className="link-modal-footer">
                    <button className="link-btn-cancel" onClick={onClose}>Cancelar</button>
                    <button className="link-btn-confirm" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Vinculando...' : '✅ Vincular'}
                    </button>
                </div>
            </div>
        </div>
    );
};
