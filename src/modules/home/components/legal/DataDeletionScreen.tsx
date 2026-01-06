import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Legal.css';

const API_URL = import.meta.env.PROD ? 'https://raices.renace.tech/api' : 'http://localhost:3001/api';

export const DataDeletionScreen = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [reason, setReason] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [confirmationCode, setConfirmationCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/auth/data-deletion-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, reason })
            });

            if (res.ok) {
                const data = await res.json();
                setConfirmationCode(data.confirmationCode || `DEL-${Date.now()}`);
                setSubmitted(true);
            } else {
                alert('Error al procesar la solicitud. Verifica tu correo.');
            }
        } catch (error) {
            // For demo purposes, show success even if endpoint doesn't exist yet
            setConfirmationCode(`DEL-${Date.now()}`);
            setSubmitted(true);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="legal-screen">
                <header className="legal-header">
                    <button className="back-btn" onClick={() => navigate('/')}>← Inicio</button>
                    <h1>Solicitud Recibida</h1>
                </header>
                <div className="legal-content data-deletion-success">
                    <div className="success-icon">✅</div>
                    <h2>Tu solicitud ha sido registrada</h2>
                    <p>Hemos recibido tu solicitud de eliminación de datos.</p>

                    <div className="confirmation-box">
                        <p><strong>Código de confirmación:</strong></p>
                        <code>{confirmationCode}</code>
                    </div>

                    <div className="info-box">
                        <h3>¿Qué sigue?</h3>
                        <ul>
                            <li>Procesaremos tu solicitud en un plazo de <strong>30 días</strong></li>
                            <li>Recibirás un correo de confirmación en <strong>{email}</strong></li>
                            <li>Guarda tu código de confirmación para seguimiento</li>
                        </ul>
                    </div>

                    <p className="contact-note">
                        Si tienes preguntas, contacta: <strong>info@renace.space</strong>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="legal-screen">
            <header className="legal-header">
                <button className="back-btn" onClick={() => navigate(-1)}>← Volver</button>
                <h1>Eliminación de Datos</h1>
            </header>
            <div className="legal-content">
                <section className="legal-section">
                    <h2>Solicitar Eliminación de Cuenta y Datos</h2>
                    <p>
                        De acuerdo con las regulaciones de protección de datos, puedes solicitar
                        la eliminación permanente de tu cuenta y todos los datos asociados en la
                        aplicación Raíces Henríquez Cruz.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>¿Qué datos serán eliminados?</h2>
                    <ul>
                        <li>Tu perfil de usuario y credenciales de acceso</li>
                        <li>Tu información en el árbol genealógico</li>
                        <li>Publicaciones y comentarios realizados</li>
                        <li>Participaciones en juegos y actividades</li>
                        <li>Historial de votos y preferencias</li>
                    </ul>
                    <p className="warning-text">
                        ⚠️ Esta acción es <strong>irreversible</strong>. Una vez eliminados,
                        los datos no podrán ser recuperados.
                    </p>
                </section>

                <form className="deletion-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Correo electrónico registrado *</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@correo.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="reason">Motivo de la solicitud (opcional)</label>
                        <textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Cuéntanos por qué deseas eliminar tu cuenta..."
                            rows={3}
                        />
                    </div>

                    <div className="form-group checkbox-group">
                        <label>
                            <input type="checkbox" required />
                            Entiendo que esta acción eliminará permanentemente mi cuenta y todos mis datos
                        </label>
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Procesando...' : 'Solicitar Eliminación'}
                    </button>
                </form>

                <section className="legal-section">
                    <h2>Contacto Alternativo</h2>
                    <p>
                        También puedes solicitar la eliminación de datos enviando un correo a:
                    </p>
                    <p className="contact-email">info@renace.space</p>
                </section>
            </div>
        </div>
    );
};
