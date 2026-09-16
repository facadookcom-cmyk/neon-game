/* ============================================
   Neon Prediction — Admin Panel v5
   (مع نظام الإيداع + السحب + المحافظ)
   ============================================ */

var SUPABASE_URL = 'https://qejudsvdtdbbmxlvymiw.supabase.co';
var SUPABASE_KEY = 'sb_publishable_vgUfkb0u8FIx7GFR_FF3bw_jE357yJD';
var ADMIN_PASSWORD = '()()()()';

var db = null;
var currentUser = null;
var transferUser = null;
var currentWalletUser = null;
var allUsers = [];
var allRequests = [];
var allDeposits = [];
var allWithdraws = [];
var allWallets = [];
var allLogs = [];
var currentRequestFilter = 'pending';
var currentDepositFilter = 'pending';
var currentWithdrawFilter = 'pending';
var activityChart = null;

if (typeof supabase !== 'undefined') {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('✅ Supabase connected');
}

/* ==================== Login ==================== */
function loginAdmin() {
  var input = document.getElementById('passwordInput');
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

window.addEventListener('load', function() {
  if (localStorage.getItem('admin_logged') === 'true') {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('dashboard').classList.add('active');
    updatePageDate();
    refreshAll();
  }
  var pw = document.getElementById('passwordInput');
  if (pw) pw.addEventListener('keypress', function(e) { if (e.key === 'Enter') loginAdmin(); });
});

function updatePageDate() {
  var now = new Date();
  var days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var dateStr = days[now.getDay()] + '، ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
  var el = document.getElementById('pageDate');
  if (el) el.textContent = dateStr;
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
}

function refreshAll() {
  loadStats();
  loadUsers();
  loadRequests();
  loadDeposits();
  loadWithdraws();
  loadWallets();
  loadLogs();
  loadTopUsers();
  loadRecentActivity();
  loadTransferHistory();
}

/* ==================== Tabs ==================== */
var TAB_TITLES = {
  dashboardTab: 'لوحة المعلومات',
  usersTab: 'إدارة المستخدمين',
  requestsTab: 'طلبات الشراء',
  depositsTab: 'طلبات الإيداع',
  withdrawsTab: 'طلبات السحب',
  walletsTab: 'إدارة المحافظ',
  transferTab: 'تحويل النقاط',
  logsTab: 'سجل النشاط'
};

function showTab(tabId, event) {
  document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(b) { b.classList.remove('active'); });

  var tab = document.getElementById(tabId);
  if (tab) tab.classList.add('active');
  if (event && event.currentTarget) event.currentTarget.classList.add('active');

  var titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = TAB_TITLES[tabId] || 'لوحة التحكم';

  if (tabId === 'usersTab') loadUsers();
  if (tabId === 'requestsTab') loadRequests();
  if (tabId === 'depositsTab') loadDeposits();
  if (tabId === 'withdrawsTab') loadWithdraws();
  if (tabId === 'walletsTab') loadWallets();
  if (tabId === 'logsTab') loadLogs();
  if (tabId === 'dashboardTab') { loadTopUsers(); loadRecentActivity(); loadStats(); }
  if (tabId === 'transferTab') loadTransferHistory();
}

/* ==================== Stats ==================== */
async function loadStats() {
  if (!db) return;
  try {
    var res1 = await db.from('users').select('*', { count: 'exact', head: true });
    var res2 = await db.from('purchase_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    var res3 = await db.from('deposit_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    var res4 = await db.from('withdraw_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    var res5 = await db.from('users').select('purchased, earned');
    var res6 = await db.from('wallets').select('balance, total_deposited, total_withdrawn');

    var usersCount = res1.count || 0;
    var pendingReq = res2.count || 0;
    var pendingDep = res3.count || 0;
    var pendingWit = res4.count || 0;

    var totalPoints = 0;
    if (res5.data) res5.data.forEach(function(u) { totalPoints += (u.purchased || 0) + (u.earned || 0); });

    var totalWallets = 0, totalDeposits = 0, totalWithdraws = 0;
    if (res6.data) res6.data.forEach(function(w) {
      totalWallets += parseFloat(w.balance) || 0;
      totalDeposits += parseFloat(w.total_deposited) || 0;
      totalWithdraws += parseFloat(w.total_withdrawn) || 0;
    });

    document.getElementById('statUsers').textContent = usersCount;
    document.getElementById('statRequests').textContent = pendingReq;
    document.getElementById('statDeposits').textContent = pendingDep;
    document.getElementById('statWithdraws').textContent = pendingWit;
    document.getElementById('statPoints').textContent = totalPoints.toLocaleString();
    document.getElementById('statWallets').textContent = totalWallets.toFixed(2);
    document.getElementById('statTotalDeposits').textContent = totalDeposits.toFixed(2);
    document.getElementById('statTotalWithdraws').textContent = totalWithdraws.toFixed(2);

    drawActivityChart();
  } catch (e) { console.error('loadStats:', e); }
}

async function drawActivityChart() {
  if (!db) return;
  var canvas = document.getElementById('activityChart');
  if (!canvas) return;

  try {
    var last7Days = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      last7Days.push(d);
    }

    var res1 = await db.from('users').select('created_at');
    var res2 = await db.from('purchase_requests').select('created_at');
    var allU = res1.data || [];
    var allR = res2.data || [];

    var userCounts = last7Days.map(function(day) {
      var next = new Date(day); next.setDate(next.getDate() + 1);
      return allU.filter(function(u) { var d = new Date(u.created_at); return d >= day && d < next; }).length;
    });
    var reqCounts = last7Days.map(function(day) {
      var next = new Date(day); next.setDate(next.getDate() + 1);
      return allR.filter(function(r) { var d = new Date(r.created_at); return d >= day && d < next; }).length;
    });

    var labels = last7Days.map(function(d) { return d.getDate() + '/' + (d.getMonth() + 1); });

    if (activityChart) activityChart.destroy();
    var ctx = canvas.getContext('2d');
    activityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'مستخدمين جدد', data: userCounts, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.4, fill: true, borderWidth: 2, pointBackgroundColor: '#3b82f6', pointRadius: 4 },
          { label: 'طلبات شراء', data: reqCounts, borderColor: '#f0b050', backgroundColor: 'rgba(240,176,80,0.1)', tension: 0.4, fill: true, borderWidth: 2, pointBackgroundColor: '#f0b050', pointRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#8b96ab', stepSize: 1, precision: 0 }, grid: { color: 'rgba(139,150,171,0.1)' } },
          x: { ticks: { color: '#8b96ab' }, grid: { display: false } }
        }
      }
    });
  } catch (e) { console.error('Chart:', e); }
}

/* ==================== Top Users ==================== */
async function loadTopUsers() {
  var container = document.getElementById('topUsers');
  if (!container || !db) return;
  try {
    var res = await db.from('users').select('username, purchased, earned, games_played').order('games_played', { ascending: false }).limit(5);
    var data = res.data;
    if (!data || !data.length) { container.innerHTML = '<p class="loading">لا يوجد بيانات</p>'; return; }
    var medals = ['🥇', '🥈', '🥉', '4', '5'];
    container.innerHTML = data.map(function(u, i) {
      var total = (u.purchased || 0) + (u.earned || 0);
      return '<div class="top-user-item"><div class="top-rank">' + medals[i] + '</div><div class="top-user-info"><div class="top-user-name">' + u.username + '</div><div class="top-user-points">' + total + ' نقطة • ' + (u.games_played || 0) + ' لعبة</div></div></div>';
    }).join('');
  } catch (e) { container.innerHTML = '<p class="loading">❌ خطأ</p>'; }
}

/* ==================== Recent Activity ==================== */
async function loadRecentActivity() {
  var container = document.getElementById('recentActivity');
  if (!container || !db) return;
  try {
    var res = await db.from('transactions').select('*').order('created_at', { ascending: false }).limit(8);
    var data = res.data;
    if (!data || !data.length) { container.innerHTML = '<p class="loading">لا يوجد نشاطات</p>'; return; }

    var icons = { purchase:'💎', earn:'⭐', deduct:'💸', win:'🏆', entry_fee:'🎮', reward_500:'🎁', referral:'👥', admin_add:'➕', admin_remove:'➖', transfer:'💸', deposit:'📥', withdraw:'📤', wheel:'🎡', milestone:'🏆' };

    container.innerHTML = data.map(function(t) {
      var icon = icons[t.type] || '📌';
      var time = new Date(t.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
      return '<div class="activity-item"><div class="activity-icon">' + icon + '</div><div class="activity-content"><div class="activity-text">' + (t.description || t.type) + '</div><div class="activity-time">' + time + '</div></div></div>';
    }).join('');
  } catch (e) { container.innerHTML = '<p class="loading">لا يوجد نشاطات</p>'; }
}

/* ==================== Users ==================== */
async function loadUsers() {
  var list = document.getElementById('usersList');
  if (!list) return;
  list.innerHTML = '<p class="loading">جاري التحميل...</p>';
  if (!db) { list.innerHTML = '<p class="loading">❌ Supabase غير متصل</p>'; return; }

  try {
    var res = await db.from('users').select('*').order('created_at', { ascending: false });
    if (res.error) throw res.error;
    allUsers = res.data || [];
    if (!allUsers.length) { list.innerHTML = '<p class="loading">لا يوجد مستخدمين</p>'; return; }
    renderUsers(allUsers);
  } catch (e) { list.innerHTML = '<p class="loading">❌ حدث خطأ</p>'; }
}

function renderUsers(users) {
  var list = document.getElementById('usersList');
  if (!list) return;
  if (!users.length) { list.innerHTML = '<p class="loading">لا يوجد نتائج</p>'; return; }
  list.innerHTML = users.map(function(u) {
    var total = (u.purchased || 0) + (u.earned || 0);
    return '<div class="user-card"><div class="user-header"><h3>👤 ' + u.username + '</h3><span class="user-level">' + getLevelName(u.level) + '</span></div>' +
      '<div class="user-info"><div>📱 <strong>' + (u.phone || '--') + '</strong></div><div>💎 <strong>' + (u.purchased || 0) + '</strong></div><div>⭐ <strong>' + (u.earned || 0) + '</strong></div><div>🎮 <strong>' + (u.games_played || 0) + '</strong></div><div>📊 <strong>' + total + '</strong></div><div>🏆 <strong>' + getLevelName(u.level) + '</strong></div></div>' +
      '<button class="btn-manage" onclick="openPointsModal(\'' + u.id + '\')">💰 إدارة النقاط</button></div>';
  }).join('');
}

function filterUsers() {
  var q = (document.getElementById('searchUsers').value || '').toLowerCase();
  var lvl = document.getElementById('filterLevel').value;
  var sort = document.getElementById('sortUsers').value;

  var f = allUsers.filter(function(u) {
    return (!q || (u.username && u.username.toLowerCase().indexOf(q) !== -1) || (u.phone && u.phone.indexOf(q) !== -1));
  });
  if (lvl) f = f.filter(function(u) { return String(u.level) === lvl; });
  if (sort === 'points_desc') f.sort(function(a,b){ return ((b.purchased||0)+(b.earned||0)) - ((a.purchased||0)+(a.earned||0)); });
  else if (sort === 'points_asc') f.sort(function(a,b){ return ((a.purchased||0)+(a.earned||0)) - ((b.purchased||0)+(b.earned||0)); });
  else if (sort === 'games_desc') f.sort(function(a,b){ return (b.games_played||0) - (a.games_played||0); });
  renderUsers(f);
}

function getLevelName(level) {
  var n = {1:'مبتدئ 🌱',2:'هاوي 🥉',3:'محترف 🥈',4:'خبير 🥇',5:'أسطورة 💎',6:'نخبة 👑',7:'أسطوري 🏆'};
  return n[level] || 'مبتدئ 🌱';
}

function exportUsers() {
  var csv = ['الاسم,التليفون,المدفوعة,المكتسبة,المستوى,عدد الألعاب'];
  allUsers.forEach(function(u) { csv.push(u.username + ',' + (u.phone || '') + ',' + (u.purchased || 0) + ',' + (u.earned || 0) + ',' + (u.level || 1) + ',' + (u.games_played || 0)); });
  downloadCSV(csv.join('\n'), 'users.csv');
}

function downloadCSV(content, filename) {
  var blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

/* ==================== Points Modal ==================== */
function openPointsModal(userId) {
  var user = null;
  for (var i = 0; i < allUsers.length; i++) if (allUsers[i].id === userId) { user = allUsers[i]; break; }
  if (!user) return;
  currentUser = user;
  document.getElementById('modalUsername').textContent = user.username;
  document.getElementById('modalPhone').textContent = user.phone || '--';
  document.getElementById('modalCurrentPoints').textContent = user.purchased || 0;
  document.getElementById('modalEarnedPoints').textContent = user.earned || 0;
  document.getElementById('pointsAmount').value = '';
  document.getElementById('pointsReason').value = '';
  document.getElementById('pointsModal').classList.add('active');
}

function closeModal(id) { var el = document.getElementById(id); if (el) el.classList.remove('active'); }

function setAmount(n) { document.getElementById('pointsAmount').value = n; }

async function addPoints() {
  if (!currentUser || !db) return;
  var amount = parseInt(document.getElementById('pointsAmount').value);
  var reason = document.getElementById('pointsReason').value.trim();
  if (!amount || amount <= 0) return showToast('❌ اكتب عدد صحيح', 'error');

  try {
    var newPoints = (currentUser.purchased || 0) + amount;
    var res = await db.from('users').update({ purchased: newPoints }).eq('id', currentUser.id);
    if (res.error) throw res.error;
    await db.from('transactions').insert([{ user_id: currentUser.id, amount: amount, type: 'admin_add', description: 'إضافة ' + amount + ' نقطة لـ ' + currentUser.username + (reason ? ' - ' + reason : '') }]);
    showToast('✅ تم إضافة ' + amount + ' نقطة', 'success');
    closeModal('pointsModal');
    refreshAll();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

async function removePoints() {
  if (!currentUser || !db) return;
  var amount = parseInt(document.getElementById('pointsAmount').value);
  var reason = document.getElementById('pointsReason').value.trim();
  if (!amount || amount <= 0) return showToast('❌ اكتب عدد صحيح', 'error');

  var total = (currentUser.purchased || 0) + (currentUser.earned || 0);
  if (amount > total) return showToast('❌ النقاط غير كافية', 'error');

  try {
    var p = currentUser.purchased || 0;
    var e = currentUser.earned || 0;
    var rem = amount;
    var fromP = Math.min(p, rem);
    p -= fromP; rem -= fromP;
    e = Math.max(0, e - rem);

    await db.from('users').update({ purchased: p, earned: e }).eq('id', currentUser.id);
    await db.from('transactions').insert([{ user_id: currentUser.id, amount: -amount, type: 'admin_remove', description: 'خصم ' + amount + ' نقطة من ' + currentUser.username + (reason ? ' - ' + reason : '') }]);
    showToast('✅ تم خصم ' + amount + ' نقطة', 'success');
    closeModal('pointsModal');
    refreshAll();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

/* ==================== Purchase Requests ==================== */
async function loadRequests() {
  var list = document.getElementById('requestsList');
  if (!list) return;
  list.innerHTML = '<p class="loading">جاري التحميل...</p>';
  if (!db) return;

  try {
    var res = await db.from('purchase_requests').select('*').eq('status', currentRequestFilter).order('created_at', { ascending: false });
    if (res.error) throw res.error;
    allRequests = res.data || [];
    if (!allRequests.length) { list.innerHTML = '<p class="loading">لا يوجد طلبات</p>'; return; }

    var ids = [];
    allRequests.forEach(function(r) { if (r.user_id && ids.indexOf(r.user_id) === -1) ids.push(r.user_id); });
    var umap = {};
    if (ids.length) {
      var ur = await db.from('users').select('id, username, phone').in('id', ids);
      (ur.data || []).forEach(function(u) { umap[u.id] = u; });
    }

    list.innerHTML = allRequests.map(function(r) {
      var sc = r.status === 'approved' ? 'approved' : (r.status === 'rejected' ? 'rejected' : '');
      var st = r.status === 'approved' ? 'مقبول ✅' : (r.status === 'rejected' ? 'مرفوض ❌' : 'معلّق ⏳');
      var time = new Date(r.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
      var u = umap[r.user_id] || {};
      return '<div class="request-card ' + sc + '"><div class="req-header"><h3 class="' + sc + '">🛒 طلب #' + String(r.id).slice(0,6) + '</h3><span style="font-size:12px;color:var(--text-secondary)">' + st + '</span></div>' +
        '<div class="req-info">👤 <strong>' + (u.username || '--') + '</strong></div>' +
        '<div class="req-info">📱 <strong>' + (u.phone || '--') + '</strong></div>' +
        '<div class="req-info">💎 <strong>' + r.points + '</strong> نقطة</div>' +
        '<div class="req-info">💰 <strong>' + r.price_egp + '</strong> جنيه</div>' +
        '<div class="req-info">🔢 رقم العملية: <strong>' + r.trans_number + '</strong></div>' +
        '<div class="req-info">⏰ ' + time + '</div>' +
        (r.status === 'pending' ? '<div class="req-buttons"><button class="btn-approve" onclick="approveRequest(\'' + r.id + '\', \'' + r.user_id + '\', ' + r.points + ')">✅ قبول</button><button class="btn-reject" onclick="rejectRequest(\'' + r.id + '\')">❌ رفض</button></div>' : '') +
      '</div>';
    }).join('');
  } catch (e) { list.innerHTML = '<p class="loading">❌ ' + e.message + '</p>'; }
}

function filterRequests(status, event) {
  currentRequestFilter = status;
  document.querySelectorAll('#requestsTab .filter-btn').forEach(function(b) { b.classList.remove('active'); });
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
  loadRequests();
}

async function approveRequest(requestId, userId, points) {
  if (!db) return;
  try {
    var ur = await db.from('users').select('purchased, username').eq('id', userId).single();
    if (ur.error || !ur.data) return showToast('❌ المستخدم غير موجود', 'error');
    var u = ur.data;
    var newPoints = (u.purchased || 0) + points;
    await db.from('users').update({ purchased: newPoints }).eq('id', userId);
    await db.from('purchase_requests').update({ status: 'approved' }).eq('id', requestId);
    await db.from('transactions').insert([{ user_id: userId, amount: points, type: 'purchase', description: 'تم قبول طلب شراء ' + points + ' نقطة لـ ' + u.username }]);
    showToast('✅ تم قبول الطلب وإضافة ' + points + ' نقطة', 'success');
    refreshAll();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

async function rejectRequest(requestId) {
  if (!db) return;
  try {
    await db.from('purchase_requests').update({ status: 'rejected' }).eq('id', requestId);
    showToast('❌ تم رفض الطلب', 'success');
    loadRequests();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

/* ============================================
   💰 DEPOSIT REQUESTS — قبول الإيداع = إضافة رصيد
   ============================================ */
async function loadDeposits() {
  var list = document.getElementById('depositsList');
  if (!list) return;
  list.innerHTML = '<p class="loading">جاري التحميل...</p>';
  if (!db) return;

  try {
    var res = await db.from('deposit_requests').select('*').eq('status', currentDepositFilter).order('created_at', { ascending: false });
    if (res.error) throw res.error;
    allDeposits = res.data || [];
    if (!allDeposits.length) { list.innerHTML = '<p class="loading">لا يوجد طلبات إيداع</p>'; return; }

    var ids = [];
    allDeposits.forEach(function(r) { if (r.user_id && ids.indexOf(r.user_id) === -1) ids.push(r.user_id); });
    var umap = {};
    if (ids.length) {
      var ur = await db.from('users').select('id, username, phone').in('id', ids);
      (ur.data || []).forEach(function(u) { umap[u.id] = u; });
    }

    list.innerHTML = allDeposits.map(function(r) {
      var sc = r.status === 'approved' ? 'approved' : (r.status === 'rejected' ? 'rejected' : '');
      var st = r.status === 'approved' ? 'مقبول ✅' : (r.status === 'rejected' ? 'مرفوض ❌' : 'معلّق ⏳');
      var time = new Date(r.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
      var u = umap[r.user_id] || {};
      return '<div class="request-card ' + sc + '"><div class="req-header"><h3 class="' + sc + '">💰 إيداع #' + String(r.id).slice(0,6) + '</h3><span style="font-size:12px;color:var(--text-secondary)">' + st + '</span></div>' +
        '<div class="req-info">👤 <strong>' + (u.username || '--') + '</strong></div>' +
        '<div class="req-info">📱 <strong>' + (u.phone || '--') + '</strong></div>' +
        '<div class="req-info">💵 <strong style="color:var(--success);font-size:16px">' + r.amount + ' جنيه</strong></div>' +
        '<div class="req-info">🔢 رقم العملية: <strong>' + r.trans_number + '</strong></div>' +
        '<div class="req-info">⏰ ' + time + '</div>' +
        (r.status === 'pending' ?
          '<div class="req-buttons">' +
            '<button class="btn-approve" onclick="approveDeposit(\'' + r.id + '\', \'' + r.user_id + '\', ' + r.amount + ')">✅ قبول وإضافة للمحفظة</button>' +
            '<button class="btn-reject" onclick="rejectDeposit(\'' + r.id + '\')">❌ رفض</button>' +
          '</div>' : '') +
      '</div>';
    }).join('');
  } catch (e) { list.innerHTML = '<p class="loading">❌ ' + e.message + '</p>'; }
}

function filterDeposits(status, event) {
  currentDepositFilter = status;
  document.querySelectorAll('#depositsTab .filter-btn').forEach(function(b) { b.classList.remove('active'); });
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
  loadDeposits();
}

async function approveDeposit(requestId, userId, amount) {
  if (!db) return;
  try {
    // 1. جيب المحفظة أو أنشئها
    var wr = await db.from('wallets').select('*').eq('user_id', userId).maybeSingle();
    var newBalance, newDeposited;

    if (wr.data) {
      newBalance = (parseFloat(wr.data.balance) || 0) + parseFloat(amount);
      newDeposited = (parseFloat(wr.data.total_deposited) || 0) + parseFloat(amount);
      await db.from('wallets').update({
        balance: newBalance,
        total_deposited: newDeposited,
        updated_at: new Date().toISOString()
      }).eq('user_id', userId);
    } else {
      newBalance = parseFloat(amount);
      await db.from('wallets').insert({
        user_id: userId,
        balance: newBalance,
        total_deposited: newBalance
      });
    }

    // 2. حدّث حالة الطلب
    await db.from('deposit_requests').update({
      status: 'approved',
      reviewed_at: new Date().toISOString()
    }).eq('id', requestId);

    // 3. سجّل العملية
    var ur = await db.from('users').select('username').eq('id', userId).single();
    var uname = ur.data ? ur.data.username : 'مستخدم';
    await db.from('transactions').insert([{
      user_id: userId,
      amount: parseFloat(amount),
      type: 'deposit',
      description: '✅ تم قبول إيداع ' + amount + ' جنيه لـ ' + uname
    }]);

    showToast('✅ تم إضافة ' + amount + ' جنيه لمحفظة ' + uname, 'success');
    refreshAll();
  } catch (e) {
    console.error(e);
    showToast('❌ ' + e.message, 'error');
  }
}

async function rejectDeposit(requestId) {
  if (!db) return;
  try {
    await db.from('deposit_requests').update({
      status: 'rejected',
      reviewed_at: new Date().toISOString()
    }).eq('id', requestId);
    showToast('❌ تم رفض طلب الإيداع', 'success');
    loadDeposits();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

/* ============================================
   💸 WITHDRAW REQUESTS — قبول السحب = خصم رصيد
   ============================================ */
async function loadWithdraws() {
  var list = document.getElementById('withdrawsList');
  if (!list) return;
  list.innerHTML = '<p class="loading">جاري التحميل...</p>';
  if (!db) return;

  try {
    var res = await db.from('withdraw_requests').select('*').eq('status', currentWithdrawFilter).order('created_at', { ascending: false });
    if (res.error) throw res.error;
    allWithdraws = res.data || [];
    if (!allWithdraws.length) { list.innerHTML = '<p class="loading">لا يوجد طلبات سحب</p>'; return; }

    var ids = [];
    allWithdraws.forEach(function(r) { if (r.user_id && ids.indexOf(r.user_id) === -1) ids.push(r.user_id); });
    var umap = {};
    if (ids.length) {
      var ur = await db.from('users').select('id, username, phone').in('id', ids);
      (ur.data || []).forEach(function(u) { umap[u.id] = u; });
    }

    list.innerHTML = allWithdraws.map(function(r) {
      var sc = r.status === 'approved' ? 'approved' : (r.status === 'rejected' ? 'rejected' : '');
      var st = r.status === 'approved' ? 'تم التحويل ✅' : (r.status === 'rejected' ? 'مرفوض ❌' : 'معلّق ⏳');
      var time = new Date(r.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
      var u = umap[r.user_id] || {};
      return '<div class="request-card ' + sc + '"><div class="req-header"><h3 class="' + sc + '">💸 سحب #' + String(r.id).slice(0,6) + '</h3><span style="font-size:12px;color:var(--text-secondary)">' + st + '</span></div>' +
        '<div class="req-info">👤 <strong>' + (u.username || '--') + '</strong></div>' +
        '<div class="req-info">📱 رقم فودافون: <strong style="color:var(--gold)">' + r.phone + '</strong></div>' +
        '<div class="req-info">💵 <strong style="color:var(--danger);font-size:16px">' + r.amount + ' جنيه</strong></div>' +
        '<div class="req-info">⏰ ' + time + '</div>' +
        (r.status === 'pending' ?
          '<div class="req-buttons">' +
            '<button class="btn-approve" onclick="approveWithdraw(\'' + r.id + '\', \'' + r.user_id + '\', ' + r.amount + ')">✅ تم التحويل</button>' +
            '<button class="btn-reject" onclick="rejectWithdraw(\'' + r.id + '\', \'' + r.user_id + '\')">❌ رفض وإرجاع الرصيد</button>' +
          '</div>' : '') +
      '</div>';
    }).join('');
  } catch (e) { list.innerHTML = '<p class="loading">❌ ' + e.message + '</p>'; }
}

function filterWithdraws(status, event) {
  currentWithdrawFilter = status;
  document.querySelectorAll('#withdrawsTab .filter-btn').forEach(function(b) { b.classList.remove('active'); });
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
  loadWithdraws();
}

async function approveWithdraw(requestId, userId, amount) {
  if (!db) return;
  try {
    // 1. اخصم من المحفظة
    var wr = await db.from('wallets').select('*').eq('user_id', userId).maybeSingle();
    if (wr.data) {
      var newBalance = Math.max(0, (parseFloat(wr.data.balance) || 0) - parseFloat(amount));
      var newWithdrawn = (parseFloat(wr.data.total_withdrawn) || 0) + parseFloat(amount);
      await db.from('wallets').update({
        balance: newBalance,
        total_withdrawn: newWithdrawn,
        updated_at: new Date().toISOString()
      }).eq('user_id', userId);
    }

    // 2. حدّث حالة الطلب
    await db.from('withdraw_requests').update({
      status: 'approved',
      reviewed_at: new Date().toISOString()
    }).eq('id', requestId);

    // 3. سجّل العملية
    var ur = await db.from('users').select('username').eq('id', userId).single();
    var uname = ur.data ? ur.data.username : 'مستخدم';
    await db.from('transactions').insert([{
      user_id: userId,
      amount: -parseFloat(amount),
      type: 'withdraw',
      description: '💸 تم صرف ' + amount + ' جنيه لـ ' + uname
    }]);

    showToast('✅ تم تأكيد صرف ' + amount + ' جنيه', 'success');
    refreshAll();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

async function rejectWithdraw(requestId, userId) {
  if (!db) return;
  try {
    await db.from('withdraw_requests').update({
      status: 'rejected',
      reviewed_at: new Date().toISOString()
    }).eq('id', requestId);
    showToast('❌ تم رفض طلب السحب', 'success');
    loadWithdraws();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

/* ============================================
   🏦 WALLETS MANAGEMENT
   ============================================ */
async function loadWallets() {
  var list = document.getElementById('walletsList');
  if (!list) return;
  list.innerHTML = '<p class="loading">جاري التحميل...</p>';
  if (!db) return;

  try {
    var res = await db.from('wallets').select('*').order('updated_at', { ascending: false });
    if (res.error) throw res.error;
    allWallets = res.data || [];

    if (!allWallets.length) {
      list.innerHTML = '<p class="loading">لا يوجد محافظ</p>';
      return;
    }

    // جيب بيانات المستخدمين
    var ids = allWallets.map(function(w) { return w.user_id; });
    var umap = {};
    if (ids.length) {
      var ur = await db.from('users').select('id, username, phone').in('id', ids);
      (ur.data || []).forEach(function(u) { umap[u.id] = u; });
    }

    // اربطهم
    var combined = allWallets.map(function(w) {
      return { wallet: w, user: umap[w.user_id] || {} };
    });

    renderWallets(combined);
  } catch (e) { list.innerHTML = '<p class="loading">❌ ' + e.message + '</p>'; }
}

function renderWallets(list) {
  var container = document.getElementById('walletsList');
  if (!container) return;
  if (!list.length) { container.innerHTML = '<p class="loading">لا يوجد محافظ</p>'; return; }

  container.innerHTML = list.map(function(item) {
    var w = item.wallet;
    var u = item.user;
    var balance = parseFloat(w.balance) || 0;
    var deposited = parseFloat(w.total_deposited) || 0;
    var withdrawn = parseFloat(w.total_withdrawn) || 0;

    return '<div class="user-card">' +
      '<div class="user-header">' +
        '<h3>👤 ' + (u.username || 'مستخدم') + '</h3>' +
        '<span class="user-level" style="background:rgba(16,185,129,0.15);color:#10b981">💰 ' + balance.toFixed(2) + ' ج</span>' +
      '</div>' +
      '<div class="user-info">' +
        '<div>📱 <strong>' + (u.phone || '--') + '</strong></div>' +
        '<div>💰 <strong>' + balance.toFixed(2) + ' ج</strong></div>' +
        '<div>📥 <strong>' + deposited.toFixed(2) + ' ج</strong></div>' +
        '<div>📤 <strong>' + withdrawn.toFixed(2) + ' ج</strong></div>' +
      '</div>' +
      '<button class="btn-manage" onclick="openWalletModal(\'' + w.user_id + '\', \'' + (u.username || '') + '\', \'' + (u.phone || '') + '\', ' + balance + ', ' + deposited + ', ' + withdrawn + ')">💰 إدارة المحفظة</button>' +
    '</div>';
  }).join('');
}

function filterWallets() {
  var q = (document.getElementById('searchWallets').value || '').toLowerCase();
  // reload and filter
  loadWallets().then(function() {});
}

function exportWallets() {
  var csv = ['الاسم,التليفون,الرصيد,إجمالي الإيداعات,إجمالي السحوبات'];
  allWallets.forEach(function(w) {
    csv.push((w.username || '') + ',' + (w.phone || '') + ',' + (w.balance || 0) + ',' + (w.total_deposited || 0) + ',' + (w.total_withdrawn || 0));
  });
  downloadCSV(csv.join('\n'), 'wallets.csv');
}

/* ==================== Wallet Modal ==================== */
function openWalletModal(userId, username, phone, balance, deposited, withdrawn) {
  currentWalletUser = { id: userId, username: username, phone: phone, balance: balance };
  document.getElementById('walletModalName').textContent = username;
  document.getElementById('walletModalPhone').textContent = phone || '--';
  document.getElementById('walletModalBalance').textContent = balance.toFixed(2) + ' ج';
  document.getElementById('walletModalDeposited').textContent = deposited.toFixed(2) + ' ج';
  document.getElementById('walletModalWithdrawn').textContent = withdrawn.toFixed(2) + ' ج';
  document.getElementById('walletAmount').value = '';
  document.getElementById('walletReason').value = '';
  document.getElementById('walletModal').classList.add('active');
}

function setWalletAmount(n) { document.getElementById('walletAmount').value = n; }

async function addWalletBalance() {
  if (!currentWalletUser || !db) return;
  var amount = parseFloat(document.getElementById('walletAmount').value);
  var reason = document.getElementById('walletReason').value.trim();
  if (!amount || amount <= 0) return showToast('❌ اكتب مبلغ صحيح', 'error');

  try {
    var wr = await db.from('wallets').select('*').eq('user_id', currentWalletUser.id).maybeSingle();
    if (wr.data) {
      var nb = (parseFloat(wr.data.balance) || 0) + amount;
      var nd = (parseFloat(wr.data.total_deposited) || 0) + amount;
      await db.from('wallets').update({ balance: nb, total_deposited: nd, updated_at: new Date().toISOString() }).eq('user_id', currentWalletUser.id);
    } else {
      await db.from('wallets').insert({ user_id: currentWalletUser.id, balance: amount, total_deposited: amount });
    }

    await db.from('transactions').insert([{
      user_id: currentWalletUser.id,
      amount: amount,
      type: 'deposit',
      description: '➕ إضافة يدوية ' + amount + ' جنيه لـ ' + currentWalletUser.username + (reason ? ' - ' + reason : '')
    }]);

    showToast('✅ تم إضافة ' + amount + ' جنيه', 'success');
    closeModal('walletModal');
    refreshAll();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

async function removeWalletBalance() {
  if (!currentWalletUser || !db) return;
  var amount = parseFloat(document.getElementById('walletAmount').value);
  var reason = document.getElementById('walletReason').value.trim();
  if (!amount || amount <= 0) return showToast('❌ اكتب مبلغ صحيح', 'error');

  try {
    var wr = await db.from('wallets').select('*').eq('user_id', currentWalletUser.id).maybeSingle();
    if (!wr.data) return showToast('❌ المستخدم مش عنده محفظة', 'error');

    var currentBal = parseFloat(wr.data.balance) || 0;
    if (amount > currentBal) return showToast('❌ الرصيد غير كافي', 'error');

    var nb = currentBal - amount;
    await db.from('wallets').update({ balance: nb, updated_at: new Date().toISOString() }).eq('user_id', currentWalletUser.id);

    await db.from('transactions').insert([{
      user_id: currentWalletUser.id,
      amount: -amount,
      type: 'withdraw',
      description: '➖ خصم يدوي ' + amount + ' جنيه من ' + currentWalletUser.username + (reason ? ' - ' + reason : '')
    }]);

    showToast('✅ تم خصم ' + amount + ' جنيه', 'success');
    closeModal('walletModal');
    refreshAll();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

/* ==================== Transfer ==================== */
async function searchTransferUser() {
  var q = document.getElementById('transferSearch').value.trim();
  var results = document.getElementById('transferResults');
  if (!q || !db) { results.innerHTML = ''; return; }

  try {
    var res = await db.from('users').select('id, username, phone, purchased, earned').or('username.ilike.%' + q + '%,phone.ilike.%' + q + '%').limit(8);
    if (!res.data || !res.data.length) { results.innerHTML = '<p class="loading" style="padding:10px">لا نتائج</p>'; return; }
    results.innerHTML = res.data.map(function(u) {
      var t = (u.purchased || 0) + (u.earned || 0);
      return '<div class="search-result-item" onclick="selectTransferUser(\'' + u.id + '\')"><div><strong>' + u.username + '</strong></div><small>' + (u.phone || '') + ' • ' + t + ' 💎</small></div>';
    }).join('');
  } catch (e) {}
}

function selectTransferUser(userId) {
  var user = null;
  for (var i = 0; i < allUsers.length; i++) if (allUsers[i].id === userId) { user = allUsers[i]; break; }
  if (!user) return;
  transferUser = user;
  document.getElementById('transferResults').innerHTML = '';
  document.getElementById('transferSearch').value = user.username;
  document.getElementById('selectedUserGroup').style.display = 'block';
  document.getElementById('selectedUserCard').innerHTML = '<div><strong>' + user.username + '</strong><small>' + (user.phone || '') + '</small></div><div style="font-size:13px;color:var(--success)">' + ((user.purchased || 0) + (user.earned || 0)) + ' 💎</div>';
  updateTransferSummary();
}

function setTransferAmount(n) { document.getElementById('transferAmount').value = n; updateTransferSummary(); }

function updateTransferSummary() {
  if (!transferUser) return;
  var amount = parseInt(document.getElementById('transferAmount').value) || 0;
  var cur = (transferUser.purchased || 0) + (transferUser.earned || 0);
  document.getElementById('summaryUser').textContent = transferUser.username;
  document.getElementById('summaryCurrent').textContent = cur;
  document.getElementById('summaryAfter').textContent = cur + amount;
  document.getElementById('transferSummary').style.display = 'block';
}

async function executeTransfer() {
  if (!transferUser || !db) return;
  var amount = parseInt(document.getElementById('transferAmount').value);
  var reason = document.getElementById('transferReason').value.trim();
  if (!amount || amount <= 0) return showToast('❌ اكتب عدد صحيح', 'error');

  try {
    var newPoints = (transferUser.purchased || 0) + amount;
    await db.from('users').update({ purchased: newPoints }).eq('id', transferUser.id);
    await db.from('transactions').insert([{ user_id: transferUser.id, amount: amount, type: 'transfer', description: 'تحويل ' + amount + ' نقطة إلى ' + transferUser.username + (reason ? ' - ' + reason : '') }]);
    showToast('✅ تم تحويل ' + amount + ' نقطة', 'success');
    resetTransfer();
    loadTransferHistory();
    refreshAll();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
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
  var c = document.getElementById('transferHistory');
  if (!c || !db) return;
  try {
    var res = await db.from('transactions').select('*').eq('type', 'transfer').order('created_at', { ascending: false }).limit(5);
    if (!res.data || !res.data.length) { c.innerHTML = '<p class="loading">لا يوجد تحويلات</p>'; return; }
    c.innerHTML = res.data.map(function(t) {
      var time = new Date(t.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
      return '<div class="history-item"><span>' + (t.description || '') + '</span><span><span class="amount">+' + t.amount + '</span> <span class="time">' + time + '</span></span></div>';
    }).join('');
  } catch (e) { c.innerHTML = '<p class="loading">لا يوجد تحويلات</p>'; }
}

/* ==================== Logs ==================== */
async function loadLogs() {
  var list = document.getElementById('logsList');
  if (!list) return;
  list.innerHTML = '<p class="loading">جاري التحميل...</p>';
  if (!db) return;

  try {
    var res = await db.from('transactions').select('*').order('created_at', { ascending: false }).limit(200);
    if (res.error) throw res.error;
    allLogs = res.data || [];
    renderLogs(allLogs);
  } catch (e) { list.innerHTML = '<p class="loading">❌ حدث خطأ</p>'; }
}

function renderLogs(logs) {
  var list = document.getElementById('logsList');
  if (!list) return;
  if (!logs.length) { list.innerHTML = '<p class="loading">لا يوجد سجل</p>'; return; }

  var icons = { purchase:'💎', earn:'⭐', deduct:'💸', win:'🏆', entry_fee:'🎮', reward_500:'🎁', referral:'👥', admin_add:'➕', admin_remove:'➖', transfer:'💸', deposit:'📥', withdraw:'📤', wheel:'🎡', milestone:'🏆' };

  list.innerHTML = logs.map(function(l) {
    var icon = icons[l.type] || '📌';
    var time = new Date(l.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    var cls = l.amount > 0 ? 'positive' : 'negative';
    var sign = l.amount > 0 ? '+' : '';
    return '<div class="log-item"><div class="log-icon ' + l.type + '">' + icon + '</div><div class="log-content"><div class="log-text">' + (l.description || l.type) + '</div><div class="log-meta"><span>⏰ ' + time + '</span><span>🏷️ ' + l.type + '</span></div></div><div class="log-amount ' + cls + '">' + sign + l.amount + '</div></div>';
  }).join('');
}

function filterLogs() {
  var q = (document.getElementById('searchLogs').value || '').toLowerCase();
  var t = document.getElementById('filterLogType').value;
  var f = allLogs.filter(function(l) {
    return (!q || (l.description && l.description.toLowerCase().indexOf(q) !== -1)) && (!t || l.type === t);
  });
  renderLogs(f);
}

function exportLogs() {
  var csv = ['النوع,الوصف,المبلغ,التاريخ'];
  allLogs.forEach(function(l) { csv.push(l.type + ',' + (l.description || '').replace(/,/g, '،') + ',' + (l.amount || 0) + ',' + l.created_at); });
  downloadCSV(csv.join('\n'), 'logs.csv');
}

/* ==================== Toast ==================== */
function showToast(message, type) {
  var toast = document.getElementById('adminToast');
  if (!toast) return;
  toast.className = 'admin-toast ' + (type || '');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

/* ==================== Global Exports ==================== */
window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;
window.showTab = showTab;
window.refreshAll = refreshAll;
window.toggleFullscreen = toggleFullscreen;
window.filterUsers = filterUsers;
window.filterRequests = filterRequests;
window.filterDeposits = filterDeposits;
window.filterWithdraws = filterWithdraws;
window.filterWallets = filterWallets;
window.filterLogs = filterLogs;
window.exportUsers = exportUsers;
window.exportWallets = exportWallets;
window.exportLogs = exportLogs;
window.openPointsModal = openPointsModal;
window.openWalletModal = openWalletModal;
window.closeModal = closeModal;
window.setAmount = setAmount;
window.setWalletAmount = setWalletAmount;
window.addPoints = addPoints;
window.removePoints = removePoints;
window.addWalletBalance = addWalletBalance;
window.removeWalletBalance = removeWalletBalance;
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;
window.approveDeposit = approveDeposit;
window.rejectDeposit = rejectDeposit;
window.approveWithdraw = approveWithdraw;
window.rejectWithdraw = rejectWithdraw;
window.searchTransferUser = searchTransferUser;
window.selectTransferUser = selectTransferUser;
window.setTransferAmount = setTransferAmount;
window.updateTransferSummary = updateTransferSummary;
window.executeTransfer = executeTransfer;
window.resetTransfer = resetTransfer;
