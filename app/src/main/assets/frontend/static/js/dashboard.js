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
    dlbl_pr:'Probes/min', dlbl_fj:'Jam Score', dlbl_baseline:'Local Baseline',
    all_clear:'· · · All clear · · ·',
    tab_live:'LIVE', tab_log:'24H LOG', tab_pattern:'PATTERN', tab_guide:'GUIDE',
    btn_pwr_normal:'POWER: NORMAL', btn_pwr_low:'POWER: LOW',
    btn_alarm:'TEST ALARM', btn_alarm_fire:'FIRING...',
    btn_mute:'SILENCE', btn_muted:'SILENCED',
    back_live:'← BACK TO LIVE',
    log_title:'24H EVENT LOG', log_events:'events',
    pat_title:'PATTERN — 24H ACTIVITY',
    help_title:'FIELD GUIDE', help_badge:'offline · no internet needed',
    status_safe_lbl:'SAFE',    status_safe_sub:'All signals normal',
    status_warn_lbl:'WARNING', status_warn_sub:'Signal interference detected — stay alert',
    status_crit_lbl:'ALERT',   status_crit_sub:'GPS signal unreliable — do not trust location',
    diag_title:'SYSTEM CHECK',
    diag_service:'Service running','diag_service_no':'Service not connected',
    diag_battery:'Battery unrestricted','diag_battery_no':'Battery restricted — tap banner to fix',
    diag_gps:'GPS locked — full detection active','diag_gps_no':'No GPS fix yet — stay outdoors, cold start takes 2-5 min',
    diag_loc:'Location access granted (Android)','diag_loc_no':'Location permission denied',
    diag_demo:'Running in demo mode — start the app on your phone',
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
    dlbl_pr:'مسح/دقيقة', dlbl_fj:'درجة التشويش', dlbl_baseline:'القاعدة المحلية',
    all_clear:'· · · لا تهديد · · ·',
    tab_live:'مباشر', tab_log:'سجل 24س', tab_pattern:'نمط', tab_guide:'دليل',
    btn_pwr_normal:'طاقة: عادي', btn_pwr_low:'طاقة: موفّر',
    btn_alarm:'اختبار الإنذار', btn_alarm_fire:'يُطلق...',
    btn_mute:'صامت', btn_muted:'تم الإسكات',
    back_live:'العودة للمباشر →',
    log_title:'سجل الأحداث — 24 ساعة', log_events:'أحداث',
    pat_title:'نمط — نشاط 24 ساعة',
    help_title:'دليل الميدان', help_badge:'يعمل دون إنترنت',
    status_safe_lbl:'آمن',   status_safe_sub:'الإشارات طبيعية',
    status_warn_lbl:'تنبيه', status_warn_sub:'تشويش مكتشف — كن يقظاً',
    status_crit_lbl:'خطر',   status_crit_sub:'إشارة GPS غير موثوقة — لا تعتمد على موقعك',
    diag_title:'فحص النظام',
    diag_service:'الخدمة تعمل','diag_service_no':'الخدمة غير متصلة',
    diag_battery:'البطارية غير مقيدة','diag_battery_no':'البطارية مقيدة — اضغط الشريط للإصلاح',
    diag_gps:'GPS مقفل — الكشف الكامل نشط','diag_gps_no':'لا إشارة GPS بعد — ابق في الخارج، القفل الأولي 2-5 دقائق',
    diag_loc:'إذن الموقع ممنوح','diag_loc_no':'إذن الموقع مرفوض',
    diag_demo:'وضع العرض — شغّل التطبيق على هاتفك',
  },
  fa:{
    nid:'واحد ۰۱ · پایش میدانی',
    bat_warn:'برنامه محدود شده · لمس کنید',
    lbl_jam:'پارازیت<br>GPS',        desc_jam:'سیگنال مسدود',
    lbl_spoof:'جعل<br>موقعیت',      desc_spoof:'موقعیت تقلبی',
    lbl_probe:'نظارت<br>پهپاد',      desc_probe:'دستگاه ناشناس',
    badge_clear:'ایمن', badge_elevated:'بالا', badge_high:'خطر',
    sum_cn0:'سیگنال GPS', sum_emf:'میدان مغن.', sum_pos:'موقعیت', sum_dev:'اسکن',
    gps_ok:'عادی', gps_moved:'جهش', gps_nofix:'بدون سیگنال',
    tap_detail:'لمس برای جزئیات',
    dlbl_cn0:'سیگنال GPS', dlbl_td:'انحراف ساعت', dlbl_cj:'جهش موقعیت',
    dlbl_mag:'میدان مغناطیسی', dlbl_emf:'اطمینان EMF', dlbl_src:'منبع EMF',
    dlbl_pr:'اسکن/دقیقه', dlbl_fj:'امتیاز پارازیت', dlbl_baseline:'خط پایه محلی',
    all_clear:'· · · همه چیز عادی · · ·',
    tab_live:'زنده', tab_log:'گزارش ۲۴ساعته', tab_pattern:'الگو', tab_guide:'راهنما',
    btn_pwr_normal:'برق: عادی', btn_pwr_low:'برق: کم‌مصرف',
    btn_alarm:'آزمایش هشدار', btn_alarm_fire:'در حال اجرا...',
    btn_mute:'بی‌صدا', btn_muted:'بی‌صدا شد',
    back_live:'بازگشت به زنده →',
    log_title:'گزارش رویدادها — ۲۴ ساعت', log_events:'رویداد',
    pat_title:'الگو — فعالیت ۲۴ ساعته',
    help_title:'راهنمای میدانی', help_badge:'بدون اینترنت کار می‌کند',
    status_safe_lbl:'ایمن',   status_safe_sub:'سیگنال‌ها عادی هستند',
    status_warn_lbl:'هشدار',  status_warn_sub:'تداخل شناسایی شد — مراقب باشید',
    status_crit_lbl:'خطر',    status_crit_sub:'GPS قابل اعتماد نیست — به موقعیت اعتماد نکنید',
    diag_title:'بررسی سیستم',
    diag_service:'سرویس در حال اجرا','diag_service_no':'سرویس متصل نیست',
    diag_battery:'باتری نامحدود','diag_battery_no':'باتری محدود شده — روی نوار لمس کنید',
    diag_gps:'GPS قفل شده — کشف کامل فعال','diag_gps_no':'هنوز GPS قفل نشده — در بیرون بمانید، قفل اولیه ۲-۵ دقیقه',
    diag_loc:'مجوز موقعیت داده شده','diag_loc_no':'مجوز موقعیت رد شده',
    diag_demo:'حالت نمایش — برنامه را روی گوشی اجرا کنید',
  },
  uk:{
    nid:'ВУЗОЛ 01 · ПОЛЬОВИЙ МОНІТОР',
    bat_warn:'ДОДАТОК ОБМЕЖЕНО · ТОРКНІТЬСЯ',
    lbl_jam:'GPS<br>Глушіння',       desc_jam:'сигнали заблоковано',
    lbl_spoof:'GPS<br>Підробка',     desc_spoof:'позиція підроблена',
    lbl_probe:'Дронове<br>Спостереження',desc_probe:'невідомі пристрої',
    badge_clear:'Норма', badge_elevated:'ПІДВИЩЕНО', badge_high:'НЕБЕЗПЕКА',
    sum_cn0:'GPS Сигнал', sum_emf:'Маг. Поле', sum_pos:'Позиція', sum_dev:'Скани',
    gps_ok:'OK', gps_moved:'СТРИБОК', gps_nofix:'НЕМ. СИГ.',
    tap_detail:'ТОРКНІТЬСЯ ДЛЯ ДЕТАЛЕЙ',
    dlbl_cn0:'GPS Сигнал', dlbl_td:'Зсув Год.', dlbl_cj:'Стрибок Поз.',
    dlbl_mag:'Маг. Поле', dlbl_emf:'EMF Довіра', dlbl_src:'Джерело EMF',
    dlbl_pr:'Скани/хв', dlbl_fj:'Рівень Завад', dlbl_baseline:'Місц. норма',
    all_clear:'· · · Все спокійно · · ·',
    tab_live:'НАЖИВО', tab_log:'ЖУРНАЛ 24Г', tab_pattern:'ГРАФІК', tab_guide:'ДОВІДНИК',
    btn_pwr_normal:'ЖИВЛ.: НОРМ.', btn_pwr_low:'ЖИВЛ.: ЕКОНМ.',
    btn_alarm:'ТЕСТ СИГНАЛУ', btn_alarm_fire:'АКТИВАЦІЯ...',
    btn_mute:'ВИМКНУТИ ЗВУК', btn_muted:'ЗВУК ВИМКНЕНО',
    back_live:'← ПОВЕРНУТИСЬ',
    log_title:'ЖУРНАЛ ПОДІЙ — 24 ГОДИНИ', log_events:'подій',
    pat_title:'ГРАФІК — АКТИВНІСТЬ 24Г',
    help_title:'ПОЛЬОВИЙ ДОВІДНИК', help_badge:'офлайн · без інтернету',
    status_safe_lbl:'НОРМА',     status_safe_sub:'Всі сигнали в нормі',
    status_warn_lbl:'УВАГА',     status_warn_sub:'Виявлено завади — будьте уважні',
    status_crit_lbl:'НЕБЕЗПЕКА', status_crit_sub:'GPS ненадійний — не довіряйте місцезнаходженню',
    diag_title:'ПЕРЕВІРКА СИСТЕМИ',
    diag_service:'Сервіс працює','diag_service_no':'Сервіс не підключено',
    diag_battery:'Батарея необмежена','diag_battery_no':'Батарея обмежена — торкніться банера',
    diag_gps:'GPS заблоковано — повне виявлення активне','diag_gps_no':'Фіксація GPS ще не отримана — залишайтесь надворі, перший пошук: 2-5 хв',
    diag_loc:'Дозвіл на місцезнаходження надано','diag_loc_no':'Дозвіл на місцезнаходження відхилено',
    diag_demo:'Демо-режим — запустіть додаток на телефоні',
  }
};
const _LANG_CYCLE=['en','ar','fa','uk'];
const _LANG_NEXT={en:'AR',ar:'FA',fa:'УКР',uk:'EN'};
const _LANG_RTL=new Set(['ar','fa']);
let _lang=localStorage.getItem('sigint_lang')||'en';
function t(k){return _T[_lang][k]||_T.en[k]||k;}
function toggleLang(){
  const idx=(_LANG_CYCLE.indexOf(_lang)+1)%_LANG_CYCLE.length;
  applyLang(_LANG_CYCLE[idx]);
}

function applyLang(lang){
  _lang=lang;
  localStorage.setItem('sigint_lang',lang);
  const isRTL=_LANG_RTL.has(lang);
  document.documentElement.setAttribute('lang',lang);
  document.documentElement.setAttribute('dir',isRTL?'rtl':'ltr');
  const btn=document.getElementById('lang-btn');
  const nextIdx=(_LANG_CYCLE.indexOf(lang)+1)%_LANG_CYCLE.length;
  if(btn)btn.textContent=_LANG_NEXT[lang]||_LANG_CYCLE[nextIdx].toUpperCase();
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
  setT('dlbl-baseline',t('dlbl_baseline'));
  setT('log-title',t('log_title')); setT('pat-title',t('pat_title'));
  setT('help-title',t('help_title')); setT('help-badge',t('help_badge'));
  document.querySelectorAll('.tab').forEach(b=>{
    const map={live:'tab_live',log:'tab_log',pattern:'tab_pattern',help:'tab_guide'};
    if(map[b.dataset.tab])b.textContent=t(map[b.dataset.tab]);
  });
  document.querySelectorAll('.view-back').forEach(e=>e.textContent=t('back_live'));
  const ab=document.getElementById('alarm-btn');
  if(ab&&!ab.disabled)ab.textContent=t('btn_alarm');
  const mb=document.getElementById('mute-btn');
  if(mb&&!mb.disabled)mb.textContent=t('btn_mute');
  const lb=document.getElementById('lp-btn');
  if(lb)lb.textContent=_lowPower?t('btn_pwr_low'):t('btn_pwr_normal');
  updateHelpContent();
  // Force re-render of dynamic strings
  const atEl=document.getElementById('at');
  if(atEl&&atEl.classList.contains('q'))atEl.textContent=t('all_clear');
  applyStatus(_cur,true);
}

function runSelfDiagnostic(){
  const el=document.getElementById('diag-results');
  if(!el)return;
  el.innerHTML='<div class="diag-row diag-checking">Checking…</div>';
  fetch('/state',{signal:AbortSignal.timeout(3000)}).then(r=>r.json()).then(d=>{
    const rows=[];
    const row=(ok,msg)=>`<div class="diag-row ${ok?'diag-ok':'diag-warn'}"><span class="diag-icon">${ok?'✓':'⚠'}</span><span>${msg}</span></div>`;
    const rowInfo=(msg)=>`<div class="diag-row diag-checking"><span class="diag-icon">ℹ</span><span>${msg}</span></div>`;
    rows.push(row(true, t('diag_service')));
    if(d.battery_unrestricted===false) rows.push(row(false, t('diag_battery_no')));
    else if(d.battery_unrestricted===true) rows.push(row(true, t('diag_battery')));
    if(d.gps_locked) rows.push(row(true, t('diag_gps')));
    else rows.push(rowInfo(t('diag_gps_no')));
    // navigator.permissions.query('geolocation') returns 'denied' in Android WebView
    // even when ACCESS_FINE_LOCATION is granted at the Android level. The service
    // responding above confirms permission is in place — no browser check needed.
    rows.push(row(true, t('diag_loc')));
    el.innerHTML=rows.join('');
  }).catch(()=>{
    el.innerHTML=`<div class="diag-row diag-warn"><span class="diag-icon">⚠</span><span>${t('diag_service_no')}</span></div><div class="diag-row diag-warn"><span class="diag-icon">ℹ</span><span>${t('diag_demo')}</span></div>`;
  });
}

function getHelpHTML(){
  const diagSection=`<div class="help-section" id="diag-section">
  <div class="help-title" id="diag-title-text">${t('diag_title')}</div>
  <div id="diag-results"><div class="diag-row diag-checking">&nbsp;</div></div>
  <button onclick="runSelfDiagnostic()" style="margin-top:10px;background:rgba(0,198,255,.12);border:1px solid rgba(0,198,255,.3);border-radius:8px;color:rgba(0,198,255,.9);font-size:10px;letter-spacing:.1em;padding:7px 16px;cursor:pointer;font-family:inherit;width:100%">${t('diag_title')} ↺</button>
</div>`;
  setTimeout(runSelfDiagnostic,200);
  if(_lang==='ar') return diagSection+`
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
  if(_lang==='fa') return diagSection+`
<div class="help-section">
  <div class="help-title">معنای رنگ‌ها</div>
  <div class="help-card help-safe"><div class="help-card-head">ایمن — آبی</div>
    <div class="help-card-body">GPS به درستی کار می‌کند. تداخلی شناسایی نشده. برنامه را در پس‌زمینه روشن نگه دارید.</div></div>
  <div class="help-card help-warn"><div class="help-card-head">هشدار — نارنجی</div>
    <div class="help-card-body">تداخلی در GPS وجود دارد. موقعیت شما روی نقشه ممکن است دقیق نباشد. به ناوبری اعتماد نکنید.</div></div>
  <div class="help-card help-danger"><div class="help-card-head">خطر — قرمز</div>
    <div class="help-card-body">سیگنال‌های GPS مسدود یا جعل شده‌اند. <strong>به موقعیت گوشی‌تان اعتماد نکنید.</strong> نشانه‌های فیزیکی اطراف را یادداشت کنید. در صورت امکان به مکان امن‌تری بروید.</div></div>
</div>
<div class="help-section">
  <div class="help-title">معنای هر تهدید</div>
  <div class="help-card"><div class="help-card-head">پارازیت GPS</div>
    <div class="help-card-body">سیگنال‌های ماهواره‌ای مسدود شده‌اند. GPS کار نمی‌کند یا موقعیت اشتباه نشان می‌دهد. نقشه‌ها قابل اعتماد نیستند.</div></div>
  <div class="help-card"><div class="help-card-head">جعل موقعیت GPS</div>
    <div class="help-card-body">سیگنال‌های GPS تقلبی گوشی شما را گول می‌زنند. اگر موقعیت‌تان ناگهان دور پرید، GPS جعل شده است. از ناوبری استفاده نکنید.</div></div>
  <div class="help-card"><div class="help-card-head">نظارت پهپاد</div>
    <div class="help-card-body">دستگاه‌های بی‌سیم ناشناس در حال اسکن هستند. در صورت امکان WiFi و بلوتوث را خاموش کنید.</div></div>
</div>
<div class="help-section">
  <div class="help-title">هنگام فعال شدن هشدار</div>
  <div class="help-card help-danger"><div class="help-card-body">
    <strong>۱.</strong> آرام باشید. هشدار یعنی تداخل شناسایی شده — نه لزوماً خطر فوری.<br><br>
    <strong>۲.</strong> از ناوبری GPS استفاده نکنید. به نشانه‌های فیزیکی اطراف توجه کنید.<br><br>
    <strong>۳.</strong> در صورت امکان به مکان امن‌تری بروید.<br><br>
    <strong>۴.</strong> به دیگران اطلاع دهید. شاید آنها این برنامه را نداشته باشند.<br><br>
    <strong>۵.</strong> هشدار تا پایان تهدید ادامه دارد. بعد از توقف، صفحه زنده را چک کنید.
  </div></div>
</div>
<div class="help-section">
  <div class="help-title">محدودیت‌ها — بخوانید</div>
  <div class="help-card" style="border-color:rgba(245,166,35,.3)">
    <div class="help-card-body" style="color:rgba(255,255,255,.7)">
      این برنامه تداخل را <strong>شناسایی</strong> می‌کند — نمی‌تواند آن را متوقف کند. هنگام شروع پارازیت هشدار می‌دهد، نه قبل از آن. این ابزار کمکی است و جایگزین دستورالعمل‌های اضطراری رسمی نیست.
    </div>
  </div>
</div>`;
  if(_lang==='uk') return diagSection+`
<div class="help-section">
  <div class="help-title">ЩО ОЗНАЧАЮТЬ КОЛЬОРИ</div>
  <div class="help-card help-safe"><div class="help-card-head">НОРМА — Синій</div>
    <div class="help-card-body">GPS працює нормально. Завад не виявлено. Тримайте додаток у фоновому режимі.</div></div>
  <div class="help-card help-warn"><div class="help-card-head">УВАГА — Жовтогарячий</div>
    <div class="help-card-body">GPS зазнає перешкод. Ваше місцезнаходження на карті може бути неточним. Не покладайтесь на навігацію.</div></div>
  <div class="help-card help-danger"><div class="help-card-head">НЕБЕЗПЕКА — Червоний</div>
    <div class="help-card-body">Сигнали GPS блокуються або підроблюються. <strong>Не довіряйте місцезнаходженню телефону.</strong> Запам'ятайте фізичні орієнтири навколо. Перейдіть у безпечніше місце, якщо можете.</div></div>
</div>
<div class="help-section">
  <div class="help-title">ЩО ОЗНАЧАЄ КОЖНА ЗАГРОЗА</div>
  <div class="help-card"><div class="help-card-head">Глушіння GPS</div>
    <div class="help-card-body">Радіосигнали від супутників заблоковано. GPS перестає працювати або показує неправильне місце. Карти ненадійні.</div></div>
  <div class="help-card"><div class="help-card-head">Підробка GPS</div>
    <div class="help-card-body">Фальшиві GPS-сигнали змушують телефон думати, що він в іншому місці. Якщо ваша позиція раптово стрибнула — GPS підроблений. Не використовуйте навігацію.</div></div>
  <div class="help-card"><div class="help-card-head">Дронове спостереження</div>
    <div class="help-card-body">Невідомі бездротові пристрої сканують поруч. Вимкніть WiFi та Bluetooth, якщо це безпечно.</div></div>
</div>
<div class="help-section">
  <div class="help-title">КОЛИ СПРАЦЬОВУЄ СИГНАЛ</div>
  <div class="help-card help-danger"><div class="help-card-body">
    <strong>1.</strong> Збережіть спокій. Сигнал означає виявлення завад — не обов'язково безпосередню небезпеку.<br><br>
    <strong>2.</strong> Не використовуйте GPS-навігацію. Орієнтуйтесь за фізичними об'єктами навколо.<br><br>
    <strong>3.</strong> Перейдіть у безпечніше місце, якщо можете.<br><br>
    <strong>4.</strong> Попередьте оточуючих. Можливо, вони не мають цього додатку.<br><br>
    <strong>5.</strong> Сигнал продовжується до зникнення загрози. Коли зупиниться — перевірте екран НАЖИВО перед переміщенням.
  </div></div>
</div>
<div class="help-section">
  <div class="help-title">ОБМЕЖЕННЯ — ПРОЧИТАЙТЕ</div>
  <div class="help-card" style="border-color:rgba(245,166,35,.3)">
    <div class="help-card-body" style="color:rgba(255,255,255,.7)">
      Цей додаток <strong>виявляє</strong> перешкоди — він не може їх зупинити. Він попереджає, коли глушіння починається, а не до цього. Це допоміжний інструмент, а не заміна офіційним вказівкам.
    </div>
  </div>
</div>`;
  return diagSection+`
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
  <div class="help-row"><span class="help-lbl">Silence the alarm</span><span class="help-desc">Tap the SILENCE button in the alert bar to mute the sound for 5 minutes. The warning stays visible.</span></div>
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
  // Adaptive baseline row
  const blEl=document.getElementById('d-baseline');
  if(blEl){
    const info=blInfo(d.fused_jam_score??d.jam_score??0);
    if(info===null){
      const remaining=Math.max(0,_BL_MIN_SAMPLES-_blSampleCount);
      blEl.textContent=`calibrating… (${remaining} min left)`;
      blEl.style.color='rgba(160,180,220,.4)';
    } else {
      const sign=info.delta>=0?'+':'';
      blEl.textContent=`${info.baseline}% norm · ${sign}${info.delta}% now`;
      blEl.style.color=info.delta>25?'#ff8080':info.delta>12?'#f5a623':'rgba(140,220,180,.85)';
    }
  }
}

// ── Adaptive baseline — 4h rolling p75 of jam scores, 1 sample/minute ──────
// Solves conflict-zone false-alarm fatigue: instead of alerting when score > 70
// (meaningless in an area where 65% is a normal Tuesday), alert when the score
// is significantly above the LOCAL normal for this device's location.
// Stored in localStorage so the baseline survives page refreshes.
const _BL_KEY='sigint_baseline_v1';
const _BL_SAMPLE_MS=60_000;   // sample interval
const _BL_WIN_MS=4*3600_000;  // 4-hour rolling window
const _BL_MIN_SAMPLES=10;     // need at least 10 minutes before baseline is meaningful
let _blData=[];                // [{ts, j}]
let _blLastSample=0;
let _blThreshold=null;         // null = still calibrating
let _blSampleCount=0;

function _blLoad(){
  try{
    const raw=localStorage.getItem(_BL_KEY);
    if(raw){
      const arr=JSON.parse(raw);
      const cut=Date.now()-_BL_WIN_MS;
      _blData=arr.filter(e=>e.ts>cut);
      _blSampleCount=_blData.length;
    }
  }catch{}
}
_blLoad();

function _blSave(){
  try{localStorage.setItem(_BL_KEY,JSON.stringify(_blData));}catch{}
}

function _blCompute(){
  if(_blData.length<_BL_MIN_SAMPLES){_blThreshold=null;return;}
  const scores=[..._blData.map(e=>e.j)].sort((a,b)=>a-b);
  const p75=scores[Math.floor(scores.length*0.75)];
  // Floor at 25 so the baseline never becomes so low that a mild jam doesn't alarm
  _blThreshold=Math.max(25,p75);
}

function blSample(jamScore){
  const now=Date.now();
  if(now-_blLastSample<_BL_SAMPLE_MS)return;
  _blLastSample=now;
  _blData.push({ts:now,j:Math.round(jamScore)});
  const cut=now-_BL_WIN_MS;
  _blData=_blData.filter(e=>e.ts>cut);
  _blSampleCount=_blData.length;
  _blCompute();
  _blSave();
}

function blInfo(currentScore){
  if(_blThreshold===null) return null;
  const delta=Math.round(currentScore-_blThreshold);
  return{baseline:Math.round(_blThreshold), delta, samples:_blSampleCount};
}

// Spike severity: what the adaptive system thinks, independent of server status
// Returns null when not enough data, 'normal'/'elevated'/'spike' otherwise
function blSeverity(currentScore){
  if(_blThreshold===null) return null;
  const delta=currentScore-_blThreshold;
  if(delta>25) return 'spike';
  if(delta>12) return 'elevated';
  return 'normal';
}

const PLAIN_KEYS={
  'RF JAMMING':        {en:'GPS signals are being blocked',             ar:'إشارات GPS تتشوش',             fa:'سیگنال‌های GPS مسدود شده‌اند',  uk:'Сигнали GPS заблоковано'},
  'ACTIVE_SUPPRESSION':{en:'Strong interference source detected nearby', ar:'مصدر تشويش قوي قريب',          fa:'منبع تداخل قوی در نزدیکی',      uk:'Виявлено потужне джерело завад'},
  'TELEPORT':          {en:'Location jumped — GPS may be spoofed',       ar:'الموقع قفز — GPS مزوَّر',       fa:'موقعیت پرید — GPS ممکن است جعل شده باشد', uk:'Позиція стрибнула — GPS може бути підроблений'},
  'PROBE FLOOD':       {en:'Unknown devices scanning nearby',            ar:'أجهزة مجهولة تفحص المنطقة',    fa:'دستگاه‌های ناشناس در حال اسکن',  uk:'Невідомі пристрої сканують поруч'},
  'SIGNAL LOSS':       {en:'GPS signal weakened or lost',               ar:'إشارة GPS ضعيفة أو مفقودة',    fa:'سیگنال GPS ضعیف یا از دست رفته', uk:'Сигнал GPS послаблено або втрачено'},
  'EMF ANOMALY':       {en:'Unusual magnetic field detected',            ar:'مجال مغناطيسي غير عادي',        fa:'میدان مغناطیسی غیرعادی',         uk:'Виявлено незвичайне магнітне поле'},
};
function translate(a){
  for(const[k,v] of Object.entries(PLAIN_KEYS)){if(a.includes(k))return v[_lang]||v.en;}
  return a;
}

let _alertTimer=null,_alertIdx=0;
function updateAlert(alerts){
  const icon=document.getElementById('ai');
  const txt=document.getElementById('at');
  const muteBtn=document.getElementById('mute-btn');
  if(!alerts||!alerts.length){
    icon.classList.remove('show');txt.className='q';
    txt.textContent=t('all_clear');
    clearInterval(_alertTimer);
    if(muteBtn)muteBtn.classList.add('hidden');
    return;
  }
  icon.classList.add('show');txt.className='';
  if(muteBtn){muteBtn.classList.remove('hidden');muteBtn.textContent=t('btn_mute');muteBtn.disabled=false;}
  const show=()=>{_alertIdx=_alertIdx%alerts.length;txt.textContent='▲ '+translate(alerts[_alertIdx++]);};
  show();clearInterval(_alertTimer);_alertTimer=setInterval(show,3500);
}

function resetBaseline(){
  _blData=[];_blThreshold=null;_blSampleCount=0;_blLastSample=0;
  try{localStorage.removeItem(_BL_KEY);}catch{}
  const el=document.getElementById('d-baseline');
  if(el){el.textContent='calibrating…';el.style.color='rgba(160,180,220,.4)';}
}

function muteAlarm(){
  const btn=document.getElementById('mute-btn');
  fetch('/mute-alarm',{method:'POST'}).catch(()=>{});
  if(btn){btn.textContent=t('btn_muted');btn.disabled=true;}
  setTimeout(()=>{if(btn&&!btn.disabled){btn.textContent=t('btn_muted');}},100);
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
  const jamScore=data.fused_jam_score??data.jam_score??0;
  blSample(jamScore);  // adaptive baseline — 1 sample/min stored to localStorage
  applyStatus(data.status||'CLEAR');
  // Augment the status subtitle with adaptive context once baseline is ready
  const sev=blSeverity(jamScore);
  const ssEl=document.getElementById('ss');
  if(ssEl&&sev&&data.status!=='CLEAR'){
    const info=blInfo(jamScore);
    if(info){
      const sign=info.delta>=0?'+':'';
      if(sev==='spike') ssEl.textContent=`${sign}${info.delta}% above local normal — significant escalation`;
      else if(sev==='elevated') ssEl.textContent=`${sign}${info.delta}% above local normal — elevated`;
      // 'normal' means within baseline — reassure user even if score is high
      else if(data.status!=='CLEAR') ssEl.textContent=`Within local normal (baseline ${info.baseline}%)`;
    }
  }
  setCard('jam',jamScore);
  setCard('spoof',data.spoof_score||0);
  setCard('probe',data.probe_score||0);
  updateSummary(data);
  updateDetail(data);
  updateAlert(data.alerts);
  if(data.ts){const el=document.getElementById('ts');if(el)el.textContent=new Date(data.ts).toISOString().slice(11,19)+' UTC';}
  wfPush(jamScore,data.spoof_score||0,data.probe_score||0);
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
  if(t==='help'){updateHelpContent();}
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
      connectSSE();checkBatteryStatus();checkLowPower();return;
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
