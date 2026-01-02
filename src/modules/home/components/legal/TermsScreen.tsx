import { useNavigate } from 'react-router-dom';
import './Legal.css';

export const TermsScreen = () => {
    const navigate = useNavigate();

    return (
        <div className="legal-screen">
            <header className="legal-header">
                <button className="back-btn" onClick={() => navigate(-1)}>← Volver</button>
                <h1>Términos de Uso</h1>
            </header>
            <div className="legal-content">
                <section className="legal-section">
                    <h2>1. Aceptación de Términos</h2>
                    <p>Al acceder a <strong>Raíces App</strong>, aceptas estos términos diseñados para proteger la privacidad y el legado de la Familia Henríquez Cruz.</p>
                </section>
                <section className="legal-section">
                    <h2>2. Uso de Datos</h2>
                    <p>La información genealógica y fotos compartidas son estrictamente para uso familiar. Está prohibida su distribución pública sin consentimiento.</p>
                </section>
                <section className="legal-section">
                    <h2>3. Cuenta de Usuario</h2>
                    <p>Eres responsable de mantener la confidencialidad de tu acceso. Si detectas uso no autorizado, repórtalo inmediatamente.</p>
                </section>
            </div>
        </div>
    );
};
