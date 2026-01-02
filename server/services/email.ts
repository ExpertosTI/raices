import nodemailer from 'nodemailer';

// Configuration - Now uses environment variables
const SMTP_CONFIG = {
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'info@renace.space',
        pass: process.env.SMTP_PASS || '' // MUST be set via ENV in production
    }
};

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'adderlymarte@hotmail.com';

// Create Transporter
export const transporter = nodemailer.createTransport(SMTP_CONFIG);

// Verify connection
export const verifyEmailConnection = async () => {
    try {
        await transporter.verify();
        console.log('✅ Email Service Ready');
        return true;
    } catch (error) {
        console.error('❌ Email Service Error:', error);
        return false;
    }
};

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        const info = await transporter.sendMail({
            from: '"Raíces App 🌳" <info@renace.space>',
            to,
            subject,
            html,
        });
        console.log(`📧 Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('❌ Failed to send email:', error);
        throw error;
    }
};
