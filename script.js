// ============================================
// Neon Prediction - Real-time Game
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
    CHOICE_TIMEOUT: 5,
    VODAFONE: '01091602772',
    LEVELS: { 1: 0, 2: 100, 3: 300, 4: 700, 5: 1500, 6: 3000, 7: 6000 },
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
    user: { id: null, username: '', purchased: 0, earned: 0, level: 1 },
    room: { id: null, category: null, players: [], status: 'idle' },
    myChoice: null,
    timerInterval: null,
    timeLeft: 5,
    realtimeChannel: null
};

// ==================== بدء التطبيق ====================
window.addEventListener('load', () => {
    console.log('🎮 بدء التطبيق...');

    setTimeout(() => {
        const loader = document.getElementById('loadingScreen');
        if (loader) loader.classList.add('hidden');
    }, 1500);

    const saved = localStorage.getItem('neon_user');
    if (saved) {
        try {
            App.user = { ...App.user, ...JSON.parse(saved) };
            if (App.user.username) enterGame();
        } catch (e) { console.error(e); }
    }
});

// ==================== تسجيل الدخول ====================
async function login() {
    const input = document.getElementById('usernameInput');
    const name = input.value.trim();

    if (!name || name.length < 2) {
        showToast('❌ اكتب اسم صحيح', 'error');
        return;
    }

    if (name.length > 20) {
        showToast('❌ الاسم طويل جداً', 'error');
        return;
    }

    if (!db) {
        App.user = { id: 'local_' + Date.now(), username: name, purchased: 100, earned: 0, level: 1 };
        saveLocal();
        showToast(`🎉 أهلاً ${name}!`, 'success');
        enterGame();
        return;
    }

    try {
        // البحث عن المستخدم
        const { data: existing } = await db
            .from('users')
            .select('*')
            .eq('username', name)
            .maybeSingle();

        if (existing) {
            App.user = {
                id: existing.id,
                username: existing.username,
                purchased: existing.purchased_points || 0,
                earned: existing.earned_points || 0,
                level: existing.level || 1
            };
            showToast(`👋 أهلاً بعودتك ${name}!`, 'success');
        } else {
            const { data: newUser, error: createError } = await db
                .from('users')
                .insert([{ username: name, purchased_points: 100, earned_points: 0, level: 1 }])
                .select()
                .single();

            if (createError) throw createError;

            App.user = {
                id: newUser.id,
                username: newUser.username,
                purchased: newUser.purchased_points,
                earned: newUser.earned_points,
                level: newUser.level
            };
            showToast(`🎉 أهلاً بك ${name}!`, 'success');
        }

        saveLocal();
        enterGame();

    } catch (e) {
        console.error('❌ خطأ:', e);
        App.user = { id: 'local_' + Date.now(), username: name, purchased: 100, earned: 0, level: 1 };
        saveLocal();
        showToast(`🎉 أهلاً ${name}! (محلي)`, 'success');
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
}

function updateUI() {
    const total = App.user.purchased + App.user.earned;
    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    const pointsEl = document.getElementById('userPoints');
    const levelEl = document.getElementById('userLevel');

    if (nameEl) nameEl.textContent = App.user.username;
    if (avatarEl) avatarEl.textContent = App.user.username.charAt(0).toUpperCase();
    if (pointsEl) pointsEl.textContent = total;
    if (levelEl) levelEl.textContent = CONFIG.LEVEL_NAMES[App.user.level] || 'مبتدئ';
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

// ==================== اختيار الفئة ====================
async function selectCategory(category) {
    if (App.room.status === 'waiting' || App.room.status === 'playing') {
        showToast('⚠️ أنت في غرفة بالفعل', 'error');
        return;
    }

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
        status: 'waiting'
    };

    try {
        if (db) {
            // البحث عن غرفة موجودة في نفس الفئة
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

            // انضم للغرفة
            const { error: joinError } = await db
                .from('room_players')
                .insert([{ room_id: roomId, user_id: App.user.id }]);

            if (joinError && joinError.code !== '23505') {
                console.error('خطأ في الانضمام:', joinError);
            }

            // اشترك في Realtime
            subscribeToRoom(roomId);

            // تحديث اللاعبين
            await loadRoomPlayers(roomId);

        } else {
            // وضع محلي (بدون Supabase)
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

    // لو الغرفة اكتملت، ابدأ اللعبة
    if (players.length >= CONFIG.ROOM_SIZE && App.room.status === 'waiting') {
        App.room.status = 'playing';
        startGame();
    }
}

// ==================== الاشتراك في Realtime ====================
function subscribeToRoom(roomId) {
    if (!db) return;

    // إلغاء الاشتراك القديم
    if (App.realtimeChannel) {
        db.removeChannel(App.realtimeChannel);
    }

    App.realtimeChannel = db
        .channel('room_' + roomId)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
            (payload) => {
                console.log('🔄 تحديث في الغرفة:', payload);
                loadRoomPlayers(roomId);
            }
        )
        .subscribe((status) => {
            console.log('📡 حالة الاشتراك:', status);
        });
}

// ==================== واجهة الانتظار ====================
function updateWaitingUI() {
    const countEl = document.getElementById('playersCount');
    if (countEl) countEl.textContent = App.room.players.length;

    for (let i = 2; i <= 5; i++) {
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

    // اختيار الخيار الصحيح
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

    showToast(`✅ اخترت: ${CATEGORIES[App.room.category].choices[choiceNum - 1]}`, 'success');

    // حفظ الاختيار في Supabase
    if (db && App.room.id && !App.room.id.startsWith('local_')) {
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
                showToast('⏰ انتهى الوقت!', 'error');
                setTimeout(showResult, 1000);
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

    if (isWinner) {
        App.user.earned += CONFIG.WIN_REWARD;
        checkLevelUp();
        checkReward500();
    }

    // تحديث Supabase
    if (db && App.user.id && !String(App.user.id).startsWith('local_')) {
        try {
            await db.from('users').update({
                purchased_points: App.user.purchased,
                earned_points: App.user.earned,
                level: App.user.level
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

// ==================== المستويات والمكافآت ====================
function checkLevelUp() {
    let newLevel = 1;
    for (let lvl in CONFIG.LEVELS) {
        if (App.user.earned >= CONFIG.LEVELS[lvl]) newLevel = parseInt(lvl);
    }
    if (newLevel > App.user.level) {
        App.user.level = newLevel;
        showToast(`🎉 ترقيت! ${CONFIG.LEVEL_NAMES[newLevel]}`, 'success');
    }
}

function checkReward500() {
    if (App.user.earned >= 500) {
        App.user.purchased += 500;
        App.user.earned -= 500;
        showToast('💎 مبروك! 500 نقطة إضافية!', 'success');
    }
}

// ==================== إعادة اللعب ====================
function playAgain() {
    // إلغاء الاشتراك القديم
    if (App.realtimeChannel && db) {
        db.removeChannel(App.realtimeChannel);
        App.realtimeChannel = null;
    }

    App.room = { id: null, category: null, players: [], status: 'idle', correctChoice: null };
    App.myChoice = null;
    showView('categoryView');
}

function leaveRoom() {
    playAgain();
    showToast('👋 غادرت الغرفة');
}

// ==================== المتجر والملف الشخصي ====================
function openStore() { document.getElementById('storeModal').classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function buyPackage(points, price) {
    showToast(`💎 اخترت: ${points} نقطة = ${price} جنيه`, 'success');
    setTimeout(() => {
        showToast(`📱 حوّل ${price} جنيه على: ${CONFIG.VODAFONE}`, 'success');
        setTimeout(() => {
            showToast('✅ تم إرسال طلبك للإدارة', 'success');
            App.user.purchased += points;
            saveLocal();
            updateUI();
            closeModal('storeModal');
        }, 2500);
    }, 2000);
}

function openProfile() {
    document.getElementById('profileName').textContent = App.user.username;
    document.getElementById('profileAvatar').textContent = App.user.username.charAt(0).toUpperCase();
    document.getElementById('profilePurchased').textContent = App.user.purchased;
    document.getElementById('profileEarned').textContent = App.user.earned;
    document.getElementById('profileLevel').textContent = CONFIG.LEVEL_NAMES[App.user.level] || 'مبتدئ';
    document.getElementById('profileModal').classList.add('active');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast ' + type;
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => toast.classList.remove('show'), 3000);
}