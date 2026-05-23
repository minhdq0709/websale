document.addEventListener('DOMContentLoaded', () => {
  // 1. Extract product ID from URL query ?id=X
  const urlParams = new URLSearchParams(window.location.search);
  const productId = parseInt(urlParams.get('id'));

  if (!productId || isNaN(productId)) {
    window.toast.error('Sản phẩm không hợp lệ.');
    setTimeout(() => {
      window.location.href = '/products.html';
    }, 1500);
    return;
  }

  // 2. Fetch and render product
  let currentProductStock = 0;
  loadProductDetails(productId);
  setupTabListeners();
});

/**
 * Load Product Detail information
 */
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
  if (breadcrumbProd) {
    breadcrumbProd.innerText = product.name;
  }

  // Set images
  const mainImage = document.getElementById('main-product-image');
  const thumbsContainer = document.getElementById('image-thumbnails');
  const images = (product.images && product.images.length > 0) 
    ? product.images 
    : ['https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'];

  if (mainImage) {
    mainImage.src = images[0];
    mainImage.alt = product.name;
  }

  // Badge
  const badgeEl = document.getElementById('product-badge');
  if (badgeEl) {
    if (product.sale_price !== null) {
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

  // Thumbnails render
  if (thumbsContainer) {
    thumbsContainer.innerHTML = images.map((img, idx) => `
      <div class="rounded-lg overflow-hidden border-2 ${idx === 0 ? 'border-primary' : 'border-transparent'} aspect-square cursor-pointer bg-surface-container-low transition-all thumb-item" onclick="changeMainImage('${img}', this)">
        <img class="w-full h-full object-cover" src="${img}" alt="${product.name} Thumbnail ${idx + 1}" onerror="this.src='https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'"/>
      </div>
    `).join('');
  }

  // Title, stars, description
  document.getElementById('product-name').innerText = product.name;
  document.getElementById('product-description').innerText = product.description || 'Nguồn thực phẩm tươi sạch hữu cơ đạt chuẩn VietGAP, được phân phối trực tiếp từ nhà vườn Đà Lạt.';
  
  // Set prices
  const priceContainer = document.getElementById('product-price-container');
  if (priceContainer) {
    const isSale = product.sale_price !== null;
    const priceStr = formatVND(isSale ? product.sale_price : product.price);
    const originalStr = formatVND(product.price);
    const unitText = product.unit || 'Kg';

    if (isSale) {
      const discount = Math.round(((product.price - product.sale_price) / product.price) * 100);
      priceContainer.innerHTML = `
        <div class="text-headline-md font-headline-md text-secondary font-bold">${priceStr}</div>
        <div class="text-body-md font-body-md text-outline line-through">${originalStr}</div>
        <span class="bg-error-container text-on-error-container px-2 py-0.5 rounded-full text-label-sm font-label-sm font-bold">-${discount}%</span>
        <span class="text-on-surface-variant text-label-md">/${unitText}</span>
      `;
    } else {
      priceContainer.innerHTML = `
        <div class="text-headline-md font-headline-md text-secondary font-bold">${priceStr}</div>
        <span class="text-on-surface-variant text-label-md">/${unitText}</span>
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

  // Quantity controllers setup
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

  if (btnMinus) {
    btnMinus.onclick = () => {
      if (product.stock === 0) return;
      let val = parseInt(qtyInput.value);
      if (val > 1) {
        qtyInput.value = val - 1;
      }
    };
  }

  if (btnPlus) {
    btnPlus.onclick = () => {
      if (product.stock === 0) return;
      let val = parseInt(qtyInput.value);
      if (val < product.stock) {
        qtyInput.value = val + 1;
      } else {
        window.toast.info(`Kho chỉ còn tối đa ${product.stock} sản phẩm.`);
      }
    };
  }

  // Add to cart & Buy now actions
  const btnAdd = document.getElementById('btn-add-to-cart');
  const btnBuy = document.getElementById('btn-buy-now');

  if (product.stock === 0) {
    if (btnAdd) {
      btnAdd.disabled = true;
      btnAdd.innerText = 'Hết hàng';
      btnAdd.className = 'flex-grow border-2 border-outline-variant text-outline-variant h-[56px] rounded-full font-label-md text-label-md uppercase tracking-wide cursor-not-allowed flex items-center justify-center';
    }
    if (btnBuy) {
      btnBuy.disabled = true;
      btnBuy.innerText = 'Hết hàng';
      btnBuy.className = 'flex-grow bg-surface-container-high text-outline-variant h-[56px] rounded-full font-label-md text-label-md uppercase tracking-wide cursor-not-allowed flex items-center justify-center';
    }
  } else {
    if (btnAdd) {
      btnAdd.onclick = () => handleAddToCart(product.id, parseInt(qtyInput.value), false);
    }
    if (btnBuy) {
      btnBuy.onclick = () => handleAddToCart(product.id, parseInt(qtyInput.value), true);
    }
  }

  // Detailed Description render in tab
  const detailedDesc = document.getElementById('detailed-description');
  if (detailedDesc) {
    detailedDesc.innerText = product.description || 'Sản phẩm được nuôi trồng và thu hoạch theo phương pháp khép kín nghiêm ngặt, đảm bảo sạch từ nông trại đến bàn ăn.';
  }

  // Load related products
  loadRelatedProducts(product.category_slug, product.id);
}

/**
 * Handle Switching Main Image
 */
window.changeMainImage = function(imgSrc, element) {
  const mainImage = document.getElementById('main-product-image');
  if (mainImage) mainImage.src = imgSrc;

  // Active border styling
  document.querySelectorAll('.thumb-item').forEach(el => {
    el.classList.remove('border-primary');
    el.classList.add('border-transparent');
  });
  element.classList.remove('border-transparent');
  element.classList.add('border-primary');
};

/**
 * Add To Cart logic
 */
async function handleAddToCart(productId, quantity, isBuyNow) {
  if (!window.auth.isLoggedIn()) {
    window.toast.info('Vui lòng đăng nhập để thực hiện tính năng này.');
    setTimeout(() => {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }, 1200);
    return;
  }

  if (quantity <= 0) {
    window.toast.error('Số lượng sản phẩm không hợp lệ.');
    return;
  }

  const res = await window.api.post('/cart/items', { product_id: productId, quantity: quantity });
  if (res.success) {
    if (isBuyNow) {
      window.location.href = '/cart.html';
    } else {
      window.toast.success('Đã thêm sản phẩm vào giỏ hàng thành công!');
      window.auth.updateNavigationUI(); // update quantity header badge
    }
  } else {
    window.toast.error(res.message || 'Thêm vào giỏ hàng thất bại.');
  }
}

/**
 * Dynamic setup description, nutrient, review tab clicks
 */
function setupTabListeners() {
  const tabs = document.querySelectorAll('.tab-btn');
  const detailedText = document.getElementById('detailed-description');

  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => {
        t.classList.remove('text-primary', 'border-b-2', 'border-primary');
        t.classList.add('text-on-surface-variant');
      });
      tab.classList.remove('text-on-surface-variant');
      tab.classList.add('text-primary', 'border-b-2', 'border-primary');

      const mode = tab.getAttribute('data-tab');
      if (mode === 'desc') {
        detailedText.innerHTML = `<p>Sản phẩm đạt chứng chỉ nông sản an toàn VietGAP. Quy trình kiểm định chất lượng nghiêm ngặt và đóng gói tỉ mỉ, giúp giữ trọn vẹn chất lượng từ vườn rau sạch cho bữa cơm gia đình bạn.</p>`;
      } else if (mode === 'nutri') {
        detailedText.innerHTML = `
          <div class="space-y-3">
            <h4 class="font-bold text-primary">Thành phần dinh dưỡng ước tính trên 100g:</h4>
            <table class="w-full border-collapse text-body-sm">
              <tr class="border-b border-outline-variant"><td class="py-2">Năng lượng</td><td class="py-2 font-bold">18-22 kcal</td></tr>
              <tr class="border-b border-outline-variant"><td class="py-2">Chất xơ tự nhiên</td><td class="py-2 font-bold">2.5g</td></tr>
              <tr class="border-b border-outline-variant"><td class="py-2">Vitamin C & A</td><td class="py-2 font-bold">Đầy đủ khoáng chất thiết yếu</td></tr>
              <tr class="border-b border-outline-variant"><td class="py-2">Chất chống oxy hoá Lycopene</td><td class="py-2 font-bold">Dồi dào sức khoẻ</td></tr>
            </table>
          </div>
        `;
      } else if (mode === 'reviews') {
        detailedText.innerHTML = `
          <div class="space-y-4">
            <div class="border-b border-outline-variant pb-3">
              <div class="flex justify-between items-center mb-1">
                <span class="font-bold text-body-sm text-on-surface">Minh Khang</span>
                <span class="text-label-sm text-outline">Đã mua hàng</span>
              </div>
              <div class="flex text-secondary mb-1">
                <span class="material-symbols-outlined text-[16px] fill" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[16px] fill" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[16px] fill" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[16px] fill" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[16px] fill" style="font-variation-settings: 'FILL' 1;">star</span>
              </div>
              <p class="text-body-sm text-on-surface-variant italic">"Rau củ tươi xanh, sạch sẽ, gia đình tôi rất an tâm sử dụng hàng ngày."</p>
            </div>
            <div>
              <div class="flex justify-between items-center mb-1">
                <span class="font-bold text-body-sm text-on-surface">Thu Hương</span>
                <span class="text-label-sm text-outline">Đã mua hàng</span>
              </div>
              <div class="flex text-secondary mb-1">
                <span class="material-symbols-outlined text-[16px] fill" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[16px] fill" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[16px] fill" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[16px] fill" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[16px] fill" style="font-variation-settings: 'FILL' 1;">star</span>
              </div>
              <p class="text-body-sm text-on-surface-variant italic">"Giao hàng nhanh, rau củ vẫn giữ được độ ẩm tươi. Rất đáng tiền."</p>
            </div>
          </div>
        `;
      }
    };
  });
}

/**
 * Load related products from the same category
 */
async function loadRelatedProducts(categorySlug, currentProductId) {
  const grid = document.getElementById('related-products-grid');
  if (!grid) return;

  const res = await window.api.get(`/products?category=${categorySlug || ''}&limit=4`);
  if (!res.success) {
    grid.innerHTML = '<p class="text-body-sm text-outline col-span-full">Không tải được sản phẩm liên quan.</p>';
    return;
  }

  // Filter out the current product itself
  const products = res.data.products.filter(p => p.id !== currentProductId).slice(0, 4);

  if (products.length === 0) {
    grid.innerHTML = '<p class="text-body-sm text-outline col-span-full">Không tìm thấy sản phẩm tương tự.</p>';
    return;
  }

  grid.innerHTML = products.map(p => {
    const isSale = p.sale_price !== null;
    const priceStr = formatVND(isSale ? p.sale_price : p.price);
    const imageUrl = (p.images && p.images.length > 0) 
      ? p.images[0] 
      : 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';

    return `
      <div class="group cursor-pointer" onclick="window.location.href='/product-detail.html?id=${p.id}'">
        <div class="rounded-xl overflow-hidden bg-white product-shadow mb-4 aspect-[4/5] relative">
          <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
               src="${imageUrl}" 
               alt="${p.name}"
               onerror="this.src='https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'"
          />
          ${isSale ? `<span class="absolute top-2 left-2 bg-error text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">GIẢM</span>` : ''}
        </div>
        <h3 class="font-label-md text-label-md text-on-surface mb-1 group-hover:text-primary transition-colors truncate">${p.name}</h3>
        <p class="font-body-sm text-body-sm text-secondary font-bold">${priceStr} <small class="text-outline font-normal">/${p.unit}</small></p>
      </div>
    `;
  }).join('');
}

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}
