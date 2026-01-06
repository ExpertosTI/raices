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
                <p className="legal-date">Última actualización: 6 de enero de 2026</p>

                <section className="legal-section">
                    <h2>1. Información que Recopilamos</h2>
                    <p>Raíces Henríquez Cruz ("la App") recopila la siguiente información:</p>
                    <ul>
                        <li><strong>Datos de perfil:</strong> Nombre, correo electrónico, fecha de nacimiento, foto de perfil</li>
                        <li><strong>Datos familiares:</strong> Relaciones familiares, rama del árbol genealógico</li>
                        <li><strong>Datos de autenticación:</strong> Credenciales de acceso (encriptadas)</li>
                        <li><strong>Datos de uso:</strong> Interacciones con la app, participación en juegos</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>2. Uso de la Información</h2>
                    <p>Utilizamos tu información para:</p>
                    <ul>
                        <li>Construir y mantener el árbol genealógico familiar</li>
                        <li>Facilitar la comunicación entre miembros de la familia</li>
                        <li>Organizar eventos y actividades familiares</li>
                        <li>Gestionar juegos y utilidades de la app</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>3. Compartición de Datos</h2>
                    <p>Tu información se comparte únicamente con:</p>
                    <ul>
                        <li>Otros miembros verificados de la familia Henríquez Cruz</li>
                        <li>Administradores de la app para gestión del árbol</li>
                    </ul>
                    <p><strong>No vendemos ni compartimos tu información con terceros externos.</strong></p>
                </section>

                <section className="legal-section">
                    <h2>4. Protección de Menores</h2>
                    <p>La información de menores de edad solo es visible para miembros verificados de la familia. Los padres o tutores legales pueden solicitar la modificación o eliminación de datos de menores.</p>
                </section>

                <section className="legal-section">
                    <h2>5. Seguridad de Datos</h2>
                    <p>Implementamos medidas de seguridad técnicas y organizativas para proteger tu información:</p>
                    <ul>
                        <li>Encriptación de contraseñas con bcrypt</li>
                        <li>Conexiones seguras HTTPS</li>
                        <li>Acceso restringido a bases de datos</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>6. Tus Derechos</h2>
                    <p>Tienes derecho a:</p>
                    <ul>
                        <li><strong>Acceso:</strong> Solicitar una copia de tus datos</li>
                        <li><strong>Rectificación:</strong> Corregir información incorrecta</li>
                        <li><strong>Eliminación:</strong> Solicitar la eliminación de tu cuenta y datos</li>
                        <li><strong>Portabilidad:</strong> Recibir tus datos en formato legible</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>7. Eliminación de Datos</h2>
                    <p>Para solicitar la eliminación de tus datos:</p>
                    <ol>
                        <li>Envía un correo a <strong>info@renace.space</strong></li>
                        <li>Indica tu nombre completo y correo registrado</li>
                        <li>Procesaremos tu solicitud en un plazo de 30 días</li>
                    </ol>
                    <p>También puedes usar nuestra <a href="/data-deletion">página de eliminación de datos</a>.</p>
                </section>

                <section className="legal-section">
                    <h2>8. Cookies y Tecnologías Similares</h2>
                    <p>Utilizamos almacenamiento local (localStorage) para mantener tu sesión activa. No utilizamos cookies de rastreo de terceros.</p>
                </section>

                <section className="legal-section">
                    <h2>9. Cambios a esta Política</h2>
                    <p>Podemos actualizar esta política periódicamente. Te notificaremos de cambios significativos a través de la app.</p>
                </section>

                <section className="legal-section">
                    <h2>10. Contacto</h2>
                    <p>Para consultas sobre privacidad:</p>
                    <p>
                        <strong>Email:</strong> info@renace.space<br />
                        <strong>Desarrollador:</strong> Renace Tech<br />
                        <strong>Web:</strong> https://renace.tech
                    </p>
                </section>
            </div>
        </div>
    );
};
