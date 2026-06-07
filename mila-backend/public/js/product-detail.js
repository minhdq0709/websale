document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = parseInt(urlParams.get('id'));
  if (!productId || isNaN(productId)) {
    window.toast.error('Sản phẩm không hợp lệ.');
    setTimeout(() => window.location.href = '/products.html', 1500);
    return;
  }
  loadProductDetails(productId);
  setupTabListeners();
});

function handleImageError(img) {
  if (!img.src.includes('unsplash.com')) {
    img.src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
  }
}

function attachImageErrorHandler(container) {
  if (!container) return;
  container.querySelectorAll('img').forEach(img => {
    img.removeEventListener('error', () => handleImageError(img));
    img.addEventListener('error', () => handleImageError(img));
  });
}

async function loadProductDetails(productId) {
  const res = await window.api.get(`/products/${productId}`);
  if (!res.success) {
    window.toast.error(res.message || 'Không thể tải chi tiết sản phẩm.');
    document.getElementById('product-name').innerText = 'Không tìm thấy sản phẩm';
    document.getElementById('product-description').innerText = 'Sản phẩm có thể đã bị xóa hoặc ngừng kinh doanh.';
    return;
  }
  const product = res.data;
  currentProductStock = product.stock;

  // Breadcrumb
  const breadcrumbCat = document.getElementById('breadcrumb-category');
  if (breadcrumbCat && product.category_name) {
    breadcrumbCat.innerText = product.category_name;
    breadcrumbCat.href = `/products.html?category=${product.category_slug}`;
  }
  const breadcrumbProd = document.getElementById('breadcrumb-product');
  if (breadcrumbProd) breadcrumbProd.innerText = product.name;

  // Images
  const mainImage = document.getElementById('main-product-image');
  const thumbsContainer = document.getElementById('image-thumbnails');
  const images = (product.images?.length) ? product.images : ['https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'];
  if (mainImage) {
    mainImage.src = images[0];
    mainImage.alt = product.name;
    mainImage.addEventListener('error', () => handleImageError(mainImage));
  }

  // Badge
  const badgeEl = document.getElementById('product-badge');
  if (badgeEl) {
    if (product.sale_price) {
      const discount = Math.round(((product.price - product.sale_price) / product.price) * 100);
      badgeEl.innerText = `GIẢM ${discount}%`;
      badgeEl.className = 'absolute top-4 left-4 bg-error text-on-error px-3 py-1 rounded-full text-label-sm font-bold shadow-sm';
    } else if (product.stock === 0) {
      badgeEl.innerText = 'Hết hàng';
      badgeEl.className = 'absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-label-sm font-bold shadow-sm';
    } else {
      badgeEl.innerText = 'Tươi mới';
      badgeEl.className = 'absolute top-4 left-4 bg-secondary text-on-secondary px-3 py-1 rounded-full text-label-sm font-label-sm shadow-sm';
    }
  }

  // Thumbnails (no inline onclick)
  if (thumbsContainer) {
    thumbsContainer.innerHTML = images.map((img, idx) => `
      <div class="rounded-lg overflow-hidden border-2 ${idx === 0 ? 'border-primary' : 'border-transparent'} aspect-square cursor-pointer bg-surface-container-low transition-all thumb-item" data-img-src="${img}">
        <img class="w-full h-full object-cover" src="${img}" alt="${product.name} Thumbnail ${idx + 1}" />
      </div>
    `).join('');
    attachImageErrorHandler(thumbsContainer);
    const thumbItems = document.querySelectorAll('.thumb-item');
    thumbItems.forEach(thumb => {
      thumb.addEventListener('click', () => {
        const src = thumb.dataset.imgSrc;
        if (src && mainImage) mainImage.src = src;
        thumbItems.forEach(t => {
          t.classList.remove('border-primary');
          t.classList.add('border-transparent');
        });
        thumb.classList.remove('border-transparent');
        thumb.classList.add('border-primary');
      });
    });
  }

  document.getElementById('product-name').innerText = product.name;
  document.getElementById('product-description').innerText = product.description || 'Nguồn thực phẩm tươi sạch hữu cơ đạt chuẩn VietGAP...';

  // Price
  const priceContainer = document.getElementById('product-price-container');
  if (priceContainer) {
    const isSale = product.sale_price !== null;
    const priceStr = formatVND(isSale ? product.sale_price : product.price);
    const originalStr = formatVND(product.price);
    const unit = product.unit || 'Kg';
    if (isSale) {
      const discount = Math.round(((product.price - product.sale_price) / product.price) * 100);
      priceContainer.innerHTML = `
        <div class="text-headline-md font-headline-md text-secondary font-bold">${priceStr}</div>
        <div class="text-body-md font-body-md text-outline line-through">${originalStr}</div>
        <span class="bg-error-container text-on-error-container px-2 py-0.5 rounded-full text-label-sm font-label-sm font-bold">-${discount}%</span>
        <span class="text-on-surface-variant text-label-md">/${unit}</span>
      `;
    } else {
      priceContainer.innerHTML = `
        <div class="text-headline-md font-headline-md text-secondary font-bold">${priceStr}</div>
        <span class="text-on-surface-variant text-label-md">/${unit}</span>
      `;
    }
  }

  // Stock status
  const stockEl = document.getElementById('product-stock-status');
  if (stockEl) {
    if (product.stock === 0) {
      stockEl.innerText = 'Tạm hết hàng trong kho';
      stockEl.className = 'font-body-sm text-body-sm text-error font-bold';
    } else if (product.stock <= 5) {
      stockEl.innerText = `Chỉ còn ${product.stock} ${product.unit || 'Kg'} trong kho`;
      stockEl.className = 'font-body-sm text-body-sm text-tertiary font-bold';
    } else {
      stockEl.innerText = `Còn hàng (còn ${product.stock} ${product.unit || 'Kg'})`;
      stockEl.className = 'font-body-sm text-body-sm text-secondary font-bold';
    }
  }

  // Quantity
  const qtyInput = document.getElementById('quantity');
  const btnMinus = document.getElementById('btn-qty-minus');
  const btnPlus = document.getElementById('btn-qty-plus');
  if (qtyInput) {
    qtyInput.max = product.stock;
    if (product.stock === 0) {
      qtyInput.value = 0;
      qtyInput.disabled = true;
    }
  }
  if (btnMinus) btnMinus.onclick = () => { if (product.stock > 0 && qtyInput.value > 1) qtyInput.value--; };
  if (btnPlus) btnPlus.onclick = () => { if (product.stock > 0 && qtyInput.value < product.stock) qtyInput.value++; else window.toast.info(`Kho chỉ còn tối đa ${product.stock} sản phẩm.`); };

  // Add to cart & buy now
  const btnAdd = document.getElementById('btn-add-to-cart');
  const btnBuy = document.getElementById('btn-buy-now');
  if (product.stock === 0) {
    if (btnAdd) { btnAdd.disabled = true; btnAdd.innerText = 'Hết hàng'; btnAdd.className = '...'; }
    if (btnBuy) { btnBuy.disabled = true; btnBuy.innerText = 'Hết hàng'; btnBuy.className = '...'; }
  } else {
    if (btnAdd) btnAdd.onclick = () => handleAddToCart(product.id, parseInt(qtyInput.value), false);
    if (btnBuy) btnBuy.onclick = () => handleAddToCart(product.id, parseInt(qtyInput.value), true);
  }

  const detailedDesc = document.getElementById('detailed-description');
  if (detailedDesc) detailedDesc.innerText = product.description || 'Sản phẩm được nuôi trồng và thu hoạch theo phương pháp khép kín...';

  loadRelatedProducts(product.category_slug, product.id);
}

async function handleAddToCart(productId, quantity, isBuyNow) {
  if (!window.auth.isLoggedIn()) {
    window.toast.info('Vui lòng đăng nhập để thực hiện tính năng này.');
    setTimeout(() => window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`, 1200);
    return;
  }
  if (quantity <= 0) { window.toast.error('Số lượng không hợp lệ.'); return; }
  const res = await window.api.post('/cart/items', { product_id: productId, quantity });
  if (res.success) {
    if (isBuyNow) window.location.href = '/cart.html';
    else { window.toast.success('Đã thêm vào giỏ hàng!'); window.auth.updateNavigationUI(); }
  } else window.toast.error(res.message || 'Thêm vào giỏ thất bại.');
}

function setupTabListeners() {
  const tabs = document.querySelectorAll('.tab-btn');
  const detailedText = document.getElementById('detailed-description');
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => { t.classList.remove('text-primary', 'border-b-2', 'border-primary'); t.classList.add('text-on-surface-variant'); });
      tab.classList.remove('text-on-surface-variant');
      tab.classList.add('text-primary', 'border-b-2', 'border-primary');
      const mode = tab.getAttribute('data-tab');
      if (mode === 'desc') detailedText.innerHTML = '<p>Sản phẩm đạt chứng chỉ nông sản an toàn VietGAP...</p>';
      else if (mode === 'nutri') detailedText.innerHTML = `<div class="space-y-3"><h4 class="font-bold text-primary">Thành phần dinh dưỡng ước tính trên 100g:</h4><table class="w-full border-collapse text-body-sm">...</table></div>`;
      else if (mode === 'reviews') detailedText.innerHTML = `<div class="space-y-4">...</div>`;
    };
  });
}

async function loadRelatedProducts(categorySlug, currentProductId) {
  const grid = document.getElementById('related-products-grid');
  if (!grid) return;
  const res = await window.api.get(`/products?category=${categorySlug || ''}&limit=4`);
  if (!res.success) { grid.innerHTML = '<p class="text-body-sm text-outline col-span-full">Không tải được sản phẩm liên quan.</p>'; return; }
  let products = res.data.products.filter(p => p.id !== currentProductId).slice(0, 4);
  if (products.length === 0) { grid.innerHTML = '<p class="text-body-sm text-outline col-span-full">Không tìm thấy sản phẩm tương tự.</p>'; return; }
  grid.innerHTML = products.map(p => {
    const isSale = p.sale_price !== null;
    const priceStr = formatVND(isSale ? p.sale_price : p.price);
    const imgUrl = (p.images?.length) ? p.images[0] : 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';
    return `<div class="group cursor-pointer related-product-card" data-product-id="${p.id}">
      <div class="rounded-xl overflow-hidden bg-white product-shadow mb-4 aspect-[4/5] relative">
        <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${imgUrl}" alt="${p.name}" />
        ${isSale ? '<span class="absolute top-2 left-2 bg-error text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">GIẢM</span>' : ''}
      </div>
      <h3 class="font-label-md text-label-md text-on-surface mb-1 group-hover:text-primary transition-colors truncate">${p.name}</h3>
      <p class="font-body-sm text-body-sm text-secondary font-bold">${priceStr} <small class="text-outline font-normal">/${p.unit}</small></p>
    </div>`;
  }).join('');
  attachImageErrorHandler(grid);
  grid.querySelectorAll('.related-product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      const id = card.dataset.productId;
      if (id) window.location.href = `/product-detail.html?id=${id}`;
    });
  });
}

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}