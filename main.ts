import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSnapshot, buildRadar } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
let input = '/input/snapshot.json';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input' && args[i + 1]) input = args[++i];
  else if (args[i].startsWith('--input=')) input = args[i].slice(8);
  else throw Error(`Unknown or incomplete argument: ${args[i]}`);
}
if (statSync(input).isDirectory()) input = join(input, 'snapshot.json');
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
if (out === resolve(root) || out === resolve(root, 'dashboard') || out === resolve(root, 'screenshots')) throw Error('Output must not overwrite source directories');
const radar = buildRadar(parseSnapshot(readFileSync(input, 'utf8')));
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'board.json'), JSON.stringify({ rows: radar.rows }) + '\n');
// The data script lives beside dashboard/, exactly one level above index.html.
writeFileSync(join(out, 'data.js'), `window.RADAR=${JSON.stringify(radar).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')};\n`);
function copyDirectory(from: string, to: string) {
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from).sort()) {
    if (name.startsWith('.')) continue;
    const source = join(from, name), target = join(to, name);
    if (statSync(source).isDirectory()) copyDirectory(source, target);
    else if (statSync(source).isFile()) copyFileSync(source, target);
  }
}
copyDirectory(join(root, 'dashboard'), join(out, 'dashboard'));
copyDirectory(join(root, 'screenshots'), join(out, 'screenshots'));
const shots = existsSync(join(out, 'screenshots')) ? readdirSync(join(out, 'screenshots')).filter(n => !n.startsWith('.')) : [];
if (shots.length) {
  writeFileSync(join(out, 'dossier.json'), buildDossier(out, { text_max_bytes: 65_536, screenshots: { max: 4, max_bytes: 524_288 }, dashboard: { max_files: 400, max_bytes: 4_194_304 } }));
} else {
  rmSync(join(out, 'dossier.json'), { force: true });
  process.stderr.write('Dossier pending: add 3–4 screenshots, then rerun. The kit refuses a dossier without images.\n');
}
process.stdout.write(`Token radar: ${radar.rows.length} rows; ${radar.watchlist_size} watchlist; ${radar.comparable_count} comparables. Output: ${out}\n`);
