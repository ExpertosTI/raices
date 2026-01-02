$env:DATABASE_URL="postgresql://raices:raices_secret_2024@localhost:5433/raices_db"
Write-Host "Generando cliente Prisma..."
npx prisma generate
Write-Host "Corriendo migraciones..."
npx prisma migrate dev --name init
