ePyUSD (Optimism) Hardhat package

Setup
- cp .env.example .env
- Fill DEPLOYER_PRIVATE_KEY with the provided key (do not commit) and keep the default RPC URLs.

Build
- npm i
- npm run build

Deploy to Optimism
- npm run deploy:optimism

After deployment, the address and tx hash are written to deployments/optimism.json.
