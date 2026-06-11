/**
 * header.js — Shared Header Component
 * Inject header + mobile nav vào tất cả các trang.
 *
 * Cách dùng trong HTML:
 *   1. Thêm <div id="app-header"></div> ở đầu <body>
 *   2. Thêm <div id="app-mobile-nav"></div> ở cuối <body>
 *   3. Include script này trước api.js và auth.js (KHÔNG dùng defer)
 *
 * <script src="/js/header.js"></script>   ← không defer
 * <script src="/js/api.js" defer></script>
 * <script src="/js/auth.js" defer></script>
 */
(function () {
  const path = window.location.pathname;

  function isActivePage(href) {
    const base = href.split('?')[0];
    if (base === '/index.html') return path === '/' || path === '/index.html';
    return path.startsWith(base);
  }

  const navLinks = [
    { label: 'Home',           href: '/index.html' },
    { label: 'Vegetables',     href: '/products.html?category=rau-xanh-huu-co' },
    { label: 'Fruits',         href: '/products.html?category=trai-cay-nhiet-doi' },
    { label: 'Special Offers', href: '/products.html?category=cu-qua-tuoi-song' },
  ];

  const desktopNavHtml = navLinks.map(({ label, href }) => {
    const active = isActivePage(href);
    return `<a
      class="${active
        ? 'text-primary font-bold border-b-2 border-primary pb-1 text-label-md font-label-md'
        : 'text-on-surface-variant pb-1 hover:text-primary transition-colors duration-200 text-label-md font-label-md'
      }"
      href="${href}">${label}</a>`;
  }).join('');

  const mobilePages = [
    { icon: 'home',             label: 'Home',     href: '/index.html' },
    { icon: 'grid_view',        label: 'Danh mục', href: '/products.html' },
    { icon: 'shopping_basket',  label: 'Giỏ hàng', href: '/cart.html' },
    { icon: 'person',           label: 'Tôi',      href: '/profile.html', id: 'mobile-profile-link' },
  ];

  const mobileNavHtml = mobilePages.map(({ icon, label, href, id }) => {
    const active = isActivePage(href);
    return `<a
      ${id ? `id="${id}"` : ''}
      class="flex flex-col items-center gap-1 ${active ? 'text-primary' : 'text-on-surface-variant'}"
      href="${href}">
      <span class="material-symbols-outlined" ${active ? "style=\"font-variation-settings: 'FILL' 1;\"" : ''}>${icon}</span>
      <span class="text-label-sm font-label-sm">${label}</span>
    </a>`;
  }).join('');

  const headerHTML = `
  <header
    id="site-header"
    class="sticky top-0 z-50 flex justify-between items-center w-full px-margin-desktop py-4 max-w-container-max mx-auto bg-surface-container-lowest shadow-sm transition-all duration-300">
    <!-- Logo -->
    <div
      id="site-logo"
      class="text-headline-md font-headline-md font-bold text-primary tracking-tight cursor-pointer select-none"
      onclick="window.location.href='/index.html'">
      Pure Vitality Market
    </div>

    <!-- Desktop Navigation -->
    <nav class="hidden md:flex items-center gap-8">
      ${desktopNavHtml}
    </nav>

    <!-- Right Actions: Search + Cart + Profile -->
    <div class="flex items-center gap-3">
      <div class="relative hidden sm:block">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
        <input
          id="header-search"
          class="pl-9 pr-4 py-2 bg-surface-container-low border-none rounded-full text-body-sm font-body-sm focus:ring-2 focus:ring-primary w-56 outline-none transition-all"
          placeholder="Tìm kiếm sản phẩm..."
          type="text" />
      </div>

      <button
        id="header-cart-btn"
        class="p-2 text-on-surface-variant hover:text-primary transition-colors duration-200 active:scale-95 relative"
        title="Giỏ hàng">
        <span class="material-symbols-outlined" data-icon="shopping_cart">shopping_cart</span>
      </button>

      <button
        id="header-profile-btn"
        class="p-2 text-on-surface-variant hover:text-primary transition-colors duration-200 active:scale-95 relative"
        title="Tài khoản">
        <span class="material-symbols-outlined" data-icon="person">person</span>
      </button>
    </div>
  </header>`;

  const mobileNavFragment = `
  <nav
    id="app-mobile-nav"
    class="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container-lowest shadow-[0_-2px_10px_rgba(0,0,0,0.05)] flex justify-around py-3 z-50">
    ${mobileNavHtml}
  </nav>`;

  // Inject header
  const headerRoot = document.getElementById('app-header');
  if (headerRoot) {
    headerRoot.innerHTML = headerHTML;
  }

  // Inject mobile nav
  const mobileNavRoot = document.getElementById('app-mobile-nav-root');
  if (mobileNavRoot) {
    mobileNavRoot.innerHTML = mobileNavFragment;
  }

  // DOMContentLoaded: bind search + scroll effect
  document.addEventListener('DOMContentLoaded', () => {
    // Search
    const searchInput = document.getElementById('header-search');
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

    // Scroll effect
    const header = document.getElementById('site-header');
    if (header) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
          header.style.background = 'rgba(255,255,255,0.88)';
          header.style.backdropFilter = 'blur(12px)';
          header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.08)';
        } else {
          header.style.background = '';
          header.style.backdropFilter = '';
          header.style.boxShadow = '';
        }
      });
    }
  });
})();
