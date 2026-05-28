document.addEventListener('DOMContentLoaded', () => {
  // If user is already logged in, redirect to index
  if (window.auth && window.auth.isLoggedIn()) {
    window.location.href = '/index.html';
    return;
  }

  // Bind register form submit
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegisterSubmit);
  }

  // Social signup button feedback
  document.querySelectorAll('.social-signup-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.toast.info('Tính năng đăng ký mạng xã hội đang được phát triển.');
    });
  });

  // Background Image Parallax Effect on Mouse Move
  document.addEventListener('mousemove', (e) => {
    const img = document.getElementById('parallax-bg');
    if (!img) return;
    const x = (e.clientX - window.innerWidth / 2) / 80;
    const y = (e.clientY - window.innerHeight / 2) / 80;
    img.style.transform = `scale(1.1) translate(${x}px, ${y}px)`;
  });
});

/**
 * Handle form submission for registering new account
 */
async function handleRegisterSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const termsChecked = document.getElementById('terms').checked;

  // Validation
  if (name.length < 2) {
    window.toast.error('Họ và tên phải dài ít nhất 2 ký tự.');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    window.toast.error('Địa chỉ Email không hợp lệ.');
    return;
  }

  // Vietnam phone regex: ^(0[3|5|7|8|9])([0-9]{8})$
  const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/;
  if (!phoneRegex.test(phone)) {
    window.toast.error('Số điện thoại không đúng định dạng (Ví dụ: 0901234567)');
    return;
  }

  if (password.length < 6) {
    window.toast.error('Mật khẩu phải dài tối thiểu 6 ký tự.');
    return;
  }

  if (password !== confirmPassword) {
    window.toast.error('Mật khẩu xác nhận không trùng khớp.');
    return;
  }

  if (!termsChecked) {
    window.toast.error('Bạn cần đồng ý với các Điều khoản & Chính sách.');
    return;
  }

  const registerBtn = document.getElementById('btn-register');
  registerBtn.disabled = true;
  registerBtn.innerHTML = `
    <span class="material-symbols-outlined animate-spin text-[20px] mr-1 align-middle">sync</span>
    Đang tạo tài khoản...
  `;

  const payload = { name, email, phone, password };
  const response = await window.api.post('/auth/register', payload);

  if (response.success) {
    window.toast.success('Đăng ký thành công! Đang chuyển hướng đến trang đăng nhập...');
    
    // Redirect to login page after 1.5 seconds
    setTimeout(() => {
      window.location.href = `/login.html?email=${encodeURIComponent(email)}`;
    }, 1500);
  } else {
    window.toast.error(response.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại.');
    registerBtn.disabled = false;
    registerBtn.innerHTML = 'Đăng Ký Tài Khoản';
  }
}
