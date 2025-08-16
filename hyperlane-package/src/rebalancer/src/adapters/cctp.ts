export type CctpParams = {
  from: string;
  to: string;
  amount: string;
  symbol: string;
  [k: string]: unknown;
};

export async function executeCctpTransfer(params: CctpParams): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[CCTP] transfer requested`, {
    from: params.from,
    to: params.to,
    amount: params.amount,
    symbol: params.symbol,
  });
}
