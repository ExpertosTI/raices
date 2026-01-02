import { useNavigate } from 'react-router-dom';
import './Legal.css';

export const HelpScreen = () => {
    const navigate = useNavigate();

    return (
        <div className="legal-screen">
            <header className="legal-header">
                <button className="back-btn" onClick={() => navigate(-1)}>← Volver</button>
                <h1>Centro de Ayuda</h1>
            </header>
            <div className="legal-content">
                <section className="legal-section">
                    <h2>Preguntas Frecuentes</h2>
                    <ul>
                        <li><strong>¿Cómo registro a mi hijo?</strong> Ve al Dashboard y selecciona "Registrar Descendiente".</li>
                        <li><strong>¿Cómo corrijo un error?</strong> Usa el botón de editar en el perfil o contacta al admin.</li>
                    </ul>
                </section>
                <section className="legal-section">
                    <h2>Soporte Técnico</h2>
                    <p>Si tienes problemas con la app, escribe a:</p>
                    <p className="contact-email">admin@renace.space</p>
                    <p className="contact-email">adderlymarte@hotmail.com</p>
                </section>
            </div>
        </div>
    );
};
