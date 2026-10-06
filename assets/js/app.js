'use strict';

/**
 * Sunny Edu - Frontend shell
 * ------------------------------------------------------------
 * API_URL để trống ở bản khung. Khi có Google Apps Script,
 * điền URL /exec vào đây và triển khai action public submitLead.
 * Endpoint GAS được xem là PUBLIC; mọi validation/rate limit/business
 * rule phải kiểm tra lại phía server theo GAS SECURITY STANDARD v2.1.
 */
const APP_CONFIG = Object.freeze({
  API_URL: '',
  LEAD_ACTION: 'submitLead',
  HERO_INTERVAL_MS: 6500
});

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function showToast(title, message, type = 'info', timeout = 4200) {
  const stack = $('#toastStack');
  if (!stack) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = document.createElement('div');
  icon.className = 'toast-icon';
  icon.textContent = type === 'success' ? '✓' : type === 'error' ? '!' : 'i';

  const copy = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = title;
  const p = document.createElement('p');
  p.textContent = message;
  copy.append(strong, p);

  toast.append(icon, copy);
  stack.appendChild(toast);
  window.setTimeout(() => toast.remove(), timeout);
}

function initHeader() {
  const header = $('#siteHeader');
  const menuToggle = $('#menuToggle');
  const mobileNav = $('#mobileNav');

  const syncHeader = () => header?.classList.toggle('scrolled', window.scrollY > 8);
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  menuToggle?.addEventListener('click', () => {
    const open = !mobileNav.classList.contains('open');
    mobileNav.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.textContent = open ? '✕' : '☰';
  });

  $$('#mobileNav a').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      document.body.classList.remove('menu-open');
      menuToggle?.setAttribute('aria-expanded', 'false');
      if (menuToggle) menuToggle.textContent = '☰';
    });
  });
}

function initHeroSlider() {
  const slides = $$('.hero-slide');
  const dotsRoot = $('#heroDots');
  if (!slides.length || !dotsRoot) return;

  let current = 0;
  let timer = null;

  const dots = slides.map((_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `dot${index === 0 ? ' active' : ''}`;
    button.setAttribute('aria-label', `Banner ${index + 1}`);
    button.addEventListener('click', () => {
      goTo(index);
      restart();
    });
    dotsRoot.appendChild(button);
    return button;
  });

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function restart() {
    if (timer) clearInterval(timer);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(() => goTo(current + 1), APP_CONFIG.HERO_INTERVAL_MS);
  }

  restart();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && timer) clearInterval(timer);
    else restart();
  });
}

function applyOptionalImages() {
  $$('[data-image]').forEach(el => {
    const path = String(el.dataset.image || '').trim();
    if (!path) return;

    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      el.style.backgroundImage = `url("${path.replace(/"/g, '%22')}")`;
      el.classList.add('has-image');
      const label = $('.slot-label', el);
      if (label) label.style.opacity = '0';
    };
    // Nếu ảnh chưa được bổ sung, giữ nguyên gradient placeholder.
    image.src = path;
  });
}

function normalizePhone(value) {
  return String(value || '').replace(/[\s.()-]/g, '');
}

function validateLead(data) {
  if (data.studentName.length < 2 || data.studentName.length > 80) {
    return 'Vui lòng nhập họ tên học viên hợp lệ.';
  }

  const phone = normalizePhone(data.phone);
  if (!/^(?:\+?84|0)\d{8,10}$/.test(phone)) {
    return 'Vui lòng kiểm tra lại số điện thoại.';
  }

  const year = Number(data.birthYear);
  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(year) || year < 1950 || year > currentYear) {
    return 'Vui lòng nhập năm sinh hợp lệ.';
  }

  return '';
}

async function submitLeadToServer(payload) {
  if (!APP_CONFIG.API_URL) {
    // Bản khung: chưa ghi dữ liệu đi đâu cả.
    await new Promise(resolve => setTimeout(resolve, 550));
    return { ok: true, demo: true };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(APP_CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: APP_CONFIG.LEAD_ACTION, ...payload }),
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

function initLeadForm() {
  const form = $('#leadForm');
  const submit = $('#leadSubmit');
  if (!form || !submit) return;

  let submitting = false;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;

    const formData = new FormData(form);
    const payload = {
      studentName: String(formData.get('studentName') || '').trim(),
      phone: normalizePhone(formData.get('phone')),
      birthYear: String(formData.get('birthYear') || '').trim(),
      course: String(formData.get('course') || '').trim(),
      source: 'sunnyedu.pages.dev',
      submittedAt: new Date().toISOString()
    };

    const validationError = validateLead(payload);
    if (validationError) {
      showToast('Thông tin chưa hợp lệ', validationError, 'error');
      return;
    }

    submitting = true;
    submit.disabled = true;
    submit.classList.add('is-loading');
    $('.btn-text', submit).textContent = 'Đang gửi...';

    try {
      const result = await submitLeadToServer(payload);
      if (!result || result.ok !== true) {
        throw new Error('SERVER_REJECTED');
      }

      if (result.demo) {
        showToast(
          'Khung giao diện đã sẵn sàng',
          'Form đang ở chế độ demo, chưa kết nối Google Apps Script nên chưa lưu dữ liệu.',
          'success',
          5600
        );
      } else {
        showToast('Đăng ký thành công', 'Sunny Edu đã nhận thông tin và sẽ liên hệ sớm.', 'success');
        form.reset();
      }
    } catch (error) {
      console.error('Lead submit failed:', error?.message || error);
      showToast('Chưa gửi được thông tin', 'Vui lòng thử lại sau hoặc liên hệ Sunny Edu qua hotline.', 'error');
    } finally {
      submitting = false;
      submit.disabled = false;
      submit.classList.remove('is-loading');
      $('.btn-text', submit).textContent = 'Đăng ký ngay';
    }
  });
}

function initAnchors() {
  $$('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', event => {
      const id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;

      event.preventDefault();
      const headerHeight = $('#siteHeader')?.offsetHeight || 0;
      const y = target.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .catch(error => console.warn('Service Worker registration failed:', error));
  });
}

function init() {
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  initHeader();
  initHeroSlider();
  applyOptionalImages();
  initLeadForm();
  initAnchors();
  registerServiceWorker();
}

document.addEventListener('DOMContentLoaded', init);
