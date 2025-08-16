export type PolicyConfig = {
  lowWatermarkPct: number;
  highWatermarkPct: number;
  minRebalanceAmount: string;
};

export type BalanceSnapshot = {
  symbol: string;
  perChain: Record<string, bigint>;
};

export function shouldRebalance(snapshot: BalanceSnapshot, cfg: PolicyConfig): { doRebalance: boolean; from?: string; to?: string; amount?: bigint } {
  const entries = Object.entries(snapshot.perChain);
  if (entries.length < 2) return { doRebalance: false };

  const total = entries.reduce((acc, [, v]) => acc + v, 0n);
  if (total === 0n) return { doRebalance: false };

  const low = BigInt(Math.floor(Number(total) * cfg.lowWatermarkPct));
  const high = BigInt(Math.floor(Number(total) * cfg.highWatermarkPct));

  let maxChain = entries[0][0];
  let maxBal = entries[0][1];
  let minChain = entries[0][0];
  let minBal = entries[0][1];

  for (const [chain, bal] of entries) {
    if (bal > maxBal) {
      maxBal = bal;
      maxChain = chain;
    }
    if (bal < minBal) {
      minBal = bal;
      minChain = chain;
    }
  }

  if (minBal < low && maxBal > high) {
    const diff = (high - minBal);
    const minAmt = BigInt(cfg.minRebalanceAmount || "0");
    const amt = diff > minAmt ? diff : minAmt;
    if (amt > 0n && maxChain !== minChain) {
      return { doRebalance: true, from: maxChain, to: minChain, amount: amt };
    }
  }
  return { doRebalance: false };
}
