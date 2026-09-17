/* ============================================
   Neon Prediction v11 — نظام النقاط المزدوج
   Cash Points (تُسحب) + Bonus Points (للعب فقط)
   النسخة الكاملة v11.2 — مع Lucky Wheel v2
   ============================================ */

/* ============ SUPABASE ============ */
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

/* ============ CONFIG ============ */
var CONFIG = {
  ENTRY_FEE: 12, WIN_REWARD: 18, COMMISSION: 2,
  CHOICE_TIMEOUT: 10, STARTER_POINTS: 10, TIMEOUT_PENALTY: 6,
  MAX_TICKETS: 5, TICKET_REGEN_HOURS: 2,
  WHEEL_COST: 5, LOSS_RECOVERY_COST: 8, LOSS_RECOVERY_BONUS: 10,
  PRIME_PRICE: 199, PRIME_DAYS: 30,
  MULTIPLIER_PRICE: 15, MULTIPLIER_HOURS: 24,
  LEVELS_PER_GAMES: 15,
  ONLINE_ENTRY: 20,
  ONLINE_ROUNDS: 5,
  ONLINE_TIMEOUT: 10,
  SHARE_REWARD: 5,
  SHARE_DAILY_LIMIT: 50,
  LOSS_DEDUCT: 10,
  MIN_WITHDRAW: 100,
  WITHDRAW_FEE: 0.03,
  LEVEL_NAMES: {1:'مبتدئ 🌱',2:'هاوي 🥉',3:'محترف 🥈',4:'خبير 🥇',5:'أسطورة 💎',6:'نخبة 👑',7:'أسطوري 🏆'},
  PRIZES: [{threshold:150,money:20},{threshold:300,money:55},{threshold:500,money:135},{threshold:800,money:330},{threshold:1200,money:650}],
  MILESTONES: [
    {points:100,money:5},{points:250,money:12},{points:500,money:25},{points:750,money:37},{points:1000,money:50},
    {points:1500,money:90},{points:2000,money:125},{points:2750,money:165},{points:3500,money:210},{points:4500,money:270},
    {points:5500,money:330},{points:7000,money:420},{points:8500,money:510},{points:10000,money:625},{points:12500,money:780},
    {points:15000,money:940},{points:20000,money:1250},{points:25000,money:1560},{points:35000,money:2190},{points:50000,money:3125}
  ],
  DAILY_LOGIN_REWARDS: [5,8,12,15,20,25,30],
  DAILY_CHEST_REWARDS: [3,5,8,12,15],
  MISSION_POOL: [
    {id:'play_3', type:'play', target:3, reward:10, text:'العب 3 مباريات'},
    {id:'play_5', type:'play', target:5, reward:15, text:'العب 5 مباريات'},
    {id:'play_10', type:'play', target:10, reward:25, text:'العب 10 مباريات'},
    {id:'win_2', type:'win', target:2, reward:15, text:'اكسب مباراتين'},
    {id:'win_3', type:'win', target:3, reward:20, text:'اكسب 3 مباريات'},
    {id:'win_5', type:'win', target:5, reward:30, text:'اكسب 5 مباريات'},
    {id:'streak_3', type:'streak', target:3, reward:25, text:'حقق سلسلة 3 انتصارات'},
    {id:'play_1v1_2', type:'1v1', target:2, reward:12, text:'العب مباراتين 1 ضد 1'},
    {id:'play_1v1_5', type:'1v1', target:5, reward:22, text:'العب 5 مباريات 1 ضد 1'},
    {id:'wheel_2', type:'wheel', target:2, reward:8, text:'لف العجلة مرتين'},
    {id:'wheel_5', type:'wheel', target:5, reward:18, text:'لف العجلة 5 مرات'},
    {id:'online_1', type:'online', target:1, reward:15, text:'العب مباراة أونلاين'},
    {id:'online_3', type:'online', target:3, reward:35, text:'العب 3 مباريات أونلاين'},
    {id:'chest', type:'chest', target:1, reward:5, text:'افتح الصندوق اليومي'},
    {id:'play_football', type:'category_football', target:3, reward:12, text:'العب 3 مباريات كرة قدم'},
    {id:'play_fruits', type:'category_fruits', target:3, reward:12, text:'العب 3 مباريات فواكه'},
    {id:'play_animals', type:'category_animals', target:3, reward:12, text:'العب 3 مباريات حيوانات'},
    {id:'play_colors', type:'category_colors', target:3, reward:12, text:'العب 3 مباريات ألوان'},
    {id:'share_1', type:'share', target:1, reward:5, text:'شارك الموقع مع صديق'},
    {id:'win_online_2', type:'win_online', target:2, reward:40, text:'اكسب مباراتين أونلاين'}
  ]
};

var CATEGORIES = {
  football:{name:'كرة القدم',icon:'⚽',choices:['ريال مدريد','برشلونة','ليفربول','بايرن ميونخ','باريس سان جيرمان']},
  fruits:{name:'فواكه',icon:'🍎',choices:['تفاح','موز','برتقال','عنب','فراولة']},
  animals:{name:'حيوانات',icon:'🦁',choices:['أسد','فيل','نمر','زرافة','دب']},
  colors:{name:'ألوان',icon:'🎨',choices:['أحمر','أزرق','أخضر','أصفر','أسود']}
};

var BOT_NAMES = ['أحمد','محمود','سارة','ياسين','نور','عمر','لينا','كريم','هدى','يوسف','مريم','علي'];
var STORAGE_KEY = 'neon_user_v11';
var WALLET_KEY_PREFIX = 'neon_wallet_v11_';

/* ============ APP STATE ============ */
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

var Wallet = { balance: 0, earned: 0, totalDeposited: 0, totalWon: 0, totalWithdrawn: 0 };

function createDefaultUser() {
  return {
    id:null, username:'', phone:'', password:'',
    purchased:0, earned:0, bonus_points:0, level:1,
    games_played:0, wins:0, streak:0, bestStreak:0,
    tickets:5, lastTicketRegen:null, claimedPrizes:[],
    lastDailyChest:null, lastDailyLogin:null, dailyLoginStreak:0,
    lastWheelSpin:null,
    missions:null, lastMissionDate:null,
    lastLossAmount:0, adShown:false, lastSpecialOffer:null,
    is_prime:false, prime_expires_at:null,
    multiplier_2x_expires_at:null,
    peak_points:0, claimed_milestones:[],
    referral_code:null, referred_by:null,
    share_points_today:0, last_share_date:null,
    wheel_spins_total:0,
    active_ticket:null, ticket_expires_at:null, ticket_uses_left:0
  };
}

function $(id){return document.getElementById(id);}

/* ============ نظام النقاط المزدوج ============ */

function cashPoints(){
  return (App.user.purchased || 0) + (App.user.earned || 0);
}

function bonusPoints(){
  return App.user.bonus_points || 0;
}

function totalPoints(){
  return cashPoints() + bonusPoints();
}

function addBonusPoints(amount, source) {
  if (amount <= 0) return;
  App.user.bonus_points = (App.user.bonus_points || 0) + amount;
  if (supabaseClient && App.user.id && String(App.user.id).indexOf('local_') !== 0) {
    supabaseClient.from('point_transactions').insert({
      user_id: App.user.id, amount: amount, type: 'bonus', source: source || 'system'
    }).then(function(){});
  }
  checkPeakPoints();
}

function addPoints(a, toEarned){
  if (a <= 0) return;
  if(isPrime()) a = Math.floor(a * 2);
  if(toEarned) App.user.earned = (App.user.earned || 0) + a;
  else App.user.purchased = (App.user.purchased || 0) + a;
  if (supabaseClient && App.user.id && String(App.user.id).indexOf('local_') !== 0) {
    supabaseClient.from('point_transactions').insert({
      user_id: App.user.id, amount: a, type: toEarned ? 'earned' : 'purchased', source: 'cash'
    }).then(function(){});
  }
  checkPeakPoints();
}

function spendPoints(amount) {
  if (amount <= 0) return { ok: false, bonus: 0, cash: 0 };
  
  var bonus = App.user.bonus_points || 0;
  if (bonus >= amount) {
    App.user.bonus_points = bonus - amount;
    return { ok: true, bonus: amount, cash: 0 };
  }
  
  var fromBonus = bonus;
  var fromCash = amount - bonus;
  App.user.bonus_points = 0;
  
  if (App.user.purchased >= fromCash) {
    App.user.purchased -= fromCash;
  } else {
    var rem = fromCash - App.user.purchased;
    App.user.purchased = 0;
    App.user.earned = Math.max(0, App.user.earned - rem);
  }
  
  return { ok: true, bonus: fromBonus, cash: fromCash };
}

function deductPoints(a){
  if(a <= 0) return;
  if(App.user.purchased >= a){ App.user.purchased -= a; }
  else {
    var r = a - App.user.purchased; 
    App.user.purchased = 0; 
    App.user.earned = Math.max(0, App.user.earned - r);
  }
}

function hasEnoughPoints(amount) {
  return totalPoints() >= amount;
}

function checkPeakPoints(){
  var current = cashPoints();
  if(current > (App.user.peak_points || 0)) App.user.peak_points = current;
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

function hasActiveTicket(){
  if(!App.user.active_ticket) return false;
  if(!App.user.ticket_expires_at) return false;
  if(new Date(App.user.ticket_expires_at) < new Date()) return false;
  if(App.user.ticket_uses_left === 0) return false;
  return true;
}

/* ============ SOUND SYSTEM ============ */
var SoundSystem = {
  ctx: null, enabled: true,
  init: function() {
    if (this.ctx) return;
    try { var AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC(); } catch(e) {}
  },
  playSuccess: function() {
    if (!this.enabled || !this.ctx) return;
    var ctx = this.ctx;
    [523.25, 659.25, 783.99].forEach(function(freq, i) {
      var osc = ctx.createOscillator(); var gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      var t = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.5);
    });
  },
  playBigWin: function() {
    if (!this.enabled || !this.ctx) return;
    var ctx = this.ctx;
    var bell = ctx.createOscillator(); var bGain = ctx.createGain();
    bell.type = 'triangle'; bell.frequency.value = 1046.5;
    bGain.gain.setValueAtTime(0, ctx.currentTime);
    bGain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    bGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    bell.connect(bGain); bGain.connect(ctx.destination);
    bell.start(); bell.stop(ctx.currentTime + 1.3);
    [1318.5, 1567.98, 2093, 2637, 3136].forEach(function(freq, i) {
      var o = ctx.createOscillator(); var g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      var t = ctx.currentTime + i * 0.06;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.15, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.35);
    });
  },
  playReward: function() {
    if (!this.enabled || !this.ctx) return;
    var ctx = this.ctx;
    [880, 1174.66, 1396.91, 1760, 2093].forEach(function(freq, i) {
      var o = ctx.createOscillator(); var g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      var t = ctx.currentTime + i * 0.05;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.4);
    });
  },
  playLevelUp: function() {
    if (!this.enabled || !this.ctx) return;
    var ctx = this.ctx;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(function(freq, i) {
      var o = ctx.createOscillator(); var g = ctx.createGain();
      o.type = 'square'; o.frequency.value = freq;
      var t = ctx.currentTime + i * 0.1;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.45);
    });
  },
  playLoss: function() {
    if (!this.enabled || !this.ctx) return;
    var ctx = this.ctx;
    var o = ctx.createOscillator(); var g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 200;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.55);
  },
  playTick: function() {
    if (!this.enabled || !this.ctx) return;
    var ctx = this.ctx;
    var o = ctx.createOscillator(); var g = ctx.createGain();
    o.type = 'square'; o.frequency.value = 1200 + Math.random() * 400;
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.05);
  }
};

/* ============ VIBRATION ============ */
var Vibration = {
  enabled: true,
  vibrate: function(pattern) {
    if (!this.enabled) return;
    if (!navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch(e) {}
  },
  onWin: function() { this.vibrate([100, 50, 100, 50, 200]); },
  onBigPrize: function() { this.vibrate([200, 100, 200, 100, 300, 100, 500]); },
  onLoss: function() { this.vibrate(200); },
  onReward: function() { this.vibrate([50, 30, 100]); }
};

function showWinOverlay(icon, text, duration) {
  var overlay = $('winOverlay');
  if (!overlay) return;
  $('winOverlayIcon').textContent = icon || '🏆';
  $('winOverlayText').textContent = text || 'مبروك!';
  overlay.classList.add('show');
  setTimeout(function() { overlay.classList.remove('show'); }, duration || 2000);
}

/* ============ AUTH ============ */
function switchAuthTab(tab) {
  if (tab === 'login') {
    $('tabLogin').classList.add('active');
    $('tabSignup').classList.remove('active');
    $('loginForm').style.display = 'block';
    $('signupForm').style.display = 'none';
  } else {
    $('tabLogin').classList.remove('active');
    $('tabSignup').classList.add('active');
    $('loginForm').style.display = 'none';
    $('signupForm').style.display = 'block';
  }
}

async function signupNew() {
  if (App.busy) return;
  var name = $('signupName').value.trim();
  var phone = $('signupPhone').value.trim();
  var password = $('signupPassword').value.trim();

  if (name.length < 2) return showToast('اكتب اسم صحيح', 'error');
  if (!phone || phone.length < 11 || phone.indexOf('01') !== 0) return showToast('رقم غير صحيح', 'error');
  if (password.length < 6) return showToast('كلمة السر 6 أحرف على الأقل', 'error');

  App.busy = true;
  try {
    var nameCheck = await supabaseClient.from('users').select('id').eq('username', name).maybeSingle();
    if (nameCheck.data) { App.busy = false; return showToast('❌ الاسم مستخدم', 'error'); }

    var phoneCheck = await supabaseClient.from('users').select('id').eq('phone', phone).maybeSingle();
    if (phoneCheck.data) { App.busy = false; return showToast('❌ الرقم مسجل', 'error'); }

    var urlParams = new URLSearchParams(window.location.search);
    var refCode = urlParams.get('ref') || localStorage.getItem('neon_ref_code');

    var nu = createDefaultUser();
    nu.username = name; nu.phone = phone; nu.password = password;
    nu.purchased = 0;
    nu.bonus_points = CONFIG.STARTER_POINTS;
    nu.tickets = 0;
    nu.lastTicketRegen = new Date().toISOString();
    nu.missions = getDefaultMissions();
    nu.lastMissionDate = new Date().toDateString();
    nu.referral_code = generateReferralCode();
    nu.referred_by = refCode || null;

    var ins = await supabaseClient.from('users').insert({
      username: name, phone: phone, password: password,
      purchased: 0, earned: 0, bonus_points: CONFIG.STARTER_POINTS,
      tickets: 0, missions: nu.missions, last_mission_date: nu.lastMissionDate,
      referral_code: nu.referral_code, wheel_spins_total: 0
    }).select().single();

    if (ins.error) throw ins.error;

    loadUserFromDB(ins.data);
    saveLocal(); enterGame();
    SoundSystem.playReward(); Vibration.onReward();
    showToast('🎉 أهلاً ' + name + '! عندك 10 Bonus Points', 'success');

    if (nu.referred_by) registerReferral(nu.referred_by);
    App.busy = false;
  } catch(e) {
    console.error(e); App.busy = false;
    showToast('خطأ: ' + e.message, 'error');
  }
}

var pendingLegacyUser = null;

async function loginExisting() {
  if (App.busy) return;
  var phone = $('loginPhone').value.trim();
  var password = $('loginPassword').value.trim();
  if (!phone || phone.length < 11) return showToast('اكتب رقم التليفون', 'error');
  if (!password) return showToast('اكتب كلمة السر', 'error');
  App.busy = true;
  try {
    var res = await supabaseClient.from('users').select('*').eq('phone', phone).maybeSingle();
    if (!res.data) { App.busy = false; return showToast('❌ الرقم مش مسجل', 'error'); }
    var user = res.data;
    if (!user.password) {
      App.busy = false;
      pendingLegacyUser = user;
      $('setPasswordModal').classList.add('active');
      return;
    }
    if (user.password !== password) { App.busy = false; return showToast('❌ كلمة السر غلط', 'error'); }
    loadUserFromDB(user); saveLocal(); enterGame();
    showToast('أهلاً بيك ' + user.username, 'success');
    App.busy = false;
  } catch(e) { App.busy = false; showToast('خطأ: ' + e.message, 'error'); }
}

async function saveNewPassword() {
  if (!pendingLegacyUser) return;
  var p1 = $('newPasswordInput').value.trim();
  var p2 = $('confirmPasswordInput').value.trim();
  if (p1.length < 6) return showToast('كلمة السر 6 أحرف على الأقل', 'error');
  if (p1 !== p2) return showToast('كلمتين السر مش متطابقتين', 'error');
  try {
    var res = await supabaseClient.from('users').update({ password: p1 }).eq('id', pendingLegacyUser.id);
    if (res.error) throw res.error;
    pendingLegacyUser.password = p1;
    loadUserFromDB(pendingLegacyUser);
    saveLocal(); closeModal('setPasswordModal'); enterGame();
    SoundSystem.playSuccess(); Vibration.onReward();
    showToast('✅ تم تحديد كلمة السر', 'success');
    pendingLegacyUser = null;
  } catch(e) { showToast('خطأ: ' + e.message, 'error'); }
}

function generateReferralCode(){
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', code = '';
  for(var i=0;i<6;i++) code += chars.charAt(Math.floor(Math.random()*chars.length));
  return code;
}

function loadUserFromDB(row){
  App.user = createDefaultUser();
  App.user.id = row.id; App.user.username = row.username;
  App.user.phone = row.phone; App.user.password = row.password || '';
  App.user.purchased = row.purchased || 0; App.user.earned = row.earned || 0;
  App.user.bonus_points = row.bonus_points || 0;
  App.user.level = row.level || 1;
  App.user.games_played = row.games_played || 0; App.user.wins = row.wins || 0;
  App.user.streak = row.streak || 0; App.user.bestStreak = row.best_streak || 0;
  App.user.tickets = row.tickets != null ? row.tickets : 0;
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
  App.user.referral_code = row.referral_code || generateReferralCode();
  App.user.wheel_spins_total = row.wheel_spins_total || 0;
  App.user.active_ticket = row.active_ticket || null;
  App.user.ticket_expires_at = row.ticket_expires_at || null;
  App.user.ticket_uses_left = row.ticket_uses_left || 0;
  saveLocal(); loadWallet();
}

function logoutUser() {
  if (!confirm('متأكد؟')) return;
  localStorage.removeItem(STORAGE_KEY);
  App.user = createDefaultUser();
  Wallet = { balance: 0, earned: 0, totalDeposited: 0, totalWon: 0, totalWithdrawn: 0 };
  $('mainScreen').classList.remove('active');
  $('loginScreen').classList.add('active');
  closeModal('profileModal');
  showToast('👋 تم تسجيل الخروج', 'info');
}

function enterGame(){
  $('loginScreen').classList.remove('active');
  $('mainScreen').classList.add('active');
  updateAllUI(); loadWallet();
  if(!App.user.adShown) $('welcomeAd').classList.remove('hidden');
}

function closeWelcomeAd(){ $('welcomeAd').classList.add('hidden'); App.user.adShown = true; saveLocal(); }

function updateAllUI(){
  if(!App.user || !App.user.username) return;
  $('userName').textContent = App.user.username;
  
  var cash = cashPoints();
  var bonus = bonusPoints();
  var el = $('userPoints');
  if (el) {
    if (bonus > 0) {
      el.textContent = cash + '💰' + bonus + '🎁';
    } else {
      el.textContent = cash;
    }
  }
  
  $('userLevel').textContent = CONFIG.LEVEL_NAMES[App.user.level] || 'مبتدئ';
  $('streakValue').textContent = App.user.streak;
  $('ticketValue').textContent = hasActiveTicket() ? '∞' : App.user.tickets;
  var av = $('userAvatar');
  if(av){
    av.textContent = App.user.username.charAt(0).toUpperCase();
    if(isPrime()) av.classList.add('prime'); else av.classList.remove('prime');
  }
  updateDailyLoginUI(); updateChestUI(); updateMissionsUI(); updateWalletUI(); updateMissionsDate();
}

function updateMissionsDate(){
  var el = $('missionsDate'); if (!el) return;
  var today = new Date();
  var days = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  el.textContent = '(' + days[today.getDay()] + ')';
}/* ============ MISSIONS ============ */
function getDefaultMissions(){
  var today = new Date();
  var seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  var pool = CONFIG.MISSION_POOL.slice();
  var shuffled = [];
  var rng = seed;
  while (pool.length > 0) {
    rng = (rng * 1103515245 + 12345) % 2147483648;
    var idx = rng % pool.length;
    shuffled.push(pool.splice(idx, 1)[0]);
  }
  var selected = shuffled.slice(0, 3);
  var missions = {};
  selected.forEach(function(m, i) {
    missions['m' + i] = { id: m.id, type: m.type, target: m.target, reward: m.reward, text: m.text, progress: 0, done: false };
  });
  return missions;
}

function updateMissionsUI(){
  var list = $('missionsList'); if(!list) return;
  var m = App.user.missions || getDefaultMissions();
  var html = '';
  Object.keys(m).forEach(function(key) {
    var mission = m[key];
    if (!mission) return;
    html += '<div class="mission-item ' + (mission.done ? 'done' : '') + '"><div class="mission-info"><strong>' + (mission.text || mission.id) + '</strong><span>' + mission.progress + '/' + mission.target + '</span></div><span class="mission-reward">+' + mission.reward + '🎁</span></div>';
  });
  if (!html) html = '<p class="small-text">مفيش مهام النهاردة</p>';
  list.innerHTML = html;
}

function updateMissionProgress(type, won, extra){
  if(!App.user.missions) App.user.missions = getDefaultMissions();
  var m = App.user.missions;
  var changed = false;
  Object.keys(m).forEach(function(key) {
    var mission = m[key];
    if (!mission || mission.done) return;
    var match = false;
    if (type === 'play' && mission.type === 'play') match = true;
    if (type === 'win' && won && mission.type === 'win') match = true;
    if (type === '1v1' && mission.type === '1v1') match = true;
    if (type === 'wheel' && mission.type === 'wheel') match = true;
    if (type === 'online' && mission.type === 'online') match = true;
    if (type === 'win_online' && won && mission.type === 'win_online') match = true;
    if (type === 'chest' && mission.type === 'chest') match = true;
    if (type === 'share' && mission.type === 'share') match = true;
    if (type === 'streak' && mission.type === 'streak' && App.user.streak >= mission.target) match = true;
    if (type === 'play' && mission.type.indexOf('category_') === 0 && extra === mission.type.replace('category_', '')) match = true;
    if (match) {
      mission.progress++;
      changed = true;
      if (mission.progress >= mission.target) {
        mission.done = true;
        addBonusPoints(mission.reward, 'mission_' + mission.id);
        SoundSystem.playReward(); Vibration.onReward();
        showCoinToast('+' + mission.reward + ' Bonus 🎁', '🎯');
      }
    }
  });
  if (changed) { saveLocal(); updateMissionsUI(); updateAllUI(); checkMilestones(); }
}

/* ============ DAILY ============ */
function updateDailyLoginUI(){
  var today = new Date().toDateString();
  var s = $('dailyLoginStatus'); if(!s) return;
  if(App.user.lastDailyLogin === today){ s.textContent = 'تم الاستلام اليوم'; $('dailyLoginBox').classList.add('claimed'); }
  else { s.textContent = 'اضغط لاستلامها'; $('dailyLoginBox').classList.remove('claimed'); }
  $('dailyStreakDisplay').textContent = 'يوم ' + (App.user.dailyLoginStreak + 1);
}

function claimDailyLogin(){
  if(!App.user.id) return;
  var today = new Date().toDateString();
  if(App.user.lastDailyLogin === today) return showToast('اخدت المكافأة النهاردة', 'error');
  App.user.dailyLoginStreak = Math.min(App.user.dailyLoginStreak + 1, 7);
  var idx = App.user.dailyLoginStreak - 1;
  var reward = CONFIG.DAILY_LOGIN_REWARDS[idx] || 30;
  if(isPrime()) reward *= 2;
  
  addBonusPoints(reward, 'daily_login');
  
  App.user.lastDailyLogin = today;
  saveLocal(); updateAllUI();
  SoundSystem.playReward(); Vibration.onReward();
  showCoinToast('+' + reward + ' Bonus 🎁', '📅');
  syncUser(); checkMilestones();
}

function updateChestUI(){
  var today = new Date().toDateString();
  var s = $('chestStatus'); if(!s) return;
  if(App.user.lastDailyChest === today){ s.textContent = 'تم فتحه اليوم'; $('dailyChest').classList.add('claimed'); }
  else { s.textContent = 'اضغط لفتحه'; $('dailyChest').classList.remove('claimed'); }
}

function claimDailyChest(){
  if(!App.user.id) return;
  var today = new Date().toDateString();
  if(App.user.lastDailyChest === today) return showToast('فتحت الصندوق النهاردة', 'error');
  var arr = CONFIG.DAILY_CHEST_REWARDS;
  var reward = arr[Math.floor(Math.random()*arr.length)];
  if(isPrime()) reward *= 2;
  
  addBonusPoints(reward, 'daily_chest');
  
  App.user.lastDailyChest = today;
  saveLocal(); updateAllUI();
  SoundSystem.playReward(); Vibration.onReward();
  updateMissionProgress('chest');
  showCoinToast('+' + reward + ' Bonus 🎁', '🎁');
  syncUser(); checkMilestones();
}

/* ============ STORAGE ============ */
function saveLocal(){ try{localStorage.setItem(STORAGE_KEY, JSON.stringify(App.user));}catch(e){} }

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
    if(App.user.username && App.user.password){
      setTimeout(function(){enterGame(); maybeShowSpecialOffer();},300);
    }
  }catch(e){localStorage.removeItem(STORAGE_KEY);}
}

/* ============ WALLET ============ */
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
    updateWalletUI(); return;
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
    var er = await supabaseClient.from('earnings').select('amount').eq('user_id', App.user.id).eq('transferred', false);
    if (er.data) Wallet.earned = er.data.reduce(function(s, e) { return s + parseFloat(e.amount || 0); }, 0);
    updateWalletUI();
  } catch(e) { console.error('loadWallet:', e); }
}

function saveWallet() {
  if (!App.user.id) return;
  try { localStorage.setItem(WALLET_KEY_PREFIX + App.user.id, JSON.stringify(Wallet)); } catch(e) {}
  updateWalletUI();
}

function updateWalletUI() {
  var b = $('walletBalance'); if (b) b.textContent = Wallet.balance.toFixed(2) + ' ج';
  var e = $('walletEarned'); if (e) e.textContent = Wallet.earned.toFixed(2) + ' ج';
  var w = $('withdrawBalance'); if (w) w.textContent = Wallet.balance.toFixed(2) + ' ج';
  var s = $('storeBalance'); if (s) { s.textContent = Wallet.balance.toFixed(2) + ' ج'; s.style.color = Wallet.balance > 0 ? '#00e676' : '#ef4444'; }
  var tsb = $('ticketStoreBalance'); if (tsb) tsb.textContent = Wallet.balance.toFixed(2) + ' ج';
  var tb = document.querySelector('.wallet-btn.transfer');
  if (tb) { tb.disabled = Wallet.earned <= 0; tb.style.opacity = Wallet.earned > 0 ? '1' : '0.5'; }
}

async function addEarning(amount, source) {
  if (amount <= 0) return;
  Wallet.earned += amount;
  saveWallet();
  if (supabaseClient && App.user.id && String(App.user.id).indexOf('local_') !== 0) {
    try { await supabaseClient.from('earnings').insert({ user_id: App.user.id, amount: amount, source: source || 'game', transferred: false }); } catch(e) {}
  }
  updateWalletUI();
  SoundSystem.playBigWin(); Vibration.onBigPrize();
  showWinOverlay('💰', '+' + amount.toFixed(2) + ' جنيه', 2500);
}

async function transferEarningsToWallet() {
  if (Wallet.earned <= 0) return showToast('مفيش مبلغ مكتسب', 'error');
  var amount = Wallet.earned;
  Wallet.balance += amount;
  Wallet.earned = 0;
  Wallet.totalWon = (Wallet.totalWon || 0) + amount;
  saveWallet();
  if (supabaseClient && App.user.id && String(App.user.id).indexOf('local_') !== 0) {
    try {
      await supabaseClient.from('wallets').upsert({ user_id: App.user.id, balance: Wallet.balance, total_won: Wallet.totalWon, updated_at: new Date().toISOString() });
      await supabaseClient.from('earnings').update({ transferred: true }).eq('user_id', App.user.id).eq('transferred', false);
    } catch(e) {}
  }
  SoundSystem.playBigWin(); Vibration.onBigPrize();
  showWinOverlay('💰', '+' + amount.toFixed(2) + ' ج', 2500);
  showToast('✅ تم تحويل ' + amount.toFixed(2) + ' ج', 'success');
  updateWalletUI();
}

async function deductFromWallet(amount) {
  if (Wallet.balance < amount) { showToast('رصيد المحفظة غير كافٍ', 'error'); return false; }
  Wallet.balance -= amount;
  saveWallet();
  if (supabaseClient && App.user.id && String(App.user.id).indexOf('local_') !== 0) {
    try { await supabaseClient.from('wallets').update({ balance: Wallet.balance, updated_at: new Date().toISOString() }).eq('user_id', App.user.id); } catch(e) {}
  }
  return true;
}

function syncUser(){
  if(!supabaseClient || !App.user.id) return;
  if(String(App.user.id).indexOf('local_') === 0) return;
  supabaseClient.from('users').update({
    purchased: App.user.purchased, earned: App.user.earned,
    bonus_points: App.user.bonus_points,
    level: App.user.level,
    games_played: App.user.games_played, wins: App.user.wins, streak: App.user.streak, best_streak: App.user.bestStreak,
    tickets: App.user.tickets, claimed_prizes: App.user.claimedPrizes,
    last_daily_chest: App.user.lastDailyChest, last_daily_login: App.user.lastDailyLogin,
    daily_login_streak: App.user.dailyLoginStreak, last_wheel_spin: App.user.lastWheelSpin,
    missions: App.user.missions, last_mission_date: App.user.lastMissionDate,
    ad_shown: App.user.adShown, is_prime: App.user.is_prime,
    prime_expires_at: App.user.prime_expires_at, multiplier_2x_expires_at: App.user.multiplier_2x_expires_at,
    peak_points: App.user.peak_points, claimed_milestones: App.user.claimed_milestones,
    wheel_spins_total: App.user.wheel_spins_total,
    active_ticket: App.user.active_ticket,
    ticket_expires_at: App.user.ticket_expires_at,
    ticket_uses_left: App.user.ticket_uses_left
  }).eq('id', App.user.id).then(function(res){ if(res.error) console.warn('Sync:', res.error); });
}

/* ============ BACKGROUND CANVAS ============ */
window.addEventListener('load', function(){
  startTriangleBackground();
  restoreSession();
  buildPrizeTables();
  checkDailyResets();
  regenTickets();
  setInterval(regenTickets, 60000);
  updateAllUI();
  var ph1 = $('signupPhone'); if(ph1) ph1.addEventListener('input', function(){this.value = this.value.replace(/\D/g,'');});
  var ph2 = $('loginPhone'); if(ph2) ph2.addEventListener('input', function(){this.value = this.value.replace(/\D/g,'');});
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

function checkDailyResets(){
  if(!App.user.id) return;
  var today = new Date().toDateString();
  if(App.user.lastMissionDate !== today){ App.user.missions = getDefaultMissions(); App.user.lastMissionDate = today; }
  if(App.user.lastDailyLogin){
    var last = new Date(App.user.lastDailyLogin);
    var diff = Math.floor((Date.now() - last.getTime())/86400000);
    if(diff > 1) App.user.dailyLoginStreak = 0;
  }
  if(App.user.last_share_date !== today){ App.user.share_points_today = 0; App.user.last_share_date = today; }
  if(App.user.ticket_expires_at && new Date(App.user.ticket_expires_at) < new Date()){
    App.user.active_ticket = null; App.user.ticket_expires_at = null; App.user.ticket_uses_left = 0;
  }
  saveLocal();
}

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
  if(hasActiveTicket() && App.user.ticket_uses_left > 0){
    App.user.ticket_uses_left--;
    if(App.user.ticket_uses_left <= 0){ App.user.active_ticket = null; App.user.ticket_expires_at = null; }
    saveLocal(); updateAllUI();
    return true;
  }
  if(App.user.tickets <= 0){ showToast('معندكش تذاكر!', 'error'); setTimeout(function(){ openTicketStore(); }, 1200); return false; }
  App.user.tickets--;
  saveLocal(); updateAllUI();
  return true;
}

function buildPrizeTables(){
  var html = '';
  for(var i=0;i<CONFIG.PRIZES.length;i++){
    var p = CONFIG.PRIZES[i];
    html += '<div class="prize-row"><span class="prize-points">'+p.threshold+' نقطة</span><span class="prize-money">'+p.money+' جنيه</span></div>';
  }
  var el = $('welcomePrizeTable'); if(el) el.innerHTML = html;
}

/* ============ UTILS ============ */
function closeModal(id){var m = $(id); if(m) m.classList.remove('active');}

function showToast(msg, type){
  var t = $('toast'); if(!t) return;
  var icons = {info:'ℹ️', success:'✅', error:'❌'};
  $('toastIcon').textContent = icons[type] || icons.info;
  $('toastText').textContent = msg;
  t.className = 'toast ' + (type||'info');
  setTimeout(function(){t.classList.add('show');},50);
  setTimeout(function(){t.classList.remove('show');},3200);
}

function showCoinToast(msg, icon){
  var t = $('coinToast'); if(!t) return;
  $('coinToastIcon').textContent = icon || '💰';
  $('coinToastText').textContent = msg;
  t.className = 'coin-toast';
  setTimeout(function(){t.classList.add('show');},50);
  setTimeout(function(){t.classList.remove('show');},2800);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    var el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
}

function showView(viewId){
  document.querySelectorAll('.view').forEach(function(v){v.classList.remove('active');});
  var v = $(viewId); if(v) v.classList.add('active');
  var nav = $('bottomNav');
  if(nav) nav.classList.toggle('hidden', viewId !== 'categoryView');
}

/* ============ OFFLINE GAME ============ */
function selectCategory(category){
  if(App.busy) return;
  if(!useTicket()) return;
  var needed = CONFIG.ENTRY_FEE + CONFIG.COMMISSION;
  if(!hasEnoughPoints(needed)){ showToast('رصيدك غير كافٍ','error'); return; }
  
  spendPoints(needed);
  
  App.room = {id:null,category:category,mode:'normal',code:null,correctChoice:null,status:'waiting'};
  showView('waitingView');
  $('waitingTitle').textContent = 'غرفة '+CATEGORIES[category].name;
  $('playersCount').textContent = '1';
  $('waitingHint').textContent = 'جاري البحث...';
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
  var needed = CONFIG.ENTRY_FEE + CONFIG.COMMISSION;
  if(!hasEnoughPoints(needed)){ showToast('رصيدك غير كافٍ','error'); return; }
  spendPoints(needed);
  
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
        spendPoints(CONFIG.TIMEOUT_PENALTY);
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
  
  App.user.games_played++;
  updateMissionProgress('play', false, App.room.category);
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
    updateMissionProgress('streak', false);
    checkLevelUp(); checkPrizes();
    showCoinToast('+'+(CONFIG.WIN_REWARD + bonus)+'💰','🏆');
    SoundSystem.playSuccess(); Vibration.onWin();
    showWinOverlay('🏆', 'مبروك! فزت', 1800);
  } else {
    App.user.streak = 0;
    App.user.lastLossAmount = cost;
    $('streakResult').textContent = '';
    $('lossRecoveryBtn').style.display = 'block';
    showCoinToast('-'+cost,'💸');
    SoundSystem.playLoss(); Vibration.onLoss();
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
  if(lvl > App.user.level){
    App.user.level = lvl;
    showToast('🎉 ترقيت! '+CONFIG.LEVEL_NAMES[lvl],'success');
    SoundSystem.playLevelUp(); Vibration.onWin();
    showWinOverlay('⭐', 'ترقية! ' + CONFIG.LEVEL_NAMES[lvl], 2000);
  }
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

function checkMilestones() {
  var peak = App.user.peak_points || 0;
  if (!App.user.claimed_milestones) App.user.claimed_milestones = [];
  for (var i = 0; i < CONFIG.MILESTONES.length; i++) {
    var m = CONFIG.MILESTONES[i];
    if (peak >= m.points && App.user.claimed_milestones.indexOf(m.points) === -1) {
      App.user.claimed_milestones.push(m.points);
      addEarning(m.money, 'milestone_' + m.points);
      SoundSystem.playBigWin(); Vibration.onBigPrize();
      showWinOverlay('🏆', 'وصلت ' + m.points + ' نقطة!', 2500);
      showToast('🏆 ربحت ' + m.money + ' جنيه!', 'success');
    }
  }
  saveLocal(); syncUser(); updateMilestonesUI();
}

function updateMilestonesUI() {
  var c = $('milestonesList'); if (!c) return;
  var peak = App.user.peak_points || 0;
  var claimed = App.user.claimed_milestones || [];
  var html = '';
  for (var i = 0; i < CONFIG.MILESTONES.length; i++) {
    var m = CONFIG.MILESTONES[i];
    var done = claimed.indexOf(m.points) !== -1;
    var avail = peak >= m.points;
    var prog = Math.min(100, Math.floor((peak / m.points) * 100));
    var st = done ? '<span class="ms-status done">✅ مُستلم</span>'
      : (avail ? '<span class="ms-status ready">🎁 متاح</span>' : '<span class="ms-status locked">🔒 ' + prog + '%</span>');
    html += '<div class="milestone-item ' + (done ? 'done' : avail ? 'ready' : '') + '">' +
      '<div class="ms-icon">' + (done ? '✅' : avail ? '🎁' : '🔒') + '</div>' +
      '<div class="ms-info"><div class="ms-points">' + m.points.toLocaleString() + ' نقطة</div>' +
      '<div class="ms-money">' + m.money + ' جنيه</div></div>' + st + '</div>';
  }
  c.innerHTML = html;
}

function openMilestonesModal() {
  updateMilestonesUI();
  var m = $('milestonesModal'); if (m) m.classList.add('active');
}

function openLossRecovery(){
  var amount = App.user.lastLossAmount || 14;
  $('lossRecoveryText').textContent = 'هترجعلك '+amount+' نقطة + '+CONFIG.LOSS_RECOVERY_BONUS+' إضافية مقابل '+CONFIG.LOSS_RECOVERY_COST+' جنيه';
  $('lossRecoveryModal').classList.add('active');
}

async function confirmLossRecovery(){
  var amount = App.user.lastLossAmount || 14;
  var price = CONFIG.LOSS_RECOVERY_COST;
  if(Wallet.balance < price){
    closeModal('lossRecoveryModal');
    return showToast('❌ محتاج '+price+' جنيه','error');
  }
  var ok = await deductFromWallet(price);
  if(!ok) return;
  addPoints(amount + CONFIG.LOSS_RECOVERY_BONUS);
  saveLocal(); updateAllUI(); syncUser();
  SoundSystem.playReward(); Vibration.onReward();
  showCoinToast('تم استرجاع '+(amount + CONFIG.LOSS_RECOVERY_BONUS)+' نقطة','✅');
  closeModal('lossRecoveryModal');
  $('lossRecoveryBtn').style.display = 'none';
  checkMilestones();
}

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
  if(App.room.status === 'waiting' && !isPrime()){ App.user.tickets = Math.min(CONFIG.MAX_TICKETS, App.user.tickets + 1); saveLocal(); updateAllUI(); }
  playAgain();
  showToast('غادرت الغرفة','info');
}/* ============================================
   LUCKY WHEEL v2 — جوائز جديدة + جاكبوت 25ج 💎
   ============================================ */

var WHEEL_PRIZES = [
  { value:1,  weight:22,   color:'#1a1010', text:'1 ج',  label:'1 جنيه',      tier:'common'    },
  { value:2,  weight:26,   color:'#2a1a1a', text:'2 ج',  label:'2 جنيه',      tier:'common'    },
  { value:3,  weight:25,   color:'#3a2424', text:'3 ج',  label:'3 جنيه',      tier:'common'    },
  { value:4,  weight:14,   color:'#e85a5a', text:'4 ج',  label:'4 جنيه',      tier:'rare'      },
  { value:5,  weight:9.5,  color:'#d44a4a', text:'5 ج',  label:'5 جنيه',      tier:'rare'      },
  { value:8,  weight:3,    color:'#f0b050', text:'8 ج',  label:'8 جنيه',      tier:'epic'      },
  { value:15, weight:0.48, color:'#ffd700', text:'15 ج', label:'15 جنيه ⭐',  tier:'legendary' },
  { value:25, weight:0.02, color:'#ff00ff', text:'25 ج', label:'25 جنيه 💎',  tier:'jackpot'   }
];

var wheelState = { spinning: false, currentAngle: 0 };

/* ---- رسم العجلة ---- */
function drawWheel(segs){
  var canvas = $('wheelCanvas'); if(!canvas) return;
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

    if (s.tier === 'jackpot') {
      ctx.save();
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,R,a1,a2); ctx.closePath();
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(a1 + arc/2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = (s.tier === 'jackpot' || s.tier === 'legendary') ? '#000' : '#fff';
    ctx.font = 'bold 28px "Cairo", sans-serif';
    ctx.fillText(s.text, R - 22, 0);
    ctx.restore();
  }

  ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.strokeStyle = 'rgba(220,70,70,0.6)'; ctx.lineWidth = 4; ctx.stroke();

  ctx.beginPath(); ctx.arc(cx,cy,R+6,0,Math.PI*2);
  ctx.strokeStyle = 'rgba(255,0,255,0.25)'; ctx.lineWidth = 2; ctx.stroke();
}

/* ---- اختيار الفائز ---- */
function pickWinnerSmart(){
  var spins = App.user.wheel_spins_total || 0;

  // هدية ترحيبية لأول لعبتين (2-5ج)
  if (spins < 2) {
    var giftValues = [2, 3, 4, 5];
    var gift = giftValues[Math.floor(Math.random() * giftValues.length)];
    var idx = 0;
    for (var k = 0; k < WHEEL_PRIZES.length; k++) {
      if (WHEEL_PRIZES[k].value === gift) { idx = k; break; }
    }
    return {
      index: idx,
      segment: {
        value: gift,
        color: WHEEL_PRIZES[idx].color,
        text: gift + ' ج',
        label: gift + ' جنيه',
        tier: WHEEL_PRIZES[idx].tier
      }
    };
  }

  var total = 0;
  for(var i=0;i<WHEEL_PRIZES.length;i++) total += WHEEL_PRIZES[i].weight;
  var r = Math.random() * total, acc = 0;
  for(var j=0;j<WHEEL_PRIZES.length;j++){
    acc += WHEEL_PRIZES[j].weight;
    if(r < acc) return {index:j, segment:WHEEL_PRIZES[j]};
  }
  return {index:0, segment:WHEEL_PRIZES[0]};
}

/* ---- فتح العجلة ---- */
function openLuckyWheel(){
  SoundSystem.init();
  var today = new Date().toDateString();
  var btn = $('spinBtn'), info = $('wheelInfo');
  if(App.user.lastWheelSpin === today){
    btn.textContent = 'لف العجلة ('+CONFIG.WHEEL_COST+' ج)';
    info.textContent = 'خلصت المرة المجانية';
  } else {
    btn.textContent = 'لف العجلة (مجاناً)';
    info.textContent = 'مرة واحدة مجاناً كل يوم';
  }
  btn.disabled = false;
  $('wheelResult').textContent = 'اضغط لف العجلة';
  drawWheel(WHEEL_PRIZES);
  buildWheelLegend();
  $('luckyWheelModal').classList.add('active');
}

/* ---- وسيلة الإيضاح ---- */
function buildWheelLegend(){
  var el = $('wheelLegend'); if(!el) return;
  var total = 0;
  for(var i=0;i<WHEEL_PRIZES.length;i++) total += WHEEL_PRIZES[i].weight;
  var html = '';
  for(var j=0;j<WHEEL_PRIZES.length;j++){
    var p = WHEEL_PRIZES[j];
    var pct = ((p.weight/total)*100).toFixed(2);
    var badge = p.tier === 'jackpot' ? ' 💎' : (p.tier === 'legendary' ? ' ⭐' : '');
    var style = p.tier === 'jackpot'
      ? 'border:2px solid #ff00ff;box-shadow:0 0 8px #ff00ff;'
      : '';
    html += '<div class="legend-item" style="'+style+'">'
         +  '<span class="legend-dot" style="background:'+p.color+';border:1px solid #fff"></span>'
         +  '<span>'+p.label+badge+' ('+pct+'%)</span>'
         +  '</div>';
  }
  el.innerHTML = html;
}

/* ---- اللفة ---- */
function spinWheel(){
  if(wheelState.spinning) return;
  SoundSystem.init();
  var today = new Date().toDateString();
  var isFree = App.user.lastWheelSpin !== today;
  var btn = $('spinBtn'), canvas = $('wheelCanvas');

  if(!isFree){
    if(Wallet.balance < CONFIG.WHEEL_COST){
      return showToast('محتاج '+CONFIG.WHEEL_COST+' جنيه في المحفظة','error');
    }
    deductFromWallet(CONFIG.WHEEL_COST);
  }

  wheelState.spinning = true;
  App.user.lastWheelSpin = today;
  App.user.wheel_spins_total = (App.user.wheel_spins_total || 0) + 1;
  btn.disabled = true;
  $('wheelResult').textContent = 'بلف...';

  var winner = pickWinnerSmart();
  var n = WHEEL_PRIZES.length;
  var segAngle = 360 / n;
  var centerAngle = winner.index * segAngle + segAngle / 2;
  var jitter = (Math.random() - 0.5) * (segAngle * 0.4);
  var targetAngle = 360 - centerAngle + jitter;
  var startAngle = wheelState.currentAngle;
  var delta = 5 * 360 + (targetAngle - (startAngle % 360));
  var duration = 5500;
  var startTime = performance.now();
  var lastTick = 0;

  function ease(t){ return 1 - Math.pow(1 - t, 4); }

  function animate(now){
    var p = Math.min((now - startTime)/duration, 1);
    var e = ease(p);
    var rot = startAngle + delta * e;
    canvas.style.transform = 'rotate(' + rot + 'deg)';

    var degPassed = Math.abs(rot - startAngle);
    var expectedTicks = (degPassed / segAngle) * 3;
    if (expectedTicks - lastTick >= 1) {
      SoundSystem.playTick();
      Vibration.vibrate(15);
      lastTick = Math.floor(expectedTicks);
    }

    if(p < 1) requestAnimationFrame(animate);
    else {
      wheelState.currentAngle = (startAngle + delta) % 360;
      finishSpin(winner.segment);
    }
  }
  requestAnimationFrame(animate);
}

/* ---- نهاية اللفة ---- */
function finishSpin(reward){
  var el = $('wheelResult');
  var val = reward.value;
  var tier = reward.tier || 'common';
  if(isPrime()) val *= 2;

  if(val > 0){
    addEarning(val, 'wheel');
    el.textContent = '🎉 كسبت ' + val + ' جنيه!';

    if (tier === 'jackpot') {
      triggerJackpotEffect(val);
    } else if (tier === 'legendary') {
      triggerLegendaryEffect(val);
    } else if (tier === 'epic') {
      SoundSystem.playBigWin();
      Vibration.onBigPrize();
      showWinOverlay('💎', '+' + val + ' جنيه', 2500);
      triggerGoldenFlash(1200);
    } else {
      SoundSystem.playReward();
      Vibration.onReward();
      showWinOverlay('🎉', '+' + val + ' ج', 1800);
    }
    showCoinToast('+' + val + ' ج', '🎡');
  } else {
    el.textContent = 'حظ أوفر 😢';
    SoundSystem.playLoss();
    Vibration.onLoss();
  }

  updateMissionProgress('wheel');
  saveLocal();
  updateAllUI();
  syncUser();
  $('spinBtn').disabled = false;
  $('spinBtn').textContent = 'لف العجلة ('+CONFIG.WHEEL_COST+' ج)';
  wheelState.spinning = false;
}

/* ============================================
   🎆 التأثيرات البصرية الخاصة
   ============================================ */

/* ---- فلاش ذهبي ---- */
function triggerGoldenFlash(duration){
  var flash = document.createElement('div');
  flash.className = 'golden-flash';
  document.body.appendChild(flash);
  setTimeout(function(){ flash.classList.add('show'); }, 20);
  setTimeout(function(){
    flash.classList.remove('show');
    setTimeout(function(){ flash.remove(); }, 500);
  }, duration || 1200);
}

/* ---- تأثير 15ج الأسطوري ⭐ ---- */
function triggerLegendaryEffect(val){
  SoundSystem.playBigWin();
  Vibration.vibrate([200, 100, 200, 100, 400]);
  triggerGoldenFlash(1800);
  showWinOverlay('⭐', '+' + val + ' جنيه!', 2800);
  showCoinToast('⭐ جائزة أسطورية! +' + val + ' ج', '⭐');
}

/* ---- تأثير 25ج الجاكبوت 💎 ---- */
function triggerJackpotEffect(val){
  playJackpotSound();

  document.body.classList.add('screen-shake');
  setTimeout(function(){ document.body.classList.remove('screen-shake'); }, 800);

  triggerGoldenFlash(2500);
  triggerConfetti(3500, 180);
  showJackpotOverlay(val);

  Vibration.vibrate([300, 100, 300, 100, 500, 100, 800, 100, 1000]);

  showCoinToast('💎 JACKPOT! +' + val + ' جنيه', '💎');

  setTimeout(function(){
    showToast('🎊 مبروووك! ربحت ' + val + ' جنيه!', 'success');
  }, 1000);
}

/* ---- صوت الجاكبوت (Fanfare + Bass + Sparkle) ---- */
function playJackpotSound(){
  if (!SoundSystem.ctx) return;
  var ctx = SoundSystem.ctx;
  var now = ctx.currentTime;

  var notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093];
  notes.forEach(function(freq, i) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = freq;
    var t = now + i * 0.08;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.75);
  });

  var bass = ctx.createOscillator();
  var bassGain = ctx.createGain();
  bass.type = 'sine';
  bass.frequency.setValueAtTime(80, now);
  bass.frequency.exponentialRampToValueAtTime(200, now + 1.2);
  bassGain.gain.setValueAtTime(0, now);
  bassGain.gain.linearRampToValueAtTime(0.3, now + 0.1);
  bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
  bass.connect(bassGain); bassGain.connect(ctx.destination);
  bass.start(now); bass.stop(now + 1.6);

  setTimeout(function() {
    var sparkle = ctx.createOscillator();
    var sg = ctx.createGain();
    sparkle.type = 'sine';
    sparkle.frequency.value = 3136;
    sg.gain.setValueAtTime(0.15, ctx.currentTime);
    sg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    sparkle.connect(sg); sg.connect(ctx.destination);
    sparkle.start(); sparkle.stop(ctx.currentTime + 1);
  }, 500);
}

/* ---- كونفيتي ديناميكي ---- */
function triggerConfetti(duration, count){
  var canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var particles = [];
  var colors = ['#ffd700', '#ff00ff', '#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf'];
  var startTime = Date.now();
  var totalCount = count || 100;

  for (var i = 0; i < totalCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 6,
      vy: 2 + Math.random() * 4,
      size: 6 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      shape: Math.random() > 0.5 ? 'rect' : 'circle'
    });
  }

  function draw(){
    var elapsed = Date.now() - startTime;
    if (elapsed > duration) {
      canvas.remove();
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.vx *= 0.99;
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size/2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ---- Overlay الجاكبوت ---- */
function showJackpotOverlay(val){
  var overlay = document.createElement('div');
  overlay.className = 'jackpot-overlay';
  overlay.innerHTML =
    '<div class="jackpot-inner">' +
      '<div class="jackpot-crown">👑</div>' +
      '<div class="jackpot-title">JACKPOT!</div>' +
      '<div class="jackpot-diamond">💎</div>' +
      '<div class="jackpot-amount">+' + val + ' جنيه</div>' +
      '<div class="jackpot-sub">جائزة نادرة جداً!</div>' +
    '</div>';
  document.body.appendChild(overlay);

  setTimeout(function(){ overlay.classList.add('show'); }, 50);

  setTimeout(function(){
    overlay.classList.remove('show');
    setTimeout(function(){ overlay.remove(); }, 700);
  }, 4500);
}

/* ============ TICKET STORE ============ */
var TICKETS = [
  {id:'daily',name:'تذكرة يومية',icon:'🎫',price:15,durationHours:24,uses:10,features:['10 مرات لعب في 24 ساعة','تدخل الغرف العادية','مفيش خصم من النقاط']},
  {id:'weekly',name:'تذكرة أسبوعية',icon:'🎫🎫',price:79,durationHours:24*7,uses:75,popular:true,features:['75 مرة لعب في 7 أيام','تدخل الغرف العادية + 1v1','خصم 10% على العجلة','شارة أسبوعية']},
  {id:'monthly',name:'تذكرة شهرية',icon:'🎫🎫🎫',price:199,durationHours:24*30,uses:400,features:['400 مرة لعب في 30 يوم','كل أنواع الغرف','خصم 15% على العجلة','شارة شهرية']},
  {id:'vip',name:'تذكرة VIP',icon:'💎',price:499,durationHours:24*30,uses:999999,features:['لعب غير محدود لمدة 30 يوم','كل أنواع الغرف + الأونلاين','لفة عجلة كل 8 ساعات','شعار VIP أزرق','خصم 20% على المشتريات']},
  {id:'legendary',name:'تذكرة أسطورية',icon:'👑',price:999,durationHours:24*90,uses:999999,legendary:true,features:['لعب غير محدود لمدة 90 يوم','كل الميزات مفتوحة','لفة عجلة كل 4 ساعات','شعار ذهبي أسطوري','كاش باك 5%','أولوية قصوى']}
];

function openTicketStore() { updateWalletUI(); renderTickets(); $('ticketStoreModal').classList.add('active'); }

function renderTickets() {
  var container = $('ticketsList'); if (!container) return;
  var hasTicket = hasActiveTicket();
  var remaining = 0, hoursLeft = 0;
  if (hasTicket) {
    remaining = App.user.ticket_uses_left;
    hoursLeft = Math.max(0, Math.ceil((new Date(App.user.ticket_expires_at) - new Date()) / 3600000));
  }
  var html = '';
  if (hasTicket) {
    var activeTicketInfo = TICKETS.find(function(t) { return t.id === App.user.active_ticket; });
    html += '<div class="ticket-owned"><span>✅ عندك ' + (activeTicketInfo ? activeTicketInfo.name : 'تذكرة') + '</span><span>' + remaining + ' استخدام • ' + hoursLeft + ' ساعة</span></div>';
  }
  TICKETS.forEach(function(t) {
    var cls = t.popular ? 'popular' : (t.legendary ? 'legendary' : '');
    var btnCls = t.popular ? 'popular-btn' : (t.legendary ? 'legendary-btn' : '');
    var featuresHtml = '';
    t.features.forEach(function(f) { featuresHtml += '<div><span>✓ ' + f + '</span></div>'; });
    html += '<div class="ticket-item ' + cls + '"><div class="ticket-header"><span class="ticket-icon">' + t.icon + '</span><span class="ticket-name">' + t.name + '</span><span class="ticket-price">' + t.price + ' ج</span></div><div class="ticket-details">' + featuresHtml + '</div><button type="button" class="ticket-buy-btn ' + btnCls + '" onclick="buyTicket(\'' + t.id + '\')">شراء الآن</button></div>';
  });
  container.innerHTML = html;
}

async function buyTicket(ticketId) {
  var ticket = TICKETS.find(function(t) { return t.id === ticketId; });
  if (!ticket) return;
  if (Wallet.balance < ticket.price) {
    showToast('❌ محتاج ' + (ticket.price - Wallet.balance).toFixed(2) + ' ج', 'error');
    setTimeout(function() { if (confirm('تروح للإيداع؟')) { closeModal('ticketStoreModal'); openDepositModal(); } }, 800);
    return;
  }
  if (!confirm('شراء ' + ticket.name + ' بـ ' + ticket.price + ' جنيه؟')) return;
  var ok = await deductFromWallet(ticket.price);
  if (!ok) return;
  App.user.active_ticket = ticket.id;
  App.user.ticket_expires_at = new Date(Date.now() + ticket.durationHours * 3600000).toISOString();
  App.user.ticket_uses_left = ticket.uses;
  saveLocal(); updateAllUI(); syncUser();
  SoundSystem.playBigWin(); Vibration.onBigPrize();
  showWinOverlay(ticket.icon, ticket.name + '!', 2500);
  showToast('✅ تم شراء ' + ticket.name, 'success');
  renderTickets();
}

/* ============ STORE ============ */
function openStore(){ updateWalletUI(); $('storeModal').classList.add('active'); }

async function buyPackage(points, price){
  if (Wallet.balance < price) {
    showToast('❌ محتاج ' + (price - Wallet.balance).toFixed(2) + ' ج', 'error');
    setTimeout(function(){ if (confirm('تروح للإيداع؟')){ closeModal('storeModal'); openDepositModal(); }}, 800);
    return;
  }
  if (!confirm('شراء ' + points + ' نقطة بـ ' + price + ' جنيه؟')) return;
  var ok = await deductFromWallet(price);
  if (!ok) return;
  addPoints(points);
  saveLocal(); updateAllUI(); syncUser(); checkMilestones();
  SoundSystem.playReward(); Vibration.onReward();
  showToast('✅ تم شراء ' + points + ' نقطة!', 'success');
  showCoinToast('+' + points + ' 💰', '💰');
  closeModal('storeModal');
}

async function buyPrime(){
  var price = CONFIG.PRIME_PRICE;
  if (Wallet.balance < price) {
    showToast('❌ محتاج ' + (price - Wallet.balance).toFixed(2) + ' ج', 'error');
    setTimeout(function(){ if (confirm('تروح للإيداع؟')){ closeModal('storeModal'); openDepositModal(); }}, 800);
    return;
  }
  if (!confirm('اشتراك البرايم 30 يوم بـ ' + price + ' جنيه؟')) return;
  var ok = await deductFromWallet(price);
  if (!ok) return;
  App.user.is_prime = true;
  App.user.prime_expires_at = new Date(Date.now() + CONFIG.PRIME_DAYS * 86400000).toISOString();
  App.user.tickets = CONFIG.MAX_TICKETS;
  saveLocal(); updateAllUI(); syncUser();
  SoundSystem.playBigWin(); Vibration.onBigPrize();
  showWinOverlay('👑', 'مبروك البرايم!', 3000);
  showToast('👑 برايم مفعّل!', 'success');
  closeModal('storeModal');
}

async function buyMultiplier(){
  var price = CONFIG.MULTIPLIER_PRICE;
  if (Wallet.balance < price) { showToast('❌ رصيدك غير كافي', 'error'); return; }
  if (!confirm('مضاعفة ×2 لمدة 24 ساعة بـ ' + price + ' جنيه؟')) return;
  var ok = await deductFromWallet(price);
  if (!ok) return;
  App.user.multiplier_2x_expires_at = new Date(Date.now() + CONFIG.MULTIPLIER_HOURS * 3600000).toISOString();
  saveLocal(); updateAllUI(); syncUser();
  SoundSystem.playReward(); Vibration.onReward();
  showToast('⚡ تم تفعيل المضاعفة', 'success');
  closeModal('storeModal');
}

/* ============ DEPOSIT / WITHDRAW ============ */
function openDepositModal() {
  var a = $('depositAmount'); if (a) a.value = '';
  var t = $('depositTrans'); if (t) t.value = '';
  closeModal('storeModal'); closeModal('ticketStoreModal'); closeModal('profileModal');
  var m = $('depositModal'); if (m) m.classList.add('active');
}

function openWithdrawModal() {
  var a = $('withdrawAmount'); if (a) a.value = '';
  var p = $('withdrawPhone'); if (p) p.value = App.user.phone || '';
  updateWalletUI();
  closeModal('profileModal');
  var m = $('withdrawModal'); if (m) m.classList.add('active');
}

async function submitDeposit() {
  var amount = parseFloat($('depositAmount').value);
  var trans = $('depositTrans').value.trim();
  if (!amount || amount < 10) return showToast('الحد الأدنى 10 جنيه', 'error');
  if (trans.length < 6) return showToast('رقم العملية قصير', 'error');
  var btn = document.querySelector('#depositModal .btn-neon');
  if (btn) { btn.disabled = true; btn.textContent = 'جاري الإرسال...'; }
  try {
    var res = await supabaseClient.from('deposit_requests').insert({ user_id: App.user.id, amount: amount, trans_number: trans, status: 'pending' });
    if (res.error) throw res.error;
    showToast('✅ تم إرسال الطلب', 'success');
    closeModal('depositModal');
  } catch(e) { showToast('خطأ: ' + e.message, 'error'); }
  if (btn) { btn.disabled = false; btn.textContent = 'إرسال طلب الإيداع'; }
}

async function submitWithdraw() {
  var amount = parseFloat($('withdrawAmount').value);
  var phone = $('withdrawPhone').value.trim();
  if (!amount || amount < CONFIG.MIN_WITHDRAW) return showToast('الحد الأدنى ' + CONFIG.MIN_WITHDRAW + ' جنيه', 'error');
  if (Wallet.balance < amount) return showToast('رصيد غير كافٍ', 'error');
  if (!phone || phone.length < 11) return showToast('رقم غير صحيح', 'error');
  var btn = document.querySelector('#withdrawModal .btn-neon');
  if (btn) { btn.disabled = true; btn.textContent = 'جاري الإرسال...'; }
  try {
    var res = await supabaseClient.from('withdraw_requests').insert({ user_id: App.user.id, amount: amount, phone: phone, status: 'pending' });
    if (res.error) throw res.error;
    showToast('✅ تم إرسال الطلب', 'success');
    closeModal('withdrawModal');
  } catch(e) { showToast('خطأ: ' + e.message, 'error'); }
  if (btn) { btn.disabled = false; btn.textContent = 'إرسال طلب السحب'; }
}

/* ============ PROFILE ============ */
function openProfile(){
  $('profileName').textContent = App.user.username;
  $('profilePhone').textContent = App.user.phone || '--';
  $('profilePurchased').textContent = App.user.purchased;
  $('profileEarned').textContent = App.user.earned;
  $('profileWins').textContent = App.user.wins;
  $('profileGames').textContent = App.user.games_played;
  $('profileLevel').textContent = CONFIG.LEVEL_NAMES[App.user.level];
  $('profileBestStreak').textContent = App.user.bestStreak;
  $('profileTickets').textContent = hasActiveTicket() ? '∞' : App.user.tickets;
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
  } else if(hasMultiplier()){
    var exp2 = new Date(App.user.multiplier_2x_expires_at);
    var hrs = Math.max(0, Math.ceil((exp2 - new Date())/3600000));
    ps.innerHTML = '<span class="badge-prime" style="background:linear-gradient(135deg,#00e676,#00a040)">⚡ ×2</span> <span style="color:#00e676;font-size:12px;">متبقي '+hrs+' ساعة</span>';
  } else {
    ps.innerHTML = '';
  }
  loadWallet();
  $('profileModal').classList.add('active');
}

/* ============ LEADERBOARD ============ */
function showLeaderboard(){
  var list = $('leaderboardList');
  list.innerHTML = '<p class="small-text">جاري التحميل...</p>';
  $('leaderboardModal').classList.add('active');
  if(!supabaseClient){ list.innerHTML = '<p class="small-text">Supabase غير متصل</p>'; return; }
  supabaseClient.from('users').select('username, purchased, earned, wins, is_prime').order('purchased', {ascending:false}).limit(20).then(function(res){
    if(res.error || !res.data || !res.data.length){ list.innerHTML = '<p class="small-text">لا يوجد لاعبين</p>'; return; }
    var html = '';
    for(var i=0;i<res.data.length;i++){
      var u = res.data[i];
      var total = (u.purchased||0) + (u.earned||0);
      var primeCls = u.is_prime ? 'prime-row' : '';
      html += '<div class="leaderboard-item ' + primeCls + '"><span class="rank">#'+(i+1)+'</span><span class="name">'+(u.is_prime ? '👑 ' : '')+u.username+'</span><span class="points">'+total+' 💰</span></div>';
    }
    list.innerHTML = html;
  });
}

/* ============ SPECIAL OFFER ============ */
function maybeShowSpecialOffer(){
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

function startOfferTimer(seconds){
  var el = $('offerTimer');
  var left = seconds;
  if (App.specialOfferTimeout) clearInterval(App.specialOfferTimeout);
  function update(){
    var m = Math.floor(left / 60);
    var s = left % 60;
    el.textContent = 'ينتهي خلال ' + m + ':' + (s < 10 ? '0' + s : s);
    if (left <= 0){ clearInterval(App.specialOfferTimeout); closeModal('specialOfferModal'); }
    left--;
  }
  update();
  App.specialOfferTimeout = setInterval(update, 1000);
}

async function acceptSpecialOffer(){
  closeModal('specialOfferModal');
  if (App.specialOfferTimeout) clearInterval(App.specialOfferTimeout);
  var price = 35, points = 300;
  if (Wallet.balance < price) { showToast('❌ محتاج ' + (price - Wallet.balance).toFixed(2) + ' ج', 'error'); openDepositModal(); return; }
  if (!confirm('300 نقطة بـ 35 جنيه؟')) return;
  var ok = await deductFromWallet(price);
  if (!ok) return;
  addPoints(points);
  saveLocal(); updateAllUI(); syncUser(); checkMilestones();
  SoundSystem.playReward(); Vibration.onReward();
  showToast('✅ تم شراء 300 نقطة', 'success');
  showCoinToast('+300 💰', '💰');
}

/* ============ FRIENDS ============ */
var Friends = { list: [], searchDebounce: null };

async function openFriendsModal() {
  $('friendsModal').classList.add('active');
  $('friendSearchInput').value = '';
  $('friendSearchResults').innerHTML = '';
  await loadFriendsList();
}

async function loadFriendsList() {
  var container = $('friendsList'); if (!container) return;
  container.innerHTML = '<p class="small-text">جاري التحميل...</p>';
  if (!supabaseClient || !App.user.id || String(App.user.id).indexOf('local_') === 0) {
    container.innerHTML = '<p class="small-text">محتاج Supabase</p>'; return;
  }
  try {
    var res = await supabaseClient.from('friendships').select('friend_id, status').eq('user_id', App.user.id).eq('status', 'accepted');
    if (res.error) throw res.error;
    if (!res.data || res.data.length === 0) { container.innerHTML = '<p class="small-text">مفيش أصدقاء لسه</p>'; Friends.list = []; return; }
    var friendIds = res.data.map(function(f) { return f.friend_id; });
    var usersRes = await supabaseClient.from('users').select('id, username, level, is_prime, last_seen').in('id', friendIds);
    if (usersRes.error) throw usersRes.error;
    Friends.list = usersRes.data || [];
    var html = '';
    Friends.list.forEach(function(u) {
      var isOnline = u.last_seen && (Date.now() - new Date(u.last_seen).getTime() < 5 * 60 * 1000);
      html += '<div class="friend-item"><div class="friend-avatar ' + (u.is_prime ? 'prime' : '') + '">' + (u.username.charAt(0) || '?').toUpperCase() + '<span class="status-dot ' + (isOnline ? 'online' : '') + '"></span></div><div class="friend-info"><div class="friend-name">' + u.username + ' ' + (u.is_prime ? '👑' : '') + '</div><div class="friend-status">' + (isOnline ? '🟢 متصل' : '⚫ غير متصل') + '</div></div><div class="friend-actions"><button type="button" class="friend-btn" onclick="removeFriend(\'' + u.id + '\')">إزالة</button></div></div>';
    });
    container.innerHTML = html;
  } catch(e) {
    console.error('loadFriends error:', e);
    container.innerHTML = '<p class="small-text">خطأ</p>';
  }
}

function searchFriends() {
  clearTimeout(Friends.searchDebounce);
  var q = $('friendSearchInput').value.trim();
  var container = $('friendSearchResults');
  if (!q || q.length < 2) { container.innerHTML = ''; return; }
  Friends.searchDebounce = setTimeout(async function() {
    if (!supabaseClient || !App.user.id) return;
    try {
      var res = await supabaseClient.from('users').select('id, username, phone, level, is_prime').or('username.ilike.%' + q + '%,phone.ilike.%' + q + '%').neq('id', App.user.id).limit(10);
      if (res.error) throw res.error;
      if (!res.data || res.data.length === 0) { container.innerHTML = '<p class="small-text">مفيش نتائج</p>'; return; }
      var html = '';
      res.data.forEach(function(u) {
        var alreadyFriend = Friends.list.some(function(f){ return f.id === u.id; });
        html += '<div class="friend-item"><div class="friend-avatar ' + (u.is_prime ? 'prime' : '') + '">' + (u.username.charAt(0) || '?').toUpperCase() + '</div><div class="friend-info"><div class="friend-name">' + u.username + ' ' + (u.is_prime ? '👑' : '') + '</div><div class="friend-status">المستوى ' + (u.level || 1) + '</div></div><div class="friend-actions">' + (alreadyFriend ? '<button type="button" class="friend-btn" disabled>✓ صديق</button>' : '<button type="button" class="friend-btn invite" onclick="sendFriendRequest(\'' + u.id + '\')">➕ إضافة</button>') + '</div></div>';
      });
      container.innerHTML = html;
    } catch(e) { console.error(e); }
  }, 400);
}

async function sendFriendRequest(friendId) {
  if (!supabaseClient || !App.user.id) return;
  try {
    var res = await supabaseClient.from('friendships').insert({ user_id: App.user.id, friend_id: friendId, status: 'accepted' });
    if (res.error) throw res.error;
    addBonusPoints(15, 'friend_added');
    saveLocal(); updateAllUI(); syncUser();
    SoundSystem.playReward(); Vibration.onReward();
    showToast('✅ تم إضافة الصديق (+15 Bonus)', 'success');
    showCoinToast('+15 Bonus 🎁', '👥');
    await loadFriendsList();
  } catch(e) { showToast('خطأ: ' + e.message, 'error'); }
}

async function removeFriend(friendId) {
  if (!supabaseClient || !App.user.id) return;
  if (!confirm('إزالة الصديق؟')) return;
  try {
    await supabaseClient.from('friendships').delete().eq('user_id', App.user.id).eq('friend_id', friendId);
    await supabaseClient.from('friendships').delete().eq('user_id', friendId).eq('friend_id', App.user.id);
    showToast('تم إزالة الصديق', 'success');
    await loadFriendsList();
  } catch(e) { showToast('خطأ: ' + e.message, 'error'); }
}

/* ============ SHARE ============ */
function openShareModal() {
  var today = new Date().toDateString();
  if (App.user.last_share_date !== today) { App.user.share_points_today = 0; App.user.last_share_date = today; saveLocal(); }
  var url = window.location.origin + '?ref=' + (App.user.referral_code || '');
  var el = $('shareUrl'); if (el) el.textContent = url;
  var pt = $('sharePointsToday');
  if (pt) pt.textContent = (App.user.share_points_today || 0) + ' / ' + CONFIG.SHARE_DAILY_LIMIT;
  $('shareModal').classList.add('active');
}

function getShareUrl() { return window.location.origin + '?ref=' + (App.user.referral_code || ''); }

function copyShareLink() {
  var url = getShareUrl();
  var text = '🎮 العب معايا Neon Prediction!\n\n' + url;
  if (navigator.clipboard) { navigator.clipboard.writeText(text).then(function() { showToast('✅ تم النسخ!', 'success'); awardSharePoints(); }); }
}

function shareWhatsApp() {
  var url = getShareUrl();
  window.open('https://wa.me/?text=' + encodeURIComponent('🎮 العب معايا Neon Prediction!\n\n' + url), '_blank');
  awardSharePoints();
}

function shareTelegram() {
  var url = getShareUrl();
  window.open('https://t.me/share/url?url=' + encodeURIComponent(url), '_blank');
  awardSharePoints();
}

function nativeShare() {
  var url = getShareUrl();
  if (navigator.share) { navigator.share({ title: 'Neon Prediction', text: '🎮 العب معايا!', url: url }).then(function() { awardSharePoints(); }).catch(function() {}); }
  else { copyShareLink(); }
}

function awardSharePoints() {
  var today = new Date().toDateString();
  if (App.user.last_share_date !== today) { App.user.share_points_today = 0; App.user.last_share_date = today; }
  if ((App.user.share_points_today || 0) >= CONFIG.SHARE_DAILY_LIMIT) { showToast('خلصت نقاط المشاركة النهاردة', 'info'); return; }
  App.user.share_points_today = (App.user.share_points_today || 0) + CONFIG.SHARE_REWARD;
  
  addBonusPoints(CONFIG.SHARE_REWARD, 'share');
  
  saveLocal(); updateAllUI(); syncUser();
  updateMissionProgress('share');
  SoundSystem.playReward(); Vibration.onReward();
  showCoinToast('+' + CONFIG.SHARE_REWARD + ' Bonus 🎁', '📢');
  var pt = $('sharePointsToday');
  if (pt) pt.textContent = App.user.share_points_today + ' / ' + CONFIG.SHARE_DAILY_LIMIT;
  checkMilestones();
}

async function registerReferral(refCode) {
  if (!refCode || !supabaseClient || !App.user.id) return;
  if (String(App.user.id).indexOf('local_') === 0) return;
  try {
    var res = await supabaseClient.from('users').select('id').eq('referral_code', refCode).maybeSingle();
    if (!res.data || res.data.id === App.user.id) return;
    await supabaseClient.from('earnings').insert({ user_id: res.data.id, amount: 5, source: 'referral_' + App.user.id, transferred: false });
    await supabaseClient.from('users').update({ referred_by: refCode }).eq('id', App.user.id);
  } catch(e) { console.error('registerReferral:', e); }
}

/* ============================================
   ONLINE GAME
   ============================================ */
var Online = {
  room: null, players: [], answers: [], roundData: null,
  myChoice: null, myAnswerTime: 0, roundStartTime: 0,
  timer: null, channel: null, pollInterval: null, roundPollInterval: null,
  isHost: false,
  currentRound: 0, isReady: false, playing: false,
  maxPlayers: 3, choiceTime: 10, category: 'football', privacy: 'public'
};

var RoomSettings = {
  maxPlayers: 3,
  choiceTime: 10,
  category: 'football',
  privacy: 'public'
};

function openOnlineLobby() { showView('onlineLobbyView'); }

async function openPublicRooms() {
  showView('publicRoomsView');
  var list = $('publicRoomsList');
  list.innerHTML = '<p class="small-text" style="text-align:center">جاري التحميل...</p>';
  try {
    var res = await supabaseClient.from('online_rooms').select('*').eq('status', 'waiting').eq('privacy', 'public').order('created_at', { ascending: false }).limit(20);
    if (res.error) throw res.error;
    if (!res.data || res.data.length === 0) { list.innerHTML = '<p class="small-text" style="text-align:center">مفيش غرف عامة دلوقتي</p>'; return; }
    var html = '';
    res.data.forEach(function(r) {
      html += '<div class="package-item" onclick="joinPublicRoom(\'' + r.id + '\')" style="cursor:pointer"><span class="pkg-icon">🌐</span><div class="pkg-info"><span class="pkg-points">غرفة ' + r.code + '</span><span class="pkg-price">' + (CATEGORIES[r.category] ? CATEGORIES[r.category].name : 'كرة القدم') + ' • ' + r.max_players + ' لاعبين</span><span class="pkg-details">⏱️ ' + r.choice_time + ' ثواني</span></div><span style="color:#00c853;font-weight:900">دخول →</span></div>';
    });
    list.innerHTML = html;
  } catch(e) { console.error(e); list.innerHTML = '<p class="small-text" style="text-align:center">خطأ</p>'; }
}

async function joinPublicRoom(roomId) {
  if (!supabaseClient || !App.user.id) return;
  if (totalPoints() < CONFIG.ONLINE_ENTRY) { showToast('محتاج ' + CONFIG.ONLINE_ENTRY + ' نقطة', 'error'); return; }
  try {
    var r = await supabaseClient.from('online_rooms').select('*').eq('id', roomId).maybeSingle();
    if (!r.data) return showToast('الغرفة مش موجودة', 'error');
    if (r.data.status !== 'waiting') return showToast('الغرفة بدأت خلاص', 'error');
    var playersRes = await supabaseClient.from('room_players').select('id').eq('room_id', roomId);
    if (playersRes.data && playersRes.data.length >= r.data.max_players) return showToast('الغرفة مليانة', 'error');
    spendPoints(CONFIG.ONLINE_ENTRY);
    saveLocal(); updateAllUI();
    Online.room = r.data;
    Online.isHost = false;
    Online.isReady = false;
    Online.maxPlayers = r.data.max_players;
    Online.choiceTime = r.data.choice_time;
    Online.category = r.data.category;
    Online.currentRound = 0;
    await supabaseClient.from('room_players').insert({ room_id: r.data.id, user_id: App.user.id, username: App.user.username, is_host: false, is_ready: false, score: 0 });
    subscribeToRoom(r.data.id);
    enterOnlineRoomView(r.data.code);
    showToast('✅ انضممت للغرفة!', 'success');
  } catch(e) { console.error(e); showToast('خطأ: ' + e.message, 'error'); }
}

function openCreateRoomModal() {
  RoomSettings.maxPlayers = 3;
  RoomSettings.choiceTime = 10;
  RoomSettings.category = 'football';
  RoomSettings.privacy = 'public';
  var groups = document.querySelectorAll('#createRoomModal .setting-group');
  if (groups[0]) groups[0].querySelectorAll('.setting-option').forEach(function(b, i) { b.classList.toggle('active', [2,3,5][i] === 3); });
  if (groups[1]) groups[1].querySelectorAll('.setting-option').forEach(function(b, i) { b.classList.toggle('active', [5,10,15,20][i] === 10); });
  if (groups[2]) groups[2].querySelectorAll('.setting-option').forEach(function(b, i) { b.classList.toggle('active', ['football','fruits','animals','colors'][i] === 'football'); });
  if (groups[3]) groups[3].querySelectorAll('.setting-option').forEach(function(b, i) { b.classList.toggle('active', ['public','private'][i] === 'public'); });
  $('createRoomModal').classList.add('active');
}

function setRoomPlayers(n) {
  RoomSettings.maxPlayers = n;
  var groups = document.querySelectorAll('#createRoomModal .setting-group');
  if (groups[0]) groups[0].querySelectorAll('.setting-option').forEach(function(b, i) { b.classList.toggle('active', [2,3,5][i] === n); });
}

function setRoomTime(t) {
  RoomSettings.choiceTime = t;
  var groups = document.querySelectorAll('#createRoomModal .setting-group');
  if (groups[1]) groups[1].querySelectorAll('.setting-option').forEach(function(b, i) { b.classList.toggle('active', [5,10,15,20][i] === t); });
}

function setRoomCategory(c) {
  RoomSettings.category = c;
  var groups = document.querySelectorAll('#createRoomModal .setting-group');
  if (groups[2]) groups[2].querySelectorAll('.setting-option').forEach(function(b, i) { b.classList.toggle('active', ['football','fruits','animals','colors'][i] === c); });
}

function setRoomPrivacy(p) {
  RoomSettings.privacy = p;
  var groups = document.querySelectorAll('#createRoomModal .setting-group');
  if (groups[3]) groups[3].querySelectorAll('.setting-option').forEach(function(b, i) { b.classList.toggle('active', ['public','private'][i] === p); });
}

async function createOnlineRoomWithSettings() {
  closeModal('createRoomModal');
  if (!supabaseClient || !App.user.id) { showToast('محتاج Supabase', 'error'); return; }
  if (String(App.user.id).indexOf('local_') === 0) { showToast('سجّل من جديد', 'error'); return; }
  if (totalPoints() < CONFIG.ONLINE_ENTRY) { showToast('محتاج ' + CONFIG.ONLINE_ENTRY + ' نقطة', 'error'); return; }
  spendPoints(CONFIG.ONLINE_ENTRY);
  saveLocal(); updateAllUI();
  try {
    var code = generateRoomCode();
    var res = await supabaseClient.from('online_rooms').insert({
      code: code, host_id: App.user.id, category: RoomSettings.category,
      status: 'waiting', max_players: RoomSettings.maxPlayers,
      choice_time: RoomSettings.choiceTime, privacy: RoomSettings.privacy,
      entry_fee: CONFIG.ONLINE_ENTRY
    }).select().single();
    if (res.error) throw res.error;
    Online.room = res.data;
    Online.isHost = true;
    Online.isReady = true;
    Online.maxPlayers = RoomSettings.maxPlayers;
    Online.choiceTime = RoomSettings.choiceTime;
    Online.category = RoomSettings.category;
    Online.currentRound = 0;
    await supabaseClient.from('room_players').insert({
      room_id: res.data.id, user_id: App.user.id,
      username: App.user.username, is_host: true, is_ready: true, score: 0
    });
    subscribeToRoom(res.data.id);
    enterOnlineRoomView(code);
  } catch(e) {
    console.error('createOnlineRoom error:', e);
    addPoints(CONFIG.ONLINE_ENTRY);
    saveLocal(); updateAllUI();
    showToast('خطأ: ' + e.message, 'error');
  }
}

function openJoinOnlineModal() { $('joinOnlineCodeInput').value = ''; $('joinOnlineModal').classList.add('active'); }

async function joinOnlineRoom() {
  var code = $('joinOnlineCodeInput').value.trim().toUpperCase();
  if (code.length !== 6) return showToast('الكود 6 حروف', 'error');
  if (!supabaseClient || !App.user.id) return;
  if (totalPoints() < CONFIG.ONLINE_ENTRY) { showToast('محتاج ' + CONFIG.ONLINE_ENTRY + ' نقطة', 'error'); return; }
  try {
    var res = await supabaseClient.from('online_rooms').select('*').eq('code', code).eq('status', 'waiting').maybeSingle();
    if (!res.data) return showToast('مفيش غرفة بالكود ده', 'error');
    var playersRes = await supabaseClient.from('room_players').select('id').eq('room_id', res.data.id);
    if (playersRes.data && playersRes.data.length >= res.data.max_players) return showToast('الغرفة مليانة', 'error');
    spendPoints(CONFIG.ONLINE_ENTRY);
    saveLocal(); updateAllUI();
    Online.room = res.data;
    Online.isHost = false;
    Online.isReady = false;
    Online.maxPlayers = res.data.max_players;
    Online.choiceTime = res.data.choice_time;
    Online.category = res.data.category;
    Online.currentRound = 0;
    await supabaseClient.from('room_players').insert({ room_id: res.data.id, user_id: App.user.id, username: App.user.username, is_host: false, is_ready: false, score: 0 });
    closeModal('joinOnlineModal');
    subscribeToRoom(res.data.id);
    enterOnlineRoomView(code);
    showToast('✅ انضممت للغرفة!', 'success');
  } catch(e) { console.error(e); addPoints(CONFIG.ONLINE_ENTRY); saveLocal(); updateAllUI(); showToast('خطأ: ' + e.message, 'error'); }
}

function enterOnlineRoomView(code) {
  showView('onlineRoomView');
  $('onlineRoomTitle').textContent = 'غرفة ' + code;
  $('onlineRoomCode').style.display = 'block';
  $('onlineRoomCode').textContent = 'الكود: ' + code;
  $('onlineMaxPlayers').textContent = Online.maxPlayers;
  var slots = ['oslot1','oslot2','oslot3','oslot4','oslot5'];
  for (var i = 0; i < 5; i++) {
    var el = $(slots[i]);
    if (el) el.style.display = (i < Online.maxPlayers) ? 'flex' : 'none';
  }
  refreshOnlinePlayers();
}

function generateRoomCode(){
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', code = '';
  for(var i=0;i<6;i++) code += chars.charAt(Math.floor(Math.random()*chars.length));
  return code;
}

function subscribeToRoom(roomId) {
  if (Online.channel) {
    try { supabaseClient.removeChannel(Online.channel); } catch(e) {}
  }

  Online.channel = supabaseClient
    .channel('room_' + roomId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: 'room_id=eq.' + roomId }, function(payload) {
      console.log('📢 Player change:', payload.eventType);
      refreshOnlinePlayers();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_rounds', filter: 'room_id=eq.' + roomId }, function(payload) {
      console.log('📢 Round change:', payload.new);
      if (payload.new && payload.new.round_number && payload.new.round_number !== Online.currentRound) {
        startOnlineRound(payload.new);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_answers', filter: 'room_id=eq.' + roomId }, function(payload) {
      refreshOnlineAnswers();
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'online_rooms', filter: 'id=eq.' + roomId }, function(payload) {
      console.log('📢 Room update:', payload.new.status);
      if (payload.new.status === 'playing' && !Online.playing) startOnlineGame();
    })
    .subscribe(function(status) {
      console.log('📡 Realtime status:', status);
    });

  if (Online.pollInterval) clearInterval(Online.pollInterval);
  Online.pollInterval = setInterval(function() {
    if (!Online.room) return;
    if (Online.room.status === 'waiting') refreshOnlinePlayers();
    if (!Online.playing) {
      supabaseClient.from('online_rooms').select('status').eq('id', Online.room.id).maybeSingle().then(function(r) {
        if (r.data && r.data.status === 'playing' && !Online.playing) {
          console.log('🎮 Polling: Room playing');
          startOnlineGame();
        }
      });
    }
  }, 2000);

  if (Online.roundPollInterval) clearInterval(Online.roundPollInterval);
  Online.roundPollInterval = setInterval(function() {
    if (!Online.playing || !Online.room) return;
    supabaseClient.from('room_rounds')
      .select('*')
      .eq('room_id', Online.room.id)
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(function(r) {
        if (r.data && r.data.round_number > 0 && r.data.round_number !== Online.currentRound) {
          console.log('🎯 Polling: New round:', r.data.round_number);
          startOnlineRound(r.data);
        }
      });
  }, 2000);
}

async function refreshOnlinePlayers() {
  if (!Online.room) return;
  try {
    var res = await supabaseClient.from('room_players').select('*').eq('room_id', Online.room.id).order('joined_at', { ascending: true });
    if (res.error) return;
    if (res.data) {
      Online.players = res.data;
      console.log('👥 Players:', res.data.length);
      updateOnlineRoomPlayers();
      checkAllReady();
    }
  } catch(e) { console.error(e); }
}

function updateOnlineRoomPlayers() {
  var slots = ['oslot1', 'oslot2', 'oslot3', 'oslot4', 'oslot5'];
  for (var i = 0; i < slots.length; i++) {
    var el = $(slots[i]); if (!el) continue;
    el.classList.remove('filled', 'prime-slot');
    el.innerHTML = '';
  }
  for (var j = 0; j < Online.players.length && j < 5; j++) {
    var p = Online.players[j];
    var el = $(slots[j]);
    if (el) {
      el.classList.add('filled');
      (function(el, userId) {
        supabaseClient.from('users').select('is_prime').eq('id', userId).maybeSingle().then(function(r) {
          if (r.data && r.data.is_prime) el.classList.add('prime-slot');
        });
      })(el, p.user_id);
      el.innerHTML = (p.username.charAt(0) || '?').toUpperCase() + '<span class="slot-name">' + p.username + (p.is_ready ? ' ✋' : '') + '</span>';
    }
  }
  $('onlinePlayersCount').textContent = Online.players.length;
  if (Online.players.length >= 2) $('onlineWaitingHint').textContent = 'الجميع جاهز؟ اضغط "جاهز"';
}

async function toggleReady() {
  if (!Online.room) return;
  Online.isReady = !Online.isReady;
  var btn = $('readyBtn');
  if (Online.isReady) { btn.textContent = '✓ جاهز'; btn.classList.add('ready'); }
  else { btn.textContent = '✋ جاهز'; btn.classList.remove('ready'); }
  try {
    var res = await supabaseClient.from('room_players').update({ is_ready: Online.isReady }).eq('room_id', Online.room.id).eq('user_id', App.user.id);
    if (res.error) { console.error('toggleReady error:', res.error); return; }
    setTimeout(function() { refreshOnlinePlayers(); }, 300);
  } catch(e) { console.error(e); }
}

async function checkAllReady() {
  if (!Online.room) return;
  if (Online.room.status !== 'waiting') return;
  if (Online.players.length < 2) return;
  var allReady = Online.players.every(function(p) { return p.is_ready === true; });
  if (!allReady) return;
  try {
    var res = await supabaseClient.from('online_rooms').update({ status: 'playing', started_at: new Date().toISOString() }).eq('id', Online.room.id).eq('status', 'waiting');
    if (res.error) console.error('Start error:', res.error);
  } catch(e) { console.error(e); }
}

async function startOnlineGame() {
  if (Online.playing) return;
  Online.playing = true;
  Online.currentRound = 0;
  showView('onlineGameView');
  updateOnlineScores();
  setTimeout(function() {
    if (Online.isHost) nextOnlineRound();
  }, 1000);
}

async function nextOnlineRound() {
  Online.currentRound++;
  if (Online.currentRound > CONFIG.ONLINE_ROUNDS) {
    endOnlineGame();
    return;
  }
  if (!Online.isHost) return;
  var correct = Math.floor(Math.random() * 5) + 1;
  try {
    var res = await supabaseClient.from('room_rounds').insert({
      room_id: Online.room.id, round_number: Online.currentRound,
      correct_choice: correct, started_at: new Date().toISOString()
    }).select().single();
    if (res.error) {
      setTimeout(function() { Online.currentRound--; nextOnlineRound(); }, 1500);
      return;
    }
    startOnlineRound(res.data);
  } catch(e) { console.error('nextOnlineRound catch:', e); }
}

function startOnlineRound(round) {
  if (Online.roundData && Online.roundData.id === round.id && Online.currentRound === round.round_number) return;
  Online.roundData = round;
  Online.currentRound = round.round_number;
  Online.myChoice = null;
  Online.myAnswerTime = 0;
  Online.roundStartTime = Date.now();
  $('onlineRoundNum').textContent = round.round_number;
  var cat = CATEGORIES[Online.category] || CATEGORIES.football;
  var grid = $('onlineChoicesGrid');
  if (!grid) return;
  grid.innerHTML = '';
  cat.choices.forEach(function(c, i) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice-btn';
    btn.innerHTML = '<span class="choice-num">' + (i+1) + '</span><span>' + c + '</span>';
    btn.onclick = function() { makeOnlineChoice(i+1); };
    grid.appendChild(btn);
  });
  startOnlineTimer();
  refreshOnlineAnswers();
}

function startOnlineTimer() {
  if (Online.timer) clearInterval(Online.timer);
  var timeLeft = Online.choiceTime;
  $('onlineTimerValue').textContent = timeLeft;
  $('onlineTimerValue').classList.remove('danger');
  Online.timer = setInterval(function() {
    timeLeft--;
    $('onlineTimerValue').textContent = timeLeft;
    if (timeLeft <= 3) $('onlineTimerValue').classList.add('danger');
    if (timeLeft <= 0) {
      clearInterval(Online.timer);
      finishOnlineRound(Online.roundData);
    }
  }, 1000);
}

async function makeOnlineChoice(num) {
  if (Online.myChoice !== null) return;
  if (!Online.roundData) return;
  Online.myChoice = num;
  Online.myAnswerTime = Date.now() - Online.roundStartTime;
  var btns = document.querySelectorAll('#onlineChoicesGrid .choice-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].disabled = true;
    if (i + 1 === num) btns[i].classList.add('selected');
  }
  try {
    var isCorrect = num === Online.roundData.correct_choice;
    var points = 0;
    if (isCorrect) {
      var timeSec = Online.myAnswerTime / 1000;
      points = Math.max(50, Math.floor(100 - (timeSec * 4)));
    }
    await supabaseClient.from('room_answers').insert({
      room_id: Online.room.id, round_number: Online.currentRound,
      user_id: App.user.id, username: App.user.username,
      choice: num, answer_time: Online.myAnswerTime,
      is_correct: isCorrect, points_earned: points
    });
    if (isCorrect) {
      var newScore = getMyNewScore(points);
      await supabaseClient.from('room_players').update({ score: newScore }).eq('room_id', Online.room.id).eq('user_id', App.user.id);
    }
  } catch(e) { console.error(e); }
}

function getMyNewScore(addedPoints) {
  for (var i = 0; i < Online.players.length; i++) {
    if (Online.players[i].user_id === App.user.id) return (Online.players[i].score || 0) + addedPoints;
  }
  return addedPoints;
}

async function refreshOnlineAnswers() {
  if (!Online.room || !Online.roundData) return;
  try {
    var res = await supabaseClient.from('room_answers').select('*').eq('room_id', Online.room.id).eq('round_number', Online.currentRound);
    if (res.data) { Online.answers = res.data; updateOnlineScores(); }
  } catch(e) { console.error(e); }
}

function updateOnlineScores() {
  var container = $('onlineScores'); if (!container) return;
  var sorted = Online.players.slice().sort(function(a, b) { return (b.score || 0) - (a.score || 0); });
  var html = '';
  for (var i = 0; i < sorted.length; i++) {
    var p = sorted[i];
    var isMe = p.user_id === App.user.id;
    var answer = Online.answers.find(function(a){ return a.user_id === p.user_id; });
    var cls = '';
    if (answer) cls = answer.is_correct ? 'correct' : 'wrong';
    html += '<div class="online-score-row ' + (isMe ? 'me ' : '') + cls + '"><span class="online-score-rank">#' + (i+1) + '</span><span class="online-score-name">' + p.username + (isMe ? ' (أنت)' : '') + '</span><span class="online-score-points">' + (p.score || 0) + '</span></div>';
  }
  container.innerHTML = html;
}

async function finishOnlineRound(round) {
  if (Online.timer) clearInterval(Online.timer);
  var btns = document.querySelectorAll('#onlineChoicesGrid .choice-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].disabled = true;
    if (i + 1 === round.correct_choice) btns[i].classList.add('correct');
    else if (i + 1 === Online.myChoice) btns[i].classList.add('wrong');
  }
  if (Online.myChoice === round.correct_choice) { SoundSystem.playSuccess(); Vibration.onWin(); }
  else { SoundSystem.playLoss(); Vibration.onLoss(); }
  await refreshOnlineAnswers();
  setTimeout(function() {
    if (Online.isHost) nextOnlineRound();
  }, 2000);
}

async function endOnlineGame() {
  Online.playing = false;
  if (Online.timer) clearInterval(Online.timer);
  try { await supabaseClient.from('online_rooms').update({ status: 'finished', finished_at: new Date().toISOString() }).eq('id', Online.room.id); } catch(e) {}
  updateMissionProgress('online');
  var sorted = Online.players.slice().sort(function(a, b) { return (b.score || 0) - (a.score || 0); });
  var winner = sorted[0];
  var iWon = winner && winner.user_id === App.user.id;
  
  if (iWon) {
    addPoints(CONFIG.WIN_REWARD, true);
    updateMissionProgress('win_online', true);
    SoundSystem.playBigWin(); Vibration.onBigPrize();
    showWinOverlay('🏆', 'مبروك! فزت', 3000);
  } else {
    deductPoints(CONFIG.LOSS_DEDUCT);
    SoundSystem.playLoss(); Vibration.onLoss();
  }
  
  var container = $('onlineResultContainer');
  container.className = 'result-container ' + (iWon ? 'winner' : 'loser');
  $('onlineResultIcon').textContent = iWon ? '🏆' : '😢';
  $('onlineResultTitle').textContent = iWon ? 'مبروك! فزت' : 'للأسف خسرت';
  $('onlineResultReward').textContent = iWon ? '+' + CONFIG.WIN_REWARD + ' نقطة' : '-' + CONFIG.LOSS_DEDUCT + ' نقطة';
  
  var finalHtml = '';
  sorted.forEach(function(p, j) {
    var isMe = p.user_id === App.user.id;
    finalHtml += '<div class="online-score-row ' + (isMe ? 'me' : '') + '"><span class="online-score-rank">#' + (j+1) + '</span><span class="online-score-name">' + p.username + (isMe ? ' (أنت)' : '') + '</span><span class="online-score-points">' + (p.score || 0) + '</span></div>';
  });
  $('onlineFinalScores').innerHTML = finalHtml;
  showView('onlineResultView');
  saveLocal(); updateAllUI(); syncUser(); checkMilestones();
}

async function leaveOnlineRoom() {
  if (Online.channel) { try { supabaseClient.removeChannel(Online.channel); } catch(e) {} Online.channel = null; }
  if (Online.pollInterval) { clearInterval(Online.pollInterval); Online.pollInterval = null; }
  if (Online.roundPollInterval) { clearInterval(Online.roundPollInterval); Online.roundPollInterval = null; }
  if (Online.room) {
    try {
      await supabaseClient.from('room_players').delete().eq('room_id', Online.room.id).eq('user_id', App.user.id);
      var remaining = await supabaseClient.from('room_players').select('id').eq('room_id', Online.room.id);
      if (!remaining.data || remaining.data.length === 0) await supabaseClient.from('online_rooms').delete().eq('id', Online.room.id);
    } catch(e) {}
  }
  Online.room = null; Online.players = []; Online.answers = [];
  Online.playing = false; Online.isHost = false; Online.isReady = false; Online.currentRound = 0;
  if (Online.timer) clearInterval(Online.timer);
  $('readyBtn').textContent = '✋ جاهز';
  $('readyBtn').classList.remove('ready');
  showView('onlineLobbyView');
  showToast('غادرت الغرفة', 'info');
}

function playAgainOnline() {
  leaveOnlineRoom();
  setTimeout(function() { openOnlineLobby(); }, 300);
}

/* ============ JOIN OFFLINE ============ */
function openJoinModal() { $('joinCodeInput').value = ''; $('joinRoomModal').classList.add('active'); }

function joinRoomByCode(){
  var code = $('joinCodeInput').value.trim().toUpperCase();
  if(code.length !== 6) return showToast('الكود 6 حروف','error');
  if(!useTicket()) return;
  var needed = CONFIG.ENTRY_FEE + CONFIG.COMMISSION;
  if(!hasEnoughPoints(needed)){ showToast('رصيدك غير كافٍ','error'); return; }
  spendPoints(needed);
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
  setTimeout(function(){$('playersCount').textContent='3';$('slot3').classList.add('filled');$('slot3').textContent=BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)].charAt(0);$('waitingHint').textContent='الغرفة اكتملت!';setTimeout(startGame,900);},2000);
  showToast('✅ انضممت للغرفة!','success');
}

function copyRoomCode(){
  var code = $('roomCodeDisplay').textContent;
  var text = '🎮 العب معايا Neon Prediction!\n\n🔒 كود الغرفة: '+code;
  if(navigator.clipboard) navigator.clipboard.writeText(text).then(function(){showToast('تم النسخ!','success');}).catch(function(){showToast('الكود: '+code,'info');});
  else showToast('الكود: '+code,'info');
}

/* ============================================
   EXPORTS — ربط الدوال بالـ window
   ============================================ */
window.switchAuthTab = switchAuthTab;
window.signupNew = signupNew;
window.loginExisting = loginExisting;
window.saveNewPassword = saveNewPassword;
window.logoutUser = logoutUser;
window.closeWelcomeAd = closeWelcomeAd;
window.claimDailyLogin = claimDailyLogin;
window.claimDailyChest = claimDailyChest;
window.selectCategory = selectCategory;
window.start1v1 = start1v1;
window.leaveRoom = leaveRoom;
window.playAgain = playAgain;
window.openMilestonesModal = openMilestonesModal;
window.openLossRecovery = openLossRecovery;
window.confirmLossRecovery = confirmLossRecovery;
window.openLuckyWheel = openLuckyWheel;
window.spinWheel = spinWheel;
window.triggerJackpotEffect = triggerJackpotEffect;
window.triggerLegendaryEffect = triggerLegendaryEffect;
window.triggerGoldenFlash = triggerGoldenFlash;
window.triggerConfetti = triggerConfetti;
window.showJackpotOverlay = showJackpotOverlay;
window.openTicketStore = openTicketStore;
window.buyTicket = buyTicket;
window.openStore = openStore;
window.buyPackage = buyPackage;
window.buyPrime = buyPrime;
window.buyMultiplier = buyMultiplier;
window.openDepositModal = openDepositModal;
window.openWithdrawModal = openWithdrawModal;
window.submitDeposit = submitDeposit;
window.submitWithdraw = submitWithdraw;
window.transferEarningsToWallet = transferEarningsToWallet;
window.openProfile = openProfile;
window.showLeaderboard = showLeaderboard;
window.acceptSpecialOffer = acceptSpecialOffer;
window.openFriendsModal = openFriendsModal;
window.searchFriends = searchFriends;
window.sendFriendRequest = sendFriendRequest;
window.removeFriend = removeFriend;
window.openShareModal = openShareModal;
window.copyShareLink = copyShareLink;
window.shareWhatsApp = shareWhatsApp;
window.shareTelegram = shareTelegram;
window.nativeShare = nativeShare;
window.openOnlineLobby = openOnlineLobby;
window.openPublicRooms = openPublicRooms;
window.joinPublicRoom = joinPublicRoom;
window.openCreateRoomModal = openCreateRoomModal;
window.setRoomPlayers = setRoomPlayers;
window.setRoomTime = setRoomTime;
window.setRoomCategory = setRoomCategory;
window.setRoomPrivacy = setRoomPrivacy;
window.createOnlineRoomWithSettings = createOnlineRoomWithSettings;
window.openJoinOnlineModal = openJoinOnlineModal;
window.joinOnlineRoom = joinOnlineRoom;
window.toggleReady = toggleReady;
window.leaveOnlineRoom = leaveOnlineRoom;
window.playAgainOnline = playAgainOnline;
window.showView = showView;
window.closeModal = closeModal;
window.toggleFullscreen = toggleFullscreen;
window.openJoinModal = openJoinModal;
window.joinRoomByCode = joinRoomByCode;
window.copyRoomCode = copyRoomCode;

console.log('✅ Neon Prediction v11.2 loaded — Lucky Wheel v2 + JACKPOT 💎');
