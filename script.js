/* ═══════════════════════════════════════════════════════════════════
   MarketIQ Pro — script.js
   Complete JavaScript Engine
   Author: MarketIQ Pro
   Version: 1.0.0
   ═══════════════════════════════════════════════════════════════════

   TABLE OF CONTENTS:
   01. CONFIGURATION & CONSTANTS
   02. UTILITY FUNCTIONS
   03. FORMATTING HELPERS
   04. VALIDATION ENGINE
   05. TOAST NOTIFICATION SYSTEM
   06. THEME SYSTEM
   07. LOADER SYSTEM
   08. TOOLTIP SYSTEM
   09. MODAL SYSTEM
   10. FAQ ACCORDION
   11. NAVIGATION (HEADER + MOBILE + TABS)
   12. COUNT-UP ANIMATION
   13. CHART ENGINE
   14. CALCULATOR — ROI
   15. CALCULATOR — ROAS
   16. CALCULATOR — CPA
   17. CALCULATOR — CPM
   18. CALCULATOR — CTR
   19. CALCULATOR — BREAK-EVEN
   20. CALCULATOR — PROFIT MARGIN
   21. DASHBOARD ENGINE
   22. PDF EXPORT ENGINE
   23. LOCAL STORAGE ENGINE
   24. COPY TO CLIPBOARD
   25. CLEAR ALL SYSTEM
   26. FOOTER LINKS
   27. INITIALIZATION
   ═══════════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════════
   01. CONFIGURATION & CONSTANTS
   ═══════════════════════════════════════════════════════════════════ */

/** @type {Object} Application configuration */
const CONFIG = {
  APP_NAME:          'MarketIQ Pro',
  VERSION:           '1.0.0',
  STORAGE_KEY:       'marketiq_pro_data',
  THEME_KEY:         'marketiq_pro_theme',
  TOAST_DURATION:    4000,
  CHART_ANIMATION:   800,
  DEBOUNCE_DELAY:    300,
  COUNT_UP_DURATION: 1200,
};

/** @type {Object} All calculator IDs */
const CALC_IDS = ['roi', 'roas', 'cpa', 'cpm', 'ctr', 'breakeven', 'margin'];

/** @type {Object} Chart instances registry */
const CHART_INSTANCES = {};

/** @type {Object} Calculated results registry */
const RESULTS_STORE = {
  roi:       null,
  roas:      null,
  cpa:       null,
  cpm:       null,
  ctr:       null,
  breakeven: null,
  margin:    null,
};

/** @type {Object} Chart color palettes per theme */
const CHART_COLORS = {
  primary:    '#6C63FF',
  secondary:  '#00D4AA',
  accent:     '#FF6B35',
  blue:       '#3B82F6',
  amber:      '#F59E0B',
  violet:     '#8B5CF6',
  emerald:    '#10B981',
  danger:     '#FF4444',
  success:    '#00C851',
  warning:    '#FFBB33',
  alphas: {
    primary:   'rgba(108,99,255,0.15)',
    secondary: 'rgba(0,212,170,0.15)',
    accent:    'rgba(255,107,53,0.15)',
    blue:      'rgba(59,130,246,0.15)',
    amber:     'rgba(245,158,11,0.15)',
    violet:    'rgba(139,92,246,0.15)',
    emerald:   'rgba(16,185,129,0.15)',
  },
};


/* ═══════════════════════════════════════════════════════════════════
   02. UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Safely parse a float value — returns null if invalid
 * @param {string|number} val
 * @returns {number|null}
 */
const safeParseFloat = (val) => {
  if (val === '' || val === null || val === undefined) return null;
  const parsed = parseFloat(val);
  return isFinite(parsed) ? parsed : null;
};

/**
 * Debounce a function call
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
const debounce = (fn, delay) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Clamp a number between min and max
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/**
 * Get element by ID safely
 * @param {string} id
 * @returns {HTMLElement|null}
 */
const $ = (id) => document.getElementById(id);

/**
 * Get element by selector safely
 * @param {string} selector
 * @param {HTMLElement} [scope=document]
 * @returns {HTMLElement|null}
 */
const $$ = (selector, scope = document) => scope.querySelector(selector);

/**
 * Get all elements by selector safely
 * @param {string} selector
 * @param {HTMLElement} [scope=document]
 * @returns {NodeList}
 */
const $all = (selector, scope = document) => scope.querySelectorAll(selector);

/**
 * Check if current theme is dark
 * @returns {boolean}
 */
const isDarkTheme = () =>
  document.documentElement.getAttribute('data-theme') === 'dark';


/* ═══════════════════════════════════════════════════════════════════
   03. FORMATTING HELPERS
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Format a number as currency string
 * @param {number} val
 * @param {number} [decimals=2]
 * @returns {string}
 */
const formatCurrency = (val, decimals = 2) => {
  if (!isFinite(val)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency:              'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
};

/**
 * Format a number as compact currency (e.g. $1.2M)
 * @param {number} val
 * @returns {string}
 */
const formatCompact = (val) => {
  if (!isFinite(val)) return '$0';
  if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (Math.abs(val) >= 1_000)     return `$${(val / 1_000).toFixed(1)}K`;
  return formatCurrency(val);
};

/**
 * Format a number as percentage string
 * @param {number} val
 * @param {number} [decimals=2]
 * @returns {string}
 */
const formatPercent = (val, decimals = 2) => {
  if (!isFinite(val)) return '0%';
  return `${val.toFixed(decimals)}%`;
};

/**
 * Format a number with commas
 * @param {number} val
 * @param {number} [decimals=0]
 * @returns {string}
 */
const formatNumber = (val, decimals = 0) => {
  if (!isFinite(val)) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
};

/**
 * Format ROAS as multiplier string
 * @param {number} val
 * @returns {string}
 */
const formatROAS = (val) => {
  if (!isFinite(val)) return '0x';
  return `${val.toFixed(2)}x`;
};


/* ═══════════════════════════════════════════════════════════════════
   04. VALIDATION ENGINE
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Show error on a form field
 * @param {HTMLInputElement} input
 * @param {HTMLElement} errorEl
 * @param {string} message
 */
const showFieldError = (input, errorEl, message) => {
  input.classList.add('input--error');
  input.classList.remove('input--success');
  if (errorEl) {
    errorEl.textContent = message;
  }
  input.setAttribute('aria-invalid', 'true');
};

/**
 * Clear error on a form field
 * @param {HTMLInputElement} input
 * @param {HTMLElement} errorEl
 */
const clearFieldError = (input, errorEl) => {
  input.classList.remove('input--error');
  input.classList.add('input--success');
  if (errorEl) {
    errorEl.textContent = '';
  }
  input.setAttribute('aria-invalid', 'false');
};

/**
 * Reset a form field to neutral state
 * @param {HTMLInputElement} input
 * @param {HTMLElement} errorEl
 */
const resetFieldState = (input, errorEl) => {
  input.classList.remove('input--error', 'input--success');
  if (errorEl) errorEl.textContent = '';
  input.removeAttribute('aria-invalid');
};

/**
 * Validate a single numeric field
 * @param {HTMLInputElement} input
 * @param {HTMLElement} errorEl
 * @param {Object} options
 * @returns {number|null} - parsed value or null if invalid
 */
const validateNumericField = (input, errorEl, options = {}) => {
  const {
    label    = 'This field',
    min      = null,
    max      = null,
    required = true,
    integer  = false,
  } = options;

  const rawVal = input.value.trim();

  if (rawVal === '') {
    if (required) {
      showFieldError(input, errorEl, `${label} is required.`);
      return null;
    }
    clearFieldError(input, errorEl);
    return 0;
  }

  const parsed = safeParseFloat(rawVal);

  if (parsed === null || isNaN(parsed)) {
    showFieldError(input, errorEl, `${label} must be a valid number.`);
    return null;
  }

  if (integer && !Number.isInteger(parsed)) {
    showFieldError(input, errorEl, `${label} must be a whole number.`);
    return null;
  }

  if (min !== null && parsed < min) {
    showFieldError(input, errorEl, `${label} must be at least ${min}.`);
    return null;
  }

  if (max !== null && parsed > max) {
    showFieldError(input, errorEl, `${label} cannot exceed ${formatNumber(max)}.`);
    return null;
  }

  clearFieldError(input, errorEl);
  return parsed;
};


/* ═══════════════════════════════════════════════════════════════════
   05. TOAST NOTIFICATION SYSTEM
   ═══════════════════════════════════════════════════════════════════ */

/** @type {Map<string, number>} Active toast timers */
const TOAST_TIMERS = new Map();

/**
 * Show a toast notification
 * @param {Object} options
 * @param {string} options.type    - 'success'|'error'|'warning'|'info'
 * @param {string} options.title
 * @param {string} options.message
 * @param {number} [options.duration]
 */
const showToast = ({ type = 'info', title = '', message = '', duration = CONFIG.TOAST_DURATION }) => {
  const container = $('toast-container');
  if (!container) return;

  const ICONS = {
    success: 'fa-circle-check',
    error:   'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info:    'fa-circle-info',
  };

  const id      = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const iconCls = ICONS[type] || ICONS.info;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.id        = id;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  toast.innerHTML = `
    <div class="toast__icon" aria-hidden="true">
      <i class="fa-solid ${iconCls}"></i>
    </div>
    <div class="toast__body">
      ${title   ? `<div class="toast__title">${title}</div>` : ''}
      ${message ? `<div class="toast__message">${message}</div>` : ''}
    </div>
    <button type="button" class="toast__close" aria-label="Dismiss notification">
      <i class="fa-solid fa-xmark" aria-hidden="true"></i>
    </button>
  `;

  container.appendChild(toast);

  const dismissToast = () => {
    if (TOAST_TIMERS.has(id)) {
      clearTimeout(TOAST_TIMERS.get(id));
      TOAST_TIMERS.delete(id);
    }
    toast.classList.add('toast--exit');
    toast.addEventListener('animationend', () => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, { once: true });
  };

  toast.querySelector('.toast__close').addEventListener('click', dismissToast);

  const timer = setTimeout(dismissToast, duration);
  TOAST_TIMERS.set(id, timer);
};


/* ═══════════════════════════════════════════════════════════════════
   06. THEME SYSTEM
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Apply a theme to the document
 * @param {'dark'|'light'} theme
 */
const applyTheme = (theme) => {
  const validTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', validTheme);
  const icon = $('theme-icon');
  if (icon) {
    icon.className = validTheme === 'dark'
      ? 'fa-solid fa-moon'
      : 'fa-solid fa-sun';
  }
  try {
    localStorage.setItem(CONFIG.THEME_KEY, validTheme);
  } catch (_) { /* storage unavailable */ }

  /* Update Chart.js defaults for new theme */
  updateChartDefaults();

  /* Re-render any existing charts with new theme */
  rerenderAllCharts();
};

/** Toggle between dark and light theme */
const toggleTheme = () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
  showToast({
    type:    'info',
    title:   current === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode',
    message: `Switched to ${current === 'dark' ? 'light' : 'dark'} theme.`,
    duration: 2000,
  });
};

/** Load saved theme from localStorage */
const loadSavedTheme = () => {
  try {
    const saved = localStorage.getItem(CONFIG.THEME_KEY);
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved);
    }
  } catch (_) { /* storage unavailable */ }
};

/** Update Chart.js global defaults for current theme */
const updateChartDefaults = () => {
  const dark = isDarkTheme();
  Chart.defaults.color           = dark ? '#A0A0C0' : '#4A4A6A';
  Chart.defaults.borderColor     = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  Chart.defaults.font.family     = "'Inter', sans-serif";
  Chart.defaults.font.size       = 12;
  Chart.defaults.plugins.legend.labels.color = dark ? '#A0A0C0' : '#4A4A6A';
};

/**
 * Re-render all active charts after theme change
 */
const rerenderAllCharts = () => {
  Object.entries(RESULTS_STORE).forEach(([key, result]) => {
    if (!result) return;
    try {
      switch (key) {
        case 'roi':       renderROIChart(result);       break;
        case 'roas':      renderROASChart(result);      break;
        case 'cpa':       renderCPAChart(result);       break;
        case 'cpm':       renderCPMChart(result);       break;
        case 'ctr':       renderCTRChart(result);       break;
        case 'breakeven': renderBreakevenChart(result); break;
        case 'margin':    renderMarginChart(result);    break;
      }
    } catch (_) { /* chart not visible */ }
  });
  updateDashboardChart();
};


/* ═══════════════════════════════════════════════════════════════════
   07. LOADER SYSTEM
   ═══════════════════════════════════════════════════════════════════ */

/** Hide the loader screen after content is ready */
const hideLoader = () => {
  const loader = $('loader');
  if (!loader) return;
  setTimeout(() => {
    loader.classList.add('loader--hidden');
    loader.setAttribute('aria-hidden', 'true');
  }, 1800);
};


/* ═══════════════════════════════════════════════════════════════════
   08. TOOLTIP SYSTEM
   ═══════════════════════════════════════════════════════════════════ */

const tooltip    = $('global-tooltip') || (() => {
  const el = document.createElement('div');
  el.id        = 'global-tooltip';
  el.className = 'global-tooltip';
  el.setAttribute('role',       'tooltip');
  el.setAttribute('aria-hidden','true');
  document.body.appendChild(el);
  return el;
})();

let tooltipTarget = null;

/** Show tooltip near an element */
const showTooltip = (text, triggerEl) => {
  if (!text || !triggerEl) return;
  tooltip.textContent = text;
  tooltip.setAttribute('aria-hidden', 'false');
  tooltip.classList.add('tooltip--visible');
  tooltipTarget = triggerEl;
  positionTooltip(triggerEl);
};

/** Position tooltip relative to trigger element */
const positionTooltip = (triggerEl) => {
  const rect      = triggerEl.getBoundingClientRect();
  const tipWidth  = tooltip.offsetWidth  || 200;
  const tipHeight = tooltip.offsetHeight || 40;
  const vpWidth   = window.innerWidth;
  const vpHeight  = window.innerHeight;

  let top  = rect.bottom + window.scrollY + 8;
  let left = rect.left + window.scrollX + (rect.width / 2) - (tipWidth / 2);

  /* Clamp horizontally */
  left = clamp(left, 8, vpWidth - tipWidth - 8);

  /* Flip above if not enough space below */
  if (rect.bottom + tipHeight + 16 > vpHeight) {
    top = rect.top + window.scrollY - tipHeight - 8;
  }

  tooltip.style.top  = `${top}px`;
  tooltip.style.left = `${left}px`;
};

/** Hide tooltip */
const hideTooltip = () => {
  tooltip.classList.remove('tooltip--visible');
  tooltip.setAttribute('aria-hidden', 'true');
  tooltipTarget = null;
};

/** Initialize tooltip event listeners */
const initTooltips = () => {
  document.addEventListener('mouseover', (e) => {
    const btn = e.target.closest('.tooltip-btn[data-tooltip]');
    if (btn) {
      showTooltip(btn.dataset.tooltip, btn);
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('.tooltip-btn')) {
      hideTooltip();
    }
  });

  document.addEventListener('focusin', (e) => {
    const btn = e.target.closest('.tooltip-btn[data-tooltip]');
    if (btn) showTooltip(btn.dataset.tooltip, btn);
  });

  document.addEventListener('focusout', (e) => {
    if (e.target.closest('.tooltip-btn')) hideTooltip();
  });

  window.addEventListener('scroll', () => {
    if (tooltipTarget) positionTooltip(tooltipTarget);
  }, { passive: true });
};


/* ═══════════════════════════════════════════════════════════════════
   09. MODAL SYSTEM
   ═══════════════════════════════════════════════════════════════════ */

let pendingModalAction = null;

const openModal = (onConfirm) => {
  const modal = $('modal-clear');
  if (!modal) return;
  pendingModalAction = onConfirm;
  
  /* BUG FIX: यहाँ Modal को ज़बरदस्ती show कर रहे हैं */
  modal.hidden = false;
  modal.removeAttribute('hidden');
  modal.style.display = 'flex'; 

  const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (firstFocusable) firstFocusable.focus();

  document.body.style.overflow = 'hidden';
};

const closeModal = () => {
  const modal = $('modal-clear');
  if (!modal) return;
  
  /* BUG FIX: यहाँ Modal को 100% hide कर रहे हैं */
  modal.hidden = true;
  modal.setAttribute('hidden', 'true');
  modal.style.display = 'none';
  pendingModalAction = null;
  document.body.style.overflow = '';
  
  const clearBtn = $('clear-all-btn');
  if (clearBtn) clearBtn.focus();
};

const initModal = () => {
  const modal      = $('modal-clear');
  const cancelBtn  = $('modal-cancel');
  const confirmBtn = $('modal-confirm');
  const backdrop   = $('modal-backdrop');

  /* BUG FIX: पेज लोड होते ही Modal को छिपा कर रखना है */
  if (modal) {
    modal.hidden = true;
    modal.setAttribute('hidden', 'true');
    modal.style.display = 'none';
  }

  if (cancelBtn)  cancelBtn.addEventListener('click', closeModal);
  if (confirmBtn) confirmBtn.addEventListener('click', () => {
    if (typeof pendingModalAction === 'function') {
      try { pendingModalAction(); } catch (e) { console.error(e); }
    }
    closeModal();
  });
  if (backdrop) backdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.hidden) closeModal();
  });
};


/* ═══════════════════════════════════════════════════════════════════
   10. FAQ ACCORDION
   ═══════════════════════════════════════════════════════════════════ */

/** Initialize FAQ accordion with keyboard support */
const initFAQ = () => {
  const questions = $all('.faq-question');

  questions.forEach((btn) => {
    btn.addEventListener('click', () => {
      const expanded  = btn.getAttribute('aria-expanded') === 'true';
      const answerId  = btn.getAttribute('aria-controls');
      const answerEl  = $(answerId);

      if (!answerEl) return;

      /* Close all others */
      questions.forEach((otherBtn) => {
        if (otherBtn === btn) return;
        otherBtn.setAttribute('aria-expanded', 'false');
        const otherId = otherBtn.getAttribute('aria-controls');
        const otherEl = $(otherId);
        if (otherEl) otherEl.hidden = true;
      });

      /* Toggle current */
      btn.setAttribute('aria-expanded', String(!expanded));
      answerEl.hidden = expanded;
    });

    /* Keyboard: Space or Enter */
    btn.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        btn.click();
      }
    });
  });
};


/* ═══════════════════════════════════════════════════════════════════
   11. NAVIGATION (HEADER + MOBILE + TABS)
   ═══════════════════════════════════════════════════════════════════ */

/** Initialize sticky header scroll effect */
const initHeaderScroll = () => {
  const header = $('header');
  if (!header) return;

  const handleScroll = () => {
    header.classList.toggle('header--scrolled', window.scrollY > 20);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
};

/** Initialize mobile hamburger menu */
const initMobileMenu = () => {
  const hamburger  = $('hamburger');
  const mobileMenu = $('mobile-menu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.contains('hamburger--open');
    hamburger.classList.toggle('hamburger--open', !isOpen);
    hamburger.setAttribute('aria-expanded', String(!isOpen));
    mobileMenu.classList.toggle('mobile-menu--open', !isOpen);
    mobileMenu.setAttribute('aria-hidden', String(isOpen));

    /* Update tabindex of links */
    $all('.mobile-menu__link', mobileMenu).forEach((link) => {
      link.setAttribute('tabindex', isOpen ? '-1' : '0');
    });
  });

  /* Close menu when a link is clicked */
  $all('.mobile-menu__link', mobileMenu).forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('hamburger--open');
      hamburger.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.remove('mobile-menu--open');
      mobileMenu.setAttribute('aria-hidden', 'true');
      $all('.mobile-menu__link', mobileMenu).forEach(l => l.setAttribute('tabindex', '-1'));
    });
  });
};

/** Switch to a calculator tab by ID */
const switchTab = (tabId) => {
  if (!CALC_IDS.includes(tabId)) return;

  /* Update tab buttons */
  $all('.calc-tab').forEach((tab) => {
    const isActive = tab.dataset.tab === tabId;
    tab.classList.toggle('calc-tab--active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    tab.setAttribute('tabindex',      isActive ? '0' : '-1');
  });

  /* Update panels */
  $all('.calc-panel').forEach((panel) => {
    const isActive = panel.id === `panel-${tabId}`;
    if (isActive) {
      panel.hidden = false;
      panel.removeAttribute('hidden');
    } else {
      panel.hidden = true;
      panel.setAttribute('hidden', '');
    }
  });

  /* Scroll tab into view on mobile */
  const activeTab = $(`tab-${tabId}`);
  if (activeTab) {
    activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
};

/** Initialize calculator tab navigation */
const initCalcTabs = () => {
  $all('.calc-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });

    /* Arrow key navigation */
    tab.addEventListener('keydown', (e) => {
      const tabs     = Array.from($all('.calc-tab'));
      const curIndex = tabs.indexOf(tab);
      let newIndex   = curIndex;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        newIndex = (curIndex + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        newIndex = (curIndex - 1 + tabs.length) % tabs.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        newIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        newIndex = tabs.length - 1;
      }

      if (newIndex !== curIndex) {
        tabs[newIndex].focus();
        switchTab(tabs[newIndex].dataset.tab);
      }
    });
  });
};

/** Initialize input-clear buttons */
const initInputClearBtns = () => {
  $all('.input-clear').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrapper = btn.closest('.input-wrapper');
      if (!wrapper) return;
      const input = wrapper.querySelector('.form-input');
      if (!input) return;
      input.value = '';
      input.focus();
      const errorId = input.getAttribute('aria-describedby');
      if (errorId) {
        const errorEl = $(errorId);
        if (errorEl) resetFieldState(input, errorEl);
      } else {
        resetFieldState(input, null);
      }
    });
  });
};


/* ═══════════════════════════════════════════════════════════════════
   12. COUNT-UP ANIMATION
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Animate a counter from 0 to target
 * @param {HTMLElement} el
 * @param {number} target
 * @param {string} [suffix='']
 * @param {number} [duration]
 */
const animateCountUp = (el, target, suffix = '', duration = CONFIG.COUNT_UP_DURATION) => {
  if (!el || !isFinite(target)) return;
  const start     = performance.now();
  const startVal  = 0;

  const step = (timestamp) => {
    const elapsed  = timestamp - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); /* ease-out-cubic */
    const current  = Math.round(startVal + (target - startVal) * eased);
    el.textContent = formatNumber(current) + suffix;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = formatNumber(target) + suffix;
    }
  };

  requestAnimationFrame(step);
};

/** Initialize hero stats count-up when visible */
const initStatsCountUp = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseInt(el.dataset.count, 10);
      if (!isFinite(target)) return;
      animateCountUp(el, target);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  $all('[data-count]').forEach(el => observer.observe(el));
};


/* ═══════════════════════════════════════════════════════════════════
   13. CHART ENGINE
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Destroy an existing Chart.js instance
 * @param {string} chartKey
 */
const destroyChart = (chartKey) => {
  if (CHART_INSTANCES[chartKey]) {
    try {
      CHART_INSTANCES[chartKey].destroy();
    } catch (_) { /* already destroyed */ }
    delete CHART_INSTANCES[chartKey];
  }
};

/**
 * Get default Chart.js options (responsive, no border)
 * @param {boolean} [showLegend=true]
 * @returns {Object}
 */
const getBaseChartOptions = (showLegend = true) => {
  const dark   = isDarkTheme();
  const gridColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = dark ? '#A0A0C0' : '#4A4A6A';

  return {
    responsive:          true,
    maintainAspectRatio: false,
    animation: { duration: CONFIG.CHART_ANIMATION, easing: 'easeInOutQuart' },
    plugins: {
      legend: {
        display: showLegend,
        labels: {
          color:      textColor,
          padding:    16,
          font:       { size: 12, family: "'Inter', sans-serif" },
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: dark ? '#1E1E2E' : '#FFFFFF',
        titleColor:      dark ? '#FFFFFF' : '#0A0A1A',
        bodyColor:       dark ? '#A0A0C0' : '#4A4A6A',
        borderColor:     dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
        borderWidth:     1,
        padding:         12,
        cornerRadius:    10,
        boxPadding:      6,
        titleFont:       { weight: '600', size: 13 },
        bodyFont:        { size: 12 },
      },
    },
    scales: {
      x: {
        grid:  { color: gridColor, drawBorder: false },
        ticks: { color: textColor, font: { size: 11 } },
        border: { dash: [4, 4] },
      },
      y: {
        grid:  { color: gridColor, drawBorder: false },
        ticks: { color: textColor, font: { size: 11 } },
        border: { dash: [4, 4] },
      },
    },
  };
};

/**
 * Render ROI Chart — Doughnut
 * @param {Object} data
 */
const renderROIChart = (data) => {
  destroyChart('roi');
  const canvas = $('chart-roi');
  if (!canvas) return;

  const netProfit = data.revenue - data.investment;
  const ctx       = canvas.getContext('2d');
  const dark      = isDarkTheme();

  CHART_INSTANCES['roi'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Net Profit', 'Investment'],
      datasets: [{
        data:            [Math.max(netProfit, 0), data.investment],
        backgroundColor: [CHART_COLORS.primary, CHART_COLORS.alphas.primary],
        borderColor:     [CHART_COLORS.primary, dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'],
        borderWidth:     2,
        hoverOffset:     8,
      }],
    },
    options: {
      ...getBaseChartOptions(true),
      cutout: '65%',
      scales: {},
      plugins: {
        ...getBaseChartOptions(true).plugins,
        tooltip: {
          ...getBaseChartOptions(true).plugins.tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`,
          },
        },
      },
    },
  });
};

/**
 * Render ROAS Chart — Bar
 * @param {Object} data
 */
const renderROASChart = (data) => {
  destroyChart('roas');
  const canvas = $('chart-roas');
  if (!canvas) return;

  const ctx  = canvas.getContext('2d');
  const opts = getBaseChartOptions(false);

  CHART_INSTANCES['roas'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Ad Spend', 'Revenue Generated'],
      datasets: [{
        label:           'Amount ($)',
        data:            [data.adSpend, data.revenue],
        backgroundColor: [CHART_COLORS.alphas.accent, CHART_COLORS.alphas.secondary],
        borderColor:     [CHART_COLORS.accent,         CHART_COLORS.secondary],
        borderWidth:     2,
        borderRadius:    8,
        borderSkipped:   false,
      }],
    },
    options: {
      ...opts,
      plugins: {
        ...opts.plugins,
        tooltip: {
          ...opts.plugins.tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        ...opts.scales,
        y: {
          ...opts.scales.y,
          ticks: {
            ...opts.scales.y.ticks,
            callback: (val) => formatCompact(val),
          },
        },
      },
    },
  });
};

/**
 * Render CPA Chart — Bar (horizontal)
 * @param {Object} data
 */
const renderCPAChart = (data) => {
  destroyChart('cpa');
  const canvas = $('chart-cpa');
  if (!canvas) return;

  const ctx                = canvas.getContext('2d');
  const costPerConversion  = data.cpa;
  const totalConversions   = data.conversions;
  const spend              = data.adSpend;

  const opts = getBaseChartOptions(false);

  CHART_INSTANCES['cpa'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Total Ad Spend', 'CPA × Conversions', 'Cost per Conversion'],
      datasets: [{
        label:           'Value ($)',
        data:            [spend, costPerConversion * totalConversions, costPerConversion],
        backgroundColor: [
          CHART_COLORS.alphas.accent,
          CHART_COLORS.alphas.primary,
          CHART_COLORS.alphas.secondary,
        ],
        borderColor: [
          CHART_COLORS.accent,
          CHART_COLORS.primary,
          CHART_COLORS.secondary,
        ],
        borderWidth:   2,
        borderRadius:  8,
        borderSkipped: false,
      }],
    },
    options: {
      ...opts,
      indexAxis: 'y',
      plugins: {
        ...opts.plugins,
        tooltip: {
          ...opts.plugins.tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.x)}`,
          },
        },
      },
      scales: {
        x: {
          ...opts.scales.x,
          ticks: {
            ...opts.scales.x.ticks,
            callback: (val) => formatCompact(val),
          },
        },
        y: {
          ...opts.scales.y,
          grid: { display: false },
        },
      },
    },
  });
};

/**
 * Render CPM Chart — Doughnut
 * @param {Object} data
 */
const renderCPMChart = (data) => {
  destroyChart('cpm');
  const canvas = $('chart-cpm');
  if (!canvas) return;

  const ctx  = canvas.getContext('2d');
  const dark = isDarkTheme();

  /* Segments: cost for impressions shown vs theoretical remaining */
  const thousand    = 1000;
  const remainder   = Math.max(data.impressions - thousand, 0);

  CHART_INSTANCES['cpm'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['First 1,000 Impressions (CPM basis)', 'Remaining Impressions'],
      datasets: [{
        data: [
          Math.min(data.impressions, thousand),
          Math.max(data.impressions - thousand, 0),
        ],
        backgroundColor: [CHART_COLORS.blue, CHART_COLORS.alphas.blue],
        borderColor:     [CHART_COLORS.blue, dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'],
        borderWidth:     2,
        hoverOffset:     8,
      }],
    },
    options: {
      ...getBaseChartOptions(true),
      cutout: '65%',
      scales: {},
      plugins: {
        ...getBaseChartOptions(true).plugins,
        tooltip: {
          ...getBaseChartOptions(true).plugins.tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatNumber(ctx.parsed)} impressions`,
          },
        },
      },
    },
  });
};

/**
 * Render CTR Chart — Doughnut (Clicks vs Non-Clicks)
 * @param {Object} data
 */
const renderCTRChart = (data) => {
  destroyChart('ctr');
  const canvas = $('chart-ctr');
  if (!canvas) return;

  const ctx      = canvas.getContext('2d');
  const dark     = isDarkTheme();
  const nonClick = Math.max(data.impressions - data.clicks, 0);

  CHART_INSTANCES['ctr'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Clicks', 'Non-Clicks'],
      datasets: [{
        data:            [data.clicks, nonClick],
        backgroundColor: [CHART_COLORS.amber, CHART_COLORS.alphas.amber],
        borderColor:     [CHART_COLORS.amber, dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'],
        borderWidth:     2,
        hoverOffset:     8,
      }],
    },
    options: {
      ...getBaseChartOptions(true),
      cutout: '65%',
      scales: {},
      plugins: {
        ...getBaseChartOptions(true).plugins,
        tooltip: {
          ...getBaseChartOptions(true).plugins.tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatNumber(ctx.parsed)}`,
          },
        },
      },
    },
  });
};

/**
 * Render Break-even Chart — Line (Cost vs Revenue)
 * @param {Object} data
 */
const renderBreakevenChart = (data) => {
  destroyChart('breakeven');
  const canvas = $('chart-breakeven');
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  const opts   = getBaseChartOptions(true);
  const beUnits = data.units;

  /* Generate data points from 0 to 2× break-even */
  const maxUnits = Math.ceil(beUnits * 2) || 10;
  const POINTS   = 11;
  const step     = maxUnits / (POINTS - 1);
  const labels   = [];
  const totalCosts   = [];
  const totalRevenue = [];

  for (let i = 0; i < POINTS; i++) {
    const units = Math.round(step * i);
    labels.push(units);
    totalCosts.push(data.fixedCosts + data.variableCost * units);
    totalRevenue.push(data.sellingPrice * units);
  }

  CHART_INSTANCES['breakeven'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label:           'Total Revenue',
          data:            totalRevenue,
          borderColor:     CHART_COLORS.secondary,
          backgroundColor: CHART_COLORS.alphas.secondary,
          borderWidth:     2.5,
          pointRadius:     3,
          pointHoverRadius: 6,
          fill:            true,
          tension:         0.3,
        },
        {
          label:           'Total Costs',
          data:            totalCosts,
          borderColor:     CHART_COLORS.danger,
          backgroundColor: 'rgba(255,68,68,0.08)',
          borderWidth:     2.5,
          pointRadius:     3,
          pointHoverRadius: 6,
          fill:            true,
          tension:         0.3,
        },
      ],
    },
    options: {
      ...opts,
      plugins: {
        ...opts.plugins,
        tooltip: {
          ...opts.plugins.tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          ...opts.scales.x,
          title: {
            display: true,
            text:    'Units Sold',
            color:   isDarkTheme() ? '#A0A0C0' : '#4A4A6A',
            font:    { size: 11, weight: '600' },
          },
          ticks: {
            ...opts.scales.x.ticks,
            callback: (val, idx) => labels[idx],
          },
        },
        y: {
          ...opts.scales.y,
          title: {
            display: true,
            text:    'Amount ($)',
            color:   isDarkTheme() ? '#A0A0C0' : '#4A4A6A',
            font:    { size: 11, weight: '600' },
          },
          ticks: {
            ...opts.scales.y.ticks,
            callback: (val) => formatCompact(val),
          },
        },
      },
    },
  });
};

/**
 * Render Profit Margin Chart — Doughnut (Revenue breakdown)
 * @param {Object} data
 */
const renderMarginChart = (data) => {
  destroyChart('margin');
  const canvas = $('chart-margin');
  if (!canvas) return;

  const ctx  = canvas.getContext('2d');
  const dark = isDarkTheme();

  const netProfit   = Math.max(data.netProfit, 0);
  const cogs        = Math.max(data.cogs, 0);
  const opEx        = Math.max(data.operatingExpenses, 0);
  const taxInterest = Math.max(data.taxesInterest, 0);

  CHART_INSTANCES['margin'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Net Profit', 'COGS', 'Operating Expenses', 'Taxes & Interest'],
      datasets: [{
        data: [netProfit, cogs, opEx, taxInterest],
        backgroundColor: [
          CHART_COLORS.emerald,
          CHART_COLORS.alphas.accent,
          CHART_COLORS.alphas.blue,
          CHART_COLORS.alphas.amber,
        ],
        borderColor: [
          CHART_COLORS.emerald,
          CHART_COLORS.accent,
          CHART_COLORS.blue,
          CHART_COLORS.amber,
        ],
        borderWidth:  2,
        hoverOffset:  8,
      }],
    },
    options: {
      ...getBaseChartOptions(true),
      cutout: '60%',
      scales: {},
      plugins: {
        ...getBaseChartOptions(true).plugins,
        tooltip: {
          ...getBaseChartOptions(true).plugins.tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`,
          },
        },
      },
    },
  });
};

/**
 * Render combined dashboard overview chart
 */
const updateDashboardChart = () => {
  destroyChart('dashboard');
  const canvas = $('chart-dashboard');
  if (!canvas) return;

  const filled = Object.values(RESULTS_STORE).filter(Boolean);
  if (filled.length < 2) return;

  const dark  = isDarkTheme();
  const opts  = getBaseChartOptions(false);
  const labels = [];
  const values = [];
  const colors = [];
  const borders = [];

  if (RESULTS_STORE.roi) {
    labels.push('ROI (%)');
    values.push(parseFloat(RESULTS_STORE.roi.roi.toFixed(2)));
    colors.push(CHART_COLORS.alphas.primary);
    borders.push(CHART_COLORS.primary);
  }
  if (RESULTS_STORE.roas) {
    labels.push('ROAS (×10)');
    values.push(parseFloat((RESULTS_STORE.roas.roas * 10).toFixed(2)));
    colors.push(CHART_COLORS.alphas.secondary);
    borders.push(CHART_COLORS.secondary);
  }
  if (RESULTS_STORE.ctr) {
    labels.push('CTR (%)');
    values.push(parseFloat(RESULTS_STORE.ctr.ctr.toFixed(2)));
    colors.push(CHART_COLORS.alphas.amber);
    borders.push(CHART_COLORS.amber);
  }
  if (RESULTS_STORE.margin) {
    labels.push('Net Margin (%)');
    values.push(parseFloat(RESULTS_STORE.margin.netMargin.toFixed(2)));
    colors.push(CHART_COLORS.alphas.emerald);
    borders.push(CHART_COLORS.emerald);
  }

  if (labels.length < 2) return;

  CHART_INSTANCES['dashboard'] = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label:           'Metric Value',
        data:            values,
        backgroundColor: colors,
        borderColor:     borders,
        borderWidth:     2,
        borderRadius:    10,
        borderSkipped:   false,
      }],
    },
    options: {
      ...opts,
      plugins: {
        ...opts.plugins,
        legend: { display: false },
        tooltip: {
          ...opts.plugins.tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.parsed.y}`,
          },
        },
      },
      scales: {
        ...opts.scales,
        y: {
          ...opts.scales.y,
          beginAtZero: true,
        },
      },
    },
  });
};


/* ═══════════════════════════════════════════════════════════════════
   14. CALCULATOR — ROI
   Formula: ROI = ((Revenue - Investment) / Investment) × 100
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Get ROI performance rating
 * @param {number} roi
 * @returns {{label: string, cls: string, icon: string}}
 */
const getROIRating = (roi) => {
  if (roi >= 300)           return { label: '🚀 Excellent ROI',  cls: 'status--excellent', interpCls: 'interp--excellent', icon: 'fa-rocket',          msg: `Outstanding! Your campaign returned ${formatPercent(roi)} ROI. Every $1 invested brought back $${(1 + roi / 100).toFixed(2)}.` };
  if (roi >= 100)           return { label: '✅ Good ROI',       cls: 'status--good',      interpCls: 'interp--good',      icon: 'fa-circle-check',    msg: `Solid performance! ${formatPercent(roi)} ROI means you more than doubled your investment.` };
  if (roi >= 0)             return { label: '⚠️ Low ROI',        cls: 'status--warning',   interpCls: 'interp--warning',   icon: 'fa-triangle-exclamation', msg: `Marginally profitable at ${formatPercent(roi)} ROI. Look for ways to increase revenue or reduce costs.` };
  return                           { label: '❌ Negative ROI',   cls: 'status--poor',      interpCls: 'interp--poor',      icon: 'fa-circle-xmark',    msg: `Loss-making at ${formatPercent(roi)} ROI. Revenue did not cover investment. Review your strategy immediately.` };
};

/** Initialize ROI calculator */
const initROICalc = () => {
  const form = $('form-roi');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    calculateROI();
  });

  $('roi-reset').addEventListener('click', () => resetCalc('roi'));
};

/** Execute ROI calculation */
const calculateROI = () => {
  const revenueInput    = $('roi-revenue');
  const investmentInput = $('roi-investment');
  const submitBtn       = $('roi-submit');

  const revenue    = validateNumericField(revenueInput,    $('roi-revenue-error'),    { label: 'Revenue',    min: 0,    max: 999_999_999 });
  const investment = validateNumericField(investmentInput, $('roi-investment-error'), { label: 'Investment', min: 0.01, max: 999_999_999 });

  if (revenue === null || investment === null) {
    showToast({ type: 'error', title: 'Validation Error', message: 'Please fix the highlighted fields.' });
    return;
  }

  /* Set loading state */
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Calculating...';

  setTimeout(() => {
    try {
      /* ── CORE FORMULA ── */
      const netProfit = revenue - investment;
      const roi       = (netProfit / investment) * 100;

      const result = { revenue, investment, netProfit, roi };
      RESULTS_STORE.roi = result;

      /* Update UI */
      const rating = getROIRating(roi);

      $('roi-result-value').textContent    = formatPercent(roi);
      $('roi-net-profit').textContent      = formatCurrency(netProfit);
      $('roi-display-revenue').textContent = formatCurrency(revenue);
      $('roi-display-investment').textContent = formatCurrency(investment);

      const statusEl = $('roi-result-status');
      statusEl.textContent = rating.label;
      statusEl.className   = `result-card__status ${rating.cls}`;

      const interpEl = $('roi-interpretation');
      interpEl.className = `interpretation-box ${rating.interpCls}`;
      interpEl.innerHTML = `<i class="fa-solid ${rating.icon}" aria-hidden="true"></i><span>${rating.msg}</span>`;

      /* Show results panel */
      $('roi-empty').hidden          = true;
      $('roi-results-content').hidden = false;

      /* Render chart */
      renderROIChart(result);

      /* Update dashboard */
      updateDashboard();

      /* Save to storage */
      saveToStorage();

      showToast({ type: 'success', title: 'ROI Calculated!', message: `Your ROI is ${formatPercent(roi)}` });

    } catch (err) {
      showToast({ type: 'error', title: 'Calculation Error', message: 'An unexpected error occurred. Please try again.' });
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-calculator" aria-hidden="true"></i> Calculate ROI';
    }
  }, 200);
};


/* ═══════════════════════════════════════════════════════════════════
   15. CALCULATOR — ROAS
   Formula: ROAS = Revenue / Ad Spend
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Get ROAS performance rating
 * @param {number} roas
 * @returns {Object}
 */
const getROASRating = (roas) => {
  if (roas >= 5)  return { label: '🚀 Excellent ROAS', cls: 'status--excellent', interpCls: 'interp--excellent', icon: 'fa-rocket',            msg: `Excellent! ${formatROAS(roas)} ROAS — for every $1 spent on ads, you earned $${roas.toFixed(2)} back. This is top-tier performance.` };
  if (roas >= 3)  return { label: '✅ Good ROAS',      cls: 'status--good',      interpCls: 'interp--good',      icon: 'fa-circle-check',      msg: `Solid! ${formatROAS(roas)} ROAS meets the industry benchmark of 3x–5x. Keep optimizing to reach 5x+.` };
  if (roas >= 1)  return { label: '⚠️ Low ROAS',       cls: 'status--warning',   interpCls: 'interp--warning',   icon: 'fa-triangle-exclamation', msg: `${formatROAS(roas)} ROAS is below the recommended 3x threshold. Your ads are generating revenue but may not be covering all costs.` };
  return                 { label: '❌ Negative ROAS',  cls: 'status--poor',      interpCls: 'interp--poor',      icon: 'fa-circle-xmark',      msg: `Critical: ${formatROAS(roas)} ROAS means you're spending more on ads than you're earning. Pause and restructure your campaign immediately.` };
};

/** Initialize ROAS calculator */
const initROASCalc = () => {
  const form = $('form-roas');
  if (!form) return;
  form.addEventListener('submit', (e) => { e.preventDefault(); calculateROAS(); });
  $('roas-reset').addEventListener('click', () => resetCalc('roas'));
};

/** Execute ROAS calculation */
const calculateROAS = () => {
  const revenueInput = $('roas-revenue');
  const spendInput   = $('roas-adspend');
  const submitBtn    = $('roas-submit');

  const revenue = validateNumericField(revenueInput, $('roas-revenue-error'), { label: 'Revenue',    min: 0,    max: 999_999_999 });
  const adSpend = validateNumericField(spendInput,   $('roas-adspend-error'), { label: 'Ad Spend',   min: 0.01, max: 999_999_999 });

  if (revenue === null || adSpend === null) {
    showToast({ type: 'error', title: 'Validation Error', message: 'Please fix the highlighted fields.' });
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Calculating...';

  setTimeout(() => {
    try {
      /* ── CORE FORMULA ── */
      const roas         = revenue / adSpend;
      const perDollar    = revenue / adSpend; /* Same as ROAS */

      const result = { revenue, adSpend, roas, perDollar };
      RESULTS_STORE.roas = result;

      const rating = getROASRating(roas);

      $('roas-result-value').textContent   = formatROAS(roas);
      $('roas-display-revenue').textContent = formatCurrency(revenue);
      $('roas-display-spend').textContent  = formatCurrency(adSpend);
      $('roas-per-dollar').textContent     = `$${perDollar.toFixed(2)}`;

      const statusEl = $('roas-result-status');
      statusEl.textContent = rating.label;
      statusEl.className   = `result-card__status ${rating.cls}`;

      const interpEl = $('roas-interpretation');
      interpEl.className = `interpretation-box ${rating.interpCls}`;
      interpEl.innerHTML = `<i class="fa-solid ${rating.icon}" aria-hidden="true"></i><span>${rating.msg}</span>`;

      $('roas-empty').hidden           = true;
      $('roas-results-content').hidden = false;

      renderROASChart(result);
      updateDashboard();
      saveToStorage();

      showToast({ type: 'success', title: 'ROAS Calculated!', message: `Your ROAS is ${formatROAS(roas)}` });

    } catch (err) {
      showToast({ type: 'error', title: 'Calculation Error', message: 'An unexpected error occurred. Please try again.' });
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-calculator" aria-hidden="true"></i> Calculate ROAS';
    }
  }, 200);
};


/* ═══════════════════════════════════════════════════════════════════
   16. CALCULATOR — CPA
   Formula: CPA = Total Ad Spend / Number of Conversions
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Get CPA performance label
 * @param {number} cpa
 * @returns {Object}
 */
const getCPARating = (cpa) => {
  /* CPA evaluation is relative, but we provide contextual guidance */
  if (cpa <= 10)  return { label: '🚀 Very Low CPA',   cls: 'status--excellent', interpCls: 'interp--excellent', icon: 'fa-rocket',            msg: `Exceptional efficiency! Your CPA of ${formatCurrency(cpa)} is extremely low — you're acquiring customers at minimal cost.` };
  if (cpa <= 50)  return { label: '✅ Low CPA',         cls: 'status--good',      interpCls: 'interp--good',      icon: 'fa-circle-check',      msg: `Good CPA of ${formatCurrency(cpa)}. Ensure your average customer value (LTV) is higher than this to stay profitable.` };
  if (cpa <= 200) return { label: '⚠️ Moderate CPA',    cls: 'status--warning',   interpCls: 'interp--warning',   icon: 'fa-triangle-exclamation', msg: `CPA of ${formatCurrency(cpa)} is moderate. Verify your LTV exceeds this. Consider improving landing page conversion rates.` };
  return                 { label: '❌ High CPA',         cls: 'status--poor',      interpCls: 'interp--poor',      icon: 'fa-circle-xmark',      msg: `High CPA of ${formatCurrency(cpa)} signals inefficiency. Audit your targeting, ad creative, and landing page to reduce acquisition cost.` };
};

/** Initialize CPA calculator */
const initCPACalc = () => {
  const form = $('form-cpa');
  if (!form) return;
  form.addEventListener('submit', (e) => { e.preventDefault(); calculateCPA(); });
  $('cpa-reset').addEventListener('click', () => resetCalc('cpa'));
};

/** Execute CPA calculation */
const calculateCPA = () => {
  const spendInput       = $('cpa-spend');
  const conversionsInput = $('cpa-conversions');
  const submitBtn        = $('cpa-submit');

  const adSpend     = validateNumericField(spendInput,       $('cpa-spend-error'),       { label: 'Ad Spend',     min: 0.01, max: 999_999_999 });
  const conversions = validateNumericField(conversionsInput, $('cpa-conversions-error'), { label: 'Conversions',  min: 1,    max: 999_999_999, integer: true });

  if (adSpend === null || conversions === null) {
    showToast({ type: 'error', title: 'Validation Error', message: 'Please fix the highlighted fields.' });
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Calculating...';

  setTimeout(() => {
    try {
      /* ── CORE FORMULA ── */
      const cpa          = adSpend / conversions;
      const perHundred   = (conversions / adSpend) * 100;

      const result = { adSpend, conversions, cpa, perHundred };
      RESULTS_STORE.cpa = result;

      const rating = getCPARating(cpa);

      $('cpa-result-value').textContent         = formatCurrency(cpa);
      $('cpa-display-spend').textContent        = formatCurrency(adSpend);
      $('cpa-display-conversions').textContent  = formatNumber(conversions);
      $('cpa-per-hundred').textContent          = perHundred.toFixed(2);

      const statusEl = $('cpa-result-status');
      statusEl.textContent = rating.label;
      statusEl.className   = `result-card__status ${rating.cls}`;

      const interpEl = $('cpa-interpretation');
      interpEl.className = `interpretation-box ${rating.interpCls}`;
      interpEl.innerHTML = `<i class="fa-solid ${rating.icon}" aria-hidden="true"></i><span>${rating.msg}</span>`;

      $('cpa-empty').hidden           = true;
      $('cpa-results-content').hidden = false;

      renderCPAChart(result);
      updateDashboard();
      saveToStorage();

      showToast({ type: 'success', title: 'CPA Calculated!', message: `Your CPA is ${formatCurrency(cpa)}` });

    } catch (err) {
      showToast({ type: 'error', title: 'Calculation Error', message: 'An unexpected error occurred. Please try again.' });
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-calculator" aria-hidden="true"></i> Calculate CPA';
    }
  }, 200);
};


/* ═══════════════════════════════════════════════════════════════════
   17. CALCULATOR — CPM
   Formula: CPM = (Total Ad Spend / Total Impressions) × 1000
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Get CPM performance rating
 * @param {number} cpm
 * @returns {Object}
 */
const getCPMRating = (cpm) => {
  if (cpm <= 5)  return { label: '🚀 Excellent CPM',  cls: 'status--excellent', interpCls: 'interp--excellent', icon: 'fa-rocket',            msg: `Exceptional reach efficiency! ${formatCurrency(cpm)} CPM means you're reaching 1,000 people for just ${formatCurrency(cpm)}.` };
  if (cpm <= 15) return { label: '✅ Good CPM',        cls: 'status--good',      interpCls: 'interp--good',      icon: 'fa-circle-check',      msg: `Good CPM of ${formatCurrency(cpm)}. This is within the typical range for display and social media advertising.` };
  if (cpm <= 30) return { label: '⚠️ Moderate CPM',   cls: 'status--warning',   interpCls: 'interp--warning',   icon: 'fa-triangle-exclamation', msg: `${formatCurrency(cpm)} CPM is above average. Consider broader targeting or less competitive placements to improve reach efficiency.` };
  return                { label: '❌ High CPM',         cls: 'status--poor',      interpCls: 'interp--poor',      icon: 'fa-circle-xmark',      msg: `${formatCurrency(cpm)} CPM is high. You're paying a premium for impressions. Review audience targeting and ad placements to reduce costs.` };
};

/** Initialize CPM calculator */
const initCPMCalc = () => {
  const form = $('form-cpm');
  if (!form) return;
  form.addEventListener('submit', (e) => { e.preventDefault(); calculateCPM(); });
  $('cpm-reset').addEventListener('click', () => resetCalc('cpm'));
};

/** Execute CPM calculation */
const calculateCPM = () => {
  const spendInput       = $('cpm-spend');
  const impressionsInput = $('cpm-impressions');
  const submitBtn        = $('cpm-submit');

  const adSpend     = validateNumericField(spendInput,       $('cpm-spend-error'),       { label: 'Ad Spend',     min: 0.01, max: 999_999_999 });
  const impressions = validateNumericField(impressionsInput, $('cpm-impressions-error'), { label: 'Impressions',  min: 1,    max: 999_999_999_999, integer: true });

  if (adSpend === null || impressions === null) {
    showToast({ type: 'error', title: 'Validation Error', message: 'Please fix the highlighted fields.' });
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Calculating...';

  setTimeout(() => {
    try {
      /* ── CORE FORMULA ── */
      const cpm             = (adSpend / impressions) * 1000;
      const perImpression   = adSpend / impressions;

      const result = { adSpend, impressions, cpm, perImpression };
      RESULTS_STORE.cpm = result;

      const rating = getCPMRating(cpm);

      $('cpm-result-value').textContent          = formatCurrency(cpm);
      $('cpm-display-spend').textContent         = formatCurrency(adSpend);
      $('cpm-display-impressions').textContent   = formatNumber(impressions);
      $('cpm-per-impression').textContent        = `$${perImpression.toFixed(5)}`;

      const statusEl = $('cpm-result-status');
      statusEl.textContent = rating.label;
      statusEl.className   = `result-card__status ${rating.cls}`;

      const interpEl = $('cpm-interpretation');
      interpEl.className = `interpretation-box ${rating.interpCls}`;
      interpEl.innerHTML = `<i class="fa-solid ${rating.icon}" aria-hidden="true"></i><span>${rating.msg}</span>`;

      $('cpm-empty').hidden           = true;
      $('cpm-results-content').hidden = false;

      renderCPMChart(result);
      updateDashboard();
      saveToStorage();

      showToast({ type: 'success', title: 'CPM Calculated!', message: `Your CPM is ${formatCurrency(cpm)}` });

    } catch (err) {
      showToast({ type: 'error', title: 'Calculation Error', message: 'An unexpected error occurred. Please try again.' });
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-calculator" aria-hidden="true"></i> Calculate CPM';
    }
  }, 200);
};


/* ═══════════════════════════════════════════════════════════════════
   18. CALCULATOR — CTR
   Formula: CTR = (Total Clicks / Total Impressions) × 100
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Get CTR performance rating
 * @param {number} ctr
 * @returns {Object}
 */
const getCTRRating = (ctr) => {
  if (ctr >= 3)   return { label: '🚀 Excellent CTR', cls: 'status--excellent', interpCls: 'interp--excellent', icon: 'fa-rocket',            msg: `Exceptional! ${formatPercent(ctr)} CTR is top-tier performance. Your ad creative is highly compelling and relevant to the audience.` };
  if (ctr >= 1)   return { label: '✅ Good CTR',      cls: 'status--good',      interpCls: 'interp--good',      icon: 'fa-circle-check',      msg: `Strong ${formatPercent(ctr)} CTR — above industry average. Your ad is resonating well. Continue A/B testing to push it higher.` };
  if (ctr >= 0.5) return { label: '⚠️ Average CTR',  cls: 'status--warning',   interpCls: 'interp--warning',   icon: 'fa-triangle-exclamation', msg: `${formatPercent(ctr)} CTR is average. Consider refreshing ad creative, improving your headline, or refining audience targeting.` };
  return                 { label: '❌ Low CTR',        cls: 'status--poor',      interpCls: 'interp--poor',      icon: 'fa-circle-xmark',      msg: `${formatPercent(ctr)} CTR is below average. Your ad may not be relevant to your audience. Review creative, copy, and targeting immediately.` };
};

/** Initialize CTR calculator */
const initCTRCalc = () => {
  const form = $('form-ctr');
  if (!form) return;
  form.addEventListener('submit', (e) => { e.preventDefault(); calculateCTR(); });
  $('ctr-reset').addEventListener('click', () => resetCalc('ctr'));
};

/** Execute CTR calculation */
const calculateCTR = () => {
  const clicksInput      = $('ctr-clicks');
  const impressionsInput = $('ctr-impressions');
  const submitBtn        = $('ctr-submit');

  const clicks      = validateNumericField(clicksInput,      $('ctr-clicks-error'),      { label: 'Clicks',       min: 0,    max: 999_999_999_999, integer: true });
  const impressions = validateNumericField(impressionsInput, $('ctr-impressions-error'), { label: 'Impressions',  min: 1,    max: 999_999_999_999, integer: true });

  if (clicks === null || impressions === null) {
    showToast({ type: 'error', title: 'Validation Error', message: 'Please fix the highlighted fields.' });
    return;
  }

  if (clicks > impressions) {
    showFieldError(clicksInput, $('ctr-clicks-error'), 'Clicks cannot exceed total Impressions.');
    showToast({ type: 'error', title: 'Invalid Data', message: 'Clicks cannot be greater than Impressions.' });
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Calculating...';

  setTimeout(() => {
    try {
      /* ── CORE FORMULA ── */
      const ctr       = (clicks / impressions) * 100;
      const nonClicks = impressions - clicks;

      const result = { clicks, impressions, ctr, nonClicks };
      RESULTS_STORE.ctr = result;

      const rating = getCTRRating(ctr);

      $('ctr-result-value').textContent         = formatPercent(ctr);
      $('ctr-display-clicks').textContent       = formatNumber(clicks);
      $('ctr-display-impressions').textContent  = formatNumber(impressions);
      $('ctr-non-clicks').textContent           = formatNumber(nonClicks);

      const statusEl = $('ctr-result-status');
      statusEl.textContent = rating.label;
      statusEl.className   = `result-card__status ${rating.cls}`;

      const interpEl = $('ctr-interpretation');
      interpEl.className = `interpretation-box ${rating.interpCls}`;
      interpEl.innerHTML = `<i class="fa-solid ${rating.icon}" aria-hidden="true"></i><span>${rating.msg}</span>`;

      $('ctr-empty').hidden           = true;
      $('ctr-results-content').hidden = false;

      renderCTRChart(result);
      updateDashboard();
      saveToStorage();

      showToast({ type: 'success', title: 'CTR Calculated!', message: `Your CTR is ${formatPercent(ctr)}` });

    } catch (err) {
      showToast({ type: 'error', title: 'Calculation Error', message: 'An unexpected error occurred. Please try again.' });
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-calculator" aria-hidden="true"></i> Calculate CTR';
    }
  }, 200);
};


/* ═══════════════════════════════════════════════════════════════════
   19. CALCULATOR — BREAK-EVEN
   Formula: Break-even Units = Fixed Costs / (Selling Price - Variable Cost)
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Get Break-even performance rating
 * @param {number} units
 * @param {number} sellingPrice
 * @returns {Object}
 */
const getBreakevenRating = (units, sellingPrice) => {
  const breakEvenRevenue = units * sellingPrice;
  if (units <= 50)  return { label: '🚀 Low Break-even',  cls: 'status--excellent', interpCls: 'interp--excellent', icon: 'fa-rocket',            msg: `Excellent! You only need to sell ${formatNumber(units)} units (${formatCurrency(breakEvenRevenue)}) to break even. Your business model has strong margin efficiency.` };
  if (units <= 200) return { label: '✅ Manageable',       cls: 'status--good',      interpCls: 'interp--good',      icon: 'fa-circle-check',      msg: `Solid. ${formatNumber(units)} units needed to break even. This is an achievable target for most businesses with proper sales planning.` };
  if (units <= 500) return { label: '⚠️ High Break-even',  cls: 'status--warning',   interpCls: 'interp--warning',   icon: 'fa-triangle-exclamation', msg: `You need ${formatNumber(units)} units to break even. This is quite high — consider reducing fixed costs or increasing your selling price.` };
  return                   { label: '❌ Very High',         cls: 'status--poor',      interpCls: 'interp--poor',      icon: 'fa-circle-xmark',      msg: `Critical: ${formatNumber(units)} units required to break even. Your fixed costs or low margins make this very challenging. Restructure your pricing model.` };
};

/** Initialize Break-even calculator */
const initBreakevenCalc = () => {
  const form = $('form-breakeven');
  if (!form) return;
  form.addEventListener('submit', (e) => { e.preventDefault(); calculateBreakeven(); });
  $('be-reset').addEventListener('click', () => resetCalc('breakeven'));
};

/** Execute Break-even calculation */
const calculateBreakeven = () => {
  const fixedCostsInput   = $('be-fixed-costs');
  const sellingPriceInput = $('be-selling-price');
  const variableCostInput = $('be-variable-cost');
  const submitBtn         = $('be-submit');

  const fixedCosts   = validateNumericField(fixedCostsInput,   $('be-fixed-costs-error'),   { label: 'Fixed Costs',   min: 0.01, max: 999_999_999 });
  const sellingPrice = validateNumericField(sellingPriceInput, $('be-selling-price-error'), { label: 'Selling Price', min: 0.01, max: 999_999_999 });
  const variableCost = validateNumericField(variableCostInput, $('be-variable-cost-error'), { label: 'Variable Cost', min: 0,    max: 999_999_999 });

  if (fixedCosts === null || sellingPrice === null || variableCost === null) {
    showToast({ type: 'error', title: 'Validation Error', message: 'Please fix the highlighted fields.' });
    return;
  }

  /* Selling price must exceed variable cost */
  if (sellingPrice <= variableCost) {
    showFieldError(variableCostInput, $('be-variable-cost-error'), 'Variable cost must be less than the selling price.');
    showToast({ type: 'error', title: 'Invalid Data', message: 'Selling price must be greater than variable cost to break even.' });
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Calculating...';

  setTimeout(() => {
    try {
      /* ── CORE FORMULA ── */
      const contributionMargin      = sellingPrice - variableCost;
      const contributionMarginRatio = (contributionMargin / sellingPrice) * 100;
      const units                   = Math.ceil(fixedCosts / contributionMargin);
      const breakEvenRevenue        = units * sellingPrice;

      const result = {
        fixedCosts, sellingPrice, variableCost,
        contributionMargin, contributionMarginRatio,
        units, breakEvenRevenue,
      };
      RESULTS_STORE.breakeven = result;

      const rating = getBreakevenRating(units, sellingPrice);

      $('be-result-units').textContent       = formatNumber(units);
      $('be-result-revenue').textContent     = formatCurrency(breakEvenRevenue);
      $('be-contribution-margin').textContent = formatCurrency(contributionMargin);
      $('be-margin-ratio').textContent       = formatPercent(contributionMarginRatio);

      const statusEl = $('be-result-status');
      statusEl.textContent = rating.label;
      statusEl.className   = `result-card__status ${rating.cls}`;

      const interpEl = $('be-interpretation');
      interpEl.className = `interpretation-box ${rating.interpCls}`;
      interpEl.innerHTML = `<i class="fa-solid ${rating.icon}" aria-hidden="true"></i><span>${rating.msg}</span>`;

      $('breakeven-empty').hidden           = true;
      $('breakeven-results-content').hidden = false;

      renderBreakevenChart(result);
      updateDashboard();
      saveToStorage();

      showToast({ type: 'success', title: 'Break-even Calculated!', message: `You need ${formatNumber(units)} units to break even.` });

    } catch (err) {
      showToast({ type: 'error', title: 'Calculation Error', message: 'An unexpected error occurred. Please try again.' });
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-calculator" aria-hidden="true"></i> Calculate Break-even';
    }
  }, 200);
};


/* ═══════════════════════════════════════════════════════════════════
   20. CALCULATOR — PROFIT MARGIN
   Formulas:
   Gross Margin = ((Revenue - COGS) / Revenue) × 100
   Operating Margin = ((Revenue - COGS - OpEx) / Revenue) × 100
   Net Margin = ((Revenue - All Costs) / Revenue) × 100
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Get Profit Margin performance rating
 * @param {number} netMargin
 * @returns {Object}
 */
const getMarginRating = (netMargin) => {
  if (netMargin >= 30)  return { label: '🚀 Excellent Margin', cls: 'status--excellent', interpCls: 'interp--excellent', icon: 'fa-rocket',            msg: `Outstanding! ${formatPercent(netMargin)} net margin is exceptional. Your business retains a large portion of revenue as profit.` };
  if (netMargin >= 15)  return { label: '✅ Good Margin',      cls: 'status--good',      interpCls: 'interp--good',      icon: 'fa-circle-check',      msg: `Strong ${formatPercent(netMargin)} net margin. Your business is healthy and generating consistent profits above industry average.` };
  if (netMargin >= 5)   return { label: '⚠️ Thin Margin',      cls: 'status--warning',   interpCls: 'interp--warning',   icon: 'fa-triangle-exclamation', msg: `${formatPercent(netMargin)} net margin is thin. Small revenue dips could impact profitability. Look for cost reduction opportunities.` };
  if (netMargin >= 0)   return { label: '⚠️ Very Low Margin',  cls: 'status--warning',   interpCls: 'interp--warning',   icon: 'fa-triangle-exclamation', msg: `${formatPercent(netMargin)} net margin is very low. You're barely profitable. Review all costs and consider price increases.` };
  return                       { label: '❌ Net Loss',          cls: 'status--poor',      interpCls: 'interp--poor',      icon: 'fa-circle-xmark',      msg: `${formatPercent(netMargin)} net margin means you're operating at a loss. Total costs exceed revenue. Immediate restructuring is needed.` };
};

/** Initialize Profit Margin calculator */
const initMarginCalc = () => {
  const form = $('form-margin');
  if (!form) return;
  form.addEventListener('submit', (e) => { e.preventDefault(); calculateMargin(); });
  $('margin-reset').addEventListener('click', () => resetCalc('margin'));
};

/** Execute Profit Margin calculation */
const calculateMargin = () => {
  const revenueInput   = $('margin-revenue');
  const cogsInput      = $('margin-cogs');
  const operatingInput = $('margin-operating');
  const taxesInput     = $('margin-taxes');
  const submitBtn      = $('margin-submit');

  const revenue    = validateNumericField(revenueInput,   $('margin-revenue-error'),   { label: 'Revenue',               min: 0.01, max: 999_999_999 });
  const cogs       = validateNumericField(cogsInput,      $('margin-cogs-error'),      { label: 'COGS',                  min: 0,    max: 999_999_999 });
  const opEx       = validateNumericField(operatingInput, $('margin-operating-error'), { label: 'Operating Expenses',    min: 0,    max: 999_999_999 });
  const taxRaw     = taxesInput.value.trim();
  const taxes      = taxRaw === '' ? 0 : validateNumericField(taxesInput, null, { label: 'Taxes & Interest', min: 0, max: 999_999_999, required: false });

  if (revenue === null || cogs === null || opEx === null || taxes === null) {
    showToast({ type: 'error', title: 'Validation Error', message: 'Please fix the highlighted fields.' });
    return;
  }

  /* Total costs sanity check */
  if (cogs > revenue) {
    showFieldError(cogsInput, $('margin-cogs-error'), 'COGS cannot exceed total revenue.');
    showToast({ type: 'error', title: 'Invalid Data', message: 'COGS should not exceed total revenue.' });
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Calculating...';

  setTimeout(() => {
    try {
      /* ── CORE FORMULAS ── */
      const grossProfit      = revenue - cogs;
      const grossMargin      = (grossProfit / revenue) * 100;

      const operatingProfit  = grossProfit - opEx;
      const operatingMargin  = (operatingProfit / revenue) * 100;

      const netProfit        = operatingProfit - taxes;
      const netMargin        = (netProfit / revenue) * 100;

      const totalCosts       = cogs + opEx + taxes;

      const result = {
        revenue, cogs,
        operatingExpenses: opEx,
        taxesInterest:     taxes,
        grossProfit,       grossMargin,
        operatingProfit,   operatingMargin,
        netProfit,         netMargin,
        totalCosts,
      };
      RESULTS_STORE.margin = result;

      const rating = getMarginRating(netMargin);

      $('margin-gross').textContent          = formatPercent(grossMargin);
      $('margin-operating-result').textContent = formatPercent(operatingMargin);
      $('margin-net').textContent            = formatPercent(netMargin);
      $('margin-gross-profit').textContent   = formatCurrency(grossProfit);
      $('margin-op-profit').textContent      = formatCurrency(operatingProfit);
      $('margin-net-profit').textContent     = formatCurrency(netProfit);
      $('margin-total-costs').textContent    = formatCurrency(totalCosts);

      const interpEl = $('margin-interpretation');
      interpEl.className = `interpretation-box ${rating.interpCls}`;
      interpEl.innerHTML = `<i class="fa-solid ${rating.icon}" aria-hidden="true"></i><span>${rating.msg}</span>`;

      $('margin-empty').hidden           = true;
      $('margin-results-content').hidden = false;

      renderMarginChart(result);
      updateDashboard();
      saveToStorage();

      showToast({ type: 'success', title: 'Margins Calculated!', message: `Net Margin: ${formatPercent(netMargin)} | Gross: ${formatPercent(grossMargin)}` });

    } catch (err) {
      showToast({ type: 'error', title: 'Calculation Error', message: 'An unexpected error occurred. Please try again.' });
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-calculator" aria-hidden="true"></i> Calculate Margins';
    }
  }, 200);
};


/* ═══════════════════════════════════════════════════════════════════
   21. DASHBOARD ENGINE
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Update the dashboard summary cards with latest results
 */
const updateDashboard = () => {
  /* ROI */
  if (RESULTS_STORE.roi) {
    const r    = RESULTS_STORE.roi;
    const rate = getROIRating(r.roi);
    $('dash-roi-value').textContent   = formatPercent(r.roi);
    $('dash-roi-status').textContent  = r.roi >= 0 ? '▲ Profitable' : '▼ Loss';
    $('dash-roi-status').style.color  = r.roi >= 0 ? 'var(--color-success)' : 'var(--color-error)';
  }

  /* ROAS */
  if (RESULTS_STORE.roas) {
    const r    = RESULTS_STORE.roas;
    $('dash-roas-value').textContent  = formatROAS(r.roas);
    $('dash-roas-status').textContent = r.roas >= 3 ? '▲ Above Average' : '▼ Below Average';
    $('dash-roas-status').style.color = r.roas >= 3 ? 'var(--color-success)' : 'var(--color-warning)';
  }

  /* CPA */
  if (RESULTS_STORE.cpa) {
    const r    = RESULTS_STORE.cpa;
    $('dash-cpa-value').textContent   = formatCurrency(r.cpa);
    $('dash-cpa-status').textContent  = `${formatNumber(r.conversions)} conversions`;
    $('dash-cpa-status').style.color  = 'var(--color-text-muted)';
  }

  /* CPM */
  if (RESULTS_STORE.cpm) {
    const r    = RESULTS_STORE.cpm;
    $('dash-cpm-value').textContent   = formatCurrency(r.cpm);
    $('dash-cpm-status').textContent  = `${formatNumber(r.impressions)} impressions`;
    $('dash-cpm-status').style.color  = 'var(--color-text-muted)';
  }

  /* CTR */
  if (RESULTS_STORE.ctr) {
    const r    = RESULTS_STORE.ctr;
    $('dash-ctr-value').textContent   = formatPercent(r.ctr);
    $('dash-ctr-status').textContent  = r.ctr >= 1 ? '▲ Above Average' : '▼ Below Average';
    $('dash-ctr-status').style.color  = r.ctr >= 1 ? 'var(--color-success)' : 'var(--color-warning)';
  }

  /* Break-even */
  if (RESULTS_STORE.breakeven) {
    const r    = RESULTS_STORE.breakeven;
    $('dash-be-value').textContent    = `${formatNumber(r.units)} units`;
    $('dash-be-status').textContent   = formatCurrency(r.breakEvenRevenue);
    $('dash-be-status').style.color   = 'var(--color-text-muted)';
  }

  /* Margin */
  if (RESULTS_STORE.margin) {
    const r    = RESULTS_STORE.margin;
    const rate = getMarginRating(r.netMargin);
    $('dash-margin-value').textContent  = formatPercent(r.netMargin);
    $('dash-margin-status').textContent = r.netMargin >= 0 ? '▲ Profitable' : '▼ Loss';
    $('dash-margin-status').style.color = r.netMargin >= 0 ? 'var(--color-success)' : 'var(--color-error)';
  }

  /* Campaign Score */
  updateCampaignScore();

  /* Show/hide dashboard chart */
  const filled   = Object.values(RESULTS_STORE).filter(Boolean).length;
  const chartSec = $('dashboard-chart-section');
  if (chartSec) {
    if (filled >= 2) {
      chartSec.hidden = false;
      updateDashboardChart();
    } else {
      chartSec.hidden = true;
    }
  }
};

/**
 * Compute an overall campaign health score (0–100) from available metrics
 */
const updateCampaignScore = () => {
  const scoreEl = $('dash-score-value');
  const labelEl = $('dash-score-label');
  if (!scoreEl || !labelEl) return;

  let totalScore = 0;
  let count      = 0;

  if (RESULTS_STORE.roi) {
    const roi = RESULTS_STORE.roi.roi;
    const s   = roi >= 300 ? 100 : roi >= 100 ? 80 : roi >= 0 ? 50 : 10;
    totalScore += s; count++;
  }
  if (RESULTS_STORE.roas) {
    const roas = RESULTS_STORE.roas.roas;
    const s    = roas >= 5 ? 100 : roas >= 3 ? 80 : roas >= 1 ? 50 : 10;
    totalScore += s; count++;
  }
  if (RESULTS_STORE.ctr) {
    const ctr = RESULTS_STORE.ctr.ctr;
    const s   = ctr >= 3 ? 100 : ctr >= 1 ? 80 : ctr >= 0.5 ? 50 : 20;
    totalScore += s; count++;
  }
  if (RESULTS_STORE.margin) {
    const nm = RESULTS_STORE.margin.netMargin;
    const s  = nm >= 30 ? 100 : nm >= 15 ? 80 : nm >= 5 ? 60 : nm >= 0 ? 35 : 10;
    totalScore += s; count++;
  }

  if (count === 0) {
    scoreEl.textContent = '—';
    labelEl.textContent = 'Calculate metrics to see score';
    return;
  }

  const avg   = Math.round(totalScore / count);
  const grade = avg >= 85 ? '🚀 Excellent' : avg >= 65 ? '✅ Good' : avg >= 40 ? '⚠️ Average' : '❌ Needs Work';

  scoreEl.textContent = `${avg}/100`;
  labelEl.textContent = grade;
};


/* ═══════════════════════════════════════════════════════════════════
   22. PDF EXPORT ENGINE
   ═══════════════════════════════════════════════════════════════════ */

/** Generate and download a PDF report of all calculated metrics */
const exportPDF = () => {
  const filled = Object.values(RESULTS_STORE).filter(Boolean);
  if (filled.length === 0) {
    showToast({ type: 'warning', title: 'No Data Yet', message: 'Please calculate at least one metric before exporting.' });
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) throw new Error('jsPDF not loaded');

    const doc    = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageW  = doc.internal.pageSize.getWidth();
    const margin = 20;
    let   y      = 20;

    const LINE_H  = 7;
    const TITLE_H = 10;

    /* ── Header ── */
    doc.setFillColor(108, 99, 255);
    doc.rect(0, 0, pageW, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('MarketIQ Pro', margin, 14);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Marketing Analytics Report', margin, 22);
    doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageW - margin, 22, { align: 'right' });

    y = 42;
    doc.setTextColor(30, 30, 46);

    const addSection = (title, items) => {
      /* Check for page overflow */
      if (y + TITLE_H + items.length * LINE_H + 10 > 270) {
        doc.addPage();
        y = 20;
      }

      /* Section title bar */
      doc.setFillColor(240, 240, 255);
      doc.rect(margin, y - 5, pageW - margin * 2, TITLE_H + 2, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(108, 99, 255);
      doc.text(title, margin + 3, y + 3);
      y += TITLE_H + 4;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 46);

      items.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 90);
        doc.text(`${label}:`, margin + 3, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 46);
        doc.text(String(value), margin + 70, y);
        y += LINE_H;
      });

      y += 6;
    };

    /* ── ROI Section ── */
    if (RESULTS_STORE.roi) {
      const r = RESULTS_STORE.roi;
      addSection('ROI — Return on Investment', [
        ['Revenue',        formatCurrency(r.revenue)],
        ['Investment',     formatCurrency(r.investment)],
        ['Net Profit',     formatCurrency(r.netProfit)],
        ['ROI',            formatPercent(r.roi)],
      ]);
    }

    /* ── ROAS Section ── */
    if (RESULTS_STORE.roas) {
      const r = RESULTS_STORE.roas;
      addSection('ROAS — Return on Ad Spend', [
        ['Revenue from Ads', formatCurrency(r.revenue)],
        ['Total Ad Spend',   formatCurrency(r.adSpend)],
        ['ROAS',             formatROAS(r.roas)],
        ['Revenue per $1',   `$${r.perDollar.toFixed(2)}`],
      ]);
    }

    /* ── CPA Section ── */
    if (RESULTS_STORE.cpa) {
      const r = RESULTS_STORE.cpa;
      addSection('CPA — Cost Per Acquisition', [
        ['Total Ad Spend',        formatCurrency(r.adSpend)],
        ['Total Conversions',     formatNumber(r.conversions)],
        ['Cost Per Acquisition',  formatCurrency(r.cpa)],
        ['Conversions per $100',  r.perHundred.toFixed(2)],
      ]);
    }

    /* ── CPM Section ── */
    if (RESULTS_STORE.cpm) {
      const r = RESULTS_STORE.cpm;
      addSection('CPM — Cost Per Mille', [
        ['Total Ad Spend',       formatCurrency(r.adSpend)],
        ['Total Impressions',    formatNumber(r.impressions)],
        ['CPM',                  formatCurrency(r.cpm)],
        ['Cost per Impression',  `$${r.perImpression.toFixed(5)}`],
      ]);
    }

    /* ── CTR Section ── */
    if (RESULTS_STORE.ctr) {
      const r = RESULTS_STORE.ctr;
      addSection('CTR — Click-Through Rate', [
        ['Total Clicks',      formatNumber(r.clicks)],
        ['Total Impressions', formatNumber(r.impressions)],
        ['CTR',               formatPercent(r.ctr)],
        ['Non-Clicks',        formatNumber(r.nonClicks)],
      ]);
    }

    /* ── Break-even Section ── */
    if (RESULTS_STORE.breakeven) {
      const r = RESULTS_STORE.breakeven;
      addSection('Break-even Analysis', [
        ['Fixed Costs',              formatCurrency(r.fixedCosts)],
        ['Selling Price per Unit',   formatCurrency(r.sellingPrice)],
        ['Variable Cost per Unit',   formatCurrency(r.variableCost)],
        ['Contribution Margin',      formatCurrency(r.contributionMargin)],
        ['Contribution Margin %',    formatPercent(r.contributionMarginRatio)],
        ['Break-even Units',         formatNumber(r.units)],
        ['Break-even Revenue',       formatCurrency(r.breakEvenRevenue)],
      ]);
    }

    /* ── Profit Margin Section ── */
    if (RESULTS_STORE.margin) {
      const r = RESULTS_STORE.margin;
      addSection('Profit Margin Analysis', [
        ['Total Revenue',        formatCurrency(r.revenue)],
        ['COGS',                 formatCurrency(r.cogs)],
        ['Operating Expenses',   formatCurrency(r.operatingExpenses)],
        ['Taxes & Interest',     formatCurrency(r.taxesInterest)],
        ['Total Costs',          formatCurrency(r.totalCosts)],
        ['Gross Profit',         formatCurrency(r.grossProfit)],
        ['Gross Margin',         formatPercent(r.grossMargin)],
        ['Operating Profit',     formatCurrency(r.operatingProfit)],
        ['Operating Margin',     formatPercent(r.operatingMargin)],
        ['Net Profit',           formatCurrency(r.netProfit)],
        ['Net Profit Margin',    formatPercent(r.netMargin)],
      ]);
    }

    /* ── Footer on each page ── */
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 192);
      doc.text(
        `Generated by MarketIQ Pro  ·  ${CONFIG.APP_NAME} v${CONFIG.VERSION}  ·  Page ${i} of ${pageCount}`,
        pageW / 2,
        290,
        { align: 'center' }
      );
    }

    const fileName = `MarketIQ-Pro-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);

    showToast({ type: 'success', title: '📄 PDF Exported!', message: `Report saved as "${fileName}"` });

  } catch (err) {
    showToast({ type: 'error', title: 'Export Failed', message: 'PDF library not available. Please try again.' });
  }
};


/* ═══════════════════════════════════════════════════════════════════
   23. LOCAL STORAGE ENGINE
   ═══════════════════════════════════════════════════════════════════ */

/** Save current results to localStorage */
const saveToStorage = () => {
  try {
    const payload = JSON.stringify({
      version:   CONFIG.VERSION,
      timestamp: Date.now(),
      results:   RESULTS_STORE,
    });
    localStorage.setItem(CONFIG.STORAGE_KEY, payload);
  } catch (_) { /* storage unavailable or quota exceeded */ }
};

/** Restore results from localStorage and repopulate UI */
const restoreFromStorage = () => {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (!raw) return;

    const data = JSON.parse(raw);
    if (!data || !data.results) return;

    /* Restore each result and re-render */
    const { results } = data;

    if (results.roi) {
      RESULTS_STORE.roi = results.roi;
      const r    = results.roi;
      const rate = getROIRating(r.roi);
      $('roi-revenue').value    = r.revenue;
      $('roi-investment').value = r.investment;

      $('roi-result-value').textContent       = formatPercent(r.roi);
      $('roi-net-profit').textContent         = formatCurrency(r.netProfit);
      $('roi-display-revenue').textContent    = formatCurrency(r.revenue);
      $('roi-display-investment').textContent = formatCurrency(r.investment);

      const statusEl = $('roi-result-status');
      statusEl.textContent = rate.label;
      statusEl.className   = `result-card__status ${rate.cls}`;

      const interpEl = $('roi-interpretation');
      interpEl.className = `interpretation-box ${rate.interpCls}`;
      interpEl.innerHTML = `<i class="fa-solid ${rate.icon}" aria-hidden="true"></i><span>${rate.msg}</span>`;

      $('roi-empty').hidden           = true;
      $('roi-results-content').hidden = false;
      renderROIChart(r);
    }

    if (results.roas) {
      RESULTS_STORE.roas = results.roas;
      const r    = results.roas;
      const rate = getROASRating(r.roas);
      $('roas-revenue').value  = r.revenue;
      $('roas-adspend').value  = r.adSpend;

      $('roas-result-value').textContent    = formatROAS(r.roas);
      $('roas-display-revenue').textContent = formatCurrency(r.revenue);
      $('roas-display-spend').textContent   = formatCurrency(r.adSpend);
      $('roas-per-dollar').textContent      = `$${r.perDollar.toFixed(2)}`;

      const statusEl = $('roas-result-status');
      statusEl.textContent = rate.label;
      statusEl.className   = `result-card__status ${rate.cls}`;

      const interpEl = $('roas-interpretation');
      interpEl.className = `interpretation-box ${rate.interpCls}`;
      interpEl.innerHTML = `<i class="fa-solid ${rate.icon}" aria-hidden="true"></i><span>${rate.msg}</span>`;

      $('roas-empty').hidden           = true;
      $('roas-results-content').hidden = false;
      renderROASChart(r);
    }

    if (results.cpa) {
      RESULTS_STORE.cpa = results.cpa;
      const r    = results.cpa;
      $('cpa-spend').value       = r.adSpend;
      $('cpa-conversions').value = r.conversions;

      const rate = getCPARating(r.cpa);
      $('cpa-result-value').textContent        = formatCurrency(r.cpa);
      $('cpa-display-spend').textContent       = formatCurrency(r.adSpend);
      $('cpa-display-conversions').textContent = formatNumber(r.conversions);
      $('cpa-per-hundred').textContent         = r.perHundred.toFixed(2);

      const statusEl = $('cpa-result-status');
      statusEl.textContent = rate.label;
      statusEl.className   = `result-card__status ${rate.cls}`;

      const interpEl = $('cpa-interpretation');
      interpEl.className = `interpretation-box ${rate.interpCls}`;
      interpEl.innerHTML = `<i class="fa-solid ${rate.icon}" aria-hidden="true"></i><span>${rate.msg}</span>`;

      $('cpa-empty').hidden           = true;
      $('cpa-results-content').hidden = false;
      renderCPAChart(r);
    }

    if (results.cpm) {
      RESULTS_STORE.cpm = results.cpm;
      const r    = results.cpm;
      $('cpm-spend').value       = r.adSpend;
      $('cpm-impressions').value = r.impressions;

      const rate = getCPMRating(r.cpm);
      $('cpm-result-value').textContent        = formatCurrency(r.cpm);
      $('cpm-display-spend').textContent       = formatCurrency(r.adSpend);
      $('cpm-display-impressions').textContent = formatNumber(r.impressions);
      $('cpm-per-impression').textContent      = `$${r.perImpression.toFixed(5)}`;

      const statusEl = $('cpm-result-status');
      statusEl.textContent = rate.label;
      statusEl.className   = `result-card__status ${rate.cls}`;

      const interpEl = $('cpm-interpretation');
      interpEl.className = `interpretation-box ${rate.interpCls}`;
      interpEl.innerHTML = `<i class="fa-solid ${rate.icon}" aria-hidden="true"></i><span>${rate.msg}</span>`;

      $('cpm-empty').hidden           = true;
      $('cpm-results-content').hidden = false;
      renderCPMChart(r);
    }

    if (results.ctr) {
      RESULTS_STORE.ctr = results.ctr;
      const r    = results.ctr;
      $('ctr-clicks').value      = r.clicks;
      $('ctr-impressions').value = r.impressions;

      const rate = getCTRRating(r.ctr);
      $('ctr-result-value').textContent        = formatPercent(r.ctr);
      $('ctr-display-clicks').textContent      = formatNumber(r.clicks);
      $('ctr-display-impressions').textContent = formatNumber(r.impressions);
      $('ctr-non-clicks').textContent          = formatNumber(r.nonClicks);

      const statusEl = $('ctr-result-status');
      statusEl.textContent = rate.label;
      statusEl.className   = `result-card__status ${rate.cls}`;

      const interpEl = $('ctr-interpretation');
      interpEl.className = `interpretation-box ${rate.interpCls}`;
      interpEl.innerHTML = `<i class="fa-solid ${rate.icon}" aria-hidden="true"></i><span>${rate.msg}</span>`;

      $('ctr-empty').hidden           = true;
      $('ctr-results-content').hidden = false;
      renderCTRChart(r);
    }

    if (results.breakeven) {
      RESULTS_STORE.breakeven = results.breakeven;
      const r    = results.breakeven;
      $('be-fixed-costs').value   = r.fixedCosts;
      $('be-selling-price').value = r.sellingPrice;
      $('be-variable-cost').value = r.variableCost;

      const rate = getBreakevenRating(r.units, r.sellingPrice);
      $('be-result-units').textContent       = formatNumber(r.units);
      $('be-result-revenue').textContent     = formatCurrency(r.breakEvenRevenue);
      $('be-contribution-margin').textContent = formatCurrency(r.contributionMargin);
      $('be-margin-ratio').textContent       = formatPercent(r.contributionMarginRatio);

      const statusEl = $('be-result-status');
      statusEl.textContent = rate.label;
      statusEl.className   = `result-card__status ${rate.cls}`;

      const interpEl = $('be-interpretation');
      interpEl.className = `interpretation-box ${rate.interpCls}`;
      interpEl.innerHTML = `<i class="fa-solid ${rate.icon}" aria-hidden="true"></i><span>${rate.msg}</span>`;

      $('breakeven-empty').hidden           = true;
      $('breakeven-results-content').hidden = false;
      renderBreakevenChart(r);
    }

    if (results.margin) {
      RESULTS_STORE.margin = results.margin;
      const r    = results.margin;
      $('margin-revenue').value   = r.revenue;
      $('margin-cogs').value      = r.cogs;
      $('margin-operating').value = r.operatingExpenses;
      $('margin-taxes').value     = r.taxesInterest || '';

      const rate = getMarginRating(r.netMargin);
      $('margin-gross').textContent           = formatPercent(r.grossMargin);
      $('margin-operating-result').textContent = formatPercent(r.operatingMargin);
      $('margin-net').textContent             = formatPercent(r.netMargin);
      $('margin-gross-profit').textContent    = formatCurrency(r.grossProfit);
      $('margin-op-profit').textContent       = formatCurrency(r.operatingProfit);
      $('margin-net-profit').textContent      = formatCurrency(r.netProfit);
      $('margin-total-costs').textContent     = formatCurrency(r.totalCosts);

      const interpEl = $('margin-interpretation');
      interpEl.className = `interpretation-box ${rate.interpCls}`;
      interpEl.innerHTML = `<i class="fa-solid ${rate.icon}" aria-hidden="true"></i><span>${rate.msg}</span>`;

      $('margin-empty').hidden           = true;
      $('margin-results-content').hidden = false;
      renderMarginChart(r);
    }

    /* Refresh dashboard */
    updateDashboard();

  } catch (_) { /* corrupt storage — silently ignore */ }
};


/* ═══════════════════════════════════════════════════════════════════
   24. COPY TO CLIPBOARD
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Build a text summary for copying
 * @param {string} target - calculator key
 * @returns {string}
 */
const buildCopyText = (target) => {
  const r = RESULTS_STORE[target];
  if (!r) return '';

  const lines = [`${CONFIG.APP_NAME} — ${target.toUpperCase()} Results`, '─'.repeat(40)];

  switch (target) {
    case 'roi':
      lines.push(`Revenue:       ${formatCurrency(r.revenue)}`);
      lines.push(`Investment:    ${formatCurrency(r.investment)}`);
      lines.push(`Net Profit:    ${formatCurrency(r.netProfit)}`);
      lines.push(`ROI:           ${formatPercent(r.roi)}`);
      break;
    case 'roas':
      lines.push(`Revenue:       ${formatCurrency(r.revenue)}`);
      lines.push(`Ad Spend:      ${formatCurrency(r.adSpend)}`);
      lines.push(`ROAS:          ${formatROAS(r.roas)}`);
      lines.push(`Per $1 Spent:  $${r.perDollar.toFixed(2)}`);
      break;
    case 'cpa':
      lines.push(`Ad Spend:      ${formatCurrency(r.adSpend)}`);
      lines.push(`Conversions:   ${formatNumber(r.conversions)}`);
      lines.push(`CPA:           ${formatCurrency(r.cpa)}`);
      break;
    case 'cpm':
      lines.push(`Ad Spend:      ${formatCurrency(r.adSpend)}`);
      lines.push(`Impressions:   ${formatNumber(r.impressions)}`);
      lines.push(`CPM:           ${formatCurrency(r.cpm)}`);
      break;
    case 'ctr':
      lines.push(`Clicks:        ${formatNumber(r.clicks)}`);
      lines.push(`Impressions:   ${formatNumber(r.impressions)}`);
      lines.push(`CTR:           ${formatPercent(r.ctr)}`);
      break;
    case 'breakeven':
      lines.push(`Fixed Costs:   ${formatCurrency(r.fixedCosts)}`);
      lines.push(`Selling Price: ${formatCurrency(r.sellingPrice)}`);
      lines.push(`Variable Cost: ${formatCurrency(r.variableCost)}`);
      lines.push(`Break-even:    ${formatNumber(r.units)} units`);
      lines.push(`Break-even $:  ${formatCurrency(r.breakEvenRevenue)}`);
      break;
    case 'margin':
      lines.push(`Revenue:       ${formatCurrency(r.revenue)}`);
      lines.push(`Gross Margin:  ${formatPercent(r.grossMargin)}`);
      lines.push(`Op. Margin:    ${formatPercent(r.operatingMargin)}`);
      lines.push(`Net Margin:    ${formatPercent(r.netMargin)}`);
      break;
  }

  lines.push('─'.repeat(40));
  lines.push(`Generated by ${CONFIG.APP_NAME}`);
  return lines.join('\n');
};

/** Initialize copy-to-clipboard buttons */
const initCopyButtons = () => {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.copy-result-btn[data-target]');
    if (!btn) return;

    const target = btn.dataset.target;
    const text   = buildCopyText(target);
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Copied!';
      btn.classList.add('btn--success');
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.classList.remove('btn--success');
      }, 2000);
      showToast({ type: 'success', title: 'Copied!', message: `${target.toUpperCase()} results copied to clipboard.`, duration: 2000 });
    } catch (_) {
      showToast({ type: 'error', title: 'Copy Failed', message: 'Your browser blocked clipboard access. Please copy manually.' });
    }
  });
};


/* ═══════════════════════════════════════════════════════════════════
   25. RESET CALCULATOR
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Reset a single calculator
 * @param {string} calcKey
 */
const resetCalc = (calcKey) => {
  const panelId = `panel-${calcKey}`;
  const panel   = $(panelId);
  if (!panel) return;

  /* Clear all inputs */
  panel.querySelectorAll('.form-input').forEach((input) => {
    input.value = '';
    resetFieldState(input, null);
  });

  /* Hide results */
  const emptyEl   = panel.querySelector('[id$="-empty"], [id$="empty"]');
  const resultsEl = panel.querySelector('.results-content');

  if (emptyEl)   emptyEl.hidden   = false;
  if (resultsEl) resultsEl.hidden = true;

  /* Destroy chart */
  destroyChart(calcKey);

  /* Clear stored result */
  RESULTS_STORE[calcKey] = null;

  /* Update dashboard */
  updateDashboard();
  saveToStorage();

  showToast({ type: 'info', title: 'Calculator Reset', message: `${calcKey.toUpperCase()} calculator has been cleared.`, duration: 2000 });
};

/** Initialize the Clear All system */
const initClearAll = () => {
  const btn = $('clear-all-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    openModal(() => {
      CALC_IDS.forEach(resetCalc);
      showToast({ type: 'success', title: 'All Cleared', message: 'All calculators have been reset.' });
    });
  });
};


/* ═══════════════════════════════════════════════════════════════════
   26. FOOTER TAB LINKS
   ═══════════════════════════════════════════════════════════════════ */

/** Initialize footer calculator quick-links */
const initFooterLinks = () => {
  $all('.footer-tab-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      if (!tabId) return;
      switchTab(tabId);
      document.getElementById('calculators')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
};

/** Set current year in footer */
const setFooterYear = () => {
  const el = $('footer-year');
  if (el) el.textContent = new Date().getFullYear();
};


/* ═══════════════════════════════════════════════════════════════════
   27. INITIALIZATION
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Boot sequence — runs when DOM is ready
 */
const init = () => {
  // 1. UI और Modal (इसे सबसे पहले लोड करें ताकि Cancel बटन कभी न अटके)
  try {
    initModal();
    initTooltips();
    initFAQ();
    initHeaderScroll();
    initMobileMenu();
    initCalcTabs();
    initInputClearBtns();
    initStatsCountUp();
    initCopyButtons();
    initClearAll();
    initFooterLinks();
    setFooterYear();
  } catch (err) { console.error("UI Init Error:", err); }

  // 2. Charts (अगर चार्ट काम न करे तो भी ऐप चलता रहे)
  try {
    loadSavedTheme();
    if (typeof Chart !== 'undefined') {
      updateChartDefaults();
      Chart.defaults.responsive = true;
      Chart.defaults.maintainAspectRatio = false;
    }
  } catch (err) { console.warn("Chart Init Error:", err); }

  // 3. Calculators चालू करें
  try {
    initROICalc();
    initROASCalc();
    initCPACalc();
    initCPMCalc();
    initCTRCalc();
    initBreakevenCalc();
    initMarginCalc();
    restoreFromStorage();
  } catch (err) { console.error("Calc Init Error:", err); }

  // 4. बाकी के सारे फीचर्स
  try {
    const themeBtn = $('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    const exportBtn = $('export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportPDF);

    if (typeof AOS !== 'undefined') AOS.init({ duration: 600, once: true, offset: 80, easing: 'ease-out-quad', delay: 0 });
    
    hideLoader();

    /* Keyboard shortcuts */
    document.addEventListener('keydown', (e) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const map = { '1': 'roi', '2': 'roas', '3': 'cpa', '4': 'cpm', '5': 'ctr', '6': 'breakeven', '7': 'margin' };
        if (map[e.key]) {
          e.preventDefault();
          switchTab(map[e.key]);
          document.getElementById('calculators')?.scrollIntoView({ behavior: 'smooth' });
        }
      }
      if (e.altKey && e.key === 'e') {
        e.preventDefault();
        exportPDF();
      }
    });

    /* Smooth scroll for anchor links */
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  } catch (err) { 
    console.error("Final Init Error:", err);
    const loader = $('loader');
    if (loader) loader.classList.add('loader--hidden');
  }
};

/* ── DOM Ready Entry Point ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
