// ========================
// HOME PAGE MAIN SCRIPT
// ========================

document.addEventListener('DOMContentLoaded', () => {
  loadFeaturedProducts();
  loadQuickCategories();
  loadCategoryGroupedProducts();
  setupNewsletterForm();
  setupGlobalEventDelegation();
  setupImageErrorHandler();
});

// ========== XỬ LÝ LỖI ẢNH TOÀN CỤC (thay thế hoàn toàn onerror) ==========
function setupImageErrorHandler() {
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img.tagName === 'IMG') {
      img.src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
    }
  }, true); // capture phase để bắt lỗi trước khi nổi bọt
}

// ========== EVENT DELEGATION CHO TOÀN BỘ TRANG ==========
function setupGlobalEventDelegation() {
  // 1. Xử lý click trên các container có sản phẩm (featured + category grouped)
  const productContainers = [
    document.getElementById('featured-products-grid'),
    document.getElementById('home-category-products-container')
  ];

  productContainers.forEach(container => {
    if (!container) return;
    container.addEventListener('click', (e) => {
      // Tìm thẻ cha gần nhất có data-product-id (chính là card sản phẩm)
      const card = e.target.closest('[data-product-id]');
      if (!card) return;

      const productId = parseInt(card.dataset.productId);
      const stock = parseInt(card.dataset.stock);

      // Nút "Mua ngay"
      if (e.target.closest('.btn-buy-now')) {
        e.stopPropagation();
        buyNow(productId, stock);
      }
      // Nút "Thêm vào giỏ"
      else if (e.target.closest('.btn-add-to-cart')) {
        e.stopPropagation();
        addToCart(productId, stock);
      }
      // Click vào card (nhưng không phải nút)
      else if (!e.target.closest('button')) {
        goToDetail(productId);
      }
    });
  });

  // 2. Nút hero (Mua Ngay, Tìm Hiểu Thêm) trong banner
  document.addEventListener('click', (e) => {
    const heroBtn = e.target.closest('[data-hero-link]');
    if (heroBtn) {
      const link = heroBtn.getAttribute('data-hero-link');
      if (link) window.location.href = link;
    }
  });
}

// ========== RENDER MỘT CARD SẢN PHẨM (không onclick, không onerror) ==========
function renderProductCard(product) {
  const isSale = product.sale_price !== null;
  const originalPrice = product.price;
  const displayPrice = isSale ? product.sale_price : product.price;
  const discountPercent = isSale ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0;

  const imageUrl = (product.images && product.images.length > 0)
    ? product.images[0]
    : 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';

  return `
    <div class="bg-white rounded-xl product-card-shadow group flex flex-col h-full transition-all hover:-translate-y-2 overflow-hidden cursor-pointer shadow-sm border border-outline-variant hover:border-primary"
         data-product-id="${product.id}"
         data-stock="${product.stock}">
      <div class="relative h-64 overflow-hidden bg-surface-container-low">
        <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
             src="${window.escapeHTML(imageUrl)}" 
             alt="${window.escapeHTML(product.name)}"
        />
        ${isSale
      ? `<div class="absolute top-4 left-4 bg-error text-on-error px-3 py-1 rounded-full text-label-sm font-bold shadow-sm">-${discountPercent}% GIẢM</div>`
      : (product.stock > 0 && product.stock <= 5
        ? `<div class="absolute top-4 left-4 bg-tertiary-container text-white px-3 py-1 rounded-full text-label-sm font-bold shadow-sm">Sắp hết hàng</div>`
        : `<div class="absolute top-4 left-4 bg-secondary text-on-secondary px-3 py-1 rounded-full text-label-sm font-label-sm shadow-sm">Tươi mới</div>`
      )
    }
        ${product.stock === 0 ? `<div class="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-headline-sm">Hết hàng</div>` : ''}
      </div>
      <div class="flex flex-col flex-grow p-6">
        <h3 class="text-body-md font-bold text-on-surface mb-2 line-clamp-1 group-hover:text-primary transition-colors">${window.escapeHTML(product.name)}</h3>
        <p class="text-on-surface-variant text-body-sm mb-4 line-clamp-2">${window.escapeHTML(product.description || 'Sản phẩm tươi sạch chất lượng cao, cung cấp nhiều dinh dưỡng hữu ích.')}</p>
        <div class="mt-auto pt-2">
          <div class="flex flex-col mb-4">
            ${isSale
      ? `<span class="text-outline text-label-sm line-through mb-1">${formatVND(originalPrice)}</span>`
      : `<span class="h-[18px] mb-1"></span>`
    }
            <div class="flex items-center gap-2">
              <span class="${isSale ? 'text-error' : 'text-secondary'} font-bold text-headline-sm">${formatVND(displayPrice)}</span>
              <span class="text-on-surface-variant text-label-sm font-normal">/${window.escapeHTML(product.unit)}</span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <button class="btn-buy-now flex-grow bg-primary text-on-primary h-12 rounded-lg font-bold text-label-md hover:bg-primary-container transition-colors shadow-sm active:scale-95 duration-100 flex items-center justify-center" 
                    ${product.stock === 0 ? 'disabled' : ''}>
              Mua ngay
            </button>
            <button class="btn-add-to-cart w-12 h-12 border border-outline-variant text-primary rounded-lg flex items-center justify-center hover:bg-surface-container-low transition-colors active:scale-90 duration-100 shrink-0" 
                    ${product.stock === 0 ? 'disabled' : ''}>
              <span class="material-symbols-outlined">add_shopping_cart</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ========== HIỂN THỊ SẢN PHẨM NỔI BẬT (FEATURED) ==========
async function loadFeaturedProducts() {
  const gridContainer = document.getElementById('featured-products-grid');
  if (!gridContainer) return;

  // Skeleton loading
  gridContainer.innerHTML = Array(4).fill(0).map(() => `
    <div class="bg-white rounded-xl product-card-shadow flex flex-col h-full overflow-hidden animate-pulse">
      <div class="h-64 bg-surface-container-highest"></div>
      <div class="p-6 flex-grow flex flex-col">
        <div class="h-6 bg-surface-container-highest rounded w-3/4 mb-3"></div>
        <div class="h-4 bg-surface-container-highest rounded w-full mb-2"></div>
        <div class="h-4 bg-surface-container-highest rounded w-5/6 mb-4"></div>
        <div class="mt-auto">
          <div class="h-8 bg-surface-container-highest rounded w-1/3 mb-4"></div>
          <div class="h-10 bg-surface-container-highest rounded w-full"></div>
        </div>
      </div>
    </div>
  `).join('');

  const res = await window.api.get('/products/featured?limit=4');
  if (!res.success) {
    gridContainer.innerHTML = `
      <div class="col-span-full py-12 text-center text-on-surface-variant font-bold">
        Không thể tải sản phẩm nổi bật lúc này. Vui lòng thử lại sau.
      </div>
    `;
    return;
  }

  const products = res.data;
  if (products.length === 0) {
    gridContainer.innerHTML = `<div class="col-span-full py-12 text-center text-on-surface-variant font-bold">Hiện chưa có sản phẩm nổi bật nào được đăng bán.</div>`;
    return;
  }

  gridContainer.innerHTML = products.map(product => renderProductCard(product)).join('');
}

// ========== HIỂN THỊ DANH MỤC NHANH (QUICK CATEGORIES) ==========
async function loadQuickCategories() {
  const container = document.getElementById('quick-category-container');
  if (!container) return;

  // Skeleton
  container.innerHTML = Array(6).fill(0).map(() => `
    <div class="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 animate-pulse border border-outline-variant">
      <div class="w-12 h-12 bg-surface-container-highest rounded-full"></div>
      <div class="h-4 bg-surface-container-highest rounded w-2/3"></div>
    </div>
  `).join('');

  const res = await window.api.get('/products/categories');
  if (!res.success) {
    container.innerHTML = `<div class="col-span-full text-center text-error text-body-sm font-bold py-6">Không thể tải danh mục sản phẩm</div>`;
    return;
  }

  const categories = res.data;
  if (categories.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center text-on-surface-variant text-body-sm py-6">Chưa có danh mục sản phẩm nào.</div>`;
    return;
  }

  container.innerHTML = categories.map(cat => `
    <a href="/products.html?category=${encodeURIComponent(cat.slug)}" 
       class="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 text-center border border-outline-variant hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all duration-300 group">
      <div class="w-14 h-14 bg-primary-container/20 text-primary rounded-full flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
        ${cat.icon || '🥬'}
      </div>
      <span class="font-bold text-on-surface text-body-sm group-hover:text-primary transition-colors">${window.escapeHTML(cat.name)}</span>
    </a>
  `).join('');
}

// ========== HIỂN THỊ SẢN PHẨM THEO NHÓM DANH MỤC (GROUPED) ==========
async function loadCategoryGroupedProducts() {
  const container = document.getElementById('home-category-products-container');
  if (!container) return;

  // Skeleton loading cho 3 nhóm danh mục
  container.innerHTML = Array(3).fill(0).map(() => `
    <div class="space-y-6">
      <div class="flex justify-between items-end">
        <div class="h-8 bg-surface-container-highest rounded w-48 animate-pulse"></div>
        <div class="h-6 bg-surface-container-highest rounded w-20 animate-pulse"></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        ${Array(4).fill(0).map(() => `
          <div class="bg-white rounded-xl product-card-shadow flex flex-col h-full overflow-hidden animate-pulse">
            <div class="h-64 bg-surface-container-highest"></div>
            <div class="p-6">
              <div class="h-6 bg-surface-container-highest rounded w-3/4 mb-3"></div>
              <div class="h-4 bg-surface-container-highest rounded w-full mb-2"></div>
              <div class="h-8 bg-surface-container-highest rounded w-1/3 mt-4"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  const catRes = await window.api.get('/products/categories');
  if (!catRes.success) {
    container.innerHTML = `<div class="text-center text-outline py-12">Không thể tải danh mục sản phẩm lúc này.</div>`;
    return;
  }

  const categories = catRes.data;
  if (categories.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = '';

  for (const cat of categories) {
    const prodRes = await window.api.get(`/products?category=${encodeURIComponent(cat.slug)}&limit=4`);
    if (!prodRes.success || !prodRes.data.products || prodRes.data.products.length === 0) {
      continue;
    }

    const products = prodRes.data.products;

    const section = document.createElement('div');
    section.className = 'space-y-6 border-b border-surface-container pb-12 last:border-0 last:pb-0';
    section.innerHTML = `
      <div class="flex justify-between items-end mb-6">
        <h2 class="text-headline-sm font-headline-sm text-primary font-bold uppercase tracking-tight">${window.escapeHTML(cat.name)}</h2>
        <a class="text-secondary font-bold hover:underline flex items-center gap-1 text-label-md" href="/products.html?category=${encodeURIComponent(cat.slug)}">
          <span>Xem tất cả</span>
          <span class="material-symbols-outlined text-[18px]">chevron_right</span>
        </a>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        ${products.map(prod => renderProductCard(prod)).join('')}
      </div>
    `;
    container.appendChild(section);
  }
}

// ========== NEWSLETTER FORM ==========
function setupNewsletterForm() {
  const form = document.querySelector('main form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = form.querySelector('input[type="email"]');
    const email = emailInput?.value.trim();

    if (!email) {
      window.toast?.error('Vui lòng điền địa chỉ email.');
      return;
    }

    window.toast?.success('Đăng ký nhận bản tin sống khỏe thành công! Xin cảm ơn.');
    if (emailInput) emailInput.value = '';
  });
}

// ========== CHUYỂN TRANG CHI TIẾT SẢN PHẨM ==========
function goToDetail(productId) {
  window.location.href = `/product-detail.html?id=${productId}`;
}

// ========== THÊM VÀO GIỎ HÀNG ==========
async function addToCart(productId, stock) {
  if (!window.auth.isLoggedIn()) {
    window.toast?.info('Vui lòng đăng nhập để thêm vào giỏ hàng.');
    setTimeout(() => {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    }, 1200);
    return;
  }

  if (stock === 0) {
    window.toast?.error('Sản phẩm đã hết hàng trong kho.');
    return;
  }

  const res = await window.api.post('/cart/items', { product_id: productId, quantity: 1 });
  if (res.success) {
    window.toast?.success('Đã thêm sản phẩm vào giỏ hàng.');
    window.auth.updateNavigationUI(); // Cập nhật badge giỏ hàng
  } else {
    window.toast?.error(res.message || 'Thêm vào giỏ hàng thất bại.');
  }
}

// ========== MUA NGAY (THÊM GIỎ + CHUYỂN SANG CART) ==========
async function buyNow(productId, stock) {
  if (!window.auth.isLoggedIn()) {
    window.toast?.info('Vui lòng đăng nhập để tiếp tục.');
    setTimeout(() => {
      window.location.href = `/login.html?redirect=${encodeURIComponent('/cart.html')}`;
    }, 1200);
    return;
  }

  if (stock === 0) {
    window.toast?.error('Sản phẩm đã hết hàng trong kho.');
    return;
  }

  const res = await window.api.post('/cart/items', { product_id: productId, quantity: 1 });
  if (res.success) {
    window.location.href = '/cart.html';
  } else {
    window.toast?.error(res.message || 'Có lỗi xảy ra.');
  }
}

// ========== ĐỊNH DẠNG TIỀN TỆ VND ==========
function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}