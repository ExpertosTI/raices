import React from 'react';
import { Check, X, User } from 'lucide-react';
import './VerificationList.css';

interface VerificationRequest {
    id: string;
    childName: string;
    message?: string;
    requester: {
        id: string;
        name: string;
        email: string;
        image?: string;
    };
    parentMember?: {
        name: string;
    };
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ADMIN_REVIEW';
    createdAt: string;
}

interface VerificationListProps {
    requests: VerificationRequest[];
    onApprove: (id: string) => Promise<void>;
    onReject: (id: string) => Promise<void>;
    type: 'incoming' | 'outgoing';
}

export const VerificationList: React.FC<VerificationListProps> = ({ requests, onApprove, onReject, type }) => {
    if (requests.length === 0) {
        return (
            <div className="empty-verifications">
                <span className="empty-icon">✓</span>
                <p>No tienes solicitudes {type === 'incoming' ? 'pendientes' : 'enviadas'}</p>
            </div>
        );
    }

    return (
        <div className="verification-list">
            {requests.map(req => (
                <div key={req.id} className="verification-card glass-panel">
                    <div className="verification-header">
                        <div className="requester-info">
                            {req.requester.image ? (
                                <img src={req.requester.image} alt={req.requester.name} className="requester-avatar" />
                            ) : (
                                <div className="requester-avatar-placeholder">
                                    <User size={20} />
                                </div>
                            )}
                            <div>
                                <h4>{type === 'incoming' ? req.requester.name : `Para: ${req.parentMember?.name}`}</h4>
                                <span className="verification-date">
                                    {new Date(req.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        <div className={`status-badge ${req.status.toLowerCase()}`}>
                            {req.status === 'PENDING' ? 'Pendiente' :
                                req.status === 'APPROVED' ? 'Aprobado' :
                                    req.status === 'REJECTED' ? 'Rechazado' : 'En Revisión'}
                        </div>
                    </div>

                    <div className="verification-body">
                        {type === 'incoming' ? (
                            <p>
                                Quiere registrarse como <strong>{req.childName}</strong> (Hijo/a)
                            </p>
                        ) : (
                            <p>
                                Solicitaste ser hijo/a de <strong>{req.parentMember?.name}</strong> como <strong>{req.childName}</strong>
                            </p>
                        )}

                        {req.message && (
                            <div className="verification-message">
                                "{req.message}"
                            </div>
                        )}
                    </div>

                    {type === 'incoming' && req.status === 'PENDING' && (
                        <div className="verification-actions">
                            <button
                                className="reject-btn"
                                onClick={() => onReject(req.id)}
                            >
                                <X size={18} /> Rechazar
                            </button>
                            <button
                                className="approve-btn"
                                onClick={() => onApprove(req.id)}
                            >
                                <Check size={18} /> Confirmar
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
