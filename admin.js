// ============================================
// لوحة التحكم - Admin Panel v3
// ============================================

const SUPABASE_URL = 'https://qejudsvdtdbbmxlvymiw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vgUfkb0u8FIx7GFR_FF3bw_jE357yJD';
const ADMIN_PASSWORD = '()()()()';

let db = null;
let currentUser = null;
let transferUser = null;
let allUsers = [];
let allRequests = [];
let allLogs = [];
let allRooms = [];
let currentRequestFilter = 'pending';
let activityChart = null;

if (typeof supabase !== 'undefined') {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ==================== تسجيل الدخول ====================
function loginAdmin() {
  const input = document.getElementById('passwordInput');
  if (input.value === ADMIN_PASSWORD) {
    localStorage.setItem('admin_logged', 'true');
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('dashboard').classList.add('active');
    updatePageDate();
    refreshAll();
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
    updatePageDate();
    refreshAll();
  }
});

function updatePageDate() {
  const now = new Date();
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const dateStr = `${days[now.getDay()]}، ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  const el = document.getElementById('pageDate');
  if (el) el.textContent = dateStr;
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function refreshAll() {
  loadStats();
  loadUsers();
  loadRequests();
  loadLogs();
  loadRooms();
  loadTopUsers();
  loadRecentActivity();
  loadTransferHistory();
}

// ==================== التابات ====================
const TAB_TITLES = {
  dashboardTab: 'لوحة المعلومات',
  usersTab: 'إدارة المستخدمين',
  requestsTab: 'طلبات الشراء',
  transferTab: 'تحويل النقاط',
  logsTab: 'سجل النشاط',
  roomsTab: 'الغرف النشطة'
};

function showTab(tabId, event) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  if (event && event.currentTarget) event.currentTarget.classList.add('active');

  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = TAB_TITLES[tabId] || 'لوحة التحكم';

  if (tabId === 'usersTab') loadUsers();
  if (tabId === 'requestsTab') loadRequests();
  if (tabId === 'logsTab') loadLogs();
  if (tabId === 'roomsTab') loadRooms();
  if (tabId === 'dashboardTab') { loadTopUsers(); loadRecentActivity(); loadStats(); }
  if (tabId === 'transferTab') loadTransferHistory();
}

// ==================== الإحصائيات ====================
async function loadStats() {
  if (!db) return;

  try {
    const { count: usersCount } = await db.from('users').select('*', { count: 'exact', head: true });
    const { count: pendingCount } = await db.from('purchase_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: roomsCount } = await db.from('rooms').select('*', { count: 'exact', head: true }).eq('status', 'waiting');
    const { data: usersData } = await db.from('users').select('purchased_points, earned_points');

    const totalPoints = (usersData || []).reduce((sum, u) => sum + (u.purchased_points || 0) + (u.earned_points || 0), 0);

    document.getElementById('statUsers').textContent = usersCount || 0;
    document.getElementById('statRequests').textContent = pendingCount || 0;
    document.getElementById('statRooms').textContent = roomsCount || 0;
    document.getElementById('statPoints').textContent = totalPoints.toLocaleString();

    // رسم بياني
    drawActivityChart();

  } catch (e) {
    console.error('خطأ في loadStats:', e);
  }
}

// ==================== الرسم البياني ====================
async function drawActivityChart() {
  if (!db) return;
  const canvas = document.getElementById('activityChart');
  if (!canvas) return;

  try {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      last7Days.push(d);
    }

    const { data: allUsersData } = await db.from('users').select('created_at');
    const { data: allRequestsData } = await db.from('purchase_requests').select('created_at');

    const userCounts = last7Days.map(day => {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      return (allUsersData || []).filter(u => {
        const d = new Date(u.created_at);
        return d >= day && d < nextDay;
      }).length;
    });

    const requestCounts = last7Days.map(day => {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      return (allRequestsData || []).filter(r => {
        const d = new Date(r.created_at);
        return d >= day && d < nextDay;
      }).length;
    });

    const labels = last7Days.map(d => `${d.getDate()}/${d.getMonth() + 1}`);

    if (activityChart) activityChart.destroy();

    const ctx = canvas.getContext('2d');
    activityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'مستخدمين جدد',
            data: userCounts,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
            borderWidth: 2,
            pointBackgroundColor: '#3b82f6',
            pointRadius: 4
          },
          {
            label: 'طلبات شراء',
            data: requestCounts,
            borderColor: '#f0b050',
            backgroundColor: 'rgba(240, 176, 80, 0.1)',
            tension: 0.4,
            fill: true,
            borderWidth: 2,
            pointBackgroundColor: '#f0b050',
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#8b96ab', stepSize: 1, precision: 0 },
            grid: { color: 'rgba(139, 150, 171, 0.1)' }
          },
          x: {
            ticks: { color: '#8b96ab' },
            grid: { display: false }
          }
        }
      }
    });

  } catch (e) {
    console.error('خطأ في الرسم البياني:', e);
  }
}

// ==================== أكثر المستخدمين نشاطاً ====================
async function loadTopUsers() {
  const container = document.getElementById('topUsers');
  if (!container || !db) return;

  try {
    const { data } = await db
      .from('users')
      .select('username, purchased_points, earned_points, games_played')
      .order('games_played', { ascending: false })
      .limit(5);

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="loading">لا يوجد بيانات</p>';
      return;
    }

    container.innerHTML = data.map((u, i) => {
      const total = (u.purchased_points || 0) + (u.earned_points || 0);
      const medals = ['🥇', '🥈', '🥉', '4', '5'];
      return `
        <div class="top-user-item">
          <div class="top-rank">${medals[i]}</div>
          <div class="top-user-info">
            <div class="top-user-name">${u.username}</div>
            <div class="top-user-points">${total} نقطة • ${u.games_played || 0} لعبة</div>
          </div>
        </div>
      `;
    }).join('');

  } catch (e) {
    container.innerHTML = '<p class="loading">❌ خطأ</p>';
  }
}

// ==================== آخر النشاطات ====================
async function loadRecentActivity() {
  const container = document.getElementById('recentActivity');
  if (!container || !db) return;

  try {
    const { data } = await db
      .from('transactions')
      .select('*, users(username)')
      .order('created_at', { ascending: false })
      .limit(8);

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="loading">لا يوجد نشاطات</p>';
      return;
    }

    container.innerHTML = data.map(t => {
      const icons = {
        purchase: '💎',
        earn: '⭐',
        deduct: '💸',
        win: '🏆',
        entry_fee: '🎮',
        reward_500: '🎁',
        referral: '👥',
        admin_add: '➕',
        transfer: '💸'
      };
      const icon = icons[t.type] || '📌';
      const time = new Date(t.created_at).toLocaleString('ar-EG', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
      });
      return `
        <div class="activity-item">
          <div class="activity-icon">${icon}</div>
          <div class="activity-content">
            <div class="activity-text"><strong>${t.users?.username || 'مستخدم'}</strong> - ${t.description || t.type}</div>
            <div class="activity-time">${time}</div>
          </div>
        </div>
      `;
    }).join('');

  } catch (e) {
    container.innerHTML = '<p class="loading">لا يوجد نشاطات</p>';
  }
}

// ==================== المستخدمين ====================
async function loadUsers() {
  const list = document.getElementById('usersList');
  if (!list) return;
  list.innerHTML = '<p class="loading">جاري التحميل...</p>';

  if (!db) {
    list.innerHTML = '<p class="loading">❌ Supabase غير متصل</p>';
    return;
  }

  try {
    const { data, error } = await db.from('users').select('*').order('created_at', { ascending: false });
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
  if (!list) return;

  if (users.length === 0) {
    list.innerHTML = '<p class="loading">لا يوجد نتائج</p>';
    return;
  }

  list.innerHTML = users.map(u => {
    const total = (u.purchased_points || 0) + (u.earned_points || 0);
    return `
      <div class="user-card">
        <div class="user-header">
          <h3>👤 ${u.username}</h3>
          <span class="user-level">${getLevelName(u.level)}</span>
        </div>
        <div class="user-info">
          <div>📱 <strong>${u.phone || '--'}</strong></div>
          <div>💎 <strong>${u.purchased_points || 0}</strong></div>
          <div>⭐ <strong>${u.earned_points || 0}</strong></div>
          <div>🎮 <strong>${u.games_played || 0}</strong></div>
          <div>📊 <strong>${total}</strong> الإجمالي</div>
          <div>🏆 <strong>${getLevelName(u.level)}</strong></div>
        </div>
        <button class="btn-manage" onclick="openPointsModal('${u.id}')">💰 إدارة النقاط</button>
      </div>
    `;
  }).join('');
}

function filterUsers() {
  const query = document.getElementById('searchUsers').value.toLowerCase();
  const levelFilter = document.getElementById('filterLevel').value;
  const sortBy = document.getElementById('sortUsers')?.value || 'newest';

  let filtered = allUsers.filter(u =>
    u.username.toLowerCase().includes(query) ||
    (u.phone && u.phone.includes(query))
  );

  if (levelFilter) {
    filtered = filtered.filter(u => String(u.level) === levelFilter);
  }

  // ترتيب
  if (sortBy === 'points_desc') {
    filtered.sort((a, b) => ((b.purchased_points || 0) + (b.earned_points || 0)) - ((a.purchased_points || 0) + (a.earned_points || 0)));
  } else if (sortBy === 'points_asc') {
    filtered.sort((a, b) => ((a.purchased_points || 0) + (a.earned_points || 0)) - ((b.purchased_points || 0) + (b.earned_points || 0)));
  } else if (sortBy === 'games_desc') {
    filtered.sort((a, b) => (b.games_played || 0) - (a.games_played || 0));
  }

  renderUsers(filtered);
}

function getLevelName(level) {
  const names = {
    1: 'مبتدئ 🌱', 2: 'هاوي 🥉', 3: 'محترف 🥈',
    4: 'خبير 🥇', 5: 'أسطورة 💎', 6: 'نخبة 👑', 7: 'أسطوري 🏆'
  };
  return names[level] || 'مبتدئ 🌱';
}

function exportUsers() {
  const csv = ['الاسم,التليفون,المدفوعة,المكتسبة,المستوى,عدد الألعاب'];
  allUsers.forEach(u => {
    csv.push(`${u.username},${u.phone || ''},${u.purchased_points || 0},${u.earned_points || 0},${u.level || 1},${u.games_played || 0}`);
  });
  downloadCSV(csv.join('\n'), 'users.csv');
}

function downloadCSV(content, filename) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// ==================== نافذة إدارة النقاط ====================
function openPointsModal(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;

  currentUser = user;

  document.getElementById('modalUsername').textContent = user.username;
  document.getElementById('modalPhone').textContent = user.phone || '--';
  document.getElementById('modalCurrentPoints').textContent = user.purchased_points || 0;
  document.getElementById('modalEarnedPoints').textContent = user.earned_points || 0;
  document.getElementById('pointsAmount').value = '';
  document.getElementById('pointsReason').value = '';

  document.getElementById('pointsModal').classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function setAmount(n) {
  document.getElementById('pointsAmount').value = n;
}

async function addPoints() {
  if (!currentUser) return;
  const amount = parseInt(document.getElementById('pointsAmount').value);
  const reason = document.getElementById('pointsReason').value.trim();
  if (!amount || amount <= 0) return showToast('❌ اكتب عدد صحيح', 'error');

  try {
    const newPoints = (currentUser.purchased_points || 0) + amount;
    const { error } = await db.from('users').update({ purchased_points: newPoints }).eq('id', currentUser.id);
    if (error) throw error;

    // سجل النشاط
    await db.from('transactions').insert([{
      user_id: currentUser.id,
      amount: amount,
      type: 'admin_add',
      description: reason || `إضافة ${amount} نقطة من الأدمن`
    }]);

    showToast(`✅ تم إضافة ${amount} نقطة`, 'success');
    closeModal('pointsModal');
    refreshAll();
  } catch (e) {
    console.error(e);
    showToast('❌ حدث خطأ', 'error');
  }
}

async function removePoints() {
  if (!currentUser) return;
  const amount = parseInt(document.getElementById('pointsAmount').value);
  const reason = document.getElementById('pointsReason').value.trim();
  if (!amount || amount <= 0) return showToast('❌ اكتب عدد صحيح', 'error');

  const currentTotal = (currentUser.purchased_points || 0) + (currentUser.earned_points || 0);
  if (amount > currentTotal) return showToast('❌ النقاط غير كافية', 'error');

  try {
    let purchased = currentUser.purchased_points || 0;
    let earned = currentUser.earned_points || 0;
    let remaining = amount;

    const deductFromPurchased = Math.min(purchased, remaining);
    purchased -= deductFromPurchased;
    remaining -= deductFromPurchased;

    earned = Math.max(0, earned - remaining);

    const { error } = await db.from('users').update({
      purchased_points: purchased,
      earned_points: earned
    }).eq('id', currentUser.id);
    if (error) throw error;

    // سجل النشاط
    await db.from('transactions').insert([{
      user_id: currentUser.id,
      amount: -amount,
      type: 'admin_remove',
      description: reason || `خصم ${amount} نقطة من الأدمن`
    }]);

    showToast(`✅ تم خصم ${amount} نقطة`, 'success');
    closeModal('pointsModal');
    refreshAll();
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
      .eq('status', currentRequestFilter)
      .order('created_at', { ascending: false });

    if (error) throw error;
    allRequests = data || [];

    if (!data || data.length === 0) {
      list.innerHTML = '<p class="loading">لا يوجد طلبات</p>';
      return;
    }

    list.innerHTML = data.map(r => {
      const statusClass = r.status === 'approved' ? 'approved' : (r.status === 'rejected' ? 'rejected' : '');
      const statusText = r.status === 'approved' ? 'مقبول ✅' : (r.status === 'rejected' ? 'مرفوض ❌' : 'معلّق ⏳');
      const time = new Date(r.created_at).toLocaleString('ar-EG', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
      });

      return `
        <div class="request-card ${statusClass}">
          <div class="req-header">
            <h3 class="${statusClass}">🛒 طلب #${String(r.id).slice(0, 6)}</h3>
            <span style="font-size:12px;color:var(--text-secondary)">${statusText}</span>
          </div>
          <div class="req-info">👤 <strong>${r.username || '--'}</strong></div>
          <div class="req-info">📱 <strong>${r.phone || '--'}</strong></div>
          <div class="req-info">💎 <strong>${r.points}</strong> نقطة</div>
          <div class="req-info">💰 <strong>${r.price}</strong> جنيه</div>
          <div class="req-info">🔢 رقم العملية: <strong>${r.trans_number}</strong></div>
          <div class="req-info">⏰ ${time}</div>
          ${r.status === 'pending' ? `
            <div class="req-buttons">
              <button class="btn-approve" onclick="approveRequest('${r.id}', '${r.user_id}', ${r.points})">✅ قبول</button>
              <button class="btn-reject" onclick="rejectRequest('${r.id}')">❌ رفض</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

  } catch (e) {
    console.error(e);
    list.innerHTML = '<p class="loading">❌ حدث خطأ</p>';
  }
}

function filterRequests(status, event) {
  currentRequestFilter = status;
  document.querySelectorAll('#requestsTab .filter-btn').forEach(b => b.classList.remove('active'));
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
  loadRequests();
}

async function approveRequest(requestId, userId, points) {
  try {
    const { data: user } = await db.from('users').select('purchased_points, username').eq('id', userId).single();
    if (!user) return showToast('❌ المستخدم غير موجود', 'error');

    const newPoints = (user.purchased_points || 0) + points;
    await db.from('users').update({ purchased_points: newPoints }).eq('id', userId);
    await db.from('purchase_requests').update({ status: 'approved' }).eq('id', requestId);

    // سجل النشاط
    await db.from('transactions').insert([{
      user_id: userId,
      amount: points,
      type: 'purchase',
      description: `تم قبول طلب شراء ${points} نقطة`
    }]);

    showToast(`✅ تم قبول الطلب وإضافة ${points} نقطة`, 'success');
    refreshAll();
  } catch (e) {
    console.error(e);
    showToast('❌ حدث خطأ', 'error');
  }
}

async function rejectRequest(requestId) {
  try {
    await db.from('purchase_requests').update({ status: 'rejected' }).eq('id', requestId);
    showToast('✅ تم رفض الطلب', 'success');
    refreshAll();
  } catch (e) {
    console.error(e);
    showToast('❌ حدث خطأ', 'error');
  }
}

// ==================== تحويل النقاط ====================
let transferSearchTimeout = null;

function searchTransferUser() {
  clearTimeout(transferSearchTimeout);
  transferSearchTimeout = setTimeout(() => {
    const query = document.getElementById('transferSearch').value.toLowerCase().trim();
    const results = document.getElementById('transferResults');

    if (!query || query.length < 2) {
      results.innerHTML = '';
      return;
    }

    const matched = allUsers.filter(u =>
      u.username.toLowerCase().includes(query) ||
      (u.phone && u.phone.includes(query))
    ).slice(0, 5);

    if (matched.length === 0) {
      results.innerHTML = '<p style="color:var(--muted);font-size:12px;padding:8px;">لا يوجد نتائج</p>';
      return;
    }

    results.innerHTML = matched.map(u => `
      <div class="search-result-item" onclick="selectTransferUser('${u.id}')">
        <div>
          <strong>${u.username}</strong>
          <small>${u.phone || '--'}</small>
        </div>
        <small>💎 ${(u.purchased_points || 0) + (u.earned_points || 0)}</small>
      </div>
    `).join('');
  }, 300);
}

function selectTransferUser(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;

  transferUser = user;

  document.getElementById('transferResults').innerHTML = '';
  document.getElementById('transferSearch').value = '';
  document.getElementById('selectedUserGroup').style.display = 'block';

  const card = document.getElementById('selectedUserCard');
  const total = (user.purchased_points || 0) + (user.earned_points || 0);
  card.innerHTML = `
    <div>
      <strong>👤 ${user.username}</strong>
      <small>📱 ${user.phone || '--'}</small>
      <small>💎 الرصيد الحالي: ${total} نقطة</small>
    </div>
    <button onclick="resetTransfer()" style="background:transparent;border:1px solid var(--danger);color:var(--danger);border-radius:8px;padding:6px 12px;cursor:pointer;font-family:Cairo">تغيير</button>
  `;

  updateTransferSummary();
}

function setTransferAmount(n) {
  document.getElementById('transferAmount').value = n;
  updateTransferSummary();
}

function updateTransferSummary() {
  if (!transferUser) return;

  const amount = parseInt(document.getElementById('transferAmount').value) || 0;
  const current = (transferUser.purchased_points || 0) + (transferUser.earned_points || 0);
  const after = current + amount;

  document.getElementById('transferSummary').style.display = 'block';
  document.getElementById('summaryUser').textContent = transferUser.username;
  document.getElementById('summaryCurrent').textContent = current + ' نقطة';
  document.getElementById('summaryAfter').textContent = after + ' نقطة';
}

document.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'transferAmount') {
    updateTransferSummary();
  }
});

async function executeTransfer() {
  if (!transferUser) return showToast('❌ اختر مستخدم أولاً', 'error');
  const amount = parseInt(document.getElementById('transferAmount').value);
  if (!amount || amount <= 0) return showToast('❌ اكتب عدد صحيح', 'error');
  const reason = document.getElementById('transferReason').value.trim();

  try {
    const newPoints = (transferUser.purchased_points || 0) + amount;

    const { error } = await db.from('users').update({ purchased_points: newPoints }).eq('id', transferUser.id);
    if (error) throw error;

    // سجل النشاط
    await db.from('transactions').insert([{
      user_id: transferUser.id,
      amount: amount,
      type: 'transfer',
      description: reason || `تحويل ${amount} نقطة من الأدمن`
    }]);

    showToast(`✅ تم تحويل ${amount} نقطة إلى ${transferUser.username}`, 'success');
    resetTransfer();
    refreshAll();
  } catch (e) {
    console.error(e);
    showToast('❌ حدث خطأ', 'error');
  }
}

function resetTransfer() {
  transferUser = null;
  document.getElementById('transferSearch').value = '';
  document.getElementById('transferResults').innerHTML = '';
  document.getElementById('selectedUserGroup').style.display = 'none';
  document.getElementById('transferAmount').value = '';
  document.getElementById('transferReason').value = '';
  document.getElementById('transferSummary').style.display = 'none';
}

async function loadTransferHistory() {
  const container = document.getElementById('transferHistory');
  if (!container || !db) return;

  try {
    const { data } = await db
      .from('transactions')
      .select('*, users(username)')
      .eq('type', 'transfer')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="loading">لا يوجد تحويلات سابقة</p>';
      return;
    }

    container.innerHTML = data.map(t => {
      const time = new Date(t.created_at).toLocaleString('ar-EG', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
      });
      return `
        <div class="history-item">
          <div>
            <strong>${t.users?.username || 'مستخدم'}</strong>
            <div style="font-size:11px;color:var(--muted)">${t.description || 'تحويل'}</div>
          </div>
          <div style="text-align:left">
            <div class="amount">+${t.amount}</div>
            <div class="time">${time}</div>
          </div>
        </div>
      `;
    }).join('');

  } catch (e) {
    container.innerHTML = '<p class="loading">لا يوجد تحويلات</p>';
  }
}

// ==================== سجل النشاط ====================
async function loadLogs() {
  const list = document.getElementById('logsList');
  if (!list) return;
  list.innerHTML = '<p class="loading">جاري التحميل...</p>';

  if (!db) {
    list.innerHTML = '<p class="loading">❌ Supabase غير متصل</p>';
    return;
  }

  try {
    const { data, error } = await db
      .from('transactions')
      .select('*, users(username, phone)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    allLogs = data || [];

    if (allLogs.length === 0) {
      list.innerHTML = '<p class="loading">لا يوجد نشاطات</p>';
      return;
    }

    renderLogs(allLogs);

  } catch (e) {
    console.error(e);
    list.innerHTML = '<p class="loading">❌ حدث خطأ</p>';
  }
}

function renderLogs(logs) {
  const list = document.getElementById('logsList');
  if (!list) return;

  if (logs.length === 0) {
    list.innerHTML = '<p class="loading">لا يوجد نتائج</p>';
    return;
  }

  const icons = {
    purchase: '💎', earn: '⭐', deduct: '💸', win: '🏆',
    entry_fee: '🎮', reward_500: '🎁', referral: '👥',
    admin_add: '➕', admin_remove: '➖', transfer: '💸'
  };

  list.innerHTML = logs.map(t => {
    const icon = icons[t.type] || '📌';
    const time = new Date(t.created_at).toLocaleString('ar-EG', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
    });
    const amountClass = (t.amount || 0) >= 0 ? 'positive' : 'negative';
    const amountText = (t.amount || 0) >= 0 ? `+${t.amount}` : `${t.amount}`;

    return `
      <div class="log-item">
        <div class="log-icon ${t.type}">${icon}</div>
        <div class="log-content">
          <div class="log-text">
            <strong>${t.users?.username || 'مستخدم'}</strong> - ${t.description || t.type}
          </div>
          <div class="log-meta">
            <span>📱 ${t.users?.phone || '--'}</span>
            <span>⏰ ${time}</span>
          </div>
        </div>
        <div class="log-amount ${amountClass}">${amountText}</div>
      </div>
    `;
  }).join('');
}

function filterLogs() {
  const query = document.getElementById('searchLogs').value.toLowerCase();
  const typeFilter = document.getElementById('filterLogType').value;

  let filtered = allLogs.filter(l =>
    (l.users?.username || '').toLowerCase().includes(query) ||
    (l.description || '').toLowerCase().includes(query) ||
    (l.users?.phone || '').includes(query)
  );

  if (typeFilter) {
    filtered = filtered.filter(l => l.type === typeFilter);
  }

  renderLogs(filtered);
}

function exportLogs() {
  const csv = ['الاسم,التليفون,النوع,المبلغ,الوصف,التاريخ'];
  allLogs.forEach(l => {
    csv.push(`${l.users?.username || ''},${l.users?.phone || ''},${l.type},${l.amount || 0},"${l.description || ''}",${l.created_at}`);
  });
  downloadCSV(csv.join('\n'), 'activity_logs.csv');
}

// ==================== الغرف ====================
async function loadRooms() {
  const list = document.getElementById('roomsList');
  if (!list) return;
  list.innerHTML = '<p class="loading">جاري التحميل...</p>';

  if (!db) {
    list.innerHTML = '<p class="loading">❌ Supabase غير متصل</p>';
    return;
  }

  try {
    const { data, error } = await db
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    if (!data || data.length === 0) {
      list.innerHTML = '<p class="loading">لا يوجد غرف</p>';
      return;
    }

    list.innerHTML = data.map(r => {
      const status = r.status === 'waiting' ? '⏳ في انتظار' : (r.status === 'playing' ? '🎮 يلعبون' : '✅ انتهت');
      return `
        <div class="room-card">
          <div class="room-header">
            <h3>🎮 ${r.category || 'غرفة'}</h3>
            ${r.code ? `<span class="room-code-badge">${r.code}</span>` : ''}
          </div>
          <div class="room-info">الحالة: <strong>${status}</strong></div>
          <div class="room-info">الحد الأقصى: <strong>${r.max_players || 3}</strong></div>
          <div class="room-info">خاصة: <strong>${r.is_private ? 'نعم 🔒' : 'لا'}</strong></div>
        </div>
      `;
    }).join('');

  } catch (e) {
    console.error(e);
    list.innerHTML = '<p class="loading">❌ حدث خطأ</p>';
  }
}

// ==================== الإشعارات ====================
function showToast(message, type = 'info') {
  const toast = document.getElementById('adminToast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'admin-toast ' + type;
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => toast.classList.remove('show'), 3500);
}
