'use strict';

// ── Internationalisation ──────────────────────────────────────────
const _T={
  en:{
    nid:'NODE 01 · FIELD MONITOR',
    bat_warn:'BACKGROUND RESTRICTED · TAP TO FIX',
    lbl_jam:'GPS<br>Jamming',        desc_jam:'signals blocked',
    lbl_spoof:'GPS<br>Spoofing',     desc_spoof:'position faked',
    lbl_probe:'Drone<br>Surveillance',desc_probe:'unknown probes',
    badge_clear:'Clear', badge_elevated:'ELEVATED', badge_high:'HIGH',
    sum_cn0:'GPS Signal', sum_emf:'Mag Field', sum_pos:'Position', sum_dev:'Probes',
    gps_ok:'OK', gps_moved:'MOVED', gps_nofix:'NO FIX',
    tap_detail:'TAP FOR DETAILS',
    dlbl_cn0:'GPS Signal', dlbl_td:'Clock Drift', dlbl_cj:'Pos Jump',
    dlbl_mag:'Mag Field', dlbl_emf:'EMF Conf', dlbl_src:'EMF Source',
    dlbl_pr:'Probes/min', dlbl_fj:'Jam Score',
    all_clear:'· · · All clear · · ·',
    tab_live:'LIVE', tab_log:'24H LOG', tab_pattern:'PATTERN', tab_guide:'GUIDE',
    btn_pwr_normal:'POWER: NORMAL', btn_pwr_low:'POWER: LOW',
    btn_alarm:'TEST ALARM', btn_alarm_fire:'FIRING...',
    back_live:'← BACK TO LIVE',
    log_title:'24H EVENT LOG', log_events:'events',
    pat_title:'PATTERN — 24H ACTIVITY',
    help_title:'FIELD GUIDE', help_badge:'offline · no internet needed',
    status_safe_lbl:'SAFE',    status_safe_sub:'All signals normal',
    status_warn_lbl:'WARNING', status_warn_sub:'Signal interference detected — stay alert',
    status_crit_lbl:'ALERT',   status_crit_sub:'GPS signal unreliable — do not trust location',
  },
  ar:{
    nid:'وحدة 01 · مراقبة ميدانية',
    bat_warn:'التطبيق محدود · اضغط للإصلاح',
    lbl_jam:'تشويش<br>GPS',          desc_jam:'إشارة محجوبة',
    lbl_spoof:'تزوير<br>الموقع',     desc_spoof:'موقع مزيّف',
    lbl_probe:'مراقبة<br>جوية',      desc_probe:'أجهزة مجهولة',
    badge_clear:'آمن', badge_elevated:'مرتفع', badge_high:'عالٍ',
    sum_cn0:'إشارة GPS', sum_emf:'مجال مغن.', sum_pos:'الموقع', sum_dev:'مسح',
    gps_ok:'طبيعي', gps_moved:'قفز', gps_nofix:'لا إشارة',
    tap_detail:'اضغط للتفاصيل',
    dlbl_cn0:'إشارة GPS', dlbl_td:'انجراف الوقت', dlbl_cj:'قفزة الموقع',
    dlbl_mag:'مجال مغناطيسي', dlbl_emf:'ثقة EMF', dlbl_src:'مصدر EMF',
    dlbl_pr:'مسح/دقيقة', dlbl_fj:'درجة التشويش',
    all_clear:'· · · لا تهديد · · ·',
    tab_live:'مباشر', tab_log:'سجل 24س', tab_pattern:'نمط', tab_guide:'دليل',
    btn_pwr_normal:'طاقة: عادي', btn_pwr_low:'طاقة: موفّر',
    btn_alarm:'اختبار الإنذار', btn_alarm_fire:'يُطلق...',
    back_live:'العودة للمباشر →',
    log_title:'سجل الأحداث — 24 ساعة', log_events:'أحداث',
    pat_title:'نمط — نشاط 24 ساعة',
    help_title:'دليل الميدان', help_badge:'يعمل دون إنترنت',
    status_safe_lbl:'آمن',   status_safe_sub:'الإشارات طبيعية',
    status_warn_lbl:'تنبيه', status_warn_sub:'تشويش مكتشف — كن يقظاً',
    status_crit_lbl:'خطر',   status_crit_sub:'إشارة GPS غير موثوقة — لا تعتمد على موقعك',
  }
};
let _lang=localStorage.getItem('sigint_lang')||'en';
function t(k){return _T[_lang][k]||_T.en[k]||k;}
function toggleLang(){applyLang(_lang==='en'?'ar':'en');}

function applyLang(lang){
  _lang=lang;
  localStorage.setItem('sigint_lang',lang);
  const isAr=lang==='ar';
  document.documentElement.setAttribute('lang',lang);
  document.documentElement.setAttribute('dir',isAr?'rtl':'ltr');
  const btn=document.getElementById('lang-btn');
  if(btn)btn.textContent=isAr?'EN':'AR';
  const setT=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  const setH=(id,v)=>{const e=document.getElementById(id);if(e)e.innerHTML=v;};
  setT('nid',t('nid'));
  setT('battery-warn-text',t('bat_warn'));
  setH('lbl-jam',t('lbl_jam'));       setT('desc-jam',t('desc_jam'));
  setH('lbl-spoof',t('lbl_spoof'));   setT('desc-spoof',t('desc_spoof'));
  setH('lbl-probe',t('lbl_probe'));   setT('desc-probe',t('desc_probe'));
  setT('slbl-cn0',t('sum_cn0'));  setT('slbl-emf',t('sum_emf'));
  setT('slbl-pos',t('sum_pos'));  setT('slbl-dev',t('sum_dev'));
  setT('tap-detail',t('tap_detail'));
  setT('dlbl-cn0',t('dlbl_cn0')); setT('dlbl-td',t('dlbl_td'));
  setT('dlbl-cj',t('dlbl_cj'));   setT('dlbl-mag',t('dlbl_mag'));
  setT('dlbl-emf',t('dlbl_emf')); setT('dlbl-src',t('dlbl_src'));
  setT('dlbl-pr',t('dlbl_pr'));   setT('dlbl-fj',t('dlbl_fj'));
  setT('log-title',t('log_title')); setT('pat-title',t('pat_title'));
  setT('help-title',t('help_title')); setT('help-badge',t('help_badge'));
  document.querySelectorAll('.tab').forEach(b=>{
    const map={live:'tab_live',log:'tab_log',pattern:'tab_pattern',help:'tab_guide'};
    if(map[b.dataset.tab])b.textContent=t(map[b.dataset.tab]);
  });
  document.querySelectorAll('.view-back').forEach(e=>e.textContent=t('back_live'));
  const ab=document.getElementById('alarm-btn');
  if(ab&&!ab.disabled)ab.textContent=t('btn_alarm');
  const lb=document.getElementById('lp-btn');
  if(lb)lb.textContent=_lowPower?t('btn_pwr_low'):t('btn_pwr_normal');
  updateHelpContent();
  // Force re-render of dynamic strings
  const atEl=document.getElementById('at');
  if(atEl&&atEl.classList.contains('q'))atEl.textContent=t('all_clear');
  applyStatus(_cur,true);
}

function getHelpHTML(){
  if(_lang==='ar') return `
<div class="help-section">
  <div class="help-title">ما تعنيه الألوان</div>
  <div class="help-card help-safe"><div class="help-card-head">آمن — أزرق</div>
    <div class="help-card-body">GPS يعمل بشكل طبيعي. لا يوجد تشويش. استمر في تشغيل التطبيق في الخلفية.</div></div>
  <div class="help-card help-warn"><div class="help-card-head">تنبيه — برتقالي</div>
    <div class="help-card-body">يوجد تشويش في الإشارة. موقعك على الخريطة قد يكون غير دقيق. لا تعتمد على الملاحة.</div></div>
  <div class="help-card help-danger"><div class="help-card-head">خطر — أحمر</div>
    <div class="help-card-body">إشارات GPS تُحجب أو تُزوَّر. <strong>لا تثق بموقع هاتفك.</strong> لاحظ المعالم المحيطة بك. انتقل إلى مكان أكثر أماناً إن أمكن.</div></div>
</div>
<div class="help-section">
  <div class="help-title">ما يعنيه كل تهديد</div>
  <div class="help-card"><div class="help-card-head">تشويش GPS</div>
    <div class="help-card-body">إشارات الأقمار الاصطناعية تُحجب. GPS يتوقف عن العمل أو يظهر موقعاً خاطئاً. الخرائط غير موثوقة.</div></div>
  <div class="help-card"><div class="help-card-head">تزوير الموقع</div>
    <div class="help-card-body">إشارات GPS مزيفة تجعل هاتفك يعتقد أنك في مكان آخر. إذا ظهر موقعك فجأة بعيداً عن الواقع، فـGPS مزوَّر. لا تتبع الملاحة.</div></div>
  <div class="help-card"><div class="help-card-head">مراقبة جوية</div>
    <div class="help-card-body">أجهزة لاسلكية مجهولة تفحص المنطقة. قلل وجودك اللاسلكي: أوقف WiFi والبلوتوث إن كان آمناً.</div></div>
</div>
<div class="help-section">
  <div class="help-title">ما تعنيه القراءات</div>
  <div class="help-row"><span class="help-lbl">إشارة GPS</span><span class="help-desc">قوة الإشارة. فوق 35 طبيعي، تحت 25 يعني تشويشاً أو عدم وجود سماء مفتوحة.</span></div>
  <div class="help-row"><span class="help-lbl">مجال مغناطيسي</span><span class="help-desc">ارتفاع مفاجئ قد يعني وجود جهاز إلكتروني كبير قريباً.</span></div>
  <div class="help-row"><span class="help-lbl">قفزة الموقع</span><span class="help-desc">أكثر من 500 متر في قراءة واحدة يعني تزوير موقع.</span></div>
  <div class="help-row"><span class="help-lbl">انجراف الوقت</span><span class="help-desc">الفرق بين وقت GPS والوقت الفعلي. معلوماتي فقط.</span></div>
  <div class="help-row"><span class="help-lbl">ثقة EMF</span><span class="help-desc">مستوى الثقة بأن قراءة المجال المغناطيسي تشويش حقيقي وليس جهازاً مجاوراً.</span></div>
  <div class="help-row"><span class="help-lbl">درجة التشويش</span><span class="help-desc">مستوى التهديد المجمّع. فوق 70 يشغّل الإنذار.</span></div>
</div>
<div class="help-section">
  <div class="help-title">عند تشغيل الإنذار</div>
  <div class="help-card help-danger"><div class="help-card-body">
    <strong>١.</strong> لا تتذعر. الإنذار يعني اكتشاف تشويش — ليس بالضرورة خطراً فورياً.<br><br>
    <strong>٢.</strong> لا تستخدم ملاحة GPS. انظر إلى المعالم الحقيقية حولك.<br><br>
    <strong>٣.</strong> انتقل إلى مكان أكثر أماناً إن أمكن.<br><br>
    <strong>٤.</strong> أخبر من حولك. ربما لا يملكون هذا التطبيق.<br><br>
    <strong>٥.</strong> يستمر الإنذار حتى ينتهي التهديد. حين يتوقف، افحص شاشة المباشر قبل التحرك.
  </div></div>
</div>
<div class="help-section">
  <div class="help-title">الحفاظ على عمل التطبيق</div>
  <div class="help-row"><span class="help-lbl">تحذير البطارية</span><span class="help-desc">اضغط على الشريط البرتقالي واضبط التطبيق على غير مقيّد حتى لا يوقفه الأندرويد.</span></div>
  <div class="help-row"><span class="help-lbl">وضع توفير الطاقة</span><span class="help-desc">اضغط طاقة: عادي للتحويل إلى موفّر. يستهلك 50% طاقة أقل. قد تتأخر التنبيهات 10 ثوانٍ.</span></div>
  <div class="help-row"><span class="help-lbl">اختبار الإنذار</span><span class="help-desc">اضغط اختبار الإنذار للتأكد من أن الصوت والاهتزاز يعملان.</span></div>
  <div class="help-row"><span class="help-lbl">لا إنترنت</span><span class="help-desc">بعد التثبيت، يعمل التطبيق دون إنترنت. جميع عمليات الكشف تتم على هاتفك.</span></div>
</div>
<div class="help-section">
  <div class="help-title">حدود التطبيق — اقرأ هذا</div>
  <div class="help-card" style="border-color:rgba(245,166,35,.3)">
    <div class="help-card-body" style="color:rgba(255,255,255,.7)">
      هذا التطبيق يكشف التشويش ولا يوقفه. يحذرك حين يبدأ التشويش، ليس قبله. كن دائماً يقظاً لمحيطك. هذا التطبيق أداة مساعدة، ولا يعوض أوامر الإخلاء الرسمية.
    </div>
  </div>
</div>`;
  return `
<div class="help-section">
  <div class="help-title">WHAT THE COLOURS MEAN</div>
  <div class="help-card help-safe"><div class="help-card-head">SAFE — Blue</div>
    <div class="help-card-body">GPS is working normally. No interference detected. Keep the app running in the background.</div></div>
  <div class="help-card help-warn"><div class="help-card-head">WARNING — Orange</div>
    <div class="help-card-body">Something is interfering with GPS. Your location on maps may be slightly off. Do not rely on navigation.</div></div>
  <div class="help-card help-danger"><div class="help-card-head">ALERT — Red</div>
    <div class="help-card-body">GPS signals are being blocked or faked. <strong>Do not trust your phone's location.</strong> Note physical landmarks around you. Move to a safer location if you can.</div></div>
</div>
<div class="help-section">
  <div class="help-title">WHAT EACH THREAT MEANS</div>
  <div class="help-card"><div class="help-card-head">GPS Jamming</div>
    <div class="help-card-body">Radio signals from satellites are being blocked. GPS stops working or shows the wrong place. Maps are unreliable.</div></div>
  <div class="help-card"><div class="help-card-head">GPS Spoofing</div>
    <div class="help-card-body">Fake GPS signals are making your phone think it is somewhere else. If your location suddenly jumps far away, your GPS may be spoofed. Do not follow navigation.</div></div>
  <div class="help-card"><div class="help-card-head">Drone Surveillance</div>
    <div class="help-card-body">Unknown wireless devices are scanning nearby. Turn off WiFi and Bluetooth if it is safe to do so.</div></div>
</div>
<div class="help-section">
  <div class="help-title">WHAT THE READINGS MEAN</div>
  <div class="help-row"><span class="help-lbl">GPS Signal</span><span class="help-desc">Satellite signal strength. Above 35 is normal. Below 25 means jamming or no sky view.</span></div>
  <div class="help-row"><span class="help-lbl">Mag Field</span><span class="help-desc">Magnetic field around you. A sudden spike may indicate a large electronic device nearby.</span></div>
  <div class="help-row"><span class="help-lbl">Pos Jump</span><span class="help-desc">How far your GPS location jumped. More than 500 metres in one reading means spoofing.</span></div>
  <div class="help-row"><span class="help-lbl">Clock Drift</span><span class="help-desc">Difference between GPS time and real time. Shown for reference.</span></div>
  <div class="help-row"><span class="help-lbl">EMF Conf</span><span class="help-desc">How confident the app is that the magnetic reading is real interference, not a nearby appliance.</span></div>
  <div class="help-row"><span class="help-lbl">Jam Score</span><span class="help-desc">Combined threat level from all sensors. Above 70 triggers the alarm.</span></div>
</div>
<div class="help-section">
  <div class="help-title">WHEN THE ALARM FIRES</div>
  <div class="help-card help-danger"><div class="help-card-body">
    <strong>1.</strong> Stay calm. The alarm means interference is detected — not that danger is certain.<br><br>
    <strong>2.</strong> Do not use GPS navigation. Look at real physical landmarks around you.<br><br>
    <strong>3.</strong> Move to a safer location if you can.<br><br>
    <strong>4.</strong> Tell others nearby. They may not have this app.<br><br>
    <strong>5.</strong> The alarm keeps sounding until the threat drops. When it stops, check the LIVE screen before moving.
  </div></div>
</div>
<div class="help-section">
  <div class="help-title">KEEPING THE APP WORKING</div>
  <div class="help-row"><span class="help-lbl">Battery warning</span><span class="help-desc">If the orange banner appears, tap it and set the app to Unrestricted. Android will otherwise stop it when the screen is off.</span></div>
  <div class="help-row"><span class="help-lbl">Low power mode</span><span class="help-desc">Tap POWER: NORMAL to switch to LOW. Uses ~50% less battery. Alerts may take up to 10 seconds instead of 2.</span></div>
  <div class="help-row"><span class="help-lbl">Test the alarm</span><span class="help-desc">Tap TEST ALARM to confirm the sound and vibration work before you need them.</span></div>
  <div class="help-row"><span class="help-lbl">No internet needed</span><span class="help-desc">Once installed, the app works completely offline. All detection happens on your phone.</span></div>
</div>
<div class="help-section">
  <div class="help-title">LIMITATIONS — READ THIS</div>
  <div class="help-card" style="border-color:rgba(245,166,35,.3)">
    <div class="help-card-body" style="color:rgba(255,255,255,.7)">
      This app <strong>detects</strong> interference — it cannot stop it. It warns you when jamming starts, not before. Always stay aware of your surroundings. This is a supplementary tool, not a replacement for official emergency guidance.
    </div>
  </div>
</div>`;
}

function updateHelpContent(){
  const el=document.getElementById('help-content');
  if(el)el.innerHTML=getHelpHTML();
}

const STATUS_CFG={
  CLEAR:    {a:'#00c6ff',b:'#0072ff',c:'#00f2fe',g:'rgba(0,198,255,.55)',ah:'200',sk:'safe',cls:''},
  DISTURBED:{a:'#f5a623',b:'#c8841a',c:'#ffd580',g:'rgba(245,166,35,.5)', ah:'35', sk:'warn',cls:'disturbed'},
  CRITICAL: {a:'#ff3b3b',b:'#cc0000',c:'#ff8080',g:'rgba(255,59,59,.6)',  ah:'0',  sk:'crit',cls:'critical'},
};
let _cur='CLEAR';

function applyStatus(s,force){
  if(s===_cur&&!force)return; _cur=s;
  const c=STATUS_CFG[s]||STATUS_CFG.CLEAR;
  const r=document.documentElement.style;
  r.setProperty('--orb-a',c.a);r.setProperty('--orb-b',c.b);r.setProperty('--orb-c',c.c);
  r.setProperty('--orb-glow',c.g);r.setProperty('--ah',c.ah);
  const sl=document.getElementById('sl');
  sl.textContent=t('status_'+c.sk+'_lbl');sl.style.color=c.a;sl.style.textShadow=`0 0 20px ${c.g}`;
  document.getElementById('ss').textContent=t('status_'+c.sk+'_sub');
  const or=document.getElementById('or');
  or.style.borderColor=c.a;or.style.boxShadow=`0 0 18px ${c.g}`;
  document.body.className=c.cls;
  const dot=document.getElementById('dot');
  dot.style.background=c.a;dot.style.boxShadow=`0 0 8px ${c.a}`;
  if(!force&&navigator.vibrate){
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
  if(score>=60){sEl.textContent=t('badge_high');sEl.className='tc-status danger-badge';}
  else if(score>=30){sEl.textContent=t('badge_elevated');sEl.className='tc-status warn-badge';}
  else{sEl.textContent=t('badge_clear');sEl.className='tc-status safe-badge';}
}

function updateSummary(d){
  const s=id=>document.getElementById(id);
  s('su-cn0').textContent=d.cn0!=null?Math.round(d.cn0)+' dB':'—';
  s('su-emf').textContent=d.magnitude_ut!=null?Math.round(d.magnitude_ut)+' µT':'—';
  const gpsEl=s('su-gps');
  const jumped=d.coord_jump_m>500;
  gpsEl.textContent=jumped?t('gps_moved'):t('gps_ok');
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

const PLAIN_KEYS={
  'RF JAMMING':        {en:'GPS signals are being blocked',           ar:'إشارات GPS تتشوش'},
  'ACTIVE_SUPPRESSION':{en:'Strong interference source detected nearby',ar:'مصدر تشويش قوي قريب'},
  'TELEPORT':          {en:'Location jumped — GPS may be spoofed',    ar:'الموقع قفز — GPS مزوَّر'},
  'PROBE FLOOD':       {en:'Unknown devices scanning nearby',         ar:'أجهزة مجهولة تفحص المنطقة'},
  'SIGNAL LOSS':       {en:'GPS signal weakened or lost',             ar:'إشارة GPS ضعيفة أو مفقودة'},
  'EMF ANOMALY':       {en:'Unusual magnetic field detected',         ar:'مجال مغناطيسي غير عادي'},
};
function translate(a){
  for(const[k,v] of Object.entries(PLAIN_KEYS)){if(a.includes(k))return v[_lang]||v.en;}
  return a;
}

let _alertTimer=null,_alertIdx=0;
function updateAlert(alerts){
  const icon=document.getElementById('ai');
  const txt=document.getElementById('at');
  if(!alerts||!alerts.length){
    icon.classList.remove('show');txt.className='q';
    txt.textContent=t('all_clear');
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
  btn.textContent = active ? t('btn_pwr_low') : t('btn_pwr_normal');
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
  if (btn) { btn.textContent = t('btn_alarm_fire'); btn.disabled = true; }
  try {
    await fetch('/test-alarm', {method: 'POST'});
  } catch {}
  setTimeout(() => {
    if (btn) { btn.textContent = t('btn_alarm'); btn.disabled = false; }
  }, 3000);
}

window.addEventListener('load', () => { applyLang(_lang); setTimeout(boot, 600); });
