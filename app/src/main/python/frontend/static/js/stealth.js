'use strict';
// stealth.js — Checkpoint-safe camouflage mode
// Activation: triple-tap the brand name in the top bar
// Deactivation: triple-tap the stealth orb

const STEALTH_STORAGE_KEY = 'sigint_stealth';
let _stealthActive = false;
let _lastReading = null;

// ── Deactivation listener (exit stealth mode via triple-tap on stealth orb) ──
// Activation is handled in dashboard.js (triple-tap main orb or brand).
document.addEventListener('DOMContentLoaded', () => {
  const stealthOrb = document.getElementById('stealth-orb');
  if (stealthOrb) {
    let stealthTaps = 0, stealthTimer = null;
    stealthOrb.addEventListener('click', () => {
      stealthTaps++;
      clearTimeout(stealthTimer);
      stealthTimer = setTimeout(() => { stealthTaps = 0; }, 800);
      if (stealthTaps >= 3) {
        stealthTaps = 0;
        toggleStealth(false);
      }
    });
  }

  // Restore state across reloads
  if (sessionStorage.getItem(STEALTH_STORAGE_KEY) === '1') {
    toggleStealth(true, true);
  }
});

// ── Toggle stealth ────────────────────────────────────────────────
function toggleStealth(activate, silent = false) {
  _stealthActive = activate;
  const overlay = document.getElementById('stealth-overlay');
  const app     = document.getElementById('app');
  if (!overlay || !app) return;

  if (activate) {
    overlay.classList.remove('hidden');
    app.style.display = 'none';
    document.getElementById('app-title').textContent = 'Battery Health';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f5f5f7');
    sessionStorage.setItem(STEALTH_STORAGE_KEY, '1');
    if (!silent) updateStealth(_lastReading);
  } else {
    overlay.classList.add('hidden');
    app.style.display = 'flex';
    document.getElementById('app-title').textContent = 'Aero·SIGINT';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#060d1a');
    sessionStorage.removeItem(STEALTH_STORAGE_KEY);
  }
}

// ── Map real data onto the stealth UI ────────────────────────────
// Mapping table (plausible battery health cover):
//   fused_jam_score  → Battery Health  (high jam = "degraded battery")
//   spoof_score      → Cell Temp       (high spoof = "high temp")
//   emf_confidence   → Charge Cycles   (high EMF = "high cycle count")
//   status           → orb color + optimization status text

function updateStealth(data) {
  if (!data) return;
  _lastReading = data;
  if (!_stealthActive) return;

  const jam   = data.fused_jam_score || data.jam_score || 0;
  const spoof = data.spoof_score || 0;
  const emf   = data.emf_confidence || 0;
  const status = data.status || 'CLEAR';

  // Battery health: 100% when clear, degrades with jam
  const batteryHealth = Math.max(12, 98 - Math.round(jam * 0.85));
  const batteryEl = document.getElementById('s-battery');
  const batterySub = batteryEl?.nextElementSibling;
  if (batteryEl) batteryEl.textContent = batteryHealth + '%';
  if (batterySub) {
    if (batteryHealth > 80) { batterySub.textContent = 'Excellent'; batterySub.className = 'stealth-stat-sub'; }
    else if (batteryHealth > 50) { batterySub.textContent = 'Good'; batterySub.className = 'stealth-stat-sub warn'; }
    else { batterySub.textContent = 'Replace Soon'; batterySub.className = 'stealth-stat-sub danger'; }
  }

  // Cell temp: 28°C baseline, spikes with spoof score
  const temp = 28 + Math.round(spoof * 0.22);
  const tempEl = document.getElementById('s-temp');
  const tempSub = tempEl?.nextElementSibling;
  if (tempEl) tempEl.textContent = temp + '°C';
  if (tempSub) {
    if (temp < 35) { tempSub.textContent = 'Normal'; tempSub.className = 'stealth-stat-sub'; }
    else if (temp < 45) { tempSub.textContent = 'Warm'; tempSub.className = 'stealth-stat-sub warn'; }
    else { tempSub.textContent = 'Hot'; tempSub.className = 'stealth-stat-sub danger'; }
  }

  // Charge cycles: 100 + emf contribution
  const cycles = 100 + Math.round(emf * 2.8);
  const cyclesEl = document.getElementById('s-cycles');
  if (cyclesEl) cyclesEl.textContent = cycles;

  // Orb color + status text
  const orb = document.getElementById('stealth-orb');
  const stEl = document.getElementById('stealth-status');
  if (orb && stEl) {
    if (status === 'CRITICAL') {
      orb.style.background = 'radial-gradient(circle at 35% 30%, #fff 0%, #ff9f0a 40%, #bf5c00 100%)';
      orb.style.boxShadow = '0 4px 24px rgba(255,159,10,.5)';
      stEl.textContent = 'Calibrating cells...';
      stEl.style.color = '#ff9f0a';
    } else if (status === 'DISTURBED') {
      orb.style.background = 'radial-gradient(circle at 35% 30%, #fff 0%, #ffcc00 40%, #9d7800 100%)';
      orb.style.boxShadow = '0 4px 24px rgba(255,204,0,.4)';
      stEl.textContent = 'Balancing charge...';
      stEl.style.color = '#ffcc00';
    } else {
      orb.style.background = 'radial-gradient(circle at 35% 30%, #fff 0%, #34c759 40%, #248a3d 100%)';
      orb.style.boxShadow = '0 4px 24px rgba(52,199,89,.4)';
      stEl.textContent = 'Optimizing...';
      stEl.style.color = '#34c759';
    }
  }

  // Progress bar: inverse of threat level
  const threatLevel = Math.max(jam, spoof, emf) / 100;
  const progressFill = document.getElementById('stealth-bar-fill');
  if (progressFill) {
    progressFill.style.width = Math.round(60 + (1 - threatLevel) * 38) + '%';
  }
}

// Hook into the main ingest pipeline
const _origIngest = window._stealthIngestHook;
window._stealthIngestHook = updateStealth;
