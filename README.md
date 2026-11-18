[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Narita-1095305/token-radar-01-entry/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Narita-1095305/token-radar-01-entry/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Signal is an offline research terminal for protocols that **record no token** in the sealed DefiLlama snapshot. It preserves the snapshot watchlist and selects additional eligible protocols by implied value, targeting 240 ranked rows (or the full eligible set when smaller).

The model derives market-cap/TVL comparables from tokenized snapshot records, winsorizes each ratio to 0.01–5, and uses category medians. Categories with fewer than four peers blend with the global median in proportion to peer count. TVL is multiplied by that baseline and explicit growth, age and chain factors, rounded and clamped to $100K–$100B. The snapshot's `change_7d` uses percentage points, so growth converts it with `/ 100`. All dates derive from `as_of`; no live inputs or randomness are used. Category-specific farm plans contain four actions with estimated costs and timing.

Run with Node 22.18+ (native erasable TypeScript support) or Node 24, standard library only:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/radar-out node main.ts --input <snapshot>
```

`--input` accepts a JSON file or a directory containing `snapshot.json`; the default is `/input/snapshot.json`. Output defaults to `/output`. Open `dashboard/index.html` inside the output directory: it loads `../data.js` directly without a server. Outputs include `board.json`, `data.js`, and the copied dashboard. Each row exports its input stats, watchlist status, comparable count, baseline multiple, adjustment factors and exact farm steps.

Screenshots are supplied separately. Add 3–4 whole PNG/JPEG files to `screenshots/` (800px minimum short side, 1440px maximum long side, at most 512 KiB each; target 300–350 KB), capturing the board, a protocol detail and a filtered board. Rerun to copy them and generate `dossier.json` through the unchanged kit library. Without images, the board and dashboard build successfully and report that the dossier is pending; no placeholder dossier is produced. The screenshot and dossier gates remain pending until real captures are added. There is no `shots.json` contract in this kit.

`vendor/makefun-board.ts` and `LICENSE` are the two unchanged kit artifacts. All other entry code is authored for this entry. Implied values are model estimates, not traded token valuations; exploratory activity does not guarantee rewards.
