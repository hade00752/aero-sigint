'use strict';
const STATUS_CFG={
  CLEAR:{a:'#00c6ff',b:'#0072ff',c:'#00f2fe',g:'rgba(0,198,255,.55)',ah:'200',label:'SAFE',sub:'All signals normal',cls:''},
  DISTURBED:{a:'#f5a623',b:'#c8841a',c:'#ffd580',g:'rgba(245,166,35,.5)',ah:'35',label:'WARNING',sub:'Signal interference detected — stay alert',cls:'disturbed'},
  CRITICAL:{a:'#ff3b3b',b:'#cc0000',c:'#ff8080',g:'rgba(255,59,59,.6)',ah:'0',label:'DANGER',sub:'GPS compromised — seek cover now',cls:'critical'},
};
let _cur='CLEAR';

function applyStatus(s){
  if(s===_cur)return; _cur=s;
  const c=STATUS_CFG[s]||STATUS_CFG.CLEAR;
  const r=document.documentElement.style;
  r.setProperty('--orb-a',c.a);r.setProperty('--orb-b',c.b);r.setProperty('--orb-c',c.c);
  r.setProperty('--orb-glow',c.g);r.setProperty('--ah',c.ah);
  const sl=document.getElementById('sl');
  sl.textContent=c.label;sl.style.color=c.a;sl.style.textShadow=`0 0 20px ${c.g}`;
  document.getElementById('ss').textContent=c.sub;
  const or=document.getElementById('or');
  or.style.borderColor=c.a;or.style.boxShadow=`0 0 18px ${c.g}`;
  document.body.className=c.cls;
  const dot=document.getElementById('dot');
  dot.style.background=c.a;dot.style.boxShadow=`0 0 8px ${c.a}`;
  if(navigator.vibrate){
    if(s==='CRITICAL')navigator.vibrate([100,50,100,50,100]);
    else if(s==='DISTURBED')navigator.vibrate(60);
  }
}

function setCard(id,score){
  const tc=document.getElementById('tc-'+id);
  const vEl=document.getElementById('v-'+id);
  const sEl=document.getElementById('s-'+id);
  if(!tc)return;
  vEl.innerHTML=Math.round(score)+'<span style="font-size:12px;opacity:.6">%</span>';
  tc.classList.toggle('hot',score>=60);
  tc.classList.toggle('mid',score>=30&&score<60);
  if(score>=60){sEl.textContent='HIGH';sEl.className='tc-status danger-badge';}
  else if(score>=30){sEl.textContent='ELEVATED';sEl.className='tc-status warn-badge';}
  else{sEl.textContent='Clear';sEl.className='tc-status safe-badge';}
}

function updateSummary(d){
  const s=id=>document.getElementById(id);
  s('su-cn0').textContent=d.cn0!=null?Math.round(d.cn0)+' dB':'—';
  s('su-emf').textContent=d.magnitude_ut!=null?Math.round(d.magnitude_ut)+' µT':'—';
  const gpsEl=s('su-gps');
  const jumped=d.coord_jump_m>500;
  gpsEl.textContent=jumped?'MOVED':'OK';
  gpsEl.classList.toggle('hot',jumped);
  s('su-dev').textContent=(d.probe_count||0)+'/m';
}

function updateDetail(d){
  const s=(id,v,hot)=>{const el=document.getElementById(id);if(el){el.textContent=v;if(hot!==undefined)el.classList.toggle('hot',hot);}};
  s('d-cn0',d.cn0!=null?d.cn0.toFixed(1)+' dBHz':'—');
  s('d-td',d.time_delta!=null?d.time_delta.toFixed(2)+'s':'—',false);
  s('d-cj',d.coord_jump_m>0?Math.round(d.coord_jump_m)+'m':'0m',d.coord_jump_m>500);
  s('d-mag',d.magnitude_ut!=null?Math.round(d.magnitude_ut)+' µT':'—',d.magnitude_ut>110);
  s('d-emf',(d.emf_confidence||0)+'%');
  const srcMap={'NONE':'Normal','PASSIVE_LOSS':'Passive','ACTIVE_SUPPRESSION':'ACTIVE'};
  s('d-src',srcMap[d.emf_source]||'—',d.emf_source==='ACTIVE_SUPPRESSION');
  s('d-pr',(d.probe_count||0)+'/min');
  s('d-fj',(d.fused_jam_score??d.jam_score??0)+'%');
}

const PLAIN={
  'RF JAMMING':'GPS signals are being jammed — comms may fail',
  'ACTIVE_SUPPRESSION':'High-power jamming source detected nearby',
  'TELEPORT':'Location jumped suddenly — GPS may be spoofed',
  'PROBE FLOOD':'Unknown devices scanning nearby — possible surveillance',
  'SIGNAL LOSS':'GPS signal lost — obstruction or jamming',
  'EMF ANOMALY':'Unusual magnetic field detected nearby',
};
function translate(a){
  for(const[k,v] of Object.entries(PLAIN)){if(a.includes(k))return v;}
  return a;
}

let _alertTimer=null,_alertIdx=0;
function updateAlert(alerts){
  const icon=document.getElementById('ai');
  const txt=document.getElementById('at');
  if(!alerts||!alerts.length){
    icon.classList.remove('show');txt.className='q';
    txt.textContent='· · · All clear · · ·';
    clearInterval(_alertTimer);return;
  }
  icon.classList.add('show');txt.className='';
  const show=()=>{_alertIdx=_alertIdx%alerts.length;txt.textContent='▲ '+translate(alerts[_alertIdx++]);};
  show();clearInterval(_alertTimer);_alertTimer=setInterval(show,3500);
}

let _lostTimer=null;
function markConnected(){
  const d=document.getElementById('dot');
  d.style.background='#00c6ff';d.style.boxShadow='0 0 8px #00c6ff';
  clearTimeout(_lostTimer);
  _lostTimer=setTimeout(()=>{d.style.background='#444';d.style.boxShadow='none';},6000);
}

function ingest(data){
  markConnected();
  applyStatus(data.status||'CLEAR');
  setCard('jam',data.fused_jam_score??data.jam_score??0);
  setCard('spoof',data.spoof_score||0);
  setCard('probe',data.probe_score||0);
  updateSummary(data);
  updateDetail(data);
  updateAlert(data.alerts);
  if(data.ts){const el=document.getElementById('ts');if(el)el.textContent=new Date(data.ts).toISOString().slice(11,19)+' UTC';}
  wfPush(data.fused_jam_score||data.jam_score||0,data.spoof_score||0,data.probe_score||0);
  if(typeof window._stealthIngestHook==='function')window._stealthIngestHook(data);
}

let _detailOpen=false;
function toggleDetail(){
  _detailOpen=!_detailOpen;
  document.getElementById('detail').classList.toggle('open',_detailOpen);
}

function switchTab(t){
  const app=document.getElementById('app');
  if(app) app.style.display=t==='live'?'flex':'none';
  ['log','pattern','help'].forEach(v=>{
    const el=document.getElementById('view-'+v);
    if(el) el.classList.toggle('hidden',t!==v);
  });
  document.querySelectorAll('.tab').forEach(el=>{
    el.classList.toggle('active',el.dataset.tab===t);
  });
  if(t==='log') loadPlayback();
  if(t==='pattern') loadHeatmap();
}

// Waterfall
let wfData=[];
const WF_MAX=60;
function wfResize(){}
function wfDraw(){}
function wfPush(j,s,p){
  wfData.push({j:Math.round(j),s:Math.round(s),p:Math.round(p)});
  if(wfData.length>WF_MAX)wfData.shift();
  const container=document.getElementById('wf');
  if(!container)return;
  let html='';
  for(let i=0;i<wfData.length;i++){
    const d=wfData[i];
    const jh=Math.round(d.j*0.4);
    const sh=Math.round(d.s*0.35);
    const ph=Math.round(d.p*0.3);
    const jc=d.j>0?'rgba(245,166,35,'+(0.3+d.j/100*0.7)+')':'transparent';
    const sc=d.s>0?'rgba(0,114,255,'+(0.3+d.s/100*0.7)+')':'transparent';
    const pc=d.p>0?'rgba(0,176,155,'+(0.3+d.p/100*0.7)+')':'transparent';
    html+='<div style="flex:1;height:100%;display:flex;flex-direction:column">';
    html+='<div style="height:'+ph+'%;background:'+pc+';min-height:'+(d.p>0?2:0)+'px"></div>';
    html+='<div style="flex:1"></div>';
    html+='<div style="height:'+jh+'%;background:'+jc+';min-height:'+(d.j>0?2:0)+'px"></div>';
    html+='</div>';
  }
  container.innerHTML=html;
  container.style.cssText='width:100%;height:56px;display:flex;align-items:stretch;gap:1px;';
}
function spawnBokeh(){
  const l=document.getElementById('bk');
  for(let i=0;i<16;i++){
    const b=document.createElement('div');b.className='bp';
    const sz=18+Math.random()*55;
    Object.assign(b.style,{width:sz+'px',height:sz+'px',left:(Math.random()*100)+'%',bottom:(-sz)+'px',animationDuration:(10+Math.random()*20)+'s',animationDelay:(Math.random()*15)+'s',filter:`blur(${4+Math.random()*7}px)`});
    l.appendChild(b);
  }
}

function connectSSE(){
  try{
    const es=new EventSource('/stream');
    es.onmessage=e=>{try{ingest(JSON.parse(e.data));}catch{}};
    es.onerror=()=>{es.close();setTimeout(connectSSE,3000);};
  }catch{startPolling();}
}
async function startPolling(){
  const tick=async()=>{try{const r=await fetch('/state');if(r.ok)ingest(await r.json());}catch{}setTimeout(tick,2000);};
  tick();
}

function startGPS(){
  if(!navigator.geolocation)return;
  let ws=null,ready=false,lastPos=null;
  const send=()=>{
    if(!ready||!ws||!lastPos)return;
    try{ws.send(JSON.stringify({lat:lastPos.coords.latitude,lon:lastPos.coords.longitude,accuracy:lastPos.coords.accuracy,gnss_ts:lastPos.timestamp/1000}));}catch{}
  };
  const conn=()=>{try{ws=new WebSocket('ws://127.0.0.1:9001');ws.onopen=()=>{ready=true;send();};ws.onclose=()=>{ready=false;setTimeout(conn,3000);};ws.onerror=()=>{ready=false;};}catch{}};
  conn();
  // Re-poll every 5s so a static mock position keeps flowing even without movement
  setInterval(()=>{
    navigator.geolocation.getCurrentPosition(pos=>{lastPos=pos;send();},()=>{},{enableHighAccuracy:true,maximumAge:4000,timeout:8000});
  },5000);
  navigator.geolocation.watchPosition(pos=>{lastPos=pos;send();},()=>{},{enableHighAccuracy:true,maximumAge:45000,timeout:15000});
}

// Stealth activation — triple tap brand
let _tapCount=0,_tapTimer=null;
document.addEventListener('DOMContentLoaded',()=>{
  // Battery restriction banner — tap opens Android battery optimisation settings
  document.getElementById('battery-warn')?.addEventListener('click',()=>{
    if(window.BatteryBridge) window.BatteryBridge.openBatterySettings();
  });

  // Triple tap globe for stealth
  const orb = document.getElementById('orb');
  if(orb){
    let orbTaps=0, orbTimer=null;
    orb.addEventListener('click',()=>{
      orbTaps++;clearTimeout(orbTimer);
      orbTimer=setTimeout(()=>{orbTaps=0;},800);
      if(orbTaps>=3){orbTaps=0;toggleStealth(true);}
    });
  }

  const brand=document.getElementById('brand');
  if(brand){
    brand.addEventListener('click',()=>{
      _tapCount++;clearTimeout(_tapTimer);
      _tapTimer=setTimeout(()=>{_tapCount=0;},800);
      if(_tapCount>=3){_tapCount=0;toggleStealth(true);}
    });
  }
});

async function boot(){
  // Reload waterfall history from server on reconnect
  try {
    const r = await fetch('/history');
    if(r.ok){
      const hist = await r.json();
      hist.forEach(h => wfPush(h.j||0, h.s||0, h.p||0));
    }
  } catch(e) {}
  wfResize();
  window.addEventListener('resize',()=>{wfResize();wfDraw();});
  setTimeout(()=>{wfResize();for(let i=0;i<80;i++)wfPush(0,0,0);},300);
  setTimeout(()=>{wfResize();wfDraw();},800);
  spawnBokeh();
  try{
    const r=await fetch('/state',{signal:AbortSignal.timeout(4000)});
    if(r.ok){
      const d=await r.json();
      if('battery_unrestricted' in d) updateBatteryWarning(d.battery_unrestricted);
      connectSSE();startGPS();checkBatteryStatus();checkLowPower();return;
    }
  }catch{}
  runDemo();
}

// Demo mode
const DEMO=[
  {status:'CLEAR',jam_score:3,fused_jam_score:1,spoof_score:0,probe_score:2,cn0:42.1,magnitude_ut:45,emf_confidence:0,emf_source:'NONE',time_delta:0,coord_jump_m:0,probe_count:3,alerts:[]},
  {status:'CLEAR',jam_score:6,fused_jam_score:3,spoof_score:0,probe_score:3,cn0:41.3,magnitude_ut:47,emf_confidence:0,emf_source:'NONE',time_delta:0,coord_jump_m:0,probe_count:5,alerts:[]},
  {status:'DISTURBED',jam_score:55,fused_jam_score:50,spoof_score:0,probe_score:20,cn0:30.2,magnitude_ut:52,emf_confidence:35,emf_source:'PASSIVE_LOSS',time_delta:0,coord_jump_m:0,probe_count:24,alerts:['SIGNAL LOSS — possible obstruction']},
  {status:'DISTURBED',jam_score:65,fused_jam_score:62,spoof_score:0,probe_score:32,cn0:25.8,magnitude_ut:58,emf_confidence:55,emf_source:'ACTIVE_SUPPRESSION',time_delta:0,coord_jump_m:0,probe_count:36,alerts:['RF JAMMING — signals being suppressed','EMF ANOMALY — interference source nearby']},
  {status:'CRITICAL',jam_score:80,fused_jam_score:80,spoof_score:65,probe_score:75,cn0:18.4,magnitude_ut:138,emf_confidence:80,emf_source:'ACTIVE_SUPPRESSION',time_delta:0,coord_jump_m:1400,probe_count:68,alerts:['RF JAMMING — active suppression confirmed','TELEPORT — location data jumped suddenly','PROBE FLOOD — unknown devices scanning']},
  {status:'CRITICAL',jam_score:88,fused_jam_score:88,spoof_score:78,probe_score:85,cn0:14.2,magnitude_ut:162,emf_confidence:90,emf_source:'ACTIVE_SUPPRESSION',time_delta:0,coord_jump_m:3200,probe_count:84,alerts:['RF JAMMING — active suppression confirmed','TELEPORT — location data jumped suddenly','PROBE FLOOD — possible drone surveillance']},
  {status:'DISTURBED',jam_score:45,fused_jam_score:40,spoof_score:10,probe_score:28,cn0:31.0,magnitude_ut:68,emf_confidence:30,emf_source:'PASSIVE_LOSS',time_delta:0,coord_jump_m:0,probe_count:30,alerts:['SIGNAL LOSS — signal degraded']},
  {status:'CLEAR',jam_score:4,fused_jam_score:2,spoof_score:0,probe_score:2,cn0:41.8,magnitude_ut:44,emf_confidence:0,emf_source:'NONE',time_delta:0,coord_jump_m:0,probe_count:4,alerts:[]},
];
let _di=0;
function runDemo(){
  ingest({...DEMO[_di%DEMO.length],ts:new Date().toISOString()});
  _di++;setTimeout(runDemo,2800+Math.random()*1200);
}

function updateBatteryWarning(unrestricted) {
  const el = document.getElementById('battery-warn');
  if (!el) return;
  // null = file not written yet (keep hidden), false = restricted (show warning)
  el.classList.toggle('hidden', unrestricted !== false);
}

async function checkBatteryStatus() {
  try {
    const r = await fetch('/state', { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const d = await r.json();
      if ('battery_unrestricted' in d) updateBatteryWarning(d.battery_unrestricted);
    }
  } catch {}
  setTimeout(checkBatteryStatus, 30000);
}

// ── Low power mode ────────────────────────────────────────────────
let _lowPower = false;

function setLowPowerUI(active) {
  _lowPower = active;
  const btn = document.getElementById('lp-btn');
  if (!btn) return;
  btn.textContent = active ? 'POWER: LOW' : 'POWER: NORMAL';
  btn.classList.toggle('lp-active', active);
}

async function toggleLowPower() {
  try {
    const r = await fetch('/lowpower', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({enabled: !_lowPower})
    });
    if (r.ok) { const d = await r.json(); setLowPowerUI(d.low_power); }
  } catch {}
}

async function checkLowPower() {
  try {
    const r = await fetch('/lowpower', {signal: AbortSignal.timeout(2000)});
    if (r.ok) { const d = await r.json(); setLowPowerUI(d.low_power); }
  } catch {}
}

// ── Test alarm ────────────────────────────────────────────────────
async function testAlarm() {
  const btn = document.getElementById('alarm-btn');
  if (btn) { btn.textContent = 'FIRING...'; btn.disabled = true; }
  try {
    await fetch('/test-alarm', {method: 'POST'});
  } catch {}
  setTimeout(() => {
    if (btn) { btn.textContent = 'TEST ALARM'; btn.disabled = false; }
  }, 3000);
}

window.addEventListener('load', () => { setTimeout(boot, 600); });
