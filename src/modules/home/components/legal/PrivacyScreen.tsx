import { useNavigate } from 'react-router-dom';
import './Legal.css';

export const PrivacyScreen = () => {
    const navigate = useNavigate();

    return (
        <div className="legal-screen">
            <header className="legal-header">
                <button className="back-btn" onClick={() => navigate(-1)}>← Volver</button>
                <h1>Política de Privacidad</h1>
            </header>
            <div className="legal-content">
                <section className="legal-section">
                    <h2>1. Información que Recopilamos</h2>
                    <p>Recopilamos nombre, correo, fecha de nacimiento y relaciones familiares para construir el árbol genealógico.</p>
                </section>
                <section className="legal-section">
                    <h2>2. Protección de Menores</h2>
                    <p>Los datos de menores de edad son visibles solo para miembros verificados de la familia.</p>
                </section>
                <section className="legal-section">
                    <h2>3. Contacto</h2>
                    <p>Para ejercer tus derechos de datos, contacta al administrador en <span className="contact-email">info@renace.space</span>.</p>
                </section>
            </div>
        </div>
    );
};
