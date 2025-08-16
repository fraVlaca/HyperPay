import http from 'http';
import { shouldRebalance, type PolicyConfig, type BalanceSnapshot } from './policy.js';
import { executeCctpTransfer } from './adapters/cctp.js';
import { executeOftTransfer } from './adapters/oft.js';

const PORT = parseInt(process.env.PORT || '8080', 10);
const ADAPTER = (process.env.REBALANCER_ADAPTER || 'cctp').toLowerCase();

const cfg: PolicyConfig = {
  lowWatermarkPct: parseFloat(process.env.LOW_WATERMARK_PCT || '0.3'),
  highWatermarkPct: parseFloat(process.env.HIGH_WATERMARK_PCT || '0.6'),
  minRebalanceAmount: process.env.MIN_REBALANCE_AMOUNT || '0',
};

let lastStatus: any = { ok: true, ts: Date.now(), adapter: ADAPTER, loop: 'idle' };

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(lastStatus));
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`rebalancer listening on ${PORT}`);
});

async function readSnapshot(): Promise<BalanceSnapshot> {
  return {
    symbol: 'ASSET',
    perChain: {
      ethereum: 1000n,
      arbitrum: 1000n,
    },
  };
}

async function loop() {
  try {
    const snapshot = await readSnapshot();
    const decision = shouldRebalance(snapshot, cfg);
    if (decision.doRebalance && decision.from && decision.to && decision.amount) {
      if (ADAPTER === 'cctp') {
        await executeCctpTransfer({ from: decision.from, to: decision.to, amount: decision.amount.toString(), symbol: snapshot.symbol });
      } else if (ADAPTER === 'oft') {
        await executeOftTransfer({ from: decision.from, to: decision.to, amount: decision.amount.toString(), symbol: snapshot.symbol });
      }
      lastStatus = { ok: true, ts: Date.now(), decision, adapter: ADAPTER };
    } else {
      lastStatus = { ok: true, ts: Date.now(), decision, adapter: ADAPTER };
    }
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('rebalancer loop error', e);
    lastStatus = { ok: false, ts: Date.now(), error: e?.message || String(e) };
  } finally {
    setTimeout(loop, 5000);
  }
}

loop();
