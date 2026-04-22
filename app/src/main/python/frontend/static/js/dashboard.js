'use strict';
const STATUS_CFG={
  CLEAR:{a:'#00c6ff',b:'#0072ff',c:'#00f2fe',g:'rgba(0,198,255,.55)',ah:'200',label:'SAFE',sub:'All signals normal',cls:''},
  DISTURBED:{a:'#f5a623',b:'#c8841a',c:'#ffd580',g:'rgba(245,166,35,.5)',ah:'35',label:'WARNING',sub:'Anomaly detected — stay alert',cls:'disturbed'},
  CRITICAL:{a:'#ff3b3b',b:'#cc0000',c:'#ff8080',g:'rgba(255,59,59,.6)',ah:'0',label:'DANGER',sub:'Active threat — take action now',cls:'critical'},
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
  s('d-td',d.time_delta!=null?d.time_delta.toFixed(2)+'s':'—',(d.time_delta||0)>1);
  s('d-cj',d.coord_jump_m>0?Math.round(d.coord_jump_m)+'m':'0m',d.coord_jump_m>500);
  s('d-mag',d.magnitude_ut!=null?Math.round(d.magnitude_ut)+' µT':'—',d.magnitude_ut>110);
  s('d-emf',(d.emf_confidence||0)+'%');
  const srcMap={'NONE':'Normal','PASSIVE_LOSS':'Passive','ACTIVE_SUPPRESSION':'ACTIVE'};
  s('d-src',srcMap[d.emf_source]||'—',d.emf_source==='ACTIVE_SUPPRESSION');
  s('d-pr',(d.probe_count||0)+'/min');
  s('d-fj',(d.fused_jam_score??d.jam_score??0)+'%');
}

const PLAIN={
  'RF JAMMING':'Radio signals are being jammed',
  'ACTIVE_SUPPRESSION':'High-energy interference source nearby',
  'TIME WARP':'GPS time is being manipulated',
  'TELEPORT':'Your location data jumped suddenly',
  'PROBE FLOOD':'Multiple unknown devices scanning nearby',
  'SIGNAL LOSS':'Signal lost — possible obstruction',
  'EMF ANOMALY':'Unusual magnetic field detected',
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
  document.getElementById('app').style.display=t==='live'?'flex':'none';
  ['log','pattern'].forEach(v=>{
    const el=document.getElementById('view-'+v);
    if(el)el.classList.toggle('hidden',t!==v);
  });
  document.querySelectorAll('.tab').forEach(el=>el.classList.toggle('active',el.dataset.tab===t));
  if(t==='log')loadPlayback();
  if(t==='pattern')loadHeatmap();
}

// Waterfall
const cv=document.getElementById('wf'),cx=cv.getContext('2d');
let wfData=[];
function wfResize(){cv.width=cv.offsetWidth*devicePixelRatio;cv.height=cv.offsetHeight*devicePixelRatio;}
function wfPush(j,s,p){
  wfData.push({j:j/100,s:s/100,p:p/100});
  const maxCols=cv.width||400;
  if(wfData.length>maxCols)wfData.shift();
  const W=cv.width,H=cv.height,cw=W/Math.max(wfData.length,1);
  cx.clearRect(0,0,W,H);
  for(let i=0;i<wfData.length;i++){
    const{j:jv,s:sv,p:pv}=wfData[i],x=i*cw;
    cx.fillStyle='rgba(6,13,26,.88)';cx.fillRect(x,0,cw+1,H);
    if(jv>0){const h=jv*H*.4,g=cx.createLinearGradient(0,H,0,H-h);g.addColorStop(0,`rgba(245,166,35,${jv*.8})`);g.addColorStop(1,`rgba(255,220,128,${jv*.3})`);cx.fillStyle=g;cx.fillRect(x,H-h,cw+1,h);}
    if(sv>0){const h=sv*H*.35,m=H*.5,g=cx.createLinearGradient(0,m+h/2,0,m-h/2);g.addColorStop(0,`rgba(0,114,255,${sv*.7})`);g.addColorStop(1,`rgba(0,198,255,${sv*.5})`);cx.fillStyle=g;cx.fillRect(x,m-h/2,cw+1,h);}
    if(pv>0){const h=pv*H*.3,g=cx.createLinearGradient(0,0,0,h);g.addColorStop(0,`rgba(127,255,212,${pv*.9})`);g.addColorStop(1,`rgba(0,176,155,${pv*.3})`);cx.fillStyle=g;cx.fillRect(x,0,cw+1,h);}
  }
  cx.fillStyle='rgba(0,0,0,.08)';for(let y=0;y<H;y+=3)cx.fillRect(0,y,W,1);
}

function wfDraw(){if(wfData.length>0)wfPush(0,0,0);}
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
  let ws=null,ready=false;
  const conn=()=>{try{ws=new WebSocket('ws://127.0.0.1:9002');ws.onopen=()=>{ready=true;};ws.onclose=()=>{ready=false;setTimeout(conn,3000);};ws.onerror=()=>{ready=false;};}catch{}};
  conn();
  navigator.geolocation.watchPosition(pos=>{
    if(!ready||!ws)return;
    try{ws.send(JSON.stringify({lat:pos.coords.latitude,lon:pos.coords.longitude,accuracy:pos.coords.accuracy}));}catch{};
  },()=>{},{enableHighAccuracy:true,maximumAge:45000,timeout:15000});
}

// Stealth activation — triple tap brand
let _tapCount=0,_tapTimer=null;
document.addEventListener('DOMContentLoaded',()=>{
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
  wfResize();window.addEventListener('resize',()=>{wfResize();});
  spawnBokeh();
  for(let i=0;i<80;i++)wfPush(0,0,0);
  try{
    const r=await fetch('/state',{signal:AbortSignal.timeout(4000)});
    if(r.ok){connectSSE();startGPS();return;}
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

window.addEventListener('load', () => { setTimeout(boot, 600); });
