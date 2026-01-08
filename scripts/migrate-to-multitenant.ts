import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Migration Script: Convert "Los 12 Patriarcas" to Multi-Tenant
 * 
 * This script:
 * 1. Creates a "Los 12 Patriarcas" family as the default tenant
 * 2. Assigns all existing users to this family
 * 3. Assigns all existing members, posts, events, etc. to this family
 * 4. Promotes the first admin user to ADMIN role
 */
async function migrateToMultiTenant() {
    console.log('🚀 Starting migration to multi-tenant...\n');

    try {
        // Step 1: Create the default family "Los 12 Patriarcas"
        console.log('📦 Creating default family...');

        let family = await prisma.family.findUnique({
            where: { slug: 'los-12-patriarcas' }
        });

        if (!family) {
            family = await prisma.family.create({
                data: {
                    name: 'Los 12 Patriarcas',
                    slug: 'los-12-patriarcas',
                    description: 'Familia fundadora de la aplicación Raíces'
                }
            });
            console.log(`   ✅ Family created: ${family.name} (ID: ${family.id})`);
        } else {
            console.log(`   ⚠️ Family already exists: ${family.name}`);
        }

        const familyId = family.id;

        // Step 2: Assign all users to this family
        console.log('\n👥 Migrating users...');
        const usersWithoutFamily = await prisma.user.findMany({
            where: { familyId: null }
        });

        if (usersWithoutFamily.length > 0) {
            // First user with PATRIARCH role becomes ADMIN
            const patriarchUser = usersWithoutFamily.find(u => u.role === 'PATRIARCH');

            for (const user of usersWithoutFamily) {
                const newRole = (user.role === 'PATRIARCH' || user.id === patriarchUser?.id)
                    ? 'ADMIN'
                    : 'MEMBER';

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        familyId,
                        role: newRole as any
                    }
                });
                console.log(`   ✅ User ${user.email} → familyId: ${familyId}, role: ${newRole}`);
            }
        } else {
            console.log('   ⚠️ All users already have a family');
        }

        // Step 3: Assign all family members to this family
        console.log('\n🌳 Migrating family members...');
        const membersResult = await prisma.familyMember.updateMany({
            where: { familyId: null },
            data: { familyId }
        });
        console.log(`   ✅ Updated ${membersResult.count} family members`);

        // Step 4: Assign all branches to this family
        console.log('\n🌿 Migrating branches...');
        const branchesResult = await prisma.branch.updateMany({
            where: { familyId: null },
            data: { familyId }
        });
        console.log(`   ✅ Updated ${branchesResult.count} branches`);

        // Step 5: Assign all posts to this family
        console.log('\n📝 Migrating posts...');
        const postsResult = await prisma.post.updateMany({
            where: { familyId: null },
            data: { familyId }
        });
        console.log(`   ✅ Updated ${postsResult.count} posts`);

        // Step 6: Assign all events to this family
        console.log('\n📅 Migrating events...');
        const eventsResult = await prisma.event.updateMany({
            where: { familyId: null },
            data: { familyId }
        });
        console.log(`   ✅ Updated ${eventsResult.count} events`);

        // Step 7: Assign all game exchanges to this family
        console.log('\n🎮 Migrating game exchanges...');
        const gamesResult = await prisma.gameExchange.updateMany({
            where: { familyId: null },
            data: { familyId }
        });
        console.log(`   ✅ Updated ${gamesResult.count} game exchanges`);

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(50));
        console.log(`\nFamily: "${family.name}"`);
        console.log(`Slug: ${family.slug}`);
        console.log(`Family ID: ${familyId}`);
        console.log('\nAll existing data has been assigned to this family.');
        console.log('Users with PATRIARCH role have been promoted to ADMIN.');
        console.log('\nThe app is now ready for multi-tenant operation! 🎉');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration
migrateToMultiTenant()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
