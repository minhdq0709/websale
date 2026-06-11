// State variables
let state = {
  category: null,
  search: null,
  maxPrice: 200000,
  sortBy: 'newest',
  page: 1,
  limit: 12
};

document.addEventListener('DOMContentLoaded', () => {
  // Đọc query params
  const urlParams = new URLSearchParams(window.location.search);
  state.category = urlParams.get('category') || null;
  state.search = urlParams.get('search') || null;

  const mainSearch = document.getElementById('main-search-input');
  if (mainSearch && state.search) mainSearch.value = state.search;
  const mobileSearch = document.getElementById('mobile-search-input');
  if (mobileSearch && state.search) mobileSearch.value = state.search;

  setupFilters();
  setupGlobalEventDelegation();
  setupImageErrorHandler(); // Xử lý lỗi ảnh mà không dùng onerror

  loadCategories();
  loadProducts();
});

// Xử lý tất cả lỗi ảnh trên toàn trang (thay thế onerror)
function setupImageErrorHandler() {
  document.addEventListener('error', (e) => {
    const target = e.target;
    if (target.tagName === 'IMG') {
      target.src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
    }
  }, true); // capture phase để bắt lỗi sớm
}

// Event delegation cho các nút động
function setupGlobalEventDelegation() {
  // Product grid: click vào card hoặc nút bên trong
  document.getElementById('product-grid')?.addEventListener('click', (e) => {
    const card = e.target.closest('[data-product-id]');
    if (!card) return;

    const productId = parseInt(card.dataset.productId);
    const stock = parseInt(card.dataset.stock);

    if (e.target.closest('.btn-buy-now')) {
      e.stopPropagation();
      buyNow(productId, stock);
    } else if (e.target.closest('.btn-add-to-cart')) {
      e.stopPropagation();
      addToCart(productId, stock);
    } else if (!e.target.closest('button')) {
      goToDetail(productId);
    }
  });

  // Pagination
  document.getElementById('pagination-container')?.addEventListener('click', (e) => {
    const pageBtn = e.target.closest('[data-page]');
    if (pageBtn) {
      const newPage = parseInt(pageBtn.dataset.page);
      if (!isNaN(newPage)) changePage(newPage);
    }
  });

  // Reset filters (cả nút tĩnh và nút động)
  document.addEventListener('click', (e) => {
    const resetBtn = e.target.closest('#reset-filters-btn, .reset-filters-btn');
    if (resetBtn) resetAllFilters();
  });
}

// Hiển thị danh mục
async function loadCategories() {
  const container = document.getElementById('category-filter-container');
  if (!container) return;

  const res = await window.api.get('/products/categories');
  if (!res.success) {
    container.innerHTML = `<p class="text-body-sm text-error">Lỗi tải danh mục</p>`;
    return;
  }

  const categories = res.data;
  let html = `
    <label class="flex items-center gap-3 cursor-pointer group">
      <input type="radio" name="category-radio" value="" class="rounded-full border-outline-variant text-primary focus:ring-primary h-5 w-5" ${!state.category ? 'checked' : ''}/>
      <span class="text-body-md font-body-md group-hover:text-primary transition-colors ${!state.category ? 'text-primary font-bold' : ''}">Tất cả sản phẩm</span>
    </label>
  `;

  html += categories.map(cat => `
    <label class="flex items-center gap-3 cursor-pointer group">
      <input type="radio" name="category-radio" value="${window.escapeHTML(cat.slug)}" class="rounded-full border-outline-variant text-primary focus:ring-primary h-5 w-5" ${state.category === cat.slug ? 'checked' : ''}/>
      <span class="text-body-md font-body-md group-hover:text-primary transition-colors ${state.category === cat.slug ? 'text-primary font-bold' : ''}">${window.escapeHTML(cat.name)}</span>
    </label>
  `).join('');

  container.innerHTML = html;

  container.querySelectorAll('input[name="category-radio"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.category = e.target.value || null;
      state.page = 1;
      container.querySelectorAll('span').forEach(span => span.classList.remove('text-primary', 'font-bold'));
      e.target.nextElementSibling.classList.add('text-primary', 'font-bold');
      updateURL();
      loadProducts();
    });
  });
}

// Tải sản phẩm – không có bất kỳ inline event handler nào
async function loadProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  // Skeleton loading (8 skeletons for a 4-column layout)
  grid.innerHTML = Array(8).fill(0).map(() => `
    <div class="bg-white rounded-xl product-card-shadow flex flex-col h-full overflow-hidden animate-pulse">
      <div class="h-48 bg-surface-container-highest"></div>
      <div class="p-4 flex-grow flex flex-col">
        <div class="h-5 bg-surface-container-highest rounded w-3/4 mb-2"></div>
        <div class="h-3.5 bg-surface-container-highest rounded w-full mb-1.5"></div>
        <div class="h-3.5 bg-surface-container-highest rounded w-5/6 mb-3"></div>
        <div class="mt-auto">
          <div class="h-6 bg-surface-container-highest rounded w-1/3 mb-3"></div>
          <div class="h-8 bg-surface-container-highest rounded w-full"></div>
        </div>
      </div>
    </div>
  `).join('');

  const paginContainer = document.getElementById('pagination-container');
  if (paginContainer) paginContainer.innerHTML = '';

  let query = `/products?page=${state.page}&limit=${state.limit}&sortBy=${state.sortBy}`;
  if (state.category) query += `&category=${state.category}`;
  if (state.search) query += `&search=${encodeURIComponent(state.search)}`;
  if (state.maxPrice) query += `&maxPrice=${state.maxPrice}`;

  const res = await window.api.get(query);
  if (!res.success) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-on-surface-variant font-bold flex flex-col items-center gap-3">
        <span class="material-symbols-outlined text-[48px] text-error">sentiment_dissatisfied</span>
        Có lỗi xảy ra khi tải sản phẩm. Vui lòng tải lại trang.
      </div>
    `;
    return;
  }

  const { products, totalPages } = res.data;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-20 text-center text-on-surface-variant flex flex-col items-center gap-4">
        <span class="material-symbols-outlined text-[64px] text-outline">search_off</span>
        <div class="text-headline-sm font-bold text-primary">Không tìm thấy sản phẩm nào!</div>
        <p class="text-body-md max-w-sm">Hãy thử điều chỉnh mức giá tối đa, chọn danh mục khác hoặc thay đổi từ khóa tìm kiếm.</p>
        <button id="reset-filters-btn" class="bg-primary text-on-primary px-6 py-2 rounded-xl font-bold hover:scale-105 transition-transform">Đặt lại bộ lọc</button>
      </div>
    `;
    return;
  }

  // Render sản phẩm – không có onclick, không có onerror
  grid.innerHTML = products.map(product => {
    const isSale = product.sale_price !== null;
    const originalPrice = product.price;
    const displayPrice = isSale ? product.sale_price : product.price;
    const discountPercent = isSale ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0;
    const imageUrl = (product.images && product.images.length > 0)
      ? product.images[0]
      : 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';

    return `
      <div class="product-card-shadow rounded-xl bg-white overflow-hidden transition-all duration-300 flex flex-col h-full cursor-pointer" 
           data-product-id="${product.id}" 
           data-stock="${product.stock}">
        <div class="relative h-48 bg-surface-container-low flex items-center justify-center overflow-hidden">
          <img alt="${window.escapeHTML(product.name)}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-110" 
               src="${window.escapeHTML(imageUrl)}"
          />
          ${isSale
        ? `<span class="absolute top-3 left-3 bg-error text-on-error text-[11px] font-bold px-2 py-0.5 rounded shadow-lg">-${discountPercent}% GIẢM</span>`
        : `<span class="absolute top-3 left-3 bg-secondary text-on-secondary text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">Tươi ngon</span>`
      }
          ${product.stock === 0 ? `<div class="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-body-md z-10">Tạm hết hàng</div>` : ''}
        </div>
        <div class="p-4 flex flex-col flex-grow">
          <p class="text-label-sm font-label-sm text-outline mb-1.5">${window.escapeHTML(product.category_name || 'Nông sản sạch')}</p>
          <h4 class="font-bold text-body-md text-on-surface mb-1.5 truncate group-hover:text-primary transition-colors">${window.escapeHTML(product.name)}</h4>
          <p class="text-on-surface-variant text-xs mb-3 line-clamp-2">${window.escapeHTML(product.description || 'Nguồn gốc an toàn, chuẩn VietGAP, tươi ngon mỗi ngày cho bữa cơm gia đình bạn.')}</p>
          <div class="mt-auto pt-1">
            <div class="flex flex-col mb-3">
              ${isSale
        ? `<span class="text-outline text-label-sm line-through mb-0.5">${formatVND(originalPrice)}</span>`
        : `<span class="h-[16px] mb-0.5"></span>`
      }
              <span class="${isSale ? 'text-error' : 'text-secondary'} font-bold text-[17px] leading-none">
                ${formatVND(displayPrice)} 
                <small class="text-label-sm text-on-surface-variant font-normal">/${window.escapeHTML(product.unit)}</small>
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button class="btn-buy-now flex-grow bg-primary text-on-primary h-10 rounded-lg font-bold text-label-sm hover:bg-primary-container transition-colors shadow-sm active:scale-95 duration-100 flex items-center justify-center"
                      ${product.stock === 0 ? 'disabled' : ''}>
                Mua ngay
              </button>
              <button class="btn-add-to-cart w-10 h-10 rounded-lg border border-outline-variant text-primary flex items-center justify-center hover:bg-surface-container-low transition-colors active:scale-90 duration-100 shrink-0"
                      title="Thêm vào giỏ hàng"
                      ${product.stock === 0 ? 'disabled' : ''}>
                <span class="material-symbols-outlined text-[20px]">add_shopping_cart</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  renderPagination(totalPages);
}

function goToDetail(productId) {
  window.location.href = `/product-detail.html?id=${productId}`;
}

function renderPagination(totalPages) {
  const paginContainer = document.getElementById('pagination-container');
  if (!paginContainer || totalPages <= 1) return;

  let html = `
    <button class="w-10 h-10 rounded-lg border border-outline-variant flex items-center justify-center text-primary hover:bg-surface-container transition-all"
            ${state.page === 1 ? 'disabled' : ''} data-page="${state.page - 1}">
      <span class="material-symbols-outlined">chevron_left</span>
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    if (i === state.page) {
      html += `<button class="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center font-label-md shadow-sm" data-page="${i}">${i}</button>`;
    } else {
      html += `<button class="w-10 h-10 rounded-lg border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all font-label-md" data-page="${i}">${i}</button>`;
    }
  }

  html += `
    <button class="w-10 h-10 rounded-lg border border-outline-variant flex items-center justify-center text-primary hover:bg-surface-container transition-all"
            ${state.page === totalPages ? 'disabled' : ''} data-page="${state.page + 1}">
      <span class="material-symbols-outlined">chevron_right</span>
    </button>
  `;

  paginContainer.innerHTML = html;
}

function changePage(newPage) {
  state.page = newPage;
  loadProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Các filter (sort, price, quick, origin, search) – giữ nguyên
function setupFilters() {
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.value = state.sortBy;
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      state.page = 1;
      loadProducts();
    });
  }

  const priceSlider = document.getElementById('price-range-slider');
  const sliderVal = document.getElementById('price-slider-value');
  if (priceSlider && sliderVal) {
    priceSlider.addEventListener('input', (e) => {
      state.maxPrice = parseInt(e.target.value);
      sliderVal.innerText = formatVND(state.maxPrice);
    });
    priceSlider.addEventListener('change', () => {
      state.page = 1;
      loadProducts();
    });
  }

  const quickBtns = document.querySelectorAll('.quick-filter-btn');
  quickBtns.forEach(btn => {
    const slug = btn.getAttribute('data-slug');
    if (state.category === slug) {
      btn.className = 'quick-filter-btn px-4 py-2 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-label-sm border border-secondary transition-all';
    }
    btn.addEventListener('click', () => {
      if (state.category === slug) {
        state.category = null;
        btn.className = 'quick-filter-btn px-4 py-2 rounded-full bg-surface-container-low text-on-surface-variant text-label-sm font-label-sm border border-outline-variant hover:border-primary hover:text-primary transition-all';
      } else {
        state.category = slug;
        quickBtns.forEach(b => {
          b.className = 'quick-filter-btn px-4 py-2 rounded-full bg-surface-container-low text-on-surface-variant text-label-sm font-label-sm border border-outline-variant hover:border-primary hover:text-primary transition-all';
        });
        btn.className = 'quick-filter-btn px-4 py-2 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-label-sm border border-secondary transition-all';
      }
      const radio = document.querySelector(`input[name="category-radio"][value="${state.category || ''}"]`);
      if (radio) radio.checked = true;
      state.page = 1;
      updateURL();
      loadProducts();
    });
  });

  const handleSearch = (keyword) => {
    state.search = keyword || null;
    state.page = 1;
    updateURL();
    loadProducts();
  };
  const mainSearch = document.getElementById('main-search-input');
  if (mainSearch) {
    mainSearch.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSearch(mainSearch.value.trim());
    });
  }
  const mobileSearch = document.getElementById('mobile-search-input');
  if (mobileSearch) {
    mobileSearch.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSearch(mobileSearch.value.trim());
    });
  }

  const originBtns = document.querySelectorAll('.origin-filter-btn');
  originBtns.forEach(btn => {
    const origin = btn.getAttribute('data-origin');
    if (state.search === origin) {
      btn.className = 'origin-filter-btn px-4 py-2 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-label-sm border border-secondary transition-all';
    }
    btn.addEventListener('click', () => {
      if (state.search === origin) {
        state.search = null;
        btn.className = 'origin-filter-btn px-4 py-2 rounded-full bg-surface-container-low text-on-surface-variant text-label-sm font-label-sm border border-outline-variant hover:border-primary hover:text-primary transition-all';
        if (mainSearch) mainSearch.value = '';
        if (mobileSearch) mobileSearch.value = '';
      } else {
        state.search = origin;
        originBtns.forEach(b => {
          b.className = 'origin-filter-btn px-4 py-2 rounded-full bg-surface-container-low text-on-surface-variant text-label-sm font-label-sm border border-outline-variant hover:border-primary hover:text-primary transition-all';
        });
        btn.className = 'origin-filter-btn px-4 py-2 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-label-sm border border-secondary transition-all';
        if (mainSearch) mainSearch.value = origin;
        if (mobileSearch) mobileSearch.value = origin;
      }
      state.page = 1;
      updateURL();
      loadProducts();
    });
  });
}

function resetAllFilters() {
  state = {
    category: null,
    search: null,
    maxPrice: 200000,
    sortBy: 'newest',
    page: 1,
    limit: 9
  };

  const priceSlider = document.getElementById('price-range-slider');
  const sliderVal = document.getElementById('price-slider-value');
  if (priceSlider && sliderVal) {
    priceSlider.value = 200000;
    sliderVal.innerText = formatVND(200000);
  }

  const mainSearch = document.getElementById('main-search-input');
  if (mainSearch) mainSearch.value = '';
  const mobileSearch = document.getElementById('mobile-search-input');
  if (mobileSearch) mobileSearch.value = '';

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = 'newest';

  const quickBtns = document.querySelectorAll('.quick-filter-btn');
  quickBtns.forEach(b => {
    b.className = 'quick-filter-btn px-4 py-2 rounded-full bg-surface-container-low text-on-surface-variant text-label-sm font-label-sm border border-outline-variant hover:border-primary hover:text-primary transition-all';
  });

  const originBtns = document.querySelectorAll('.origin-filter-btn');
  originBtns.forEach(b => {
    b.className = 'origin-filter-btn px-4 py-2 rounded-full bg-surface-container-low text-on-surface-variant text-label-sm font-label-sm border border-outline-variant hover:border-primary hover:text-primary transition-all';
  });

  const radio = document.querySelector('input[name="category-radio"][value=""]');
  if (radio) radio.checked = true;

  updateURL();
  loadProducts();
}

function updateURL() {
  const url = new URL(window.location);
  if (state.category) url.searchParams.set('category', state.category);
  else url.searchParams.delete('category');
  if (state.search) url.searchParams.set('search', state.search);
  else url.searchParams.delete('search');
  window.history.pushState({}, '', url);
}

async function addToCart(productId, stock) {
  if (!window.auth.isLoggedIn()) {
    window.toast.info('Vui lòng đăng nhập để thêm vào giỏ hàng.');
    setTimeout(() => {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }, 1200);
    return;
  }
  if (stock === 0) {
    window.toast.error('Sản phẩm đã hết hàng trong kho.');
    return;
  }
  const res = await window.api.post('/cart/items', { product_id: productId, quantity: 1 });
  if (res.success) {
    window.toast.success('Đã thêm sản phẩm vào giỏ hàng.');
    window.auth.updateNavigationUI();
  } else {
    window.toast.error(res.message || 'Thêm sản phẩm thất bại.');
  }
}

async function buyNow(productId, stock) {
  if (!window.auth.isLoggedIn()) {
    window.toast.info('Vui lòng đăng nhập để tiếp tục.');
    setTimeout(() => {
      window.location.href = `/login.html?redirect=${encodeURIComponent('/cart.html')}`;
    }, 1200);
    return;
  }
  if (stock === 0) {
    window.toast.error('Sản phẩm đã hết hàng trong kho.');
    return;
  }
  const res = await window.api.post('/cart/items', { product_id: productId, quantity: 1 });
  if (res.success) {
    window.location.href = '/cart.html';
  } else {
    window.toast.error(res.message || 'Có lỗi xảy ra.');
  }
}

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}