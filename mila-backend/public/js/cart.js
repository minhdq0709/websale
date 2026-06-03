document.addEventListener('DOMContentLoaded', () => {
  // Guard route
  if (!window.auth.checkAuthOrRedirect()) return;

  loadCart();

  // Bind checkout button
  const checkoutBtn = document.getElementById('btn-checkout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      window.location.href = '/checkout.html';
    });
  }

  // Bind clear all button
  const clearAllBtn = document.getElementById('btn-clear-all');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async () => {
      if (!confirm('Bạn có chắc muốn xóa toàn bộ giỏ hàng?')) return;
      const res = await window.api.delete('/cart');
      if (res.success) {
        window.toast?.success('Giỏ hàng đã được xóa.');
        loadCart();
        window.auth.updateNavigationUI?.();
      } else {
        window.toast?.error(res.message || 'Không thể xóa giỏ hàng.');
      }
    });
  }

  // Event delegation for dynamic cart items
  const itemsList = document.getElementById('cart-items-list');
  if (itemsList) {
    itemsList.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const cartItemId = parseInt(btn.getAttribute('data-cart-id'));
      const currentQty = parseInt(btn.getAttribute('data-current-qty'));
      const maxStock = parseInt(btn.getAttribute('data-max-stock'));
      const productId = btn.getAttribute('data-product-id');

      if (action === 'decrease') {
        const newQty = currentQty - 1;
        if (newQty <= 0) {
          if (confirm('Bạn có muốn xóa sản phẩm này khỏi giỏ hàng?')) {
            await removeCartItem(cartItemId);
          }
        } else {
          await updateQuantity(cartItemId, newQty, maxStock);
        }
      } else if (action === 'increase') {
        const newQty = currentQty + 1;
        if (newQty > maxStock) {
          window.toast.error(`Rất tiếc, kho chỉ còn tối đa ${maxStock} sản phẩm này.`);
        } else {
          await updateQuantity(cartItemId, newQty, maxStock);
        }
      } else if (action === 'remove') {
        if (confirm('Xóa sản phẩm này khỏi giỏ hàng?')) {
          await removeCartItem(cartItemId);
        }
      } else if (action === 'view-product') {
        window.location.href = `/product-detail.html?id=${productId}`;
      }
    });
  }
});

async function loadCart() {
  const activeContainer = document.getElementById('cart-active-container');
  const emptyState = document.getElementById('cart-empty-state');
  const itemsList = document.getElementById('cart-items-list');

  if (!itemsList) return;

  // Show skeleton
  itemsList.innerHTML = `
    <div class="flex flex-col gap-4">
      ${Array(3).fill(0).map(() => `
        <div class="bg-white rounded-xl product-shadow p-6 border border-surface-container-high flex gap-6 animate-pulse">
          <div class="w-24 h-24 bg-surface-container-highest rounded-lg"></div>
          <div class="flex-grow space-y-3">
            <div class="h-6 bg-surface-container-highest rounded w-1/3"></div>
            <div class="h-4 bg-surface-container-highest rounded w-1/4"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  const res = await window.api.get('/cart');
  if (!res.success) {
    window.toast?.error(res.message || 'Không thể tải giỏ hàng.');
    itemsList.innerHTML = `<p class="text-error font-bold py-6 text-center">Lỗi hệ thống khi tải giỏ hàng.</p>`;
    document.getElementById('cart-loading-state')?.remove();
    return;
  }

  const { items, totalAmount, totalItems } = res.data;

  if (!items || items.length === 0) {
    document.getElementById('cart-loading-state')?.remove();
    activeContainer.classList.add('hidden');
    emptyState.classList.remove('hidden');
    window.auth.updateNavigationUI?.();
    return;
  }

  document.getElementById('cart-loading-state')?.remove();
  emptyState.classList.add('hidden');
  activeContainer.classList.remove('hidden');

  const countLabel = document.getElementById('cart-item-count');
  if (countLabel) countLabel.textContent = items.length;

  // Render items WITHOUT any inline onclick
  itemsList.innerHTML = items.map(item => {
    const isSale = item.sale_price !== null;
    const unitPrice = isSale ? item.sale_price : item.price;
    const itemSubtotal = unitPrice * item.quantity;

    let images = [];
    if (typeof item.images === 'string') {
      try { images = JSON.parse(item.images); } catch (_) { images = []; }
    } else if (Array.isArray(item.images)) {
      images = item.images;
    }
    const imageUrl = (images && images.length > 0)
      ? images[0]
      : 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80';

    return `
      <div class="bg-white p-6 rounded-xl shadow-organic border border-outline-variant flex flex-col md:flex-row items-center gap-6 group hover:border-primary/20 transition-all" data-cart-item="${item.id}">
        <div class="w-32 h-32 rounded-lg bg-surface-container flex-shrink-0 overflow-hidden cursor-pointer" data-action="view-product" data-product-id="${item.product_id}">
          <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
               src="${window.escapeHTML(imageUrl)}" 
               alt="${window.escapeHTML(item.name)}"
               onerror="this.src='https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'"
          />
        </div>
        <div class="flex-grow flex flex-col md:flex-row justify-between w-full">
          <div class="text-center md:text-left">
            <h3 class="font-headline-md text-headline-md text-on-surface mb-xs cursor-pointer hover:text-primary transition-colors truncate max-w-xs md:max-w-md" data-action="view-product" data-product-id="${item.product_id}">${window.escapeHTML(item.name)}</h3>
            <p class="font-label-md text-label-md text-on-surface-variant">Đơn vị: ${window.escapeHTML(item.unit || 'Kg')} | Giá: ${formatVND(unitPrice)}</p>
            <p class="font-body-md text-body-md font-bold text-secondary mt-3">Thành tiền: <span class="text-primary">${formatVND(itemSubtotal)}</span></p>
          </div>
          <div class="flex flex-col items-center md:items-end justify-between mt-4 md:mt-0">
            <div class="flex items-center gap-4 border border-outline-variant rounded-full px-4 py-1.5 bg-surface-container-lowest shrink-0 h-10">
              <button class="w-8 h-8 flex items-center justify-center hover:bg-surface-container rounded-full transition-colors" data-action="decrease" data-cart-id="${item.id}" data-current-qty="${item.quantity}" data-max-stock="${item.stock}">
                <span class="material-symbols-outlined text-on-surface-variant text-[18px]">remove</span>
              </button>
              <span class="font-label-md text-label-md w-6 text-center text-on-surface font-semibold">${item.quantity}</span>
              <button class="w-8 h-8 flex items-center justify-center hover:bg-surface-container rounded-full transition-colors" data-action="increase" data-cart-id="${item.id}" data-current-qty="${item.quantity}" data-max-stock="${item.stock}">
                <span class="material-symbols-outlined text-on-surface-variant text-[18px]">add</span>
              </button>
            </div>
            <p class="text-[10px] text-on-surface-variant mt-1">Tồn kho: ${item.stock}</p>
            <button class="mt-4 p-2 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-full transition-all" title="Xóa sản phẩm" data-action="remove" data-cart-id="${item.id}">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  calculateSummary(totalAmount, totalItems);
}

async function updateQuantity(cartItemId, newQuantity, maxStock) {
  const res = await window.api.put(`/cart/items/${cartItemId}`, { quantity: newQuantity });
  if (res.success) {
    loadCart();
    window.auth.updateNavigationUI();
  } else {
    window.toast.error(res.message || 'Cập nhật số lượng thất bại.');
  }
}

async function removeCartItem(cartItemId) {
  const res = await window.api.delete(`/cart/items/${cartItemId}`);
  if (res.success) {
    window.toast.success('Đã xóa sản phẩm khỏi giỏ hàng.');
    loadCart();
    window.auth.updateNavigationUI();
  } else {
    window.toast.error(res.message || 'Xóa sản phẩm thất bại.');
  }
}

function calculateSummary(subtotal, itemsCount) {
  const FREE_SHIP_THRESHOLD = 300000;
  const SHIPPING_FEE = 15000;

  const shippingFee = subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shippingFee;

  const elCount = document.getElementById('summary-items-count');
  const elSubtotal = document.getElementById('summary-subtotal');
  const elShipping = document.getElementById('summary-shipping');
  const elTotal = document.getElementById('summary-total');

  if (elCount) elCount.innerText = itemsCount;
  if (elSubtotal) elSubtotal.innerText = formatVND(subtotal);
  if (elShipping) elShipping.innerText = shippingFee === 0 ? 'Miễn phí 🎉' : formatVND(shippingFee);
  if (elTotal) elTotal.innerText = formatVND(total);

  const progressBar = document.getElementById('shipping-progress-bar');
  const progressLabel = document.getElementById('shipping-progress-label');
  const progressWrapper = document.getElementById('shipping-progress-wrapper');

  if (progressBar && progressLabel && progressWrapper) {
    const pct = Math.min((subtotal / FREE_SHIP_THRESHOLD) * 100, 100);
    progressBar.style.width = pct + '%';

    if (subtotal >= FREE_SHIP_THRESHOLD) {
      progressWrapper.classList.remove('bg-surface-container-low');
      progressWrapper.classList.add('bg-secondary-container');
      progressLabel.innerHTML = `<span class="font-semibold text-on-secondary-container">🎉 Chúc mừng! Bạn được <strong>miễn phí vận chuyển</strong>!</span>`;
    } else {
      const remaining = FREE_SHIP_THRESHOLD - subtotal;
      progressWrapper.classList.remove('bg-secondary-container');
      progressWrapper.classList.add('bg-surface-container-low');
      progressLabel.innerHTML = `Mua thêm <strong id="shipping-remaining" class="text-primary">${formatVND(remaining)}</strong> để được miễn phí ship`;
    }
  }
}

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}