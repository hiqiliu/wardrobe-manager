// === Data Store ===
const STORAGE_KEY = 'wardrobe_manager';

function loadData() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { clothes: [], records: [], nextId: 1, nextRecordId: 1, diaries: [], nextDiaryId: 1 };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

var appData = loadData();

// === Utility ===
function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatDate(str) {
  if (!str) return '';
  var parts = str.split('-');
  return parts[1] + '/' + parts[2];
}

function formatMoney(n) {
  if (n === 0) return '0';
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function getMonthWearCount(yearMonth) {
  return appData.records.filter(function(r) { return r.date.startsWith(yearMonth); }).length;
}

function getRecordForDate(dateStr) {
  return appData.records.find(function(r) { return r.date === dateStr; });
}

function getClothingWearCount(clothId) {
  var count = 0;
  appData.records.forEach(function(r) {
    r.clothingIds.forEach(function(cid) {
      if (cid === clothId) count++;
    });
  });
  return count;
}

function getDatesWithRecords() {
  return appData.records.map(function(r) { return r.date; });
}

var categoryColors = {
  '上装': '#c4856c', '下装': '#7a9e7e', '外套': '#6b8fb5',
  '连衣裙': '#c46bae', '鞋子': '#8a8580', '配饰': '#d4a55a'
};

var categoryIcons = {
  '上装': '👕', '下装': '👖', '外套': '🧥', '连衣裙': '👗', '鞋子': '👟', '配饰': '💎'
};

var seasonTags = { '春': 'tag-green', '夏': 'tag-amber', '秋': 'tag-red', '冬': 'tag-blue', '四季': 'tag-gray' };

// === Toast ===
function showToast(msg) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(function() { el.classList.remove('show'); }, 2000);
}

// === Navigation ===
function switchPage(name) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  event.currentTarget.classList.add('active');
  if (name === 'home') renderHome();
  if (name === 'wardrobe') renderWardrobe();
  if (name === 'calendar') renderCalendar();
  if (name === 'analysis') renderAnalysis();
}

// === Header Date ===
function updateHeaderDate() {
  var d = new Date();
  var weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  document.getElementById('headerDate').textContent =
    d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 星期' + weekdays[d.getDay()];
}

// === Clothing CRUD ===
function openAddClothingModal() {
  document.getElementById('clothingModalTitle').textContent = '添加衣物';
  document.getElementById('editClothingId').value = '';
  document.getElementById('clothName').value = '';
  document.getElementById('clothCategory').value = '上装';
  document.getElementById('clothSeason').value = '夏';
  document.getElementById('clothPrice').value = '';
  document.getElementById('clothChannel').value = '直播间';
  document.getElementById('clothDate').value = todayStr();
  document.getElementById('clothNote').value = '';
  document.getElementById('clothingModal').classList.add('active');
}

function openEditClothingModal(id) {
  var item = appData.clothes.find(function(c) { return c.id === id; });
  if (!item) return;
  document.getElementById('clothingModalTitle').textContent = '编辑衣物';
  document.getElementById('editClothingId').value = id;
  document.getElementById('clothName').value = item.name;
  document.getElementById('clothCategory').value = item.category;
  document.getElementById('clothSeason').value = item.season;
  document.getElementById('clothPrice').value = item.price || '';
  document.getElementById('clothChannel').value = item.channel;
  document.getElementById('clothDate').value = item.purchaseDate || '';
  document.getElementById('clothNote').value = item.note || '';
  document.getElementById('clothingModal').classList.add('active');
}

function closeClothingModal() {
  document.getElementById('clothingModal').classList.remove('active');
}

function saveClothing() {
  var name = document.getElementById('clothName').value.trim();
  if (!name) { showToast('请输入衣物名称'); return; }

  var editId = document.getElementById('editClothingId').value;
  var item = {
    name: name,
    category: document.getElementById('clothCategory').value,
    season: document.getElementById('clothSeason').value,
    price: parseFloat(document.getElementById('clothPrice').value) || 0,
    channel: document.getElementById('clothChannel').value,
    purchaseDate: document.getElementById('clothDate').value,
    note: document.getElementById('clothNote').value.trim(),
    rating: 0,
    feedback: '',
    createdAt: editId ? undefined : Date.now()
  };

  if (editId) {
    var idx = appData.clothes.findIndex(function(c) { return c.id === parseInt(editId); });
    if (idx !== -1) {
      Object.assign(appData.clothes[idx], item);
    }
    showToast('已更新');
  } else {
    item.id = appData.nextId++;
    appData.clothes.push(item);
    showToast('已添加');
  }

  saveData(appData);
  closeClothingModal();
  renderHome();
  renderWardrobe();
}

function deleteClothing(id) {
  var item = appData.clothes.find(function(c) { return c.id === id; });
  if (!item) return;
  document.getElementById('confirmText').textContent = '确定要删除 "' + item.name + '" 吗？相关穿搭记录也会被清理。';
  document.getElementById('confirmBtn').onclick = function() {
    appData.clothes = appData.clothes.filter(function(c) { return c.id !== id; });
    appData.records.forEach(function(r) {
      r.clothingIds = r.clothingIds.filter(function(cid) { return cid !== id; });
    });
    saveData(appData);
    closeConfirmModal();
    renderHome();
    renderWardrobe();
    renderCalendar();
    showToast('已删除');
  };
  document.getElementById('confirmModal').classList.add('active');
}

function closeConfirmModal() {
  document.getElementById('confirmModal').classList.remove('active');
}

// === Rating ===
var currentRating = 0;

function openRateModal(id) {
  var item = appData.clothes.find(function(c) { return c.id === id; });
  if (!item) return;
  document.getElementById('rateClothingId').value = id;
  currentRating = item.rating || 0;
  document.getElementById('rateFeedback').value = item.feedback || '';
  updateRatingStars();
  document.getElementById('rateModal').classList.add('active');
}

function closeRateModal() {
  document.getElementById('rateModal').classList.remove('active');
}

function setRating(val) {
  currentRating = val;
  updateRatingStars();
}

function updateRatingStars() {
  document.querySelectorAll('#ratingStars .star').forEach(function(s) {
    s.classList.toggle('filled', parseInt(s.dataset.val) <= currentRating);
  });
}

function saveRating() {
  var id = parseInt(document.getElementById('rateClothingId').value);
  var item = appData.clothes.find(function(c) { return c.id === id; });
  if (!item) return;
  item.rating = currentRating;
  item.feedback = document.getElementById('rateFeedback').value.trim();
  saveData(appData);
  closeRateModal();
  showToast('评分已保存');
  renderWardrobe();
}

// === Outfit Record ===
var outfitSelectedIds = [];

function openOutfitModal(dateStr) {
  document.getElementById('outfitDate').value = dateStr || todayStr();
  outfitSelectedIds = [];
  var existing = getRecordForDate(dateStr || todayStr());
  if (existing) {
    outfitSelectedIds = existing.clothingIds.slice();
    document.getElementById('outfitNote').value = existing.note || '';
  } else {
    document.getElementById('outfitNote').value = '';
  }
  renderOutfitSelectList();
  document.getElementById('outfitModal').classList.add('active');
}

function closeOutfitModal() {
  document.getElementById('outfitModal').classList.remove('active');
}

var outfitFilter = 'all';

function setOutfitFilter(val) {
  outfitFilter = val;
  document.querySelectorAll('#outfitFilterBar .filter-chip').forEach(function(c) {
    c.classList.toggle('active', c.dataset.ofilter === val);
  });
  renderOutfitSelectList();
}

function filterOutfitSelect() {
  renderOutfitSelectList();
}

function renderOutfitSelectList() {
  var search = document.getElementById('outfitSearch').value.trim().toLowerCase();
  var list = appData.clothes.filter(function(c) {
    if (outfitFilter !== 'all' && c.category !== outfitFilter) return false;
    if (search && c.name.toLowerCase().indexOf(search) === -1) return false;
    return true;
  });

  var html = '';
  if (list.length === 0) {
    html = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:0.85rem">暂无衣物，请先添加</div>';
  } else {
    list.forEach(function(c) {
      var sel = outfitSelectedIds.indexOf(c.id) !== -1;
      html += '<div class="select-item' + (sel ? ' selected' : '') + '" onclick="toggleOutfitSelect(' + c.id + ')">';
      html += '<div class="select-check">' + (sel ? '✓' : '') + '</div>';
      html += '<span>' + categoryIcons[c.category] + ' ' + c.name + '</span>';
      html += '<span style="margin-left:auto;font-size:0.72rem;color:var(--muted)">' + (c.price ? '¥' + c.price : '') + '</span>';
      html += '</div>';
    });
  }
  document.getElementById('outfitSelectList').innerHTML = html;
}

function toggleOutfitSelect(id) {
  var idx = outfitSelectedIds.indexOf(id);
  if (idx === -1) {
    outfitSelectedIds.push(id);
  } else {
    outfitSelectedIds.splice(idx, 1);
  }
  renderOutfitSelectList();
}

function saveOutfit() {
  var date = document.getElementById('outfitDate').value;
  var note = document.getElementById('outfitNote').value.trim();
  if (outfitSelectedIds.length === 0) {
    showToast('请选择至少一件衣物');
    return;
  }

  var existing = appData.records.find(function(r) { return r.date === date; });
  if (existing) {
    existing.clothingIds = outfitSelectedIds.slice();
    existing.note = note;
  } else {
    appData.records.push({
      id: appData.nextRecordId++,
      date: date,
      clothingIds: outfitSelectedIds.slice(),
      note: note
    });
  }

  saveData(appData);
  closeOutfitModal();
  showToast('穿搭已记录');
  renderHome();
  renderCalendar();
}

function removeClothingFromRecord(dateStr, clothId) {
  var record = appData.records.find(function(r) { return r.date === dateStr; });
  if (!record) return;
  record.clothingIds = record.clothingIds.filter(function(id) { return id !== clothId; });
  if (record.clothingIds.length === 0) {
    appData.records = appData.records.filter(function(r) { return r.date !== dateStr; });
  }
  saveData(appData);
  renderHome();
  renderCalendar();
  renderSelectedDay(dateStr);
  showToast('已移除');
}

// === Render Home ===
function renderHome() {
  // Stats
  var total = appData.clothes.length;
  var monthStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
  var monthWear = getMonthWearCount(monthStr);

  var totalCost = 0, totalWear = 0;
  appData.clothes.forEach(function(c) {
    totalCost += c.price || 0;
    totalWear += getClothingWearCount(c.id);
  });

  var idleCount = appData.clothes.filter(function(c) { return getClothingWearCount(c.id) === 0; }).length;
  var avgCost = totalWear > 0 ? (totalCost / totalWear).toFixed(0) : '-';
  var idleRate = total > 0 ? Math.round(idleCount / total * 100) + '%' : '-';

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-month-wear').textContent = monthWear;
  document.getElementById('stat-avg-cost').textContent = avgCost === '-' ? '-' : '¥' + avgCost;
  document.getElementById('stat-idle').textContent = idleRate;

  // Today outfit
  var today = todayStr();
  var record = getRecordForDate(today);
  var todayHtml = '';
  if (record && record.clothingIds.length > 0) {
    todayHtml = '<div class="daily-outfit">';
    record.clothingIds.forEach(function(cid) {
      var c = appData.clothes.find(function(cl) { return cl.id === cid; });
      if (c) {
        todayHtml += '<span class="outfit-chip">' + categoryIcons[c.category] + ' ' + c.name + '</span>';
      }
    });
    todayHtml += '</div>';
    if (record.note) {
      todayHtml += '<div style="font-size:0.78rem;color:var(--muted);margin-top:8px">💭 ' + record.note + '</div>';
    }
  } else {
    todayHtml = '<div style="text-align:center;padding:16px;color:var(--muted);font-size:0.85rem">';
    todayHtml += '今天还没有记录<br><button class="btn btn-small btn-primary" style="margin-top:8px" onclick="openOutfitModal(\'' + today + '\')">记录穿搭</button>';
    todayHtml += '</div>';
  }
  document.getElementById('todayOutfit').innerHTML = todayHtml;

  // Mini calendar
  miniCalDate = new Date();
  renderMiniCalendar();

  // Top lists
  renderTopLists();
}

// === Mini Calendar (Home) ===
var miniCalDate = new Date();

function miniCalPrev() {
  miniCalDate.setMonth(miniCalDate.getMonth() - 1);
  renderMiniCalendar();
}

function miniCalNext() {
  miniCalDate.setMonth(miniCalDate.getMonth() + 1);
  renderMiniCalendar();
}

function renderMiniCalendar() {
  var y = miniCalDate.getFullYear();
  var m = miniCalDate.getMonth();
  document.getElementById('miniCalMonth').textContent = y + '年' + (m + 1) + '月';

  var firstDay = new Date(y, m, 1).getDay();
  var daysInMonth = new Date(y, m + 1, 0).getDate();
  var today = new Date();
  var datesWithRec = getDatesWithRecords();

  var html = '';
  ['日', '一', '二', '三', '四', '五', '六'].forEach(function(d) {
    html += '<div class="calendar-day-label">' + d + '</div>';
  });

  // Previous month days
  var prevDays = new Date(y, m, 0).getDate();
  for (var i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day other-month">' + (prevDays - firstDay + 1 + i) + '</div>';
  }

  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var isToday = (d === today.getDate() && m === today.getMonth() && y === today.getFullYear());
    var hasRec = datesWithRec.indexOf(dateStr) !== -1;
    var cls = 'calendar-day';
    if (isToday) cls += ' today';
    if (hasRec) cls += ' has-record';
    html += '<div class="' + cls + '">' + d + '</div>';
  }

  // Next month days
  var totalCells = firstDay + daysInMonth;
  var remaining = (7 - totalCells % 7) % 7;
  for (var i = 1; i <= remaining; i++) {
    html += '<div class="calendar-day other-month">' + i + '</div>';
  }

  document.getElementById('miniCalendar').innerHTML = html;
}

// === Top Lists ===
function renderTopLists() {
  // Value (lowest cost per wear)
  var withWear = appData.clothes.filter(function(c) {
    var w = getClothingWearCount(c.id);
    return w > 0;
  }).map(function(c) {
    var w = getClothingWearCount(c.id);
    return { id: c.id, name: c.name, category: c.category, price: c.price, wearCount: w, costPerWear: c.price / w };
  }).sort(function(a, b) { return a.costPerWear - b.costPerWear; });

  var html = '';
  var topValue = withWear.slice(0, 5);
  if (topValue.length === 0) {
    html = '<div style="text-align:center;color:var(--muted);font-size:0.82rem;padding:8px">暂无数据</div>';
  } else {
    topValue.forEach(function(item, i) {
      html += '<div class="analysis-item">';
      html += '<div class="analysis-rank">' + (i + 1) + '</div>';
      html += '<div class="analysis-info">';
      html += '<div class="analysis-name">' + categoryIcons[item.category] + ' ' + item.name + '</div>';
      html += '<div class="analysis-detail">¥' + item.price + ' / 穿' + item.wearCount + '次</div>';
      html += '</div>';
      html += '<div class="analysis-value">¥' + item.costPerWear.toFixed(1) + '/次</div>';
      html += '</div>';
    });
  }
  document.getElementById('topValueItems').innerHTML = html;

  // Usage (most worn)
  var usageList = appData.clothes.map(function(c) {
    return { id: c.id, name: c.name, category: c.category, wearCount: getClothingWearCount(c.id) };
  }).sort(function(a, b) { return b.wearCount - a.wearCount; });

  html = '';
  var topUsed = usageList.slice(0, 5);
  if (topUsed.length === 0 || topUsed[0].wearCount === 0) {
    html = '<div style="text-align:center;color:var(--muted);font-size:0.82rem;padding:8px">暂无数据</div>';
  } else {
    topUsed.forEach(function(item, i) {
      html += '<div class="analysis-item">';
      html += '<div class="analysis-rank" style="background:var(--accent2)">' + (i + 1) + '</div>';
      html += '<div class="analysis-info">';
      html += '<div class="analysis-name">' + categoryIcons[item.category] + ' ' + item.name + '</div>';
      html += '</div>';
      html += '<div class="analysis-value" style="color:var(--accent2)">' + item.wearCount + '次</div>';
      html += '</div>';
    });
  }
  document.getElementById('topUsedItems').innerHTML = html;
}

// === Wardrobe List ===
var currentFilter = 'all';

function setFilter(val) {
  currentFilter = val;
  document.querySelectorAll('#filterBar .filter-chip').forEach(function(c) {
    c.classList.toggle('active', c.dataset.filter === val);
  });
  renderWardrobe();
}

function renderWardrobe() {
  var search = document.getElementById('searchInput').value.trim().toLowerCase();
  var list = appData.clothes.filter(function(c) {
    if (currentFilter !== 'all' && c.category !== currentFilter) return false;
    if (search && c.name.toLowerCase().indexOf(search) === -1) return false;
    return true;
  });

  // Sort: by category, then by name
  var catOrder = ['上装', '下装', '外套', '连衣裙', '鞋子', '配饰'];
  list.sort(function(a, b) {
    var ai = catOrder.indexOf(a.category);
    var bi = catOrder.indexOf(b.category);
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });

  var html = '';
  if (list.length === 0) {
    html = '<div class="empty-state">';
    html += '<div class="empty-icon">👕</div>';
    html += '<div class="empty-text">衣橱空空如也<br>点击右上角添加衣物</div>';
    html += '</div>';
  } else {
    list.forEach(function(c) {
      var wearCount = getClothingWearCount(c.id);
      var costPerWear = wearCount > 0 ? (c.price / wearCount).toFixed(1) : '-';
      var stars = '';
      if (c.rating > 0) {
        for (var i = 0; i < 5; i++) {
          stars += i < c.rating ? '★' : '☆';
        }
      }

      html += '<div class="clothing-item">';
      html += '<div class="clothing-color" style="background:' + (categoryColors[c.category] || '#ccc') + '"></div>';
      html += '<div class="clothing-info">';
      html += '<div class="clothing-name">' + c.name + '</div>';
      html += '<div class="clothing-meta">';
      html += '<span class="tag ' + (seasonTags[c.season] || 'tag-gray') + '">' + c.season + '</span>';
      if (c.price) html += '<span class="tag tag-gray">¥' + c.price + '</span>';
      if (c.channel) html += '<span class="tag tag-gray">' + c.channel + '</span>';
      html += '</div>';
      html += '<div style="display:flex;gap:12px;margin-top:6px;font-size:0.75rem;color:var(--muted)">';
      html += '<span>穿过 ' + wearCount + ' 次</span>';
      if (costPerWear !== '-') html += '<span>¥' + costPerWear + '/次</span>';
      if (stars) html += '<span style="color:var(--warning)">' + stars + '</span>';
      html += '</div>';
      if (c.feedback) {
        html += '<div style="font-size:0.72rem;color:var(--muted);margin-top:4px">💭 ' + c.feedback + '</div>';
      }
      html += '</div>';
      html += '<div class="clothing-actions">';
      html += '<button class="btn btn-small btn-outline" onclick="openRateModal(' + c.id + ')" title="评分">⭐</button>';
      html += '<button class="btn btn-small btn-outline" onclick="openEditClothingModal(' + c.id + ')" title="编辑">✏️</button>';
      html += '<button class="btn btn-small btn-outline" onclick="deleteClothing(' + c.id + ')" title="删除" style="color:var(--danger)">🗑</button>';
      html += '</div>';
      html += '</div>';
    });
  }
  document.getElementById('wardrobeList').innerHTML = html;
}

// === Calendar Page ===
var calDate = new Date();

function calPrev() {
  calDate.setMonth(calDate.getMonth() - 1);
  renderCalendar();
}

function calNext() {
  calDate.setMonth(calDate.getMonth() + 1);
  renderCalendar();
}

function renderCalendar() {
  var y = calDate.getFullYear();
  var m = calDate.getMonth();
  document.getElementById('calMonth').textContent = y + '年' + (m + 1) + '月';

  var firstDay = new Date(y, m, 1).getDay();
  var daysInMonth = new Date(y, m + 1, 0).getDate();
  var today = new Date();
  var datesWithRec = getDatesWithRecords();

  var html = '';
  ['日', '一', '二', '三', '四', '五', '六'].forEach(function(d) {
    html += '<div class="calendar-day-label">' + d + '</div>';
  });

  var prevDays = new Date(y, m, 0).getDate();
  for (var i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day other-month">' + (prevDays - firstDay + 1 + i) + '</div>';
  }

  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var isToday = (d === today.getDate() && m === today.getMonth() && y === today.getFullYear());
    var hasRec = datesWithRec.indexOf(dateStr) !== -1;
    var cls = 'calendar-day';
    if (isToday) cls += ' today';
    if (hasRec) cls += ' has-record';
    html += '<div class="' + cls + '" onclick="selectDay(\'' + dateStr + '\')">' + d + '</div>';
  }

  var totalCells = firstDay + daysInMonth;
  var remaining = (7 - totalCells % 7) % 7;
  for (var i = 1; i <= remaining; i++) {
    html += '<div class="calendar-day other-month">' + i + '</div>';
  }

  document.getElementById('calendarGrid').innerHTML = html;

  // Reset selected day
  document.getElementById('selectedDayTitle').textContent = '选择日期查看穿搭';
  document.getElementById('selectedDayContent').innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">点击日历上的日期<br>查看或记录穿搭</div></div>';
}

function selectDay(dateStr) {
  var parts = dateStr.split('-');
  document.getElementById('selectedDayTitle').textContent = parts[1] + '月' + parseInt(parts[2]) + '日 穿搭';
  renderSelectedDay(dateStr);
}

function renderSelectedDay(dateStr) {
  var record = getRecordForDate(dateStr);
  var html = '';

  if (record && record.clothingIds.length > 0) {
    html += '<div class="daily-outfit">';
    record.clothingIds.forEach(function(cid) {
      var c = appData.clothes.find(function(cl) { return cl.id === cid; });
      if (c) {
        html += '<span class="outfit-chip">' + categoryIcons[c.category] + ' ' + c.name;
        html += ' <span class="remove-outfit" onclick="removeClothingFromRecord(\'' + dateStr + '\',' + cid + ')">×</span>';
        html += '</span>';
      }
    });
    html += '</div>';
    if (record.note) {
      html += '<div style="font-size:0.78rem;color:var(--muted);margin-top:8px">💭 ' + record.note + '</div>';
    }
    html += '<div style="margin-top:12px;display:flex;gap:8px">';
    html += '<button class="btn btn-small btn-secondary" onclick="openOutfitModal(\'' + dateStr + '\')">编辑</button>';
    html += '</div>';
  } else {
    html = '<div style="text-align:center;padding:16px;color:var(--muted);font-size:0.85rem">';
    html += '这天没有记录<br><button class="btn btn-small btn-primary" style="margin-top:8px" onclick="openOutfitModal(\'' + dateStr + '\')">添加记录</button>';
    html += '</div>';
  }

  document.getElementById('selectedDayContent').innerHTML = html;
}

// === Analysis Page ===
function renderAnalysis() {
  var totalCost = 0, totalWear = 0;
  appData.clothes.forEach(function(c) {
    totalCost += c.price || 0;
    totalWear += getClothingWearCount(c.id);
  });

  var avgCost = totalWear > 0 ? '¥' + (totalCost / totalWear).toFixed(0) : '-';
  document.getElementById('ana-total-cost').textContent = '¥' + formatMoney(totalCost);
  document.getElementById('ana-total-wear').textContent = totalWear;
  document.getElementById('ana-avg-cost').textContent = avgCost;
  document.getElementById('ana-record-days').textContent = appData.records.length;

  // Usage rank
  var usageList = appData.clothes.map(function(c) {
    return { id: c.id, name: c.name, category: c.category, price: c.price, wearCount: getClothingWearCount(c.id), costPerWear: getClothingWearCount(c.id) > 0 ? c.price / getClothingWearCount(c.id) : Infinity };
  }).sort(function(a, b) { return b.wearCount - a.wearCount; });

  var html = '';
  usageList.forEach(function(item, i) {
    if (item.wearCount === 0) return;
    html += '<div class="analysis-item">';
    html += '<div class="analysis-rank">' + (i + 1) + '</div>';
    html += '<div class="analysis-info">';
    html += '<div class="analysis-name">' + categoryIcons[item.category] + ' ' + item.name + '</div>';
    html += '<div class="analysis-detail">¥' + item.price + ' | 单次 ¥' + (item.costPerWear === Infinity ? '-' : item.costPerWear.toFixed(1)) + '</div>';
    html += '</div>';
    html += '<div class="analysis-value">' + item.wearCount + '次</div>';
    html += '</div>';
  });
  document.getElementById('anaUsageRank').innerHTML = html || '<div style="text-align:center;color:var(--muted);font-size:0.82rem;padding:8px">暂无数据</div>';

  // Value rank
  var valueList = usageList.filter(function(i) { return i.costPerWear !== Infinity; }).sort(function(a, b) { return a.costPerWear - b.costPerWear; });

  html = '';
  valueList.forEach(function(item, i) {
    html += '<div class="analysis-item">';
    html += '<div class="analysis-rank" style="background:var(--accent2)">' + (i + 1) + '</div>';
    html += '<div class="analysis-info">';
    html += '<div class="analysis-name">' + categoryIcons[item.category] + ' ' + item.name + '</div>';
    html += '<div class="analysis-detail">¥' + item.price + ' | 穿' + item.wearCount + '次</div>';
    html += '</div>';
    html += '<div class="analysis-value" style="color:var(--accent2)">¥' + item.costPerWear.toFixed(1) + '</div>';
    html += '</div>';
  });
  document.getElementById('anaValueRank').innerHTML = html || '<div style="text-align:center;color:var(--muted);font-size:0.82rem;padding:8px">暂无数据</div>';

  // Channel analysis
  var channels = {};
  appData.clothes.forEach(function(c) {
    var ch = c.channel || '未知';
    if (!channels[ch]) channels[ch] = { count: 0, cost: 0, wear: 0 };
    channels[ch].count++;
    channels[ch].cost += c.price || 0;
    channels[ch].wear += getClothingWearCount(c.id);
  });

  html = '';
  Object.keys(channels).forEach(function(ch) {
    var d = channels[ch];
    var avg = d.wear > 0 ? (d.cost / d.wear).toFixed(0) : '-';
    html += '<div class="analysis-item">';
    html += '<div class="analysis-info">';
    html += '<div class="analysis-name">' + ch + '</div>';
    html += '<div class="analysis-detail">' + d.count + '件 | 总计¥' + d.cost + ' | 总穿' + d.wear + '次</div>';
    html += '</div>';
    html += '<div class="analysis-value">¥' + avg + '/次</div>';
    html += '</div>';
  });
  document.getElementById('anaChannelAnalysis').innerHTML = html || '<div style="text-align:center;color:var(--muted);font-size:0.82rem;padding:8px">暂无数据</div>';

  // Rating distribution
  var ratingDist = [0, 0, 0, 0, 0];
  var ratedCount = 0;
  appData.clothes.forEach(function(c) {
    if (c.rating > 0) {
      ratingDist[c.rating - 1]++;
      ratedCount++;
    }
  });

  html = '';
  if (ratedCount === 0) {
    html = '<div style="text-align:center;color:var(--muted);font-size:0.82rem;padding:8px">还没有评分记录</div>';
  } else {
    for (var i = 5; i >= 1; i--) {
      var stars = '';
      for (var j = 0; j < 5; j++) stars += j < i ? '★' : '☆';
      var pct = Math.round(ratingDist[i - 1] / ratedCount * 100);
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
      html += '<span style="font-size:0.82rem;color:var(--warning);width:80px">' + stars + '</span>';
      html += '<div style="flex:1"><div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div></div>';
      html += '<span style="font-size:0.78rem;color:var(--muted);width:60px;text-align:right">' + ratingDist[i - 1] + '件 (' + pct + '%)</span>';
      html += '</div>';
    }
  }
  document.getElementById('anaRatingDist').innerHTML = html;

  // Idle items
  var idleItems = appData.clothes.filter(function(c) { return getClothingWearCount(c.id) === 0; });
  idleItems.sort(function(a, b) { return (b.price || 0) - (a.price || 0); });

  html = '';
  if (idleItems.length === 0) {
    html = '<div style="text-align:center;color:var(--accent2);font-size:0.85rem;padding:12px">太棒了！没有闲置衣物 🎉</div>';
  } else {
    var idleCost = 0;
    idleItems.forEach(function(c) {
      idleCost += c.price || 0;
      html += '<div class="analysis-item">';
      html += '<div class="analysis-info">';
      html += '<div class="analysis-name">' + categoryIcons[c.category] + ' ' + c.name + '</div>';
      html += '<div class="analysis-detail">' + c.channel + (c.purchaseDate ? ' | ' + formatDate(c.purchaseDate) : '') + '</div>';
      html += '</div>';
      html += '<div class="analysis-value" style="color:var(--danger)">¥' + (c.price || 0) + '</div>';
      html += '</div>';
    });
    html = '<div style="font-size:0.78rem;color:var(--danger);margin-bottom:10px">共 ' + idleItems.length + ' 件闲置，合计 ¥' + idleCost + '</div>' + html;
  }
  document.getElementById('anaIdleItems').innerHTML = html;
}

// === Modal close on overlay click ===
document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      overlay.classList.remove('active');
    }
  });
});

// === Diary Data ===
var DIARY_KEY = 'diary_manager';

function loadDiaryData() {
  try {
    var raw = localStorage.getItem(DIARY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { diaries: [], nextId: 1 };
}

function saveDiaryData(data) {
  localStorage.setItem(DIARY_KEY, JSON.stringify(data));
}

var diaryData = loadDiaryData();

var moodEmojis = { 5: '😄', 4: '🙂', 3: '😐', 2: '😔', 1: '😢' };
var moodLabels = { 5: '很开心', 4: '还不错', 3: '一般', 2: '有点低落', 1: '很差' };
var moodColors = { 5: '#7a9e7e', 4: '#a8c97f', 3: '#d4a55a', 2: '#c4856c', 1: '#c46b6b' };

function getDiaryForDate(dateStr) {
  return diaryData.diaries.find(function(d) { return d.date === dateStr; });
}

function getLastYearDiary(dateStr) {
  var parts = dateStr.split('-');
  var lastYear = (parseInt(parts[0]) - 1) + '-' + parts[1] + '-' + parts[2];
  return getDiaryForDate(lastYear);
}

// === Mood Selector ===
var selectedMood = 0;

function selectMood(val) {
  selectedMood = val;
  document.querySelectorAll('.mood-option').forEach(function(el) {
    el.classList.toggle('selected', parseInt(el.dataset.mood) === val);
  });
}

// === Diary CRUD ===
function saveDiary() {
  var date = todayStr();
  var event = document.getElementById('diaryEvent').value.trim();
  var thought = document.getElementById('diaryThought').value.trim();
  var tagsStr = document.getElementById('diaryTags').value.trim();
  var tags = tagsStr ? tagsStr.split(/[\s,，、]+/).filter(function(t) { return t; }) : [];

  if (!event && !thought && selectedMood === 0) {
    showToast('请至少填写心情或内容');
    return;
  }

  var existing = getDiaryForDate(date);
  if (existing) {
    existing.mood = selectedMood || existing.mood;
    existing.event = event || existing.event;
    existing.thought = thought || existing.thought;
    if (tags.length > 0) existing.tags = tags;
    existing.updatedAt = Date.now();
  } else {
    diaryData.diaries.push({
      id: diaryData.nextId++,
      date: date,
      mood: selectedMood,
      event: event,
      thought: thought,
      tags: tags,
      createdAt: Date.now()
    });
  }

  saveDiaryData(diaryData);
  showToast('日记已保存');
  renderDiaryPage();
}

// === Render Diary Page ===
function renderDiaryPage() {
  var date = todayStr();
  var entry = getDiaryForDate(date);

  // Mood
  if (entry && entry.mood > 0) {
    selectMood(entry.mood);
    document.getElementById('diaryMoodCard').style.display = 'none';
  } else {
    selectedMood = 0;
    document.querySelectorAll('.mood-option').forEach(function(el) { el.classList.remove('selected'); });
    document.getElementById('diaryMoodCard').style.display = '';
  }

  // Form
  if (entry) {
    document.getElementById('diaryEvent').value = entry.event || '';
    document.getElementById('diaryThought').value = entry.thought || '';
    document.getElementById('diaryTags').value = (entry.tags || []).join(' ');
  } else {
    document.getElementById('diaryEvent').value = '';
    document.getElementById('diaryThought').value = '';
    document.getElementById('diaryTags').value = '';
  }

  // Today entry display
  var todayHtml = '';
  if (entry) {
    todayHtml = '<div class="diary-entry">';
    todayHtml += '<div class="diary-entry-header">';
    todayHtml += '<span class="diary-entry-mood">' + (moodEmojis[entry.mood] || '') + '</span>';
    todayHtml += '<span class="diary-entry-date">今日心情：' + (moodLabels[entry.mood] || '未记录') + '</span>';
    todayHtml += '</div>';
    if (entry.event) todayHtml += '<div class="diary-entry-text"><strong>事件：</strong>' + escapeHtml(entry.event) + '</div>';
    if (entry.thought) todayHtml += '<div class="diary-entry-text"><strong>想法：</strong>' + escapeHtml(entry.thought) + '</div>';
    if (entry.tags && entry.tags.length > 0) {
      todayHtml += '<div class="diary-entry-tags">';
      entry.tags.forEach(function(t) { todayHtml += '<span class="diary-tag">' + escapeHtml(t) + '</span>'; });
      todayHtml += '</div>';
    }
    todayHtml += '</div>';
  } else {
    todayHtml = '<div style="text-align:center;color:var(--muted);font-size:0.85rem;padding:8px">今天还没有记录，在下面开始写吧</div>';
  }
  document.getElementById('diaryTodayEntry').innerHTML = todayHtml;

  // Last year today
  var lastYear = getLastYearDiary(date);
  var lastYearHtml = '';
  if (lastYear) {
    lastYearHtml = '<div class="diary-entry">';
    lastYearHtml += '<div class="diary-entry-header">';
    lastYearHtml += '<span class="diary-entry-mood">' + (moodEmojis[lastYear.mood] || '') + '</span>';
    lastYearHtml += '<span class="diary-entry-date">去年今日 (' + (parseInt(date.split('-')[0]) - 1) + '年)</span>';
    lastYearHtml += '</div>';
    if (lastYear.event) lastYearHtml += '<div class="diary-entry-text">' + escapeHtml(lastYear.event) + '</div>';
    if (lastYear.thought) lastYearHtml += '<div class="diary-entry-text">' + escapeHtml(lastYear.thought) + '</div>';
    lastYearHtml += '</div>';
  } else {
    lastYearHtml = '<div style="text-align:center;color:var(--muted);font-size:0.82rem;padding:8px">去年今日没有记录</div>';
  }
  document.getElementById('diaryLastYear').innerHTML = lastYearHtml;
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// === Diary History ===
var diaryHistDate = new Date();

function diaryHistPrev() {
  diaryHistDate.setMonth(diaryHistDate.getMonth() - 1);
  renderDiaryHistory();
}

function diaryHistNext() {
  diaryHistDate.setMonth(diaryHistDate.getMonth() + 1);
  renderDiaryHistory();
}

function renderDiaryHistory() {
  var y = diaryHistDate.getFullYear();
  var m = diaryHistDate.getMonth();
  document.getElementById('diaryHistMonth').textContent = y + '年' + (m + 1) + '月';

  var firstDay = new Date(y, m, 1).getDay();
  var daysInMonth = new Date(y, m + 1, 0).getDate();
  var today = new Date();

  var datesWithDiary = diaryData.diaries.map(function(d) { return d.date; });

  var html = '';
  ['日', '一', '二', '三', '四', '五', '六'].forEach(function(d) {
    html += '<div class="calendar-day-label">' + d + '</div>';
  });

  var prevDays = new Date(y, m, 0).getDate();
  for (var i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day other-month">' + (prevDays - firstDay + 1 + i) + '</div>';
  }

  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var isToday = (d === today.getDate() && m === today.getMonth() && y === today.getFullYear());
    var hasDiary = datesWithDiary.indexOf(dateStr) !== -1;
    var entry = hasDiary ? getDiaryForDate(dateStr) : null;
    var cls = 'calendar-day';
    if (isToday) cls += ' today';
    if (hasDiary) cls += ' has-record';
    html += '<div class="' + cls + '" onclick="viewDiaryDay(\'' + dateStr + '\')" style="' + (entry && entry.mood ? 'font-weight:bold;' : '') + '">' + d + '</div>';
  }

  var totalCells = firstDay + daysInMonth;
  var remaining = (7 - totalCells % 7) % 7;
  for (var i = 1; i <= remaining; i++) {
    html += '<div class="calendar-day other-month">' + i + '</div>';
  }

  document.getElementById('diaryHistCalendar').innerHTML = html;

  // List entries for this month
  var monthPrefix = y + '-' + String(m + 1).padStart(2, '0');
  var monthDiaries = diaryData.diaries.filter(function(d) { return d.date.startsWith(monthPrefix); })
    .sort(function(a, b) { return b.date.localeCompare(a.date); });

  var listHtml = '';
  monthDiaries.forEach(function(entry) {
    var parts = entry.date.split('-');
    listHtml += '<div class="clothing-item" onclick="viewDiaryDay(\'' + entry.date + '\')" style="cursor:pointer">';
    listHtml += '<div class="clothing-color" style="background:' + (moodColors[entry.mood] || '#ccc') + ';font-size:1.3rem;display:flex;align-items:center;justify-content:center">' + (moodEmojis[entry.mood] || '') + '</div>';
    listHtml += '<div class="clothing-info">';
    listHtml += '<div class="clothing-name">' + parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日 ' + (moodLabels[entry.mood] || '') + '</div>';
    listHtml += '<div style="font-size:0.78rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml((entry.event || entry.thought || '无内容').substring(0, 60)) + '</div>';
    if (entry.tags && entry.tags.length > 0) {
      listHtml += '<div class="clothing-meta" style="margin-top:4px">';
      entry.tags.forEach(function(t) { listHtml += '<span class="tag tag-gray">' + escapeHtml(t) + '</span>'; });
      listHtml += '</div>';
    }
    listHtml += '</div>';
    listHtml += '</div>';
  });

  if (monthDiaries.length === 0) {
    listHtml = '<div class="empty-state"><div class="empty-icon">📖</div><div class="empty-text">这个月还没有日记</div></div>';
  }

  // Health records for this month
  var monthPrefix = y + '-' + String(m + 1).padStart(2, '0');
  var monthHealth = healthData.records.filter(function(r) { return r.date.startsWith(monthPrefix); })
    .sort(function(a, b) { return a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''); });

  if (monthHealth.length > 0) {
    listHtml += '<div class="card" style="margin-top:12px"><div class="card-title">健康记录</div>';
    var lastDate = '';
    monthHealth.forEach(function(r) {
      if (r.date !== lastDate) {
        var parts = r.date.split('-');
        listHtml += '<div style="font-size:0.78rem;font-weight:600;color:var(--muted);margin:8px 0 4px;padding-top:8px;border-top:1px solid var(--rule)">' + parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日</div>';
        lastDate = r.date;
      }
      var bgColors = { meal: '#fef3c7', water: '#dbeafe', bowel: '#d1fae5', sleep: '#ede9fe', drink: '#fce7f3' };
      listHtml += '<div style="display:flex;gap:8px;align-items:center;padding:4px 0">';
      listHtml += '<span style="font-size:1rem">' + healthTypeIcons[r.type] + '</span>';
      listHtml += '<span style="font-size:0.82rem;flex:1">';
      listHtml += (r.time || '') + ' ';
      if (r.type === 'meal') {
        listHtml += mealTypeNames[r.mealType] + ' ' + (r.content || '').substring(0, 30);
      } else if (r.type === 'water') {
        listHtml += (r.amount || 0) + 'ml';
      } else if (r.type === 'bowel') {
        listHtml += bowelTypeNames[r.bowelType];
      } else if (r.type === 'sleep') {
        listHtml += (r.duration ? r.duration.toFixed(1) + 'h' : '') + ' ' + (r.bedtime || '') + '~' + (r.waketime || '');
      } else if (r.type === 'drink') {
        listHtml += (drinkTypeNames[r.drinkType] || '饮品') + ' ' + (r.note || '');
      }
      listHtml += '</span></div>';
    });
    listHtml += '</div>';
  }

  document.getElementById('diaryHistList').innerHTML = listHtml;
}

function viewDiaryDay(dateStr) {
  var entry = getDiaryForDate(dateStr);
  var parts = dateStr.split('-');

  document.getElementById('diaryViewTitle').textContent = parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日';

  var html = '';
  if (entry) {
    html += '<div style="text-align:center;margin-bottom:12px">';
    html += '<span style="font-size:2.5rem">' + (moodEmojis[entry.mood] || '') + '</span>';
    html += '<div style="font-size:0.85rem;color:var(--muted)">' + (moodLabels[entry.mood] || '未记录心情') + '</div>';
    html += '</div>';
    if (entry.event) html += '<div style="margin-bottom:12px"><div style="font-size:0.78rem;font-weight:600;color:var(--muted);margin-bottom:4px">事件</div><div style="font-size:0.88rem;line-height:1.7">' + escapeHtml(entry.event).replace(/\n/g, '<br>') + '</div></div>';
    if (entry.thought) html += '<div style="margin-bottom:12px"><div style="font-size:0.78rem;font-weight:600;color:var(--muted);margin-bottom:4px">感受 & 想法</div><div style="font-size:0.88rem;line-height:1.7">' + escapeHtml(entry.thought).replace(/\n/g, '<br>') + '</div></div>';
    if (entry.tags && entry.tags.length > 0) {
      html += '<div class="diary-entry-tags">';
      entry.tags.forEach(function(t) { html += '<span class="diary-tag">' + escapeHtml(t) + '</span>'; });
      html += '</div>';
    }
    // Last year
    var lastYear = getLastYearDiary(dateStr);
    if (lastYear) {
      html += '<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--rule)">';
      html += '<div style="font-size:0.78rem;font-weight:600;color:var(--muted);margin-bottom:6px">去年今日 (' + (parseInt(parts[0]) - 1) + '年)</div>';
      html += '<div style="font-size:2rem">' + (moodEmojis[lastYear.mood] || '') + '</div>';
      if (lastYear.event) html += '<div style="font-size:0.82rem;color:var(--muted);margin-top:4px">' + escapeHtml(lastYear.event).substring(0, 100) + '</div>';
      html += '</div>';
    }

    document.getElementById('diaryDeleteBtn').onclick = function() {
      diaryData.diaries = diaryData.diaries.filter(function(d) { return d.date !== dateStr; });
      saveDiaryData(diaryData);
      closeDiaryViewModal();
      renderDiaryHistory();
      renderDiaryPage();
      showToast('已删除');
    };
    document.getElementById('diaryDeleteBtn').style.display = '';
  } else {
    html = '<div style="text-align:center;color:var(--muted);padding:20px">这天没有日记</div>';
    document.getElementById('diaryDeleteBtn').style.display = 'none';
  }

    // Health records for this date
    var dayHealth = healthData.records.filter(function(r) { return r.date === dateStr; })
      .sort(function(a, b) { return (a.time || '').localeCompare(b.time || ''); });
    if (dayHealth.length > 0) {
      html += '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--rule)">';
      html += '<div style="font-size:0.78rem;font-weight:600;color:var(--muted);margin-bottom:8px">健康记录</div>';
      dayHealth.forEach(function(r) {
        html += '<div style="display:flex;gap:8px;align-items:center;padding:3px 0;font-size:0.82rem">';
        html += '<span>' + healthTypeIcons[r.type] + '</span>';
        html += '<span style="flex:1">';
        html += healthTypeNames[r.type] + ' ' + (r.time || '') + ' ';
        if (r.type === 'meal') html += mealTypeNames[r.mealType] + ' | ' + cookedNames[r.cooked] + ' | ' + (r.content || '').substring(0, 40);
        else if (r.type === 'water') html += (r.amount || 0) + 'ml ' + (r.note || '');
        else if (r.type === 'bowel') html += bowelTypeNames[r.bowelType] + ' ' + (r.note || '');
        else if (r.type === 'sleep') html += (r.duration ? r.duration.toFixed(1) + '小时' : '') + ' (' + (r.bedtime || '') + '~' + (r.waketime || '') + ') ' + (r.rating ? '\u2605'.repeat(r.rating) : '');
        html += '</span></div>';
      });
      html += '</div>';
    }

  document.getElementById('diaryViewContent').innerHTML = html;
  document.getElementById('diaryViewModal').classList.add('active');
}

function closeDiaryViewModal() {
  document.getElementById('diaryViewModal').classList.remove('active');
}

// === Diary Analysis ===
function renderDiaryAnalysis() {
  var all = diaryData.diaries;
  var withMood = all.filter(function(d) { return d.mood > 0; });

  // Stats
  document.getElementById('da-total').textContent = all.length;

  var avgMood = '-';
  var avgLabel = '';
  if (withMood.length > 0) {
    var sum = 0;
    withMood.forEach(function(d) { sum += d.mood; });
    var avg = sum / withMood.length;
    avgMood = avg.toFixed(1);
    if (avg >= 4) avgLabel = moodEmojis[5] + ' 不错';
    else if (avg >= 3) avgLabel = moodEmojis[3] + ' 平平';
    else avgLabel = moodEmojis[2] + ' 低落';
  }
  document.getElementById('da-avg-mood').textContent = avgMood;
  document.getElementById('da-avg-mood-label').textContent = avgLabel;

  var monthStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
  var monthCount = all.filter(function(d) { return d.date.startsWith(monthStr); }).length;
  document.getElementById('da-month-count').textContent = monthCount;

  // Streak
  var streak = 0;
  var sorted = all.map(function(d) { return d.date; }).sort().reverse();
  var checkDate = new Date();
  if (sorted.length > 0 && sorted[0] !== todayStr()) {
    // Start from yesterday if today not recorded
    checkDate.setDate(checkDate.getDate() - 1);
  }
  for (var i = 0; i < 365; i++) {
    var ds = checkDate.getFullYear() + '-' + String(checkDate.getMonth() + 1).padStart(2, '0') + '-' + String(checkDate.getDate()).padStart(2, '0');
    if (sorted.indexOf(ds) !== -1) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  document.getElementById('da-streak').textContent = streak;

  // Mood trend chart
  renderMoodTrend();

  // Weekday mood
  renderWeekdayMood(withMood);

  // Tag cloud
  renderTagCloud(all);

  // Mood correlation
  renderMoodCorrelation(all);

  // Low mood alert
  renderLowMoodAlert(all);
}

function renderMoodTrend() {
  var monthStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
  var daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  var html = '<div class="mood-chart">';
  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var entry = getDiaryForDate(dateStr);
    var mood = entry && entry.mood > 0 ? entry.mood : 0;
    var height = mood > 0 ? (mood * 18) : 4;
    var color = mood > 0 ? moodColors[mood] : 'var(--rule)';
    html += '<div class="mood-bar-wrapper">';
    html += '<div class="mood-bar" style="height:' + height + 'px;background:' + color + '" title="' + d + '日 ' + (moodLabels[mood] || '无') + '"></div>';
    html += '<div class="mood-bar-label">' + d + '</div>';
    html += '</div>';
  }
  html += '</div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:0.68rem;color:var(--muted);margin-top:4px">';
  html += '<span>😢 低落</span><span>😐 一般</span><span>😄 开心</span>';
  html += '</div>';

  document.getElementById('daMoodTrend').innerHTML = html;
}

function renderWeekdayMood(withMood) {
  var weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  var weekdayAvg = [0, 0, 0, 0, 0, 0, 0];
  var weekdayCount = [0, 0, 0, 0, 0, 0, 0];

  withMood.forEach(function(d) {
    var day = new Date(d.date).getDay();
    weekdayAvg[day] += d.mood;
    weekdayCount[day]++;
  });

  var html = '';
  weekdayNames.forEach(function(name, i) {
    var avg = weekdayCount[i] > 0 ? (weekdayAvg[i] / weekdayCount[i]).toFixed(1) : '-';
    var color = avg !== '-' ? moodColors[Math.round(parseFloat(avg))] : 'var(--muted)';
    html += '<div class="analysis-item">';
    html += '<div class="analysis-info">';
    html += '<div class="analysis-name">' + name + '</div>';
    html += '<div class="analysis-detail">' + weekdayCount[i] + ' 条记录</div>';
    html += '</div>';
    html += '<div class="analysis-value" style="color:' + color + '">' + avg + '</div>';
    html += '</div>';
  });

  document.getElementById('daWeekdayMood').innerHTML = html;
}

function renderTagCloud(all) {
  var tagMap = {};
  all.forEach(function(d) {
    (d.tags || []).forEach(function(t) {
      tagMap[t] = (tagMap[t] || 0) + 1;
    });
  });

  var tags = Object.keys(tagMap).map(function(t) { return { tag: t, count: tagMap[t] }; }).sort(function(a, b) { return b.count - a.count; });

  var html = '';
  if (tags.length === 0) {
    html = '<div style="text-align:center;color:var(--muted);font-size:0.82rem;padding:8px">暂无标签数据</div>';
  } else {
    html = '<div class="tag-cloud">';
    tags.forEach(function(item) {
      html += '<span class="tag-cloud-item">' + escapeHtml(item.tag) + '<span class="tag-count">(' + item.count + ')</span></span>';
    });
    html += '</div>';
  }

  document.getElementById('daTagCloud').innerHTML = html;
}

function renderMoodCorrelation(all) {
  var withMood = all.filter(function(d) { return d.mood > 0 && d.tags && d.tags.length > 0; });

  var tagMood = {};
  withMood.forEach(function(d) {
    d.tags.forEach(function(t) {
      if (!tagMood[t]) tagMood[t] = { total: 0, count: 0 };
      tagMood[t].total += d.mood;
      tagMood[t].count++;
    });
  });

  var tags = Object.keys(tagMood).map(function(t) {
    return { tag: t, avg: tagMood[t].total / tagMood[t].count, count: tagMood[t].count };
  }).filter(function(t) { return t.count >= 2; }).sort(function(a, b) { return b.avg - a.avg; });

  var html = '';
  if (tags.length === 0) {
    html = '<div style="text-align:center;color:var(--muted);font-size:0.82rem;padding:8px">需要更多数据（每个标签至少2条记录）</div>';
  } else {
    html += '<div style="font-size:0.75rem;color:var(--muted);margin-bottom:10px">标签关联的平均心情（至少2条记录）</div>';
    tags.forEach(function(item) {
      var color = moodColors[Math.round(item.avg)] || 'var(--muted)';
      html += '<div class="analysis-item">';
      html += '<div class="analysis-info">';
      html += '<div class="analysis-name">' + escapeHtml(item.tag) + '</div>';
      html += '<div class="analysis-detail">' + item.count + ' 条记录</div>';
      html += '</div>';
      html += '<div class="analysis-value" style="color:' + color + '">' + item.avg.toFixed(1) + ' ' + (moodEmojis[Math.round(item.avg)] || '') + '</div>';
      html += '</div>';
    });
  }

  document.getElementById('daMoodCorrelation').innerHTML = html;
}

function renderLowMoodAlert(all) {
  var sorted = all.filter(function(d) { return d.mood > 0; }).sort(function(a, b) { return a.date.localeCompare(b.date); });

  var alerts = [];
  var streak = 0;
  var streakStart = '';

  sorted.forEach(function(d) {
    if (d.mood <= 2) {
      if (streak === 0) streakStart = d.date;
      streak++;
    } else {
      if (streak >= 3) {
        alerts.push({ start: streakStart, days: streak });
      }
      streak = 0;
    }
  });
  if (streak >= 3) {
    alerts.push({ start: streakStart, days: streak });
  }

  var html = '';
  if (alerts.length === 0) {
    html = '<div style="text-align:center;color:var(--accent2);font-size:0.85rem;padding:12px">没有连续低落记录，挺好的</div>';
  } else {
    alerts.forEach(function(a) {
      var parts = a.start.split('-');
      html += '<div class="analysis-item">';
      html += '<div class="analysis-info">';
      html += '<div class="analysis-name" style="color:var(--danger)">连续 ' + a.days + ' 天低落</div>';
      html += '<div class="analysis-detail">从 ' + parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日 开始</div>';
      html += '</div>';
      html += '</div>';
    });
    html += '<div style="font-size:0.78rem;color:var(--muted);margin-top:8px;padding:8px;background:var(--bg2);border-radius:8px">如果出现连续低落，建议关注自己的状态，必要时寻求专业帮助。</div>';
  }

  document.getElementById('daLowMoodAlert').innerHTML = html;
}

// === Health Data ===
var HEALTH_KEY = 'health_manager';

function loadHealthData() {
  try {
    var raw = localStorage.getItem(HEALTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { records: [], nextId: 1 };
}

function saveHealthData(data) {
  localStorage.setItem(HEALTH_KEY, JSON.stringify(data));
}

var healthData = loadHealthData();

var healthTypeIcons = { meal: '🍽️', water: '💧', bowel: '🚽', sleep: '😴', drink: '☕' };
var healthTypeNames = { meal: '饮食', water: '饮水', bowel: '排泄', sleep: '睡眠', drink: '饮品' };
var mealTypeNames = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' };
var bowelTypeNames = { normal: '正常', loose: '偏稀', constipation: '便秘' };
var cookedNames = { yes: '自己做', no: '外食', half: '一半一半' };

// === Sub-tab switching ===
function switchSubPage(name) {
  document.querySelectorAll('.sub-tab').forEach(function(t) { t.classList.remove('active'); });
  document.querySelectorAll('.sub-page').forEach(function(p) { p.classList.remove('active'); });
  event.currentTarget.classList.add('active');
  document.getElementById('sub-' + name).classList.add('active');
  if (name === 'health') renderHealthPage();
}

// === Health Modal ===
var healthMealType = 'breakfast';
var healthCooked = 'yes';
var healthBowelType = 'normal';
var healthRatingVal = 0;
var healthSleepRatingVal = 0;
var healthDrinkType = 'coffee';

// Body stats constants (female, born 1995-07-08, height 162cm)
var BODY_HEIGHT = 162;
var BODY_BIRTHDATE = '1995-07-08';
var BODY_AGE = calcAge(BODY_BIRTHDATE);
var BODY_STATS_KEY = 'body_stats_manager';

function calcAge(birthStr) {
  var parts = birthStr.split('-');
  var birth = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  var today = new Date();
  var age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
}

function calcBMI(weight) {
  var h = BODY_HEIGHT / 100;
  return weight / (h * h);
}

function getBMILabel(bmi) {
  if (bmi < 18.5) return '偏瘦';
  if (bmi < 24) return '正常';
  if (bmi < 28) return '偏胖';
  return '肥胖';
}

// Mifflin-St Jeor (female)
function calcBMR(weight) {
  return 10 * weight + 6.25 * BODY_HEIGHT - 5 * BODY_AGE - 161;
}

function loadBodyData() {
  try {
    var raw = localStorage.getItem(BODY_STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { records: [], nextId: 1 };
}

function saveBodyData(data) {
  localStorage.setItem(BODY_STATS_KEY, JSON.stringify(data));
}

var bodyData = loadBodyData();

function openHealthModal(type) {
  document.getElementById('healthRecordType').value = type;
  document.getElementById('healthEditId').value = '';
  document.getElementById('healthDate').value = todayStr();
  document.getElementById('healthTime').value = new Date().toTimeString().substring(0, 5);

  // Hide all field sections
  ['meal', 'water', 'bowel', 'sleep', 'drink'].forEach(function(t) {
    var el = document.getElementById('healthFields-' + t);
    if (el) el.style.display = 'none';
  });
  if (type === 'body') {
    openBodyModal();
    return;
  }
  document.getElementById('healthFields-' + type).style.display = '';

  var titles = { meal: '记录饮食', water: '记录饮水', bowel: '记录排泄', sleep: '记录睡眠', drink: '记录饮品' };
  document.getElementById('healthModalTitle').textContent = titles[type];

  // Reset fields
  if (type === 'meal') {
    healthMealType = 'breakfast'; healthCooked = 'yes'; healthRatingVal = 0;
    document.querySelectorAll('.health-meal-type').forEach(function(b) { b.classList.toggle('active', b.dataset.type === 'breakfast'); });
    document.querySelectorAll('.health-cooked').forEach(function(b) { b.classList.toggle('active', b.dataset.val === 'yes'); });
    document.getElementById('healthMealContent').value = '';
    document.getElementById('healthMealLocation').value = '';
    document.getElementById('healthMealCompanion').value = '';
    updateHealthRatingStars();
  } else if (type === 'water') {
    document.getElementById('healthWaterAmount').value = '250';
    document.getElementById('healthWaterNote').value = '';
  } else if (type === 'bowel') {
    healthBowelType = 'normal';
    document.querySelectorAll('.health-bowel-type').forEach(function(b) { b.classList.toggle('active', b.dataset.val === 'normal'); });
    document.getElementById('healthBowelNote').value = '';
  } else if (type === 'sleep') {
    healthSleepRatingVal = 0;
    document.getElementById('healthSleepBedtime').value = '23:00';
    document.getElementById('healthSleepWaketime').value = '07:00';
    updateHealthSleepRatingStars();
    document.getElementById('healthSleepNote').value = '';
  } else if (type === 'drink') {
    healthDrinkType = 'coffee';
    document.querySelectorAll('.health-drink-type').forEach(function(b) { b.classList.toggle('active', b.dataset.val === 'coffee'); });
    document.getElementById('healthDrinkNote').value = '';
  }

  document.getElementById('healthModal').classList.add('active');
}

function closeHealthModal() {
  document.getElementById('healthModal').classList.remove('active');
}

function selectHealthMealType(val) {
  healthMealType = val;
  document.querySelectorAll('.health-meal-type').forEach(function(b) { b.classList.toggle('active', b.dataset.type === val); });
}

function selectHealthCooked(val) {
  healthCooked = val;
  document.querySelectorAll('.health-cooked').forEach(function(b) { b.classList.toggle('active', b.dataset.val === val); });
}

function selectBowelType(val) {
  healthBowelType = val;
  document.querySelectorAll('.health-bowel-type').forEach(function(b) { b.classList.toggle('active', b.dataset.val === val); });
}

function selectDrinkType(val) {
  healthDrinkType = val;
  document.querySelectorAll('.health-drink-type').forEach(function(b) { b.classList.toggle('active', b.dataset.val === val); });
}

function setHealthRating(val) {
  healthRatingVal = val;
  updateHealthRatingStars();
}

function updateHealthRatingStars() {
  document.querySelectorAll('#healthMealRating .star').forEach(function(s) {
    s.classList.toggle('filled', parseInt(s.dataset.val) <= healthRatingVal);
  });
}

function setHealthSleepRating(val) {
  healthSleepRatingVal = val;
  updateHealthSleepRatingStars();
}

function updateHealthSleepRatingStars() {
  document.querySelectorAll('#healthSleepRating .star').forEach(function(s) {
    s.classList.toggle('filled', parseInt(s.dataset.val) <= healthSleepRatingVal);
  });
}

function saveHealthRecord() {
  var type = document.getElementById('healthRecordType').value;
  var date = document.getElementById('healthDate').value;
  var time = document.getElementById('healthTime').value;
  var record = { id: healthData.nextId++, type: type, date: date, time: time, createdAt: Date.now() };

  if (type === 'meal') {
    record.mealType = healthMealType;
    record.cooked = healthCooked;
    record.content = document.getElementById('healthMealContent').value.trim();
    record.location = document.getElementById('healthMealLocation').value.trim();
    record.companion = document.getElementById('healthMealCompanion').value.trim();
    record.rating = healthRatingVal;
  } else if (type === 'water') {
    record.amount = parseInt(document.getElementById('healthWaterAmount').value) || 0;
    record.note = document.getElementById('healthWaterNote').value.trim();
  } else if (type === 'bowel') {
    record.bowelType = healthBowelType;
    record.note = document.getElementById('healthBowelNote').value.trim();
  } else if (type === 'sleep') {
    record.bedtime = document.getElementById('healthSleepBedtime').value;
    record.waketime = document.getElementById('healthSleepWaketime').value;
    if (record.bedtime && record.waketime) {
      var bedParts = record.bedtime.split(':');
      var wakeParts = record.waketime.split(':');
      var bedMin = parseInt(bedParts[0]) * 60 + parseInt(bedParts[1]);
      var wakeMin = parseInt(wakeParts[0]) * 60 + parseInt(wakeParts[1]);
      var duration = wakeMin >= bedMin ? (wakeMin - bedMin) : (wakeMin - bedMin + 1440);
      record.duration = duration / 60;
    } else {
      record.duration = 0;
    }
    record.rating = healthSleepRatingVal;
    record.note = document.getElementById('healthSleepNote').value.trim();
  } else if (type === 'drink') {
    record.drinkType = healthDrinkType;
    record.note = document.getElementById('healthDrinkNote').value.trim();
  }

  healthData.records.push(record);
  saveHealthData(healthData);
  closeHealthModal();
  showToast('已记录');
  renderHealthPage();
}

function deleteHealthRecord(id) {
  healthData.records = healthData.records.filter(function(r) { return r.id !== id; });
  saveHealthData(healthData);
  renderHealthPage();
  showToast('已删除');
}

// === Render Health Page ===
function renderHealthPage() {
  var today = todayStr();
  var todayRecords = healthData.records.filter(function(r) { return r.date === today; })
    .sort(function(a, b) { return (b.time || '').localeCompare(a.time || ''); });

  // Summary stats
  var totalWater = 0, bowelCount = 0, sleepHours = 0;
  todayRecords.forEach(function(r) {
    if (r.type === 'water') totalWater += r.amount || 0;
    if (r.type === 'bowel') bowelCount++;
    if (r.type === 'sleep' && r.duration) sleepHours = r.duration;
  });

  document.getElementById('health-water-today').textContent = totalWater;
  document.getElementById('health-bowel-today').textContent = bowelCount;
  document.getElementById('health-sleep-today').textContent = sleepHours > 0 ? sleepHours.toFixed(1) : '-';

  // Today's records list
  var html = '';
  if (todayRecords.length === 0) {
    html = '<div style="text-align:center;color:var(--muted);font-size:0.85rem;padding:8px">今天还没有健康记录，点击上方快速添加</div>';
  } else {
    todayRecords.forEach(function(r) {
      var bgColors = { meal: '#fef3c7', water: '#dbeafe', bowel: '#d1fae5', sleep: '#ede9fe' };
      html += '<div class="health-record">';
      html += '<div class="health-record-icon" style="background:' + bgColors[r.type] + '">' + healthTypeIcons[r.type] + '</div>';
      html += '<div class="health-record-info">';
      html += '<div class="health-record-title">' + healthTypeNames[r.type] + (r.time ? ' ' + r.time : '') + '</div>';
      html += '<div class="health-record-detail">';
      if (r.type === 'meal') {
        html += mealTypeNames[r.mealType] + ' | ' + cookedNames[r.cooked];
        if (r.content) html += ' | ' + r.content.substring(0, 30);
        if (r.rating) html += ' | ' + '★'.repeat(r.rating);
      } else if (r.type === 'water') {
        html += (r.amount || 0) + 'ml';
        if (r.note) html += ' | ' + r.note;
      } else if (r.type === 'bowel') {
        html += bowelTypeNames[r.bowelType];
        if (r.note) html += ' | ' + r.note;
      } else if (r.type === 'sleep') {
        if (r.duration) html += r.duration.toFixed(1) + '小时 (' + r.bedtime + '~' + r.waketime + ')';
        if (r.rating) html += ' | ' + '★'.repeat(r.rating);
      } else if (r.type === 'drink') {
        html += (drinkTypeNames[r.drinkType] || '饮品');
        if (r.note) html += ' | ' + r.note;
      }
      html += '</div>';
      html += '</div>';
      html += '<button class="btn btn-small btn-outline" onclick="deleteHealthRecord(' + r.id + ')" style="color:var(--danger);flex-shrink:0" title="删除">×</button>';
      html += '</div>';
    });
  }
  document.getElementById('healthTodayRecords').innerHTML = html;

  // Body stats
  renderBodyStats();
}

// === Body Stats ===
var drinkTypeNames = { coffee: '咖啡', tea: '茶', milk: '牛奶', juice: '果汁', other: '其他' };

function openBodyModal(editId) {
  document.getElementById('bodyDate').value = todayStr();
  document.getElementById('bodyWeight').value = '';
  document.getElementById('bodyFat').value = '';
  document.getElementById('bodyWaist').value = '';
  document.getElementById('bodyNote').value = '';
  document.getElementById('bodyEditId').value = '';
  document.getElementById('bodyBMI').textContent = '-';
  document.getElementById('bodyBMILabel').textContent = '';
  document.getElementById('bodyBMR').textContent = '-';

  if (editId) {
    var rec = bodyData.records.find(function(r) { return r.id === editId; });
    if (rec) {
      document.getElementById('bodyDate').value = rec.date;
      document.getElementById('bodyWeight').value = rec.weight || '';
      document.getElementById('bodyFat').value = rec.fat || '';
      document.getElementById('bodyWaist').value = rec.waist || '';
      document.getElementById('bodyNote').value = rec.note || '';
      document.getElementById('bodyEditId').value = editId;
      if (rec.weight) {
        var bmi = calcBMI(rec.weight);
        document.getElementById('bodyBMI').textContent = bmi.toFixed(1);
        document.getElementById('bodyBMILabel').textContent = getBMILabel(bmi);
        document.getElementById('bodyBMR').textContent = Math.round(calcBMR(rec.weight));
      }
    }
  }

  // Live calculation
  var wInput = document.getElementById('bodyWeight');
  wInput.oninput = function() {
    var w = parseFloat(wInput.value);
    if (w > 0) {
      var bmi = calcBMI(w);
      document.getElementById('bodyBMI').textContent = bmi.toFixed(1);
      document.getElementById('bodyBMILabel').textContent = getBMILabel(bmi);
      document.getElementById('bodyBMR').textContent = Math.round(calcBMR(w));
    } else {
      document.getElementById('bodyBMI').textContent = '-';
      document.getElementById('bodyBMILabel').textContent = '';
      document.getElementById('bodyBMR').textContent = '-';
    }
  };

  document.getElementById('bodyModal').classList.add('active');
}

function closeBodyModal() {
  document.getElementById('bodyModal').classList.remove('active');
}

function saveBodyRecord() {
  var weight = parseFloat(document.getElementById('bodyWeight').value);
  if (!weight || weight <= 0) { showToast('请输入体重'); return; }

  var editId = document.getElementById('bodyEditId').value;
  var record = {
    id: editId ? parseInt(editId) : bodyData.nextId++,
    date: document.getElementById('bodyDate').value || todayStr(),
    weight: weight,
    fat: parseFloat(document.getElementById('bodyFat').value) || 0,
    waist: parseFloat(document.getElementById('bodyWaist').value) || 0,
    note: document.getElementById('bodyNote').value.trim(),
    createdAt: editId ? undefined : Date.now()
  };

  if (editId) {
    var idx = bodyData.records.findIndex(function(r) { return r.id === parseInt(editId); });
    if (idx !== -1) bodyData.records[idx] = record;
  } else {
    bodyData.records.push(record);
  }

  saveBodyData(bodyData);
  closeBodyModal();
  showToast('已保存');
  renderBodyStats();
}

function deleteBodyRecord(id) {
  bodyData.records = bodyData.records.filter(function(r) { return r.id !== id; });
  saveBodyData(bodyData);
  renderBodyStats();
  showToast('已删除');
}

function renderBodyStats() {
  var el = document.getElementById('healthBodyStats');
  if (!el) return;

  // Sort by date desc, get latest
  var sorted = bodyData.records.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });

  if (sorted.length === 0) {
    el.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:0.85rem;padding:8px">还没有记录，点击右上角开始记录</div>';
    return;
  }

  var latest = sorted[0];
  var prev = sorted.length > 1 ? sorted[1] : null;
  var bmi = calcBMI(latest.weight);
  var bmr = calcBMR(latest.weight);

  // Trend arrow
  var trend = '';
  if (prev && prev.weight) {
    var diff = latest.weight - prev.weight;
    if (diff > 0.3) trend = '<span style="color:var(--danger)">↑ +' + diff.toFixed(1) + 'kg</span>';
    else if (diff < -0.3) trend = '<span style="color:var(--accent2)">↓ ' + diff.toFixed(1) + 'kg</span>';
    else trend = '<span style="color:var(--muted)">→ 持平</span>';
  }

  var html = '';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">';
  html += '<div style="text-align:center;padding:10px;background:var(--bg2);border-radius:8px">';
  html += '<div style="font-size:0.7rem;color:var(--muted)">体重</div>';
  html += '<div style="font-size:1.3rem;font-weight:700;color:var(--accent)">' + latest.weight.toFixed(1) + '</div>';
  html += '<div style="font-size:0.68rem">' + trend + '</div>';
  html += '</div>';
  html += '<div style="text-align:center;padding:10px;background:var(--bg2);border-radius:8px">';
  html += '<div style="font-size:0.7rem;color:var(--muted)">BMI</div>';
  html += '<div style="font-size:1.3rem;font-weight:700;color:var(--accent3)">' + bmi.toFixed(1) + '</div>';
  html += '<div style="font-size:0.68rem;color:var(--muted)">' + getBMILabel(bmi) + '</div>';
  html += '</div>';
  html += '<div style="text-align:center;padding:10px;background:var(--bg2);border-radius:8px">';
  html += '<div style="font-size:0.7rem;color:var(--muted)">基础代谢</div>';
  html += '<div style="font-size:1.3rem;font-weight:700;color:var(--accent2)">' + Math.round(bmr) + '</div>';
  html += '<div style="font-size:0.68rem;color:var(--muted)">kcal/天</div>';
  html += '</div>';
  html += '</div>';

  if (latest.fat || latest.waist) {
    html += '<div style="display:flex;gap:12px;font-size:0.82rem;color:var(--muted);margin-bottom:8px">';
    if (latest.fat) html += '<span>体脂率: ' + latest.fat + '%</span>';
    if (latest.waist) html += '<span>腰围: ' + latest.waist + 'cm</span>';
    html += '</div>';
  }

  html += '<div style="font-size:0.75rem;color:var(--muted)">最近记录: ' + latest.date;
  if (latest.note) html += ' | ' + latest.note;
  html += '</div>';

  // Mini history (last 5)
  if (sorted.length > 1) {
    html += '<div style="margin-top:12px;padding-top:8px;border-top:1px solid var(--rule)">';
    html += '<div style="font-size:0.75rem;font-weight:600;color:var(--muted);margin-bottom:6px">历史记录</div>';
    sorted.slice(1, 6).forEach(function(rec) {
      html += '<div style="display:flex;justify-content:space-between;font-size:0.8rem;padding:3px 0;border-bottom:1px solid var(--rule)">';
      html += '<span style="color:var(--muted)">' + rec.date + '</span>';
      html += '<span>' + rec.weight.toFixed(1) + 'kg';
      if (rec.fat) html += ' | ' + rec.fat + '%';
      if (rec.waist) html += ' | ' + rec.waist + 'cm';
      html += '</span>';
      html += '<button class="btn btn-small btn-outline" onclick="deleteBodyRecord(' + rec.id + ')" style="color:var(--danger);padding:2px 6px;font-size:0.7rem">×</button>';
      html += '</div>';
    });
    html += '</div>';
  }

  el.innerHTML = html;
}

// === Updated switchPage ===
var _origSwitchPage = switchPage;
switchPage = function(name) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  if (event && event.currentTarget) event.currentTarget.classList.add('active');

  var addBtn = document.querySelector('.app-header .btn');
  if (name === 'wardrobe') {
    addBtn.textContent = '+ 添加';
    addBtn.onclick = openAddClothingModal;
    addBtn.style.display = '';
  } else {
    addBtn.style.display = 'none';
  }

  if (name === 'home') renderHome();
  if (name === 'wardrobe') renderWardrobe();
  if (name === 'calendar') renderCalendar();
  if (name === 'diary') { renderDiaryPage(); renderHealthPage(); }
  if (name === 'diary-history') { diaryHistDate = new Date(); renderDiaryHistory(); }
  if (name === 'diary-analysis') renderDiaryAnalysis();
};

// === Init ===
updateHeaderDate();
renderHome();
