document.addEventListener('DOMContentLoaded', () => {
  // Ensure user is logged in
  if (!window.auth.checkAuthOrRedirect()) return;

  // Load profile data
  loadUserProfile();

  // Load addresses
  renderAddresses();

  // Load orders
  loadOrders();

  // Bind logout button
  const logoutBtn = document.getElementById('sidebar-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.auth.logout();
    });
  }

  // Setup profile edit toggle & cancel bindings
  const profileEditToggle = document.getElementById('profile-edit-toggle');
  const profileEditCancel = document.getElementById('profile-edit-cancel');
  const profileViewFields = document.getElementById('profile-view-fields');
  const profileEditForm = document.getElementById('profile-edit-form');
  const profileEditText = document.getElementById('profile-edit-text');

  function toggleEditMode(isEditing) {
    if (isEditing) {
      if (profileViewFields) profileViewFields.classList.add('hidden');
      if (profileEditForm) profileEditForm.classList.remove('hidden');
      if (profileEditText) profileEditText.textContent = 'Hủy';
      
      const user = window.auth.getUser();
      if (user) {
        const inputName = document.getElementById('profile-input-name');
        const inputPhone = document.getElementById('profile-input-phone');
        if (inputName) inputName.value = user.name || '';
        if (inputPhone) inputPhone.value = user.phone || '';
      }
    } else {
      if (profileViewFields) profileViewFields.classList.remove('hidden');
      if (profileEditForm) profileEditForm.classList.add('hidden');
      if (profileEditText) profileEditText.textContent = 'Chỉnh sửa';
    }
  }

  if (profileEditToggle) {
    profileEditToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const isCurrentlyViewing = profileViewFields && !profileViewFields.classList.contains('hidden');
      toggleEditMode(isCurrentlyViewing);
    });
  }

  if (profileEditCancel) {
    profileEditCancel.addEventListener('click', (e) => {
      e.preventDefault();
      toggleEditMode(false);
    });
  }

  // Handle profile edit form submit
  if (profileEditForm) {
    profileEditForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const inputName = document.getElementById('profile-input-name');
      const inputPhone = document.getElementById('profile-input-phone');
      
      const name = inputName ? inputName.value.trim() : '';
      const phone = inputPhone ? inputPhone.value.trim() : '';

      if (!name || !phone) {
        window.toast.error('Vui lòng nhập đầy đủ họ tên và số điện thoại.');
        return;
      }

      const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/;
      if (!phoneRegex.test(phone)) {
        window.toast.error('Số điện thoại không đúng định dạng Việt Nam (e.g. 0901234567).');
        return;
      }

      const res = await window.api.put('/users/profile', { name, phone });
      if (res.success) {
        window.toast.success('Cập nhật thông tin cá nhân thành công.');
        
        // Update user session cache
        const oldUser = window.auth.getUser() || {};
        const updatedUser = { ...oldUser, name: res.data.name, phone: res.data.phone };
        localStorage.setItem('user', JSON.stringify(updatedUser));

        loadUserProfile();
        window.auth.updateNavigationUI();
        toggleEditMode(false);
      } else {
        window.toast.error(res.message || 'Cập nhật thông tin thất bại.');
      }
    });
  }

  // Handle password change form submit
  const passwordChangeForm = document.getElementById('password-change-form');
  if (passwordChangeForm) {
    passwordChangeForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const oldPassword = document.getElementById('pwd-old').value;
      const newPassword = document.getElementById('pwd-new').value;
      const confirmPassword = document.getElementById('pwd-confirm').value;

      if (newPassword !== confirmPassword) {
        window.toast.error('Mật khẩu mới và xác nhận mật khẩu không trùng khớp.');
        return;
      }

      if (newPassword.length < 6) {
        window.toast.error('Mật khẩu mới phải từ 6 ký tự trở lên.');
        return;
      }

      const res = await window.api.put('/users/password', { oldPassword, newPassword });
      if (res.success) {
        window.toast.success('Đổi mật khẩu tài khoản thành công.');
        passwordChangeForm.reset();
      } else {
        window.toast.error(res.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.');
      }
    });
  }

  // Address modal elements and actions
  const addAddressBtn = document.getElementById('add-address-btn');
  const addressModal = document.getElementById('address-modal');
  const closeAddressModal = document.getElementById('close-address-modal');
  const addressForm = document.getElementById('address-form');

  if (addAddressBtn && addressModal) {
    addAddressBtn.addEventListener('click', () => {
      addressModal.style.display = 'flex';
    });
  }

  if (closeAddressModal && addressModal) {
    closeAddressModal.addEventListener('click', () => {
      addressModal.style.display = 'none';
      if (addressForm) addressForm.reset();
    });
  }

  if (addressForm) {
    addressForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = window.auth.getUser();
      if (!user) return;

      const label = document.getElementById('addr-label').value.trim();
      const name = document.getElementById('addr-name').value.trim();
      const phone = document.getElementById('addr-phone').value.trim();
      const detail = document.getElementById('addr-detail').value.trim();
      const isDefault = document.getElementById('addr-default').checked;

      const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/;
      if (!phoneRegex.test(phone)) {
        window.toast.error('Số điện thoại nhận hàng không đúng định dạng Việt Nam.');
        return;
      }

      const key = 'user_addresses_' + user.id;
      const addresses = JSON.parse(localStorage.getItem(key)) || [];
      const finalIsDefault = addresses.length === 0 ? true : isDefault;

      if (finalIsDefault) {
        addresses.forEach(a => a.isDefault = false);
      }

      const newAddress = {
        id: Date.now().toString(),
        label,
        name,
        phone,
        detail,
        isDefault: finalIsDefault
      };

      addresses.push(newAddress);
      localStorage.setItem(key, JSON.stringify(addresses));

      window.toast.success('Thêm địa chỉ giao nhận mới thành công.');
      addressForm.reset();
      addressModal.style.display = 'none';
      window.renderAddresses();
    });
  }

  // Address delegation click actions
  const addressesList = document.getElementById('addresses-list-container');
  if (addressesList) {
    addressesList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');
      const user = window.auth.getUser();
      if (!user) return;
      
      const key = 'user_addresses_' + user.id;
      let addresses = JSON.parse(localStorage.getItem(key)) || [];

      if (action === 'delete-address') {
        if (!confirm('Bạn có thực sự muốn xóa địa chỉ này?')) return;
        addresses = addresses.filter(a => String(a.id) !== String(id));
        
        // If we deleted the default address, and we still have other addresses, make the first one default
        if (addresses.length > 0 && !addresses.some(a => a.isDefault)) {
          addresses[0].isDefault = true;
        }

        localStorage.setItem(key, JSON.stringify(addresses));
        window.toast.success('Đã xóa địa chỉ thành công.');
        renderAddresses();
      } else if (action === 'set-default') {
        addresses.forEach(a => {
          a.isDefault = String(a.id) === String(id);
        });
        localStorage.setItem(key, JSON.stringify(addresses));
        window.toast.success('Đã thiết lập địa chỉ làm mặc định.');
        renderAddresses();
      }
    });
  }

  // Orders delegation click actions
  const ordersList = document.getElementById('orders-list-container');
  const orderDetailModal = document.getElementById('order-detail-modal');
  const closeDetailModal = document.getElementById('close-detail-modal');

  if (ordersList) {
    ordersList.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const id = btn.getAttribute('data-id');

      if (action === 'cancel-order') {
        if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) return;
        const res = await window.api.patch(`/orders/${id}/cancel`);
        if (res.success) {
          window.toast.success('Hủy đơn hàng thành công. Các sản phẩm đã được trả về kho.');
          loadOrders();
        } else {
          window.toast.error(res.message || 'Không thể hủy đơn hàng này.');
        }
      } else if (action === 'view-order-detail') {
        showOrderDetail(id);
      }
    });
  }

  if (closeDetailModal && orderDetailModal) {
    closeDetailModal.addEventListener('click', () => {
      orderDetailModal.style.display = 'none';
    });
  }
});

// Profile Loading Function
async function loadUserProfile() {
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  const sidebarName = document.getElementById('sidebar-name');
  const sidebarRole = document.getElementById('sidebar-role');

  const viewName = document.getElementById('profile-view-name');
  const viewPhone = document.getElementById('profile-view-phone');
  const viewEmail = document.getElementById('profile-view-email');
  const viewRole = document.getElementById('profile-view-role');

  const res = await window.api.get('/users/profile');
  if (res.success) {
    const user = res.data;

    // Cache to localStorage
    const oldUser = window.auth.getUser() || {};
    localStorage.setItem('user', JSON.stringify({ ...oldUser, ...user }));

    const roleMap = { 'customer': 'Thành viên', 'staff': 'Nhân viên', 'admin': 'Quản trị viên' };
    const displayRole = roleMap[user.role] || user.role;

    if (sidebarName) sidebarName.textContent = user.name;
    if (sidebarRole) sidebarRole.textContent = displayRole;

    if (viewName) viewName.textContent = user.name;
    if (viewPhone) viewPhone.textContent = user.phone || 'Chưa cập nhật';
    if (viewEmail) viewEmail.textContent = user.email || 'Chưa cập nhật';
    if (viewRole) viewRole.textContent = displayRole;
    
    if (user.avatar_url && sidebarAvatar) {
      sidebarAvatar.src = user.avatar_url;
    }
  } else {
    window.toast.error('Không thể kết nối và tải hồ sơ từ máy chủ.');
  }
}

// Addresses Rendering Function
window.renderAddresses = function renderAddresses() {
  const container = document.getElementById('addresses-list-container');
  if (!container) return;

  const user = window.auth.getUser();
  if (!user) return;

  const key = 'user_addresses_' + user.id;
  const addresses = JSON.parse(localStorage.getItem(key)) || [];

  if (addresses.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 text-on-surface-variant opacity-60">
        <span class="material-symbols-outlined text-[48px] mb-2 text-outline">location_off</span>
        <p class="font-body-md">Bạn chưa lưu bất kỳ địa chỉ nhận hàng nào.</p>
        <p class="text-xs mt-1">Vui lòng click "Thêm địa chỉ mới" để thêm thông tin.</p>
      </div>
    `;
    return;
  }

  // Sort by default first
  addresses.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));

  container.innerHTML = addresses.map(addr => `
    <div class="p-6 border border-outline-variant rounded-xl bg-surface-container-low flex justify-between items-start gap-4 transition-all hover:border-primary/20 custom-shadow">
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <span class="font-bold text-on-surface text-body-md">${window.escapeHTML(addr.label)}</span>
          ${addr.isDefault ? `<span class="bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full text-[10px] font-bold">Mặc định</span>` : ''}
        </div>
        <p class="text-body-sm text-on-surface-variant">
          <strong>Người nhận:</strong> ${window.escapeHTML(addr.name)} | <strong>SĐT:</strong> ${window.escapeHTML(addr.phone)}
        </p>
        <p class="text-body-sm text-on-surface-variant">
          <strong>Địa chỉ:</strong> ${window.escapeHTML(addr.detail)}
        </p>
      </div>
      <div class="flex flex-col sm:flex-row gap-2 shrink-0">
        ${!addr.isDefault ? `<button class="px-3 py-1 border border-outline text-on-surface-variant hover:bg-surface-container hover:text-primary rounded-full text-label-sm font-bold transition-all" data-action="set-default" data-id="${addr.id}">Mặc định</button>` : ''}
        <button class="px-3 py-1 border border-error/50 text-error hover:bg-error-container/20 rounded-full text-label-sm font-bold transition-all" data-action="delete-address" data-id="${addr.id}">Xóa</button>
      </div>
    </div>
  `).join('');
};

// Orders Management and Rendering
let allOrders = [];

window.loadOrders = async function loadOrders() {
  const container = document.getElementById('orders-list-container');
  if (!container) return;

  const res = await window.api.get('/orders/my');
  if (res.success) {
    allOrders = res.data || [];
    renderOrders('all');
  } else {
    container.innerHTML = `<p class="text-error font-bold text-center py-6">Lỗi kết nối tải danh sách đơn hàng.</p>`;
  }
};

function renderOrders(filterStatus = 'all') {
  const container = document.getElementById('orders-list-container');
  if (!container) return;

  let filtered = allOrders;
  if (filterStatus !== 'all') {
    if (filterStatus === 'completed') {
      filtered = allOrders.filter(o => o.status === 'delivered');
    } else {
      filtered = allOrders.filter(o => o.status === filterStatus);
    }
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-on-surface-variant opacity-60">
        <span class="material-symbols-outlined text-[48px] mb-2 text-outline">shopping_bag</span>
        <p class="font-body-md">Không tìm thấy đơn hàng nào.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(order => {
    const addr = order.shipping_address;
    const addrStr = addr 
      ? `${addr.name} - ${addr.phone}, ${addr.street}, ${addr.ward}, ${addr.district}, ${addr.province}`
      : 'N/A';

    return `
      <div class="p-6 border border-outline-variant rounded-xl bg-white space-y-4 hover:border-primary/20 transition-all custom-shadow">
        <div class="flex flex-wrap justify-between items-center gap-2 border-b border-outline-variant pb-3">
          <div>
            <span class="font-bold text-primary">Mã đơn: #PVK${order.id}</span>
            <span class="text-body-sm text-on-surface-variant ml-4">${formatDate(order.created_at)}</span>
          </div>
          <span class="px-3 py-1 rounded-full text-label-sm font-bold ${getStatusBadgeClass(order.status)}">${translateStatus(order.status)}</span>
        </div>
        <div class="flex justify-between items-center gap-4 flex-wrap">
          <div class="space-y-1">
            <p class="text-body-sm text-on-surface-variant"><strong>Địa chỉ nhận hàng:</strong> ${window.escapeHTML(addrStr)}</p>
            ${order.note ? `<p class="text-body-sm text-on-surface-variant"><strong>Ghi chú:</strong> ${window.escapeHTML(order.note)}</p>` : ''}
          </div>
          <div class="text-right">
            <p class="text-body-sm text-on-surface-variant">Tổng thanh toán</p>
            <p class="text-headline-sm font-bold text-primary">${formatVND(order.total_amount)}</p>
          </div>
        </div>
        <div class="flex justify-between items-center pt-2">
          <div>
            ${order.status === 'pending' ? `
              <button class="px-4 py-2 border border-error text-error hover:bg-error-container/20 rounded-full text-label-sm font-bold transition-all" data-action="cancel-order" data-id="${order.id}">Hủy đơn hàng</button>
            ` : ''}
          </div>
          <button class="px-4 py-2 bg-surface-container text-primary hover:bg-surface-container-high rounded-full text-label-sm font-bold transition-all" data-action="view-order-detail" data-id="${order.id}">Xem chi tiết</button>
        </div>
      </div>
    `;
  }).join('');
}

// Global Order Filtering function
window.filterOrders = function(status) {
  const buttons = document.querySelectorAll('#order-filters .filter-btn');
  buttons.forEach(btn => {
    btn.className = 'px-4 py-1.5 hover:bg-surface-container text-on-surface-variant rounded-full text-label-sm font-bold transition-all filter-btn whitespace-nowrap';
  });

  const targetEvent = window.event;
  if (targetEvent && targetEvent.currentTarget) {
    targetEvent.currentTarget.className = 'px-4 py-1.5 bg-secondary-container text-on-secondary-container rounded-full text-label-sm font-bold active-filter filter-btn whitespace-nowrap';
  } else {
    const btn = Array.from(buttons).find(b => b.getAttribute('onclick')?.includes(status));
    if (btn) {
      btn.className = 'px-4 py-1.5 bg-secondary-container text-on-secondary-container rounded-full text-label-sm font-bold active-filter filter-btn whitespace-nowrap';
    }
  }

  renderOrders(status);
};

// Show Order Detail Modal Function
async function showOrderDetail(orderId) {
  const modal = document.getElementById('order-detail-modal');
  const content = document.getElementById('order-detail-content');
  if (!modal || !content) return;

  content.innerHTML = `
    <div class="flex justify-center items-center py-12">
      <span class="material-symbols-outlined animate-spin text-[36px] text-primary">sync</span>
    </div>
  `;
  modal.style.display = 'flex';

  const res = await window.api.get(`/orders/${orderId}`);
  if (res.success) {
    const order = res.data;
    const addr = order.shipping_address;
    const addrStr = addr 
      ? `${addr.name} - ${addr.phone}, ${addr.street}, ${addr.ward}, ${addr.district}, ${addr.province}`
      : 'N/A';

    let itemsHtml = (order.items || []).map(item => {
      const subtotal = item.unit_price * item.quantity;
      
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
        <div class="flex justify-between items-center gap-4 py-3 border-b border-outline-variant">
          <div class="flex gap-4 items-center">
            <div class="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center overflow-hidden flex-shrink-0">
              <img class="w-full h-full object-cover" src="${window.escapeHTML(imageUrl)}" alt="${window.escapeHTML(item.name)}" onerror="this.src='https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'"/>
            </div>
            <div>
              <p class="text-label-md font-bold text-on-surface">${window.escapeHTML(item.name)}</p>
              <p class="text-body-sm text-on-surface-variant">${formatVND(item.unit_price)} x ${item.quantity}</p>
            </div>
          </div>
          <span class="text-label-md font-bold text-on-surface">${formatVND(subtotal)}</span>
        </div>
      `;
    }).join('');

    const subtotalPrice = (order.items || []).reduce((acc, curr) => acc + (curr.unit_price * curr.quantity), 0);
    const shippingFee = order.total_amount >= 300000 ? 0 : 15000;

    content.innerHTML = `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-xl text-body-sm">
          <div>
            <p class="text-on-surface-variant"><strong>Mã đơn hàng:</strong> #PVK${order.id}</p>
            <p class="text-on-surface-variant"><strong>Thời gian đặt:</strong> ${formatDate(order.created_at)}</p>
          </div>
          <div class="text-right">
            <p class="text-on-surface-variant"><strong>Trạng thái:</strong> <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadgeClass(order.status)}">${translateStatus(order.status)}</span></p>
          </div>
        </div>

        <div class="border border-outline-variant rounded-xl p-4 space-y-1">
          <h4 class="font-bold text-primary text-body-md">Thông tin giao nhận</h4>
          <p class="text-body-sm text-on-surface-variant"><strong>Địa chỉ nhận:</strong> ${window.escapeHTML(addrStr)}</p>
          ${order.note ? `<p class="text-body-sm text-on-surface-variant"><strong>Ghi chú đơn:</strong> ${window.escapeHTML(order.note)}</p>` : ''}
        </div>

        <div>
          <h4 class="font-bold text-primary text-body-md mb-2">Danh sách sản phẩm</h4>
          <div class="max-h-60 overflow-y-auto px-1">
            ${itemsHtml}
          </div>
        </div>

        <div class="space-y-2 border-t border-outline-variant pt-3">
          <div class="flex justify-between text-body-sm text-on-surface-variant">
            <span>Tạm tính</span>
            <span>${formatVND(subtotalPrice)}</span>
          </div>
          <div class="flex justify-between text-body-sm text-on-surface-variant">
            <span>Phí vận chuyển</span>
            <span>${shippingFee === 0 ? 'Miễn phí' : formatVND(shippingFee)}</span>
          </div>
          <div class="flex justify-between text-headline-sm font-bold text-primary pt-2 border-t border-dashed border-outline-variant">
            <span>Tổng thanh toán</span>
            <span>${formatVND(order.total_amount)}</span>
          </div>
        </div>
      </div>
    `;
  } else {
    content.innerHTML = `<p class="text-error font-bold py-6 text-center">${res.message || 'Lỗi tải chi tiết đơn hàng.'}</p>`;
  }
}

// Utility Functions
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function translateStatus(status) {
  const map = {
    'pending': 'Chờ xác nhận',
    'confirmed': 'Đã xác nhận',
    'processing': 'Đang xử lý',
    'shipping': 'Đang giao hàng',
    'delivered': 'Đã giao hàng',
    'cancelled': 'Đã hủy'
  };
  return map[status] || status;
}

function getStatusBadgeClass(status) {
  const map = {
    'pending': 'bg-amber-100 text-amber-800',
    'confirmed': 'bg-blue-100 text-blue-800',
    'processing': 'bg-purple-100 text-purple-800',
    'shipping': 'bg-indigo-100 text-indigo-800',
    'delivered': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800'
  };
  return map[status] || 'bg-gray-100 text-gray-800';
}

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}
