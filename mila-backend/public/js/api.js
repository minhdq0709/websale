const API_BASE_URL = '/api/v1';

// Global custom toast notification system
const toast = {
  show(message, type = 'success') {
    // Check if container exists, if not create it
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full';
      document.body.appendChild(container);
    }

    const toastEl = document.createElement('div');
    // Premium style utilizing custom CSS Tailwind design
    const bgClass = type === 'success' ? 'bg-primary-container text-white' : (type === 'error' ? 'bg-error text-white' : 'bg-surface-container-high text-on-surface');
    const icon = type === 'success' ? 'check_circle' : (type === 'error' ? 'error' : 'info');

    toastEl.className = `${bgClass} flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg border border-white/10 glass-effect transform translate-x-full transition-all duration-300 ease-out opacity-0`;
    toastEl.innerHTML = `
      <span class="material-symbols-outlined">${icon}</span>
      <div class="flex-grow text-body-sm font-bold font-body-sm">${message}</div>
      <button class="text-white/60 hover:text-white transition-colors">
        <span class="material-symbols-outlined text-[18px]">close</span>
      </button>
    `;

    // Close button click listener
    toastEl.querySelector('button').addEventListener('click', () => {
      toastEl.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => toastEl.remove(), 300);
    });

    container.appendChild(toastEl);

    // Slide in
    setTimeout(() => {
      toastEl.classList.remove('translate-x-full', 'opacity-0');
    }, 10);

    // Auto remove
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => toastEl.remove(), 300);
      }
    }, 4000);
  },
  success(message) { this.show(message, 'success'); },
  error(message) { this.show(message, 'error'); },
  info(message) { this.show(message, 'info'); }
};

// Queue to hold requests that are waiting for a new token during a refresh operation
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token) {
  refreshSubscribers.map(cb => cb(token));
  refreshSubscribers = [];
}

const api = {
  async request(url, options = {}) {
    // 1. Prepare headers
    options.headers = options.headers || {};
    
    // Convert body to JSON if it's an object and not FormData
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      options.body = JSON.stringify(options.body);
      options.headers['Content-Type'] = 'application/json';
    }

    const token = localStorage.getItem('accessToken');
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    // Allow credential cookies (for refresh token HttpOnly cookie)
    options.credentials = options.credentials || 'include';

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, options);
      const data = await response.json();

      // 2. Handle unauthorized errors (Token Expired)
      if (response.status === 401 && data.code === 'TOKEN_EXPIRED') {
        if (!isRefreshing) {
          isRefreshing = true;
          
          try {
            // Call refresh API
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include'
            });
            const refreshData = await refreshRes.json();

            if (refreshRes.ok && refreshData.success) {
              const newToken = refreshData.data.token;
              localStorage.setItem('accessToken', newToken);
              isRefreshing = false;
              onRefreshed(newToken);
            } else {
              // Refresh token is expired too - Force logout
              isRefreshing = false;
              localStorage.removeItem('accessToken');
              localStorage.removeItem('user');
              toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
              setTimeout(() => {
                window.location.href = '/login.html';
              }, 1500);
              throw new Error('REFRESH_TOKEN_EXPIRED');
            }
          } catch (refreshErr) {
            isRefreshing = false;
            throw refreshErr;
          }
        }

        // Return a promise that waits for the token to be refreshed and then retries the request
        const retryOriginalRequest = new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            options.headers['Authorization'] = `Bearer ${newToken}`;
            resolve(fetch(`${API_BASE_URL}${url}`, options).then(res => res.json()));
          });
        });

        return retryOriginalRequest;
      }

      return data;
    } catch (error) {
      console.error(`API Error on ${url}:`, error);
      return {
        success: false,
        message: error.message || 'Lỗi kết nối tới hệ thống.',
        code: 'NETWORK_ERROR'
      };
    }
  },

  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  },

  async post(url, body, options = {}) {
    return this.request(url, { ...options, method: 'POST', body });
  },

  async put(url, body, options = {}) {
    return this.request(url, { ...options, method: 'PUT', body });
  },

  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  },

  async patch(url, body, options = {}) {
    return this.request(url, { ...options, method: 'PATCH', body });
  }
};

// Export to window object for global access
window.api = api;
window.toast = toast;

// Security utility: Escape HTML to prevent XSS
window.escapeHTML = function (str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
};
