# Testing Checklist (PYUSD Bridging)

Pre-checks
- Verify chain IDs via RPCs.
- Record deployer address and native balances (ETH, OP ETH, ARB ETH).
- Read PYUSD balances:
  - ETH: balanceOf(deployer) @ 0x6c3e...
  - ARB: balanceOf(deployer) @ 0x4685...
- Read ePyUSD balance on OP after deploy.

Hyperlane (lock/mint)
- ETH → OP: send 0.6 PYUSD; verify ePyUSD +0.6 on OP.
- ARB → OP: if ARB has PYUSD, send a small amount; verify ePyUSD increases.
- OP → ETH/ARB: send ePyUSD back; verify PYUSD credit on the destination.

LayerZero (ETH ↔ ARB)
- ETH → ARB: bridge 0.6 PYUSD; verify ARB +0.6 PYUSD.
- ARB → ETH: bridge back; verify ETH +0.6 PYUSD minus fees.

For every leg
- Capture tx hash and explorer link.
- Wait for confirmations; check status is success.
- Record pre/post balances and deltas in docs/test-logs/.

Budget
- Keep total spend under a few dollars; target ~$0.5–$1 per route.
## 2025-08-16 Mainnet Hyperlane PYUSD tests

ETH → OP (Hyperlane lock/mint)
- Amount: 0.60 PYUSD (600000 with 6 decimals)
- Approvals (Ethereum):
  - https://etherscan.io/tx/0x03814e44e5a5a9cd85205cad24b53c28735575e8e097810ede76441f05d478a7
  - https://etherscan.io/tx/0xafb6c4320daf40523dd865831bc507a12ad5751262f1072a7c95265e6cd45dd9
- Hyperlane Message:
  - ID: 0x95056dd4421f5301e5d8c55322a6d5203694990d90cbb34d97f5d4b371399b5e
  - Explorer: https://explorer.hyperlane.xyz/message/0x95056dd4421f5301e5d8c55322a6d5203694990d90cbb34d97f5d4b371399b5e
- Expected: ePyUSD minted +0.60 on Optimism to 0x84C6...7722 upon relay confirmation
- Note: CLI self-relay failed (checkpoint/proofs); network relayers should deliver.

Routers (deployed via Hyperlane CLI; also in artifacts/hwr.pyusd.ethereum-arbitrum-to-optimism.json)
- Ethereum (EvmHypCollateral): 0x76886b63257244CA00dAdE349d8Aa92b0a541fd9
- Arbitrum (EvmHypCollateral): 0xDe95b0d8C5a1Cd9939A63A51ebf07732F1aCc92D
- Optimism (EvmHypSynthetic): 0x2A0B01E072b3d68249A2b3666cB90585eC4bd79e
