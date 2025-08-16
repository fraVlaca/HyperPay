import http from 'http';
import { shouldRebalance, type Policy } from './policy.js';
import { executeCctpTransfer } from './adapters/cctp.js';
import { executeOftTransfer } from './adapters/oft.js';

const port = process.env.PORT ? Number(process.env.PORT) : 8080;

async function tick() {
  const policy: Policy = {
    low_watermark_pct: Number(process.env.LOW_WATERMARK_PCT || 0.3),
    high_watermark_pct: Number(process.env.HIGH_WATERMARK_PCT || 0.6),
    min_rebalance_amount: process.env.MIN_REBALANCE_AMOUNT || '0',
  };
  const need = shouldRebalance(policy);
  if (need) {
    const which = process.env.REBALANCER_ADAPTER || 'cctp';
    if (which === 'cctp') {
      await executeCctpTransfer({});
    } else if (which === 'oft') {
      await executeOftTransfer({});
    }
  }
}

setInterval(() => {
  tick().catch(() => {});
}, 5000);

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, adapters: ['cctp', 'oft'] }));
});

server.listen(port);
