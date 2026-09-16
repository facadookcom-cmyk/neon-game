/* ============================================
   Neon Prediction — v6
   Wallet + Milestones + Wheel + All Features
   ============================================ */

var SUPABASE_URL = 'https://qejudsvdtdbbmxlvymiw.supabase.co';
var SUPABASE_KEY = 'sb_publishable_vgUfkb0u8FIx7GFR_FF3bw_jE357yJD';

var supabaseClient = null;
try {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window.supabaseClient = supabaseClient;
  console.log('✅ Supabase connected');
} catch(e) {
  console.warn('⚠️ Supabase failed:', e.message);
}

var CONFIG = {
  ENTRY_FEE: 12, WIN_REWARD: 28, COMMISSION: 2,
  CHOICE_TIMEOUT: 10, STARTER_POINTS: 60, TIMEOUT_PENALTY: 6,
  MAX_TICKETS: 5, TICKET_REGEN_HOURS: 2,
  WHEEL_COST: 5, LOSS_RECOVERY_COST: 8, LOSS_RECOVERY_BONUS: 10,
  PRIME_PRICE: 99, PRIME_DAYS: 30,
  MULTIPLIER_PRICE: 15, MULTIPLIER_HOURS: 24,
  LEVELS_PER_GAMES: 15,
  MIN_DEPOSIT: 10,
  MIN_WITHDRAW: 50,
  LEVEL_NAMES: {1:'مبتدئ 🌱',2:'هاوي 🥉',3:'محترف 🥈',4:'خبير 🥇',5:'أسطورة 💎',6:'نخبة 👑',7:'أسطوري 🏆'},
  PRIZES: [
    {threshold:150,money:20},{threshold:300,money:55},
    {threshold:500,money:135},{threshold:800,money:330},{threshold:1200,money:650}
  ],
  // 20 تحدي مادي
  MILESTONES: [
    {points:100,money:5},
    {points:250,money:12},
    {points:500,money:25},
    {points:750,money:37},
    {points:1000,money:50},
    {points:1500,money:90},
    {points:2000,money:125},
    {points:2750,money:165},
    {points:3500,money:210},
    {points:4500,money:270},
    {points:5500,money:330},
    {points:7000,money:420},
    {points:8500,money:510},
    {points:10000,money:625},
    {points:12500,money:780},
    {points:15000,money:940},
    {points:20000,money:1250},
    {points:25000,money:1560},
    {points:35000,money:2190},
    {points:50000,money:3125}
  ],
  DAILY_LOGIN_REWARDS: [15,20,30,40,55,70,100],
  DAILY_CHEST_REWARDS: [15,20,25,30,40]
};

var CATEGORIES = {
  football:{name:'كرة القدم',icon:'⚽',choices:['ريال مدريد','برشلونة','ليفربول','بايرن ميونخ','باريس سان جيرمان']},
  fruits:{name:'فواكه',icon:'🍎',choices:['تفاح','موز','برتقال','عنب','فراولة']},
  animals:{name:'حيوانات',icon:'🦁',choices:['أسد','فيل','نمر','زرافة','دب']},
  colors:{name:'ألوان',icon:'🎨',choices:['أحمر','أزرق','أخضر','أصفر','أسود']}
};

var BOT_NAMES = ['أحمد','محمود','سارة','ياسين','نور','عمر','لينا','كريم','هدى','يوسف','مريم','علي'];
var STORAGE_KEY = 'neon_user_v6';
var WALLET_KEY_PREFIX = 'neon_wallet_v6_';

var App = {
  user: createDefaultUser(),
  room: {id:null,category:null,mode:'normal',code:null,correctChoice:null,status:'idle'},
  myChoice: null,
  timerInterval: null,
  timeLeft: 10,
  pendingPurchase: null,
  specialOfferTimeout: null,
  busy: false
};

var Wallet = {
  balance: 0,
  earned: 0,
  totalDeposited: 0,
  totalWon: 0,
  totalWithdrawn: 0
};

function createDefaultUser() {
  return {
    id:null, username:'', phone:'',
    purchased:0, earned:0, level:1,
    games_played:0, wins:0, streak:0, bestStreak:0,
    tickets:5, lastTicketRegen:null, claimedPrizes:[],
    lastDailyChest:null, lastDailyLogin:null, dailyLoginStreak:0,
    lastWheelSpin:null,
    missions:null, lastMissionDate:null,
    lastLossAmount:0, adShown:false, lastSpecialOffer:null,
    is_prime:false, prime_expires_at:null,
    multiplier_2x_expires_at:null,
    peak_points:0,
    claimed_milestones:[]
  };
}

function $(id){return document.getElementById(id);}
function totalPoints(){return App.user.purchased + App.user.earned;}

function addPoints(a, toEarned){
  if(isPrime()) a = Math.floor(a * 2);
  if(toEarned) App.user.earned += a;
  else App.user.purchased += a;
  checkPeakPoints();
}

function deductPoints(a){
  if(App.user.purchased >= a){App.user.purchased -= a;}
  else{var r = a - App.user.purchased; App.user.purchased = 0; App.user.earned = Math.max(0, App.user.earned - r);}
}

function checkPeakPoints(){
  var current = totalPoints();
  if(current > (App.user.peak_points || 0)){
    App.user.peak_points = current;
  }
}

function isPrime(){
  if(!App.user.is_prime) return false;
  if(!App.user.prime_expires_at) return false;
  return new Date(App.user.prime_expires_at) > new Date();
}

function hasMultiplier(){
  if(!App.user.multiplier_2x_expires_at) return false;
  return new Date(App.user.multiplier_2x_expires_at) > new Date();
}

/* ============================================
   WALLET
   ============================================ */

async function loadWallet() {
  if (!App.user.id) return;

  if (!supabaseClient || String(App.user.id).indexOf('local_') === 0) {
    try {
      var saved = JSON.parse(localStorage.getItem(WALLET_KEY_PREFIX + App.user.id) || '{}');
      Wallet.balance = saved.balance || 0;
      Wallet.earned = saved.earned || 0;
      Wallet.totalDeposited = saved.totalDeposited || 0;
      Wallet.totalWon = saved.totalWon || 0;
      Wallet.totalWithdrawn = saved.totalWithdrawn || 0;
    } catch(e) {}
    updateWalletUI();
    return;
  }

  try {
    var res = await supabaseClient.from('wallets').select('*').eq('user_id', App.user.id).maybeSingle();
    if (res.data) {
      Wallet.balance = parseFloat(res.data.balance) || 0;
      Wallet.totalDeposited = parseFloat(res.data.total_deposited) || 0;
      Wallet.totalWon = parseFloat(res.data.total_won) || 0;
      Wallet.totalWithdrawn = parseFloat(res.data.total_withdrawn) || 0;
    } else {
      await supabaseClient.from('wallets').insert({ user_id: App.user.id, balance: 0 });
    }

    var earningsRes = await supabaseClient.from('earnings')
      .select('amount')
      .eq('user_id', App.user.id)
      .eq('transferred', false);

    if (earningsRes.data) {
      Wallet.earned = earningsRes.data.reduce(function(sum, e) {
        return sum + parseFloat(e.amount || 0);
      }, 0);
    }

    updateWalletUI();
  } catch(e) {
    console.error('loadWallet error:', e);
  }
}

function saveWallet() {
  if (!App.user.id) return;
  try {
    localStorage.setItem(WALLET_KEY_PREFIX + App.user.id, JSON.stringify(Wallet));
  } catch(e) {}
  updateWalletUI();
}

function updateWalletUI() {
  var balanceEl = $('walletBalance');
  var earnedEl = $('walletEarned');
  var depositedEl = $('walletDeposited');
  var withdrawBal = $('withdrawBalance');

  if (balanceEl) balanceEl.textContent = Wallet.balance.toFixed(2) + ' ج';
  if (earnedEl) earnedEl.textContent = Wallet.earned.toFixed(2) + ' ج';
  if (depositedEl) depositedEl.textContent = Wallet.totalDeposited.toFixed(2) + ' ج';
  if (withdrawBal) withdrawBal.textContent = Wallet.balance.toFixed(2) + ' ج';

  // حدّث زر التحويل
  var transferBtn = document.querySelector('.wallet-btn.transfer');
  if (transferBtn) {
    if (Wallet.earned > 0) {
      transferBtn.disabled = false;
      transferBtn.style.opacity = '1';
    } else {
      transferBtn.disabled = true;
      transferBtn.style.opacity = '0.5';
    }
  }
}

async function addEarning(amount, source) {
  if (amount <= 0) return;
  Wallet.earned += amount;
  saveWallet();

  if (supabaseClient && App.user.id && String(App.user.id).indexOf('local_') !== 0) {
    try {
      await supabaseClient.from('earnings').insert({
        user_id: App.user.id,
        amount: amount,
        source: source || 'game',
        transferred: false
      });
    } catch(e) { console.error('addEarning error:', e); }
  }
  updateWalletUI();
}

async function transferEarningsToWallet() {
  if (Wallet.earned <= 0) {
    return showToast('مفيش مبلغ مكتسب لتحويله', 'error');
  }
  var amount = Wallet.earned;
  Wallet.balance += amount;
  Wallet.earned = 0;
  Wallet.totalWon = (Wallet.totalWon || 0) + amount;
  saveWallet();

  if (supabaseClient && App.user.id && String(App.user.id).indexOf('local_') !== 0) {
    try {
      await supabaseClient.from('wallets').upsert({
        user_id: App.user.id,
        balance: Wallet.balance,
        total_won: Wallet.totalWon,
        updated_at: new Date().toISOString()
      });
      await supabaseClient.from('earnings')
        .update({ transferred: true })
        .eq('user_id', App.user.id)
        .eq('transferred', false);
    } catch(e) { console.error('transfer error:', e); }
  }

  showToast('✅ تم تحويل ' + amount.toFixed(2) + ' جنيه للمحفظة', 'success');
  showCoinToast('+' + amount.toFixed(2) + ' ج', '💰');
  updateWalletUI();
}

async function deductFromWallet(amount) {
  if (Wallet.balance < amount) {
    showToast('رصيد المحفظة غير كافٍ', 'error');
    return false;
  }
  Wallet.balance -= amount;
  saveWallet();

  if (supabaseClient && App.user.id && String(App.user.id).indexOf('local_') !== 0) {
    try {
      await supabaseClient.from('wallets').update({
        balance: Wallet.balance,
        updated_at: new Date().toISOString()
      }).eq('user_id', App.user.id);
    } catch(e) { console.error('deduct error:', e); }
  }
  return true;
}

async function requestDeposit(amount, transNumber) {
  if (amount < CONFIG.MIN_DEPOSIT) {
    showToast('الحد الأدنى للإيداع ' + CONFIG.MIN_DEPOSIT + ' جنيه', 'error');
    return false;
  }

  if (supabaseClient && App.user.id && String(App.user.id).indexOf('local_') !== 0) {
    try {
      var res = await supabaseClient.from('deposit_requests').insert({
        user_id: App.user.id,
        amount: amount,
        trans_number: transNumber,
        status: 'pending'
      });
      if (res.error) throw res.error;
      showToast('✅ تم إرسال طلب الإيداع', 'success');
      return true;
    } catch(e) {
      showToast('خطأ: ' + e.message, 'error');
      return false;
    }
  }
  showToast('✅ تم إرسال الطلب (محلي)', 'success');
  return true;
}

async function requestWithdraw(amount, phone) {
  if (amount < CONFIG.MIN_WITHDRAW) {
    showToast('الحد الأدنى للسحب ' + CONFIG.MIN_WITHDRAW + ' جنيه', 'error');
    return false;
  }
  if (Wallet.balance < amount) {
    showToast('رصيد غير كافٍ', 'error');
    return false;
  }
  if (!phone || phone.length < 11 || phone.indexOf('01') !== 0) {
    showToast('رقم تليفون غير صحيح', 'error');
    return false;
  }

  if (supabaseClient && App.user.id && String(App.user.id).indexOf('local_') !== 0) {
    try {
      var res = await supabaseClient.from('withdraw_requests').insert({
        user_id: App.user.id,
        amount: amount,
        phone: phone,
        status: 'pending'
      });
      if (res.error) throw res.error;
      showToast('✅ تم إرسال طلب السحب', 'success');
      return true;
    } catch(e) {
      showToast('خطأ: ' + e.message, 'error');
      return false;
    }
  }
  showToast('✅ تم إرسال الطلب (محلي)', 'success');
  return true;
}

function openDepositModal() {
  var a = $('depositAmount'); if (a) a.value = '';
  var t = $('depositTrans'); if (t) t.value = '';
  var m = $('depositModal'); if (m) m.classList.add('active');
}

function openWithdrawModal() {
  var a = $('withdrawAmount'); if (a) a.value = '';
  var p = $('withdrawPhone'); if (p) p.value = App.user.phone || '';
  updateWalletUI();
  var m = $('withdrawModal'); if (m) m.classList.add('active');
}

async function submitDeposit() {
  var amount = parseFloat($('depositAmount').value);
  var trans = $('depositTrans').value.trim();
  if (!amount || amount < CONFIG.MIN_DEPOSIT) return showToast('الحد الأدنى ' + CONFIG.MIN_DEPOSIT + ' جنيه', 'error');
  if (trans.length < 6) return showToast('رقم العملية قصير', 'error');

  var btn = document.querySelector('#depositModal .btn-neon');
  if (btn) { btn.disabled = true; btn.textContent = 'جاري الإرسال...'; }

  var ok = await requestDeposit(amount, trans);
  if (ok) closeModal('depositModal');
  if (btn) { btn.disabled = false; btn.textContent = 'إرسال طلب الإيداع'; }
}

async function submitWithdraw() {
  var amount = parseFloat($('withdrawAmount').value);
  var phone = $('withdrawPhone').value.trim();
  if (!amount || amount < CONFIG.MIN_WITHDRAW) return showToast('الحد الأدنى ' + CONFIG.MIN_WITHDRAW + ' جنيه', 'error');
  if (Wallet.balance < amount) return showToast('رصيد غير كافٍ', 'error');
  if (!phone || phone.length < 11) return showToast('رقم تليفون غير صحيح', 'error');

  var btn = document.querySelector('#withdrawModal .btn-neon');
  if (btn) { btn.disabled = true; btn.textContent = 'جاري الإرسال...'; }

  var ok = await requestWithdraw(amount, phone);
  if (ok) closeModal('withdrawModal');
  if (btn) { btn.disabled = false; btn.textContent = 'إرسال طلب السحب'; }
}

/* ============================================
   MILESTONES
   ============================================ */

function checkMilestones() {
  var peak = App.user.peak_points || 0;
  if (!App.user.claimed_milestones) App.user.claimed_milestones = [];

  for (var i = 0; i < CONFIG.MILESTONES.length; i++) {
    var m = CONFIG.MILESTONES[i];
    if (peak >= m.points && App.user.claimed_milestones.indexOf(m.points) === -1) {
      App.user.claimed_milestones.push(m.points);
      addEarning(m.money, 'milestone_' + m.points);
      showToast('🏆 مبروك! وصلت ' + m.points + ' نقطة — ربحت ' + m.money + ' جنيه', 'success');
      showCoinToast('+' + m.money + ' ج', '🏆');
    }
  }

  saveLocal();
  syncUser();
  updateMilestonesUI();
}

function updateMilestonesUI() {
  var container = $('milestonesList');
  if (!container) return;

  var peak = App.user.peak_points || 0;
  var claimed = App.user.claimed_milestones || [];

  var html = '';
  for (var i = 0; i < CONFIG.MILESTONES.length; i++) {
    var m = CONFIG.MILESTONES[i];
    var done = claimed.indexOf(m.points) !== -1;
    var available = peak >= m.points;
    var progress = Math.min(100, Math.floor((peak / m.points) * 100));

    var status = '';
    if (done) status = '<span class="ms-status done">✅ مُستلم</span>';
    else if (available) status = '<span class="ms-status ready">🎁 متاح</span>';
    else status = '<span class="ms-status locked">🔒 ' + progress + '%</span>';

    html += '<div class="milestone-item ' + (done ? 'done' : available ? 'ready' : '') + '">' +
      '<div class="ms-icon">' + (done ? '✅' : available ? '🎁' : '🔒') + '</div>' +
      '<div class="ms-info">' +
        '<div class="ms-points">' + m.points.toLocaleString() + ' نقطة</div>' +
        '<div class="ms-money">' + m.money + ' جنيه</div>' +
      '</div>' +
      status +
    '</div>';
  }
  container.innerHTML = html;
}

function openMilestonesModal() {
  updateMilestonesUI();
  var m = $('milestonesModal');
  if (m) m.classList.add('active');
}

/* ============================================
   BACKGROUND
   ============================================ */
window.addEventListener('load', function(){
  startTriangleBackground();
  restoreSession();
  buildPrizeTables();
  checkDailyResets();
  regenTickets();
  setInterval(regenTickets, 60000);
  updateMissionsUI();
  updateAllUI();

  var btn = $('loginBtn');
  if(btn) btn.addEventListener('click', function(e){e.preventDefault(); login();});

  var phoneInp = $('phoneInput');
  if(phoneInp) phoneInp.addEventListener('input', function(){this.value = this.value.replace(/\D/g,'');});

  console.log('Neon Prediction ready ✅');
});

function startTriangleBackground(){
  var c = $('bgCanvas'); if(!c) return;
  var ctx = c.getContext('2d');
  var W = c.width = innerWidth, H = c.height = innerHeight;
  var tris = [];
  for(var i=0;i<12;i++) tris.push({x:Math.random()*W,y:Math.random()*H,size:Math.random()*50+22,speedX:(Math.random()-.5)*.22,speedY:(Math.random()-.5)*.22,rot:Math.random()*Math.PI*2,rotSpeed:(Math.random()-.5)*.0035,op:Math.random()*.2+.06});
  addEventListener('resize',function(){W=c.width=innerWidth;H=c.height=innerHeight;});
  (function draw(){
    ctx.fillStyle='#0c0a0a'; ctx.fillRect(0,0,W,H);
    for(var i=0;i<tris.length;i++){
      var t=tris[i]; t.x+=t.speedX; t.y+=t.speedY; t.rot+=t.rotSpeed;
      if(t.x<-70)t.x=W+70; if(t.x>W+70)t.x=-70;
      if(t.y<-70)t.y=H+70; if(t.y>H+70)t.y=-70;
      ctx.save(); ctx.translate(t.x,t.y); ctx.rotate(t.rot);
      ctx.beginPath(); ctx.moveTo(0,-t.size); ctx.lineTo(-t.size*.87,t.size*.5); ctx.lineTo(t.size*.87,t.size*.5); ctx.closePath();
      ctx.strokeStyle='rgba(220,80,80,'+t.op+')'; ctx.lineWidth=1.3;
      ctx.shadowColor='rgba(220,70,70,'+t.op+')'; ctx.shadowBlur=10; ctx.stroke(); ctx.restore();
    }
    requestAnimationFrame(draw);
  })();
}

/* ========== SESSION ========== */
function restoreSession(){
  var saved = localStorage.getItem(STORAGE_KEY);
  if(!saved) return;
  try{
    var p = JSON.parse(saved);
    var m = createDefaultUser();
    for(var k in p) if(p.hasOwnProperty(k)) m[k] = p[k];
    App.user = m;
    if(!App.user.missions) App.user.missions = getDefaultMissions();
    if(!Array.isArray(App.user.claimedPrizes)) App.user.claimedPrizes = [];
    if(!Array.isArray(App.user.claimed_milestones)) App.user.claimed_milestones = [];
    if(App.user.username){
      setTimeout(function(){enterGame(); maybeShowSpecialOffer();},300);
    }
  }catch(e){localStorage.removeItem(STORAGE_KEY);}
}

function saveLocal(){
  try{localStorage.setItem(STORAGE_KEY, JSON.stringify(App.user));}catch(e){}
}

/* ========== LOGIN ========== */
function login(){
  if(App.busy) return;
  var nameEl = $('usernameInput'), phoneEl = $('phoneInput');
  var name = nameEl ? nameEl.value.trim() : '';
  var phone = phoneEl ? phoneEl.value.trim() : '';
  if(name.length < 2) return showToast('اكتب اسم صحيح','error');
  if(!phone || phone.length < 11 || phone.indexOf('01') !== 0) return showToast('رقم تليفون غير صحيح','error');

  App.busy = true;

  if(supabaseClient){
    supabaseClient.from('users').select('*').eq('phone', phone).maybeSingle().then(function(res){
      if(res.data){
        loadUserFromDB(res.data);
        showToast('أهلاً بيك تاني '+name,'success');
        enterGame();
        App.busy = false;
      } else {
        var newUser = createDefaultUser();
        newUser.username = name;
        newUser.phone = phone;
        newUser.purchased = CONFIG.STARTER_POINTS;
        newUser.tickets = CONFIG.MAX_TICKETS;
        newUser.lastTicketRegen = new Date().toISOString();
        newUser.missions = getDefaultMissions();
        newUser.lastMissionDate = new Date().toDateString();

        supabaseClient.from('users').insert({
          username: name, phone: phone,
          purchased: CONFIG.STARTER_POINTS,
          tickets: CONFIG.MAX_TICKETS,
          missions: newUser.missions,
          last_mission_date: newUser.lastMissionDate
        }).select().single().then(function(ins){
          if(ins.error){
            App.user = newUser;
            App.user.id = 'local_'+Date.now();
          } else if(ins.data){
            loadUserFromDB(ins.data);
          }
          saveLocal();
          enterGame();
          showToast('أهلاً '+name+'! حصلت على '+CONFIG.STARTER_POINTS+' نقطة','success');
          App.busy = false;
        });
      }
    }).catch(function(err){
      App.user = createDefaultUser();
      App.user.id = 'local_'+Date.now();
      App.user.username = name;
      App.user.phone = phone;
      App.user.purchased = CONFIG.STARTER_POINTS;
      App.user.tickets = CONFIG.MAX_TICKETS;
      App.user.lastTicketRegen = Date.now();
      App.user.missions = getDefaultMissions();
      App.user.lastMissionDate = new Date().toDateString();
      saveLocal();
      enterGame();
      showToast('أهلاً '+name+'! (وضع محلي)','success');
      App.busy = false;
    });
  } else {
    App.user = createDefaultUser();
    App.user.id = 'local_'+Date.now();
    App.user.username = name;
    App.user.phone = phone;
    App.user.purchased = CONFIG.STARTER_POINTS;
    App.user.tickets = CONFIG.MAX_TICKETS;
    App.user.lastTicketRegen = Date.now();
    App.user.missions = getDefaultMissions();
    App.user.lastMissionDate = new Date().toDateString();
    saveLocal();
    enterGame();
    showToast('أهلاً '+name+'! حصلت على '+CONFIG.STARTER_POINTS+' نقطة','success');
    App.busy = false;
  }
}

function loadUserFromDB(row){
  App.user = createDefaultUser();
  App.user.id = row.id;
  App.user.username = row.username;
  App.user.phone = row.phone;
  App.user.purchased = row.purchased || 0;
  App.user.earned = row.earned || 0;
  App.user.level = row.level || 1;
  App.user.games_played = row.games_played || 0;
  App.user.wins = row.wins || 0;
  App.user.streak = row.streak || 0;
  App.user.bestStreak = row.best_streak || 0;
  App.user.tickets = row.tickets != null ? row.tickets : CONFIG.MAX_TICKETS;
  App.user.lastTicketRegen = row.last_ticket_regen;
  App.user.claimedPrizes = row.claimed_prizes || [];
  App.user.lastDailyChest = row.last_daily_chest;
  App.user.lastDailyLogin = row.last_daily_login;
  App.user.dailyLoginStreak = row.daily_login_streak || 0;
  App.user.lastWheelSpin = row.last_wheel_spin;
  App.user.missions = row.missions || getDefaultMissions();
  App.user.lastMissionDate = row.last_mission_date;
  App.user.adShown = row.ad_shown || false;
  App.user.is_prime = row.is_prime || false;
  App.user.prime_expires_at = row.prime_expires_at;
  App.user.multiplier_2x_expires_at = row.multiplier_2x_expires_at;
  App.user.peak_points = row.peak_points || 0;
  App.user.claimed_milestones = row.claimed_milestones || [];
  saveLocal();
  loadWallet();
}

function enterGame(){
  $('loginScreen').classList.remove('active');
  $('mainScreen').classList.add('active');
  updateAllUI();
  loadWallet();
  if(!App.user.adShown){
    $('welcomeAd').classList.remove('hidden');
  }
}

function closeWelcomeAd(){
  $('welcomeAd').classList.add('hidden');
  App.user.adShown = true;
  saveLocal();
}

function updateAllUI(){
  if(!App.user || !App.user.username) return;
  $('userName').textContent = App.user.username;
  $('userPoints').textContent = totalPoints();
  $('userLevel').textContent = CONFIG.LEVEL_NAMES[App.user.level] || 'مبتدئ';
  $('streakValue').textContent = App.user.streak;
  $('ticketValue').textContent = App.user.tickets;
  var av = $('userAvatar');
  if(av){
    av.textContent = App.user.username.charAt(0).toUpperCase();
    if(isPrime()) av.classList.add('prime'); else av.classList.remove('prime');
  }
  updateDailyLoginUI();
  updateChestUI();
  updateMissionsUI();
  updateWalletUI();
}

/* ========== TICKETS ========== */
function regenTickets(){
  if(!App.user.id) return;
  if(isPrime()){ App.user.tickets = CONFIG.MAX_TICKETS; updateAllUI(); return; }
  if(!App.user.lastTicketRegen){App.user.lastTicketRegen = new Date().toISOString(); return;}
  if(App.user.tickets >= CONFIG.MAX_TICKETS) return;
  var last = new Date(App.user.lastTicketRegen).getTime();
  var hours = (Date.now() - last)/3600000;
  var canAdd = Math.floor(hours / CONFIG.TICKET_REGEN_HOURS);
  if(canAdd > 0){
    App.user.tickets = Math.min(CONFIG.MAX_TICKETS, App.user.tickets + canAdd);
    App.user.lastTicketRegen = new Date().toISOString();
    saveLocal(); updateAllUI();
  }
}

function useTicket(){
  if(isPrime()) return true;
  if(App.user.tickets <= 0){
    showToast('معندكش تذاكر!','error');
    maybeShowSpecialOffer();
    return false;
  }
  App.user.tickets--;
  saveLocal(); updateAllUI();
  return true;
}

/* ========== DAILY ========== */
function checkDailyResets(){
  if(!App.user.id) return;
  var today = new Date().toDateString();
  if(App.user.lastMissionDate !== today){
    App.user.missions = getDefaultMissions();
    App.user.lastMissionDate = today;
  }
  if(App.user.lastDailyLogin){
    var last = new Date(App.user.lastDailyLogin);
    var diff = Math.floor((Date.now() - last.getTime())/86400000);
    if(diff > 1) App.user.dailyLoginStreak = 0;
  }
  saveLocal();
}

function updateDailyLoginUI(){
  var today = new Date().toDateString();
  var s = $('dailyLoginStatus');
  if(!s) return;
  if(App.user.lastDailyLogin === today){
    s.textContent = 'تم الاستلام اليوم';
    $('dailyLoginBox').classList.add('claimed');
  } else {
    s.textContent = 'اضغط لاستلامها';
    $('dailyLoginBox').classList.remove('claimed');
  }
  $('dailyStreakDisplay').textContent = 'يوم ' + (App.user.dailyLoginStreak + 1);
}

function claimDailyLogin(){
  if(!App.user.id) return;
  var today = new Date().toDateString();
  if(App.user.lastDailyLogin === today) return showToast('اخدت المكافأة النهاردة خلاص','error');
  App.user.dailyLoginStreak = Math.min(App.user.dailyLoginStreak + 1, 7);
  var idx = App.user.dailyLoginStreak - 1;
  var reward = CONFIG.DAILY_LOGIN_REWARDS[idx] || 100;
  if(isPrime()) reward *= 2;
  addPoints(reward);
  App.user.lastDailyLogin = today;
  saveLocal(); updateAllUI();
  checkMilestones();
  showCoinToast('+'+reward+' دخول يومي (يوم '+App.user.dailyLoginStreak+')','📅');
  syncUser();
}

function updateChestUI(){
  var today = new Date().toDateString();
  var s = $('chestStatus');
  if(!s) return;
  if(App.user.lastDailyChest === today){
    s.textContent = 'تم فتحه اليوم';
    $('dailyChest').classList.add('claimed');
  } else {
    s.textContent = 'اضغط لفتحه';
    $('dailyChest').classList.remove('claimed');
  }
}

function claimDailyChest(){
  if(!App.user.id) return;
  var today = new Date().toDateString();
  if(App.user.lastDailyChest === today) return showToast('فتحت الصندوق النهاردة خلاص','error');
  var arr = CONFIG.DAILY_CHEST_REWARDS;
  var reward = arr[Math.floor(Math.random()*arr.length)];
  if(isPrime()) reward *= 2;
  addPoints(reward);
  App.user.lastDailyChest = today;
  saveLocal(); updateAllUI();
  checkMilestones();
  showCoinToast('+'+reward+' من الصندوق','🎁');
  syncUser();
}

/* ========== MISSIONS ========== */
function getDefaultMissions(){
  return {
    play3:{progress:0,target:3,reward:25,done:false},
    win2:{progress:0,target:2,reward:35,done:false},
    play1v1:{progress:0,target:1,reward:20,done:false}
  };
}

function updateMissionsUI(){
  var list = $('missionsList');
  if(!list) return;
  var m = App.user.missions || getDefaultMissions();
  list.innerHTML =
    '<div class="mission-item '+(m.play3.done?'done':'')+'"><div class="mission-info"><strong>العب 3 مباريات</strong><span>'+m.play3.progress+'/'+m.play3.target+'</span></div><span class="mission-reward">+'+m.play3.reward+'</span></div>'+
    '<div class="mission-item '+(m.win2.done?'done':'')+'"><div class="mission-info"><strong>اكسب مباراتين</strong><span>'+m.win2.progress+'/'+m.win2.target+'</span></div><span class="mission-reward">+'+m.win2.reward+'</span></div>'+
    '<div class="mission-item '+(m.play1v1.done?'done':'')+'"><div class="mission-info"><strong>العب 1 ضد 1</strong><span>'+m.play1v1.progress+'/'+m.play1v1.target+'</span></div><span class="mission-reward">+'+m.play1v1.reward+'</span></div>';
}

function updateMissionProgress(type, won){
  if(!App.user.missions) App.user.missions = getDefaultMissions();
  var m = App.user.missions;
  if(type === 'play' && !m.play3.done){
    m.play3.progress++;
    if(m.play3.progress >= m.play3.target){m.play3.done = true; addPoints(m.play3.reward); showCoinToast('+'+m.play3.reward+' مهمة','🎯');}
  }
  if(type === 'win' && won && !m.win2.done){
    m.win2.progress++;
    if(m.win2.progress >= m.win2.target){m.win2.done = true; addPoints(m.win2.reward); showCoinToast('+'+m.win2.reward+' مهمة','🎯');}
  }
  if(type === '1v1' && !m.play1v1.done){
    m.play1v1.progress++;
    if(m.play1v1.progress >= m.play1v1.target){m.play1v1.done = true; addPoints(m.play1v1.reward); showCoinToast('+'+m.play1v1.reward+' مهمة','🎯');}
  }
  saveLocal(); updateMissionsUI(); updateAllUI();
  checkMilestones();
}

/* ========== SYNC ========== */
function syncUser(){
  if(!supabaseClient || !App.user.id) return;
  if(String(App.user.id).indexOf('local_') === 0) return;
  supabaseClient.from('users').update({
    purchased: App.user.purchased,
    earned: App.user.earned,
    level: App.user.level,
    games_played: App.user.games_played,
    wins: App.user.wins,
    streak: App.user.streak,
    best_streak: App.user.bestStreak,
    tickets: App.user.tickets,
    claimed_prizes: App.user.claimedPrizes,
    last_daily_chest: App.user.lastDailyChest,
    last_daily_login: App.user.lastDailyLogin,
    daily_login_streak: App.user.dailyLoginStreak,
    last_wheel_spin: App.user.lastWheelSpin,
    missions: App.user.missions,
    last_mission_date: App.user.lastMissionDate,
    ad_shown: App.user.adShown,
    is_prime: App.user.is_prime,
    prime_expires_at: App.user.prime_expires_at,
    multiplier_2x_expires_at: App.user.multiplier_2x_expires_at,
    peak_points: App.user.peak_points,
    claimed_milestones: App.user.claimed_milestones
  }).eq('id', App.user.id).then(function(res){
    if(res.error) console.warn('Sync error:', res.error);
  });
}

/* ========== ROOMS ========== */
function generateRoomCode(){
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', code = '';
  for(var i=0;i<6;i++) code += chars.charAt(Math.floor(Math.random()*chars.length));
  return code;
}

function createPrivateRoom(){
  if(App.busy) return;
  if(!useTicket()) return;
  if(totalPoints() < CONFIG.ENTRY_FEE + CONFIG.COMMISSION){showToast('رصيدك غير كافٍ','error'); return;}
  var code = generateRoomCode();
  App.room = {id:'private_'+Date.now(),category:'football',mode:'private',code:code,correctChoice:null,status:'waiting'};
  $('roomCodeDisplay').textContent = code;
  $('roomCodeModal').classList.add('active');
  setTimeout(function(){startPrivateWaiting(code);},600);
}

function startPrivateWaiting(code){
  closeModal('roomCodeModal');
  showView('waitingView');
  $('waitingTitle').textContent = 'غرفة خاصة';
  $('playersCount').textContent = '1';
  $('waitingHint').textContent = 'في انتظار الأصدقاء...';
  $('roomCodeShow').style.display = 'block';
  $('roomCodeShow').textContent = 'الكود: '+code;
  $('slot3').style.display = '';
  $('slot1').classList.add('filled');
  $('slot1').textContent = App.user.username.charAt(0).toUpperCase();
  $('slot2').classList.remove('filled');
  $('slot2').textContent = '';
  $('slot3').classList.remove('filled');
  $('slot3').textContent = '';
  setTimeout(function(){
    if(App.room.status !== 'waiting') return;
    $('playersCount').textContent = '2';
    $('slot2').classList.add('filled');
    $('slot2').textContent = BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)].charAt(0);
  },2500);
  setTimeout(function(){
    if(App.room.status !== 'waiting') return;
    $('playersCount').textContent = '3';
    $('slot3').classList.add('filled');
    $('slot3').textContent = BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)].charAt(0);
    $('waitingHint').textContent = 'الغرفة اكتملت!';
    setTimeout(startGame,1000);
  },4500);
}

function openJoinModal(){$('joinCodeInput').value = ''; $('joinRoomModal').classList.add('active');}

function joinRoomByCode(){
  var code = $('joinCodeInput').value.trim().toUpperCase();
  if(code.length !== 6) return showToast('الكود 6 حروف','error');
  if(!useTicket()) return;
  if(totalPoints() < CONFIG.ENTRY_FEE + CONFIG.COMMISSION){showToast('رصيدك غير كافٍ','error'); return;}
  closeModal('joinRoomModal');
  App.room = {id:'joined_'+Date.now(),category:'football',mode:'private',code:code,correctChoice:null,status:'waiting'};
  showView('waitingView');
  $('waitingTitle').textContent = 'غرفة '+code;
  $('playersCount').textContent = '2';
  $('waitingHint').textContent = 'انضممت للغرفة...';
  $('roomCodeShow').style.display = 'block';
  $('roomCodeShow').textContent = 'الكود: '+code;
  $('slot3').style.display = '';
  $('slot1').classList.add('filled');
  $('slot1').textContent = BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)].charAt(0);
  $('slot2').classList.add('filled');
  $('slot2').textContent = App.user.username.charAt(0).toUpperCase();
  $('slot3').classList.remove('filled');
  setTimeout(function(){
    $('playersCount').textContent = '3';
    $('slot3').classList.add('filled');
    $('slot3').textContent = BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)].charAt(0);
    $('waitingHint').textContent = 'الغرفة اكتملت!';
    setTimeout(startGame,900);
  },2000);
  showToast('✅ انضممت للغرفة!','success');
}

function copyRoomCode(){
  var code = $('roomCodeDisplay').textContent;
  var text = '🎮 العب معايا Neon Prediction!\n\n🔒 كود الغرفة: '+code+'\n\nادخل اللعبة واختار "دخول بكود"';
  if(navigator.clipboard) navigator.clipboard.writeText(text).then(function(){showToast('تم نسخ الكود!','success');}).catch(function(){showToast('انسخ يدوياً: '+code,'info');});
  else showToast('انسخ يدوياً: '+code,'info');
}

/* ========== CATEGORIES ========== */
function selectCategory(category){
  if(App.busy) return;
  if(!useTicket()) return;
  if(totalPoints() < CONFIG.ENTRY_FEE + CONFIG.COMMISSION){showToast('رصيدك غير كافٍ','error'); return;}
  App.room = {id:null,category:category,mode:'normal',code:null,correctChoice:null,status:'waiting'};
  showView('waitingView');
  $('waitingTitle').textContent = 'غرفة '+CATEGORIES[category].name;
  $('playersCount').textContent = '1';
  $('waitingHint').textContent = 'جاري البحث عن لاعبين...';
  $('roomCodeShow').style.display = 'none';
  $('slot3').style.display = '';
  $('slot1').classList.add('filled');
  $('slot1').textContent = App.user.username.charAt(0).toUpperCase();
  $('slot2').classList.remove('filled');
  $('slot3').classList.remove('filled');
  setTimeout(function(){$('playersCount').textContent='2';$('slot2').classList.add('filled');$('slot2').textContent=BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)].charAt(0);},1300);
  setTimeout(function(){$('playersCount').textContent='3';$('slot3').classList.add('filled');$('slot3').textContent=BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)].charAt(0);$('waitingHint').textContent='الغرفة اكتملت!';setTimeout(startGame,900);},2600);
}

function start1v1(){
  if(App.busy) return;
  if(!useTicket()) return;
  if(totalPoints() < CONFIG.ENTRY_FEE + CONFIG.COMMISSION){showToast('رصيدك غير كافٍ','error'); return;}
  App.room = {id:null,category:'football',mode:'1v1',code:null,correctChoice:null,status:'waiting'};
  showView('waitingView');
  $('waitingTitle').textContent = '1 ضد 1';
  $('playersCount').textContent = '1';
  $('waitingHint').textContent = 'جاري البحث عن خصم...';
  $('roomCodeShow').style.display = 'none';
  $('slot3').style.display = 'none';
  $('slot1').classList.add('filled');
  $('slot1').textContent = App.user.username.charAt(0).toUpperCase();
  setTimeout(function(){$('playersCount').textContent='2';$('slot2').classList.add('filled');$('slot2').textContent=BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)].charAt(0);$('waitingHint').textContent='تم العثور على خصم!';setTimeout(startGame,800);},1600);
}

/* ========== GAME ========== */
function startGame(){
  App.room.status = 'playing';
  App.myChoice = null;
  App.room.correctChoice = Math.floor(Math.random()*5) + 1;
  var cat = CATEGORIES[App.room.category] || CATEGORIES.football;
  var grid = $('choicesGrid');
  grid.innerHTML = '';
  cat.choices.forEach(function(c,i){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice-btn';
    btn.innerHTML = '<span class="choice-num">'+(i+1)+'</span><span>'+c+'</span>';
    btn.onclick = function(){makeChoice(i+1);};
    grid.appendChild(btn);
  });
  showView('gameView');
  startTimer();
}

function makeChoice(num){
  if(App.myChoice !== null) return;
  App.myChoice = num;
  var btns = document.querySelectorAll('.choice-btn');
  for(var i=0;i<btns.length;i++){btns[i].disabled = true; if(i+1===num) btns[i].classList.add('selected');}
  stopTimer();
  setTimeout(showResult,1300);
}

function startTimer(){
  App.timeLeft = CONFIG.CHOICE_TIMEOUT;
  var el = $('timerValue');
  el.textContent = App.timeLeft;
  el.classList.remove('danger');
  App.timerInterval = setInterval(function(){
    App.timeLeft--;
    el.textContent = App.timeLeft;
    if(App.timeLeft <= 3) el.classList.add('danger');
    if(App.timeLeft <= 0){
      stopTimer();
      if(App.myChoice === null){
        App.myChoice = Math.floor(Math.random()*5)+1;
        deductPoints(CONFIG.TIMEOUT_PENALTY);
        saveLocal(); updateAllUI();
        showCoinToast('-'+CONFIG.TIMEOUT_PENALTY+' انتهى الوقت','⏰');
        setTimeout(showResult,900);
      }
    }
  },1000);
}

function stopTimer(){if(App.timerInterval) clearInterval(App.timerInterval); App.timerInterval = null;}

function showResult(){
  if(App.room.status === 'finished') return;
  App.room.status = 'finished';
  var correct = App.room.correctChoice;
  var cat = CATEGORIES[App.room.category] || CATEGORIES.football;
  var correctName = cat.choices[correct-1];
  var myName = App.myChoice ? cat.choices[App.myChoice-1] : 'لم تختر';
  var won = App.myChoice === correct;
  var cost = CONFIG.ENTRY_FEE + CONFIG.COMMISSION;
  deductPoints(cost);
  App.user.games_played++;
  updateMissionProgress('play');
  if(App.room.mode === '1v1') updateMissionProgress('1v1');
  $('lossRecoveryBtn').style.display = 'none';
  if(won){
    addPoints(CONFIG.WIN_REWARD, true);
    App.user.wins++;
    App.user.streak++;
    if(App.user.streak > App.user.bestStreak) App.user.bestStreak = App.user.streak;
    var bonus = 0;
    if(App.user.streak >= 5) bonus = 15; else if(App.user.streak >= 3) bonus = 8;
    if(bonus > 0){addPoints(bonus, true); $('streakResult').textContent = '🔥 سلسلة ×'+App.user.streak+' (+'+bonus+')';}
    else $('streakResult').textContent = '🔥 سلسلة ×'+App.user.streak;
    updateMissionProgress('win', true);
    checkLevelUp();
    checkPrizes();
    showCoinToast('+'+(CONFIG.WIN_REWARD + bonus),'🏆');
  } else {
    App.user.streak = 0;
    App.user.lastLossAmount = cost;
    $('streakResult').textContent = '';
    $('lossRecoveryBtn').style.display = 'block';
    showCoinToast('-'+cost,'💸');
  }
  saveLocal(); updateAllUI(); syncUser();
  checkMilestones();
  $('resultIcon').textContent = won ? '🏆' : '😢';
  $('resultTitle').textContent = won ? 'مبروك! فزت' : 'للأسف خسرت';
  $('resultText').innerHTML = 'الصحيح: <strong>'+correctName+'</strong><br>اختيارك: <strong>'+myName+'</strong>';
  $('resultReward').textContent = won ? '+'+CONFIG.WIN_REWARD+' نقطة' : '-'+cost+' نقطة';
  $('resultContainer').className = 'result-container ' + (won ? 'winner' : 'loser');
  showView('resultView');
}

function checkLevelUp(){
  var lvl = Math.floor(App.user.games_played / CONFIG.LEVELS_PER_GAMES) + 1;
  if(lvl > 7) lvl = 7;
  if(lvl > App.user.level){App.user.level = lvl; showToast('ترقيت! '+CONFIG.LEVEL_NAMES[lvl],'success');}
}

function checkPrizes(){
  for(var i=0;i<CONFIG.PRIZES.length;i++){
    var p = CONFIG.PRIZES[i];
    if(App.user.earned >= p.threshold && App.user.claimedPrizes.indexOf(p.threshold) === -1){
      App.user.claimedPrizes.push(p.threshold);
      showCoinToast('وصلت '+p.threshold+' نقطة! جائزة '+p.money+' جنيه','💰');
    }
  }
}

/* ========== LOSS RECOVERY ========== */
function openLossRecovery(){
  var amount = App.user.lastLossAmount || 14;
  $('lossRecoveryText').textContent = 'هترجعلك '+amount+' نقطة + '+CONFIG.LOSS_RECOVERY_BONUS+' إضافية مقابل '+CONFIG.LOSS_RECOVERY_COST+' جنيه';
  $('lossRecoveryModal').classList.add('active');
}

function confirmLossRecovery(){
  var amount = App.user.lastLossAmount || 14;
  addPoints(amount + CONFIG.LOSS_RECOVERY_BONUS);
  saveLocal(); updateAllUI(); syncUser();
  showCoinToast('تم استرجاع '+(amount + CONFIG.LOSS_RECOVERY_BONUS)+' نقطة','✅');
  closeModal('lossRecoveryModal');
  $('lossRecoveryBtn').style.display = 'none';
}

/* ============================================
   LUCKY WHEEL — بالجنيه
   ============================================ */
var WHEEL_PRIZES = [
  {value:0,   weight:25,  color:'#1a1010', text:'0',    label:'حظ أوفر'},
  {value:1,   weight:20,  color:'#2a1a1a', text:'1 ج',  label:'1 جنيه'},
  {value:2,   weight:18,  color:'#3a2424', text:'2 ج',  label:'2 جنيه'},
  {value:3,   weight:12,  color:'#e85a5a', text:'3 ج',  label:'3 جنيه'},
  {value:5,   weight:10,  color:'#d44a4a', text:'5 ج',  label:'5 جنيه'},
  {value:10,  weight:7,   color:'#f0b050', text:'10 ج', label:'10 جنيه'},
  {value:15,  weight:4,   color:'#e8a040', text:'15 ج', label:'15 جنيه'},
  {value:25,  weight:2.5, color:'#00c853', text:'25 ج', label:'25 جنيه'},
  {value:50,  weight:1,   color:'#00a040', text:'50 ج', label:'50 جنيه'},
  {value:100, weight:0.5, color:'#ffd700', text:'100 ج',label:'100 جنيه ⭐'}
];

var wheelState = {
  spinning:false, currentAngle:0,
  audioCtx:null, whir:null
};

function drawWheel(segs){
  var canvas = $('wheelCanvas');
  if(!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  var cx = W/2, cy = H/2, R = W/2 - 15;
  var n = segs.length, arc = (Math.PI*2)/n;
  ctx.clearRect(0,0,W,H);
  ctx.beginPath(); ctx.arc(cx,cy,R+6,0,Math.PI*2);
  ctx.fillStyle = '#0c0a0a'; ctx.fill();
  for(var i=0;i<n;i++){
    var s = segs[i];
    var a1 = i*arc - Math.PI/2, a2 = a1 + arc;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,R,a1,a2); ctx.closePath();
    ctx.fillStyle = s.color; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(a1 + arc/2);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillStyle = s.color === '#ffd700' ? '#000' : '#fff';
    ctx.font = 'bold 34px "Cairo", sans-serif';
    ctx.fillText(s.text, R - 30, 0);
    ctx.restore();
  }
  ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.strokeStyle = 'rgba(220,70,70,0.6)'; ctx.lineWidth = 4; ctx.stroke();
}

function pickWinner(){
  var total = 0;
  for(var i=0;i<WHEEL_PRIZES.length;i++) total += WHEEL_PRIZES[i].weight;
  var r = Math.random() * total, acc = 0;
  for(var j=0;j<WHEEL_PRIZES.length;j++){
    acc += WHEEL_PRIZES[j].weight;
    if(r < acc) return {index:j, segment:WHEEL_PRIZES[j]};
  }
  return {index:0, segment:WHEEL_PRIZES[0]};
}

function openLuckyWheel(){
  var today = new Date().toDateString();
  var btn = $('spinBtn'), info = $('wheelInfo');
  if(App.user.lastWheelSpin === today){
    btn.textContent = 'لف العجلة ('+CONFIG.WHEEL_COST+' ج)';
    info.textContent = 'خلصت المرة المجانية النهاردة';
  } else {
    btn.textContent = 'لف العجلة (مجاناً)';
    info.textContent = 'مرة واحدة مجاناً كل يوم';
  }
  btn.disabled = false;
  $('wheelResult').textContent = 'اضغط لف العجلة';
  $('wheelResult').classList.remove('reveal');
  drawWheel(WHEEL_PRIZES);
  buildWheelLegend();
  $('luckyWheelModal').classList.add('active');
}

function buildWheelLegend(){
  var el = $('wheelLegend');
  if(!el) return;
  var total = 0;
  for(var i=0;i<WHEEL_PRIZES.length;i++) total += WHEEL_PRIZES[i].weight;
  var html = '';
  for(var j=0;j<WHEEL_PRIZES.length;j++){
    var p = WHEEL_PRIZES[j];
    var pct = ((p.weight/total)*100).toFixed(1);
    html += '<div class="legend-item"><span class="legend-dot" style="background:'+p.color+';border:1px solid #fff"></span><span>'+p.label+' ('+pct+'%)</span></div>';
  }
  el.innerHTML = html;
}

function initAudio(){
  if(wheelState.audioCtx) return;
  try{
    var AC = window.AudioContext || window.webkitAudioContext;
    wheelState.audioCtx = new AC();
  }catch(e){}
}

function startWhir(){
  if(!wheelState.audioCtx) return;
  stopWhir();
  var ctx = wheelState.audioCtx;
  var osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 70;
  var lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 15;
  var lfoGain = ctx.createGain(); lfoGain.gain.value = 30;
  lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
  var filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 900; filter.Q.value = 4;
  var gain = ctx.createGain(); gain.gain.value = 0;
  osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  osc.start(); lfo.start();
  gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.15);
  wheelState.whir = {osc:osc, lfo:lfo, gain:gain};
}

function updateWhir(progress){
  if(!wheelState.whir || !wheelState.audioCtx) return;
  var ctx = wheelState.audioCtx;
  var freq = 70 - progress * 55;
  wheelState.whir.osc.frequency.setTargetAtTime(Math.max(15, freq), ctx.currentTime, 0.1);
  var vol = 0.12 * (1 - progress * 0.7);
  wheelState.whir.gain.gain.setTargetAtTime(vol, ctx.currentTime, 0.2);
}

function stopWhir(){
  if(!wheelState.whir || !wheelState.audioCtx) return;
  try{
    var ctx = wheelState.audioCtx;
    wheelState.whir.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    var src = wheelState.whir;
    setTimeout(function(){try{src.osc.stop(); src.lfo.stop();}catch(e){}},300);
  }catch(e){}
  wheelState.whir = null;
}

function tickSound(){
  if(!wheelState.audioCtx) return;
  var ctx = wheelState.audioCtx;
  var osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = 'square'; osc.frequency.value = 1200 + Math.random()*400;
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.05);
}

function winSound(){
  if(!wheelState.audioCtx) return;
  var ctx = wheelState.audioCtx;
  var notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach(function(f, i){
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    var t = ctx.currentTime + i*0.1;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.4);
  });
}

function moneySound(){
  if(!wheelState.audioCtx) return;
  var ctx = wheelState.audioCtx;
  var notes = [1046.5, 1318.5, 1567.98, 2093];
  notes.forEach(function(f, i){
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    var t = ctx.currentTime + i*0.08;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.5);
  });
}

function spinWheel(){
  if(wheelState.spinning) return;
  var today = new Date().toDateString();
  var isFree = App.user.lastWheelSpin !== today;
  var btn = $('spinBtn'), canvas = $('wheelCanvas');

  if(!isFree){
    if(Wallet.balance < CONFIG.WHEEL_COST){
      return showToast('محتاج '+CONFIG.WHEEL_COST+' جنيه في المحفظة', 'error');
    }
    deductFromWallet(CONFIG.WHEEL_COST);
  }

  wheelState.spinning = true;
  App.user.lastWheelSpin = today;
  btn.disabled = true;
  $('wheelResult').textContent = 'بلف...';
  $('wheelResult').classList.remove('reveal');

  var winner = pickWinner();

  var n = WHEEL_PRIZES.length;
  var segAngle = 360 / n;
  var centerAngle = winner.index * segAngle + segAngle / 2;
  var jitter = (Math.random() - 0.5) * (segAngle * 0.5);
  var targetAngle = 360 - centerAngle + jitter;
  var fullRotations = 4;
  var startAngle = wheelState.currentAngle;
  var delta = fullRotations * 360 + (targetAngle - (startAngle % 360));
  var finalAngle = startAngle + delta;
  var duration = 5500;
  var startTime = performance.now();
  var lastTick = 0;
  var ticksPerSeg = 4;

  initAudio();
  startWhir();
  var hub = document.querySelector('.wheel-hub');
  if(hub) hub.classList.add('spinning');

  function ease(t){return 1 - Math.pow(1 - t, 4);}

  function animate(now){
    var p = Math.min((now - startTime)/duration, 1);
    var e = ease(p);
    var rot = startAngle + delta * e;
    canvas.style.transform = 'rotate(' + rot + 'deg)';
    if(p < 1){
      var degPassed = Math.abs(rot - startAngle);
      var expectedTicks = (degPassed / segAngle) * ticksPerSeg;
      if(expectedTicks - lastTick >= 1){ tickSound(); lastTick = Math.floor(expectedTicks); }
      updateWhir(p);
      requestAnimationFrame(animate);
    } else {
      wheelState.currentAngle = finalAngle % 360;
      stopWhir();
      if(hub) hub.classList.remove('spinning');
      finishSpin(winner.segment);
    }
  }
  requestAnimationFrame(animate);
}

function finishSpin(reward){
  var el = $('wheelResult');
  el.classList.add('reveal');
  var actualValue = reward.value;
  if(isPrime()) actualValue *= 2;

  if(actualValue > 0){
    addEarning(actualValue, 'wheel');
    el.textContent = '🎉 كسبت ' + actualValue + ' جنيه!';
    if(actualValue >= 25) moneySound();
    else winSound();
    showCoinToast('+' + actualValue + ' ج', '🎡');
  } else {
    el.textContent = 'حظ أوفر المرة الجاية 😢';
    showToast('حظ أوفر', 'info');
  }

  saveLocal(); updateAllUI();
  $('spinBtn').disabled = false;
  $('spinBtn').textContent = 'لف العجلة ('+CONFIG.WHEEL_COST+' ج)';
  $('wheelInfo').textContent = 'خلصت المرة المجانية النهاردة';
  wheelState.spinning = false;
}

/* ========== SPECIAL OFFER ========== */
function maybeShowSpecialOffer() {
  var today = new Date().toDateString();
  if (totalPoints() >= 40) return;
  if (App.user.lastSpecialOffer === today) return;
  App.user.lastSpecialOffer = today;
  saveLocal();
  setTimeout(function(){
    $('offerText').textContent = '300 نقطة بـ 35 جنيه فقط!';
    $('specialOfferModal').classList.add('active');
    startOfferTimer(15 * 60);
  }, 2000);
}

function startOfferTimer(seconds) {
  var el = $('offerTimer');
  var left = seconds;
  if (App.specialOfferTimeout) clearInterval(App.specialOfferTimeout);
  function update() {
    var m = Math.floor(left / 60);
    var s = left % 60;
    el.textContent = 'ينتهي خلال ' + m + ':' + (s < 10 ? '0' + s : s);
    if (left <= 0) {
      clearInterval(App.specialOfferTimeout);
      closeModal('specialOfferModal');
    }
    left--;
  }
  update();
  App.specialOfferTimeout = setInterval(update, 1000);
}

function acceptSpecialOffer() {
  closeModal('specialOfferModal');
  if (App.specialOfferTimeout) clearInterval(App.specialOfferTimeout);
  buyPackage(300, 35);
}

/* ========== NAVIGATION ========== */
function playAgain(){
  $('slot2').classList.remove('filled');
  $('slot3').classList.remove('filled');
  $('slot3').style.display = '';
  $('roomCodeShow').style.display = 'none';
  App.room = {id:null,category:null,mode:'normal',code:null,correctChoice:null,status:'idle'};
  App.myChoice = null;
  showView('categoryView');
}

function leaveRoom(){
  if(App.room.status === 'waiting' && !isPrime()){
    App.user.tickets = Math.min(CONFIG.MAX_TICKETS, App.user.tickets + 1);
    saveLocal(); updateAllUI();
  }
  playAgain();
  showToast('غادرت الغرفة','info');
}

function showView(viewId){
  document.querySelectorAll('.view').forEach(function(v){v.classList.remove('active');});
  var v = $(viewId);
  if(v) v.classList.add('active');
  var nav = $('bottomNav');
  if(nav) nav.classList.toggle('hidden', viewId !== 'categoryView');
}

/* ========== STORE ========== */
function openStore(){$('storeModal').classList.add('active');}
function closeModal(id){var m = $(id); if(m) m.classList.remove('active');}

function buyPackage(points, price){
  App.pendingPurchase = {type:'points', points:points, price:price, label:points+' نقطة'};
  closeModal('storeModal');
  closeModal('specialOfferModal');
  $('paymentProduct').textContent = points+' نقطة';
  $('paymentPrice').textContent = price+' جنيه';
  $('paymentModal').classList.add('active');
}

function buyPrime(){
  App.pendingPurchase = {type:'prime', price:CONFIG.PRIME_PRICE, label:'اشتراك البرايم 30 يوم'};
  closeModal('storeModal');
  $('paymentProduct').textContent = 'اشتراك البرايم (30 يوم)';
  $('paymentPrice').textContent = CONFIG.PRIME_PRICE+' جنيه';
  $('paymentModal').classList.add('active');
}

function buyMultiplier(){
  App.pendingPurchase = {type:'multiplier', price:CONFIG.MULTIPLIER_PRICE, label:'مضاعفة ×2 لمدة 24 ساعة'};
  closeModal('storeModal');
  $('paymentProduct').textContent = 'مضاعفة ×2 (24 ساعة)';
  $('paymentPrice').textContent = CONFIG.MULTIPLIER_PRICE+' جنيه';
  $('paymentModal').classList.add('active');
}

function submitPayment(){
  var inp = $('transNumberInput');
  var num = inp ? inp.value.trim() : '';
  if(num.length < 6) return showToast('رقم العملية لازم 6 أرقام على الأقل','error');
  if(!App.pendingPurchase) return;

  var btn = document.querySelector('#paymentModal .btn-neon');
  if(btn){btn.disabled = true; btn.textContent = 'جاري الإرسال...';}

  var req = {
    user_id: (supabaseClient && App.user.id && String(App.user.id).indexOf('local_') !== 0) ? App.user.id : null,
    points: App.pendingPurchase.type === 'points' ? App.pendingPurchase.points : 0,
    price_egp: App.pendingPurchase.price,
    trans_number: num,
    status: 'pending'
  };

  if(supabaseClient && req.user_id){
    supabaseClient.from('purchase_requests').insert(req).then(function(res){
      if(btn){btn.disabled = false; btn.textContent = 'إرسال الطلب';}
      if(res.error){
        if(res.error.message && res.error.message.indexOf('foreign key') >= 0){
          showToast('⚠️ جلسة قديمة! جاري إعادة التسجيل...','error');
          setTimeout(function(){localStorage.clear(); location.reload();}, 2000);
          return;
        }
        return showToast('خطأ: '+res.error.message,'error');
      }
      showToast('✅ تم إرسال الطلب!','success');
      closeModal('paymentModal');
      App.pendingPurchase = null;
      if(inp) inp.value = '';
    });
  } else {
    setTimeout(function(){
      showToast('✅ تم إرسال الطلب (محلياً)','success');
      closeModal('paymentModal');
      App.pendingPurchase = null;
      if(inp) inp.value = '';
      if(btn){btn.disabled = false; btn.textContent = 'إرسال الطلب';}
    },700);
  }
}

/* ========== PROFILE ========== */
function openProfile(){
  $('profileName').textContent = App.user.username;
  $('profilePhone').textContent = App.user.phone || '--';
  $('profilePurchased').textContent = App.user.purchased;
  $('profileEarned').textContent = App.user.earned;
  $('profileWins').textContent = App.user.wins;
  $('profileGames').textContent = App.user.games_played;
  $('profileLevel').textContent = CONFIG.LEVEL_NAMES[App.user.level];
  $('profileBestStreak').textContent = App.user.bestStreak;
  $('profileTickets').textContent = App.user.tickets;
  var rate = App.user.games_played > 0 ? Math.round((App.user.wins/App.user.games_played)*100) : 0;
  $('profileWinRate').textContent = rate + '%';
  var av = $('profileAvatar');
  av.textContent = App.user.username.charAt(0).toUpperCase();
  if(isPrime()) av.classList.add('prime'); else av.classList.remove('prime');

  var ps = $('primeStatus');
  if(isPrime()){
    var exp = new Date(App.user.prime_expires_at);
    var days = Math.max(0, Math.ceil((exp - new Date())/86400000));
    ps.innerHTML = '<span class="badge-prime">👑 برايم</span> <span style="color:#ffd700;font-size:12px;">متبقي '+days+' يوم</span>';
  } else {
    ps.innerHTML = '';
  }

  loadWallet();
  updateWalletUI();
  $('profileModal').classList.add('active');
}

/* ========== PRIZE TABLE ========== */
function buildPrizeTables(){
  var html = '';
  for(var i=0;i<CONFIG.PRIZES.length;i++){
    var p = CONFIG.PRIZES[i];
    html += '<div class="prize-row"><span class="prize-points">'+p.threshold+' نقطة</span><span class="prize-money">'+p.money+' جنيه</span></div>';
  }
  var el = $('welcomePrizeTable');
  if(el) el.innerHTML = html;
}

/* ========== LEADERBOARD ========== */
function showLeaderboard(){
  var list = $('leaderboardList');
  list.innerHTML = '<p class="small-text">جاري التحميل...</p>';
  $('leaderboardModal').classList.add('active');
  if(!supabaseClient){
    list.innerHTML = '<p class="small-text">Supabase غير متصل</p>';
    return;
  }
  supabaseClient.from('users').select('username, purchased, earned, wins').order('purchased', {ascending:false}).limit(20).then(function(res){
    if(res.error || !res.data || !res.data.length){
      list.innerHTML = '<p class="small-text">لا يوجد لاعبين بعد</p>';
      return;
    }
    var html = '';
    for(var i=0;i<res.data.length;i++){
      var u = res.data[i];
      var total = (u.purchased||0) + (u.earned||0);
      html += '<div class="leaderboard-item"><span class="rank">#'+(i+1)+'</span><span class="name">'+u.username+'</span><span class="points">'+total+' 💎</span></div>';
    }
    list.innerHTML = html;
  });
}

/* ========== TOASTS ========== */
function showToast(msg, type){
  var t = $('toast');
  if(!t) return;
  var icons = {info:'ℹ️', success:'✅', error:'❌'};
  $('toastIcon').textContent = icons[type] || icons.info;
  $('toastText').textContent = msg;
  t.className = 'toast ' + (type||'info');
  setTimeout(function(){t.classList.add('show');},50);
  setTimeout(function(){t.classList.remove('show');},3200);
}

function showCoinToast(msg, icon){
  var t = $('coinToast');
  if(!t) return;
  $('coinToastIcon').textContent = icon || '💰';
  $('coinToastText').textContent = msg;
  t.className = 'coin-toast';
  setTimeout(function(){t.classList.add('show');},50);
  setTimeout(function(){t.classList.remove('show');},2800);
}

/* ========== GLOBAL EXPORTS ========== */
window.login = login;
window.closeWelcomeAd = closeWelcomeAd;
window.claimDailyLogin = claimDailyLogin;
window.claimDailyChest = claimDailyChest;
window.createPrivateRoom = createPrivateRoom;
window.openJoinModal = openJoinModal;
window.joinRoomByCode = joinRoomByCode;
window.copyRoomCode = copyRoomCode;
window.start1v1 = start1v1;
window.openLuckyWheel = openLuckyWheel;
window.spinWheel = spinWheel;
window.selectCategory = selectCategory;
window.leaveRoom = leaveRoom;
window.playAgain = playAgain;
window.showView = showView;
window.openStore = openStore;
window.closeModal = closeModal;
window.buyPackage = buyPackage;
window.buyPrime = buyPrime;
window.buyMultiplier = buyMultiplier;
window.submitPayment = submitPayment;
window.openProfile = openProfile;
window.showLeaderboard = showLeaderboard;
window.openLossRecovery = openLossRecovery;
window.confirmLossRecovery = confirmLossRecovery;
window.acceptSpecialOffer = function(){closeModal('specialOfferModal'); buyPackage(300,35);};
window.openDepositModal = openDepositModal;
window.openWithdrawModal = openWithdrawModal;
window.submitDeposit = submitDeposit;
window.submitWithdraw = submitWithdraw;
window.transferEarningsToWallet = transferEarningsToWallet;
window.openMilestonesModal = openMilestonesModal;
window.loadWallet = loadWallet;
