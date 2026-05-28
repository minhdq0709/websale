// State variables
let state = {
  category: null,
  search: null,
  maxPrice: 200000,
  sortBy: 'newest',
  page: 1,
  limit: 9
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Doc query parameters tu URL (neu co)
  const urlParams = new URLSearchParams(window.location.search);
  state.category = urlParams.get('category') || null;
  state.search = urlParams.get('search') || null;
  
  // Dong bo vao input search neu co
  const mainSearch = document.getElementById('main-search-input');
  if (mainSearch && state.search) {
    mainSearch.value = state.search;
  }
  const mobileSearch = document.getElementById('mobile-search-input');
  if (mobileSearch && state.search) {
    mobileSearch.value = state.search;
  }

  // 2. Setup event listeners
  setupFilters();

  // 3. Load du lieu ban dau
  loadCategories();
  loadProducts();
});

/**
 * Lay va hien thi danh muc o sidebar
 */
async function loadCategories() {
  const container = document.getElementById('category-filter-container');
  if (!container) return;

  const res = await window.api.get('/products/categories');
  if (!res.success) {
    container.innerHTML = `<p class="text-body-sm text-error">Lỗi tải danh mục</p>`;
    return;
  }

  const categories = res.data;
  
  // Render danh mục thành các radio/checkboxes
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

  // Lắng nghe sự kiện click thay đổi danh mục
  container.querySelectorAll('input[name="category-radio"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.category = e.target.value || null;
      state.page = 1;
      
      // Update bold text styles
      container.querySelectorAll('span').forEach(span => span.classList.remove('text-primary', 'font-bold'));
      e.target.nextElementSibling.classList.add('text-primary', 'font-bold');

      // Update URL without reloading page
      updateURL();
      loadProducts();
    });
  });
}

/**
 * Lay va render danh sach san pham dua tren State hien tai
 */
async function loadProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  // Render skeleton loading
  grid.innerHTML = Array(6).fill(0).map(() => `
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

  // Xóa sạch pagination trong khi load
  const paginContainer = document.getElementById('pagination-container');
  if (paginContainer) paginContainer.innerHTML = '';

  // 1. Xay dung query string
  let query = `/products?page=${state.page}&limit=${state.limit}&sortBy=${state.sortBy}`;
  if (state.category) query += `&category=${state.category}`;
  if (state.search) query += `&search=${encodeURIComponent(state.search)}`;
  if (state.maxPrice) query += `&maxPrice=${state.maxPrice}`;

  // 2. Fetch API
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

  const { products, total, totalPages } = res.data;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-20 text-center text-on-surface-variant flex flex-col items-center gap-4">
        <span class="material-symbols-outlined text-[64px] text-outline">search_off</span>
        <div class="text-headline-sm font-bold text-primary">Không tìm thấy sản phẩm nào!</div>
        <p class="text-body-md max-w-sm">Hãy thử điều chỉnh mức giá tối đa, chọn danh mục khác hoặc thay đổi từ khóa tìm kiếm.</p>
        <button class="bg-primary text-on-primary px-6 py-2 rounded-xl font-bold hover:scale-105 transition-transform" onclick="resetAllFilters()">Đặt lại bộ lọc</button>
      </div>
    `;
    return;
  }

  // 3. Render sản phẩm thực tế
  grid.innerHTML = products.map(product => {
    const isSale = product.sale_price !== null;
    const originalPrice = product.price;
    const displayPrice = isSale ? product.sale_price : product.price;
    
    // Tinh % giam gia
    const discountPercent = isSale ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0;
    const imageUrl = (product.images && product.images.length > 0) 
      ? product.images[0] 
      : 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';

    return `
      <div class="product-card-shadow rounded-xl bg-white overflow-hidden transition-all duration-300 flex flex-col h-full cursor-pointer" onclick="goToDetail(${product.id})">
        <div class="relative h-64 bg-surface-container-low flex items-center justify-center overflow-hidden">
          <img alt="${window.escapeHTML(product.name)}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-110" 
               src="${window.escapeHTML(imageUrl)}"
               onerror="this.src='https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'"
          />
          ${isSale 
            ? `<span class="absolute top-4 left-4 bg-error text-on-error text-label-sm font-bold px-3 py-1.5 rounded-lg shadow-lg">-${discountPercent}% GIẢM</span>`
            : `<span class="absolute top-4 left-4 bg-secondary text-on-secondary text-label-sm font-label-sm px-3 py-1 rounded-full">Tươi ngon</span>`
          }
          ${product.stock === 0 ? `<div class="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-headline-sm z-10">Tạm hết hàng</div>` : ''}
        </div>
        <div class="p-6 flex flex-col flex-grow">
          <p class="text-label-sm font-label-sm text-outline mb-2">${window.escapeHTML(product.category_name || 'Nông sản sạch')}</p>
          <h4 class="font-headline-sm text-headline-sm text-on-surface mb-2 truncate group-hover:text-primary transition-colors">${window.escapeHTML(product.name)}</h4>
          <p class="text-on-surface-variant text-body-sm mb-4 line-clamp-2">${window.escapeHTML(product.description || 'Nguồn gốc an toàn, chuẩn VietGAP, tươi ngon mỗi ngày cho bữa cơm gia đình bạn.')}</p>
          <div class="mt-auto pt-2">
            <div class="flex flex-col mb-4">
              ${isSale 
                ? `<span class="text-outline text-label-sm line-through mb-1">${formatVND(originalPrice)}</span>` 
                : `<span class="h-[18px] mb-1"></span>`
              }
              <span class="${isSale ? 'text-error' : 'text-secondary'} font-headline-md text-headline-md leading-none font-bold">
                ${formatVND(displayPrice)} 
                <small class="text-body-sm text-on-surface-variant font-normal">/${window.escapeHTML(product.unit)}</small>
              </span>
            </div>
            <div class="flex items-center gap-3" onclick="event.stopPropagation();">
              <button class="flex-grow bg-primary text-on-primary h-12 rounded-lg font-bold text-label-md hover:bg-primary-container transition-colors shadow-sm active:scale-95 duration-100 flex items-center justify-center" 
                      onclick="buyNow(${product.id}, ${product.stock})"
                      ${product.stock === 0 ? 'disabled' : ''}>
                Mua ngay
              </button>
              <button class="w-12 h-12 rounded-lg border border-outline-variant text-primary flex items-center justify-center hover:bg-surface-container-low transition-colors active:scale-90 duration-100 shrink-0" 
                      title="Thêm vào giỏ hàng" 
                      onclick="addToCart(${product.id}, ${product.stock})"
                      ${product.stock === 0 ? 'disabled' : ''}>
                <span class="material-symbols-outlined">add_shopping_cart</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 4. Render pagination
  renderPagination(totalPages);
}

function goToDetail(productId) {
  window.location.href = `/product-detail.html?id=${productId}`;
}

/**
 * Render thanh dieu huong phan trang dong
 */
function renderPagination(totalPages) {
  const paginContainer = document.getElementById('pagination-container');
  if (!paginContainer || totalPages <= 1) return;

  let html = '';

  // Nut Prev
  html += `
    <button class="w-10 h-10 rounded-lg border border-outline-variant flex items-center justify-center text-primary hover:bg-surface-container transition-all"
            ${state.page === 1 ? 'disabled' : ''} onclick="changePage(${state.page - 1})">
      <span class="material-symbols-outlined">chevron_left</span>
    </button>
  `;

  // Cac so trang
  for (let i = 1; i <= totalPages; i++) {
    if (i === state.page) {
      html += `
        <button class="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center font-label-md shadow-sm">${i}</button>
      `;
    } else {
      html += `
        <button class="w-10 h-10 rounded-lg border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-all font-label-md" 
                onclick="changePage(${i})">${i}</button>
      `;
    }
  }

  // Nut Next
  html += `
    <button class="w-10 h-10 rounded-lg border border-outline-variant flex items-center justify-center text-primary hover:bg-surface-container transition-all"
            ${state.page === totalPages ? 'disabled' : ''} onclick="changePage(${state.page + 1})">
      <span class="material-symbols-outlined">chevron_right</span>
    </button>
  `;

  paginContainer.innerHTML = html;
}

window.changePage = function(newPage) {
  state.page = newPage;
  loadProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * Cau hinh cac event filter o sidebar va header
 */
function setupFilters() {
  // --- Sort select dropdown ---
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.value = state.sortBy;
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      state.page = 1;
      loadProducts();
    });
  }

  // --- Price Range Slider ---
  const priceSlider = document.getElementById('price-range-slider');
  const sliderVal = document.getElementById('price-slider-value');
  if (priceSlider && sliderVal) {
    priceSlider.addEventListener('input', (e) => {
      state.maxPrice = parseInt(e.target.value);
      sliderVal.innerText = formatVND(state.maxPrice);
    });

    // Chi goi API khi tha chuot ra (tranh goi lien tuc)
    priceSlider.addEventListener('change', () => {
      state.page = 1;
      loadProducts();
    });
  }

  // --- Quick Filter Buttons ---
  const quickBtns = document.querySelectorAll('.quick-filter-btn');
  quickBtns.forEach(btn => {
    const slug = btn.getAttribute('data-slug');
    if (state.category === slug) {
      btn.className = 'quick-filter-btn px-4 py-2 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-label-sm border border-secondary transition-all';
    }

    btn.addEventListener('click', () => {
      // Toggle category
      if (state.category === slug) {
        state.category = null;
        btn.className = 'quick-filter-btn px-4 py-2 rounded-full bg-surface-container-low text-on-surface-variant text-label-sm font-label-sm border border-outline-variant hover:border-primary hover:text-primary transition-all';
      } else {
        state.category = slug;
        // Reset all other quick buttons
        quickBtns.forEach(b => {
          b.className = 'quick-filter-btn px-4 py-2 rounded-full bg-surface-container-low text-on-surface-variant text-label-sm font-label-sm border border-outline-variant hover:border-primary hover:text-primary transition-all';
        });
        btn.className = 'quick-filter-btn px-4 py-2 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-label-sm border border-secondary transition-all';
      }
      
      // Update check box/radio o category list
      const radio = document.querySelector(`input[name="category-radio"][value="${state.category || ''}"]`);
      if (radio) radio.checked = true;

      state.page = 1;
      updateURL();
      loadProducts();
    });
  });

  // --- Search inputs ---
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

  // --- Origin Filter Buttons ---
  const originBtns = document.querySelectorAll('.origin-filter-btn');
  originBtns.forEach(btn => {
    const origin = btn.getAttribute('data-origin');
    
    // Set initial active state if state.search matches origin
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
        // Reset all other origin buttons
        originBtns.forEach(b => {
          b.className = 'origin-filter-btn px-4 py-2 rounded-full bg-surface-container-low text-on-surface-variant text-label-sm font-label-sm border border-outline-variant hover:border-primary hover:text-primary transition-all';
        });
        btn.className = 'origin-filter-btn px-4 py-2 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-label-sm border border-secondary transition-all';
        
        // Sync search input
        if (mainSearch) mainSearch.value = origin;
        if (mobileSearch) mobileSearch.value = origin;
      }
      
      state.page = 1;
      updateURL();
      loadProducts();
    });
  });
}

/**
 * Reset tat ca bo loc va tai lai toan bo san pham
 */
window.resetAllFilters = function() {
  state = {
    category: null,
    search: null,
    maxPrice: 200000,
    sortBy: 'newest',
    page: 1,
    limit: 9
  };

  // Reset UI components
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

  // Reset category radio check to index 0
  const radio = document.querySelector('input[name="category-radio"][value=""]');
  if (radio) radio.checked = true;

  updateURL();
  loadProducts();
};

/**
 * Cap nhat query parameters tren trinh duyet khong can load lai trang
 */
function updateURL() {
  const url = new URL(window.location);
  if (state.category) {
    url.searchParams.set('category', state.category);
  } else {
    url.searchParams.delete('category');
  }

  if (state.search) {
    url.searchParams.set('search', state.search);
  } else {
    url.searchParams.delete('search');
  }

  window.history.pushState({}, '', url);
}

/**
 * Add To Cart
 */
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

/**
 * Buy Now
 */
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
