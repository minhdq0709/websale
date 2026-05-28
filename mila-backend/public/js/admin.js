// State management for admin dashboard
let adminState = {
  activeTab: 'overview',
  products: [],
  categories: [],
  orders: [],
  users: [],
  orderFilter: 'all'
};

// Map status to Vietnamese name and premium color badges
const statusMap = {
  'pending': { text: 'Chờ xử lý', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  'confirmed': { text: 'Đã xác nhận', color: 'text-sky-600 bg-sky-50 border-sky-200' },
  'processing': { text: 'Đang xử lý', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  'shipping': { text: 'Đang giao hàng', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  'delivered': { text: 'Đã giao hàng', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  'cancelled': { text: 'Đã hủy', color: 'text-rose-600 bg-rose-50 border-rose-200' }
};

// Map roles
const roleMap = {
  'admin': 'Quản trị viên',
  'staff': 'Nhân viên',
  'customer': 'Khách hàng'
};

document.addEventListener('DOMContentLoaded', () => {
  // Initialization
  loadAdminDashboard();
});

/**
 * Main function to load all relevant initial data for admin
 */
async function loadAdminDashboard() {
  const user = window.auth.getUser();
  if (!user) return;

  // Load categories first as products need them for dropdown mapping
  await loadAllCategories();
  
  // Switch to initial tab which is overview
  switchTab(adminState.activeTab);
}

/**
 * Tab switching function
 */
async function switchTab(tabId) {
  adminState.activeTab = tabId;
  
  // 1. Update UI active button
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.className = 'flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all text-label-md text-left admin-tab-btn';
  });
  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  if (activeBtn) {
    activeBtn.className = 'flex items-center gap-3 px-4 py-3 rounded-lg text-primary font-bold bg-surface-container transition-all text-label-md text-left admin-tab-btn';
  }

  // 2. Hide all panels, show active
  document.querySelectorAll('.admin-panel').forEach(panel => {
    panel.classList.add('hidden');
  });
  const activePanel = document.getElementById(`panel-${tabId}`);
  if (activePanel) {
    activePanel.classList.remove('hidden');
  }

  // 3. Load data for specific tab
  if (tabId === 'overview') {
    await loadOverviewStats();
  } else if (tabId === 'products') {
    await loadAdminProducts();
  } else if (tabId === 'categories') {
    await loadAllCategories();
  } else if (tabId === 'orders') {
    await loadAdminOrders();
  } else if (tabId === 'users') {
    await loadAdminUsers();
  }
}

// ==========================================
// 1. OVERVIEW STATISTICS TAB PANEL
// ==========================================

async function loadOverviewStats() {
  const user = window.auth.getUser();
  // Reports API is limited to admin role only
  if (user.role !== 'admin') {
    document.getElementById('panel-overview').innerHTML = `
      <div class="py-12 text-center text-on-surface-variant">
        <span class="material-symbols-outlined text-[48px] text-primary mb-3">lock_open</span>
        <p class="font-bold text-body-lg">Hạn chế quyền hạn</p>
        <p class="text-body-sm max-w-md mx-auto">Màn hình báo cáo doanh thu & biểu đồ chỉ khả dụng cho Quản trị viên tối cao (Admin).</p>
      </div>
    `;
    return;
  }

  const res = await window.api.get('/admin/reports');
  if (!res.success) {
    window.toast.error('Lỗi khi tải dữ liệu báo cáo thống kê');
    return;
  }

  const data = res.data;

  // Bind key stats
  document.getElementById('stat-revenue').innerText = formatVND(data.totalRevenue);
  document.getElementById('stat-customers').innerText = data.totalCustomers;
  
  // Calculate total orders
  let totalOrdersCount = 0;
  if (data.statusBreakdown && data.statusBreakdown.length > 0) {
    totalOrdersCount = data.statusBreakdown.reduce((sum, item) => sum + item.count, 0);
  }
  document.getElementById('stat-orders').innerText = totalOrdersCount;

  // Bind status breakdown rows
  const statusBody = document.getElementById('stat-status-rows');
  if (statusBody) {
    if (!data.statusBreakdown || data.statusBreakdown.length === 0) {
      statusBody.innerHTML = `<tr><td colspan="3" class="py-4 text-center text-outline">Chưa có đơn hàng nào</td></tr>`;
    } else {
      statusBody.innerHTML = data.statusBreakdown.map(item => {
        const mapped = statusMap[item.status] || { text: item.status, color: 'bg-surface-container' };
        return `
          <tr class="border-b border-surface-container-high hover:bg-surface-container-low transition-all">
            <td class="py-3">
              <span class="px-2.5 py-1 text-xs rounded-full border font-bold ${mapped.color}">${mapped.text}</span>
            </td>
            <td class="py-3 text-center font-bold">${item.count} đơn</td>
            <td class="py-3 text-right font-bold text-secondary">${formatVND(item.amount || 0)}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // Bind monthly revenue rows
  const monthlyBody = document.getElementById('stat-monthly-rows');
  if (monthlyBody) {
    if (!data.monthlyRevenue || data.monthlyRevenue.length === 0) {
      monthlyBody.innerHTML = `<tr><td colspan="3" class="py-4 text-center text-outline">Không có doanh thu tháng nào</td></tr>`;
    } else {
      monthlyBody.innerHTML = data.monthlyRevenue.map(item => `
        <tr class="border-b border-surface-container-high hover:bg-surface-container-low transition-all">
          <td class="py-3 font-bold text-on-surface">Tháng ${item.month}</td>
          <td class="py-3 text-center font-bold">${item.count} đơn</td>
          <td class="py-3 text-right font-bold text-primary">${formatVND(item.amount || 0)}</td>
        </tr>
      `).join('');
    }
  }
}

// ==========================================
// 2. PRODUCTS TAB PANEL
// ==========================================

async function loadAdminProducts() {
  const tableRows = document.getElementById('admin-product-table-rows');
  if (!tableRows) return;

  // Render skeleton
  tableRows.innerHTML = Array(4).fill(0).map(() => `
    <tr>
      <td class="px-6 py-4"><div class="w-12 h-12 bg-surface-container-highest rounded animate-pulse"></div></td>
      <td class="px-6 py-4"><div class="h-4 bg-surface-container-highest rounded w-3/4 animate-pulse"></div></td>
      <td class="px-6 py-4"><div class="h-4 bg-surface-container-highest rounded w-1/2 animate-pulse"></div></td>
      <td class="px-6 py-4"><div class="h-4 bg-surface-container-highest rounded w-1/3 animate-pulse"></div></td>
      <td class="px-6 py-4"><div class="h-4 bg-surface-container-highest rounded w-8 animate-pulse"></div></td>
      <td class="px-6 py-4 text-center"><div class="h-6 bg-surface-container-highest rounded-full w-16 mx-auto animate-pulse"></div></td>
      <td class="px-6 py-4"><div class="h-8 bg-surface-container-highest rounded w-20 ml-auto animate-pulse"></div></td>
    </tr>
  `).join('');

  // Fetch products (public list with query logic bypass limit)
  const res = await window.api.get('/products?limit=1000');
  if (!res.success) {
    window.toast.error('Lỗi khi tải danh sách sản phẩm');
    return;
  }

  adminState.products = res.data.products;
  renderProductsTable(adminState.products);
}

function renderProductsTable(productsList) {
  const tableRows = document.getElementById('admin-product-table-rows');
  if (!tableRows) return;

  if (productsList.length === 0) {
    tableRows.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-on-surface-variant font-bold">Không tìm thấy sản phẩm nào phù hợp.</td></tr>`;
    return;
  }

  tableRows.innerHTML = productsList.map(prod => {
    const imageUrl = (prod.images && prod.images.length > 0) ? prod.images[0] : '🥬';
    // Check if imageUrl is emoji or actual URL link
    const imageHTML = (imageUrl.length <= 4)
      ? `<div class="w-12 h-12 rounded bg-surface-container-low flex items-center justify-center text-2xl border border-outline-variant">${imageUrl}</div>`
      : `<img class="w-12 h-12 rounded object-cover border border-outline-variant" src="${window.escapeHTML(imageUrl)}" alt="${window.escapeHTML(prod.name)}"/>`;

    const categoryName = prod.category_name || 'Nông sản';
    const originalPrice = prod.price;
    const isSale = prod.sale_price !== null;
    const priceText = isSale 
      ? `<span class="text-error font-bold">${formatVND(prod.sale_price)}</span> <span class="text-outline text-xs line-through block">${formatVND(originalPrice)}</span>`
      : `<span class="font-bold text-on-surface">${formatVND(originalPrice)}</span>`;

    return `
      <tr class="hover:bg-surface-container-low transition-all">
        <td class="px-6 py-4">${imageHTML}</td>
        <td class="px-6 py-4 font-bold text-on-surface">${window.escapeHTML(prod.name)}</td>
        <td class="px-6 py-4 text-on-surface-variant">${window.escapeHTML(categoryName)}</td>
        <td class="px-6 py-4">${priceText} / ${window.escapeHTML(prod.unit)}</td>
        <td class="px-6 py-4 text-center font-bold ${prod.stock === 0 ? 'text-error' : (prod.stock <= 10 ? 'text-amber-600' : 'text-on-surface')}">${prod.stock}</td>
        <td class="px-6 py-4 text-center">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold border ${prod.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}">
            ${prod.is_active ? 'Bán chạy' : 'Tạm ngưng'}
          </span>
        </td>
        <td class="px-6 py-4 text-right">
          <div class="flex gap-2 justify-end">
            <button onclick="editProduct(${prod.id})" class="p-2 text-primary hover:bg-primary-container/20 rounded-lg transition-all" title="Chỉnh sửa">
              <span class="material-symbols-outlined text-[20px]">edit</span>
            </button>
            <button onclick="deleteProduct(${prod.id})" class="p-2 text-error hover:bg-error-container/20 rounded-lg transition-all" title="Xóa">
              <span class="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminProducts() {
  const keyword = document.getElementById('product-search-input').value.trim().toLowerCase();
  const categoryFilter = document.getElementById('product-category-filter').value;

  const filtered = adminState.products.filter(prod => {
    const matchesSearch = prod.name.toLowerCase().includes(keyword);
    const matchesCategory = categoryFilter === "" || prod.category_slug === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  renderProductsTable(filtered);
}

// Product Modals control
function openProductModal(prodId = null) {
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('product-modal-title');
  const form = document.getElementById('product-form');
  
  form.reset();
  document.getElementById('prod-id').value = '';
  
  // Populate category dropdown
  const categorySelect = document.getElementById('prod-category');
  categorySelect.innerHTML = adminState.categories.map(cat => `
    <option value="${cat.id}">${window.escapeHTML(cat.name)}</option>
  `).join('');

  if (prodId) {
    title.innerText = 'Chỉnh Sửa Sản Phẩm';
    const prod = adminState.products.find(p => p.id === prodId);
    if (prod) {
      document.getElementById('prod-id').value = prod.id;
      document.getElementById('prod-name').value = prod.name;
      document.getElementById('prod-category').value = prod.category_id;
      document.getElementById('prod-price').value = prod.price;
      document.getElementById('prod-sale-price').value = prod.sale_price || '';
      document.getElementById('prod-unit').value = prod.unit;
      document.getElementById('prod-stock').value = prod.stock;
      document.getElementById('prod-image').value = (prod.images && prod.images.length > 0) ? prod.images[0] : '';
      document.getElementById('prod-desc').value = prod.description || '';
      document.getElementById('prod-active').checked = prod.is_active === 1 || prod.is_active === true;
    }
  } else {
    title.innerText = 'Thêm Sản Phẩm Mới';
  }

  modal.classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('product-modal').classList.add('hidden');
}

async function saveProduct(event) {
  event.preventDefault();

  const id = document.getElementById('prod-id').value;
  const name = document.getElementById('prod-name').value.trim();
  const category_id = parseInt(document.getElementById('prod-category').value);
  const price = parseFloat(document.getElementById('prod-price').value);
  const sale_price_val = document.getElementById('prod-sale-price').value.trim();
  const sale_price = sale_price_val ? parseFloat(sale_price_val) : null;
  const unit = document.getElementById('prod-unit').value.trim();
  const stock = parseInt(document.getElementById('prod-stock').value);
  const image = document.getElementById('prod-image').value.trim();
  const description = document.getElementById('prod-desc').value.trim();
  const is_active = document.getElementById('prod-active').checked;

  const images = image ? [image] : ['🥬']; // default emoji

  const payload = { category_id, name, price, sale_price, unit, stock, description, images, is_active };

  let res;
  if (id) {
    // Edit Product API
    res = await window.api.put(`/admin/products/${id}`, payload);
  } else {
    // Add Product API
    res = await window.api.post('/admin/products', payload);
  }

  if (res.success) {
    window.toast.success(id ? 'Đã cập nhật sản phẩm thành công!' : 'Đã thêm sản phẩm mới thành công!');
    closeProductModal();
    loadAdminProducts(); // Reload table
  } else {
    window.toast.error(res.message || 'Lưu dữ liệu sản phẩm thất bại.');
  }
}

async function editProduct(id) {
  openProductModal(id);
}

async function deleteProduct(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này ra khỏi hệ thống không?')) return;

  const res = await window.api.delete(`/admin/products/${id}`);
  if (res.success) {
    window.toast.success('Đã xóa sản phẩm thành công!');
    loadAdminProducts();
  } else {
    window.toast.error(res.message || 'Không thể xóa sản phẩm lúc này.');
  }
}

// ==========================================
// 3. CATEGORIES TAB PANEL
// ==========================================

async function loadAllCategories() {
  const filterDropdown = document.getElementById('product-category-filter');
  const tableRows = document.getElementById('admin-category-table-rows');

  const res = await window.api.get('/products/categories');
  if (!res.success) {
    window.toast.error('Lỗi khi tải danh mục sản phẩm');
    return;
  }

  adminState.categories = res.data;

  // 1. Sync category sidebar search select filters if we are on products tab
  if (filterDropdown) {
    const currentVal = filterDropdown.value;
    filterDropdown.innerHTML = `<option value="">Tất cả danh mục</option>` + adminState.categories.map(cat => `
      <option value="${window.escapeHTML(cat.slug)}">${window.escapeHTML(cat.name)}</option>
    `).join('');
    filterDropdown.value = currentVal;
  }

  // 2. Render categories rows in categories tab
  if (tableRows) {
    tableRows.innerHTML = adminState.categories.map(cat => `
      <tr class="hover:bg-surface-container-low transition-all">
        <td class="px-6 py-4 font-bold text-primary">${cat.id}</td>
        <td class="px-6 py-4 font-bold text-on-surface">${window.escapeHTML(cat.name)}</td>
        <td class="px-6 py-4 text-on-surface-variant">${window.escapeHTML(cat.slug)}</td>
        <td class="px-6 py-4 text-2xl">${cat.icon || '🥬'}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex gap-2 justify-end">
            <button onclick="editCategory(${cat.id})" class="p-2 text-primary hover:bg-primary-container/20 rounded-lg transition-all" title="Chỉnh sửa">
              <span class="material-symbols-outlined text-[20px]">edit</span>
            </button>
            <button onclick="deleteCategory(${cat.id})" class="p-2 text-error hover:bg-error-container/20 rounded-lg transition-all" title="Xóa">
              <span class="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }
}

function openCategoryModal(catId = null) {
  const modal = document.getElementById('category-modal');
  const title = document.getElementById('category-modal-title');
  const form = document.getElementById('category-form');
  
  form.reset();
  document.getElementById('cat-id').value = '';

  if (catId) {
    title.innerText = 'Chỉnh Sửa Danh Mục';
    const cat = adminState.categories.find(c => c.id === catId);
    if (cat) {
      document.getElementById('cat-id').value = cat.id;
      document.getElementById('cat-name').value = cat.name;
    }
  } else {
    title.innerText = 'Thêm Danh Mục Mới';
  }

  modal.classList.remove('hidden');
}

function closeCategoryModal() {
  document.getElementById('category-modal').classList.add('hidden');
}

async function saveCategory(event) {
  event.preventDefault();

  const id = document.getElementById('cat-id').value;
  const name = document.getElementById('cat-name').value.trim();

  let res;
  if (id) {
    res = await window.api.put(`/admin/categories/${id}`, { name });
  } else {
    res = await window.api.post('/admin/categories', { name });
  }

  if (res.success) {
    window.toast.success(id ? 'Đã cập nhật danh mục!' : 'Đã tạo danh mục mới!');
    closeCategoryModal();
    loadAllCategories();
  } else {
    window.toast.error(res.message || 'Lưu danh mục thất bại.');
  }
}

async function editCategory(id) {
  openCategoryModal(id);
}

async function deleteCategory(id) {
  if (!confirm('Bạn có muốn xóa danh mục này? Tất cả sản phẩm thuộc danh mục có thể bị ảnh hưởng.')) return;

  const res = await window.api.delete(`/admin/categories/${id}`);
  if (res.success) {
    window.toast.success('Đã xóa danh mục thành công!');
    loadAllCategories();
  } else {
    window.toast.error(res.message || 'Không thể xóa danh mục này.');
  }
}

// ==========================================
// 4. ORDERS TAB PANEL
// ==========================================

async function loadAdminOrders() {
  const tableRows = document.getElementById('admin-order-table-rows');
  if (!tableRows) return;

  // Skeletal load
  tableRows.innerHTML = Array(3).fill(0).map(() => `
    <tr>
      <td class="px-6 py-4"><div class="h-4 bg-surface-container-highest rounded w-16 animate-pulse"></div></td>
      <td class="px-6 py-4"><div class="h-4 bg-surface-container-highest rounded w-28 animate-pulse"></div></td>
      <td class="px-6 py-4"><div class="h-4 bg-surface-container-highest rounded w-20 animate-pulse"></div></td>
      <td class="px-6 py-4"><div class="h-4 bg-surface-container-highest rounded w-24 animate-pulse"></div></td>
      <td class="px-6 py-4"><div class="h-6 bg-surface-container-highest rounded-full w-20 animate-pulse"></div></td>
      <td class="px-6 py-4"><div class="h-8 bg-surface-container-highest rounded w-16 animate-pulse ml-auto"></div></td>
    </tr>
  `).join('');

  let query = '/admin/orders?limit=200';
  if (adminState.orderFilter !== 'all') {
    query += `&status=${adminState.orderFilter}`;
  }

  const res = await window.api.get(query);
  if (!res.success) {
    window.toast.error('Lỗi khi tải danh sách đơn hàng');
    return;
  }

  adminState.orders = res.data.orders;
  renderOrdersTable(adminState.orders);
}

function renderOrdersTable(ordersList) {
  const tableRows = document.getElementById('admin-order-table-rows');
  if (!tableRows) return;

  if (ordersList.length === 0) {
    tableRows.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-on-surface-variant font-bold">Không có đơn hàng nào phù hợp với bộ lọc.</td></tr>`;
    return;
  }

  tableRows.innerHTML = ordersList.map(ord => {
    const formattedDate = new Date(ord.created_at).toLocaleString('vi-VN');
    const mapped = statusMap[ord.status] || { text: ord.status, color: 'text-outline bg-surface-container border-outline-variant' };
    
    // Status update selector
    // finalized statuses (delivered, cancelled) can no longer change status
    const isFinalized = ord.status === 'delivered' || ord.status === 'cancelled';
    
    let statusOptionsHTML = '';
    if (isFinalized) {
      statusOptionsHTML = `<span class="px-2.5 py-1 text-xs rounded-full border font-bold ${mapped.color}">${mapped.text}</span>`;
    } else {
      statusOptionsHTML = `
        <select onchange="updateOrderStatus(${ord.id}, this.value)" class="text-xs font-bold px-2 py-1 rounded-lg border focus:ring-1 focus:ring-primary ${mapped.color} cursor-pointer outline-none">
          <option value="pending" ${ord.status === 'pending' ? 'selected' : ''}>Chờ xử lý</option>
          <option value="confirmed" ${ord.status === 'confirmed' ? 'selected' : ''}>Đã xác nhận</option>
          <option value="processing" ${ord.status === 'processing' ? 'selected' : ''}>Đang xử lý</option>
          <option value="shipping" ${ord.status === 'shipping' ? 'selected' : ''}>Đang giao hàng</option>
          <option value="delivered" ${ord.status === 'delivered' ? 'selected' : ''}>Đã giao hàng</option>
          <option value="cancelled" ${ord.status === 'cancelled' ? 'selected' : ''}>Đã hủy</option>
        </select>
      `;
    }

    return `
      <tr class="hover:bg-surface-container-low transition-all">
        <td class="px-6 py-4 font-bold text-primary">#${ord.id}</td>
        <td class="px-6 py-4">
          <p class="font-bold text-on-surface">${window.escapeHTML(ord.customer_name)}</p>
          <p class="text-xs text-on-surface-variant">User ID: ${ord.user_id}</p>
        </td>
        <td class="px-6 py-4 text-on-surface-variant text-xs">${formattedDate}</td>
        <td class="px-6 py-4 font-bold text-secondary">${formatVND(ord.total_amount)}</td>
        <td class="px-6 py-4">${statusOptionsHTML}</td>
        <td class="px-6 py-4 text-right">
          <button onclick="viewOrderDetail(${ord.id})" class="px-4 py-2 border border-outline text-primary hover:bg-primary-container/20 rounded-xl text-xs font-bold transition-all shadow-sm">
            Xem chi tiết
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminOrders(status) {
  adminState.orderFilter = status;
  
  // Update UI filters tabs
  document.querySelectorAll('.order-filter-tab').forEach(btn => {
    btn.className = 'px-4 py-2 rounded-full text-label-sm font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest order-filter-tab whitespace-nowrap';
  });

  // Find exact trigger button
  const tabs = document.querySelectorAll('.order-filter-tab');
  tabs.forEach(tab => {
    if (tab.getAttribute('onclick').includes(status)) {
      tab.className = 'px-4 py-2 rounded-full text-label-sm font-bold bg-primary text-on-primary order-filter-tab shadow-sm whitespace-nowrap';
    }
  });

  loadAdminOrders();
}

async function updateOrderStatus(orderId, newStatus) {
  if (!confirm(`Bạn có chắc muốn cập nhật trạng thái đơn hàng #${orderId} sang '${statusMap[newStatus].text}' không?`)) {
    loadAdminOrders(); // Reload to reset select UI to real value
    return;
  }

  const res = await window.api.put(`/admin/orders/${orderId}/status`, { status: newStatus });
  if (res.success) {
    window.toast.success(`Đã cập nhật trạng thái đơn hàng #${orderId} thành công.`);
    loadAdminOrders();
  } else {
    window.toast.error(res.message || 'Lỗi khi cập nhật trạng thái đơn hàng.');
    loadAdminOrders();
  }
}

async function viewOrderDetail(orderId) {
  const modal = document.getElementById('order-detail-modal');
  const title = document.getElementById('order-detail-modal-title');
  const content = document.getElementById('order-detail-content');

  title.innerText = `Chi Tiết Đơn Hàng #${orderId}`;
  content.innerHTML = `<div class="py-8 text-center text-outline animate-pulse">Đang tải chi tiết đơn hàng...</div>`;
  modal.classList.remove('hidden');

  // Fetch single order details
  const res = await window.api.get(`/orders/${orderId}`);
  if (!res.success) {
    content.innerHTML = `<div class="py-8 text-center text-error font-bold">Không thể tải thông tin đơn hàng này.</div>`;
    return;
  }

  const ord = res.data;
  const address = ord.shipping_address || {};
  const formattedDate = new Date(ord.created_at).toLocaleString('vi-VN');
  const mapped = statusMap[ord.status] || { text: ord.status, color: 'text-outline bg-surface-container' };

  let itemsHTML = ord.items.map(item => {
    const subtotal = item.quantity * item.unit_price;
    const imageUrl = (item.images && item.images.length > 0) ? item.images[0] : '🥬';
    const imageHTML = (imageUrl.length <= 4)
      ? `<div class="w-12 h-12 rounded bg-surface-container-low flex items-center justify-center text-xl">${imageUrl}</div>`
      : `<img class="w-12 h-12 rounded object-cover border border-outline-variant" src="${window.escapeHTML(imageUrl)}" alt=""/>`;

    return `
      <div class="flex items-center justify-between py-3 border-b border-surface-container-high last:border-0">
        <div class="flex items-center gap-3">
          ${imageHTML}
          <div>
            <h5 class="font-bold text-on-surface text-body-sm">${window.escapeHTML(item.name)}</h5>
            <p class="text-xs text-on-surface-variant">${formatVND(item.unit_price)} / ${window.escapeHTML(item.unit)}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-bold text-body-sm">x${item.quantity}</p>
          <p class="font-bold text-secondary text-body-sm">${formatVND(subtotal)}</p>
        </div>
      </div>
    `;
  }).join('');

  content.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-container-low p-4 rounded-xl border border-outline-variant">
      <div class="space-y-1">
        <p class="text-xs text-on-surface-variant font-bold">Thông tin giao hàng</p>
        <p class="text-body-sm font-bold text-on-surface">${window.escapeHTML(address.name || 'Người nhận')}</p>
        <p class="text-body-sm text-on-surface-variant">${window.escapeHTML(address.phone || 'SĐT liên lạc')}</p>
        <p class="text-body-sm text-on-surface-variant leading-relaxed">${window.escapeHTML(address.detail || 'Địa chỉ chi tiết')}</p>
      </div>
      <div class="space-y-1">
        <p class="text-xs text-on-surface-variant font-bold">Hóa đơn</p>
        <p class="text-body-sm text-on-surface-variant">Ngày mua: <span class="text-on-surface font-bold">${formattedDate}</span></p>
        <p class="text-body-sm text-on-surface-variant">Trạng thái: 
          <span class="px-2 py-0.5 text-xs rounded-full border font-bold ${mapped.color}">${mapped.text}</span>
        </p>
        <p class="text-body-sm text-on-surface-variant">Ghi chú: <span class="italic text-on-surface">${window.escapeHTML(ord.note || 'Không có ghi chú')}</span></p>
      </div>
    </div>

    <div class="space-y-2">
      <h4 class="font-bold text-primary text-body-md border-b border-outline-variant pb-2">Danh sách mặt hàng</h4>
      <div class="divide-y divide-surface-container-high">
        ${itemsHTML}
      </div>
    </div>

    <div class="flex justify-between items-center bg-primary/5 p-4 rounded-xl border border-primary/20">
      <span class="font-bold text-primary text-body-md">Tổng giá trị hóa đơn:</span>
      <span class="font-bold text-primary text-headline-sm">${formatVND(ord.total_amount)}</span>
    </div>
  `;
}

function closeOrderDetailModal() {
  document.getElementById('order-detail-modal').classList.add('hidden');
}

// ==========================================
// 5. MEMBERS TAB PANEL
// ==========================================

async function loadAdminUsers() {
  const tableRows = document.getElementById('admin-user-table-rows');
  if (!tableRows) return;

  // Skeleton
  tableRows.innerHTML = Array(3).fill(0).map(() => `
    <tr>
      <td class="px-6 py-4"><div class="h-4 bg-surface-container-highest rounded w-8 animate-pulse"></div></td>
      <td class="px-6 py-4"><div class="h-4 bg-surface-container-highest rounded w-24 animate-pulse"></div></td>
      <td class="px-6 py-4"><div class="h-4 bg-surface-container-highest rounded w-32 animate-pulse"></div></td>
      <td class="px-6 py-4"><div class="h-4 bg-surface-container-highest rounded w-20 animate-pulse"></div></td>
      <td class="px-6 py-4"><div class="h-4 bg-surface-container-highest rounded w-16 animate-pulse"></div></td>
      <td class="px-6 py-4 text-center"><div class="h-6 bg-surface-container-highest rounded-full w-12 mx-auto animate-pulse"></div></td>
      <td class="px-6 py-4"><div class="h-8 bg-surface-container-highest rounded w-16 animate-pulse ml-auto"></div></td>
    </tr>
  `).join('');

  const res = await window.api.get('/admin/users');
  if (!res.success) {
    window.toast.error('Lỗi khi tải danh sách người dùng');
    return;
  }

  adminState.users = res.data.users;
  renderUsersTable(adminState.users);
}

function renderUsersTable(usersList) {
  const tableRows = document.getElementById('admin-user-table-rows');
  if (!tableRows) return;

  const currentAdmin = window.auth.getUser();

  tableRows.innerHTML = usersList.map(usr => {
    const isSelf = currentAdmin && currentAdmin.id === usr.id;
    
    // Status lock toggle HTML
    // Prevent locking oneself
    const toggleHTML = isSelf 
      ? `<span class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">Đang trực</span>`
      : `
        <button onclick="toggleUserStatus(${usr.id}, '${usr.role}', ${usr.is_active === 1 || usr.is_active === true ? 0 : 1})" 
                class="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm ${usr.is_active === 1 || usr.is_active === true ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}">
          ${usr.is_active === 1 || usr.is_active === true ? 'Hoạt động' : 'Bị Khóa'}
        </button>
      `;

    // Role editing dropdown
    let roleSelectHTML = '';
    if (isSelf) {
      roleSelectHTML = `<span class="font-bold text-primary">${roleMap[usr.role]}</span>`;
    } else {
      roleSelectHTML = `
        <select onchange="changeUserRole(${usr.id}, this.value, ${usr.is_active})" class="text-xs font-bold py-1 px-2 bg-white rounded-lg border border-outline-variant focus:ring-1 focus:ring-primary outline-none cursor-pointer">
          <option value="customer" ${usr.role === 'customer' ? 'selected' : ''}>Khách hàng</option>
          <option value="staff" ${usr.role === 'staff' ? 'selected' : ''}>Nhân viên</option>
          <option value="admin" ${usr.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      `;
    }

    return `
      <tr class="hover:bg-surface-container-low transition-all">
        <td class="px-6 py-4 font-bold text-primary">${usr.id}</td>
        <td class="px-6 py-4 font-bold text-on-surface">${window.escapeHTML(usr.name)} ${isSelf ? '<span class="text-xs text-secondary ml-1 font-normal">(Tôi)</span>' : ''}</td>
        <td class="px-6 py-4 text-on-surface-variant text-xs">${window.escapeHTML(usr.email || 'N/A')}</td>
        <td class="px-6 py-4 text-on-surface-variant text-xs">${window.escapeHTML(usr.phone || 'N/A')}</td>
        <td class="px-6 py-4">${roleSelectHTML}</td>
        <td class="px-6 py-4 text-center">${toggleHTML}</td>
        <td class="px-6 py-4 text-right text-outline text-xs">
          ${new Date(usr.created_at).toLocaleDateString('vi-VN')}
        </td>
      </tr>
    `;
  }).join('');
}

async function toggleUserStatus(userId, role, newActiveValue) {
  const statusWord = newActiveValue === 1 ? 'mở khóa' : 'khóa';
  if (!confirm(`Bạn có chắc chắn muốn ${statusWord} tài khoản của thành viên này không?`)) return;

  const res = await window.api.put(`/admin/users/${userId}/status`, { role, is_active: newActiveValue === 1 });
  if (res.success) {
    window.toast.success(`Đã cập nhật trạng thái tài khoản thành công.`);
    loadAdminUsers();
  } else {
    window.toast.error(res.message || 'Lỗi khi cập nhật trạng thái tài khoản.');
  }
}

async function changeUserRole(userId, newRole, currentActiveValue) {
  if (!confirm(`Bạn có chắc chắn muốn chuyển vai trò của người dùng này sang '${roleMap[newRole]}' không?`)) {
    loadAdminUsers(); // reset UI select dropdown
    return;
  }

  const res = await window.api.put(`/admin/users/${userId}/status`, { role: newRole, is_active: currentActiveValue === 1 });
  if (res.success) {
    window.toast.success(`Đã thay đổi vai trò người dùng thành công.`);
    loadAdminUsers();
  } else {
    window.toast.error(res.message || 'Lỗi khi cập nhật vai trò người dùng.');
    loadAdminUsers();
  }
}

// ==========================================
// UTILITIES
// ==========================================

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}
