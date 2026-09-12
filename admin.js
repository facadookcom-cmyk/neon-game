// ============================================
// لوحة تحكم الأدمن - v2
// ============================================

const SUPABASE_URL = 'https://qejudsvdtdbbmxlvymiw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vgUfkb0u8FIx7GFR_FF3bw_jE357yJD';
const ADMIN_PASSWORD = '()()()()';

let db = null;
let currentUser = null;
let allUsers = [];

if (typeof supabase !== 'undefined') {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ==================== تسجيل دخول الأدمن ====================
function loginAdmin() {
  const input = document.getElementById('passwordInput');
  const password = input.value;

  if (password === ADMIN_PASSWORD) {
    localStorage.setItem('admin_logged', 'true');
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('dashboard').classList.add('active');
    loadUsers();
    loadRequests();
    showToast('✅ أهلاً بك يا أدمن!', 'success');
  } else {
    showToast('❌ كلمة السر غلط', 'error');
    input.value = '';
  }
}

function logoutAdmin() {
  localStorage.removeItem('admin_logged');
  document.getElementById('dashboard').classList.remove('active');
  document.getElementById('loginScreen').classList.add('active');
  document.getElementById('passwordInput').value = '';
  showToast('👋 تم تسجيل الخروج');
}

window.addEventListener('load', () => {
  if (localStorage.getItem('admin_logged') === 'true') {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('dashboard').classList.add('active');
    loadUsers();
    loadRequests();
  }
});

// ==================== التابات ====================
function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  if (event && event.target) event.target.classList.add('active');

  if (tabId === 'usersTab') loadUsers();
  if (tabId === 'requestsTab') loadRequests();
  if (tabId === 'statsTab') loadStats();
}

// ==================== تحميل المستخدمين ====================
async function loadUsers() {
  const list = document.getElementById('usersList');
  list.innerHTML = '<p class="loading">جاري التحميل...</p>';

  if (!db) {
    list.innerHTML = '<p class="loading">❌ Supabase غير متصل</p>';
    return;
  }

  try {
    const { data, error } = await db
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allUsers = data || [];

    if (allUsers.length === 0) {
      list.innerHTML = '<p class="loading">لا يوجد مستخدمين</p>';
      return;
    }

    renderUsers(allUsers);

  } catch (e) {
    console.error(e);
    list.innerHTML = '<p class="loading">❌ حدث خطأ</p>';
  }
}

function renderUsers(users) {
  const list = document.getElementById('usersList');

  if (users.length === 0) {
    list.innerHTML = '<p class="loading">لا يوجد نتائج</p>';
    return;
  }

  list.innerHTML = users.map(u => `
    <div class="user-card">
      <div class="user-header">
        <h3>👤 ${u.username}</h3>
        <span style="color: var(--gold);">${getLevelName(u.level)}</span>
      </div>
      <div class="user-info">
        <div>📱 <strong>${u.phone || '--'}</strong></div>
        <div>💎 <strong>${u.purchased_points || 0}</strong> مدفوعة</div>
        <div>⭐ <strong>${u.earned_points || 0}</strong> مكتسبة</div>
        <div>🎮 <strong>${u.games_played || 0}</strong> لعبة</div>
      </div>
      <button class="btn-manage" onclick="openPointsModal('${u.id}')">
        💰 إدارة النقاط
      </button>
    </div>
  `).join('');
}

function filterUsers() {
  const query = document.getElementById('searchUsers').value.toLowerCase();
  const filtered = allUsers.filter(u => 
    u.username.toLowerCase().includes(query) || 
    (u.phone && u.phone.includes(query))
  );
  renderUsers(filtered);
}

function getLevelName(level) {
  const names = {
    1: 'مبتدئ 🌱', 2: 'هاوي 🥉', 3: 'محترف 🥈',
    4: 'خبير 🥇', 5: 'أسطورة 💎', 6: 'نخبة 👑', 7: 'أسطوري 🏆'
  };
  return names[level] || 'مبتدئ 🌱';
}

// ==================== نافذة إدارة النقاط ====================
function openPointsModal(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;

  currentUser = user;

  document.getElementById('modalUsername').textContent = user.username;
  document.getElementById('modalPhone').textContent = user.phone || '--';
  document.getElementById('modalCurrentPoints').textContent = 
    (user.purchased_points || 0) + (user.earned_points || 0);
  document.getElementById('pointsAmount').value = '';

  document.getElementById('pointsModal').classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ==================== إضافة نقاط ====================
async function addPoints() {
  if (!currentUser) return;

  const amount = parseInt(document.getElementById('pointsAmount').value);
  if (!amount || amount <= 0) {
    showToast('❌ اكتب عدد صحيح', 'error');
    return;
  }

  try {
    const newPoints = (currentUser.purchased_points || 0) + amount;

    const { error } = await db
      .from('users')
      .update({ purchased_points: newPoints })
      .eq('id', currentUser.id);

    if (error) throw error;

    showToast(`✅ تم إضافة ${amount} نقطة`, 'success');
    closeModal('pointsModal');
    loadUsers();

  } catch (e) {
    console.error(e);
    showToast('❌ حدث خطأ: ' + (e.message || ''), 'error');
  }
}

// ==================== خصم نقاط ====================
async function removePoints() {
  if (!currentUser) return;

  const amount = parseInt(document.getElementById('pointsAmount').value);
  if (!amount || amount <= 0) {
    showToast('❌ اكتب عدد صحيح', 'error');
    return;
  }

  const currentTotal = (currentUser.purchased_points || 0) + (currentUser.earned_points || 0);
  if (amount > currentTotal) {
    showToast('❌ النقاط غير كافية', 'error');
    return;
  }

  try {
    let purchased = currentUser.purchased_points || 0;
    let earned = currentUser.earned_points || 0;
    let remaining = amount;

    const deductFromPurchased = Math.min(purchased, remaining);
    purchased -= deductFromPurchased;
    remaining -= deductFromPurchased;

    earned = Math.max(0, earned - remaining);

    const { error } = await db
      .from('users')
      .update({
        purchased_points: purchased,
        earned_points: earned
      })
      .eq('id', currentUser.id);

    if (error) throw error;

    showToast(`✅ تم خصم ${amount} نقطة`, 'success');
    closeModal('pointsModal');
    loadUsers();

  } catch (e) {
    console.error(e);
    showToast('❌ حدث خطأ', 'error');
  }
}

// ==================== طلبات الشراء ====================
async function loadRequests() {
  const list = document.getElementById('requestsList');
  if (!list) return;
  
  list.innerHTML = '<p class="loading">جاري التحميل...</p>';

  if (!db) {
    list.innerHTML = '<p class="loading">❌ Supabase غير متصل</p>';
    return;
  }

  try {
    const { data, error } = await db
      .from('purchase_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      list.innerHTML = '<p class="loading">لا يوجد طلبات معلقة</p>';
      return;
    }

    list.innerHTML = data.map(r => `
      <div class="request-card">
        <div class="req-header">
          <h3>🛒 طلب شراء #${r.id.slice(0, 8)}</h3>
          <span style="color: var(--warning);">معلّق</span>
        </div>
        <div class="req-info">👤 <strong>${r.username || '--'}</strong></div>
        <div class="req-info">📱 <strong>${r.phone || '--'}</strong></div>
        <div class="req-info">💎 <strong>${r.points}</strong> نقطة</div>
        <div class="req-info">💰 <strong>${r.price}</strong> جنيه</div>
        <div class="req-info">🔢 رقم العملية: <strong>${r.trans_number}</strong></div>
        <div class="req-buttons">
          <button class="btn-approve" onclick="approveRequest('${r.id}', '${r.user_id}', ${r.points})">
            ✅ قبول
          </button>
          <button class="btn-reject" onclick="rejectRequest('${r.id}')">
            ❌ رفض
          </button>
        </div>
      </div>
    `).join('');

  } catch (e) {
    console.error(e);
    list.innerHTML = '<p class="loading">❌ حدث خطأ</p>';
  }
}

async function approveRequest(requestId, userId, points) {
  try {
    const { data: user } = await db
      .from('users')
      .select('purchased_points')
      .eq('id', userId)
      .single();

    if (!user) {
      showToast('❌ المستخدم غير موجود', 'error');
      return;
    }

    const newPoints = (user.purchased_points || 0) + points;
    await db
      .from('users')
      .update({ purchased_points: newPoints })
      .eq('id', userId);

    await db
      .from('purchase_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    showToast(`✅ تم قبول الطلب وإضافة ${points} نقطة`, 'success');
    loadRequests();
    loadUsers();

  } catch (e) {
    console.error(e);
    showToast('❌ حدث خطأ', 'error');
  }
}

async function rejectRequest(requestId) {
  try {
    await db
      .from('purchase_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    showToast('✅ تم رفض الطلب', 'success');
    loadRequests();

  } catch (e) {
    console.error(e);
    showToast('❌ حدث خطأ', 'error');
  }
}

// ==================== الإحصائيات ====================
async function loadStats() {
  const box = document.getElementById('statsBox');
  box.innerHTML = '<p class="loading">جاري التحميل...</p>';

  if (!db) {
    box.innerHTML = '<p class="loading">❌ Supabase غير متصل</p>';
    return;
  }

  try {
    const { count: usersCount } = await db
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: pendingCount } = await db
      .from('purchase_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: roomsCount } = await db
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting');

    const { data: usersData } = await db
      .from('users')
      .select('purchased_points, earned_points');

    const totalPoints = (usersData || []).reduce((sum, u) => 
      sum + (u.purchased_points || 0) + (u.earned_points || 0), 0
    );

    box.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${usersCount || 0}</div>
        <div class="stat-label">إجمالي المستخدمين</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🛒</div>
        <div class="stat-value">${pendingCount || 0}</div>
        <div class="stat-label">طلبات معلقة</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🎮</div>
        <div class="stat-value">${roomsCount || 0}</div>
        <div class="stat-label">غرف نشطة</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💎</div>
        <div class="stat-value">${totalPoints}</div>
        <div class="stat-label">إجمالي النقاط</div>
      </div>
    `;

  } catch (e) {
    console.error(e);
    box.innerHTML = '<p class="loading">❌ حدث خطأ</p>';
  }
}

// ==================== الإشعارات ====================
function showToast(message, type = 'info') {
  const toast = document.getElementById('adminToast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'admin-toast ' + type;
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => toast.classList.remove('show'), 3000);
}
