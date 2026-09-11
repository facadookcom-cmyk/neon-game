// ============================================
// Neon Prediction - Complete Script (v7)
// ============================================

// ==================== إعدادات Supabase ====================
const SUPABASE_URL = 'https://qejudsvdtdbbmxlvymiw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vgUfkb0u8FIx7GFR_FF3bw_jE357yJD';

let db = null;

if (typeof supabase !== 'undefined') {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase متصل');
}

// ==================== الإعدادات ====================
const CONFIG = {
    ENTRY_FEE: 10,
    WIN_REWARD: 20,
    COMMISSION: 1,
    ROOM_SIZE: 5,
    CHOICE_TIMEOUT: 10,
    STARTER_POINTS: 50,
    REWARD_THRESHOLD: 500,
    REWARD_AMOUNT: 500,
    REWARD_GIFT: 200,
    SHARE_BONUS: 20,
    TIMEOUT_PENALTY: 5,
    VODAFONE: '01091602772',
    ADMIN_BOT_TOKEN: '8843827619:AAEXRV-smWNN7VSJAqETM1cS4rvKA0aSFj4',
    ADMIN_CHAT_ID: '6778071782',
    LEVELS_PER_GAMES: 20,
    LEVEL_NAMES: {
        1: 'مبتدئ 🌱', 2: 'هاوي 🥉', 3: 'محترف 🥈',
        4: 'خبير 🥇', 5: 'أسطورة 💎', 6: 'نخبة 👑', 7: 'أسطوري 🏆'
    }
};

const CATEGORIES = {
    football: { name: 'كرة القدم', icon: '⚽', choices: ['ريال مدريد', 'برشلونة', 'ليفربول', 'بايرن ميونخ', 'باريس سان جيرمان'] },
    fruits: { name: 'فواكه', icon: '🍎', choices: ['تفاح', 'موز', 'برتقال', 'عنب', 'فراولة'] },
    animals: { name: 'حيوانات', icon: '🦁', choices: ['أسد', 'فيل', 'نمر', 'زرافة', 'دب'] },
    colors: { name: 'ألوان', icon: '🎨', choices: ['أحمر', 'أزرق', 'أخضر', 'أصفر', 'أسود'] }
};

// ==================== الحالة ====================
const App = {
    user: {
        id: null,
        username: '',
        phone: '',
        avatar_url: '',
        purchased: 0,
        earned: 0,
        level: 1,
        games_played: 0,
        shared: false
    },
    room: { id: null, category: null, players: [], status: 'idle', correctChoice: null },
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

// ==================== بدء التطبيق ====================
window.addEventListener('load', () => {
    console.log('🎮 بدء التطبيق...');

    startTriangleBackground();

    const saved = localStorage.getItem('neon_user');
    if (saved) {
        try {
            App.user = { ...App.user, ...JSON.parse(saved) };
            if (App.user.username) {
                setTimeout(() => enterGame(), 500);
            }
        } catch (e) { console.error(e); }
    }

    App.onlineInterval = setInterval(updateOnlineCount, 5000);
    App.speedInterval = setInterval(updateSpeed, 2000);
    updateOnlineCount();
    updateSpeed();
});

// ==================== خلفية المثلثات ====================
function startTriangleBackground() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const triangles = [];
    const NUM = 15;

    for (let i = 0; i < NUM; i++) {
        triangles.push({
            x: Math.random() * W,
            y: Math.random() * H,
            size: Math.random() * 60 + 30,
            speedX: (Math.random() - 0.5) * 0.3,
            speedY: (Math.random() - 0.5) * 0.3,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.005,
            opacity: Math.random() * 0.3 + 0.1
        });
    }

    window.addEventListener('resize', () => {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    });

    function drawTriangle(t) {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.rotation);

        ctx.beginPath();
        ctx.moveTo(0, -t.size);
        ctx.lineTo(-t.size * 0.87, t.size * 0.5);
        ctx.lineTo(t.size * 0.87, t.size * 0.5);
        ctx.closePath();

        ctx.strokeStyle = `rgba(255, 255, 255, ${t.opacity})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = `rgba(255, 255, 255, ${t.opacity})`;
        ctx.shadowBlur = 15;
        ctx.stroke();

        ctx.restore();
    }

    function animate() {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, W, H);

        triangles.forEach(t => {
            t.x += t.speedX;
            t.y += t.speedY;
            t.rotation += t.rotSpeed;

            if (t.x < -100) t.x = W + 100;
            if (t.x > W + 100) t.x = -100;
            if (t.y < -100) t.y = H + 100;
            if (t.y > H + 100) t.y = -100;

            drawTriangle(t);
        });

        requestAnimationFrame(animate);
    }

    animate();
}

// ==================== تسجيل الدخول ====================
async function login() {
    const input = document.getElementById('usernameInput');
    const phoneInput = document.getElementById('phoneInput');
    const name = input.value.trim();
    const phone = phoneInput.value.trim();

    if (!name || name.length < 2) {
        showToast('❌ اكتب اسم صحيح (حرفين على الأقل)', 'error');
        return;
    }

    if (name.length > 20) {
        showToast('❌ الاسم طويل جداً', 'error');
        return;
    }

    if (!phone || phone.length < 11 || !phone.startsWith('01')) {
        showToast('❌ اكتب رقم تليفون صحيح (11 رقم يبدأ بـ 01)', 'error');
        return;
    }

    if (!db) {
        App.user = {
            id: 'local_' + Date.now(),
            username: name,
            phone: phone,
            avatar_url: '',
            purchased: CONFIG.STARTER_POINTS,
            earned: 0,
            level: 1,
            games_played: 0,
            shared: false
        };
        saveLocal();
        showToast(`🎉 أهلاً ${name}!`, 'success');
        enterGame();
        return;
    }

    try {
        const { data: existing } = await db
            .from('users')
            .select('*')
            .eq('username', name)
            .maybeSingle();

        if (existing) {
            App.user = {
                id: existing.id,
                username: existing.username,
                phone: existing.phone || '',
                avatar_url: existing.avatar_url || '',
                purchased: existing.purchased_points || 0,
                earned: existing.earned_points || 0,
                level: existing.level || 1,
                games_played: existing.games_played || 0,
                shared: existing.shared || false
            };
            showToast(`👋 أهلاً بعودتك ${name}!`, 'success');
        } else {
            const { data: newUser, error: createError } = await db
                .from('users')
                .insert([{
                    username: name,
                    phone: phone,
                    purchased_points: CONFIG.STARTER_POINTS,
                    earned_points: 0,
                    level: 1,
                    games_played: 0,
                    shared: false
                }])
                .select()
                .single();

            if (createError) throw createError;

            App.user = {
                id: newUser.id,
                username: newUser.username,
                phone: newUser.phone || '',
                avatar_url: newUser.avatar_url || '',
                purchased: newUser.purchased_points,
                earned: newUser.earned_points,
                level: newUser.level,
                games_played: newUser.games_played || 0,
                shared: newUser.shared || false
            };
            showToast(`🎉 أهلاً بك ${name}! حصلت على ${CONFIG.STARTER_POINTS} نقطة`, 'success');
        }

        saveLocal();
        enterGame();

    } catch (e) {
        console.error('❌ خطأ:', e);
        App.user = {
            id: 'local_' + Date.now(),
            username: name,
            phone: phone,
            avatar_url: '',
            purchased: CONFIG.STARTER_POINTS,
            earned: 0,
            level: 1,
            games_played: 0,
            shared: false
        };
        saveLocal();
        showToast(`🎉 أهلاً ${name}!`, 'success');
        enterGame();
    }
}

function saveLocal() {
    localStorage.setItem('neon_user', JSON.stringify(App.user));
}

function enterGame() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainScreen').classList.add('active');
    updateUI();

    if (!App.adShown && !localStorage.getItem('adShown')) {
        const ad = document.getElementById('welcomeAd');
        if (ad) ad.classList.remove('hidden');
    }
}

function closeWelcomeAd() {
    const ad = document.getElementById('welcomeAd');
    if (ad) ad.classList.add('hidden');
    localStorage.setItem('adShown', 'true');
    App.adShown = true;
}

function updateUI() {
    const total = App.user.purchased + App.user.earned;
    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    const pointsEl = document.getElementById('userPoints');
    const levelEl = document.getElementById('userLevel');

    if (nameEl) nameEl.textContent = App.user.username;
    if (avatarEl) {
        if (App.user.avatar_url) {
            avatarEl.style.backgroundImage = `url(${App.user.avatar_url})`;
            avatarEl.textContent = '';
        } else {
            avatarEl.textContent = App.user.username.charAt(0).toUpperCase();
            avatarEl.style.backgroundImage = '';
        }
    }
    if (pointsEl) pointsEl.textContent = total;
    if (levelEl) levelEl.textContent = CONFIG.LEVEL_NAMES[App.user.level] || 'مبتدئ 🌱';
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const view = document.getElementById(viewId);
    if (view) view.classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const navBtns = document.querySelectorAll('.nav-btn');
    const map = { categoryView: 0, waitingView: 0, gameView: 0, resultView: 0 };
    if (map[viewId] !== undefined && navBtns[0]) navBtns[0].classList.add('active');
}

// ==================== سرعة الإنترنت ====================
function updateSpeed() {
    const speedEl = document.getElementById('speedValue');
    const badgeEl = document.getElementById('speedBadge');
    if (!speedEl || !badgeEl) return;

    const start = performance.now();
    fetch('https://www.google.com/favicon.ico', { method: 'HEAD', mode: 'no-cors' })
        .then(() => {
            const duration = performance.now() - start;
            let speed, label, cls;

            if (duration < 200) {
                speed = 4 + Math.random() * 2;
                label = speed.toFixed(1) + 'M';
                cls = '';
            } else if (duration < 500) {
                speed = 2 + Math.random() * 1;
                label = speed.toFixed(1) + 'M';
                cls = 'medium';
            } else {
                speed = 0.5 + Math.random() * 0.5;
                label = speed.toFixed(1) + 'M';
                cls = 'slow';
            }

            speedEl.textContent = label;
            badgeEl.className = 'speed-badge ' + cls;
        })
        .catch(() => {
            speedEl.textContent = '1.0M';
        });
}

// ==================== عدّاد المتصلين ====================
async function updateOnlineCount() {
    const onlineEl = document.getElementById('onlineCount');
    if (!onlineEl) return;

    if (db) {
        try {
            const { count } = await db
                .from('users')
                .select('*', { count: 'exact', head: true });
            onlineEl.textContent = count || 1;
        } catch (e) {
            onlineEl.textContent = '1';
        }
    }
}

// ==================== تنظيف الغرف القديمة ====================
async function cleanMyRooms() {
    if (db && App.user.id && !String(App.user.id).startsWith('local_')) {
        try {
            await db
                .from('room_players')
                .delete()
                .eq('user_id', App.user.id);
            console.log('✅ تم تنظيف الغرف القديمة');
        } catch (e) {
            console.error('خطأ في التنظيف:', e);
        }
    }
}

// ==================== اختيار الفئة ====================
async function selectCategory(category) {
    if (App.room.status === 'waiting' || App.room.status === 'playing') {
        showToast('⚠️ أنت في غرفة بالفعل', 'error');
        return;
    }

    await cleanMyRooms();

    const total = App.user.purchased + App.user.earned;
    if (total < CONFIG.ENTRY_FEE + CONFIG.COMMISSION) {
        showToast(`❌ رصيدك غير كافٍ! تحتاج ${CONFIG.ENTRY_FEE + CONFIG.COMMISSION} نقطة`, 'error');
        return;
    }

    const cat = CATEGORIES[category];
    App.room = {
        id: null,
        category: category,
        players: [],
        status: 'waiting',
        correctChoice: null
    };
    App.gameStarted = false;
    App.isLeaving = false;

    try {
        if (db) {
            const { data: existingRooms } = await db
                .from('rooms')
                .select('*')
                .eq('category', category)
                .eq('status', 'waiting')
                .order('created_at', { ascending: true })
                .limit(1);

            let roomId;

            if (existingRooms && existingRooms.length > 0) {
                roomId = existingRooms[0].id;
            } else {
                const { data: newRoom, error } = await db
                    .from('rooms')
                    .insert([{ category, status: 'waiting', max_players: CONFIG.ROOM_SIZE }])
                    .select()
                    .single();

                if (error) throw error;
                roomId = newRoom.id;
            }

            App.room.id = roomId;

            await db
                .from('room_players')
                .insert([{ room_id: roomId, user_id: App.user.id }]);

            subscribeToRoom(roomId);
            await loadRoomPlayers(roomId);

        } else {
            App.room.id = 'local_' + Date.now();
            App.room.players = [App.user.username];
        }

    } catch (e) {
        console.error('خطأ:', e);
        showToast('⚠️ حدث خطأ، جرب تاني', 'error');
        return;
    }

    showToast(`🎮 انضممت لغرفة ${cat.name}`, 'success');

    const title = document.querySelector('#waitingView .section-title');
    if (title) title.textContent = `⏳ غرفة ${cat.name}`;

    updateWaitingUI();
    showView('waitingView');
}

// ==================== تحميل اللاعبين ====================
async function loadRoomPlayers(roomId) {
    if (!db) return;
    if (App.isLeaving) return;

    const { data: players, error } = await db
        .from('room_players')
        .select('*, users(username)')
        .eq('room_id', roomId);

    if (error) {
        console.error('خطأ في تحميل اللاعبين:', error);
        return;
    }

    App.room.players = players.map(p => p.users ? p.users.username : 'لاعب');
    updateWaitingUI();

    if (players.length >= CONFIG.ROOM_SIZE && !App.gameStarted && App.room.status === 'waiting') {
        App.gameStarted = true;
        App.room.status = 'playing';
        setTimeout(startGame, 800);
    }
}

// ==================== الاشتراك في Realtime ====================
function subscribeToRoom(roomId) {
    if (!db) return;

    if (App.realtimeChannel) {
        db.removeChannel(App.realtimeChannel);
    }

    App.realtimeChannel = db
        .channel('room_' + roomId + '_' + Date.now())
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
            (payload) => {
                console.log('🔄 تحديث:', payload);
                loadRoomPlayers(roomId);
            }
        )
        .subscribe((status) => {
            console.log('📡 حالة الاشتراك:', status);
        });
}

function updateWaitingUI() {
    const countEl = document.getElementById('playersCount');
    if (countEl) countEl.textContent = App.room.players.length;

    const hintEl = document.getElementById('waitingHint');
    if (hintEl) {
        if (App.room.players.length < 5) {
            hintEl.textContent = `في انتظار ${5 - App.room.players.length} لاعبين آخرين...`;
        } else {
            hintEl.textContent = '🔥 الغرفة اكتملت! استعد...';
        }
    }

    for (let i = 1; i <= 5; i++) {
        const slot = document.getElementById('slot' + i);
        if (slot) {
            if (App.room.players[i - 1]) {
                slot.textContent = '👤';
                slot.classList.add('filled');
            } else {
                slot.textContent = '';
                slot.classList.remove('filled');
            }
        }
    }
}

// ==================== بدء اللعبة ====================
function startGame() {
    App.room.status = 'playing';
    App.myChoice = null;

    const correctChoice = Math.floor(Math.random() * 5) + 1;
    App.room.correctChoice = correctChoice;

    const cat = CATEGORIES[App.room.category];
    const grid = document.getElementById('choicesGrid');
    if (!grid) return;

    grid.innerHTML = '';

    cat.choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerHTML = `<span class="choice-num">${i + 1}</span><span>${choice}</span>`;
        btn.onclick = () => makeChoice(i + 1);
        grid.appendChild(btn);
    });

    showView('gameView');
    startTimer();
}

// ==================== اختيار ====================
async function makeChoice(choiceNum) {
    if (App.myChoice !== null) return;
    App.myChoice = choiceNum;

    document.querySelectorAll('.choice-btn').forEach((btn, i) => {
        btn.disabled = true;
        if (i + 1 === choiceNum) btn.classList.add('selected');
    });

    if (db && App.room.id && !String(App.room.id).startsWith('local_')) {
        try {
            await db
                .from('room_players')
                .update({ choice: choiceNum })
                .eq('room_id', App.room.id)
                .eq('user_id', App.user.id);
        } catch (e) { console.error(e); }
    }

    stopTimer();
    setTimeout(showResult, 2000);
}

// ==================== المؤقت ====================
function startTimer() {
    App.timeLeft = CONFIG.CHOICE_TIMEOUT;
    const display = document.getElementById('timerValue');
    if (!display) return;

    display.textContent = App.timeLeft;
    display.classList.remove('danger');

    App.timerInterval = setInterval(() => {
        App.timeLeft--;
        display.textContent = App.timeLeft;

        if (App.timeLeft <= 3) display.classList.add('danger');

        if (App.timeLeft <= 0) {
            stopTimer();
            if (App.myChoice === null) {
                showToast('⏰ انتهى الوقت! تم اختيار لك تلقائياً', 'warning');

                App.myChoice = Math.floor(Math.random() * 5) + 1;

                App.user.purchased = Math.max(0, App.user.purchased - CONFIG.TIMEOUT_PENALTY);
                saveLocal();
                updateUI();

                showCoinToast(`-${CONFIG.TIMEOUT_PENALTY} نقطة (انتهى الوقت)`, '💰', 'gift');

                setTimeout(showResult, 1500);
            }
        }
    }, 1000);
}

function stopTimer() {
    if (App.timerInterval) {
        clearInterval(App.timerInterval);
        App.timerInterval = null;
    }
}

// ==================== عرض النتيجة ====================
async function showResult() {
    App.room.status = 'finished';

    const correct = App.room.correctChoice || Math.floor(Math.random() * 5) + 1;
    const correctName = CATEGORIES[App.room.category].choices[correct - 1];
    const myChoiceName = App.myChoice ? CATEGORIES[App.room.category].choices[App.myChoice - 1] : 'لم تختر';
    const isWinner = App.myChoice === correct;

    const totalCost = CONFIG.ENTRY_FEE + CONFIG.COMMISSION;

    if (App.user.purchased >= totalCost) {
        App.user.purchased -= totalCost;
    } else {
        const remaining = totalCost - App.user.purchased;
        App.user.purchased = 0;
        App.user.earned = Math.max(0, App.user.earned - remaining);
    }

    App.user.games_played = (App.user.games_played || 0) + 1;

    if (isWinner) {
        App.user.earned += CONFIG.WIN_REWARD;
        checkLevelUp();
        await checkReward500();
        showCoinToast(`+${CONFIG.WIN_REWARD} نقطة`, '🏆', 'win');
    } else {
        showCoinToast(`-${totalCost} نقطة`, '💸', 'gift');
    }

    if (db && App.user.id && !String(App.user.id).startsWith('local_')) {
        try {
            await db.from('users').update({
                purchased_points: App.user.purchased,
                earned_points: App.user.earned,
                level: App.user.level,
                games_played: App.user.games_played
            }).eq('id', App.user.id);
        } catch (e) { console.error(e); }
    }

    saveLocal();
    updateUI();

    const container = document.getElementById('resultContainer');
    const icon = document.getElementById('resultIcon');
    const title = document.getElementById('resultTitle');
    const text = document.getElementById('resultText');
    const reward = document.getElementById('resultReward');

    if (isWinner) {
        container.className = 'result-container winner';
        icon.textContent = '🏆';
        title.textContent = 'مبروك! فزت!';
        reward.textContent = `+${CONFIG.WIN_REWARD} نقطة ⭐`;
    } else {
        container.className = 'result-container loser';
        icon.textContent = '😢';
        title.textContent = 'للأسف، خسرت';
        reward.textContent = `-${totalCost} نقطة`;
    }

    text.innerHTML = `الخيار الصحيح: <strong>${correctName}</strong><br>اختيارك: <strong>${myChoiceName}</strong>`;

    showView('resultView');
}

// ==================== المستويات ====================
function checkLevelUp() {
    const games = App.user.games_played || 0;
    let newLevel = Math.floor(games / CONFIG.LEVELS_PER_GAMES) + 1;
    if (newLevel > 7) newLevel = 7;

    if (newLevel > App.user.level) {
        App.user.level = newLevel;
        showToast(`🎉 ترقيت! المستوى: ${CONFIG.LEVEL_NAMES[newLevel]}`, 'success');
    }
}

// ==================== مكافأة 500 نقطة ====================
async function checkReward500() {
    if (App.user.earned >= CONFIG.REWARD_THRESHOLD) {
        App.user.purchased += CONFIG.REWARD_AMOUNT + CONFIG.REWARD_GIFT;
        App.user.earned -= CONFIG.REWARD_THRESHOLD;

        showCoinToast(`+${CONFIG.REWARD_AMOUNT + CONFIG.REWARD_GIFT} نقطة هدية! 🎁`, '🎁', 'win');

        try {
            const message = `
🎉 *مستخدم وصل 500 نقطة!*

👤 الاسم: ${App.user.username}
📱 التليفون: ${App.user.phone}
🆔 ID: ${App.user.id}
⭐ النقاط المكتسبة: ${CONFIG.REWARD_THRESHOLD}
🎁 الهدية: ${CONFIG.REWARD_AMOUNT + CONFIG.REWARD_GIFT} نقطة
⏰ الوقت: ${new Date().toLocaleString('ar-EG')}
            `;

            const botUrl = `https://api.telegram.org/bot${CONFIG.ADMIN_BOT_TOKEN}/sendMessage`;

            await fetch(botUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CONFIG.ADMIN_CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
        } catch (e) { console.error('خطأ في الإشعار:', e); }
    }
}

// ==================== إعادة اللعب ====================
async function playAgain() {
    App.isLeaving = true;

    if (db && App.room.id && !String(App.room.id).startsWith('local_')) {
        try {
            await db.from('room_players')
                .delete()
                .eq('room_id', App.room.id)
                .eq('user_id', App.user.id);
        } catch (e) { console.error(e); }
    }

    if (App.realtimeChannel && db) {
        try {
            db.removeChannel(App.realtimeChannel);
        } catch (e) { console.error(e); }
        App.realtimeChannel = null;
    }

    App.room = { id: null, category: null, players: [], status: 'idle', correctChoice: null };
    App.myChoice = null;
    App.gameStarted = false;

    setTimeout(() => {
        App.isLeaving = false;
        showView('categoryView');
    }, 300);
}

async function leaveRoom() {
    await playAgain();
    showToast('👋 غادرت الغرفة', 'info');
}

// ==================== المتجر ====================
function openStore() {
    document.getElementById('storeModal').classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

function buyPackage(points, price) {
    App.pendingPurchase = { points, price };
    closeModal('storeModal');

    const paymentModal = document.getElementById('paymentModal');
    if (paymentModal) {
        document.getElementById('paymentPoints').textContent = points;
        document.getElementById('paymentPrice').textContent = price + ' جنيه';
        document.getElementById('paymentVodafone').textContent = CONFIG.VODAFONE;
        paymentModal.classList.add('active');
    }
}

// ==================== إرسال الدفع ====================
async function submitPayment() {
    const transNumber = document.getElementById('transNumberInput').value.trim();

    if (!transNumber || transNumber.length < 4) {
        showToast('❌ اكتب رقم عملية صحيح', 'error');
        return;
    }

    if (!App.pendingPurchase) {
        showToast('❌ حدث خطأ، جرب تاني', 'error');
        return;
    }

    showCoinToast('⏳ جاري إرسال الطلب...', '📤', 'win');

    try {
        // 1) حفظ الطلب في Supabase
        if (db && App.user.id && !String(App.user.id).startsWith('local_')) {
            const { error: dbError } = await db
                .from('purchase_requests')
                .insert([{
                    user_id: App.user.id,
                    username: App.user.username,
                    phone: App.user.phone,
                    points: App.pendingPurchase.points,
                    price: App.pendingPurchase.price,
                    trans_number: transNumber,
                    status: 'pending'
                }]);

            if (dbError) {
                console.error('❌ خطأ في Supabase:', dbError);
                showToast('⚠️ خطأ في الحفظ: ' + dbError.message, 'error');
            } else {
                console.log('✅ تم حفظ الطلب في Supabase');
            }
        }

        // 2) إرسال إشعار للبوت
        try {
            const message = `
🔔 *طلب شراء جديد*

👤 المستخدم: ${App.user.username}
📱 التليفون: ${App.user.phone}
🆔 ID: ${App.user.id}
💎 النقاط: ${App.pendingPurchase.points}
💰 السعر: ${App.pendingPurchase.price} جنيه
🔢 رقم العملية: ${transNumber}
⏰ الوقت: ${new Date().toLocaleString('ar-EG')}
            `;

            const botUrl = `https://api.telegram.org/bot${CONFIG.ADMIN_BOT_TOKEN}/sendMessage`;

            const response = await fetch(botUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CONFIG.ADMIN_CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });

            const result = await response.json();
            console.log('📤 نتيجة إرسال البوت:', result);
        } catch (botError) {
            console.error('❌ خطأ في إرسال البوت:', botError);
        }

        showCoinToast('✅ تم إرسال طلبك!', '📤', 'win');

        setTimeout(() => {
            closeModal('paymentModal');
            App.pendingPurchase = null;
            document.getElementById('transNumberInput').value = '';
        }, 2000);

    } catch (e) {
        console.error('❌ خطأ:', e);
        showToast('❌ حدث خطأ، حاول تاني', 'error');
    }
}

// ==================== الملف الشخصي ====================
function openProfile() {
    document.getElementById('profileName').textContent = App.user.username;
    document.getElementById('profilePhone').textContent = App.user.phone || '--';
    document.getElementById('profilePurchased').textContent = App.user.purchased;
    document.getElementById('profileEarned').textContent = App.user.earned;
    document.getElementById('profileLevel').textContent = CONFIG.LEVEL_NAMES[App.user.level] || 'مبتدئ 🌱';
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

// ==================== رفع الصورة ====================
async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 500000) {
        showToast('❌ الصورة كبيرة جداً (أقصى 500KB)', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64 = e.target.result;
        App.user.avatar_url = base64;
        saveLocal();
        updateUI();

        if (db && App.user.id && !String(App.user.id).startsWith('local_')) {
            try {
                await db.from('users').update({
                    avatar_url: base64
                }).eq('id', App.user.id);
            } catch (err) { console.error(err); }
        }

        showCoinToast('✅ تم تحديث الصورة!', '📷', 'win');
        openProfile();
    };
    reader.readAsDataURL(file);
}

// ==================== المشاركة ====================
async function shareGame() {
    if (App.user.shared) {
        showToast('⚠️ لقد حصلت على مكافأة المشاركة بالفعل!', 'error');
        return;
    }

    const shareUrl = 'https://neon-game-seven.vercel.app';
    const shareText = `🎮 العب معايا Neon Prediction! 🎯\nتوقع واكسب نقاط! 💎\n${shareUrl}`;

    try {
        if (navigator.share) {
            await navigator.share({
                title: 'Neon Prediction',
                text: shareText,
                url: shareUrl
            });
        } else {
            await navigator.clipboard.writeText(shareText);
            showToast('✅ تم نسخ الرابط!', 'success');
        }

        App.user.purchased += CONFIG.SHARE_BONUS;
        App.user.shared = true;
        saveLocal();
        updateUI();

        showCoinToast(`+${CONFIG.SHARE_BONUS} نقطة (مشاركة)`, '🎁', 'win');

        if (db && App.user.id && !String(App.user.id).startsWith('local_')) {
            try {
                await db.from('users').update({
                    purchased_points: App.user.purchased,
                    shared: true
                }).eq('id', App.user.id);
            } catch (e) { console.error(e); }
        }

        setTimeout(() => {
            const referralEl = document.getElementById('profileReferral');
            if (referralEl) referralEl.textContent = '✅ تمت المشاركة';
        }, 500);

    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error('خطأ في المشاركة:', e);
        }
    }
}

// ==================== الإشعارات ====================
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
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function showCoinToast(message, icon = '💰', type = 'win') {
    const toast = document.getElementById('coinToast');
    const iconEl = document.getElementById('coinToastIcon');
    const textEl = document.getElementById('coinToastText');
    if (!toast) return;

    if (iconEl) iconEl.textContent = icon;
    if (textEl) textEl.textContent = message;

    toast.className = 'coin-toast ' + type;
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ==================== تنظيف عند الخروج ====================
window.addEventListener('beforeunload', () => {
    if (db && App.user.id && App.room.id && !String(App.room.id).startsWith('local_')) {
        db.from('room_players')
            .delete()
            .eq('room_id', App.room.id)
            .eq('user_id', App.user.id);
    }
});
