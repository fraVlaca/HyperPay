export type Policy = {
  low_watermark_pct: number;
  high_watermark_pct: number;
  min_rebalance_amount: string;
};

export function shouldRebalance(_policy: Policy): boolean {
  return false;
}
