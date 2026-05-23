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
});

/**
 * Load cart items from Backend
 */
async function loadCart() {
  const activeContainer = document.getElementById('cart-active-container');
  const emptyState = document.getElementById('cart-empty-state');
  const itemsList = document.getElementById('cart-items-list');

  if (!itemsList) return;

  // Show skeleton state or spinner
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
    window.toast.error(res.message || 'Không thể tải giỏ hàng.');
    itemsList.innerHTML = `<p class="text-error font-bold py-6 text-center">Lỗi hệ thống khi tải giỏ hàng.</p>`;
    return;
  }

  const { items, totalAmount, totalItems } = res.data;

  // If cart is empty
  if (!items || items.length === 0) {
    activeContainer.classList.add('hidden');
    emptyState.classList.remove('hidden');
    // Update global session header navigation badge to 0
    window.auth.updateNavigationUI();
    return;
  }

  // If cart has items
  emptyState.classList.add('hidden');
  activeContainer.classList.remove('hidden');

  // Render items list
  itemsList.innerHTML = items.map(item => {
    const isSale = item.sale_price !== null;
    const unitPrice = isSale ? item.sale_price : item.price;
    const itemSubtotal = unitPrice * item.quantity;
    
    // Images fallback
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
      <div class="bg-white rounded-xl product-shadow p-6 border border-surface-container-high flex flex-col sm:flex-row items-center gap-6 group hover:border-primary/20 transition-all">
        <!-- Image -->
        <div class="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container-low cursor-pointer" onclick="window.location.href='/product-detail.html?id=${item.product_id}'">
          <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
               src="${imageUrl}" 
               alt="${item.name}"
               onerror="this.src='https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'"
          />
        </div>

        <!-- Info -->
        <div class="flex-grow text-center sm:text-left">
          <h3 class="font-headline-sm text-headline-sm text-primary cursor-pointer hover:text-secondary truncate max-w-xs" onclick="window.location.href='/product-detail.html?id=${item.product_id}'">${item.name}</h3>
          <p class="text-outline text-body-sm mb-2">Đơn vị: ${item.unit || 'Kg'} | Giá: ${formatVND(unitPrice)}</p>
          <div class="text-body-sm font-bold text-secondary">
            Thành tiền: <span class="text-body-md">${formatVND(itemSubtotal)}</span>
          </div>
        </div>

        <!-- Quantity Toggle & Stock Status -->
        <div class="flex flex-col items-center gap-1">
          <div class="flex items-center border border-outline-variant rounded-full px-3 py-1 bg-surface-container-lowest shrink-0 h-10">
            <button class="material-symbols-outlined text-outline hover:text-primary transition-colors text-[20px]" onclick="updateQuantity(${item.id}, ${item.quantity - 1}, ${item.stock})">remove</button>
            <input class="w-10 text-center border-none focus:ring-0 font-label-md text-label-md bg-transparent p-0" type="number" value="${item.quantity}" readonly/>
            <button class="material-symbols-outlined text-outline hover:text-primary transition-colors text-[20px]" onclick="updateQuantity(${item.id}, ${item.quantity + 1}, ${item.stock})">add</button>
          </div>
          <span class="text-[10px] text-outline">Tồn kho: ${item.stock}</span>
        </div>

        <!-- Remove Button -->
        <button onclick="removeCartItem(${item.id})" class="p-2 text-outline hover:text-error transition-colors rounded-full hover:bg-error/5" title="Xóa sản phẩm">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    `;
  }).join('');

  // Recalculate summary card details
  calculateSummary(totalAmount, totalItems);
}

/**
 * Handle live quantity updates on cart items
 */
window.updateQuantity = async function(cartItemId, newQuantity, maxStock) {
  if (newQuantity <= 0) {
    // If quantity is 0, offer to delete
    if (confirm('Bạn có muốn xóa sản phẩm này khỏi giỏ hàng?')) {
      removeCartItem(cartItemId);
    }
    return;
  }

  if (newQuantity > maxStock) {
    window.toast.error(`Rất tiếc, kho chỉ còn tối đa ${maxStock} sản phẩm này.`);
    return;
  }

  const res = await window.api.put(`/cart/items/${cartItemId}`, { quantity: newQuantity });
  if (res.success) {
    loadCart(); // reload list
    window.auth.updateNavigationUI(); // update header badge
  } else {
    window.toast.error(res.message || 'Cập nhật số lượng thất bại.');
  }
};

/**
 * Handle Delete cart items
 */
window.removeCartItem = async function(cartItemId) {
  const res = await window.api.delete(`/cart/items/${cartItemId}`);
  if (res.success) {
    window.toast.success('Đã xóa sản phẩm khỏi giỏ hàng.');
    loadCart(); // reload list
    window.auth.updateNavigationUI(); // update header badge
  } else {
    window.toast.error(res.message || 'Xóa sản phẩm thất bại.');
  }
};

/**
 * Recalculate Summary Pricing Card
 */
function calculateSummary(subtotal, itemsCount) {
  // Shipping rule: free shipping for orders >= 300.000₫, else 15.000₫ shipping fee
  const shippingFee = subtotal >= 300000 ? 0 : 15000;
  const total = subtotal + shippingFee;

  document.getElementById('summary-items-count').innerText = itemsCount;
  document.getElementById('summary-subtotal').innerText = formatVND(subtotal);
  document.getElementById('summary-shipping').innerText = shippingFee === 0 ? 'Miễn phí' : formatVND(shippingFee);
  document.getElementById('summary-total').innerText = formatVND(total);

  const note = document.getElementById('free-shipping-note');
  if (note) {
    if (subtotal >= 300000) {
      note.innerHTML = `
        <span class="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
        Chúc mừng! Đơn hàng của bạn đã được miễn phí vận chuyển!
      `;
      note.className = 'text-[12px] text-secondary font-bold flex items-center gap-1';
    } else {
      const remaining = 300000 - subtotal;
      note.innerHTML = `
        <span class="material-symbols-outlined text-[16px]">info</span>
        Mua thêm <span class="underline">${formatVND(remaining)}</span> nữa để được miễn phí giao hàng!
      `;
      note.className = 'text-[12px] text-tertiary font-bold flex items-center gap-1';
    }
  }
}

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}
