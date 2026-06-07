// Helper to check login status
const auth = {
  getUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (_) {
      return null;
    }
  },

  isLoggedIn() {
    return this.getUser() !== null;
  },

  saveSession(user, accessToken) {
    localStorage.setItem('user', JSON.stringify(user));
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    }
  },

  clearSession() {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
  },

  async logout() {
    try {
      const res = await window.api.post('/auth/logout', {});
      if (res.success) {
        window.toast.success('Đăng xuất thành công.');
      }
    } catch (e) {
      console.warn('Lỗi khi gọi API đăng xuất:', e);
    } finally {
      this.clearSession();
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 1000);
    }
  },

  // Cap nhat Navbar phia tren va Navigation Mobile phia duoi
  async updateNavigationUI() {
    const user = this.getUser();

    // 1. Cap nhat Header Icons
    const headerProfileBtn = document.querySelector('header button span[data-icon="person"]')?.parentElement;
    if (headerProfileBtn) {
      if (user) {
        // Thay doi hanh dong click: click de hien thi/an dropdown
        headerProfileBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const dropdown = headerProfileBtn.querySelector('.profile-dropdown');
          if (dropdown) {
            dropdown.classList.toggle('hidden');
          }
        };
        // Hien thi tooltip hoac ten viet tat
        headerProfileBtn.title = `Chào, ${user.name} (${user.role})`;

        headerProfileBtn.classList.add('relative');

        // Check xem da co dropdown chua, neu chua thi append
        let dropdown = headerProfileBtn.querySelector('.profile-dropdown');
        if (!dropdown) {
          dropdown = document.createElement('div');
          dropdown.className = 'profile-dropdown absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-surface-container-high py-2 hidden z-50 text-left';
          dropdown.innerHTML = `
            <div class="px-4 py-2 border-b border-surface-container-low text-body-sm font-bold truncate text-on-surface">${user.name}</div>
            <a href="/profile.html" class="block px-4 py-2 text-body-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors">Tài khoản cá nhân</a>
            ${user.role === 'admin' || user.role === 'staff' ? `<a href="/admin.html" class="block px-4 py-2 text-body-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors">Trang quản trị</a>` : ''}
            <button id="nav-logout-btn" class="w-full text-left px-4 py-2 text-body-sm text-error hover:bg-surface-container-low transition-colors border-t border-surface-container-low">Đăng xuất</button>
          `;
          headerProfileBtn.appendChild(dropdown);

          // Gan event logout
          dropdown.querySelector('#nav-logout-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.logout();
          });
        }
      } else {
        headerProfileBtn.onclick = (e) => {
          e.preventDefault();
          window.location.href = '/login.html';
        };
        headerProfileBtn.title = 'Đăng nhập / Đăng ký';

        // Remove dropdown cu neu co
        const dropdown = headerProfileBtn.querySelector('.profile-dropdown');
        if (dropdown) dropdown.remove();
      }
    }

    // 2. Cap nhat Gio Hang Quantity Badge o Top Header
    const headerCartBtn = document.querySelector('header button span[data-icon="shopping_cart"]')?.parentElement;
    if (headerCartBtn) {
      headerCartBtn.onclick = (e) => {
        e.preventDefault();
        window.location.href = '/cart.html';
      };
      headerCartBtn.classList.add('relative');

      if (user) {
        try {
          const cartRes = await window.api.get('/cart');
          if (cartRes.success) {
            const totalItems = cartRes.data.totalItems || 0;
            this.updateCartBadge(headerCartBtn, totalItems);

            // ✅ FIXED: Safely find mobile cart link
            const allMobileLinks = document.querySelectorAll('nav.md\\:hidden a');
            allMobileLinks.forEach(link => {
              const iconSpan = link.querySelector('span.material-symbols-outlined');
              const iconText = iconSpan ? iconSpan.innerText : '';
              const href = link.getAttribute('href') || '';
              const linkText = link.innerText.toLowerCase();

              if (href === '/cart.html' || linkText.includes('giỏ hàng') || iconText === 'shopping_basket' || iconText === 'shopping_cart') {
                link.classList.add('relative');
                this.updateCartBadge(link, totalItems);
              }
            });
          }
        } catch (e) {
          console.warn('Lỗi lấy thông tin số lượng giỏ hàng:', e);
        }
      }
    }

    // 3. Cap nhat bottom navigation tren mobile cho hop ly
    const mobileProfileLink = Array.from(document.querySelectorAll('nav.md\\:hidden a')).find(a =>
      a.getAttribute('href') === '/profile.html' || a.querySelector('span')?.innerText === 'person' || a.innerText.includes('Tôi')
    );
    if (mobileProfileLink) {
      mobileProfileLink.setAttribute('href', user ? '/profile.html' : '/login.html');
    }

    // Tự động gán link cho các menu trên Header để điều hướng đúng
    const navLinks = document.querySelectorAll('header nav a');
    navLinks.forEach(link => {
      const text = link.innerText.trim();
      if (text === 'Home' || text === 'Trang chủ') {
        link.setAttribute('href', '/index.html');
      } else if (text === 'Vegetables' || text === 'Rau củ' || text === 'Rau Xanh' || text === 'Rau quả') {
        link.setAttribute('href', '/products.html?category=rau-xanh-huu-co');
      } else if (text === 'Fruits' || text === 'Trái cây') {
        link.setAttribute('href', '/products.html?category=trai-cay-nhiet-doi');
      } else if (text === 'Special Offers' || text === 'Khuyến mãi' || text === 'Củ Quả') {
        link.setAttribute('href', '/products.html?category=cu-qua-tuoi-song');
      }
    });

    // Fix logo click quay ve home
    const logoEl = document.querySelector('header div.text-headline-md');
    if (logoEl) {
      logoEl.classList.add('cursor-pointer');
      logoEl.onclick = () => { window.location.href = '/index.html'; };
    }

    // Mobile nav links fix
    const mobileLinks = document.querySelectorAll('nav.md\\:hidden a');
    mobileLinks.forEach(link => {
      const text = link.querySelector('span.text-label-sm')?.innerText || link.innerText;
      const icon = link.querySelector('span.material-symbols-outlined')?.innerText;

      if (icon === 'home' || text.includes('Home') || text.includes('Trang chủ')) {
        link.setAttribute('href', '/index.html');
      } else if (icon === 'grid_view' || text.includes('Danh mục') || text.includes('Sản phẩm')) {
        link.setAttribute('href', '/products.html');
      } else if (icon === 'shopping_basket' || icon === 'shopping_cart' || text.includes('Giỏ hàng')) {
        link.setAttribute('href', '/cart.html');
      } else if (icon === 'person' || text.includes('Tôi') || text.includes('Cá nhân')) {
        link.setAttribute('href', user ? '/profile.html' : '/login.html');
      }
    });

    // Them thanh tim kiem input action
    const searchInput = document.querySelector('header input[placeholder*="Tìm kiếm"]');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const keyword = searchInput.value.trim();
          if (keyword) {
            window.location.href = `/products.html?search=${encodeURIComponent(keyword)}`;
          }
        }
      });
    }
  },

  updateCartBadge(parentEl, totalItems) {
    let badge = parentEl.querySelector('.cart-badge');
    if (totalItems > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'cart-badge absolute -top-1 -right-1 bg-error text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm animate-pulse';
        parentEl.appendChild(badge);
      }
      badge.innerText = totalItems > 99 ? '99+' : totalItems;
      badge.style.display = 'flex';
    } else {
      if (badge) badge.style.display = 'none';
    }
  },

  // Dung de khoa route bat buoc dang nhap
  checkAuthOrRedirect() {
    if (!this.isLoggedIn()) {
      window.toast.info('Vui lòng đăng nhập để tiếp tục.');
      setTimeout(() => {
        window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      }, 1000);
      return false;
    }
    return true;
  }
};

// Tu dong chay khi trang duoc load xong
document.addEventListener('DOMContentLoaded', () => {
  auth.updateNavigationUI();

  // Click outside to close profile dropdown
  document.addEventListener('click', (e) => {
    const profileBtn = document.querySelector('header button span[data-icon="person"]')?.parentElement;
    if (profileBtn && !profileBtn.contains(e.target)) {
      const dropdown = profileBtn.querySelector('.profile-dropdown');
      if (dropdown) {
        dropdown.classList.add('hidden');
      }
    }
  });
});

// Export de dung o file khac
window.auth = auth;
