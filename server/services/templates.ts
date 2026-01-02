
// Base Styles
const BASE_STYLE = `
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #333;
    line-height: 1.6;
    max-width: 600px;
    margin: 0 auto;
    background-color: #f9f9f9;
`;

const HEADER_STYLE = `
    background: linear-gradient(135deg, #1a1a2e 0%, #0A0A0F 100%);
    color: #D4AF37;
    padding: 20px;
    text-align: center;
    border-radius: 8px 8px 0 0;
`;

const CONTENT_STYLE = `
    background: #ffffff;
    padding: 30px;
    border: 1px solid #ddd;
    border-top: none;
    border-radius: 0 0 8px 8px;
`;

const BUTTON_STYLE = `
    display: inline-block;
    padding: 12px 24px;
    background-color: #D4AF37;
    color: #fff;
    text-decoration: none;
    border-radius: 5px;
    font-weight: bold;
    margin-top: 20px;
`;

const FOOTER_STYLE = `
    text-align: center;
    font-size: 12px;
    color: #888;
    margin-top: 20px;
`;

// Helper to wrap content
const wrapEmail = (title: string, bodyContent: string) => {
    return `
    <div style="${BASE_STYLE}">
        <div style="${HEADER_STYLE}">
            <h1 style="margin:0; font-family: 'Playfair Display', serif;">Raíces</h1>
            <p style="margin:5px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.7);">${title}</p>
        </div>
        <div style="${CONTENT_STYLE}">
            ${bodyContent}
        </div>
        <div style="${FOOTER_STYLE}">
            <p>Familia Henríquez Cruz • 2026</p>
            <p>Raíces App 🌳</p>
        </div>
    </div>
    `;
};

// --- Templates ---

export const getWelcomeTemplate = (name: string) => {
    const body = `
        <h2 style="color: #1a1a2e;">¡Bienvenido, ${name}!</h2>
        <p>Estamos emocionados de que te unas a <strong>Raíces</strong>, el espacio digital de nuestra familia.</p>
        <p>Aquí podrás explorar nuestro árbol genealógico, conectar con primos lejanos y mantenerte al día con los eventos familiares.</p>
        <div style="text-align: center;">
            <a href="https://raices.renace.tech/app" style="${BUTTON_STYLE}">Ir a la App</a>
        </div>
    `;
    return wrapEmail('Bienvenida', body);
};

export const getClaimProfileTemplate = (userName: string, memberName: string) => {
    const body = `
        <h2 style="color: #1a1a2e;">Perfil Reclamado Exitosamente</h2>
        <p>Hola ${userName},</p>
        <p>Has reclamado exitosamente el perfil de <strong>${memberName}</strong>.</p>
        <p>Ahora tienes acceso especial como uno de los pilares de nuestra familia. Puedes editar la información de tu rama y ayudar a completar nuestra historia.</p>
        <div style="text-align: center;">
            <a href="https://raices.renace.tech/tree" style="${BUTTON_STYLE}">Ver mi Árbol</a>
        </div>
    `;
    return wrapEmail('Confirmación de Identidad', body);
};

export const getSportsRegistrationTemplate = (userName: string, sport: string) => {
    const body = `
        <h2 style="color: #1a1a2e;">¡Estás en el equipo! 🥎</h2>
        <p>Hola ${userName},</p>
        <p>Te has inscrito exitosamente en <strong>${sport}</strong> para la Copa Familia Henríquez Cruz 2026.</p>
        <p>¡Empieza a entrenar! Pronto recibirás más noticias sobre los horarios y equipos.</p>
    `;
    return wrapEmail('Copa Familia 2026', body);
};

export const getNotificationTemplate = (title: string, message: string, actionLink?: string, actionText?: string) => {
    let buttonHtml = '';
    if (actionLink && actionText) {
        buttonHtml = `
            <div style="text-align: center;">
                <a href="${actionLink}" style="${BUTTON_STYLE}">${actionText}</a>
            </div>
        `;
    }

    return wrapEmail('Notificación', `
        <h2 style="color: #1a1a2e;">${title}</h2>
        <p>${message}</p>
        ${buttonHtml}
    `);
};
