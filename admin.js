// ============================================
// لوحة التحكم - Admin Panel v4 (متوافق مع النسخة الحالية)
// ============================================

var SUPABASE_URL = 'https://qejudsvdtdbbmxlvymiw.supabase.co';
var SUPABASE_KEY = 'sb_publishable_vgUfkb0u8FIx7GFR_FF3bw_jE357yJD';
var ADMIN_PASSWORD = '()()()()';

var db = null;
var currentUser = null;
var transferUser = null;
var allUsers = [];
var allRequests = [];
var allLogs = [];
var allRooms = [];
var currentRequestFilter = 'pending';
var activityChart = null;

if (typeof supabase !== 'undefined') {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('✅ Supabase connected');
}

// ==================== تسجيل الدخول ====================
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
  if (pw) {
    pw.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') loginAdmin();
    });
  }
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
var TAB_TITLES = {
  dashboardTab: 'لوحة المعلومات',
  usersTab: 'إدارة المستخدمين',
  requestsTab: 'طلبات الشراء',
  transferTab: 'تحويل النقاط',
  logsTab: 'سجل النشاط',
  roomsTab: 'الغرف النشطة'
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
  if (tabId === 'logsTab') loadLogs();
  if (tabId === 'roomsTab') loadRooms();
  if (tabId === 'dashboardTab') { loadTopUsers(); loadRecentActivity(); loadStats(); }
  if (tabId === 'transferTab') loadTransferHistory();
}

// ==================== الإحصائيات ====================
async function loadStats() {
  if (!db) return;
  try {
    var res1 = await db.from('users').select('*', { count: 'exact', head: true });
    var res2 = await db.from('purchase_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    var res3 = await db.from('rooms').select('*', { count: 'exact', head: true }).eq('status', 'waiting');
    var res4 = await db.from('users').select('purchased, earned');

    var usersCount = res1.count || 0;
    var pendingCount = res2.count || 0;
    var roomsCount = res3.count || 0;
    var totalPoints = 0;
    if (res4.data) {
      for (var i = 0; i < res4.data.length; i++) {
        totalPoints += (res4.data[i].purchased || 0) + (res4.data[i].earned || 0);
      }
    }

    document.getElementById('statUsers').textContent = usersCount;
    document.getElementById('statRequests').textContent = pendingCount;
    document.getElementById('statRooms').textContent = roomsCount;
    document.getElementById('statPoints').textContent = totalPoints.toLocaleString();

    drawActivityChart();
  } catch (e) {
    console.error('loadStats error:', e);
  }
}

// ==================== الرسم البياني ====================
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
    var allUsersData = res1.data || [];
    var allRequestsData = res2.data || [];

    var userCounts = last7Days.map(function(day) {
      var nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      return allUsersData.filter(function(u) {
        var d = new Date(u.created_at);
        return d >= day && d < nextDay;
      }).length;
    });

    var requestCounts = last7Days.map(function(day) {
      var nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      return allRequestsData.filter(function(r) {
        var d = new Date(r.created_at);
        return d >= day && d < nextDay;
      }).length;
    });

    var labels = last7Days.map(function(d) { return d.getDate() + '/' + (d.getMonth() + 1); });

    if (activityChart) activityChart.destroy();

    var ctx = canvas.getContext('2d');
    activityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
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
        plugins: { legend: { display: false } },
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
    console.error('Chart error:', e);
  }
}

// ==================== أكثر المستخدمين نشاطاً ====================
async function loadTopUsers() {
  var container = document.getElementById('topUsers');
  if (!container || !db) return;

  try {
    var res = await db
      .from('users')
      .select('username, purchased, earned, games_played')
      .order('games_played', { ascending: false })
      .limit(5);

    var data = res.data;
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="loading">لا يوجد بيانات</p>';
      return;
    }

    var medals = ['🥇', '🥈', '🥉', '4', '5'];
    container.innerHTML = data.map(function(u, i) {
      var total = (u.purchased || 0) + (u.earned || 0);
      return '<div class="top-user-item">' +
        '<div class="top-rank">' + medals[i] + '</div>' +
        '<div class="top-user-info">' +
          '<div class="top-user-name">' + u.username + '</div>' +
          '<div class="top-user-points">' + total + ' نقطة • ' + (u.games_played || 0) + ' لعبة</div>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (e) {
    container.innerHTML = '<p class="loading">❌ خطأ</p>';
  }
}

// ==================== آخر النشاطات ====================
async function loadRecentActivity() {
  var container = document.getElementById('recentActivity');
  if (!container || !db) return;

  try {
    var res = await db
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8);

    var data = res.data;
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="loading">لا يوجد نشاطات</p>';
      return;
    }

    var icons = {
      purchase: '💎',
      earn: '⭐',
      deduct: '💸',
      win: '🏆',
      entry_fee: '🎮',
      reward_500: '🎁',
      referral: '👥',
      admin_add: '➕',
      admin_remove: '➖',
      transfer: '💸'
    };

    container.innerHTML = data.map(function(t) {
      var icon = icons[t.type] || '📌';
      var time = new Date(t.created_at).toLocaleString('ar-EG', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
      });
      return '<div class="activity-item">' +
        '<div class="activity-icon">' + icon + '</div>' +
        '<div class="activity-content">' +
          '<div class="activity-text">' + (t.description || t.type) + '</div>' +
          '<div class="activity-time">' + time + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (e) {
    container.innerHTML = '<p class="loading">لا يوجد نشاطات</p>';
  }
}

// ==================== المستخدمين ====================
async function loadUsers() {
  var list = document.getElementById('usersList');
  if (!list) return;
  list.innerHTML = '<p class="loading">جاري التحميل...</p>';

  if (!db) {
    list.innerHTML = '<p class="loading">❌ Supabase غير متصل</p>';
    return;
  }

  try {
    var res = await db.from('users').select('*').order('created_at', { ascending: false });
    if (res.error) throw res.error;

    allUsers = res.data || [];

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
  var list = document.getElementById('usersList');
  if (!list) return;

  if (users.length === 0) {
    list.innerHTML = '<p class="loading">لا يوجد نتائج</p>';
    return;
  }

  list.innerHTML = users.map(function(u) {
    var total = (u.purchased || 0) + (u.earned || 0);
    return '<div class="user-card">' +
      '<div class="user-header">' +
        '<h3>👤 ' + u.username + '</h3>' +
        '<span class="user-level">' + getLevelName(u.level) + '</span>' +
      '</div>' +
      '<div class="user-info">' +
        '<div>📱 <strong>' + (u.phone || '--') + '</strong></div>' +
        '<div>💎 <strong>' + (u.purchased || 0) + '</strong></div>' +
        '<div>⭐ <strong>' + (u.earned || 0) + '</strong></div>' +
        '<div>🎮 <strong>' + (u.games_played || 0) + '</strong></div>' +
        '<div>📊 <strong>' + total + '</strong> الإجمالي</div>' +
        '<div>🏆 <strong>' + getLevelName(u.level) + '</strong></div>' +
      '</div>' +
      '<button class="btn-manage" onclick="openPointsModal(\'' + u.id + '\')">💰 إدارة النقاط</button>' +
    '</div>';
  }).join('');
}

function filterUsers() {
  var queryEl = document.getElementById('searchUsers');
  var levelEl = document.getElementById('filterLevel');
  var sortEl = document.getElementById('sortUsers');
  var query = queryEl ? queryEl.value.toLowerCase() : '';
  var levelFilter = levelEl ? levelEl.value : '';
  var sortBy = sortEl ? sortEl.value : 'newest';

  var filtered = allUsers.filter(function(u) {
    var matchQuery = !query ||
      (u.username && u.username.toLowerCase().indexOf(query) !== -1) ||
      (u.phone && u.phone.indexOf(query) !== -1);
    return matchQuery;
  });

  if (levelFilter) {
    filtered = filtered.filter(function(u) { return String(u.level) === levelFilter; });
  }

  if (sortBy === 'points_desc') {
    filtered.sort(function(a, b) {
      return ((b.purchased || 0) + (b.earned || 0)) - ((a.purchased || 0) + (a.earned || 0));
    });
  } else if (sortBy === 'points_asc') {
    filtered.sort(function(a, b) {
      return ((a.purchased || 0) + (a.earned || 0)) - ((b.purchased || 0) + (b.earned || 0));
    });
  } else if (sortBy === 'games_desc') {
    filtered.sort(function(a, b) { return (b.games_played || 0) - (a.games_played || 0); });
  }

  renderUsers(filtered);
}

function getLevelName(level) {
  var names = {
    1: 'مبتدئ 🌱', 2: 'هاوي 🥉', 3: 'محترف 🥈',
    4: 'خبير 🥇', 5: 'أسطورة 💎', 6: 'نخبة 👑', 7: 'أسطوري 🏆'
  };
  return names[level] || 'مبتدئ 🌱';
}

function exportUsers() {
  var csv = ['الاسم,التليفون,المدفوعة,المكتسبة,المستوى,عدد الألعاب'];
  allUsers.forEach(function(u) {
    csv.push(u.username + ',' + (u.phone || '') + ',' + (u.purchased || 0) + ',' + (u.earned || 0) + ',' + (u.level || 1) + ',' + (u.games_played || 0));
  });
  downloadCSV(csv.join('\n'), 'users.csv');
}

function downloadCSV(content, filename) {
  var blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// ==================== نافذة إدارة النقاط ====================
function openPointsModal(userId) {
  var user = null;
  for (var i = 0; i < allUsers.length; i++) {
    if (allUsers[i].id === userId) { user = allUsers[i]; break; }
  }
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

function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

function setAmount(n) {
  document.getElementById('pointsAmount').value = n;
}

async function addPoints() {
  if (!currentUser || !db) return;
  var amount = parseInt(document.getElementById('pointsAmount').value);
  var reason = document.getElementById('pointsReason').value.trim();
  if (!amount || amount <= 0) return showToast('❌ اكتب عدد صحيح', 'error');

  try {
    var newPoints = (currentUser.purchased || 0) + amount;
    var res = await db.from('users').update({ purchased: newPoints }).eq('id', currentUser.id);
    if (res.error) throw res.error;

    // سجل النشاط
    await db.from('transactions').insert([{
      user_id: currentUser.id,
      amount: amount,
      type: 'admin_add',
      description: 'إضافة ' + amount + ' نقطة لـ ' + currentUser.username + (reason ? ' - ' + reason : '')
    }]);

    showToast('✅ تم إضافة ' + amount + ' نقطة', 'success');
    closeModal('pointsModal');
    refreshAll();
  } catch (e) {
    console.error(e);
    showToast('❌ حدث خطأ: ' + e.message, 'error');
  }
}

async function removePoints() {
  if (!currentUser || !db) return;
  var amount = parseInt(document.getElementById('pointsAmount').value);
  var reason = document.getElementById('pointsReason').value.trim();
  if (!amount || amount <= 0) return showToast('❌ اكتب عدد صحيح', 'error');

  var currentTotal = (currentUser.purchased || 0) + (currentUser.earned || 0);
  if (amount > currentTotal) return showToast('❌ النقاط غير كافية', 'error');

  try {
    var purchased = currentUser.purchased || 0;
    var earned = currentUser.earned || 0;
    var remaining = amount;

    var deductFromPurchased = Math.min(purchased, remaining);
    purchased -= deductFromPurchased;
    remaining -= deductFromPurchased;
    earned = Math.max(0, earned - remaining);

    var res = await db.from('users').update({
      purchased: purchased,
      earned: earned
    }).eq('id', currentUser.id);
    if (res.error) throw res.error;

    await db.from('transactions').insert([{
      user_id: currentUser.id,
      amount: -amount,
      type: 'admin_remove',
      description: 'خصم ' + amount + ' نقطة من ' + currentUser.username + (reason ? ' - ' + reason : '')
    }]);

    showToast('✅ تم خصم ' + amount + ' نقطة', 'success');
    closeModal('pointsModal');
    refreshAll();
  } catch (e) {
    console.error(e);
    showToast('❌ حدث خطأ: ' + e.message, 'error');
  }
}

// ==================== طلبات الشراء ====================
async function loadRequests() {
  var list = document.getElementById('requestsList');
  if (!list) return;
  list.innerHTML = '<p class="loading">جاري التحميل...</p>';

  if (!db) {
    list.innerHTML = '<p class="loading">❌ Supabase غير متصل</p>';
    return;
  }

  try {
    var res = await db
      .from('purchase_requests')
      .select('*')
      .eq('status', currentRequestFilter)
      .order('created_at', { ascending: false });

    if (res.error) throw res.error;
    allRequests = res.data || [];

    if (allRequests.length === 0) {
      list.innerHTML = '<p class="loading">لا يوجد طلبات</p>';
      return;
    }

    // جيب بيانات المستخدمين المرتبطين
    var userIds = [];
    for (var i = 0; i < allRequests.length; i++) {
      if (allRequests[i].user_id && userIds.indexOf(allRequests[i].user_id) === -1) {
        userIds.push(allRequests[i].user_id);
      }
    }

    var usersMap = {};
    if (userIds.length > 0) {
      var usersRes = await db.from('users').select('id, username, phone').in('id', userIds);
      if (usersRes.data) {
        for (var k = 0; k < usersRes.data.length; k++) {
          usersMap[usersRes.data[k].id] = usersRes.data[k];
        }
      }
    }

    list.innerHTML = allRequests.map(function(r) {
      var statusClass = r.status === 'approved' ? 'approved' : (r.status === 'rejected' ? 'rejected' : '');
      var statusText = r.status === 'approved' ? 'مقبول ✅' : (r.status === 'rejected' ? 'مرفوض ❌' : 'معلّق ⏳');
      var time = new Date(r.created_at).toLocaleString('ar-EG', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
      });
      var user = usersMap[r.user_id] || {};

      return '<div class="request-card ' + statusClass + '">' +
        '<div class="req-header">' +
          '<h3 class="' + statusClass + '">🛒 طلب #' + String(r.id).slice(0, 6) + '</h3>' +
          '<span style="font-size:12px;color:var(--text-secondary)">' + statusText + '</span>' +
        '</div>' +
        '<div class="req-info">👤 <strong>' + (user.username || '--') + '</strong></div>' +
        '<div class="req-info">📱 <strong>' + (user.phone || '--') + '</strong></div>' +
        '<div class="req-info">💎 <strong>' + r.points + '</strong> نقطة</div>' +
        '<div class="req-info">💰 <strong>' + r.price_egp + '</strong> جنيه</div>' +
        '<div class="req-info">🔢 رقم العملية: <strong>' + r.trans_number + '</strong></div>' +
        '<div class="req-info">⏰ ' + time + '</div>' +
        (r.status === 'pending' ? 
          '<div class="req-buttons">' +
            '<button class="btn-approve" onclick="approveRequest(\'' + r.id + '\', \'' + r.user_id + '\', ' + r.points + ')">✅ قبول</button>' +
            '<button class="btn-reject" onclick="rejectRequest(\'' + r.id + '\')">❌ رفض</button>' +
          '</div>' : '') +
      '</div>';
    }).join('');
  } catch (e) {
    console.error(e);
    list.innerHTML = '<p class="loading">❌ حدث خطأ: ' + e.message + '</p>';
  }
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
    var userRes = await db.from('users').select('purchased, username').eq('id', userId).single();
    if (userRes.error || !userRes.data) return showToast('❌ المستخدم غير موجود', 'error');

    var user = userRes.data;
    var newPoints = (user.purchased || 0) + points;
    await db.from('users').update({ purchased: newPoints }).eq('id', userId);
    await db.from('purchase_requests').update({ status: 'approved' }).eq('id', requestId);

    await db.from('transactions').insert([{
      user_id: userId,
      amount: points,
      type: 'purchase',
      description: 'تم قبول طلب شراء ' + points + ' نقطة لـ ' + user.username
    }]);

    showToast('✅ تم قبول الطلب وإضافة ' + points + ' نقطة', 'success');
    refreshAll();
  } catch (e) {
    console.error(e);
    showToast('❌ حدث خطأ: ' + e.message, 'error');
  }
}

async function rejectRequest(requestId) {
  if (!db) return;
  try {
    var res = await db.from('purchase_requests').update({ status: 'rejected' }).eq('id', requestId);
    if (res.error) throw res.error;
    showToast('❌ تم رفض الطلب', 'success');
    loadRequests();
  } catch (e) {
    console.error(e);
    showToast('❌ حدث خطأ: ' + e.message, 'error');
  }
}

// ==================== تحويل النقاط ====================
async function searchTransferUser() {
  var queryEl = document.getElementById('transferSearch');
  var results = document.getElementById('transferResults');
  var query = queryEl ? queryEl.value.trim() : '';
  if (!query || !db) {
    results.innerHTML = '';
    return;
  }

  try {
    var res = await db
      .from('users')
      .select('id, username, phone, purchased, earned')
      .or('username.ilike.%' + query + '%,phone.ilike.%' + query + '%')
      .limit(8);

    if (!res.data || res.data.length === 0) {
      results.innerHTML = '<p class="loading" style="padding:10px">لا نتائج</p>';
      return;
    }

    results.innerHTML = res.data.map(function(u) {
      var total = (u.purchased || 0) + (u.earned || 0);
      return '<div class="search-result-item" onclick="selectTransferUser(\'' + u.id + '\')">' +
        '<div><strong>' + u.username + '</strong></div>' +
        '<small>' + (u.phone || '') + ' • ' + total + ' 💎</small>' +
      '</div>';
    }).join('');
  } catch (e) {
    console.error(e);
  }
}

function selectTransferUser(userId) {
  var user = null;
  for (var i = 0; i < allUsers.length; i++) {
    if (allUsers[i].id === userId) { user = allUsers[i]; break; }
  }
  if (!user) return;

  transferUser = user;
  document.getElementById('transferResults').innerHTML = '';
  document.getElementById('transferSearch').value = user.username;

  document.getElementById('selectedUserGroup').style.display = 'block';
  document.getElementById('selectedUserCard').innerHTML =
    '<div><strong>' + user.username + '</strong><small>' + (user.phone || '') + '</small></div>' +
    '<div style="font-size:13px;color:var(--success)">' + ((user.purchased || 0) + (user.earned || 0)) + ' 💎</div>';

  updateTransferSummary();
}

function setTransferAmount(n) {
  document.getElementById('transferAmount').value = n;
  updateTransferSummary();
}

function updateTransferSummary() {
  if (!transferUser) return;
  var amountEl = document.getElementById('transferAmount');
  var amount = parseInt(amountEl.value) || 0;
  var currentTotal = (transferUser.purchased || 0) + (transferUser.earned || 0);

  document.getElementById('summaryUser').textContent = transferUser.username;
  document.getElementById('summaryCurrent').textContent = currentTotal;
  document.getElementById('summaryAfter').textContent = currentTotal + amount;
  document.getElementById('transferSummary').style.display = 'block';
}

async function executeTransfer() {
  if (!transferUser || !db) return;
  var amountEl = document.getElementById('transferAmount');
  var reasonEl = document.getElementById('transferReason');
  var amount = parseInt(amountEl.value);
  var reason = reasonEl ? reasonEl.value.trim() : '';

  if (!amount || amount <= 0) return showToast('❌ اكتب عدد صحيح', 'error');

  try {
    var newPoints = (transferUser.purchased || 0) + amount;
    var res = await db.from('users').update({ purchased: newPoints }).eq('id', transferUser.id);
    if (res.error) throw res.error;

    await db.from('transactions').insert([{
      user_id: transferUser.id,
      amount: amount,
      type: 'transfer',
      description: 'تحويل ' + amount + ' نقطة إلى ' + transferUser.username + (reason ? ' - ' + reason : '')
    }]);

    showToast('✅ تم تحويل ' + amount + ' نقطة', 'success');
    resetTransfer();
    loadTransferHistory();
    refreshAll();
  } catch (e) {
    console.error(e);
    showToast('❌ حدث خطأ: ' + e.message, 'error');
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
  var container = document.getElementById('transferHistory');
  if (!container || !db) return;

  try {
    var res = await db
      .from('transactions')
      .select('*')
      .eq('type', 'transfer')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!res.data || res.data.length === 0) {
      container.innerHTML = '<p class="loading">لا يوجد تحويلات</p>';
      return;
    }

    container.innerHTML = res.data.map(function(t) {
      var time = new Date(t.created_at).toLocaleString('ar-EG', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
      });
      return '<div class="history-item">' +
        '<span>' + (t.description || '') + '</span>' +
        '<span><span class="amount">+' + t.amount + '</span> <span class="time">' + time + '</span></span>' +
      '</div>';
    }).join('');
  } catch (e) {
    container.innerHTML = '<p class="loading">لا يوجد تحويلات</p>';
  }
}

// ==================== سجل النشاط ====================
async function loadLogs() {
  var list = document.getElementById('logsList');
  if (!list) return;
  list.innerHTML = '<p class="loading">جاري التحميل...</p>';

  if (!db) {
    list.innerHTML = '<p class="loading">❌ Supabase غير متصل</p>';
    return;
  }

  try {
    var res = await db
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (res.error) throw res.error;
    allLogs = res.data || [];

    renderLogs(allLogs);
  } catch (e) {
    console.error(e);
    list.innerHTML = '<p class="loading">❌ حدث خطأ</p>';
  }
}

function renderLogs(logs) {
  var list = document.getElementById('logsList');
  if (!list) return;
  if (logs.length === 0) {
    list.innerHTML = '<p class="loading">لا يوجد سجل</p>';
    return;
  }

  var icons = {
    purchase: '💎', earn: '⭐', deduct: '💸', win: '🏆',
    entry_fee: '🎮', reward_500: '🎁', referral: '👥',
    admin_add: '➕', admin_remove: '➖', transfer: '💸'
  };

  list.innerHTML = logs.map(function(l) {
    var icon = icons[l.type] || '📌';
    var time = new Date(l.created_at).toLocaleString('ar-EG', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
    });
    var amountClass = l.amount > 0 ? 'positive' : 'negative';
    var amountSign = l.amount > 0 ? '+' : '';

    return '<div class="log-item">' +
      '<div class="log-icon ' + l.type + '">' + icon + '</div>' +
      '<div class="log-content">' +
        '<div class="log-text">' + (l.description || l.type) + '</div>' +
        '<div class="log-meta"><span>⏰ ' + time + '</span><span>🏷️ ' + l.type + '</span></div>' +
      '</div>' +
      '<div class="log-amount ' + amountClass + '">' + amountSign + l.amount + '</div>' +
    '</div>';
  }).join('');
}

function filterLogs() {
  var queryEl = document.getElementById('searchLogs');
  var typeEl = document.getElementById('filterLogType');
  var query = queryEl ? queryEl.value.toLowerCase() : '';
  var typeFilter = typeEl ? typeEl.value : '';

  var filtered = allLogs.filter(function(l) {
    var matchQuery = !query || (l.description && l.description.toLowerCase().indexOf(query) !== -1);
    var matchType = !typeFilter || l.type === typeFilter;
    return matchQuery && matchType;
  });

  renderLogs(filtered);
}

function exportLogs() {
  var csv = ['النوع,الوصف,المبلغ,التاريخ'];
  allLogs.forEach(function(l) {
    csv.push(l.type + ',' + (l.description || '').replace(/,/g, '،') + ',' + (l.amount || 0) + ',' + l.created_at);
  });
  downloadCSV(csv.join('\n'), 'logs.csv');
}

// ==================== الغرف ====================
async function loadRooms() {
  var list = document.getElementById('roomsList');
  if (!list) return;
  list.innerHTML = '<p class="loading">جاري التحميل...</p>';

  if (!db) {
    list.innerHTML = '<p class="loading">❌ Supabase غير متصل</p>';
    return;
  }

  try {
    var res = await db.from('rooms').select('*').order('created_at', { ascending: false }).limit(30);
    if (res.error) throw res.error;
    allRooms = res.data || [];

    if (allRooms.length === 0) {
      list.innerHTML = '<p class="loading">لا يوجد غرف نشطة</p>';
      return;
    }

    list.innerHTML = allRooms.map(function(r) {
      var statusText = r.status === 'waiting' ? '⏳ في الانتظار' :
                       r.status === 'playing' ? '🎮 جارية' :
                       r.status === 'finished' ? '✅ منتهية' : r.status;
      return '<div class="room-card">' +
        '<div class="room-header">' +
          '<h3>' + (r.category || 'غرفة') + '</h3>' +
          '<span class="room-code-badge">' + (r.code || '------') + '</span>' +
        '</div>' +
        '<div class="room-info">الحالة: ' + statusText + '</div>' +
        '<div class="room-info">اللاعبين: ' + (r.players_count || 0) + '</div>' +
      '</div>';
    }).join('');
  } catch (e) {
    console.error(e);
    list.innerHTML = '<p class="loading">❌ حدث خطأ</p>';
  }
}

// ==================== الإشعارات ====================
function showToast(message, type) {
  var toast = document.getElementById('adminToast');
  if (!toast) return;
  toast.className = 'admin-toast ' + (type || '');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(function() {
    toast.classList.remove('show');
  }, 3000);
}

// ==================== Global exports ====================
window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;
window.showTab = showTab;
window.refreshAll = refreshAll;
window.toggleFullscreen = toggleFullscreen;
window.filterUsers = filterUsers;
window.filterRequests = filterRequests;
window.filterLogs = filterLogs;
window.exportUsers = exportUsers;
window.exportLogs = exportLogs;
window.openPointsModal = openPointsModal;
window.closeModal = closeModal;
window.setAmount = setAmount;
window.addPoints = addPoints;
window.removePoints = removePoints;
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;
window.searchTransferUser = searchTransferUser;
window.selectTransferUser = selectTransferUser;
window.setTransferAmount = setTransferAmount;
window.executeTransfer = executeTransfer;
window.resetTransfer = resetTransfer;
