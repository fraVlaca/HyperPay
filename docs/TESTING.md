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
