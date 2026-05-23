// Handles login and registration pages
document.addEventListener('DOMContentLoaded', () => {
  // Check if already logged in and redirect to home
  if (window.auth.isLoggedIn()) {
    window.location.href = '/index.html';
    return;
  }

  // --- Password Visibility Toggle ---
  const togglePasswordBtn = document.getElementById('login-toggle-password');
  const loginPasswordInput = document.getElementById('login-password');

  if (togglePasswordBtn && loginPasswordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = loginPasswordInput.type === 'password';
      loginPasswordInput.type = isPassword ? 'text' : 'password';
      
      const iconSpan = togglePasswordBtn.querySelector('span');
      if (iconSpan) {
        iconSpan.innerText = isPassword ? 'visibility_off' : 'visibility';
      }
    });
  }

  // --- Handle Login Form Submission ---
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const usernameInput = document.getElementById('login-username');
      const passwordInput = document.getElementById('login-password');

      if (!usernameInput || !passwordInput) return;

      const email = usernameInput.value.trim();
      const password = passwordInput.value;

      // Basic client-side checks
      if (!email.includes('@')) {
        window.toast.error('Vui lòng nhập địa chỉ email hợp lệ.');
        return;
      }
      if (password.length < 6) {
        window.toast.error('Mật khẩu phải chứa ít nhất 6 ký tự.');
        return;
      }

      try {
        const res = await window.api.post('/auth/login', { email, password });
        
        if (res.success && res.data) {
          window.toast.success(res.message || 'Đăng nhập thành công!');
          
          // Save session
          window.auth.saveSession(res.data.user, res.data.token);

          // Get redirect url from query params
          const urlParams = new URLSearchParams(window.location.search);
          const redirect = urlParams.get('redirect');
          
          setTimeout(() => {
            if (redirect) {
              window.location.href = decodeURIComponent(redirect);
            } else {
              window.location.href = '/index.html';
            }
          }, 800);
        }
      } catch (error) {
        console.error('Login error:', error);
        // Error toast will be shown automatically by api.js
      }
    });
  }

  // --- Handle Registration Form Submission ---
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('register-name');
      const emailInput = document.getElementById('register-email');
      const phoneInput = document.getElementById('register-phone');
      const passwordInput = document.getElementById('register-password');
      const confirmPasswordInput = document.getElementById('register-confirm-password');

      if (!nameInput || !emailInput || !phoneInput || !passwordInput || !confirmPasswordInput) return;

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const phone = phoneInput.value.trim();
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      // Frontend validations
      if (name.length < 2) {
        window.toast.error('Họ và tên phải chứa ít nhất 2 ký tự.');
        return;
      }
      if (!email.includes('@')) {
        window.toast.error('Vui lòng nhập địa chỉ email hợp lệ.');
        return;
      }
      // VN Mobile formatting check
      const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/;
      if (!phoneRegex.test(phone)) {
        window.toast.error('Số điện thoại không hợp lệ (Vui lòng nhập định dạng Việt Nam, ví dụ: 0901234567).');
        return;
      }
      if (password.length < 6) {
        window.toast.error('Mật khẩu phải chứa ít nhất 6 ký tự.');
        return;
      }
      if (password !== confirmPassword) {
        window.toast.error('Mật khẩu xác nhận không khớp.');
        return;
      }

      try {
        const res = await window.api.post('/auth/register', {
          name,
          email,
          phone,
          password
        });

        if (res.success) {
          window.toast.success(res.message || 'Đăng ký tài khoản thành công!');
          
          // Switch to login tab and prefill email
          if (typeof window.switchTab === 'function') {
            window.switchTab('login');
          }
          
          const usernameInput = document.getElementById('login-username');
          if (usernameInput) {
            usernameInput.value = email;
          }
          
          // Reset register form
          registerForm.reset();
        }
      } catch (error) {
        console.error('Registration error:', error);
        // Error toast is handled by api.js
      }
    });
  }
});
