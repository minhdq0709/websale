document.addEventListener('DOMContentLoaded', () => {
  // Guard route
  if (!window.auth.checkAuthOrRedirect()) return;

  // Pre-fill user information if available
  const user = window.auth.getUser();
  if (user) {
    if (user.name) document.getElementById('shipping-name').value = user.name;
    if (user.phone) document.getElementById('shipping-phone').value = user.phone;
  }

  // Load cart data for checkout
  loadCheckoutCart();

  // Bind order button
  const confirmOrderBtn = document.getElementById('btn-confirm-order');
  if (confirmOrderBtn) {
    confirmOrderBtn.addEventListener('click', handleConfirmOrder);
  }

  // Initialize payment option state
  selectPayment('qr');
});

let currentPaymentMethod = 'qr';
let checkoutSubtotal = 0;

/**
 * Handle payment option selection
 */
window.selectPayment = function(method) {
  currentPaymentMethod = method;

  // Reset payment option styles
  document.querySelectorAll('.payment-option').forEach(opt => {
    opt.classList.remove('payment-option-active');
    const icon = opt.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.classList.remove('text-primary');
      icon.classList.add('text-on-surface-variant');
    }
  });

  // Highlight selected payment option
  const selectedOpt = document.getElementById(`method-${method}`);
  if (selectedOpt) {
    selectedOpt.classList.add('payment-option-active');
    const icon = selectedOpt.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.classList.remove('text-on-surface-variant');
      icon.classList.add('text-primary');
    }
  }

  // Toggle detail displays
  const qrDisplay = document.getElementById('qr-display');
  const bankDisplay = document.getElementById('bank-display');
  const codDisplay = document.getElementById('cod-display');

  if (qrDisplay) qrDisplay.classList.add('hidden');
  if (bankDisplay) bankDisplay.classList.add('hidden');
  if (codDisplay) codDisplay.classList.add('hidden');

  if (method === 'qr' && qrDisplay) {
    qrDisplay.classList.remove('hidden');
  } else if (method === 'bank' && bankDisplay) {
    bankDisplay.classList.remove('hidden');
    // Update transfer content
    const totalAmount = checkoutSubtotal + (checkoutSubtotal >= 300000 ? 0 : 15000);
    document.getElementById('bank-amount').innerText = formatVND(totalAmount);
    
    // Generate unique transfer message
    const orderCode = 'PVK' + Math.floor(Math.random() * 900000 + 100000);
    document.getElementById('bank-message').innerText = orderCode;
  } else if (method === 'cod' && codDisplay) {
    codDisplay.classList.remove('hidden');
  }
};

/**
 * Load cart items and populate the checkout sidebar summary
 */
async function loadCheckoutCart() {
  const itemsList = document.getElementById('checkout-items-list');
  if (!itemsList) return;

  // Show skeletal loader
  itemsList.innerHTML = `
    <div class="space-y-4 animate-pulse">
      ${Array(2).fill(0).map(() => `
        <div class="flex gap-4">
          <div class="w-12 h-12 bg-white/10 rounded-lg"></div>
          <div class="flex-grow space-y-2">
            <div class="h-4 bg-white/10 rounded w-2/3"></div>
            <div class="h-3 bg-white/10 rounded w-1/3"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  const res = await window.api.get('/cart');
  if (!res.success) {
    window.toast.error(res.message || 'Không thể lấy thông tin giỏ hàng.');
    setTimeout(() => {
      window.location.href = '/cart.html';
    }, 2000);
    return;
  }

  const { items, totalAmount } = res.data;

  if (!items || items.length === 0) {
    window.toast.info('Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi thanh toán.');
    setTimeout(() => {
      window.location.href = '/products.html';
    }, 2000);
    return;
  }

  checkoutSubtotal = totalAmount;

  // Render items list
  itemsList.innerHTML = items.map(item => {
    const isSale = item.sale_price !== null;
    const unitPrice = isSale ? item.sale_price : item.price;
    const itemSubtotal = unitPrice * item.quantity;

    // Image fallback
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
      <div class="flex justify-between items-center gap-4 border-b border-white/10 pb-4">
        <div class="flex gap-4 items-center">
          <div class="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img class="w-full h-full object-cover" 
                 src="${window.escapeHTML(imageUrl)}" 
                 alt="${window.escapeHTML(item.name)}"
                 onerror="this.src='https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'"
            />
          </div>
          <div>
            <p class="text-label-md font-label-md max-w-[150px] truncate" title="${window.escapeHTML(item.name)}">${window.escapeHTML(item.name)}</p>
            <p class="text-label-sm font-label-sm opacity-70">${formatVND(unitPrice)} x ${item.quantity}</p>
          </div>
        </div>
        <span class="text-label-md font-label-md font-bold">${formatVND(itemSubtotal)}</span>
      </div>
    `;
  }).join('');

  // Calculate fees
  const shippingFee = checkoutSubtotal >= 300000 ? 0 : 15000;
  const total = checkoutSubtotal + shippingFee;

  document.getElementById('checkout-subtotal').innerText = formatVND(checkoutSubtotal);
  document.getElementById('checkout-shipping').innerText = shippingFee === 0 ? 'Miễn phí' : formatVND(shippingFee);
  document.getElementById('checkout-total').innerText = formatVND(total);

  // If bank method was already active, refresh bank transfer details
  if (currentPaymentMethod === 'bank') {
    selectPayment('bank');
  }
}

/**
 * Handle confirmation of order placement
 */
async function handleConfirmOrder(e) {
  e.preventDefault();

  const name = document.getElementById('shipping-name').value.trim();
  const phone = document.getElementById('shipping-phone').value.trim();
  const street = document.getElementById('shipping-street').value.trim();
  const ward = document.getElementById('shipping-ward').value.trim();
  const district = document.getElementById('shipping-district').value.trim();
  const province = document.getElementById('shipping-province').value;
  const note = document.getElementById('shipping-note').value.trim();

  // Simple validation
  if (!name || !phone || !street || !ward || !district || !province) {
    window.toast.error('Vui lòng điền đầy đủ các trường thông tin bắt buộc (*)');
    return;
  }

  // Phone regex pattern: ^(0[3|5|7|8|9])([0-9]{8})$
  const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/;
  if (!phoneRegex.test(phone)) {
    window.toast.error('Số điện thoại không đúng định dạng Việt Nam (e.g. 0901234567)');
    return;
  }

  // Construct shipping address matching backend schema
  const shipping_address = {
    name,
    phone,
    street,
    ward,
    district,
    province
  };

  const confirmBtn = document.getElementById('btn-confirm-order');
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = `
    <span class="material-symbols-outlined animate-spin text-[20px]">sync</span>
    Đang xử lý đặt hàng...
  `;

  const response = await window.api.post('/orders', { shipping_address, note });
  
  if (response.success) {
    window.toast.success('Đặt hàng thành công! Đơn hàng của bạn đã được tạo.');
    
    // Clear navigation badges
    window.auth.updateNavigationUI();

    // Redirect to profile page after 2 seconds
    setTimeout(() => {
      window.location.href = '/profile.html';
    }, 2000);
  } else {
    window.toast.error(response.message || 'Đặt hàng thất bại. Vui lòng kiểm tra lại.');
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = `
      <span>Xác nhận đặt hàng</span>
      <span class="material-symbols-outlined text-[20px]">shopping_cart_checkout</span>
    `;
  }
}

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}
