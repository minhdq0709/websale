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

  // Initialize OTP digits keyboard and event bindings
  initOtpUI();

  // Initialize payment option state - Default to COD for zero initial load overhead
  selectPayment('cod');

  // ========== FIX CSP: replace inline onclick with event listeners ==========
  // Payment method selection
  const methodCOD = document.getElementById('method-cod');
  const methodBank = document.getElementById('method-bank');
  const methodQR = document.getElementById('method-qr');

  if (methodCOD) methodCOD.addEventListener('click', () => selectPayment('cod'));
  if (methodBank) methodBank.addEventListener('click', () => selectPayment('bank'));
  if (methodQR) methodQR.addEventListener('click', () => selectPayment('qr'));

  // Copy account number (for both bank and QR sections)
  document.querySelectorAll('.copy-account').forEach(el => {
    el.addEventListener('click', function () {
      let text = this.innerText;
      if (text) {
        text = text.replace('content_copy', '').trim();
      }
      if (text && text !== 'Đang tải...') {
        navigator.clipboard.writeText(text);
        if (window.toast) window.toast.success('Đã sao chép số tài khoản!');
      }
    });
  });

  // Copy transfer message
  document.querySelectorAll('.copy-message').forEach(el => {
    el.addEventListener('click', function () {
      let text = this.innerText;
      if (text) {
        text = text.replace('content_copy', '').trim();
      }
      if (text) {
        navigator.clipboard.writeText(text);
        if (window.toast) window.toast.success('Đã sao chép nội dung chuyển khoản!');
      }
    });
  });

  // Download QR Code image
  const btnDownloadQr = document.getElementById('btn-download-qr');
  if (btnDownloadQr) {
    btnDownloadQr.addEventListener('click', (e) => {
      e.stopPropagation();
      const qrImg = document.getElementById('qr-code-img');
      if (!qrImg || !qrImg.src) return;

      if (window.toast) window.toast.info('Đang tải ảnh QR về máy...');

      // Redirect browser directly to proxy download endpoint to bypass CORS
      const downloadUrl = `/api/v1/orders/download-qr?url=${encodeURIComponent(qrImg.src)}&code=${transactionOrderCode || 'order'}`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `MilaMarket-QR-ThanhToan-${transactionOrderCode || 'order'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }
});

let currentPaymentMethod = 'cod';
let checkoutSubtotal = 0;
let bankInfo = null; // Store decrypted bank details
let transactionOrderCode = ''; // Stable order code message across tab switches

// OTP active state variables
let otpCountdownInterval = null;
const otpExpiryTime = 300; // 5 minutes in seconds
let currentOtpTimeLeft = 0;
let cachedOrderPayload = null;
let isFetchingBankInfo = false;

/**
 * Fetch bank payment details from backend
 */
async function loadPaymentInfo() {
  if (isFetchingBankInfo) return;
  isFetchingBankInfo = true;

  // Show loading spinner
  updateLoadingState(true);

  const res = await window.api.get('/orders/payment-info');
  isFetchingBankInfo = false;

  if (res.success) {
    bankInfo = {
      bankName: res.data.bankName,
      bankAccount: res.data.bankAccount,
      bankOwner: res.data.bankOwner,
      bankCode: res.data.bankCode
    };

    // Map to official NAPAS BIN codes for VietQR API — dùng BIN số để đảm bảo QR đúng ngân hàng
    const BIN_MAP = {
      'icb': '970415',       // VietinBank
      'vtb': '970415',       // VietinBank (alias)
      'vietinbank': '970415',// VietinBank (full name)
      'vcb': '970436',       // Vietcombank
      'vietcombank': '970436',
      'mb': '970422',        // MB Bank
      'mbbank': '970422',
      'acb': '970416',       // ACB
      'techcombank': '970407',
      'tcb': '970407',
      'bidv': '970418',
      'agribank': '970405',
      'vpbank': '970432',
      'tpbank': '970423',
      'sacombank': '970403',
      'hdbank': '970437',
      'ocb': '970448',
    };
    const mappedCode = (bankInfo.bankCode || '').toLowerCase().trim();
    bankInfo.bankCodeForQr = BIN_MAP[mappedCode] || bankInfo.bankCode.toUpperCase().trim();

    // Update dynamic text in DOM
    const bankNameEl = document.getElementById('bank-name-text');
    const bankAccountEl = document.getElementById('bank-account-text');
    const bankOwnerEl = document.getElementById('bank-owner-text');

    const qrBankNameEl = document.getElementById('qr-bank-name-text');
    const qrBankAccountEl = document.getElementById('qr-bank-account-text');
    const qrBankOwnerEl = document.getElementById('qr-bank-owner-text');

    if (bankNameEl) bankNameEl.innerText = bankInfo.bankName;
    if (bankAccountEl) bankAccountEl.innerText = bankInfo.bankAccount;
    if (bankOwnerEl) bankOwnerEl.innerText = bankInfo.bankOwner;

    if (qrBankNameEl) qrBankNameEl.innerText = bankInfo.bankName;
    if (qrBankAccountEl) qrBankAccountEl.innerText = bankInfo.bankAccount;
    if (qrBankOwnerEl) qrBankOwnerEl.innerText = bankInfo.bankOwner;

    updateLoadingState(false);
    refreshPaymentDisplay();
  } else {
    updateLoadingState(false);
    console.error('Không thể tải thông tin tài khoản ngân hàng bảo mật:', res.message);
    window.toast.error('Lỗi tải thông tin tài khoản ngân hàng.');
  }
}

/**
 * Update UI Loading indicators for lazy fetching
 */
function updateLoadingState(isLoading) {
  const qrLoading = document.getElementById('qr-loading');
  const qrContent = document.getElementById('qr-content');
  const bankLoading = document.getElementById('bank-loading');
  const bankContent = document.getElementById('bank-content');

  if (isLoading) {
    if (qrLoading) qrLoading.classList.remove('hidden');
    if (qrContent) qrContent.classList.add('hidden');
    if (bankLoading) bankLoading.classList.remove('hidden');
    if (bankContent) bankContent.classList.add('hidden');
  } else {
    if (qrLoading) qrLoading.classList.add('hidden');
    if (qrContent) qrContent.classList.remove('hidden');
    if (bankLoading) bankLoading.classList.add('hidden');
    if (bankContent) bankContent.classList.remove('hidden');
  }
}

/**
 * Handle payment option selection
 */
window.selectPayment = function (method) {
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

  // Lazy loading: fetch payment details on demand if selecting QR or Bank Transfer for first time
  if ((method === 'qr' || method === 'bank') && !bankInfo) {
    loadPaymentInfo();
  }

  refreshPaymentDisplay();
};

/**
 * Refresh QR Code and Bank Transfer dynamic data
 */
function refreshPaymentDisplay() {
  const qrDisplay = document.getElementById('qr-display');
  const bankDisplay = document.getElementById('bank-display');
  const codDisplay = document.getElementById('cod-display');

  if (qrDisplay) qrDisplay.classList.add('hidden');
  if (bankDisplay) bankDisplay.classList.add('hidden');
  if (codDisplay) codDisplay.classList.add('hidden');

  // Maintain consistent stable order code message
  if (!transactionOrderCode) {
    transactionOrderCode = 'PVK' + Math.floor(Math.random() * 900000 + 100000);
  }

  const totalAmount = checkoutSubtotal + (checkoutSubtotal >= 300000 ? 0 : 15000);

  if (currentPaymentMethod === 'qr' && qrDisplay) {
    qrDisplay.classList.remove('hidden');
    if (bankInfo) {
      // Dùng BIN NAPAS chuẩn + cache-buster timestamp để tránh browser cache ảnh QR cũ
      const qrUrl = `https://img.vietqr.io/image/${bankInfo.bankCodeForQr}-${bankInfo.bankAccount}-compact.png?amount=${totalAmount}&addInfo=${encodeURIComponent(transactionOrderCode)}&accountName=${encodeURIComponent(bankInfo.bankOwner)}&t=${Date.now()}`;
      const qrImg = document.getElementById('qr-code-img');
      if (qrImg) {
        qrImg.src = ''; // Clear old cached src first
        qrImg.src = qrUrl;
        console.log('[QR] Generating QR with URL:', qrUrl);
      }
      // Update text info in QR section
      const qrBankNameEl = document.getElementById('qr-bank-name-text');
      const qrBankAccountEl = document.getElementById('qr-bank-account-text');
      const qrBankOwnerEl = document.getElementById('qr-bank-owner-text');
      if (qrBankNameEl) qrBankNameEl.innerText = bankInfo.bankName;
      if (qrBankAccountEl) qrBankAccountEl.innerText = bankInfo.bankAccount;
      if (qrBankOwnerEl) qrBankOwnerEl.innerText = bankInfo.bankOwner;
    }
  } else if (currentPaymentMethod === 'bank' && bankDisplay) {
    bankDisplay.classList.remove('hidden');

    // Update amount & unique order code
    const bankAmountEl = document.getElementById('bank-amount');
    const bankMessageEl = document.getElementById('bank-message');

    if (bankAmountEl) bankAmountEl.innerText = formatVND(totalAmount);
    if (bankMessageEl) bankMessageEl.innerText = transactionOrderCode;
  } else if (currentPaymentMethod === 'cod' && codDisplay) {
    codDisplay.classList.remove('hidden');
  }
}

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

  // Refresh display values
  refreshPaymentDisplay();
}

/**
 * Handle confirmation of order placement - Trigger OTP Validation Lifecycle
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

  // Phone regex pattern
  const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/;
  if (!phoneRegex.test(phone)) {
    window.toast.error('Số điện thoại không đúng định dạng Việt Nam (e.g. 0901234567)');
    return;
  }

  // Construct shipping address payload
  const shipping_address = {
    name,
    phone,
    street,
    ward,
    district,
    province
  };

  // Cache order payload for submission after OTP verification
  cachedOrderPayload = { shipping_address, note };

  const confirmBtn = document.getElementById('btn-confirm-order');
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = `
    <span class="material-symbols-outlined animate-spin text-[20px]">sync</span>
    Đang yêu cầu mã OTP...
  `;

  // Request the payment OTP from backend
  const res = await window.api.post('/orders/request-otp');
  if (res.success) {
    // Open the verification OTP modal
    openOtpModal(res.data ? res.data.demoOtp : null);
  } else {
    window.toast.error(res.message || 'Không thể yêu cầu mã OTP lúc này.');
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = `
      <span>Xác nhận đặt hàng</span>
      <span class="material-symbols-outlined text-[20px]">shopping_cart_checkout</span>
    `;
  }
}

/**
 * Initialize OTP keyboard traverse UI elements
 */
function initOtpUI() {
  const otpDigits = document.querySelectorAll('.otp-digit');
  const otpModal = document.getElementById('otp-modal');
  const otpModalContent = document.getElementById('otp-modal-content');
  const btnResendOtp = document.getElementById('btn-resend-otp');
  const btnCancelOtp = document.getElementById('btn-cancel-otp');
  const otpForm = document.getElementById('otp-form');
  const btnVerifyOtp = document.getElementById('btn-verify-otp');

  if (!otpModal) return;

  // Auto-focus next field on input typing, shift back on backspace
  otpDigits.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value;
      // Allow only numbers
      e.target.value = val.replace(/[^0-9]/g, '');
      if (e.target.value.length === 1 && idx < otpDigits.length - 1) {
        otpDigits[idx + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        otpDigits[idx - 1].focus();
      }
    });
  });

  // Cancel checkout verification
  btnCancelOtp.addEventListener('click', () => {
    closeOtpModal();
    const confirmBtn = document.getElementById('btn-confirm-order');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `
        <span>Xác nhận đặt hàng</span>
        <span class="material-symbols-outlined text-[20px]">shopping_cart_checkout</span>
      `;
    }
  });

  // Resend OTP code request
  btnResendOtp.addEventListener('click', async () => {
    btnResendOtp.disabled = true;
    window.toast.info('Đang gửi lại mã OTP mới...');

    const res = await window.api.post('/orders/request-otp');
    if (res.success) {
      window.toast.success('Mã OTP mới đã được gửi thành công.');
      startOtpTimer();
      if (res.data && res.data.demoOtp) {
        // Clear previous toast immediately and show the new one
        window.toast.info(`[DEMO SMS] Mã OTP mới của bạn là: ${res.data.demoOtp}`, 8000);
      }
    } else {
      window.toast.error(res.message || 'Không thể gửi lại mã OTP.');
      btnResendOtp.disabled = false;
    }
  });

  // Submit OTP Form for complete order confirmation
  otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    let otpCode = '';
    otpDigits.forEach(input => otpCode += input.value);

    if (otpCode.length !== 6) {
      window.toast.error('Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.');
      return;
    }

    btnVerifyOtp.disabled = true;
    btnVerifyOtp.innerHTML = `
      <span class="material-symbols-outlined animate-spin text-[18px]">sync</span>
      Đang xác thực...
    `;

    // Place the order by verifying the OTP on the backend
    const response = await window.api.post('/orders', {
      shipping_address: cachedOrderPayload.shipping_address,
      note: cachedOrderPayload.note,
      otp: otpCode
    });

    if (response.success) {
      closeOtpModal();
      window.toast.success('Xác thực OTP thành công! Đơn hàng của bạn đã được khởi tạo.');

      // Update global navigation badges
      if (window.auth && typeof window.auth.updateNavigationUI === 'function') {
        window.auth.updateNavigationUI();
      }

      // Redirect to profile page after 2 seconds
      setTimeout(() => {
        window.location.href = '/profile.html';
      }, 2000);
    } else {
      window.toast.error(response.message || 'Xác thực OTP thất bại. Vui lòng kiểm tra lại.');
      btnVerifyOtp.disabled = false;
      btnVerifyOtp.innerHTML = `
        <span>Xác nhận</span>
        <span class="material-symbols-outlined text-[18px]">done</span>
      `;

      // Select last digit for user convenience
      if (otpDigits[5]) otpDigits[5].focus();
    }
  });
}

/**
 * Open OTP Modal dialog
 */
function openOtpModal(demoOtp = null) {
  const otpModal = document.getElementById('otp-modal');
  const otpModalContent = document.getElementById('otp-modal-content');
  const otpDigits = document.querySelectorAll('.otp-digit');

  if (!otpModal) return;

  // Clear inputs
  otpDigits.forEach(input => input.value = '');

  // Animation open
  otpModal.classList.remove('pointer-events-none');
  otpModal.classList.remove('opacity-0');
  if (otpModalContent) {
    otpModalContent.classList.remove('scale-95');
    otpModalContent.classList.add('scale-100');
  }

  // Focus first input box
  if (otpDigits[0]) {
    setTimeout(() => otpDigits[0].focus(), 100);
  }

  // If demoOtp is provided, display a mock SMS notification toast
  if (demoOtp) {
    setTimeout(() => {
      window.toast.info(`[DEMO SMS] Mã OTP của bạn là: ${demoOtp}`, 8000);
    }, 600);
  }

  startOtpTimer();
}

/**
 * Close OTP Modal dialog
 */
function closeOtpModal() {
  const otpModal = document.getElementById('otp-modal');
  const otpModalContent = document.getElementById('otp-modal-content');

  if (!otpModal) return;

  // Animation close
  otpModal.classList.add('pointer-events-none');
  otpModal.classList.add('opacity-0');
  if (otpModalContent) {
    otpModalContent.classList.remove('scale-100');
    otpModalContent.classList.add('scale-95');
  }

  // Clear interval
  if (otpCountdownInterval) {
    clearInterval(otpCountdownInterval);
  }
}

/**
 * Start OTP countdown timer (5 mins = 300 secs)
 */
function startOtpTimer() {
  const otpTimer = document.getElementById('otp-timer');
  const btnResendOtp = document.getElementById('btn-resend-otp');

  if (!otpTimer || !btnResendOtp) return;

  clearInterval(otpCountdownInterval);
  currentOtpTimeLeft = otpExpiryTime;
  btnResendOtp.disabled = true;

  function updateTimer() {
    if (currentOtpTimeLeft <= 0) {
      clearInterval(otpCountdownInterval);
      otpTimer.innerText = 'Đã hết hạn';
      btnResendOtp.disabled = false;
    } else {
      const minutes = Math.floor(currentOtpTimeLeft / 60);
      const seconds = currentOtpTimeLeft % 60;
      otpTimer.innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      currentOtpTimeLeft--;
    }
  }

  updateTimer();
  otpCountdownInterval = setInterval(updateTimer, 1000);
}

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}