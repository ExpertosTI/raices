
import { sendEmail, verifyEmailConnection } from './server/services/email';
import {
    getWelcomeTemplate,
    getClaimProfileTemplate,
    getSportsRegistrationTemplate,
    getNotificationTemplate
} from './server/services/templates';

const TEST_EMAIL = 'adderlymarte@hotmail.com';

const runTests = async () => {
    console.log('🚀 Starting Email Test Sequence...');

    // 1. Verify Connection
    const isConnected = await verifyEmailConnection();
    if (!isConnected) {
        console.error('❌ Could not connect to SMTP server. Aborting.');
        process.exit(1);
    }

    try {
        // 2. Send Welcome Email
        console.log('✉️ Sending Welcome Template...');
        await sendEmail(
            TEST_EMAIL,
            '¡Bienvenido a la Familia! 🌳',
            getWelcomeTemplate('Adderly')
        );

        // 3. Send Claim Verification
        console.log('✉️ Sending Claim Template...');
        await sendEmail(
            TEST_EMAIL,
            'Confirmación: Perfil Reclamado ✅',
            getClaimProfileTemplate('Adderly', 'Xiomara Henríquez')
        );

        // 4. Send Sports Registration
        console.log('✉️ Sending Sports Template...');
        await sendEmail(
            TEST_EMAIL,
            'Inscripción Confirmada: Softbol 🥎',
            getSportsRegistrationTemplate('Adderly', 'Softbol')
        );

        // 5. Send Generic Notification
        console.log('✉️ Sending Notification Template...');
        await sendEmail(
            TEST_EMAIL,
            'Nueva Actividad en el Feed 💬',
            getNotificationTemplate(
                '¡Alguien comentó tu foto!',
                'Tu prima María ha comentado en la foto que subiste del abuelo. Entra para responder y mantener viva la conversación.',
                'https://raices.renace.tech/feed',
                'Ver Comentario'
            )
        );

        console.log('✨ All test emails sent successfully to ' + TEST_EMAIL);
    } catch (error) {
        console.error('❌ Error sending emails:', error);
    }
};

runTests();
