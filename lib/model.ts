/** Snapshot-only valuation. change_7d is in percentage points, as in the kit. */
export interface Protocol {
  slug: string; name: string; category: string | null; chains: string[];
  tvl_usd: number; change_7d: number | null; mcap_usd: number | null;
  listed_at: string | null; gecko_id: string | null; symbol: string | null;
}
export interface Snapshot { as_of: string; protocols: Protocol[]; watchlist: string[]; }
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const median = (values: number[]) => {
  const a = [...values].sort((x, y) => x - y), m = Math.floor(a.length / 2);
  return a.length ? (a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2) : 0.25;
};
export function parseSnapshot(text: string): Snapshot {
  const s = JSON.parse(text);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.as_of) || !Array.isArray(s.protocols) || !Array.isArray(s.watchlist)) throw Error('Invalid snapshot envelope');
  const seen = new Set<string>();
  for (const p of s.protocols) {
    if (!p.slug || seen.has(p.slug) || !p.name || !Number.isFinite(p.tvl_usd) || p.tvl_usd < 0 || !Array.isArray(p.chains)) throw Error('Invalid protocol record');
    seen.add(p.slug);
  }
  if (s.watchlist.some((slug: string) => !seen.has(slug))) throw Error('Watchlist slug absent from snapshot');
  return s;
}
const excluded = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
export function eligible(p: Protocol): boolean {
  return p.gecko_id === null && p.symbol === null && !excluded.has(p.category ?? '') &&
    !/\b(wrapped|staked|staking)\b/i.test(p.name) && !/\s(?:v\d+(?:\.\d+)*|\d+\.\d+(?:\.\d+)*)\s*$/i.test(p.name) &&
    !/^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)/i.test(p.name);
}
/** Every archetype describes an operation, its location, cost and cadence; no inferred incentives. */
function farmPlan(p: Protocol): string[] {
  const chain = p.chains[0] ?? 'the product’s supported chain';
  const where = `${p.name} on ${chain}`;
  const capital = p.tvl_usd >= 1e9 ? 100 : p.tvl_usd >= 1e8 ? 50 : 20;
  const c = (p.category ?? '').toLowerCase();
  let actions: string[];
  if (c.includes('lend')) actions = [
    `Supply $${capital} of an accepted asset to a liquid lending market in ${where}; inspect utilization before signing`,
    `If borrowing is enabled in ${where}, borrow at most $${Math.round(capital / 5)} against the deposit, keeping health factor above 2`,
    `Review the supplied balance and variable borrow rate in ${where}; repay the small loan if the rate becomes unattractive`,
    `Repay outstanding debt and withdraw a small part of the supply in ${where} to verify the full lending cycle`];
  else if (c.includes('dex')) actions = [
    `Swap $${capital} between two liquid assets in ${where}; inspect the quote and set slippage to 0.5% or less`,
    `Add $${capital} across both sides of an established pool in ${where}; preview the share and price range`,
    `Inspect fees and pool balance in ${where}; rebalance only if the position leaves its selected range`,
    `Remove a quarter of the liquidity in ${where} and inspect the received assets to verify the exit route`];
  else if (/yield|farm|curator|allocator/.test(c)) actions = [
    `Deposit $${capital} into an available unleveraged vault in ${where}; read the underlying strategy and exit terms first`,
    `Inspect the vault share receipt in ${where} and record the starting share price and any withdrawal delay`,
    `Review realized yield and strategy exposure in ${where}; claim only when accrued rewards exceed transaction costs`,
    `Redeem a quarter of the vault shares in ${where}; use the displayed withdrawal queue when instant redemption is unavailable`];
  else if (/perp|derivative|option/.test(c)) actions = [
    `Fund an isolated margin account with $${capital} in ${where}; read funding, liquidation and order fees`,
    `Place the minimum supported position in ${where} at no more than 1x exposure; set a reduce-only exit order`,
    `Review funding and unrealized loss in ${where}; close the position if its total cost reaches $2`,
    `Close the position and withdraw unused margin in ${where}; reconcile the executed fees with the preview`];
  else if (c.includes('liquid staking')) actions = [
    `Stake $${capital} of the supported native asset through ${where}; preview the receipt conversion rate`,
    `Inspect the staking receipt balance in ${where} and record the redemption fee and unbonding period`,
    `Review validator concentration and receipt value in ${where}; avoid adding leverage to the receipt`,
    `Request redemption of a quarter of the receipt in ${where} and complete the claim after its displayed unbonding period`];
  else if (c.includes('rwa')) actions = [
    `Check eligibility and identity requirements in ${where}; inspect issuer, custody and redemption terms before funding`,
    `If eligible and the minimum allows it, subscribe $${capital} to the available asset in ${where}; otherwise stop without depositing`,
    `Inspect the holding statement and distributions in ${where}; record settlement timing and issuer exposure`,
    `Submit a small redemption in ${where} during the permitted window; reconcile settlement against the stated terms`];
  else if (c.includes('bridge')) actions = [
    `Preview a $${capital} transfer through ${where} to ${p.chains[1] ?? 'another supported destination'}; verify asset and destination`,
    `Send a $5 test transfer through ${where}; confirm final receipt before moving the remaining test budget`,
    `Use the received asset in the destination product linked within ${p.name}; inspect balances on both chains`,
    `Bridge the test balance back through ${where}; reconcile fees and final received amount`];
  else if (c.includes('cdp')) actions = [
    `Deposit $${capital} of accepted collateral into a vault in ${where}; inspect the liquidation threshold`,
    `Mint no more than $${Math.round(capital / 5)} of debt in ${where}, leaving collateralization above twice the required minimum`,
    `Review vault collateralization and stability fees in ${where}; top up or repay if the safety buffer shrinks`,
    `Repay all minted debt in ${where} and withdraw part of the collateral to verify vault closure`];
  else if (/payment|card/.test(c)) actions = [
    `Check supported assets and payment recipients in ${where}; inspect any identity or regional requirements`,
    `Fund a $${capital} payment balance in ${where} only if eligible; verify the minimum transfer and withdrawal fee`,
    `Send a $2 test payment to an account you control through ${where}; confirm settlement before repeating`,
    `Export the payment receipt from ${where} and withdraw the unused balance to the original account`];
  else actions = [
    `Inspect the primary ${p.category ?? 'protocol'} product in ${where}; preview its supported action, minimum size and exit route`,
    `If the primary action is accessible, use at most $${capital} in ${where}; stop if its minimum exceeds this test budget`,
    `Inspect the resulting receipt, order or balance in ${where}; record fees and verify that the action settled`,
    `Reverse or close a small part of the position using the exit shown in ${where}; confirm the returned balance`];
  return actions.map((a, i) => `${a}. Cost: ${i === 0 && /rwa|payment|card/.test(c) ? '$0 to inspect; funding separate' : 'about $2–6 in gas, plus displayed product fees'}${i === 1 ? `; up to $${capital} capital at risk` : ''}. Time: ${i === 2 ? 'repeat weekly for 4–8 weeks, 10 minutes per review' : i === 3 ? '15 minutes plus any displayed settlement delay' : '15–20 minutes'}.`);
}
export function buildRadar(snapshot: Snapshot) {
  const groups = new Map<string, number[]>(), all: number[] = [];
  for (const p of snapshot.protocols) if (p.mcap_usd !== null && Number.isFinite(p.mcap_usd) && p.tvl_usd > 0) {
    const ratio = clamp(p.mcap_usd / p.tvl_usd, 0.01, 5);
    all.push(ratio);
    const key = p.category ?? 'Uncategorized';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ratio);
  }
  if (!all.length) throw Error('Snapshot has no usable tokenized comparables');
  const global = median(all), watch = new Set(snapshot.watchlist);
  const scored = snapshot.protocols.filter(p => watch.has(p.slug) || eligible(p)).map(p => {
    const peers = groups.get(p.category ?? 'Uncategorized') ?? [];
    const weight = Math.min(peers.length, 4) / 4;
    const multiple = median(peers) * weight + global * (1 - weight);
    const growth = p.change_7d === null ? 1 : clamp(1 + p.change_7d / 100 * 1.5, 0.7, 1.6);
    const ageDays = p.listed_at === null ? null : Math.max(0, (Date.parse(snapshot.as_of) - Date.parse(p.listed_at)) / 86400000);
    const years = ageDays === null || !Number.isFinite(ageDays) ? null : ageDays / 365.25;
    const age = years === null ? 0.8 : 0.75 + 0.5 * years / (years + 1.5);
    const chain = 1 + 0.03 * Math.min(p.chains.length - 1, 5);
    return { ...p, rank: 0, watchlist: watch.has(p.slug), implied_value_usd: clamp(Math.round(p.tvl_usd * multiple * growth * age * chain), 100000, 100000000000),
      model: { category_multiple: multiple, category_median: peers.length ? median(peers) : null, comparable_count: peers.length, category_weight: weight, growth_factor: growth, age_factor: age, chain_factor: chain, age_days: years === null ? null : ageDays }, farm_steps: farmPlan(p) };
  });
  const compare = (a: typeof scored[number], b: typeof scored[number]) => b.implied_value_usd - a.implied_value_usd || b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
  scored.sort(compare);
  const extra = scored.filter(p => !p.watchlist).slice(0, Math.max(0, 240 - watch.size));
  const rows = [...scored.filter(p => p.watchlist), ...extra].sort(compare).map((p, i) => ({ ...p, rank: i + 1 }));
  return { rows, as_of: snapshot.as_of, global_multiple: global, comparable_count: all.length, watchlist_size: watch.size };
}
