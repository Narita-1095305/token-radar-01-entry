(() => {
  'use strict';
  const data = window.RADAR;
  const $ = id => document.getElementById(id);
  if (!data) { $('results').textContent = 'Data missing. Run main.ts to generate data.js.'; return; }
  const money = n => '$' + (n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n.toFixed(0));
  const fullMoney = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const percent = n => n === null ? 'Unknown' : (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const multiple = n => n.toFixed(3) + '×';
  let sort = 'rank', direction = 1, lastTrigger = null;
  const columns = [['rank', '#', true], ['name', 'Protocol', false], ['category', 'Category', false], ['chains', 'Chains', false], ['tvl_usd', 'TVL', true], ['change_7d', '7d change', true], ['implied_value_usd', 'Implied value', true], ['ratio', 'Value / TVL', true]];
  $('snapshot-date').textContent = data.as_of;
  $('metric-rows').textContent = data.rows.length;
  $('metric-watch').textContent = data.rows.filter(r => r.watchlist).length + ' / ' + data.watchlist_size;
  $('metric-peers').textContent = data.comparable_count;
  $('metric-multiple').textContent = multiple(data.global_multiple);
  $('provenance').textContent = `Data is a sealed DefiLlama snapshot as of ${data.as_of}; implied values are this board’s own model estimates.`;
  for (const [id, values] of [['category', data.rows.map(r => r.category ?? 'Uncategorized')], ['chain', data.rows.flatMap(r => r.chains)]]) {
    for (const value of [...new Set(values)].sort()) {
      const option = document.createElement('option'); option.value = value; option.textContent = value; $(id).append(option);
    }
  }
  function getValue(row, key) {
    if (key === 'ratio') return row.tvl_usd > 0 ? row.implied_value_usd / row.tvl_usd : null;
    if (key === 'chains') return row.chains.join(', ');
    return row[key];
  }
  function render() {
    const q = $('search').value.trim().toLowerCase();
    const rows = data.rows.filter(r => (!q || [r.name, r.slug, r.category, ...r.chains].join(' ').toLowerCase().includes(q)) &&
      (!$('category').value || (r.category ?? 'Uncategorized') === $('category').value) &&
      (!$('chain').value || r.chains.includes($('chain').value)) &&
      (!$('watch-only').checked || r.watchlist) && r.tvl_usd >= Number($('min-tvl').value));
    rows.sort((a, b) => {
      const av = getValue(a, sort), bv = getValue(b, sort);
      if (av === null && bv !== null) return 1;
      if (bv === null && av !== null) return -1;
      const order = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''));
      return order * direction || a.rank - b.rank;
    });
    $('headers').innerHTML = columns.map(([key, title, num]) => `<th scope="col" class="${num ? 'number' : ''}" aria-sort="${sort === key ? direction === 1 ? 'ascending' : 'descending' : 'none'}"><button type="button" data-sort="${key}">${title} ${sort === key ? direction === 1 ? '↑' : '↓' : '↕'}</button></th>`).join('');
    $('rows').innerHTML = rows.length ? rows.map(r => `<tr data-slug="${esc(r.slug)}"><td class="rank number">${String(r.rank).padStart(2, '0')}</td><td><div class="protocol"><span class="avatar" aria-hidden="true">${esc(r.name.slice(0, 2).toUpperCase())}</span><div><button class="protocol-name" data-detail="${esc(r.slug)}">${esc(r.name)}</button>${r.watchlist ? '<span class="watch">WATCHLIST</span>' : ''}</div></div></td><td class="category-cell">${esc(r.category ?? 'Uncategorized')}</td><td title="${esc(r.chains.join(', '))}"><span class="chain-pill">${esc(r.chains[0] ?? 'Unspecified')}</span>${r.chains.length > 1 ? `<span class="chain-extra">+${r.chains.length - 1}</span>` : ''}</td><td class="number" title="${fullMoney(r.tvl_usd)}">${money(r.tvl_usd)}</td><td class="number ${r.change_7d === null ? '' : r.change_7d >= 0 ? 'positive' : 'negative'}">${percent(r.change_7d)}</td><td class="number value" title="${fullMoney(r.implied_value_usd)}">${money(r.implied_value_usd)}<div class="value-track" aria-hidden="true"><i style="width:${Math.max(2, r.implied_value_usd / data.rows[0].implied_value_usd * 100)}%"></i></div></td><td class="number">${r.tvl_usd ? multiple(r.implied_value_usd / r.tvl_usd) : '—'}</td></tr>`).join('') : '<tr><td colspan="8" class="empty">No protocols match these filters. Reset to scan the full board.</td></tr>';
    $('results').textContent = `${rows.length} / ${data.rows.length} protocols`;
  }
  function openDetail(slug, trigger) {
    const r = data.rows.find(row => row.slug === slug); if (!r) return;
    lastTrigger = trigger;
    const m = r.model;
    const factor = (label, value) => `<div class="factor"><span>${label}</span><b>${multiple(value)}</b></div>`;
    const stat = (label, value) => `<div class="stat"><span>${label}</span><b>${esc(value)}</b></div>`;
    $('detail-content').innerHTML = `<div class="drawer-top"><span>PROTOCOL DOSSIER / RANK ${String(r.rank).padStart(2, '0')}</span><button class="close" id="detail-close" autofocus>Close ×</button></div><h2 class="detail-title" id="detail-title">${esc(r.name)}</h2><p class="detail-sub">${esc(r.category ?? 'Uncategorized')} · ${esc(r.chains.join(' / ') || 'Chain unspecified')}<br>Records no token in the snapshot${r.watchlist ? ' · <span class="positive">Snapshot watchlist</span>' : ''}</p><div class="detail-value"><span>IMPLIED PROTOCOL VALUE</span><strong>${fullMoney(r.implied_value_usd)}</strong><small>Board model estimate · not a market cap or token price</small></div><section class="detail-section"><h3>Model decomposition</h3><div class="breakdown">${factor('BASE MULTIPLE', m.category_multiple)}${factor('GROWTH', m.growth_factor)}${factor('AGE', m.age_factor)}${factor('CHAINS', m.chain_factor)}</div><p class="detail-note">${fullMoney(r.tvl_usd)} TVL × ${multiple(m.category_multiple)} × ${multiple(m.growth_factor)} × ${multiple(m.age_factor)} × ${multiple(m.chain_factor)}<br>${m.comparable_count} category comparables · ${(m.category_weight * 100).toFixed(0)}% category weight · global median ${multiple(data.global_multiple)}. Values use full precision, then rounding and the $100K–$100B clamp.</p></section><section class="detail-section"><h3>Snapshot inputs</h3><div class="stats">${stat('Total value locked', fullMoney(r.tvl_usd))}${stat('7-day TVL change', percent(r.change_7d))}${stat('First listed', r.listed_at ?? 'Unknown')}${stat('Listed age', m.age_days === null ? 'Unknown' : Math.floor(m.age_days) + ' days')}${stat('Chains', r.chains.join(', ') || 'Unspecified')}${stat('Watchlist', r.watchlist ? 'Included' : 'Additional discovery')}</div></section><section class="detail-section"><h3>Farm plan / four measured actions</h3><p class="detail-note">An exploratory workflow, conditional on product availability and eligibility. Capital may lose value; cost ranges are estimates. No reward entitlement is implied.</p><ol class="steps">${r.farm_steps.map(step => {
      const [action, rest = ''] = step.split('. Cost: '), [cost, time = ''] = rest.split('. Time: ');
      return `<li><p>${esc(action)}.</p><div class="step-meta"><span><b>COST</b> ${esc(cost)}</span><span><b>TIME</b> ${esc(time)}</span></div></li>`;
    }).join('')}</ol></section><p class="detail-end">Snapshot as of ${esc(data.as_of)}. Recheck current product conditions before taking any action.</p>`;
    $('detail-close').addEventListener('click', () => $('detail').close());
    if (!$('detail').open) $('detail').showModal();
  }
  $('headers').addEventListener('click', e => {
    const button = e.target.closest('[data-sort]'); if (!button) return;
    const key = button.dataset.sort;
    direction = sort === key ? -direction : ['rank', 'name', 'category', 'chains'].includes(key) ? 1 : -1;
    sort = key; render();
    document.querySelector(`[data-sort="${sort}"]`).focus();
  });
  $('rows').addEventListener('click', e => {
    const row = e.target.closest('[data-slug]'); if (row) openDetail(row.dataset.slug, row.querySelector('button'));
  });
  $('detail').addEventListener('close', () => lastTrigger?.focus());
  $('detail').addEventListener('click', e => {
    const rect = $('detail').getBoundingClientRect();
    if (e.target === $('detail') && (e.clientX < rect.left || e.clientX > rect.right)) $('detail').close();
  });
  $('filters').addEventListener('submit', e => e.preventDefault());
  $('filters').addEventListener('input', render);
  $('filters').addEventListener('change', render);
  $('filters').addEventListener('reset', () => setTimeout(render, 0));
  $('method-open').setAttribute('aria-expanded', 'false');
  $('method-open').setAttribute('aria-controls', 'methodology');
  $('method-open').addEventListener('click', () => {
    const panel = $('methodology'); panel.hidden = !panel.hidden;
    $('method-open').setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  render();
})();
