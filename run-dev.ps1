$env:DATABASE_URL='postgresql://user:password@localhost/marketplace'
$env:NODE_ENV='development'
cd "Marketplace-Copilot\Marketplace-Copilot"
npx tsx server/index.ts
