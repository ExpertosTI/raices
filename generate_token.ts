
import jwt from 'jsonwebtoken';
import { prisma } from './server/db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

async function generateToken() {
    // 1. Create/Get a test user
    const email = 'test-claim@renace.tech';

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                email,
                name: 'Test Claim User',
                role: 'MEMBER'
            }
        });
        console.log('Created test user:', user.id);
    } else {
        console.log('Found test user:', user.id);
    }

    // 2. Generate Token
    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: '1d' }
    );

    console.log('TOKEN:', token);
    console.log('USER_ID:', user.id);
}

generateToken()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
