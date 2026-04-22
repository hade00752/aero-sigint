'use strict';

async function loadPlayback() {
  const container = document.getElementById('pb-timeline');
  const countEl = document.getElementById('pb-count');
  if(!container) return;
  container.innerHTML = '<div style="color:rgba(120,160,220,.45);font-size:11px;padding:20px;text-align:center">Loading...</div>';
  try {
    const r = await fetch('/logs/events');
    if (!r.ok) throw new Error('no data');
    const events = await r.json();
    if(countEl) countEl.textContent = events.length + ' events';
    if (events.length === 0) {
      container.innerHTML = '<div style="color:rgba(120,160,220,.45);font-size:12px;padding:20px;text-align:center">No events in last 24h — environment has been clear.</div>';
      return;
    }
    container.innerHTML = events.reverse().map(e => `
      <div class="pb-event ${e.status||''}">
        <div class="pb-dot ${e.status||''}"></div>
        <div>
          <div style="font-size:11px;color:rgba(180,210,255,.7);margin-bottom:2px">${e.status||'EVENT'} · ${(e.ts||'').slice(0,10)}</div>
          <div style="font-size:10px;color:rgba(120,160,220,.45)">${(e.ts||'').slice(11,19)} UTC</div>
          <div style="font-size:11px;color:rgba(180,210,255,.7);margin-top:2px">${e.reason||e.alerts||''}</div>
        </div>
        <div class="pb-scores">J:${e.jam_score||0}%<br>S:${e.spoof_score||0}%<br>P:${e.probe_score||0}%</div>
      </div>
    `).join('');
  } catch(err) {
    container.innerHTML = '<div style="color:rgba(120,160,220,.45);font-size:12px;padding:20px;text-align:center">No events logged yet.</div>';
  }
}

async function loadHeatmap() {
  const canvas = document.getElementById('heatmap-canvas');
  const legend = document.getElementById('heatmap-legend');
  if(!canvas) return;
  try {
    const r = await fetch('/logs/heatmap');
    if (!r.ok) throw new Error('no data');
    const buckets = await r.json();
    const max = Math.max(...buckets, 1);
    canvas.width = canvas.offsetWidth * devicePixelRatio || 600;
    canvas.height = 80 * devicePixelRatio;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cw = W / 24;
    ctx.clearRect(0,0,W,H);
    buckets.forEach((v, i) => {
      const intensity = v / max;
      const r = Math.round(intensity * 255);
      const b = Math.round((1-intensity) * 100);
      ctx.fillStyle = v === 0
        ? 'rgba(255,255,255,0.03)'
        : `rgba(${r},${Math.round(intensity*80)},${b},${0.3+intensity*0.7})`;
      ctx.fillRect(i*cw, 0, cw-1, H);
      if(v > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = `${Math.max(8, 10*devicePixelRatio)}px monospace`;
        ctx.fillText(v, i*cw + 2, H - 4);
      }
    });
    if(legend) {
      legend.innerHTML = '<span style="color:rgba(120,160,220,.45);font-size:9px;letter-spacing:.1em">00:00</span>' +
        '<span style="color:rgba(120,160,220,.45);font-size:9px;letter-spacing:.1em">06:00</span>' +
        '<span style="color:rgba(120,160,220,.45);font-size:9px;letter-spacing:.1em">12:00</span>' +
        '<span style="color:rgba(120,160,220,.45);font-size:9px;letter-spacing:.1em">18:00</span>' +
        '<span style="color:rgba(120,160,220,.45);font-size:9px;letter-spacing:.1em">23:00</span>';
      legend.style.display = 'flex';
      legend.style.justifyContent = 'space-between';
    }
  } catch(err) {
    if(canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(120,160,220,.45)';
      ctx.font = '12px monospace';
      ctx.fillText('No pattern data yet', 10, 30);
    }
  }
}
