import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BRANCHES = [
    { name: 'Lorenza Antonia', birthDate: new Date('1947-08-09'), color: '#DC2626', order: 1 },
    { name: 'Carmen Josefa', birthDate: new Date('1950-09-28'), color: '#EA580C', order: 2 },
    { name: 'Andrea Altagracia', birthDate: new Date('1952-10-01'), color: '#D97706', order: 3 },
    { name: 'Mercedes', birthDate: new Date('1954-01-08'), color: '#CA8A04', order: 4 },
    { name: 'Carlos Alfonso', birthDate: new Date('1958-08-15'), color: '#65A30D', order: 5 },
    { name: 'José Ignacio', birthDate: new Date('1960-08-02'), color: '#16A34A', order: 6 },
    { name: 'Julio César', birthDate: new Date('1962-04-15'), color: '#0D9488', order: 7 },
    { name: 'Xiomara', birthDate: new Date('1963-10-12'), color: '#0891B2', order: 8 },
    { name: 'Bernarda', birthDate: new Date('1965-07-16'), color: '#2563EB', order: 9 },
    { name: 'Yoni Antonio', birthDate: new Date('1967-02-16'), color: '#7C3AED', order: 10 },
    { name: 'Roberto de Jesús', birthDate: new Date('1969-06-16'), color: '#C026D3', order: 11 },
    { name: 'Erick Manuel', birthDate: new Date('1974-10-05'), color: '#DB2777', order: 12 },
]

async function main() {
    console.log('Seeding database...')

    // Create Branches and their Patriarch FamilyMembers
    for (const branch of BRANCHES) {
        const branchRecord = await prisma.branch.create({
            data: {
                name: branch.name,
                birthDate: branch.birthDate,
                color: branch.color,
                order: branch.order,
            }
        })
        console.log(`Branch created: ${branchRecord.name}`)

        // Create the patriarch/sibling as a FamilyMember
        await prisma.familyMember.create({
            data: {
                branchId: branchRecord.id,
                name: branch.name,
                birthDate: branch.birthDate,
                relation: 'SIBLING',
                isPatriarch: true
            }
        })
    }

    console.log('✅ Seed completed: 12 branches and 12 patriarch members created.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
