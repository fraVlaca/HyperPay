export type OftParams = {
  from: string;
  to: string;
  amount: string;
  symbol: string;
  [k: string]: unknown;
};

export async function executeOftTransfer(params: OftParams): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[OFT] transfer requested`, {
    from: params.from,
    to: params.to,
    amount: params.amount,
    symbol: params.symbol,
  });
}
