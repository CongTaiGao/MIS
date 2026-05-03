/* ============================================================
   MYTOUR.VN — Frontend SPA
   Single-page app with hash-based routing
   ============================================================ */

const API = '/api';
let currentUser = null;
let cartCount = 0;

// ── Utility ──────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const toast = (msg, type = 'info') => {
  const c = $('toast-container');
  const el = document.createElement('div');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span class="toast-msg">${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(20px)'; el.style.transition = '0.3s'; setTimeout(() => el.remove(), 300); }, 3500);
};
const fmt = n => Number(n).toLocaleString('vi-VN') + 'đ';
const stars = n => '★'.repeat(Math.round(n||0)) + '☆'.repeat(5-Math.round(n||0));

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, credentials: 'include' };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);
  return r.json();
}

// ── Auth state ────────────────────────────────────────────────
async function loadUser() {
  try {
    const d = await api('GET', '/auth/me');
    if (d.success) { currentUser = d.user; updateNavbar(); loadCartCount(); }
  } catch {}
}

function updateNavbar() {
  const guestBtns = $('navbar-guest');
  const userMenu  = $('navbar-user');
  if (!guestBtns || !userMenu) return;
  if (currentUser) {
    guestBtns.classList.add('hidden');
    userMenu.classList.remove('hidden');
    $('user-initials').textContent = (currentUser.username || currentUser.email)[0].toUpperCase();
    if (currentUser.role === 'admin') {
      $('admin-link')?.classList.remove('hidden');
    }
  } else {
    guestBtns.classList.remove('hidden');
    userMenu.classList.add('hidden');
  }
}

async function loadCartCount() {
  if (!currentUser) return;
  try {
    const d = await api('GET', '/cart');
    if (d.success) {
      cartCount = d.items.length;
      const badge = $('cart-badge-num');
      if (badge) { badge.textContent = cartCount; badge.style.display = cartCount > 0 ? 'flex' : 'none'; }
    }
  } catch {}
}

async function logout() {
  await api('POST', '/auth/logout');
  currentUser = null;
  cartCount = 0;
  updateNavbar();
  toast('Đã đăng xuất.', 'info');
  navigate('home');
}

// ── Router ────────────────────────────────────────────────────
const routes = {};
function register(name, fn) { routes[name] = fn; }

function navigate(page, params = {}) {
  const hash = params && Object.keys(params).length
    ? `#${page}?${new URLSearchParams(params)}`
    : `#${page}`;
  history.pushState({ page, params }, '', hash);
  render(page, params);
}

function render(page, params = {}) {
  const app = $('app');
  if (routes[page]) { routes[page](app, params); }
  else { routes['home'](app, {}); }
  window.scrollTo(0, 0);
  updateActiveNav(page);
}

function updateActiveNav(page) {
  document.querySelectorAll('.nav-link[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

window.addEventListener('popstate', e => {
  const hash = location.hash.slice(1);
  const [page, qs] = hash.split('?');
  const params = qs ? Object.fromEntries(new URLSearchParams(qs)) : {};
  render(page || 'home', params);
});

// ── Auth Modal ────────────────────────────────────────────────
window.showAuthModal = (tab = 'login', redirect = null) => {
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">Tài khoản My Tour</span>
        <!-- Khi đóng modal, quay về #home -->
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove(); navigate('home');">×</button>
      </div>
      <div class="modal-body">
        <div class="auth-tabs">
          <!-- Cập nhật hàm onclick để gọi navigate, giúp URL thay đổi theo tab -->
          <div class="auth-tab ${tab==='login'?'active':''}" id="tab-login" onclick="navigate('login')">Đăng nhập</div>
          <div class="auth-tab ${tab==='register'?'active':''}" id="tab-register" onclick="navigate('register')">Đăng ký</div>
        </div>
        
        <div id="auth-login-form" style="${tab==='register'?'display:none':''}">
          <div class="form-group"><label class="form-label">Email</label><input id="l-email" type="email" class="form-control" placeholder="email@example.com"></div>
          <div class="form-group"><label class="form-label">Mật khẩu</label><input id="l-pass" type="password" class="form-control" placeholder="Nhập mật khẩu" onkeydown="if(event.key === 'Enter') doLogin('${redirect||''}')"></div>
          <button class="btn btn-primary btn-block btn-lg" onclick="doLogin('${redirect||''}')">Đăng nhập</button>
          <div class="oauth-divider">hoặc</div>
          <button class="btn btn-ghost btn-block" onclick="window.location='/api/auth/google'">🌐 Tiếp tục với Google</button>
        </div>

        <div id="auth-register-form" style="${tab==='login'?'display:none':''}">
          <div class="form-group"><label class="form-label">Tên người dùng</label><input id="r-name" class="form-control" placeholder="Nhập tên của bạn"></div>
          <div class="form-group"><label class="form-label">Email</label><input id="r-email" type="email" class="form-control" placeholder="email@example.com"></div>
          <div class="form-group"><label class="form-label">Số điện thoại (tuỳ chọn)</label><input id="r-phone" class="form-control" placeholder="0901 234 567"></div>
          <div class="form-group"><label class="form-label">Mật khẩu</label><input id="r-pass" type="password" class="form-control" placeholder="Tối thiểu 6 ký tự" onkeydown="if(event.key === 'Enter') doRegister()"></div>
          <button class="btn btn-primary btn-block btn-lg" onclick="doRegister()">Đăng ký</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  
  // Click ra ngoài để đóng và về home
  overlay.addEventListener('click', e => { 
    if (e.target === overlay) {
      overlay.remove(); 
      navigate('home'); 
    }
  });
};

window.switchTab = (tab) => {
  register('login', (app) => {
  // Nếu modal chưa mở thì vẽ lại nền trang chủ, nếu mở rồi thì chỉ cập nhật nội dung modal
  if (!document.querySelector('.modal-overlay')) {
    routes['home'](app);
  }
  showAuthModal('login');
});

register('register', (app) => {
  if (!document.querySelector('.modal-overlay')) {
    routes['home'](app);
  }
  showAuthModal('register');
});
  $('auth-login-form').style.display = tab === 'login' ? '' : 'none';
  $('auth-register-form').style.display = tab === 'register' ? '' : 'none';
};

window.doLogin = async (redirect) => {
  const email = $('l-email').value.trim();
  const password = $('l-pass').value;
  if (!email || !password) { toast('Vui lòng nhập đầy đủ thông tin.', 'error'); return; }
  const d = await api('POST', '/auth/login', { email, password });
  if (d.success) {
    currentUser = d.user;
    document.querySelector('.modal-overlay')?.remove();
    toast('Đăng nhập thành công! Chào ' + d.user.username, 'success');
    updateNavbar(); loadCartCount();
    if (redirect) navigate(redirect.split('?')[0], {});
  } else { toast(d.message, 'error'); }
};

window.doRegister = async () => {
  const username = $('r-name').value.trim();
  const email = $('r-email').value.trim();
  const phone = $('r-phone').value.trim();
  const password = $('r-pass').value;
  if (!email || !password) { toast('Vui lòng nhập email và mật khẩu.', 'error'); return; }
  if (password.length < 6) { toast('Mật khẩu tối thiểu 6 ký tự.', 'error'); return; }
  const d = await api('POST', '/auth/register', { username, email, phone, password });
  if (d.success) {
    currentUser = { email, username, role: 'customer' };
    document.querySelector('.modal-overlay')?.remove();
    toast('Đăng ký thành công! Chào mừng bạn đến với My Tour.', 'success');
    updateNavbar(); loadCartCount();
  } else { toast(d.message, 'error'); }
};

// ── HOME PAGE ─────────────────────────────────────────────────
register('home', async (app) => {
  app.innerHTML = `
    <div class="hero">
      <div class="container">
        <div class="hero-content">
          <h1>🏨 Đặt khách sạn dễ dàng</h1>
          <p>Hàng nghìn khách sạn trên toàn Việt Nam, giá tốt nhất, đặt ngay hôm nay</p>
          <div class="search-bar">
            <input id="h-search" placeholder="Tìm theo tên khách sạn, thành phố..." />
            <div class="sep"></div>
            <select id="h-guests"><option value="">Số khách</option><option>1 khách</option><option>2 khách</option><option>3 khách</option><option>4+ khách</option></select>
            <div class="sep"></div>
            <input id="h-checkin" type="date" style="border:none;outline:none;font-size:14px;padding:10px;color:#555">
            <button class="btn btn-primary" onclick="doSearch()">🔍 Tìm kiếm</button>
          </div>
        </div>
      </div>
    </div>
    <div class="container page">
      <h2 style="margin:32px 0 18px;font-size:20px;font-weight:700">Khách sạn nổi bật</h2>
      <div class="hotel-grid" id="featured-hotels"><div style="padding:40px;text-align:center;color:#aaa">Đang tải...</div></div>
      <div style="text-align:center;margin-top:28px">
        <button class="btn btn-outline btn-lg" onclick="navigate('hotels')">Xem tất cả khách sạn →</button>
      </div>
    </div>`;

  const d = await api('GET', '/hotels?limit=6');
  if (d.success) {
    $('featured-hotels').innerHTML = d.hotels.map(renderHotelCard).join('');
  }
  register('login', (app) => {
    routes['home'](app); 
    showAuthModal('login'); 
  });

  register('register', (app) => {
    routes['home'](app);
    showAuthModal('register');
  });
});

function doSearch() {
  const q = $('h-search')?.value.trim() || '';
  const checkin = $('h-checkin')?.value || '';
  navigate('hotels', { q, checkin });
}

// ── HOTELS LIST PAGE ──────────────────────────────────────────
register('hotels', async (app, params) => {
  const { q = '', city = '', minPrice = '', maxPrice = '', stars: starFilter = '' } = params;
  app.innerHTML = `
    <div class="filter-bar">
      <div class="container">
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <input id="hs-q" class="form-control" style="max-width:280px;margin:0" placeholder="Tìm kiếm..." value="${q}">
          <select id="hs-city" class="form-control" style="max-width:180px;margin:0">
            <option value="">Tất cả thành phố</option>
            <option ${city==='Hồ Chí Minh'?'selected':''}>Hồ Chí Minh</option>
            <option ${city==='Đà Nẵng'?'selected':''}>Đà Nẵng</option>
            <option ${city==='Hà Nội'?'selected':''}>Hà Nội</option>
          </select>
          <select id="hs-stars" class="form-control" style="max-width:140px;margin:0">
            <option value="">Tất cả sao</option>
            <option value="5" ${starFilter==='5'?'selected':''}>5 sao</option>
            <option value="4" ${starFilter==='4'?'selected':''}>4 sao</option>
            <option value="3" ${starFilter==='3'?'selected':''}>3 sao</option>
          </select>
          <button class="btn btn-primary btn-sm" onclick="applyHotelFilter()">Lọc</button>
        </div>
      </div>
    </div>
    <div class="container page">
      <div style="display:flex;justify-content:space-between;align-items:center;margin:24px 0 18px">
        <h2 style="font-size:20px;font-weight:700">Danh sách khách sạn</h2>
        <span id="hotel-count" style="font-size:14px;color:#888"></span>
      </div>
      <div class="hotel-grid" id="hotel-list"><div style="padding:60px;text-align:center;color:#aaa">Đang tải...</div></div>
    </div>`;

  const qs = new URLSearchParams({ q, city, stars: starFilter, limit: 20 }).toString();
  const d = await api('GET', '/hotels?' + qs);
  if (d.success) {
    $('hotel-list').innerHTML = d.hotels.length ? d.hotels.map(renderHotelCard).join('') : '<div style="padding:60px;text-align:center;color:#aaa">Không tìm thấy khách sạn phù hợp.</div>';
    $('hotel-count').textContent = `${d.hotels.length} khách sạn`;
  }
});

window.applyHotelFilter = () => {
  navigate('hotels', {
    q: $('hs-q')?.value.trim() || '',
    city: $('hs-city')?.value || '',
    stars: $('hs-stars')?.value || ''
  });
};

function renderHotelCard(h) {
  const emoji = ['🏨','🏩','🏰','🌴','🏖️'][h.id % 5];
  return `
    <div class="card hotel-card" onclick="navigate('hotel', {id:${h.id}})">
      <div class="hotel-img">
        ${h.image_url ? `<img src="${h.image_url}" alt="${h.name}" onerror="this.parentNode.innerHTML='<div class=hotel-img-placeholder>${emoji}</div>'">` : `<div class="hotel-img-placeholder">${emoji}</div>`}
        <span class="hotel-badge">⭐ ${h.stars} sao</span>
        <button class="hotel-fav" onclick="event.stopPropagation()">🤍</button>
      </div>
      <div class="hotel-info">
        <div class="hotel-name">${h.name}</div>
        <div class="hotel-location">📍 ${h.city}</div>
        <div class="hotel-rating">
          <span class="stars">${stars(h.avg_rating)}</span>
          <span class="rating-num">${h.avg_rating || '—'}</span>
          <span class="rating-count">(${h.review_count || 0} đánh giá)</span>
        </div>
        <div class="hotel-footer">
          <div class="hotel-price">${fmt(h.min_price || 0)} <span>/đêm</span></div>
          <button class="btn btn-outline btn-sm">Xem</button>
        </div>
      </div>
    </div>`;
}

// ── HOTEL DETAIL PAGE ─────────────────────────────────────────
register('hotel', async (app, params) => {
  app.innerHTML = `<div class="container page" style="padding-top:28px"><div style="padding:60px;text-align:center;color:#aaa">Đang tải...</div></div>`;
  const d = await api('GET', '/hotels/' + params.id);
  if (!d.success) { app.innerHTML = `<div class="container page" style="padding-top:40px;text-align:center">Không tìm thấy khách sạn.</div>`; return; }

  const { hotel, rooms, reviews, stats } = d;
  let amenities = hotel.amenities || [];
  if (typeof amenities === 'string') try { amenities = JSON.parse(amenities); } catch { amenities = []; }
  const emoji = ['🏨','🏩','🏰','🌴','🏖️'][hotel.id % 5];

  app.innerHTML = `
    <div class="container page" style="padding-top:28px">
      <nav style="font-size:13px;color:#888;margin-bottom:16px">
        <a onclick="navigate('home')" style="cursor:pointer;color:#888">Trang chủ</a> / 
        <a onclick="navigate('hotels')" style="cursor:pointer;color:#888">Khách sạn</a> / 
        <span style="color:#333">${hotel.name}</span>
      </nav>
      <div class="gallery">
        <div class="gallery-main"><div class="gallery-placeholder">${emoji}</div></div>
        <div class="gallery-side"><div class="gallery-placeholder">🛏️</div><div class="gallery-placeholder">🛁</div></div>
      </div>
      <div class="detail-layout">
        <div class="detail-main">
          <h1 style="font-size:24px;font-weight:800;margin-bottom:8px">${hotel.name}</h1>
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;flex-wrap:wrap">
            <span>📍 ${hotel.city}${hotel.address ? ', ' + hotel.address : ''}</span>
            <span class="stars">${stars(stats?.avg_rating)}</span>
            <span style="font-weight:700">${stats?.avg_rating || '—'}</span>
            <span style="color:#888">(${stats?.total || 0} đánh giá)</span>
            <span>⭐ ${hotel.stars} sao</span>
          </div>
          <p style="color:#555;line-height:1.7;margin-bottom:20px">${hotel.description || ''}</p>
          ${amenities.length ? `<div class="amenity-tags">${amenities.map(a=>`<span class="amenity-tag">✓ ${a}</span>`).join('')}</div>` : ''}
          <h3 style="font-size:17px;font-weight:700;margin:24px 0 12px">Các loại phòng</h3>
          <div class="room-list" id="room-list">
            ${rooms.map(r => `
              <div class="room-item" id="room-${r.id}" onclick="selectRoom(${r.id}, ${r.price_per_night}, '${r.room_type}')">
                <div class="room-item-header">
                  <div>
                    <div class="room-type">${r.room_type}</div>
                    <div class="room-desc">${r.description || `Sức chứa ${r.capacity} người`}</div>
                  </div>
                  <div class="room-price">${fmt(r.price_per_night)}<span style="font-size:12px;color:#888;font-weight:400">/đêm</span></div>
                </div>
              </div>`).join('')}
          </div>
          <h3 style="font-size:17px;font-weight:700;margin:24px 0 12px">Đánh giá từ khách hàng</h3>
          ${reviews.length ? reviews.map(rv => `
            <div style="border:1px solid #eee;border-radius:10px;padding:14px;margin-bottom:10px">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">${(rv.username||'?')[0].toUpperCase()}</div>
                <strong>${rv.username || 'Ẩn danh'}</strong>
                <span class="stars" style="font-size:12px">${stars(rv.rating)}</span>
              </div>
              <p style="font-size:14px;color:#555">${rv.comment || ''}</p>
            </div>`).join('') : '<p style="color:#aaa">Chưa có đánh giá nào.</p>'}
        </div>
        <div>
          <div class="booking-card" id="booking-sidebar">
            <div class="booking-price" id="sidebar-price">Chọn phòng bên trái</div>
            <div class="form-group"><label class="form-label">Ngày nhận phòng</label><input id="checkin-date" type="date" class="form-control" min="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group"><label class="form-label">Ngày trả phòng</label><input id="checkout-date" type="date" class="form-control"></div>
            <div class="form-group"><label class="form-label">Số khách</label>
              <select id="guests-num" class="form-control"><option value="1">1 khách</option><option value="2" selected>2 khách</option><option value="3">3 khách</option><option value="4">4 khách</option></select>
            </div>
            <div id="price-breakdown" class="hidden" style="background:var(--bg-light);border-radius:10px;padding:14px;margin-bottom:14px;font-size:14px"></div>
            <button class="btn btn-primary btn-block btn-lg" id="book-btn" onclick="addToCartAndBook(${hotel.id})" disabled>Chọn phòng trước</button>
            <button class="btn btn-ghost btn-block btn-sm" style="margin-top:8px" onclick="addToCartOnly(${hotel.id})">🛒 Thêm vào giỏ</button>
          </div>
        </div>
      </div>
    </div>`;

  // date logic
  const today = new Date().toISOString().split('T')[0];
  $('checkin-date').min = today;
  $('checkin-date').addEventListener('change', updatePriceBreakdown);
  $('checkout-date').addEventListener('change', updatePriceBreakdown);
});

let selectedRoomId = null, selectedRoomPrice = 0, selectedRoomType = '';

window.selectRoom = (id, price, type) => {
  document.querySelectorAll('.room-item').forEach(el => el.classList.remove('selected'));
  document.getElementById('room-' + id)?.classList.add('selected');
  selectedRoomId = id; selectedRoomPrice = price; selectedRoomType = type;
  const sidebarPrice = $('sidebar-price');
  if (sidebarPrice) { sidebarPrice.innerHTML = `${fmt(price)} <span style="font-size:14px;font-weight:400;color:#888">/đêm</span><div style="font-size:13px;font-weight:400;color:#555;margin-top:2px">${type}</div>`; }
  const bookBtn = $('book-btn');
  if (bookBtn) { bookBtn.textContent = 'Đặt phòng ngay'; bookBtn.disabled = false; }
  updatePriceBreakdown();
};

function updatePriceBreakdown() {
  if (!selectedRoomId) return;
  const ci = $('checkin-date')?.value;
  const co = $('checkout-date')?.value;
  if (!ci || !co) return;
  const nights = Math.ceil((new Date(co) - new Date(ci)) / 86400000);
  if (nights <= 0) return;
  const total = selectedRoomPrice * nights;
  const breakdown = $('price-breakdown');
  if (breakdown) {
    breakdown.classList.remove('hidden');
    breakdown.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>${fmt(selectedRoomPrice)} × ${nights} đêm</span><span>${fmt(selectedRoomPrice * nights)}</span></div>
      <div style="display:flex;justify-content:space-between;color:#888;margin-bottom:8px"><span>Phí dịch vụ (5%)</span><span>${fmt(Math.round(total * 0.05))}</span></div>
      <div style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid var(--border);padding-top:8px"><span>Tổng cộng</span><span style="color:var(--primary)">${fmt(Math.round(total * 1.05))}</span></div>`;
  }
}

window.addToCartAndBook = async (hotelId) => {
  if (!currentUser) { showAuthModal('login'); return; }
  const ci = $('checkin-date')?.value;
  const co = $('checkout-date')?.value;
  if (!ci || !co || !selectedRoomId) { toast('Vui lòng chọn phòng và ngày.', 'error'); return; }
  navigate('checkout', { room_id: selectedRoomId, hotel_id: hotelId, check_in: ci, check_out: co, guests: $('guests-num')?.value || 2 });
};

window.addToCartOnly = async (hotelId) => {
  if (!currentUser) { showAuthModal('login'); return; }
  const ci = $('checkin-date')?.value;
  const co = $('checkout-date')?.value;
  if (!ci || !co || !selectedRoomId) { toast('Vui lòng chọn phòng và ngày.', 'error'); return; }
  const d = await api('POST', '/cart', { room_id: selectedRoomId, hotel_id: hotelId, check_in: ci, check_out: co, guests: $('guests-num')?.value || 2 });
  if (d.success) { toast('Đã thêm vào giỏ hàng!', 'success'); loadCartCount(); }
  else toast(d.message, 'error');
};

// ── CHECKOUT PAGE ─────────────────────────────────────────────
register('checkout', async (app, params) => {
  if (!currentUser) { showAuthModal('login', 'checkout'); return; }
  const { room_id, hotel_id, check_in, check_out, guests = 2 } = params;
  if (!room_id || !hotel_id) { navigate('hotels'); return; }

  const nights = Math.ceil((new Date(check_out) - new Date(check_in)) / 86400000);
  const hd = await api('GET', '/hotels/' + hotel_id);
  if (!hd.success) { navigate('hotels'); return; }

  const room = hd.rooms.find(r => r.id == room_id) || hd.rooms[0];
  if (!room) { navigate('hotel', { id: hotel_id }); return; }

  const subtotal = room.price_per_night * nights;
  const fee = Math.round(subtotal * 0.05);
  const total = subtotal + fee;

  app.innerHTML = `
    <div class="container page">
      <div class="checkout-steps" style="margin-top:28px">
        <div class="step active"><span class="step-num">1</span> Thông tin</div>
        <div class="step-line"></div>
        <div class="step active"><span class="step-num">2</span> Thanh toán</div>
        <div class="step-line"></div>
        <div class="step"><span class="step-num">3</span> Xác nhận</div>
      </div>
      <div class="checkout-layout">
        <div>
          <h2 style="font-size:19px;font-weight:700;margin-bottom:20px">Thông tin đặt phòng</h2>
          <div class="card card-body" style="margin-bottom:20px">
            <h3 style="font-size:16px;font-weight:600;margin-bottom:14px">Khách hàng</h3>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Họ tên</label><input id="guest-name" class="form-control" value="${currentUser.username||''}"></div>
              <div class="form-group"><label class="form-label">Email</label><input id="guest-email" class="form-control" type="email" value="${currentUser.email||''}"></div>
            </div>
            <div class="form-group"><label class="form-label">Số điện thoại</label><input id="guest-phone" class="form-control" value="${currentUser.phone||''}"></div>
            <div class="form-group"><label class="form-label">Ghi chú (tuỳ chọn)</label><textarea id="guest-notes" class="form-control" rows="3" placeholder="Yêu cầu đặc biệt..."></textarea></div>
          </div>
          <div class="card card-body" style="margin-bottom:20px">
            <h3 style="font-size:16px;font-weight:600;margin-bottom:14px">Phương thức thanh toán</h3>
            <div style="border:2px solid var(--primary);border-radius:10px;padding:14px;background:var(--primary-light)">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:24px">🏦</span>
                <div>
                  <div style="font-weight:600">Chuyển khoản ngân hàng</div>
                  <div style="font-size:13px;color:#888">Ngân hàng: Vietcombank — STK: 1234 5678 90 — Chủ TK: CONG TY MYTOUR</div>
                </div>
              </div>
            </div>
            <p style="font-size:12px;color:#aaa;margin-top:10px">* Đây là thanh toán mock — nhấn "Xác nhận" để hoàn tất đặt phòng.</p>
          </div>
          <button class="btn btn-primary btn-lg btn-block" onclick="confirmPayment(${room_id},${hotel_id},'${check_in}','${check_out}',${guests},${total})">✅ Xác nhận & Thanh toán ${fmt(total)}</button>
        </div>
        <div>
          <div class="card card-body" style="position:sticky;top:80px">
            <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">Tóm tắt đơn đặt</h3>
            <div style="font-size:16px;font-weight:700;margin-bottom:4px">${hd.hotel.name}</div>
            <div style="font-size:13px;color:#888;margin-bottom:14px">📍 ${hd.hotel.city}</div>
            <div style="background:var(--bg-light);border-radius:8px;padding:12px;margin-bottom:14px;font-size:13px">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Loại phòng</span><strong>${room.room_type}</strong></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Nhận phòng</span><strong>${check_in}</strong></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Trả phòng</span><strong>${check_out}</strong></div>
              <div style="display:flex;justify-content:space-between"><span>Số đêm</span><strong>${nights} đêm</strong></div>
            </div>
            <div style="font-size:14px">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Tiền phòng</span><span>${fmt(subtotal)}</span></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#888"><span>Phí dịch vụ (5%)</span><span>${fmt(fee)}</span></div>
              <div style="display:flex;justify-content:space-between;font-weight:800;font-size:17px;border-top:2px solid var(--border);padding-top:10px"><span>Tổng</span><span style="color:var(--primary)">${fmt(total)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
});

window.confirmPayment = async (room_id, hotel_id, check_in, check_out, guests, total) => {
  const btn = document.querySelector('.btn-primary.btn-lg.btn-block');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang xử lý...'; }

  const d = await api('POST', '/bookings', { room_id, hotel_id, check_in, check_out, guests, notes: $('guest-notes')?.value });
  if (!d.success) { toast(d.message, 'error'); if (btn) { btn.disabled = false; btn.textContent = `✅ Xác nhận & Thanh toán ${fmt(total)}`; } return; }

  // Mock pay
  const pd = await api('POST', '/bookings/' + d.booking.id + '/pay');
  if (pd.success) {
    navigate('confirm', { code: d.booking.booking_code, total, hotel_id });
  } else {
    toast('Thanh toán thất bại, thử lại.', 'error');
  }
};

// ── CONFIRM PAGE ──────────────────────────────────────────────
register('confirm', (app, params) => {
  app.innerHTML = `
    <div class="container page">
      <div class="success-page">
        <div class="success-icon">🎉</div>
        <h2>Đặt phòng thành công!</h2>
        <p>Cảm ơn bạn đã tin tưởng My Tour.vn. Chúng tôi sẽ liên hệ xác nhận sớm nhất.</p>
        <div class="booking-receipt">
          <div class="receipt-code">${params.code || 'MT-XXXX'}</div>
          <div class="receipt-row"><span class="label">Trạng thái</span><span><span class="badge badge-success">✅ Đã thanh toán</span></span></div>
          <div class="receipt-row"><span class="label">Tổng tiền</span><span style="font-weight:700;color:var(--primary)">${fmt(params.total || 0)}</span></div>
          <div class="receipt-row"><span class="label">Thanh toán qua</span><span>Chuyển khoản ngân hàng</span></div>
        </div>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-primary btn-lg" onclick="navigate('home')">🏠 Về trang chủ</button>
          <button class="btn btn-outline btn-lg" onclick="navigate('profile',{tab:'bookings'})">📋 Lịch sử đặt phòng</button>
        </div>
      </div>
    </div>`;
});

// ── CART PAGE ─────────────────────────────────────────────────
register('cart', async (app) => {
  if (!currentUser) { showAuthModal('login'); return; }
  app.innerHTML = `<div class="container page" style="padding-top:28px"><div style="text-align:center;padding:40px;color:#aaa">Đang tải giỏ hàng...</div></div>`;
  const d = await api('GET', '/cart');
  if (!d.success) { app.innerHTML = `<div class="container page"><p>Lỗi tải giỏ hàng.</p></div>`; return; }

  const items = d.items;
  if (!items.length) {
    app.innerHTML = `<div class="container page" style="padding-top:80px;text-align:center">
      <div style="font-size:56px;margin-bottom:16px">🛒</div>
      <h2 style="font-size:20px;margin-bottom:8px">Giỏ hàng trống</h2>
      <p style="color:#888;margin-bottom:24px">Hãy tìm khách sạn và thêm vào giỏ hàng</p>
      <button class="btn btn-primary btn-lg" onclick="navigate('hotels')">Tìm khách sạn</button>
    </div>`; return;
  }

  const totalAll = items.reduce((s, it) => s + (it.price_per_night * it.nights), 0);
  app.innerHTML = `
    <div class="container page" style="padding-top:28px">
      <h2 style="font-size:20px;font-weight:700;margin-bottom:20px">🛒 Giỏ hàng (${items.length} phòng chưa thanh toán)</h2>
      <div class="cart-layout">
        <div id="cart-items">
          ${items.map(it => `
            <div class="booking-item">
              <div class="booking-item-img">🏨</div>
              <div class="booking-item-info">
                <div class="booking-item-name">${it.hotel_name}</div>
                <div class="booking-item-meta">📍 ${it.city} · ${it.room_type}</div>
                <div class="booking-item-meta">📅 ${it.check_in} → ${it.check_out} · ${it.nights} đêm · ${it.guests} khách</div>
                <div class="booking-item-footer">
                  <span style="font-weight:700;color:var(--primary)">${fmt(it.price_per_night * it.nights)}</span>
                  <div style="display:flex;gap:8px">
                    <button class="btn btn-primary btn-sm" onclick="navigate('checkout',{room_id:${it.room_id},hotel_id:${it.hotel_id},check_in:'${it.check_in}',check_out:'${it.check_out}',guests:${it.guests}})">Thanh toán</button>
                    <button class="btn btn-ghost btn-sm" onclick="removeCart(${it.id})">Xóa</button>
                  </div>
                </div>
              </div>
            </div>`).join('')}
        </div>
        <div class="cart-summary">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:14px">Tổng giỏ hàng</h3>
          <div style="font-size:14px;margin-bottom:14px">${items.length} phòng đã chọn</div>
          <div style="font-size:22px;font-weight:800;color:var(--primary);margin-bottom:20px">${fmt(totalAll)}</div>
          <p style="font-size:12px;color:#aaa">*Chưa bao gồm phí dịch vụ. Thanh toán từng phòng riêng lẻ.</p>
        </div>
      </div>
    </div>`;
});

window.removeCart = async (id) => {
  const d = await api('DELETE', '/cart/' + id);
  if (d.success) { toast('Đã xóa khỏi giỏ hàng.', 'info'); loadCartCount(); render('cart', {}); }
};

// ── PROFILE PAGE ──────────────────────────────────────────────
register('profile', async (app, params) => {
  if (!currentUser) { showAuthModal('login'); return; }
  const tab = params.tab || 'bookings';

  // Lấy dữ liệu đặt phòng để tính toán thống kê
  const d = await api('GET', '/bookings/my');
  let bookings = [];
  let totalSpent = 0;
  
  if (d.success) {
    bookings = d.bookings;
    // Tính tổng chi tiêu từ các đơn thành công hoặc đã thanh toán
    totalSpent = bookings
      .filter(b => b.is_paid === 1 || ['confirmed', 'checked_out'].includes(b.status))
      .reduce((sum, b) => sum + Number(b.total_price), 0);
  }

  app.innerHTML = `
    <div class="container page">
      <div class="profile-layout">
        <div class="profile-sidebar">
          <div class="profile-avatar">${(currentUser.username||'U')[0].toUpperCase()}</div>
          <div class="profile-name">${currentUser.username || 'Người dùng'}</div>
          <div class="profile-email">${currentUser.email}</div>
          
          <!-- Thêm Stats Strip vào Sidebar cũ[cite: 6] -->
          <div style="display:flex; justify-content:space-around; margin: 15px 0; padding: 10px 0; border-top:1px solid #eee; border-bottom:1px solid #eee; text-align:center;">
            <div><strong style="display:block; color:var(--primary);">${bookings.length}</strong><span style="font-size:10px; color:#888;">Đặt phòng</span></div>
            <div><strong style="display:block; color:var(--primary);">4.8</strong><span style="font-size:10px; color:#888;">Rating TB</span></div>
            <div><strong style="display:block; color:var(--primary);">${totalSpent >= 1000000 ? (totalSpent/1000000).toFixed(1)+'tr' : fmt(totalSpent)}</strong><span style="font-size:10px; color:#888;">Chi tiêu</span></div>
          </div>

          <nav class="profile-menu">
            <a class="${tab==='bookings'?'active':''}" onclick="navigate('profile',{tab:'bookings'})">📋 Lịch sử đặt phòng</a>
            <a class="${tab==='password'?'active':''}" onclick="navigate('profile',{tab:'password'})">🔑 Đổi mật khẩu</a>
            <a class="${tab==='favorites'?'active':''}" onclick="navigate('profile',{tab:'favorites'})">❤️ Yêu thích</a>
          </nav>
        </div>
        <div id="profile-content"><div style="padding:40px;text-align:center;color:#aaa">Đang tải...</div></div>
      </div>
    </div>`;

  if (tab === 'bookings') renderBookingList(bookings);
  else if (tab === 'password') renderPasswordChange();
  else if (tab === 'favorites') $('profile-content').innerHTML = '<p style="text-align:center; padding:40px; color:#aaa;">Chưa có khách sạn yêu thích.</p>';
  
});

function renderBookingList(bookings) {
  const c = $('profile-content');
  if (!bookings.length) {
    c.innerHTML = '<p style="text-align:center; padding:40px; color:#aaa;">Chưa có lịch sử đặt phòng.</p>';
    return;
  }

  // Cấu hình nhãn trạng thái theo đúng ảnh mẫu[cite: 2, 6]
  const statusMap = { 
    pending: '⏳ Chờ xác nhận', 
    confirmed: '✅ Đã thanh toán', 
    checked_in: '🏠 Đang ở', 
    checked_out: '🏁 Đã hoàn thành', 
    cancelled: '❌ Đã huỷ' 
  };
  const statusBadge = { 
    pending: 'badge-warning', 
    confirmed: 'badge-success', 
    checked_in: 'badge-info', 
    checked_out: 'badge-primary', 
    cancelled: 'badge-danger' 
  };

  c.innerHTML = `
    <h2 style="font-size:18px;font-weight:700;margin-bottom:18px">Đặt phòng gần đây</h2>
    ${bookings.map(b => `
      <div class="booking-item">
        <div class="booking-item-img">🏨</div>
        <div class="booking-item-info">
          <div class="booking-item-name">${b.hotel_name}</div>
          <div class="booking-item-meta">🗓️ ${b.check_in} → ${b.check_out} · ${b.room_type}</div>
          <div class="booking-item-footer">
            <span style="font-weight:700; color:var(--primary);">${fmt(b.total_price)}</span>
            <div style="display:flex; align-items:center; gap:8px">
              <span class="badge ${statusBadge[b.status]}">${statusMap[b.status]}</span>
              <!-- Nút đánh giá chỉ hiện khi đã hoàn thành hoặc đang ở -->
              ${['confirmed', 'checked_out', 'checked_in'].includes(b.status) ? `<button class="btn btn-outline btn-sm" onclick="showReviewModal(${b.hotel_id},${b.id})">⭐ Đánh giá</button>` : ''}
              ${b.status==='pending' ? `<button class="btn btn-ghost btn-sm" onclick="cancelBooking(${b.id})">Huỷ đơn</button>` : ''}
            </div>
          </div>
        </div>
      </div>`).join('')}`;
}

async function loadBookingHistory() {
  const d = await api('GET', '/bookings/my');
  const c = $('profile-content');
  if (!c) return;
  if (!d.success) { c.innerHTML = '<p>Lỗi tải dữ liệu.</p>'; return; }

  const statusMap = { pending:'⏳ Chờ xác nhận', confirmed:'✅ Đã xác nhận', checked_in:'🏠 Đang ở', checked_out:'🏁 Đã trả phòng', cancelled:'❌ Đã hủy' };
  const statusBadge = { pending:'badge-warning', confirmed:'badge-success', checked_in:'badge-info', checked_out:'badge-primary', cancelled:'badge-danger' };

  c.innerHTML = `
    <h2 style="font-size:18px;font-weight:700;margin-bottom:18px">Lịch sử đặt phòng</h2>
    ${d.bookings.length ? d.bookings.map(b => `
      <div class="booking-item">
        <div class="booking-item-img">🏨</div>
        <div class="booking-item-info">
          <div class="booking-item-name">${b.hotel_name}</div>
          <div class="booking-item-meta">📍 ${b.city} · ${b.room_type}</div>
          <div class="booking-item-meta">📅 ${b.check_in} → ${b.check_out} · ${b.nights} đêm</div>
          <div class="booking-item-meta">Mã: <strong>${b.booking_code}</strong></div>
          <div class="booking-item-footer">
            <span style="font-weight:700;color:var(--primary)">${fmt(b.total_price)}</span>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="badge ${statusBadge[b.status]||'badge-primary'}">${statusMap[b.status]||b.status}</span>
              ${b.status==='confirmed'||b.status==='checked_out' ? `<button class="btn btn-outline btn-sm" onclick="showReviewModal(${b.hotel_id},${b.id})">⭐ Đánh giá</button>` : ''}
              ${b.status==='pending' ? `<button class="btn btn-ghost btn-sm" onclick="cancelBooking(${b.id})">Huỷ</button>` : ''}
            </div>
          </div>
        </div>
      </div>`).join('') : '<div style="text-align:center;padding:40px;color:#aaa"><div style="font-size:48px;margin-bottom:12px">📋</div><p>Chưa có đặt phòng nào.</p><button class="btn btn-primary" style="margin-top:12px" onclick="navigate(\'hotels\')">Tìm khách sạn ngay</button></div>'}`;
}

function renderPasswordChange() {
  const c = $('profile-content');
  if (!c) return;
  c.innerHTML = `
    <div style="max-width:400px">
      <h2 style="font-size:18px;font-weight:700;margin-bottom:20px">Đổi mật khẩu</h2>
      <div class="form-group"><label class="form-label">Mật khẩu hiện tại</label><input id="cp-old" type="password" class="form-control"></div>
      <div class="form-group"><label class="form-label">Mật khẩu mới</label><input id="cp-new" type="password" class="form-control"></div>
      <div class="form-group"><label class="form-label">Xác nhận mật khẩu mới</label><input id="cp-confirm" type="password" class="form-control"></div>
      <button class="btn btn-primary btn-block" onclick="changePassword()">Đổi mật khẩu</button>
    </div>`;
}

window.changePassword = async () => {
  const op = $('cp-old')?.value, np = $('cp-new')?.value, cp = $('cp-confirm')?.value;
  if (!op || !np) { toast('Vui lòng nhập đầy đủ.', 'error'); return; }
  if (np !== cp) { toast('Mật khẩu mới không khớp.', 'error'); return; }
  const d = await api('PUT', '/auth/change-password', { currentPassword: op, newPassword: np });
  toast(d.message, d.success ? 'success' : 'error');
};

window.cancelBooking = async (id) => {
  if (!confirm('Bạn có chắc muốn huỷ đặt phòng này?')) return;
  const d = await api('DELETE', '/bookings/' + id);
  if (d.success) { toast('Đã huỷ đặt phòng.', 'info'); loadBookingHistory(); }
  else toast(d.message, 'error');
};

window.showReviewModal = (hotelId, bookingId) => {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><span class="modal-title">Đánh giá khách sạn</span><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Điểm đánh giá</label>
          <select id="rv-rating" class="form-control">
            <option value="5">⭐⭐⭐⭐⭐ Xuất sắc</option>
            <option value="4">⭐⭐⭐⭐ Tốt</option>
            <option value="3">⭐⭐⭐ Bình thường</option>
            <option value="2">⭐⭐ Tệ</option>
            <option value="1">⭐ Rất tệ</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Nhận xét</label><textarea id="rv-comment" class="form-control" rows="4" placeholder="Chia sẻ trải nghiệm của bạn..."></textarea></div>
        <button class="btn btn-primary btn-block" onclick="submitReview(${hotelId},${bookingId})">Gửi đánh giá</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
};

window.submitReview = async (hotelId, bookingId) => {
  const rating = $('rv-rating')?.value;
  const comment = $('rv-comment')?.value;
  const d = await api('POST', '/reviews', { hotel_id: hotelId, booking_id: bookingId, rating, comment });
  document.querySelector('.modal-overlay')?.remove();
  toast(d.message, d.success ? 'success' : 'error');
};

// ── ADMIN DASHBOARD ───────────────────────────────────────────
register('admin', async (app, params) => {
  if (!currentUser || currentUser.role !== 'admin') { toast('Không có quyền truy cập.', 'error'); navigate('home'); return; }
  const section = params.section || 'dashboard';

  app.innerHTML = `
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-sidebar-logo">
          <div style="display:flex; align-items:center; gap:8px; font-size:22px; color:var(--primary);">
            <span>🏨</span> <span>My Tour</span>
          </div>
          <div style="font-size:11px; color:#6b6b80; letter-spacing:1px; margin-top:4px; font-weight:600;">ADMIN PANEL</div>
        </div>
        <div class="admin-nav-item ${section==='dashboard'?'active':''}" onclick="navigate('admin',{section:'dashboard'})"><span class="nav-icon">📊</span> Dashboard</div>
        <div class="admin-nav-item ${section==='hotels'?'active':''}" onclick="navigate('admin',{section:'hotels'})"><span class="nav-icon">🏨</span> Khách sạn</div>
        <div class="admin-nav-item ${section==='bookings'?'active':''}" onclick="navigate('admin',{section:'bookings'})"><span class="nav-icon">📋</span> Đơn đặt phòng</div>
        <div class="admin-nav-item ${section==='users'?'active':''}" onclick="navigate('admin',{section:'users'})"><span class="nav-icon">👥</span> Người dùng</div>
        <div class="admin-nav-item" onclick="navigate('home')"><span class="nav-icon">↩</span> Về trang chủ</div>
      </aside>
      <main class="admin-content" id="admin-main"><div style="padding:40px;text-align:center;color:#aaa">Đang tải...</div></main>
    </div>`;

  if (section === 'dashboard') await adminDashboard();
  else if (section === 'hotels') await adminHotels();
  else if (section === 'bookings') await adminBookings();
  else if (section === 'users') await adminUsers();
});

async function adminDashboard() {
  const d = await api('GET', '/admin/dashboard');
  const m = $('admin-main');
  if (!m) return;
  if (!d.success) { m.innerHTML = '<p>Lỗi tải dữ liệu.</p>'; return; }
  const { stats, weekly, recent } = d;

  m.innerHTML = `
    <div class="admin-title">📊 Dashboard tổng quan</div>
    <div class="stat-cards">
      <div class="stat-card primary"><div class="stat-card-icon">📋</div><div class="stat-card-value">${stats.total_bookings}</div><div class="stat-card-label">Tổng đặt phòng</div></div>
      <div class="stat-card"><div class="stat-card-icon">💰</div><div class="stat-card-value">${(stats.total_revenue/1e6).toFixed(1)}M</div><div class="stat-card-label">Doanh thu (VND)</div></div>
      <div class="stat-card"><div class="stat-card-icon">👥</div><div class="stat-card-value">${stats.total_users}</div><div class="stat-card-label">Khách hàng</div></div>
      <div class="stat-card"><div class="stat-card-icon">🏨</div><div class="stat-card-value">${stats.total_hotels}</div><div class="stat-card-label">Khách sạn</div></div>
      <div class="stat-card"><div class="stat-card-icon">🆕</div><div class="stat-card-value">${stats.today_bookings}</div><div class="stat-card-label">Đặt hôm nay</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
      <div style="background:#fff;border-radius:12px;padding:20px;border:1px solid var(--border)">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:16px">📈 Đặt phòng 7 ngày gần nhất</h3>
        <canvas id="weeklyChart" height="100"></canvas>
      </div>
      <div style="background:#fff;border-radius:12px;padding:20px;border:1px solid var(--border)">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:12px">⚡ Thống kê nhanh</h3>
        <div style="font-size:14px;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between"><span>Doanh thu hôm nay</span><strong style="color:var(--primary)">${fmt(stats.today_bookings * 1200000)}</strong></div>
          <div style="display:flex;justify-content:space-between"><span>Tỷ lệ thanh toán</span><strong style="color:var(--success)">87%</strong></div>
          <div style="display:flex;justify-content:space-between"><span>KS hoạt động</span><strong>${stats.total_hotels}</strong></div>
          <div style="display:flex;justify-content:space-between"><span>Đánh giá trung bình</span><strong>⭐ 4.6</strong></div>
        </div>
      </div>
    </div>
    <div class="admin-table">
      <div style="padding:16px 16px 0;font-size:15px;font-weight:700">Đơn đặt phòng gần đây</div>
      <table>
        <thead><tr><th>Mã</th><th>Khách hàng</th><th>Khách sạn</th><th>Tổng tiền</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
        <tbody>${recent.map(b=>`
          <tr>
            <td><code style="font-size:12px">${b.booking_code}</code></td>
            <td>${b.username}<br><small style="color:#888">${b.email}</small></td>
            <td>${b.hotel_name}</td>
            <td style="font-weight:700;color:var(--primary)">${fmt(b.total_price)}</td>
            <td><span class="badge ${b.status==='confirmed'?'badge-success':b.status==='pending'?'badge-warning':'badge-danger'}">${b.status}</span></td>
            <td style="font-size:12px;color:#888">${new Date(b.created_at).toLocaleDateString('vi-VN')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  // Draw bar chart with Canvas API
  const canvas = $('weeklyChart');
  if (canvas && weekly.length) {
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 400; const H = 100;
    canvas.width = W; canvas.height = H;
    const maxV = Math.max(...weekly.map(d=>d.count), 1);
    const bw = (W - 40) / (weekly.length || 1);
    // Polyfill for roundRect if not supported
    if (!ctx.roundRect) {
      ctx.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
      };
    }
    weekly.forEach((row, i) => {
      const bh = (row.count / maxV) * (H - 30);
      const x = 20 + i * bw + 2;
      ctx.fillStyle = '#D4537E';
      ctx.roundRect(x, H - bh - 20, bw - 6, bh, 3); ctx.fill();
      ctx.fillStyle = '#888'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(new Date(row.day).getDate(), x + (bw-6)/2, H - 4);
    });
  }
}

async function adminHotels() {
  const d = await api('GET', '/hotels?limit=50');
  const m = $('admin-main');
  if (!m) return;
  m.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div class="admin-title" style="margin:0">🏨 Quản lý khách sạn</div>
      <button class="btn btn-primary" onclick="showAddHotelModal()">+ Thêm khách sạn</button>
    </div>
    <div class="admin-table">
      <table>
        <thead><tr><th>ID</th><th>Tên</th><th>Thành phố</th><th>Sao</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
        <tbody>${d.hotels.map(h=>`
          <tr>
            <td>${h.id}</td>
            <td><strong>${h.name}</strong></td>
            <td>${h.city}</td>
            <td>${'★'.repeat(h.stars)}</td>
            <td><span class="badge ${h.is_active?'badge-success':'badge-danger'}">${h.is_active?'Hoạt động':'Ẩn'}</span></td>
            <td><div style="display:flex;gap:6px">
              <button class="btn btn-ghost btn-sm" onclick="editHotel(${h.id},'${h.name}','${h.city}','${h.address||''}',${h.stars})">Sửa</button>
              <button class="btn btn-danger btn-sm" onclick="toggleHotel(${h.id},${h.is_active})">${h.is_active?'Ẩn':'Hiện'}</button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

window.showAddHotelModal = () => {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><span class="modal-title">Thêm khách sạn mới</span><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Tên khách sạn *</label><input id="ah-name" class="form-control"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Thành phố *</label><input id="ah-city" class="form-control"></div>
          <div class="form-group"><label class="form-label">Số sao</label><select id="ah-stars" class="form-control"><option value="3">3 sao</option><option value="4">4 sao</option><option value="5" selected>5 sao</option></select></div>
        </div>
        <div class="form-group"><label class="form-label">Địa chỉ</label><input id="ah-addr" class="form-control"></div>
        <div class="form-group"><label class="form-label">Mô tả</label><textarea id="ah-desc" class="form-control" rows="3"></textarea></div>
        <button class="btn btn-primary btn-block" onclick="submitAddHotel()">Thêm khách sạn</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
};

window.submitAddHotel = async () => {
  const name = $('ah-name')?.value.trim();
  const city = $('ah-city')?.value.trim();
  if (!name || !city) { toast('Tên và thành phố là bắt buộc.', 'error'); return; }
  const d = await api('POST', '/hotels', { name, city, address: $('ah-addr')?.value, description: $('ah-desc')?.value, stars: $('ah-stars')?.value });
  document.querySelector('.modal-overlay')?.remove();
  toast(d.message, d.success ? 'success' : 'error');
  if (d.success) navigate('admin', { section: 'hotels' });
};

window.editHotel = (id, name, city, address, stars) => {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><span class="modal-title">Cập nhật khách sạn</span><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Tên</label><input id="eh-name" class="form-control" value="${name}"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Thành phố</label><input id="eh-city" class="form-control" value="${city}"></div>
          <div class="form-group"><label class="form-label">Sao</label><select id="eh-stars" class="form-control"><option ${stars==3?'selected':''}>3</option><option ${stars==4?'selected':''}>4</option><option ${stars==5?'selected':''}>5</option></select></div>
        </div>
        <div class="form-group"><label class="form-label">Địa chỉ</label><input id="eh-addr" class="form-control" value="${address}"></div>
        <button class="btn btn-primary btn-block" onclick="submitEditHotel(${id})">Lưu thay đổi</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
};

window.submitEditHotel = async (id) => {
  const d = await api('PUT', '/hotels/' + id, { name: $('eh-name')?.value, city: $('eh-city')?.value, address: $('eh-addr')?.value, stars: $('eh-stars')?.value });
  document.querySelector('.modal-overlay')?.remove();
  toast(d.message, d.success ? 'success' : 'error');
  if (d.success) navigate('admin', { section: 'hotels' });
};

window.toggleHotel = async (id, isActive) => {
  const d = await api('PUT', '/hotels/' + id, { is_active: isActive ? 0 : 1 });
  toast(d.message, d.success ? 'success' : 'error');
  if (d.success) navigate('admin', { section: 'hotels' });
};

async function adminBookings() {
  const d = await api('GET', '/bookings');
  const m = $('admin-main');
  if (!m) return;
  const statusMap = { pending:'⏳ Chờ', confirmed:'✅ XN', checked_in:'🏠 Đang ở', checked_out:'🏁 Trả phòng', cancelled:'❌ Huỷ' };
  m.innerHTML = `
    <div class="admin-title">📋 Quản lý đơn đặt phòng</div>
    <div class="admin-table">
      <table>
        <thead><tr><th>Mã</th><th>Khách hàng</th><th>Khách sạn / Phòng</th><th>Tổng</th><th>Trạng thái</th><th>Cập nhật</th></tr></thead>
        <tbody>${d.bookings.map(b=>`
          <tr>
            <td><code style="font-size:11px">${b.booking_code}</code></td>
            <td>${b.username}<br><small style="color:#888">${b.email}</small></td>
            <td>${b.hotel_name}<br><small>${b.room_type}</small></td>
            <td style="font-weight:700;color:var(--primary)">${fmt(b.total_price)}</td>
            <td><span class="badge ${b.status==='confirmed'?'badge-success':b.status==='pending'?'badge-warning':'badge-danger'}">${statusMap[b.status]||b.status}</span></td>
            <td>
              <select class="form-control" style="font-size:12px;padding:4px 6px;margin:0" onchange="updateStatus(${b.id},this.value)">
                ${['pending','confirmed','checked_in','checked_out','cancelled'].map(s=>`<option value="${s}" ${b.status===s?'selected':''}>${statusMap[s]}</option>`).join('')}
              </select>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

window.updateStatus = async (id, status) => {
  const d = await api('PUT', '/bookings/' + id + '/status', { status });
  toast(d.message, d.success ? 'success' : 'error');
};

async function adminUsers() {
  const d = await api('GET', '/admin/users');
  const m = $('admin-main');
  if (!m) return;
  m.innerHTML = `
    <div class="admin-title">👥 Quản lý người dùng</div>
    <div class="admin-table">
      <table>
        <thead><tr><th>ID</th><th>Tên</th><th>Email</th><th>Điện thoại</th><th>Vai trò</th><th>Ngày tạo</th><th>Hành động</th></tr></thead>
        <tbody>${d.users.map(u=>`
          <tr>
            <td>${u.id}</td>
            <td>${u.username||'—'}</td>
            <td>${u.email}</td>
            <td>${u.phone||'—'}</td>
            <td><span class="badge ${u.role==='admin'?'badge-primary':'badge-info'}">${u.role}</span></td>
            <td style="font-size:12px;color:#888">${new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
            <td>
              <div style="display:flex;gap:6px">
                <button class="btn btn-ghost btn-sm" onclick="showEditUserModal(${u.id}, '${u.username||''}', '${u.email}', '${u.phone||''}', '${u.role}')">Sửa</button>
                <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})">Xoá</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

window.showEditUserModal = (id, username, email, phone, role) => {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><span class="modal-title">Cập nhật người dùng</span><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Tên người dùng</label><input id="eu-name" class="form-control" value="${username}"></div>
        <div class="form-group"><label class="form-label">Email</label><input id="eu-email" type="email" class="form-control" value="${email}"></div>
        <div class="form-group"><label class="form-label">Số điện thoại</label><input id="eu-phone" class="form-control" value="${phone}"></div>
        <div class="form-group">
          <label class="form-label">Vai trò (Role)</label>
          <select id="eu-role" class="form-control">
            <option value="customer" ${role === 'customer' ? 'selected' : ''}>Customer (Khách hàng)</option>
            <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin (Quản trị viên)</option>
          </select>
        </div>
        <button class="btn btn-primary btn-block" onclick="submitEditUser(${id})">Lưu thay đổi</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
};

window.submitEditUser = async (id) => {
  const body = {
    username: $('eu-name')?.value.trim(),
    email: $('eu-email')?.value.trim(),
    phone: $('eu-phone')?.value.trim(),
    role: $('eu-role')?.value
  };
  
  if (!body.email) { toast('Email không được để trống.', 'error'); return; }

  const d = await api('PUT', '/admin/users/' + id, body);
  document.querySelector('.modal-overlay')?.remove();
  toast(d.message, d.success ? 'success' : 'error');
  if (d.success) navigate('admin', { section: 'users' });
};

window.deleteUser = async (id) => {
  if (!confirm('Bạn có chắc chắn muốn xoá người dùng này? Hành động này sẽ xoá toàn bộ lịch sử đặt phòng của họ!')) return;
  const d = await api('DELETE', '/admin/users/' + id);
  toast(d.message, d.success ? 'success' : 'error');
  if (d.success) navigate('admin', { section: 'users' });
};

// ── Global expose ─────────────────────────────────────────────
window.navigate = navigate;
window.logout   = logout;
window.showAuthModal = showAuthModal;
window.doSearch = doSearch;
window.applyHotelFilter = applyHotelFilter;
window.addToCartAndBook = addToCartAndBook;
window.addToCartOnly = addToCartOnly;

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadUser();
  const hash = location.hash.slice(1);
  const [page, qs] = (hash || 'home').split('?');
  const params = qs ? Object.fromEntries(new URLSearchParams(qs)) : {};
  render(page || 'home', params);
});
