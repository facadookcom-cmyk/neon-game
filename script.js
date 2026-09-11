// ============================================
// Neon Prediction - Complete Script (v12 - 3 Players)
// ============================================

// ==================== عرض الأخطاء ====================
window.addEventListener('error', (e) => {
    console.error('❌ خطأ:', e.message, 'في', e.filename, 'سطر', e.lineno);
    if (typeof showToast === 'function') {
        showToast('❌ خطأ: ' + e.message, 'error');
    }
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ خطأ غير متوقع:', e.reason);
    if (typeof showToast === 'function') {
        showToast('❌ خطأ: ' + (e.reason?.message || e.reason), 'error');
    }
});

const SUPABASE_URL = 'https://qejudsvdtdbbmxlvymiw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vgUfkb0u8FIx7GFR_FF3bw_jE357yJD';

const CONFIG = Object.freeze({
  ENTRY_FEE: 12,
  WIN_REWARD: 28,
  COMMISSION: 2,
  ROOM_SIZE: 3,
  CHOICE_TIMEOUT: 10,
  STARTER_POINTS: 60,
  SHARE_BONUS: 20,
  TIMEOUT_PENALTY: 6,
  VODAFONE: '01091602772',
  ADMIN_BOT_TOKEN: '8843827619:AAEXRV-smWNN7VSJAqETM1cS4rvKA0aSFj4',
  ADMIN_CHAT_ID: '6778071782',
  LEVELS_PER_GAMES: 20,
  LEVEL_NAMES: Object.freeze({
    1: 'مبتدئ 🌱', 2: 'هاوي 🥉', 3: 'محترف 🥈',
    4: 'خبير 🥇', 5: 'أسطورة 💎', 6: 'نخبة 👑', 7: 'أسطوري 🏆'
  }),
  PRIZES: [
    { threshold: 150, money: 20 },
    { threshold: 200, money: 30 },
    { threshold: 250, money: 40 },
    { threshold: 300, money: 55 },
    { threshold: 350, money: 70 },
    { threshold: 400, money: 90 },
    { threshold: 450, money: 110 },
    { threshold: 500, money: 135 },
    { threshold: 550, money: 160 },
    { threshold: 600, money: 190 },
    { threshold: 650, money: 220 },
    { threshold: 700, money: 255 },
    { threshold: 750, money: 290 },
    { threshold: 800, money: 330 },
    { threshold: 850, money: 375 },
    { threshold: 900, money: 420 },
    { threshold: 950, money: 470 },
    { threshold: 1000, money: 525 },
    { threshold: 1100, money: 580 },
    { threshold: 1200, money: 650 }
  ]
});

const CATEGORIES = Object.freeze({
  football: { name: 'كرة القدم', icon: '⚽', choices: ['ريال مدريد', 'برشلونة', 'ليفربول', 'بايرن ميونخ', 'باريس سان جيرمان'] },
  fruits:   { name: 'فواكه', icon: '🍎', choices: ['تفاح', 'موز', 'برتقال', 'عنب', 'فراولة'] },
  animals:  { name: 'حيوانات', icon: '🦁', choices: ['أسد', 'فيل', 'نمر', 'زرافة', 'دب'] },
  colors:   { name: 'ألوان', icon: '🎨', choices: ['أحمر', 'أزرق', 'أخضر', 'أصفر', 'أسود'] }
});

const App = {
  user: { id: null, username: '', phone: '', avatar_url: '', purchased: 0, earned: 0, level: 1, games_played: 0, shared: false, claimedPrizes: [] },
  room: { id: null, category: null, players: [], status: 'idle', correctChoice: null, code: null },
  myChoice: null,
  timerInterval: null,
  timeLeft: 10,
  realtimeChannel: null,
  pendingPurchase: null,
  gameStarted: false,
  onlineInterval: null,
  speedInterval: null,
  adShown: false,
  isLeaving: false
};

let db = null;

window.addEventListener('load', initApp);

function initApp() {
  initDatabase();
  startTriangleBackground();
  restoreSession();
  startPeriodicUpdates();
  initNotifications();
  buildPrizeTableProfile();
}

function initDatabase() {
  if (typeof supabase === 'undefined') return;
  try {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (e) {}
}

function restoreSession() {
  const saved = localStorage.getItem('neon_user');
  if (!saved) return;
  try {
    App.user = { ...App.user, ...JSON.parse(saved) };
    if (!App.user.claimedPrizes) App.user.claimedPrizes = [];
    if (App.user.username) setTimeout(enterGame, 280);
  } catch (e) {
    localStorage.removeItem('neon_user');
  }
}

function startPeriodicUpdates() {
  App.onlineInterval = setInterval(updateOnlineCount, 4000);
  App.speedInterval = setInterval(updateSpeed, 2800);
  updateOnlineCount();
  updateSpeed();
}

function initNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission();
}

function buildPrizeTableProfile() {
  const container = document.getElementById('prizeTableProfile');
  if (!container) return;
  
  container.innerHTML = CONFIG.PRIZES.map((p, i) => {
    const isHighlight = [150, 500, 1200].includes(p.threshold) || i % 4 === 0;
    return `
      <div class="prize-row ${isHighlight ? 'highlight' : ''}">
        <span class="prize-points">${p.threshold} نقطة</span>
        <span class="prize-money">${p.money} جنيه</span>
      </div>
    `;
  }).join('');
}

function startTriangleBackground() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = canvas.width = innerWidth;
  let H = canvas.height = innerHeight;
  const tris = Array.from({ length: 12 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    size: Math.random() * 50 + 22,
    speedX: (Math.random() - 0.5) * 0.22,
    speedY: (Math.random() - 0.5) * 0.22,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.0035,
    op: Math.random() * 0.2 + 0.06
  }));
  addEventListener('resize', () => { W = canvas.width = innerWidth; H = canvas.height = innerHeight; });
  function draw() {
    ctx.fillStyle = '#0c0a0a';
    ctx.fillRect(0, 0, W, H);
    for (const t of tris) {
      t.x += t.speedX; t.y += t.speedY; t.rot += t.rotSpeed;
      if (t.x < -70) t.x = W + 70;
      if (t.x > W + 70) t.x = -70;
      if (t.y < -70) t.y = H + 70;
      if (t.y > H + 70) t.y = -70;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.rot);
      ctx.beginPath();
      ctx.moveTo(0, -t.size);
      ctx.lineTo(-t.size * 0.87, t.size * 0.5);
      ctx.lineTo(t.size * 0.87, t.size * 0.5);
      ctx.closePath();
      ctx.strokeStyle = `rgba(220,80,80,${t.op})`;
      ctx.lineWidth = 1.3;
      ctx.shadowColor = `rgba(220,70,70,${t.op})`;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// ==================== تسجيل الدخول ====================
async function login() {
  const name = document.getElementById('usernameInput')?.value.trim() || '';
  const phone = document.getElementById('phoneInput')?.value.trim() || '';
  if (name.length < 2) return showToast('اكتب اسم صحيح', 'error');
  if (!phone || phone.length < 11 || !phone.startsWith('01')) return showToast('رقم تليفون غير صحيح', 'error');

  if (!db) {
    createLocalUser(name, phone);
    showToast(`أهلاً ${name}`, 'success');
    enterGame();
    return;
  }
  try {
    const { data: existing } = await db.from('users').select('*').eq('username', name).maybeSingle();
    if (existing) {
      mapUser(existing);
      showToast(`أهلاً بعودتك ${name}`, 'success');
    } else {
      const { data: neu, error } = await db.from('users').insert([{
        username: name, phone,
        purchased_points: CONFIG.STARTER_POINTS, earned_points: 0, level: 1, games_played: 0, shared: false
      }]).select().single();
      if (error) throw error;
      mapUser(neu);
      showToast(`أهلاً ${name}! حصلت على ${CONFIG.STARTER_POINTS} نقطة`, 'success');
    }
    saveLocal();
    enterGame();
  } catch (e) {
    createLocalUser(name, phone);
    showToast(`أهلاً ${name}`, 'success');
    enterGame();
  }
}

function mapUser(r) {
  App.user = {
    id: r.id, username: r.username, phone: r.phone || '',
    avatar_url: r.avatar_url || '', purchased: r.purchased_points || 0,
    earned: r.earned_points || 0, level: r.level || 1,
    games_played: r.games_played || 0, shared: r.shared || false,
    claimedPrizes: r.claimed_prizes || []
  };
}

function createLocalUser(name, phone) {
  App.user = {
    id: 'local_' + Date.now(), username: name, phone, avatar_url: '',
    purchased: CONFIG.STARTER_POINTS, earned: 0, level: 1, games_played: 0, shared: false, claimedPrizes: []
  };
  saveLocal();
}

function saveLocal() {
  localStorage.setItem('neon_user', JSON.stringify(App.user));
}

function enterGame() {
  document.getElementById('loginScreen')?.classList.remove('active');
  document.getElementById('mainScreen')?.classList.add('active');
  updateUI();
  if (!App.adShown && !localStorage.getItem('adShown')) {
    document.getElementById('welcomeAd')?.classList.remove('hidden');
  }
}

function closeWelcomeAd() {
  document.getElementById('welcomeAd')?.classList.add('hidden');
  localStorage.setItem('adShown', 'true');
  App.adShown = true;
}

function updateUI() {
  const total = App.user.purchased + App.user.earned;
  document.getElementById('userName').textContent = App.user.username;
  document.getElementById('userPoints').textContent = total;
  document.getElementById('userLevel').textContent = CONFIG.LEVEL_NAMES[App.user.level] || 'مبتدئ';
  const av = document.getElementById('userAvatar');
  if (App.user.avatar_url) {
    av.style.backgroundImage = `url(${App.user.avatar_url})`;
    av.textContent = '';
  } else {
    av.style.backgroundImage = '';
    av.textContent = App.user.username.charAt(0).toUpperCase();
  }
}

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId)?.classList.add('active');
  const nav = document.getElementById('bottomNav');
  if (nav) nav.style.display = (viewId === 'categoryView') ? 'flex' : 'none';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (viewId === 'categoryView') document.querySelector('.nav-btn')?.classList.add('active');
}

function updateSpeed() {
  const el = document.getElementById('speedValue');
  const badge = document.getElementById('speedBadge');
  if (!el || !badge) return;
  const t0 = performance.now();
  fetch('https://www.google.com/favicon.ico', { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
    .then(() => {
      const ms = performance.now() - t0;
      let label, cls = '';
      if (ms < 160) { label = (3.8 + Math.random() * 1.8).toFixed(1) + 'M'; }
      else if (ms < 400) { label = (1.9 + Math.random() * 0.9).toFixed(1) + 'M'; cls = 'medium'; }
      else { label = (0.5 + Math.random() * 0.5).toFixed(1) + 'M'; cls = 'slow'; }
      el.textContent = label;
      badge.className = 'speed-badge ' + cls;
    })
    .catch(() => { el.textContent = '--'; });
}

async function updateOnlineCount() {
  const el = document.getElementById('onlineCount');
  if (!el) return;
  if (!db) { el.textContent = '1'; return; }
  try {
    const { count } = await db.from('users').select('*', { count: 'exact', head: true });
    el.textContent = count || 1;
  } catch { el.textContent = '1'; }
}

async function cleanMyRooms() {
  if (!db || !App.user.id || String(App.user.id).startsWith('local_')) return;
  try { await db.from('room_players').delete().eq('user_id', App.user.id); } catch (e) {}
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ==================== إنشاء غرفة خاصة ====================
async function createPrivateRoom() {
  if (App.room.status === 'waiting' || App.room.status === 'playing') {
    return showToast('أنت في غرفة بالفعل', 'error');
  }
  
  const total = App.user.purchased + App.user.earned;
  if (total < CONFIG.ENTRY_FEE + CONFIG.COMMISSION) {
    return showToast(`رصيدك غير كافٍ (تحتاج ${CONFIG.ENTRY_FEE + CONFIG.COMMISSION})`, 'error');
  }

  await cleanMyRooms();
  
  if (!db) {
    return showToast('Supabase غير متصل', 'error');
  }

  try {
    let code = generateRoomCode();
    let attempts = 0;
    
    while (attempts < 5) {
      const { data: existing } = await db.from('rooms')
        .select('id')
        .eq('code', code)
        .maybeSingle();
      
      if (!existing) break;
      code = generateRoomCode();
      attempts++;
    }

    const { data: newRoom, error } = await db.from('rooms')
      .insert([{
        category: 'football',
        status: 'waiting',
        max_players: CONFIG.ROOM_SIZE,
        code: code,
        is_private: true
      }])
      .select('id').single();

    if (error) throw error;

    App.room = {
      id: newRoom.id,
      category: 'football',
      players: [],
      status: 'waiting',
      correctChoice: null,
      code: code
    };
    App.gameStarted = false;
    App.isLeaving = false;

    await db.from('room_players').insert([{
      room_id: newRoom.id,
      user_id: App.user.id
    }]);

    document.getElementById('roomCodeDisplay').textContent = code;
    document.getElementById('roomCodeModal').classList.add('active');

    subscribeToRoom(newRoom.id);
    await loadRoomPlayers(newRoom.id);

  } catch (e) {
    console.error('createPrivateRoom error:', e);
    showToast('حدث خطأ: ' + (e.message || 'حاول تاني'), 'error');
  }
}

function copyRoomCode() {
  const code = document.getElementById('roomCodeDisplay').textContent;
  if (!code || code === '------') return;
  
  const text = `🎮 العب معايا Neon Prediction!\n\n🔒 كود الغرفة: ${code}\n\nادخل الموقع: https://neon-game-seven.vercel.app\nواختار "الانضمام بكود" واكتب: ${code}`;
  
  navigator.clipboard.writeText(text).then(() => {
    showToast('✅ تم نسخ الكود! ابعته لأصدقائك', 'success');
  }).catch(() => {
    showToast('❌ فشل النسخ، انسخه يدوياً: ' + code, 'error');
  });
}

function openJoinModal() {
  if (App.room.status === 'waiting' || App.room.status === 'playing') {
    return showToast('أنت في غرفة بالفعل', 'error');
  }
  document.getElementById('joinCodeInput').value = '';
  document.getElementById('joinRoomModal').classList.add('active');
}

async function joinRoomByCode() {
  const code = document.getElementById('joinCodeInput').value.trim().toUpperCase();
  
  if (code.length !== 6) {
    return showToast('الكود لازم يكون 6 حروف', 'error');
  }

  if (!db) {
    return showToast('Supabase غير متصل', 'error');
  }

  const total = App.user.purchased + App.user.earned;
  if (total < CONFIG.ENTRY_FEE + CONFIG.COMMISSION) {
    return showToast(`رصيدك غير كافٍ (تحتاج ${CONFIG.ENTRY_FEE + CONFIG.COMMISSION})`, 'error');
  }

  await cleanMyRooms();

  try {
    const { data: room, error } = await db.from('rooms')
      .select('*')
      .eq('code', code)
      .eq('status', 'waiting')
      .maybeSingle();

    if (error) throw error;
    
    if (!room) {
      return showToast('❌ الكود غير صحيح أو الغرفة مقفلة', 'error');
    }

    const { count } = await db.from('room_players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id);

    if (count >= CONFIG.ROOM_SIZE) {
      return showToast('❌ الغرفة ممتلئة', 'error');
    }

    const { error: joinErr } = await db.from('room_players')
      .insert([{ room_id: room.id, user_id: App.user.id }]);

    if (joinErr && joinErr.code !== '23505') throw joinErr;

    App.room = {
      id: room.id,
      category: room.category || 'football',
      players: [],
      status: 'waiting',
      correctChoice: null,
      code: code
    };
    App.gameStarted = false;
    App.isLeaving = false;

    closeModal('joinRoomModal');
    subscribeToRoom(room.id);
    await loadRoomPlayers(room.id);

    const titleEl = document.getElementById('waitingTitle');
    if (titleEl) titleEl.textContent = `غرفة ${code}`;
    updateWaitingUI();
    showView('waitingView');
    showToast('✅ انضممت للغرفة!', 'success');

  } catch (e) {
    console.error('joinRoomByCode error:', e);
    showToast('حدث خطأ: ' + (e.message || 'حاول تاني'), 'error');
  }
}

// ==================== اختيار الفئة العادي ====================
async function selectCategory(category) {
  if (App.room.status === 'waiting' || App.room.status === 'playing') {
    return showToast('أنت في غرفة بالفعل', 'error');
  }

  const total = App.user.purchased + App.user.earned;
  if (total < CONFIG.ENTRY_FEE + CONFIG.COMMISSION) {
    return showToast(`رصيدك غير كافٍ (تحتاج ${CONFIG.ENTRY_FEE + CONFIG.COMMISSION})`, 'error');
  }

  await cleanMyRooms();
  
  const cat = CATEGORIES[category];
  App.room = { id: null, category, players: [], status: 'waiting', correctChoice: null, code: null };
  App.gameStarted = false;
  App.isLeaving = false;

  try {
    if (db) {
      const { data: rooms, error: roomsError } = await db.from('rooms')
        .select('id, created_at')
        .eq('category', category)
        .eq('status', 'waiting')
        .or('is_private.is.null,is_private.eq.false')
        .order('created_at', { ascending: true });

      if (roomsError) throw roomsError;

      let roomId = null;

      if (rooms && rooms.length > 0) {
        for (const room of rooms) {
          const { count } = await db.from('room_players')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id);
          
          if (count < CONFIG.ROOM_SIZE) {
            roomId = room.id;
            break;
          }
        }
      }

      if (!roomId) {
        const { data: newRoom, error: createErr } = await db.from('rooms')
          .insert([{ category, status: 'waiting', max_players: CONFIG.ROOM_SIZE, is_private: false }])
          .select('id').single();
        if (createErr) throw createErr;
        roomId = newRoom.id;
      }

      App.room.id = roomId;

      const { error: joinErr } = await db.from('room_players')
        .insert([{ room_id: roomId, user_id: App.user.id }]);

      if (joinErr && joinErr.code !== '23505') throw joinErr;

      subscribeToRoom(roomId);
      await loadRoomPlayers(roomId);
    } else {
      App.room.id = 'local_' + Date.now();
      App.room.players = [{ username: App.user.username, avatar: App.user.avatar_url }];
    }
  } catch (e) {
    console.error('selectCategory error:', e);
    return showToast('حدث خطأ، حاول تاني', 'error');
  }

  const titleEl = document.getElementById('waitingTitle');
  if (titleEl) titleEl.textContent = `غرفة ${cat.name}`;
  updateWaitingUI();
  showView('waitingView');
  showToast(`انضممت لغرفة ${cat.name}`, 'success');
}

// ==================== تحميل اللاعبين ====================
async function loadRoomPlayers(roomId) {
  if (!db || App.isLeaving) return;
  
  console.log('🔄 تحميل اللاعبين للغرفة:', roomId);
  
  try {
    const { data: players, error } = await db.from('room_players')
      .select('user_id, choice, result')
      .eq('room_id', roomId);

    if (error) {
      console.error('❌ خطأ في تحميل اللاعبين:', error);
      return;
    }

    console.log('📊 عدد اللاعبين في room_players:', players?.length || 0);

    if (!players || players.length === 0) {
      App.room.players = [];
      updateWaitingUI();
      return;
    }

    const userIds = players.map(p => p.user_id);
    const { data: users, error: usersErr } = await db.from('users')
      .select('id, username, avatar_url')
      .in('id', userIds);

    if (usersErr) {
      console.error('❌ خطأ في تحميل المستخدمين:', usersErr);
    }

    App.room.players = players.map(p => {
      const user = users?.find(u => u.id === p.user_id);
      return {
        user_id: p.user_id,
        username: user?.username || 'لاعب',
        avatar: user?.avatar_url || '',
        choice: p.choice
      };
    });

    console.log('✅ عدد اللاعبين:', App.room.players.length);
    
    updateWaitingUI();

    if (App.room.players.length >= CONFIG.ROOM_SIZE && !App.gameStarted && App.room.status === 'waiting') {
      App.gameStarted = true;
      App.room.status = 'playing';
      console.log('🔥 الغرفة اكتملت! ابدأ اللعبة...');
      setTimeout(startGame, 800);
    }
  } catch (e) {
    console.error('❌ loadRoomPlayers error:', e);
  }
}

// ==================== الاشتراك في Realtime ====================
function subscribeToRoom(roomId) {
  if (!db) return;
  if (App.realtimeChannel) {
    try { db.removeChannel(App.realtimeChannel); } catch (e) {}
  }
  
  console.log('📡 الاشتراك في الغرفة:', roomId);
  
  App.realtimeChannel = db.channel('room_' + roomId + '_' + Date.now())
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'room_players',
      filter: `room_id=eq.${roomId}`
    }, (payload) => {
      console.log('➕ لاعب جديد دخل');
      loadRoomPlayers(roomId);
    })
    .on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: 'room_players',
      filter: `room_id=eq.${roomId}`
    }, () => {
      console.log('➖ لاعب خرج');
      loadRoomPlayers(roomId);
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'room_players',
      filter: `room_id=eq.${roomId}`
    }, () => {
      console.log('🔄 تحديث اللاعب');
      loadRoomPlayers(roomId);
    })
    .subscribe((status) => {
      console.log('📡 حالة الاشتراك:', status);
    });
}

// ==================== تحديث واجهة الانتظار ====================
function updateWaitingUI() {
  const count = App.room.players.length;
  const countEl = document.getElementById('playersCount');
  if (countEl) countEl.textContent = count;
  
  const hint = document.getElementById('waitingHint');
  if (hint) {
    hint.textContent = count < CONFIG.ROOM_SIZE 
      ? `في انتظار ${CONFIG.ROOM_SIZE - count} لاعبين...` 
      : 'الغرفة اكتملت! استعد';
  }

  console.log('🎨 تحديث الواجهة:', count, 'لاعبين');

  for (let i = 1; i <= CONFIG.ROOM_SIZE; i++) {
    const slot = document.getElementById('slot' + i);
    if (!slot) continue;
    const player = App.room.players[i - 1];
    
    if (player) {
      slot.classList.add('filled');
      if (player.avatar) {
        slot.style.backgroundImage = `url(${player.avatar})`;
        slot.textContent = '';
      } else {
        slot.style.backgroundImage = '';
        slot.textContent = (player.username || '?').charAt(0).toUpperCase();
      }
      slot.title = player.username || 'لاعب';
    } else {
      slot.classList.remove('filled');
      slot.style.backgroundImage = '';
      slot.textContent = '';
      slot.title = '';
    }
  }
}

// ==================== بدء اللعبة ====================
function startGame() {
  App.room.status = 'playing';
  App.myChoice = null;
  App.room.correctChoice = Math.floor(Math.random() * 5) + 1;
  const cat = CATEGORIES[App.room.category] || CATEGORIES.football;
  const grid = document.getElementById('choicesGrid');
  if (!grid) return;
  grid.innerHTML = '';
  cat.choices.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.innerHTML = `<span class="choice-num">${i + 1}</span><span>${c}</span>`;
    btn.onclick = () => makeChoice(i + 1);
    grid.appendChild(btn);
  });
  showView('gameView');
  startTimer();
}

async function makeChoice(num) {
  if (App.myChoice !== null) return;
  App.myChoice = num;
  document.querySelectorAll('.choice-btn').forEach((b, i) => {
    b.disabled = true;
    if (i + 1 === num) b.classList.add('selected');
  });
  if (db && App.room.id && !String(App.room.id).startsWith('local_')) {
    try {
      await db.from('room_players').update({ choice: num })
        .eq('room_id', App.room.id).eq('user_id', App.user.id);
    } catch (e) {}
  }
  stopTimer();
  setTimeout(showResult, 1600);
}

function startTimer() {
  App.timeLeft = CONFIG.CHOICE_TIMEOUT;
  const el = document.getElementById('timerValue');
  if (!el) return;
  el.textContent = App.timeLeft;
  el.classList.remove('danger');
  App.timerInterval = setInterval(() => {
    App.timeLeft--;
    el.textContent = App.timeLeft;
    if (App.timeLeft <= 3) el.classList.add('danger');
    if (App.timeLeft <= 0) {
      stopTimer();
      if (App.myChoice === null) {
        App.myChoice = Math.floor(Math.random() * 5) + 1;
        App.user.purchased = Math.max(0, App.user.purchased - CONFIG.TIMEOUT_PENALTY);
        saveLocal();
        updateUI();
        showCoinToast(`-${CONFIG.TIMEOUT_PENALTY} (انتهى الوقت)`, '⏰');
        setTimeout(showResult, 1100);
      }
    }
  }, 1000);
}

function stopTimer() {
  if (App.timerInterval) clearInterval(App.timerInterval);
  App.timerInterval = null;
}

async function showResult() {
  App.room.status = 'finished';
  const correct = App.room.correctChoice;
  const cat = CATEGORIES[App.room.category] || CATEGORIES.football;
  const choices = cat.choices;
  const correctName = choices[correct - 1];
  const myName = App.myChoice ? choices[App.myChoice - 1] : 'لم تختر';
  const won = App.myChoice === correct;
  const cost = CONFIG.ENTRY_FEE + CONFIG.COMMISSION;

  if (App.user.purchased >= cost) App.user.purchased -= cost;
  else {
    const rem = cost - App.user.purchased;
    App.user.purchased = 0;
    App.user.earned = Math.max(0, App.user.earned - rem);
  }
  App.user.games_played++;

  if (won) {
    App.user.earned += CONFIG.WIN_REWARD;
    checkLevelUp();
    await checkPrizes();
    showCoinToast(`+${CONFIG.WIN_REWARD} نقطة`, '🏆');
  } else {
    showCoinToast(`-${cost} نقطة`, '💸');
  }

  if (db && !String(App.user.id).startsWith('local_')) {
    try {
      await db.from('users').update({
        purchased_points: App.user.purchased,
        earned_points: App.user.earned,
        level: App.user.level,
        games_played: App.user.games_played,
        claimed_prizes: App.user.claimedPrizes
      }).eq('id', App.user.id);
    } catch (e) {}
  }
  saveLocal();
  updateUI();

  const box = document.getElementById('resultContainer');
  document.getElementById('resultIcon').textContent = won ? '🏆' : '😢';
  document.getElementById('resultTitle').textContent = won ? 'مبروك! فزت' : 'للأسف خسرت';
  document.getElementById('resultText').innerHTML = `الصحيح: <strong>${correctName}</strong><br>اختيارك: <strong>${myName}</strong>`;
  document.getElementById('resultReward').textContent = won ? `+${CONFIG.WIN_REWARD} نقطة` : `-${cost} نقطة`;
  box.className = 'result-container ' + (won ? 'winner' : 'loser');
  showView('resultView');
}

function checkLevelUp() {
  let lvl = Math.floor(App.user.games_played / CONFIG.LEVELS_PER_GAMES) + 1;
  if (lvl > 7) lvl = 7;
  if (lvl > App.user.level) {
    App.user.level = lvl;
    showToast('ترقيت! ' + CONFIG.LEVEL_NAMES[lvl], 'success');
  }
}

async function checkPrizes() {
  for (const prize of CONFIG.PRIZES) {
    if (App.user.earned >= prize.threshold && !App.user.claimedPrizes.includes(prize.threshold)) {
      App.user.claimedPrizes.push(prize.threshold);
      App.user.earned -= prize.threshold;

      showCoinToast(`فزت بـ ${prize.money} جنيه!`, '💰');
      
      if (Notification.permission === 'granted') {
        new Notification('مبروك الفوز!', {
          body: `ربحت ${prize.money} جنيه فودافون كاش`
        });
      }

      try {
        const message = `
🎉 فائز بجائزة!

👤 الاسم: ${App.user.username}
📱 التليفون: ${App.user.phone || 'غير متوفر'}
🆔 ID: ${App.user.id}

⭐ النقاط: ${prize.threshold}
💰 الجائزة: ${prize.money} جنيه فودافون كاش
⏰ الوقت: ${new Date().toLocaleString('ar-EG')}
        `.trim();
        await sendTelegram(message);
      } catch (e) {}
    }
  }
  saveLocal();
}

async function sendTelegram(message) {
  try {
    const url = `https://api.telegram.org/bot${CONFIG.ADMIN_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CONFIG.ADMIN_CHAT_ID,
        text: message
      })
    });
  } catch (e) {}
}

async function playAgain() {
  App.isLeaving = true;
  if (db && App.room.id && !String(App.room.id).startsWith('local_')) {
    try {
      await db.from('room_players').delete().eq('room_id', App.room.id).eq('user_id', App.user.id);
    } catch (e) {}
  }
  if (App.realtimeChannel) {
    try { db.removeChannel(App.realtimeChannel); } catch (e) {}
    App.realtimeChannel = null;
  }
  App.room = { id: null, category: null, players: [], status: 'idle', correctChoice: null, code: null };
  App.myChoice = null;
  App.gameStarted = false;
  setTimeout(() => {
    App.isLeaving = false;
    showView('categoryView');
  }, 220);
}

async function leaveRoom() {
  await playAgain();
  showToast('غادرت الغرفة', 'info');
}

function openStore() { document.getElementById('storeModal').classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

function buyPackage(points, price) {
  App.pendingPurchase = { points, price };
  closeModal('storeModal');
  document.getElementById('paymentPoints').textContent = points;
  document.getElementById('paymentPrice').textContent = price + ' جنيه';
  document.getElementById('paymentVodafone').textContent = CONFIG.VODAFONE;
  document.getElementById('paymentModal').classList.add('active');
}

async function submitPayment() {
  const num = document.getElementById('transNumberInput')?.value.trim() || '';
  if (num.length < 4) return showToast('اكتب رقم العملية', 'error');
  if (!App.pendingPurchase) return;

  showCoinToast('جاري إرسال الطلب...', '📤');
  try {
    if (db && !String(App.user.id).startsWith('local_')) {
      await db.from('purchase_requests').insert([{
        user_id: App.user.id,
        username: App.user.username,
        phone: App.user.phone,
        points: App.pendingPurchase.points,
        price: App.pendingPurchase.price,
        trans_number: num,
        status: 'pending'
      }]);
    }

    const message = `
🔔 طلب شراء جديد

👤 المستخدم: ${App.user.username}
📱 التليفون: ${App.user.phone || 'غير متوفر'}
🆔 ID: ${App.user.id}

💎 النقاط: ${App.pendingPurchase.points}
💰 السعر: ${App.pendingPurchase.price} جنيه
🔢 رقم العملية: ${num}
⏰ الوقت: ${new Date().toLocaleString('ar-EG')}
    `.trim();

    await sendTelegram(message);

    showCoinToast('تم إرسال الطلب بنجاح', '✅');
    closeModal('paymentModal');
    App.pendingPurchase = null;
    const input = document.getElementById('transNumberInput');
    if (input) input.value = '';
  } catch (e) {
    showToast('حدث خطأ، حاول تاني', 'error');
  }
}

function openProfile() {
  document.getElementById('profileName').textContent = App.user.username;
  document.getElementById('profilePhone').textContent = App.user.phone || '--';
  document.getElementById('profilePurchased').textContent = App.user.purchased;
  document.getElementById('profileEarned').textContent = App.user.earned;
  document.getElementById('profileLevel').textContent = CONFIG.LEVEL_NAMES[App.user.level] || 'مبتدئ';
  document.getElementById('profileGames').textContent = App.user.games_played || 0;

  const avatarEl = document.getElementById('profileAvatar');
  if (App.user.avatar_url) {
    avatarEl.style.backgroundImage = `url(${App.user.avatar_url})`;
    avatarEl.innerHTML = '<span class="edit-avatar-badge">📷</span>';
  } else {
    avatarEl.style.backgroundImage = '';
    avatarEl.innerHTML = App.user.username.charAt(0).toUpperCase() + '<span class="edit-avatar-badge">📷</span>';
  }

  const referralEl = document.getElementById('profileReferral');
  const shareRow = document.getElementById('shareRow');
  if (referralEl && shareRow) {
    if (App.user.shared) {
      referralEl.textContent = '✅ تمت المشاركة';
      shareRow.style.opacity = '0.6';
      shareRow.style.cursor = 'default';
      shareRow.onclick = null;
    } else {
      referralEl.textContent = `🎁 اضغط للمشاركة`;
      shareRow.style.opacity = '1';
      shareRow.style.cursor = 'pointer';
      shareRow.onclick = shareGame;
    }
  }

  document.getElementById('profileModal').classList.add('active');
}

async function uploadAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 500000) return showToast('الصورة كبيرة جداً', 'error');

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result;
    App.user.avatar_url = base64;
    saveLocal();
    updateUI();
    if (db && App.user.id && !String(App.user.id).startsWith('local_')) {
      try {
        await db.from('users').update({ avatar_url: base64 }).eq('id', App.user.id);
      } catch (err) {}
    }
    showCoinToast('تم تحديث الصورة', '📷');
    closeModal('profileModal');
    openProfile();
  };
  reader.readAsDataURL(file);
}

async function shareGame() {
  if (App.user.shared) return showToast('حصلت على المكافأة بالفعل', 'error');
  const shareUrl = 'https://neon-game-seven.vercel.app';
  const shareText = `🎮 العب معايا Neon Prediction! 🎯\nتوقع واكسب نقاط! 💎\n${shareUrl}`;

  try {
    if (navigator.share) {
      await navigator.share({ title: 'Neon Prediction', text: shareText, url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareText);
      showToast('تم نسخ الرابط', 'success');
    }
    App.user.purchased += CONFIG.SHARE_BONUS;
    App.user.shared = true;
    saveLocal();
    updateUI();
    showCoinToast(`+${CONFIG.SHARE_BONUS} نقطة`, '🎁');
    if (db && App.user.id && !String(App.user.id).startsWith('local_')) {
      try {
        await db.from('users').update({
          purchased_points: App.user.purchased,
          shared: true
        }).eq('id', App.user.id);
      } catch (e) {}
    }
  } catch (e) {
    if (e.name !== 'AbortError') console.error(e);
  }
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  const text = document.getElementById('toastText');
  if (!toast) return;
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  if (icon) icon.textContent = icons[type] || 'ℹ️';
  if (text) text.textContent = message;
  toast.className = 'toast ' + type;
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function showCoinToast(message, icon = '💰') {
  const toast = document.getElementById('coinToast');
  const iconEl = document.getElementById('coinToastIcon');
  const textEl = document.getElementById('coinToastText');
  if (!toast) return;
  if (iconEl) iconEl.textContent = icon;
  if (textEl) textEl.textContent = message;
  toast.className = 'coin-toast';
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => toast.classList.remove('show'), 3000);
}

window.addEventListener('beforeunload', () => {
  if (db && App.user.id && App.room.id && !String(App.room.id).startsWith('local_')) {
    db.from('room_players')
      .delete()
      .eq('room_id', App.room.id)
      .eq('user_id', App.user.id);
  }
});
