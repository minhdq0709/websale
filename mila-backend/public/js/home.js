document.addEventListener('DOMContentLoaded', () => {
  loadFeaturedProducts();
  setupNewsletterForm();
});

/**
 * Tai danh sach san pham noi bat len trang chu
 */
async function loadFeaturedProducts() {
  const container = document.querySelector('section.bg-surface-container-low grid');
  // fallback selector neu khong thay grid truc tiep
  const gridContainer = container || document.querySelector('section.bg-surface-container-low div.grid-cols-1');

  if (!gridContainer) return;

  // Render skeleton loading de tao cam giac muot ma sang trong
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

  const res = await window.api.get('/products/featured?limit=8');
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

  // Render cac product cards thuc te tu database
  gridContainer.innerHTML = products.map(product => {
    const isSale = product.sale_price !== null;
    const originalPrice = product.price;
    const displayPrice = isSale ? product.sale_price : product.price;
    
    // Tinh % giam gia
    const discountPercent = isSale ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0;
    
    // Dung anh placeholder thich hop neu khong co anh
    const imageUrl = (product.images && product.images.length > 0) 
      ? product.images[0] 
      : 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';

    return `
      <div class="bg-white rounded-xl product-card-shadow group flex flex-col h-full transition-all hover:-translate-y-2 overflow-hidden cursor-pointer" onclick="goToDetail(${product.id})">
        <div class="relative h-64 overflow-hidden bg-surface-container-low">
          <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
               src="${imageUrl}" 
               alt="${product.name}"
               onerror="this.src='https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'"
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
          <h3 class="text-body-md font-bold text-on-surface mb-2 line-clamp-1 group-hover:text-primary transition-colors">${product.name}</h3>
          <p class="text-on-surface-variant text-body-sm mb-4 line-clamp-2">${product.description || 'Sản phẩm tươi sạch chất lượng cao, cung cấp nhiều dinh dưỡng hữu ích.'}</p>
          <div class="mt-auto pt-2">
            <div class="flex flex-col mb-4">
              ${isSale 
                ? `<span class="text-outline text-label-sm line-through mb-1">${formatVND(originalPrice)}</span>` 
                : `<span class="h-[18px] mb-1"></span>`
              }
              <div class="flex items-center gap-2">
                <span class="${isSale ? 'text-error' : 'text-secondary'} font-bold text-headline-sm">${formatVND(displayPrice)}</span>
                <span class="text-on-surface-variant text-label-sm font-normal">/${product.unit}</span>
              </div>
            </div>
            <div class="flex items-center gap-3" onclick="event.stopPropagation();">
              <button class="flex-grow bg-primary text-on-primary py-3 rounded-lg font-bold text-label-md hover:bg-primary-container transition-colors shadow-sm active:scale-95 duration-100" 
                      onclick="buyNow(${product.id}, ${product.stock})"
                      ${product.stock === 0 ? 'disabled' : ''}>
                Mua ngay
              </button>
              <button class="w-12 h-12 border border-outline-variant text-primary rounded-lg flex items-center justify-center hover:bg-surface-container-low transition-colors active:scale-90 duration-100" 
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
}

function goToDetail(productId) {
  window.location.href = `/product-detail.html?id=${productId}`;
}

/**
 * Them nhanh san pham vao gio
 */
async function addToCart(productId, stock) {
  if (!window.auth.isLoggedIn()) {
    window.toast.info('Vui lòng đăng nhập để thêm vào giỏ hàng.');
    setTimeout(() => {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
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
    window.auth.updateNavigationUI(); // Reload badge
  } else {
    window.toast.error(res.message || 'Thêm vào giỏ hàng thất bại.');
  }
}

/**
 * Mua ngay: Them vao gio hang va chuyen toi trang gio hang
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

/**
 * Form dang ky newsletter
 */
function setupNewsletterForm() {
  const form = document.querySelector('main form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = form.querySelector('input[type="email"]');
    const email = emailInput?.value.trim();

    if (!email) {
      window.toast.error('Vui lòng điền địa chỉ email.');
      return;
    }

    window.toast.success('Đăng ký nhận bản tin sống khỏe thành công! Xin cảm ơn.');
    if (emailInput) emailInput.value = '';
  });
}

/**
 * Format gia tien VND
 */
function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}
