'use strict';
// playback.js — 24h event log + hourly heatmap

// ── Tab switching ─────────────────────────────────────────────────
function switchTab(tab) {
  document.getElementById('app').style.display =
    tab === 'live' ? 'flex' : 'none';
  document.getElementById('view-playback').classList.toggle('hidden', tab !== 'playback');
  document.getElementById('view-heatmap').classList.toggle('hidden', tab !== 'heatmap');

  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });

  if (tab === 'playback') loadPlayback();
  if (tab === 'heatmap')  loadHeatmap();
}

// ── Playback timeline ─────────────────────────────────────────────
async function loadPlayback() {
  const container = document.getElementById('pb-timeline');
  const countEl   = document.getElementById('pb-count');
  container.innerHTML = '<div style="color:var(--text-dim);font-size:11px;padding:20px 0;text-align:center">Loading...</div>';
  try {
    const r = await fetch('/logs/events');
    if (!r.ok) throw new Error('no data');
    const events = await r.json();
    countEl.textContent = `${events.length} events`;

    if (events.length === 0) {
      container.innerHTML = '<div style="color:var(--text-dim);font-size:11px;padding:20px 0;text-align:center">No events in last 24h — environment has been clear.</div>';
      return;
    }

    // Render newest first
    container.innerHTML = [...events].reverse().map(e => {
      const ts   = new Date(e.timestamp_utc);
      const time = ts.toISOString().slice(11,19) + ' UTC';
      const date = ts.toISOString().slice(0,10);
      const alerts = e.alerts ? e.alerts.split(' | ').filter(Boolean) : [];
      const alertHtml = alerts.length
        ? `<div style="margin-top:3px;font-size:9px;color:var(--text-dim)">${alerts[0]}</div>`
        : '';
      return `
        <div class="pb-event ${e.status}">
          <div class="pb-dot ${e.status}"></div>
          <div>
            <div class="pb-detail">${e.status} · ${date}</div>
            <div class="pb-time">${time}</div>
            ${alertHtml}
          </div>
          <div class="pb-scores">
            J:${e.jam_score}%<br>
            S:${e.spoof_score}%<br>
            P:${e.probe_score}%
          </div>
        </div>`;
    }).join('');
  } catch {
    container.innerHTML = '<div style="color:var(--text-dim);font-size:11px;padding:20px 0;text-align:center">Start the daemon to begin logging events.</div>';
  }
}

// ── Heatmap — Rhythm of War ───────────────────────────────────────
async function loadHeatmap() {
  const canvas  = document.getElementById('heatmap-canvas');
  const legend  = document.getElementById('heatmap-legend');
  const ctx     = canvas.getContext('2d');
  const W = canvas.width  = canvas.offsetWidth  * devicePixelRatio || 680;
  const H = canvas.height = 120 * devicePixelRatio;

  ctx.clearRect(0, 0, W, H);

  let buckets;
  try {
    const r = await fetch('/logs/heatmap');
    if (!r.ok) throw new Error();
    buckets = await r.json();
  } catch {
    // Draw empty placeholder
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    for (let h = 0; h < 24; h++) {
      const x = (h / 24) * W;
      const bw = W / 24 - 2;
      ctx.fillRect(x + 1, 20, bw, H - 40);
    }
    legend.innerHTML = '<span>No log data yet — events will appear here once anomalies are detected</span>';
    return;
  }

  const maxCount = Math.max(1, ...buckets.map(b => b.count));
  const bw = W / 24;

  buckets.forEach((b, h) => {
    const x      = h * bw;
    const fill   = b.count / maxCount;
    const barH   = Math.max(4, fill * (H - 40));
    const y      = H - 20 - barH;

    // Color by worst status in that hour
    let color;
    if (b.max_status === 'CRITICAL')  color = `rgba(255,65,108,${0.3 + fill * 0.7})`;
    else if (b.max_status === 'DISTURBED') color = `rgba(184,198,255,${0.2 + fill * 0.6})`;
    else color = 'rgba(255,255,255,.06)';

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + 2, y, bw - 4, barH, 3);
    ctx.fill();

    // Hour label
    ctx.fillStyle = 'rgba(120,160,220,.5)';
    ctx.font = `${10 * devicePixelRatio}px "Courier New"`;
    ctx.textAlign = 'center';
    if (h % 3 === 0) {
      ctx.fillText(String(h).padStart(2,'0'), x + bw/2, H - 4);
    }
  });

  // Highlight current hour
  const nowH = new Date().getUTCHours();
  ctx.strokeStyle = 'rgba(0,198,255,.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(nowH * bw + bw/2, 0);
  ctx.lineTo(nowH * bw + bw/2, H - 20);
  ctx.stroke();

  // Pattern detection — find the peak hour
  const peak = buckets.reduce((a,b) => b.count > a.count ? b : a, buckets[0]);
  if (peak.count > 0) {
    legend.innerHTML = `
      <span style="color:var(--orb-a)">Peak activity: ${String(peak.hour).padStart(2,'0')}:00 UTC (${peak.count} events)</span>
      <span>| Blue line = now</span>`;
  } else {
    legend.innerHTML = '<span>No anomalies recorded yet in this 24h window</span>';
  }
}

// Auto-refresh playback data every 30s when visible
setInterval(() => {
  const pb = document.getElementById('view-playback');
  const hm = document.getElementById('view-heatmap');
  if (pb && !pb.classList.contains('hidden')) loadPlayback();
  if (hm && !hm.classList.contains('hidden')) loadHeatmap();
}, 30000);
