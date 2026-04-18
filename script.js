/* ═══════════════════════════════════════════════════════════════════
   MarketIQ Pro — script.js
   Complete Application Engine
   Author: MarketIQ Pro
   Version: 1.0.0
   ═══════════════════════════════════════════════════════════════════

   TABLE OF CONTENTS:
   01. CONFIG & CONSTANTS
   02. STATE MANAGEMENT
   03. UTILITY FUNCTIONS
   04. VALIDATION ENGINE
   05. CALCULATION ENGINE (All 7 Metrics — 100% Accurate)
   06. CHART ENGINE
   07. UI UPDATE ENGINE
   08. INTERPRETATION ENGINE
   09. DASHBOARD ENGINE
   10. TOAST NOTIFICATION SYSTEM
   11. THEME SYSTEM
   12. TOOLTIP SYSTEM
   13. MODAL SYSTEM
   14. FAQ ACCORDION
   15. CLIPBOARD & COPY SYSTEM
   16. PDF EXPORT ENGINE
   17. LOCALSTORAGE ENGINE
   18. ANIMATION ENGINE
   19. HEADER SCROLL BEHAVIOR
   20. KEYBOARD NAVIGATION
   21. EVENT LISTENERS
   22. INITIALIZATION
   ═══════════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════════
   01. CONFIG & CONSTANTS
   ═══════════════════════════════════════════════════════════════════ */

/** @constant {string} App version */
const APP_VERSION = '1.0.0';

/** @constant {string} localStorage key prefix */
const STORAGE_KEY = 'marketiqpro_v1';

/** @constant {number} Toast auto-dismiss delay in ms */
const TOAST_DURATION = 4000;

/** @constant {number} Debounce delay for inputs in ms */
const DEBOUNCE_DELAY = 300;

/** @constant {number} Count-up animation duration in ms */
const COUNT_UP_DURATION = 1200;

/** @constant {Object} ROAS benchmark thresholds */
const ROAS_BENCHMARKS = {
  POOR:     1,
  MARGINAL: 2,
  GOOD:     3,
  EXCELLENT: 5,
};

/** @constant {Object} ROI benchmark thresholds (%) */
const ROI_BENCHMARKS = {
  POOR:     0,
  MARGINAL: 50,
  GOOD:     100,
  EXCELLENT: 300,
};

/** @constant {Object} CTR benchmark thresholds (%) */
const CTR_BENCHMARKS = {
  POOR:     0.5,
  AVERAGE:  1,
  GOOD:     2,
  EXCELLENT: 3,
};

/** @constant {Object} CPM benchmark thresholds ($) */
const CPM_BENCHMARKS = {
  EXCELLENT: 5,
  GOOD:      15,
  MODERATE:  30,
};

/** @constant {Object} Profit Margin benchmark thresholds (%) */
const MARGIN_BENCHMARKS = {
  POOR:     5,
  AVERAGE:  10,
  GOOD:     20,
  EXCELLENT: 30,
};

/** @constant {Object} Chart color palette */
const CHART_COLORS = {
  roi:       { primary: '#6C63FF', secondary: '#00D4AA', tertiary: '#FF6B35' },
  roas:      { primary: '#00D4AA', secondary: '#6C63FF', tertiary: '#F59E0B' },
  cpa:       { primary: '#FF6B35', secondary: '#6C63FF', tertiary: '#10B981' },
  cpm:       { primary: '#3B82F6', secondary: '#00D4AA', tertiary: '#F59E0B' },
  ctr:       { primary: '#F59E0B', secondary: '#6C63FF', tertiary: '#00D4AA' },
  breakeven: { primary: '#8B5CF6', secondary: '#FF6B35', tertiary: '#10B981' },
  margin:    { primary: '#10B981', secondary: '#6C63FF', tertiary: '#FF6B35' },
};


/* ═══════════════════════════════════════════════════════════════════
   02. STATE MANAGEMENT
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Central application state object.
 * Single source of truth for all computed results.
 */
const appState = {
  theme:       'dark',
  activeTab:   'roi',
  results: {
    roi:       null,
    roas:      null,
    cpa:       null,
    cpm:       null,
    ctr:       null,
    breakeven: null,
    margin:    null,
  },
  charts:      {},
  isProcessing: {},
};


/* ═══════════════════════════════════════════════════════════════════
   03. UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Safely parse a float, returning null for invalid values.
 * @param {string|number} value - Input value
 * @returns {number|null} Parsed float or null
 */
const safeParseFloat = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Format a number as currency string.
 * @param {number} value - Number to format
 * @param {number} [decimals=2] - Decimal places
 * @returns {string} Formatted currency string
 */
const formatCurrency = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) return '$0.00';
  const absValue = Math.abs(value);
  let formatted;

  if (absValue >= 1e9) {
    formatted = (value / 1e9).toFixed(2) + 'B';
  } else if (absValue >= 1e6) {
    formatted = (value / 1e6).toFixed(2) + 'M';
  } else if (absValue >= 1e3) {
    formatted = value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } else {
    formatted = value.toFixed(decimals);
  }

  return `$${formatted}`;
};

/**
 * Format a number as percentage string.
 * @param {number} value - Number to format
 * @param {number} [decimals=2] - Decimal places
 * @returns {string} Formatted percentage string
 */
const formatPercent = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format a large number with commas.
 * @param {number} value - Number to format
 * @returns {string} Formatted number string
 */
const formatNumber = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return Math.ceil(value).toLocaleString('en-US');
};

/**
 * Round a number to specified decimal places.
 * @param {number} value - Number to round
 * @param {number} [decimals=2] - Decimal places
 * @returns {number} Rounded number
 */
const roundTo = (value, decimals = 2) => {
  if (isNaN(value) || !isFinite(value)) return 0;
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Debounce function to limit rapid calls.
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in ms
 * @returns {Function} Debounced function
 */
const debounce = (fn, delay) => {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Get the current theme from document.
 * @returns {string} 'dark' or 'light'
 */
const getCurrentTheme = () =>
  document.documentElement.getAttribute('data-theme') || 'dark';

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Sanitize string to prevent XSS.
 * @param {string} str - Input string
 * @returns {string} Sanitized string
 */
const sanitizeString = (str) => {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
};


/* ═══════════════════════════════════════════════════════════════════
   04. VALIDATION ENGINE
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Validation rules and messages for all calculator fields.
 */
const VALIDATION_RULES = {
  'roi-revenue': {
    required: true,
    min: 0,
    max: 999999999,
    label: 'Total Revenue',
  },
  'roi-investment': {
    required: true,
    min: 0.01,
    max: 999999999,
    label: 'Total Investment',
    nonZero: true,
  },
  'roas-revenue': {
    required: true,
    min: 0,
    max: 999999999,
    label: 'Revenue from Ads',
  },
  'roas-adspend': {
    required: true,
    min: 0.01,
    max: 999999999,
    label: 'Ad Spend',
    nonZero: true,
  },
  'cpa-spend': {
    required: true,
    min: 0.01,
    max: 999999999,
    label: 'Ad Spend',
    nonZero: true,
  },
  'cpa-conversions': {
    required: true,
    min: 1,
    max: 999999999,
    label: 'Conversions',
    integer: true,
    nonZero: true,
  },
  'cpm-spend': {
    required: true,
    min: 0.01,
    max: 999999999,
    label: 'Ad Spend',
    nonZero: true,
  },
  'cpm-impressions': {
    required: true,
    min: 1,
    max: 9999999999,
    label: 'Impressions',
    integer: true,
    nonZero: true,
  },
  'ctr-clicks': {
    required: true,
    min: 0,
    max: 9999999999,
    label: 'Clicks',
    integer: true,
  },
  'ctr-impressions': {
    required: true,
    min: 1,
    max: 9999999999,
    label: 'Impressions',
    integer: true,
    nonZero: true,
  },
  'be-fixed-costs': {
    required: true,
    min: 0.01,
    max: 999999999,
    label: 'Fixed Costs',
    nonZero: true,
  },
  'be-selling-price': {
    required: true,
    min: 0.01,
    max: 999999999,
    label: 'Selling Price',
    nonZero: true,
  },
  'be-variable-cost': {
    required: true,
    min: 0,
    max: 999999999,
    label: 'Variable Cost',
  },
  'margin-revenue': {
    required: true,
    min: 0.01,
    max: 999999999,
    label: 'Total Revenue',
    nonZero: true,
  },
  'margin-cogs': {
    required: true,
    min: 0,
    max: 999999999,
    label: 'Cost of Goods Sold',
  },
  'margin-operating': {
    required: true,
    min: 0,
    max: 999999999,
    label: 'Operating Expenses',
  },
};

/**
 * Validate a single input field.
 * @param {string} fieldId - Input element ID
 * @param {number|null} value - Parsed value
 * @returns {{ valid: boolean, message: string }}
 */
const validateField = (fieldId, value) => {
  const rule = VALIDATION_RULES[fieldId];
  if (!rule) return { valid: true, message: '' };

  // Required check
  if (rule.required && (value === null || value === undefined)) {
    return { valid: false, message: `${rule.label} is required.` };
  }

  // Skip further checks if optional and empty
  if (!rule.required && value === null) {
    return { valid: true, message: '' };
  }

  // NaN check
  if (isNaN(value)) {
    return { valid: false, message: `${rule.label} must be a valid number.` };
  }

  // Infinity check
  if (!isFinite(value)) {
    return { valid: false, message: `${rule.label} value is too large.` };
  }

  // Non-zero check
  if (rule.nonZero && value === 0) {
    return { valid: false, message: `${rule.label} cannot be zero.` };
  }

  // Min check
  if (rule.min !== undefined && value < rule.min) {
    return {
      valid: false,
      message: `${rule.label} must be at least ${rule.min}.`,
    };
  }

  // Max check
  if (rule.max !== undefined && value > rule.max) {
    return {
      valid: false,
      message: `${rule.label} must be less than ${rule.max.toLocaleString()}.`,
    };
  }

  // Integer check
  if (rule.integer && !Number.isInteger(value)) {
    return {
      valid: false,
      message: `${rule.label} must be a whole number.`,
    };
  }

  return { valid: true, message: '' };
};

/**
 * Show or clear error on a field.
 * @param {string} fieldId - Input element ID
 * @param {string} message - Error message (empty = clear)
 */
const setFieldError = (fieldId, message) => {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}-error`);

  if (!input || !errorEl) return;

  if (message) {
    input.classList.add('input--error');
    input.classList.remove('input--success');
    input.setAttribute('aria-invalid', 'true');
    errorEl.textContent = message;
  } else {
    input.classList.remove('input--error');
    input.setAttribute('aria-invalid', 'false');
    errorEl.textContent = '';
    if (input.value.trim() !== '') {
      input.classList.add('input--success');
    }
  }
};

/**
 * Validate all fields in a calculator form.
 * @param {string[]} fieldIds - Array of field IDs
 * @param {Object} values - Parsed values map
 * @returns {boolean} All fields valid
 */
const validateAllFields = (fieldIds, values) => {
  let allValid = true;

  fieldIds.forEach((id) => {
    const result = validateField(id, values[id]);
    setFieldError(id, result.valid ? '' : result.message);
    if (!result.valid) allValid = false;
  });

  return allValid;
};

/**
 * Clear all errors on a form.
 * @param {string[]} fieldIds
 */
const clearAllErrors = (fieldIds) => {
  fieldIds.forEach((id) => {
    const input = document.getElementById(id);
    const errorEl = document.getElementById(`${id}-error`);
    if (input) {
      input.classList.remove('input--error', 'input--success');
      input.removeAttribute('aria-invalid');
    }
    if (errorEl) errorEl.textContent = '';
  });
};

/**
 * Reset a form completely.
 * @param {string} formId - Form element ID
 * @param {string[]} fieldIds - Fields to clear
 */
const resetForm = (formId, fieldIds) => {
  const form = document.getElementById(formId);
  if (form) form.reset();
  clearAllErrors(fieldIds);
};


/* ═══════════════════════════════════════════════════════════════════
   05. CALCULATION ENGINE (100% Accurate Formulas)
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Calculate ROI (Return on Investment).
 * Formula: ((Revenue - Investment) / Investment) × 100
 * @param {number} revenue - Total revenue
 * @param {number} investment - Total investment
 * @returns {Object} ROI results
 */
const calculateROI = (revenue, investment) => {
  if (investment === 0) throw new Error('Investment cannot be zero.');

  const netProfit = revenue - investment;
  const roi = (netProfit / investment) * 100;
  const roiRounded = roundTo(roi, 2);

  return {
    roi:        roiRounded,
    netProfit:  roundTo(netProfit, 2),
    revenue:    roundTo(revenue, 2),
    investment: roundTo(investment, 2),
    isProfit:   netProfit >= 0,
  };
};

/**
 * Calculate ROAS (Return on Ad Spend).
 * Formula: Revenue / Ad Spend
 * @param {number} revenue - Revenue from ads
 * @param {number} adSpend - Total ad spend
 * @returns {Object} ROAS results
 */
const calculateROAS = (revenue, adSpend) => {
  if (adSpend === 0) throw new Error('Ad Spend cannot be zero.');

  const roas = revenue / adSpend;
  const roasRounded = roundTo(roas, 2);
  const revenuePerDollar = roundTo(roas, 4);

  return {
    roas:             roasRounded,
    revenue:          roundTo(revenue, 2),
    adSpend:          roundTo(adSpend, 2),
    revenuePerDollar: revenuePerDollar,
    isProfit:         roas >= 1,
  };
};

/**
 * Calculate CPA (Cost Per Acquisition).
 * Formula: Total Ad Spend / Number of Conversions
 * @param {number} spend - Total ad spend
 * @param {number} conversions - Number of conversions
 * @returns {Object} CPA results
 */
const calculateCPA = (spend, conversions) => {
  if (conversions === 0) throw new Error('Conversions cannot be zero.');

  const cpa = spend / conversions;
  const cpaRounded = roundTo(cpa, 2);
  const conversionsPerHundred = roundTo((conversions / spend) * 100, 2);

  return {
    cpa:                    cpaRounded,
    spend:                  roundTo(spend, 2),
    conversions:            conversions,
    conversionsPerHundred:  conversionsPerHundred,
  };
};

/**
 * Calculate CPM (Cost Per Mille — per 1,000 impressions).
 * Formula: (Total Ad Spend / Total Impressions) × 1000
 * @param {number} spend - Total ad spend
 * @param {number} impressions - Total impressions
 * @returns {Object} CPM results
 */
const calculateCPM = (spend, impressions) => {
  if (impressions === 0) throw new Error('Impressions cannot be zero.');

  const cpm = (spend / impressions) * 1000;
  const cpmRounded = roundTo(cpm, 2);
  const costPerImpression = roundTo(spend / impressions, 6);

  return {
    cpm:               cpmRounded,
    spend:             roundTo(spend, 2),
    impressions:       impressions,
    costPerImpression: costPerImpression,
  };
};

/**
 * Calculate CTR (Click-Through Rate).
 * Formula: (Total Clicks / Total Impressions) × 100
 * @param {number} clicks - Total clicks
 * @param {number} impressions - Total impressions
 * @returns {Object} CTR results
 */
const calculateCTR = (clicks, impressions) => {
  if (impressions === 0) throw new Error('Impressions cannot be zero.');
  if (clicks > impressions) throw new Error('Clicks cannot exceed Impressions.');

  const ctr = (clicks / impressions) * 100;
  const ctrRounded = roundTo(ctr, 4);
  const nonClicks = impressions - clicks;

  return {
    ctr:        ctrRounded,
    clicks:     clicks,
    impressions: impressions,
    nonClicks:  nonClicks,
  };
};

/**
 * Calculate Break-even Point.
 * Formula: Fixed Costs / (Selling Price - Variable Cost Per Unit)
 * @param {number} fixedCosts - Total fixed costs
 * @param {number} sellingPrice - Selling price per unit
 * @param {number} variableCost - Variable cost per unit
 * @returns {Object} Break-even results
 */
const calculateBreakEven = (fixedCosts, sellingPrice, variableCost) => {
  const contributionMargin = sellingPrice - variableCost;

  if (contributionMargin <= 0) {
    throw new Error(
      'Selling Price must be greater than Variable Cost per Unit. Cannot break even.'
    );
  }

  const breakEvenUnits = fixedCosts / contributionMargin;
  const breakEvenRevenue = breakEvenUnits * sellingPrice;
  const marginRatio = (contributionMargin / sellingPrice) * 100;

  return {
    breakEvenUnits:     roundTo(breakEvenUnits, 2),
    breakEvenUnitsCeil: Math.ceil(breakEvenUnits),
    breakEvenRevenue:   roundTo(breakEvenRevenue, 2),
    contributionMargin: roundTo(contributionMargin, 2),
    marginRatio:        roundTo(marginRatio, 2),
    fixedCosts:         roundTo(fixedCosts, 2),
    sellingPrice:       roundTo(sellingPrice, 2),
    variableCost:       roundTo(variableCost, 2),
  };
};

/**
 * Calculate Profit Margins (Gross, Operating, Net).
 * Gross  = ((Revenue - COGS) / Revenue) × 100
 * Operating = ((Revenue - COGS - OpEx) / Revenue) × 100
 * Net    = ((Revenue - COGS - OpEx - Taxes) / Revenue) × 100
 * @param {number} revenue - Total revenue
 * @param {number} cogs - Cost of goods sold
 * @param {number} operatingExpenses - Operating expenses
 * @param {number} taxes - Taxes and interest (optional, default 0)
 * @returns {Object} Margin results
 */
const calculateProfitMargin = (revenue, cogs, operatingExpenses, taxes = 0) => {
  if (revenue === 0) throw new Error('Revenue cannot be zero.');

  const grossProfit     = revenue - cogs;
  const operatingProfit = revenue - cogs - operatingExpenses;
  const netProfit       = revenue - cogs - operatingExpenses - taxes;
  const totalCosts      = cogs + operatingExpenses + taxes;

  const grossMargin     = (grossProfit / revenue) * 100;
  const operatingMargin = (operatingProfit / revenue) * 100;
  const netMargin       = (netProfit / revenue) * 100;

  return {
    revenue:          roundTo(revenue, 2),
    cogs:             roundTo(cogs, 2),
    operatingExpenses: roundTo(operatingExpenses, 2),
    taxes:            roundTo(taxes, 2),
    totalCosts:       roundTo(totalCosts, 2),
    grossProfit:      roundTo(grossProfit, 2),
    operatingProfit:  roundTo(operatingProfit, 2),
    netProfit:        roundTo(netProfit, 2),
    grossMargin:      roundTo(grossMargin, 2),
    operatingMargin:  roundTo(operatingMargin, 2),
    netMargin:        roundTo(netMargin, 2),
  };
};


/* ═══════════════════════════════════════════════════════════════════
   06. CHART ENGINE
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Get Chart.js theme colors based on current theme.
 * @returns {Object} Theme color config
 */
const getChartTheme = () => {
  const isDark = getCurrentTheme() === 'dark';
  return {
    textColor:  isDark ? '#A0A0C0' : '#4A4A6A',
    gridColor:  isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    bgColor:    isDark ? 'rgba(30,30,46,0)' : 'rgba(255,255,255,0)',
    tooltipBg:  isDark ? '#1A1A28' : '#FFFFFF',
    tooltipText: isDark ? '#F0F0FF' : '#1A1A2E',
    tooltipBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  };
};

/**
 * Base Chart.js plugin options for all charts.
 * @returns {Object} Common plugin config
 */
const getBaseChartPlugins = () => {
  const theme = getChartTheme();
  return {
    legend: {
      labels: {
        color: theme.textColor,
        font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
        usePointStyle: true,
        pointStyleWidth: 8,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor:  theme.tooltipBg,
      titleColor:       theme.tooltipText,
      bodyColor:        theme.textColor,
      borderColor:      theme.tooltipBorder,
      borderWidth:      1,
      padding:          12,
      cornerRadius:     10,
      titleFont:        { weight: '700', size: 13 },
      bodyFont:         { size: 12 },
      displayColors:    true,
      boxPadding:       4,
    },
  };
};

/**
 * Destroy an existing chart by key.
 * @param {string} key - Chart key in appState.charts
 */
const destroyChart = (key) => {
  try {
    if (appState.charts[key] instanceof Chart) {
      appState.charts[key].destroy();
      delete appState.charts[key];
    }
  } catch (_) {
    delete appState.charts[key];
  }
};

/**
 * Render ROI Doughnut Chart.
 * @param {Object} data - ROI calculation result
 */
const renderROIChart = (data) => {
  destroyChart('roi');
  const canvas = document.getElementById('chart-roi');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const theme = getChartTheme();
  const colors = CHART_COLORS.roi;

  const investment = Math.abs(data.investment);
  const netProfit  = Math.abs(data.netProfit);

  appState.charts['roi'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Investment', 'Net Profit'],
      datasets: [{
        data:             [investment, netProfit > 0 ? netProfit : 0],
        backgroundColor:  [colors.secondary + 'CC', colors.primary + 'CC'],
        borderColor:      [colors.secondary, colors.primary],
        borderWidth:      2,
        hoverOffset:      8,
        hoverBorderWidth: 3,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '65%',
      animation: {
        animateRotate:  true,
        animateScale:   false,
        duration:       800,
        easing:         'easeInOutQuart',
      },
      plugins: {
        ...getBaseChartPlugins(),
        tooltip: {
          ...getBaseChartPlugins().tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw)}`,
          },
        },
      },
    },
  });
};

/**
 * Render ROAS Bar Chart.
 * @param {Object} data - ROAS calculation result
 */
const renderROASChart = (data) => {
  destroyChart('roas');
  const canvas = document.getElementById('chart-roas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const theme = getChartTheme();
  const colors = CHART_COLORS.roas;

  appState.charts['roas'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Ad Spend', 'Revenue Generated'],
      datasets: [{
        label:           'Amount ($)',
        data:            [data.adSpend, data.revenue],
        backgroundColor: [colors.tertiary + 'B0', colors.primary + 'B0'],
        borderColor:     [colors.tertiary, colors.primary],
        borderWidth:     2,
        borderRadius:    8,
        borderSkipped:   false,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation: {
        duration: 800,
        easing:   'easeInOutQuart',
      },
      scales: {
        x: {
          ticks: { color: theme.textColor, font: { size: 12 } },
          grid:  { color: theme.gridColor },
          border:{ color: theme.gridColor },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color:    theme.textColor,
            font:     { size: 12 },
            callback: (v) => '$' + v.toLocaleString(),
          },
          grid:  { color: theme.gridColor },
          border:{ color: theme.gridColor },
        },
      },
      plugins: {
        ...getBaseChartPlugins(),
        legend: { display: false },
        tooltip: {
          ...getBaseChartPlugins().tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw)}`,
          },
        },
      },
    },
  });
};

/**
 * Render CPA Horizontal Bar Chart.
 * @param {Object} data - CPA calculation result
 */
const renderCPAChart = (data) => {
  destroyChart('cpa');
  const canvas = document.getElementById('chart-cpa');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const theme = getChartTheme();
  const colors = CHART_COLORS.cpa;

  appState.charts['cpa'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Total Spend', 'CPA × Conversions'],
      datasets: [{
        label:           'Amount ($)',
        data:            [data.spend, roundTo(data.cpa * data.conversions, 2)],
        backgroundColor: [colors.primary + 'B0', colors.secondary + 'B0'],
        borderColor:     [colors.primary, colors.secondary],
        borderWidth:     2,
        borderRadius:    8,
        borderSkipped:   false,
        indexAxis:       'x',
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      indexAxis:           'y',
      animation: {
        duration: 800,
        easing:   'easeInOutQuart',
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color:    theme.textColor,
            font:     { size: 12 },
            callback: (v) => '$' + v.toLocaleString(),
          },
          grid:  { color: theme.gridColor },
          border:{ color: theme.gridColor },
        },
        y: {
          ticks: { color: theme.textColor, font: { size: 12 } },
          grid:  { display: false },
          border:{ color: theme.gridColor },
        },
      },
      plugins: {
        ...getBaseChartPlugins(),
        legend: { display: false },
        tooltip: {
          ...getBaseChartPlugins().tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw)}`,
          },
        },
      },
    },
  });
};

/**
 * Render CPM Pie Chart.
 * @param {Object} data - CPM calculation result
 */
const renderCPMChart = (data) => {
  destroyChart('cpm');
  const canvas = document.getElementById('chart-cpm');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const colors = CHART_COLORS.cpm;

  // Show spend segments: per 1k, per 10k, remainder
  const per1k  = roundTo((data.cpm / 1000) * 1000, 2);
  const labels = ['Ad Spend', 'Cost per 1K Impressions (CPM)'];
  const vals   = [data.spend, data.cpm];

  appState.charts['cpm'] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data:             vals,
        backgroundColor:  [colors.primary + 'CC', colors.secondary + 'CC'],
        borderColor:      [colors.primary, colors.secondary],
        borderWidth:      2,
        hoverOffset:      8,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation: {
        duration: 800,
        easing:   'easeInOutQuart',
      },
      plugins: {
        ...getBaseChartPlugins(),
        tooltip: {
          ...getBaseChartPlugins().tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw)}`,
          },
        },
      },
    },
  });
};

/**
 * Render CTR Doughnut Chart.
 * @param {Object} data - CTR calculation result
 */
const renderCTRChart = (data) => {
  destroyChart('ctr');
  const canvas = document.getElementById('chart-ctr');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const colors = CHART_COLORS.ctr;

  appState.charts['ctr'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Clicks', 'Non-Clicks'],
      datasets: [{
        data:             [data.clicks, data.nonClicks],
        backgroundColor:  [colors.primary + 'CC', colors.secondary + '40'],
        borderColor:      [colors.primary, colors.secondary + '80'],
        borderWidth:      2,
        hoverOffset:      8,
        hoverBorderWidth: 3,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '65%',
      animation: {
        animateRotate: true,
        duration:      800,
        easing:        'easeInOutQuart',
      },
      plugins: {
        ...getBaseChartPlugins(),
        tooltip: {
          ...getBaseChartPlugins().tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.raw.toLocaleString()}`,
          },
        },
      },
    },
  });
};

/**
 * Render Break-even Line Chart.
 * @param {Object} data - Break-even calculation result
 */
const renderBreakEvenChart = (data) => {
  destroyChart('breakeven');
  const canvas = document.getElementById('chart-breakeven');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const theme = getChartTheme();
  const colors = CHART_COLORS.breakeven;

  // Generate data points from 0 to 2× break-even units
  const maxUnits  = Math.ceil(data.breakEvenUnitsCeil * 2);
  const stepCount = 10;
  const step      = Math.ceil(maxUnits / stepCount);
  const labels    = [];
  const revenueData   = [];
  const totalCostData = [];

  for (let units = 0; units <= maxUnits; units += step) {
    labels.push(units.toLocaleString());
    revenueData.push(roundTo(units * data.sellingPrice, 2));
    totalCostData.push(roundTo(data.fixedCosts + units * data.variableCost, 2));
  }

  // Ensure break-even point is included
  labels.unshift('0');
  revenueData.unshift(0);
  totalCostData.unshift(data.fixedCosts);

  appState.charts['breakeven'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label:           'Revenue',
          data:            revenueData,
          borderColor:     colors.tertiary,
          backgroundColor: colors.tertiary + '20',
          borderWidth:     2.5,
          pointRadius:     3,
          pointHoverRadius: 6,
          tension:         0.1,
          fill:            false,
        },
        {
          label:           'Total Cost',
          data:            totalCostData,
          borderColor:     colors.primary,
          backgroundColor: colors.primary + '20',
          borderWidth:     2.5,
          pointRadius:     3,
          pointHoverRadius: 6,
          tension:         0.1,
          fill:            false,
          borderDash:      [6, 3],
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction:         { intersect: false, mode: 'index' },
      animation: {
        duration: 900,
        easing:   'easeInOutQuart',
      },
      scales: {
        x: {
          title: {
            display: true,
            text:    'Units Sold',
            color:   theme.textColor,
            font:    { size: 12, weight: '600' },
          },
          ticks: { color: theme.textColor, font: { size: 11 }, maxTicksLimit: 8 },
          grid:  { color: theme.gridColor },
          border:{ color: theme.gridColor },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text:    'Amount ($)',
            color:   theme.textColor,
            font:    { size: 12, weight: '600' },
          },
          ticks: {
            color:    theme.textColor,
            font:     { size: 11 },
            callback: (v) => '$' + v.toLocaleString(),
          },
          grid:  { color: theme.gridColor },
          border:{ color: theme.gridColor },
        },
      },
      plugins: {
        ...getBaseChartPlugins(),
        tooltip: {
          ...getBaseChartPlugins().tooltip,
          callbacks: {
            title:  (ctx) => `Units: ${ctx[0].label}`,
            label:  (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`,
          },
        },
      },
    },
  });
};

/**
 * Render Profit Margin Doughnut Chart.
 * @param {Object} data - Profit margin calculation result
 */
const renderMarginChart = (data) => {
  destroyChart('margin');
  const canvas = document.getElementById('chart-margin');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const colors = CHART_COLORS.margin;

  const netProfitAbs  = Math.max(0, data.netProfit);
  const cogsAbs       = Math.max(0, data.cogs);
  const opExAbs       = Math.max(0, data.operatingExpenses);
  const taxesAbs      = Math.max(0, data.taxes);

  appState.charts['margin'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Net Profit', 'COGS', 'Operating Expenses', 'Taxes & Interest'],
      datasets: [{
        data: [netProfitAbs, cogsAbs, opExAbs, taxesAbs],
        backgroundColor: [
          colors.primary + 'CC',
          colors.secondary + 'CC',
          colors.tertiary + 'CC',
          '#8B5CF6CC',
        ],
        borderColor: [
          colors.primary,
          colors.secondary,
          colors.tertiary,
          '#8B5CF6',
        ],
        borderWidth:      2,
        hoverOffset:      8,
        hoverBorderWidth: 3,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '60%',
      animation: {
        animateRotate: true,
        duration:      800,
        easing:        'easeInOutQuart',
      },
      plugins: {
        ...getBaseChartPlugins(),
        tooltip: {
          ...getBaseChartPlugins().tooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw)}`,
          },
        },
      },
    },
  });
};

/**
 * Render combined dashboard bar chart.
 * @param {Object} results - All results from appState
 */
const renderDashboardChart = (results) => {
  destroyChart('dashboard');
  const canvas = document.getElementById('chart-dashboard');
  if (!canvas) return;

  const theme  = getChartTheme();
  const labels = [];
  const values = [];
  const bgs    = [];
  const borders = [];

  if (results.roi) {
    labels.push('ROI (%)');
    values.push(results.roi.roi);
    bgs.push(CHART_COLORS.roi.primary + 'B0');
    borders.push(CHART_COLORS.roi.primary);
  }
  if (results.roas) {
    labels.push('ROAS (×)');
    values.push(results.roas.roas);
    bgs.push(CHART_COLORS.roas.primary + 'B0');
    borders.push(CHART_COLORS.roas.primary);
  }
  if (results.ctr) {
    labels.push('CTR (%)');
    values.push(results.ctr.ctr);
    bgs.push(CHART_COLORS.ctr.primary + 'B0');
    borders.push(CHART_COLORS.ctr.primary);
  }
  if (results.margin) {
    labels.push('Net Margin (%)');
    values.push(results.margin.netMargin);
    bgs.push(CHART_COLORS.margin.primary + 'B0');
    borders.push(CHART_COLORS.margin.primary);
  }

  if (labels.length === 0) return;

  const ctx = canvas.getContext('2d');

  appState.charts['dashboard'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label:           'Metric Value',
        data:            values,
        backgroundColor: bgs,
        borderColor:     borders,
        borderWidth:     2,
        borderRadius:    10,
        borderSkipped:   false,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation: {
        duration: 900,
        easing:   'easeInOutQuart',
      },
      scales: {
        x: {
          ticks: { color: theme.textColor, font: { size: 13, weight: '600' } },
          grid:  { display: false },
          border:{ color: theme.gridColor },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: theme.textColor,
            font:  { size: 12 },
          },
          grid:  { color: theme.gridColor },
          border:{ color: theme.gridColor },
        },
      },
      plugins: {
        ...getBaseChartPlugins(),
        legend: { display: false },
      },
    },
  });
};


/* ═══════════════════════════════════════════════════════════════════
   07. UI UPDATE ENGINE
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Safely set text content of an element by ID.
 * @param {string} id
 * @param {string} text
 */
const setElText = (id, text) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};

/**
 * Show the results content for a calculator.
 * @param {string} calcId - Calculator ID (roi, roas, etc.)
 */
const showResults = (calcId) => {
  const empty   = document.getElementById(`${calcId}-empty`);
  const content = document.getElementById(`${calcId}-results-content`);
  if (empty)   empty.style.display   = 'none';
  if (content) content.removeAttribute('hidden');
};

/**
 * Hide results (show empty state).
 * @param {string} calcId
 */
const hideResults = (calcId) => {
  const empty   = document.getElementById(`${calcId}-empty`);
  const content = document.getElementById(`${calcId}-results-content`);
  if (empty)   empty.style.display = '';
  if (content) content.setAttribute('hidden', '');
};

/**
 * Set submit button loading state.
 * @param {string} btnId - Button element ID
 * @param {boolean} isLoading
 */
const setButtonLoading = (btnId, isLoading) => {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = isLoading;
  btn.setAttribute('aria-busy', String(isLoading));
  if (isLoading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Calculating…';
  } else {
    if (btn.dataset.originalText) {
      btn.innerHTML = btn.dataset.originalText;
    }
  }
};

/**
 * Update ROI results in the DOM.
 * @param {Object} data
 */
const updateROIUI = (data) => {
  setElText('roi-result-value',      formatPercent(data.roi));
  setElText('roi-net-profit',        formatCurrency(data.netProfit));
  setElText('roi-display-revenue',   formatCurrency(data.revenue));
  setElText('roi-display-investment', formatCurrency(data.investment));

  const statusEl = document.getElementById('roi-result-status');
  if (statusEl) {
    const { cls, label } = getROIStatus(data.roi);
    statusEl.textContent = label;
    statusEl.className   = `result-card__status status--${cls}`;
  }

  updateInterpretation('roi-interpretation', getROIInterpretation(data));
  showResults('roi');
  renderROIChart(data);
};

/**
 * Update ROAS results in the DOM.
 * @param {Object} data
 */
const updateROASUI = (data) => {
  setElText('roas-result-value',    `${data.roas}×`);
  setElText('roas-display-revenue', formatCurrency(data.revenue));
  setElText('roas-display-spend',   formatCurrency(data.adSpend));
  setElText('roas-per-dollar',      formatCurrency(data.revenuePerDollar));

  const statusEl = document.getElementById('roas-result-status');
  if (statusEl) {
    const { cls, label } = getROASStatus(data.roas);
    statusEl.textContent = label;
    statusEl.className   = `result-card__status status--${cls}`;
  }

  updateInterpretation('roas-interpretation', getROASInterpretation(data));
  showResults('roas');
  renderROASChart(data);
};

/**
 * Update CPA results in the DOM.
 * @param {Object} data
 */
const updateCPAUI = (data) => {
  setElText('cpa-result-value',         formatCurrency(data.cpa));
  setElText('cpa-display-spend',        formatCurrency(data.spend));
  setElText('cpa-display-conversions',  data.conversions.toLocaleString());
  setElText('cpa-per-hundred',          data.conversionsPerHundred.toFixed(2));

  const statusEl = document.getElementById('cpa-result-status');
  if (statusEl) {
    statusEl.textContent = 'See Interpretation Below';
    statusEl.className   = 'result-card__status status--good';
  }

  updateInterpretation('cpa-interpretation', getCPAInterpretation(data));
  showResults('cpa');
  renderCPAChart(data);
};

/**
 * Update CPM results in the DOM.
 * @param {Object} data
 */
const updateCPMUI = (data) => {
  setElText('cpm-result-value',          formatCurrency(data.cpm));
  setElText('cpm-display-spend',         formatCurrency(data.spend));
  setElText('cpm-display-impressions',   data.impressions.toLocaleString());
  setElText('cpm-per-impression',        `$${data.costPerImpression.toFixed(5)}`);

  const statusEl = document.getElementById('cpm-result-status');
  if (statusEl) {
    const { cls, label } = getCPMStatus(data.cpm);
    statusEl.textContent = label;
    statusEl.className   = `result-card__status status--${cls}`;
  }

  updateInterpretation('cpm-interpretation', getCPMInterpretation(data));
  showResults('cpm');
  renderCPMChart(data);
};

/**
 * Update CTR results in the DOM.
 * @param {Object} data
 */
const updateCTRUI = (data) => {
  setElText('ctr-result-value',          formatPercent(data.ctr));
  setElText('ctr-display-clicks',        data.clicks.toLocaleString());
  setElText('ctr-display-impressions',   data.impressions.toLocaleString());
  setElText('ctr-non-clicks',            data.nonClicks.toLocaleString());

  const statusEl = document.getElementById('ctr-result-status');
  if (statusEl) {
    const { cls, label } = getCTRStatus(data.ctr);
    statusEl.textContent = label;
    statusEl.className   = `result-card__status status--${cls}`;
  }

  updateInterpretation('ctr-interpretation', getCTRInterpretation(data));
  showResults('ctr');
  renderCTRChart(data);
};

/**
 * Update Break-even results in the DOM.
 * @param {Object} data
 */
const updateBreakEvenUI = (data) => {
  setElText('be-result-units',        formatNumber(data.breakEvenUnitsCeil));
  setElText('be-result-revenue',      formatCurrency(data.breakEvenRevenue));
  setElText('be-contribution-margin', formatCurrency(data.contributionMargin));
  setElText('be-margin-ratio',        formatPercent(data.marginRatio));

  const statusEl = document.getElementById('be-result-status');
  if (statusEl) {
    statusEl.textContent = `Sell ${formatNumber(data.breakEvenUnitsCeil)} units`;
    statusEl.className   = 'result-card__status status--good';
  }

  updateInterpretation('be-interpretation', getBreakEvenInterpretation(data));
  showResults('breakeven');
  renderBreakEvenChart(data);
};

/**
 * Update Profit Margin results in the DOM.
 * @param {Object} data
 */
const updateMarginUI = (data) => {
  setElText('margin-gross',           formatPercent(data.grossMargin));
  setElText('margin-operating-result', formatPercent(data.operatingMargin));
  setElText('margin-net',             formatPercent(data.netMargin));
  setElText('margin-gross-profit',    formatCurrency(data.grossProfit));
  setElText('margin-op-profit',       formatCurrency(data.operatingProfit));
  setElText('margin-net-profit',      formatCurrency(data.netProfit));
  setElText('margin-total-costs',     formatCurrency(data.totalCosts));

  updateInterpretation('margin-interpretation', getMarginInterpretation(data));
  showResults('margin');
  renderMarginChart(data);
};

/**
 * Set interpretation box content and style.
 * @param {string} elId - Element ID
 * @param {Object} config - { icon, text, type }
 */
const updateInterpretation = (elId, config) => {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = `
    <i class="fa-solid ${config.icon}" aria-hidden="true"></i>
    <span>${sanitizeString(config.text)}</span>
  `;
  el.className = `interpretation-box interp--${config.type}`;
};


/* ═══════════════════════════════════════════════════════════════════
   08. INTERPRETATION ENGINE
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Get ROI status badge config.
 * @param {number} roi
 * @returns {{ cls: string, label: string }}
 */
const getROIStatus = (roi) => {
  if (roi >= ROI_BENCHMARKS.EXCELLENT) return { cls: 'excellent', label: '🏆 Excellent ROI' };
  if (roi >= ROI_BENCHMARKS.GOOD)      return { cls: 'good',      label: '✅ Good ROI'      };
  if (roi >= ROI_BENCHMARKS.MARGINAL)  return { cls: 'warning',   label: '⚠️ Marginal ROI'  };
  if (roi >= ROI_BENCHMARKS.POOR)      return { cls: 'warning',   label: '⚠️ Low ROI'       };
  return                                      { cls: 'poor',      label: '❌ Negative ROI'  };
};

/**
 * Get ROI interpretation message.
 * @param {Object} data
 * @returns {Object}
 */
const getROIInterpretation = (data) => {
  const r = data.roi;
  if (r >= ROI_BENCHMARKS.EXCELLENT) {
    return {
      icon: 'fa-trophy',
      type: 'excellent',
      text: `Outstanding! Your ROI of ${formatPercent(r)} is exceptional. For every $1 invested, you're generating ${formatCurrency(1 + r / 100)} — a highly profitable campaign.`,
    };
  }
  if (r >= ROI_BENCHMARKS.GOOD) {
    return {
      icon: 'fa-circle-check',
      type: 'good',
      text: `Great performance! Your ROI of ${formatPercent(r)} is solid and above average. You're generating ${formatCurrency(data.netProfit)} net profit from this investment.`,
    };
  }
  if (r >= ROI_BENCHMARKS.POOR) {
    return {
      icon: 'fa-triangle-exclamation',
      type: 'warning',
      text: `Your ROI of ${formatPercent(r)} is positive but low. Consider optimizing your strategy to increase revenue or reduce costs to improve profitability.`,
    };
  }
  return {
    icon: 'fa-circle-xmark',
    type: 'poor',
    text: `Your ROI of ${formatPercent(r)} is negative — you're losing money. Review your costs (${formatCurrency(data.investment)}) vs. revenue (${formatCurrency(data.revenue)}) urgently.`,
  };
};

/**
 * Get ROAS status badge config.
 * @param {number} roas
 * @returns {{ cls: string, label: string }}
 */
const getROASStatus = (roas) => {
  if (roas >= ROAS_BENCHMARKS.EXCELLENT) return { cls: 'excellent', label: '🏆 Excellent ROAS' };
  if (roas >= ROAS_BENCHMARKS.GOOD)      return { cls: 'good',      label: '✅ Good ROAS'      };
  if (roas >= ROAS_BENCHMARKS.MARGINAL)  return { cls: 'warning',   label: '⚠️ Marginal ROAS'  };
  if (roas >= ROAS_BENCHMARKS.POOR)      return { cls: 'warning',   label: '⚠️ Break-even'     };
  return                                        { cls: 'poor',      label: '❌ Negative ROAS'  };
};

/**
 * Get ROAS interpretation message.
 * @param {Object} data
 * @returns {Object}
 */
const getROASInterpretation = (data) => {
  const r = data.roas;
  if (r >= ROAS_BENCHMARKS.EXCELLENT) {
    return {
      icon: 'fa-trophy',
      type: 'excellent',
      text: `Exceptional ROAS of ${r}×! For every $1 you spend on ads, you're generating ${formatCurrency(r)} in revenue. This is a top-performing campaign.`,
    };
  }
  if (r >= ROAS_BENCHMARKS.GOOD) {
    return {
      icon: 'fa-circle-check',
      type: 'good',
      text: `Good ROAS of ${r}×. Industry benchmark is 4× — you're performing well. Scale your budget strategically to maximize returns.`,
    };
  }
  if (r >= ROAS_BENCHMARKS.POOR) {
    return {
      icon: 'fa-triangle-exclamation',
      type: 'warning',
      text: `Your ROAS of ${r}× is marginal. Depending on your margins, you may be barely profitable. Optimize creatives, targeting and landing pages.`,
    };
  }
  return {
    icon: 'fa-circle-xmark',
    type: 'poor',
    text: `ROAS of ${r}× means you're losing money on ads. You spent ${formatCurrency(data.adSpend)} but only generated ${formatCurrency(data.revenue)}. Pause and audit the campaign immediately.`,
  };
};

/**
 * Get CPA interpretation message.
 * @param {Object} data
 * @returns {Object}
 */
const getCPAInterpretation = (data) => ({
  icon: 'fa-circle-info',
  type: 'good',
  text: `Your Cost Per Acquisition is ${formatCurrency(data.cpa)}. You're getting ${data.conversionsPerHundred} conversions per $100 spent. To improve CPA, optimize your targeting, ad creative, and landing page conversion rate.`,
});

/**
 * Get CPM status badge config.
 * @param {number} cpm
 * @returns {{ cls: string, label: string }}
 */
const getCPMStatus = (cpm) => {
  if (cpm <= CPM_BENCHMARKS.EXCELLENT) return { cls: 'excellent', label: '🏆 Very Cheap Reach' };
  if (cpm <= CPM_BENCHMARKS.GOOD)      return { cls: 'good',      label: '✅ Good CPM'         };
  if (cpm <= CPM_BENCHMARKS.MODERATE)  return { cls: 'warning',   label: '⚠️ Moderate CPM'    };
  return                                      { cls: 'poor',      label: '❌ High CPM'         };
};

/**
 * Get CPM interpretation message.
 * @param {Object} data
 * @returns {Object}
 */
const getCPMInterpretation = (data) => {
  const c = data.cpm;
  if (c <= CPM_BENCHMARKS.EXCELLENT) {
    return {
      icon: 'fa-trophy',
      type: 'excellent',
      text: `Excellent CPM of ${formatCurrency(c)}! Very cheap reach. You're getting 1,000 impressions for just ${formatCurrency(c)} — use this to build massive brand awareness.`,
    };
  }
  if (c <= CPM_BENCHMARKS.GOOD) {
    return {
      icon: 'fa-circle-check',
      type: 'good',
      text: `Good CPM of ${formatCurrency(c)}. This is within the average display advertising range ($5–$15). Your budget is being used efficiently.`,
    };
  }
  if (c <= CPM_BENCHMARKS.MODERATE) {
    return {
      icon: 'fa-triangle-exclamation',
      type: 'warning',
      text: `Moderate CPM of ${formatCurrency(c)}. This is typical for social media or video ads. Consider A/B testing audiences to find cheaper reach.`,
    };
  }
  return {
    icon: 'fa-circle-xmark',
    type: 'poor',
    text: `High CPM of ${formatCurrency(c)}. Premium placement or narrow audience targeting is expensive. Broaden your audience or test different ad formats.`,
  };
};

/**
 * Get CTR status badge config.
 * @param {number} ctr
 * @returns {{ cls: string, label: string }}
 */
const getCTRStatus = (ctr) => {
  if (ctr >= CTR_BENCHMARKS.EXCELLENT) return { cls: 'excellent', label: '🏆 Top Performer'    };
  if (ctr >= CTR_BENCHMARKS.GOOD)      return { cls: 'good',      label: '✅ Strong CTR'       };
  if (ctr >= CTR_BENCHMARKS.AVERAGE)   return { cls: 'good',      label: '✅ Average CTR'      };
  if (ctr >= CTR_BENCHMARKS.POOR)      return { cls: 'warning',   label: '⚠️ Below Average'    };
  return                                      { cls: 'poor',      label: '❌ Poor CTR'         };
};

/**
 * Get CTR interpretation message.
 * @param {Object} data
 * @returns {Object}
 */
const getCTRInterpretation = (data) => {
  const c = data.ctr;
  if (c >= CTR_BENCHMARKS.EXCELLENT) {
    return {
      icon: 'fa-trophy',
      type: 'excellent',
      text: `Exceptional CTR of ${formatPercent(c, 2)}! Your ad is highly compelling — ${data.clicks.toLocaleString()} clicks from ${data.impressions.toLocaleString()} impressions. Scale this creative immediately.`,
    };
  }
  if (c >= CTR_BENCHMARKS.AVERAGE) {
    return {
      icon: 'fa-circle-check',
      type: 'good',
      text: `Good CTR of ${formatPercent(c, 2)}. Your ad is resonating with the audience. Benchmark is 1–2% for most platforms. Continue testing to push above 3%.`,
    };
  }
  if (c >= CTR_BENCHMARKS.POOR) {
    return {
      icon: 'fa-triangle-exclamation',
      type: 'warning',
      text: `Below average CTR of ${formatPercent(c, 2)}. Only ${data.clicks.toLocaleString()} of ${data.impressions.toLocaleString()} viewers clicked. Improve your headline, visuals, and call-to-action.`,
    };
  }
  return {
    icon: 'fa-circle-xmark',
    type: 'poor',
    text: `Very low CTR of ${formatPercent(c, 2)}. Your ad is failing to attract attention. Consider a complete creative overhaul — different copy, visuals, audience, and offer.`,
  };
};

/**
 * Get Break-even interpretation message.
 * @param {Object} data
 * @returns {Object}
 */
const getBreakEvenInterpretation = (data) => ({
  icon: 'fa-scale-balanced',
  type: 'good',
  text: `You need to sell ${formatNumber(data.breakEvenUnitsCeil)} units to break even, generating ${formatCurrency(data.breakEvenRevenue)} in revenue. Your contribution margin is ${formatCurrency(data.contributionMargin)}/unit (${formatPercent(data.marginRatio)}). Every unit sold above ${formatNumber(data.breakEvenUnitsCeil)} is pure profit.`,
});

/**
 * Get Profit Margin interpretation message.
 * @param {Object} data
 * @returns {Object}
 */
const getMarginInterpretation = (data) => {
  const n = data.netMargin;
  if (n >= MARGIN_BENCHMARKS.EXCELLENT) {
    return {
      icon: 'fa-trophy',
      type: 'excellent',
      text: `Outstanding! Net Profit Margin of ${formatPercent(n)} is excellent (industry average is 7–10%). You're retaining ${formatPercent(n)} of every dollar earned as profit.`,
    };
  }
  if (n >= MARGIN_BENCHMARKS.GOOD) {
    return {
      icon: 'fa-circle-check',
      type: 'good',
      text: `Good profitability with a Net Margin of ${formatPercent(n)}. Your gross margin is ${formatPercent(data.grossMargin)} and operating margin is ${formatPercent(data.operatingMargin)}. Healthy business performance.`,
    };
  }
  if (n >= MARGIN_BENCHMARKS.POOR) {
    return {
      icon: 'fa-triangle-exclamation',
      type: 'warning',
      text: `Net Margin of ${formatPercent(n)} is low. Consider increasing prices, reducing COGS (${formatCurrency(data.cogs)}), or cutting operating expenses (${formatCurrency(data.operatingExpenses)}).`,
    };
  }
  if (n >= 0) {
    return {
      icon: 'fa-triangle-exclamation',
      type: 'warning',
      text: `Very thin Net Margin of ${formatPercent(n)}. You're barely profitable. Total costs of ${formatCurrency(data.totalCosts)} are nearly equal to revenue of ${formatCurrency(data.revenue)}.`,
    };
  }
  return {
    icon: 'fa-circle-xmark',
    type: 'poor',
    text: `Negative Net Margin of ${formatPercent(n)} — your business is operating at a loss of ${formatCurrency(Math.abs(data.netProfit))}. Immediate cost reduction and revenue growth strategies are needed.`,
  };
};


/* ═══════════════════════════════════════════════════════════════════
   09. DASHBOARD ENGINE
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Update dashboard with latest results.
 */
const updateDashboard = () => {
  const { results } = appState;

  // ROI Card
  if (results.roi) {
    setElText('dash-roi-value', formatPercent(results.roi.roi));
    const s = document.getElementById('dash-roi-status');
    if (s) {
      const { cls, label } = getROIStatus(results.roi.roi);
      s.textContent = label;
      s.className   = `dashboard-card__status status--${cls}`;
    }
  }

  // ROAS Card
  if (results.roas) {
    setElText('dash-roas-value', `${results.roas.roas}×`);
    const s = document.getElementById('dash-roas-status');
    if (s) {
      const { cls, label } = getROASStatus(results.roas.roas);
      s.textContent = label;
      s.className   = `dashboard-card__status status--${cls}`;
    }
  }

  // CPA Card
  if (results.cpa) {
    setElText('dash-cpa-value', formatCurrency(results.cpa.cpa));
    const s = document.getElementById('dash-cpa-status');
    if (s) {
      s.textContent = `${results.cpa.conversions.toLocaleString()} conversions`;
      s.className   = 'dashboard-card__status status--good';
    }
  }

  // CPM Card
  if (results.cpm) {
    setElText('dash-cpm-value', formatCurrency(results.cpm.cpm));
    const s = document.getElementById('dash-cpm-status');
    if (s) {
      const { cls, label } = getCPMStatus(results.cpm.cpm);
      s.textContent = label;
      s.className   = `dashboard-card__status status--${cls}`;
    }
  }

  // CTR Card
  if (results.ctr) {
    setElText('dash-ctr-value', formatPercent(results.ctr.ctr));
    const s = document.getElementById('dash-ctr-status');
    if (s) {
      const { cls, label } = getCTRStatus(results.ctr.ctr);
      s.textContent = label;
      s.className   = `dashboard-card__status status--${cls}`;
    }
  }

  // Break-even Card
  if (results.breakeven) {
    setElText('dash-be-value', `${formatNumber(results.breakeven.breakEvenUnitsCeil)} units`);
    const s = document.getElementById('dash-be-status');
    if (s) {
      s.textContent = `${formatCurrency(results.breakeven.breakEvenRevenue)} revenue needed`;
      s.className   = 'dashboard-card__status status--good';
    }
  }

  // Margin Card
  if (results.margin) {
    setElText('dash-margin-value', formatPercent(results.margin.netMargin));
    const s = document.getElementById('dash-margin-status');
    if (s) {
      const n = results.margin.netMargin;
      const cls = n >= MARGIN_BENCHMARKS.GOOD ? 'good' : n >= 0 ? 'warning' : 'poor';
      s.textContent = n >= 0 ? `Gross: ${formatPercent(results.margin.grossMargin)}` : 'Operating at Loss';
      s.className   = `dashboard-card__status status--${cls}`;
    }
  }

  // Campaign Score
  updateCampaignScore();

  // Dashboard chart
  const chartSection = document.getElementById('dashboard-chart-section');
  const hasAnyResult = Object.values(results).some((r) => r !== null);
  if (hasAnyResult && chartSection) {
    chartSection.removeAttribute('hidden');
    renderDashboardChart(results);
  }

  // Save to localStorage
  saveToStorage();
};

/**
 * Calculate and display overall campaign score.
 */
const updateCampaignScore = () => {
  const { results } = appState;
  let scorePoints = 0;
  let scoreCount  = 0;

  if (results.roi) {
    const r = results.roi.roi;
    scorePoints += r >= ROI_BENCHMARKS.EXCELLENT ? 100 : r >= ROI_BENCHMARKS.GOOD ? 75 : r >= ROI_BENCHMARKS.POOR ? 40 : 10;
    scoreCount++;
  }
  if (results.roas) {
    const r = results.roas.roas;
    scorePoints += r >= ROAS_BENCHMARKS.EXCELLENT ? 100 : r >= ROAS_BENCHMARKS.GOOD ? 75 : r >= ROAS_BENCHMARKS.POOR ? 40 : 10;
    scoreCount++;
  }
  if (results.ctr) {
    const c = results.ctr.ctr;
    scorePoints += c >= CTR_BENCHMARKS.EXCELLENT ? 100 : c >= CTR_BENCHMARKS.GOOD ? 75 : c >= CTR_BENCHMARKS.AVERAGE ? 50 : 25;
    scoreCount++;
  }
  if (results.margin) {
    const n = results.margin.netMargin;
    scorePoints += n >= MARGIN_BENCHMARKS.EXCELLENT ? 100 : n >= MARGIN_BENCHMARKS.GOOD ? 75 : n >= MARGIN_BENCHMARKS.POOR ? 40 : 10;
    scoreCount++;
  }

  if (scoreCount === 0) {
    setElText('dash-score-value', '—');
    setElText('dash-score-label', 'Calculate metrics to see score');
    return;
  }

  const avgScore = Math.round(scorePoints / scoreCount);
  setElText('dash-score-value', `${avgScore}/100`);

  let label;
  if (avgScore >= 85) label = '🏆 Excellent Campaign';
  else if (avgScore >= 65) label = '✅ Good Performance';
  else if (avgScore >= 45) label = '⚠️ Needs Optimization';
  else label = '❌ Poor Performance';

  setElText('dash-score-label', label);
};


/* ═══════════════════════════════════════════════════════════════════
   10. TOAST NOTIFICATION SYSTEM
   ═══════════════════════════════════════════════════════════════════ */

const TOAST_ICONS = {
  success: 'fa-circle-check',
  error:   'fa-circle-xmark',
  warning: 'fa-triangle-exclamation',
  info:    'fa-circle-info',
};

/**
 * Show a toast notification.
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 * @param {string} title - Toast title
 * @param {string} message - Toast body message
 * @param {number} [duration] - Auto-dismiss ms (0 = no auto-dismiss)
 */
const showToast = (type, title, message, duration = TOAST_DURATION) => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className  = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.innerHTML = `
    <div class="toast__icon" aria-hidden="true">
      <i class="fa-solid ${TOAST_ICONS[type] || 'fa-circle-info'}"></i>
    </div>
    <div class="toast__body">
      <div class="toast__title">${sanitizeString(title)}</div>
      ${message ? `<div class="toast__message">${sanitizeString(message)}</div>` : ''}
    </div>
    <button class="toast__close" aria-label="Close notification" type="button">
      <i class="fa-solid fa-xmark" aria-hidden="true"></i>
    </button>
  `;

  const closeBtn = toast.querySelector('.toast__close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => dismissToast(toast));
  }

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => dismissToast(toast), duration);
  }
};

/**
 * Dismiss a toast with exit animation.
 * @param {HTMLElement} toast
 */
const dismissToast = (toast) => {
  if (!toast || !toast.parentNode) return;
  toast.classList.add('toast--exit');
  toast.addEventListener('animationend', () => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, { once: true });
};


/* ═══════════════════════════════════════════════════════════════════
   11. THEME SYSTEM
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Apply a theme to the document.
 * @param {string} theme - 'dark' | 'light'
 */
const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  appState.theme = theme;

  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  }

  const btn = document.getElementById('theme-toggle');
  if (btn) btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);

  // Rebuild all active charts with new theme colors
  Object.keys(appState.results).forEach((key) => {
    if (appState.results[key]) {
      try {
        const renderFn = {
          roi:       () => renderROIChart(appState.results.roi),
          roas:      () => renderROASChart(appState.results.roas),
          cpa:       () => renderCPAChart(appState.results.cpa),
          cpm:       () => renderCPMChart(appState.results.cpm),
          ctr:       () => renderCTRChart(appState.results.ctr),
          breakeven: () => renderBreakEvenChart(appState.results.breakeven),
          margin:    () => renderMarginChart(appState.results.margin),
        }[key];
        if (renderFn) renderFn();
      } catch (_) {}
    }
  });

  if (Object.values(appState.results).some((r) => r !== null)) {
    renderDashboardChart(appState.results);
  }

  localStorage.setItem(`${STORAGE_KEY}_theme`, theme);
};

/**
 * Toggle between dark and light theme.
 */
const toggleTheme = () => {
  const current = getCurrentTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
};


/* ═══════════════════════════════════════════════════════════════════
   12. TOOLTIP SYSTEM
   ═══════════════════════════════════════════════════════════════════ */

const tooltipEl = document.getElementById('global-tooltip');
let tooltipTimeout = null;

/**
 * Show global tooltip near an element.
 * @param {HTMLElement} anchor - Trigger element
 * @param {string} text - Tooltip text
 */
const showTooltip = (anchor, text) => {
  if (!tooltipEl || !text) return;

  tooltipEl.textContent = text;
  tooltipEl.setAttribute('aria-hidden', 'false');

  const rect   = anchor.getBoundingClientRect();
  const tWidth = tooltipEl.offsetWidth || 240;
  let left = rect.left + rect.width / 2 - tWidth / 2;
  let top  = rect.bottom + window.scrollY + 10;

  // Prevent overflow right
  const maxLeft = window.innerWidth - tWidth - 16;
  left = clamp(left, 8, maxLeft);

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top  = `${top}px`;
  tooltipEl.classList.add('tooltip--visible');
};

/**
 * Hide the global tooltip.
 */
const hideTooltip = () => {
  if (!tooltipEl) return;
  tooltipEl.classList.remove('tooltip--visible');
  tooltipEl.setAttribute('aria-hidden', 'true');
};

/**
 * Bind tooltip behavior to all tooltip buttons.
 */
const initTooltips = () => {
  document.querySelectorAll('.tooltip-btn').forEach((btn) => {
    const text = btn.getAttribute('data-tooltip');
    if (!text) return;

    btn.addEventListener('mouseenter', () => {
      if (tooltipTimeout) clearTimeout(tooltipTimeout);
      tooltipTimeout = setTimeout(() => showTooltip(btn, text), 200);
    });

    btn.addEventListener('mouseleave', () => {
      if (tooltipTimeout) clearTimeout(tooltipTimeout);
      hideTooltip();
    });

    btn.addEventListener('focus', () => showTooltip(btn, text));
    btn.addEventListener('blur',  () => hideTooltip());

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showTooltip(btn, text);
      setTimeout(hideTooltip, 3000);
    });
  });
};


/* ═══════════════════════════════════════════════════════════════════
   13. MODAL SYSTEM
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Open the clear-all confirmation modal.
 */
const openClearModal = () => {
  const modal = document.getElementById('modal-clear');
  if (!modal) return;
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  const cancelBtn = document.getElementById('modal-cancel');
  if (cancelBtn) cancelBtn.focus();
};

/**
 * Close the clear-all confirmation modal.
 */
const closeClearModal = () => {
  const modal = document.getElementById('modal-clear');
  if (!modal) return;
  modal.setAttribute('hidden', '');
  document.body.style.overflow = '';
  const clearBtn = document.getElementById('clear-all-btn');
  if (clearBtn) clearBtn.focus();
};

/**
 * Execute full reset of all calculators and state.
 */
const executeResetAll = () => {
  // Reset all forms
  const formResets = [
    { id: 'form-roi',       fields: ['roi-revenue', 'roi-investment'] },
    { id: 'form-roas',      fields: ['roas-revenue', 'roas-adspend'] },
    { id: 'form-cpa',       fields: ['cpa-spend', 'cpa-conversions'] },
    { id: 'form-cpm',       fields: ['cpm-spend', 'cpm-impressions'] },
    { id: 'form-ctr',       fields: ['ctr-clicks', 'ctr-impressions'] },
    { id: 'form-breakeven', fields: ['be-fixed-costs', 'be-selling-price', 'be-variable-cost'] },
    { id: 'form-margin',    fields: ['margin-revenue', 'margin-cogs', 'margin-operating', 'margin-taxes'] },
  ];

  formResets.forEach(({ id, fields }) => resetForm(id, fields));

  // Hide all results
  ['roi', 'roas', 'cpa', 'cpm', 'ctr', 'breakeven', 'margin'].forEach(hideResults);

  // Destroy all charts
  Object.keys(appState.charts).forEach(destroyChart);

  // Reset state
  Object.keys(appState.results).forEach((k) => { appState.results[k] = null; });

  // Reset dashboard displays
  ['roi', 'roas', 'cpa', 'cpm', 'ctr', 'be', 'margin'].forEach((k) => {
    const valEl  = document.getElementById(`dash-${k}-value`);
    const statEl = document.getElementById(`dash-${k}-status`);
    if (valEl)  valEl.textContent  = '—';
    if (statEl) statEl.textContent = '';
  });

  setElText('dash-score-value', '—');
  setElText('dash-score-label', 'Calculate metrics to see score');

  const chartSection = document.getElementById('dashboard-chart-section');
  if (chartSection) chartSection.setAttribute('hidden', '');

  // Clear localStorage
  clearStorage();

  closeClearModal();
  showToast('success', 'Reset Complete', 'All calculators have been cleared successfully.');
};


/* ═══════════════════════════════════════════════════════════════════
   14. FAQ ACCORDION
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Initialize FAQ accordion toggle behavior.
 */
const initFAQ = () => {
  const questions = document.querySelectorAll('.faq-question');

  questions.forEach((question) => {
    question.addEventListener('click', () => {
      const isOpen     = question.getAttribute('aria-expanded') === 'true';
      const answerId   = question.getAttribute('aria-controls');
      const answerEl   = document.getElementById(answerId);

      // Close all others
      questions.forEach((q) => {
        q.setAttribute('aria-expanded', 'false');
        const aid = q.getAttribute('aria-controls');
        const a   = document.getElementById(aid);
        if (a) a.setAttribute('hidden', '');
      });

      // Toggle clicked
      if (!isOpen && answerEl) {
        question.setAttribute('aria-expanded', 'true');
        answerEl.removeAttribute('hidden');
      }
    });

    // Keyboard: Enter and Space
    question.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        question.click();
      }
    });
  });
};


/* ═══════════════════════════════════════════════════════════════════
   15. CLIPBOARD & COPY SYSTEM
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Build a plain-text result summary for copying.
 * @param {string} calcId - Calculator ID
 * @returns {string} Summary text
 */
const buildResultSummary = (calcId) => {
  const data = appState.results[calcId];
  if (!data) return '';

  const line = '─'.repeat(40);
  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'medium', timeStyle: 'short',
  });

  const summaries = {
    roi: () =>
      `MarketIQ Pro — ROI Report\n${line}\n` +
      `ROI:        ${formatPercent(data.roi)}\n` +
      `Net Profit: ${formatCurrency(data.netProfit)}\n` +
      `Revenue:    ${formatCurrency(data.revenue)}\n` +
      `Investment: ${formatCurrency(data.investment)}\n${line}\nCalculated: ${timestamp}`,

    roas: () =>
      `MarketIQ Pro — ROAS Report\n${line}\n` +
      `ROAS:          ${data.roas}×\n` +
      `Revenue:       ${formatCurrency(data.revenue)}\n` +
      `Ad Spend:      ${formatCurrency(data.adSpend)}\n` +
      `Per $1 Spent:  ${formatCurrency(data.revenuePerDollar)}\n${line}\nCalculated: ${timestamp}`,

    cpa: () =>
      `MarketIQ Pro — CPA Report\n${line}\n` +
      `CPA:         ${formatCurrency(data.cpa)}\n` +
      `Total Spend: ${formatCurrency(data.spend)}\n` +
      `Conversions: ${data.conversions.toLocaleString()}\n` +
      `Conv/100$:   ${data.conversionsPerHundred}\n${line}\nCalculated: ${timestamp}`,

    cpm: () =>
      `MarketIQ Pro — CPM Report\n${line}\n` +
      `CPM:               ${formatCurrency(data.cpm)}\n` +
      `Total Spend:       ${formatCurrency(data.spend)}\n` +
      `Impressions:       ${data.impressions.toLocaleString()}\n` +
      `Per Impression:    $${data.costPerImpression.toFixed(5)}\n${line}\nCalculated: ${timestamp}`,

    ctr: () =>
      `MarketIQ Pro — CTR Report\n${line}\n` +
      `CTR:         ${formatPercent(data.ctr)}\n` +
      `Clicks:      ${data.clicks.toLocaleString()}\n` +
      `Impressions: ${data.impressions.toLocaleString()}\n` +
      `Non-Clicks:  ${data.nonClicks.toLocaleString()}\n${line}\nCalculated: ${timestamp}`,

    breakeven: () =>
      `MarketIQ Pro — Break-even Report\n${line}\n` +
      `Break-even Units:   ${formatNumber(data.breakEvenUnitsCeil)}\n` +
      `Break-even Revenue: ${formatCurrency(data.breakEvenRevenue)}\n` +
      `Contribution Margin:${formatCurrency(data.contributionMargin)}\n` +
      `Margin Ratio:       ${formatPercent(data.marginRatio)}\n${line}\nCalculated: ${timestamp}`,

    margin: () =>
      `MarketIQ Pro — Profit Margin Report\n${line}\n` +
      `Gross Margin:     ${formatPercent(data.grossMargin)}\n` +
      `Operating Margin: ${formatPercent(data.operatingMargin)}\n` +
      `Net Margin:       ${formatPercent(data.netMargin)}\n` +
      `Net Profit:       ${formatCurrency(data.netProfit)}\n` +
      `Total Costs:      ${formatCurrency(data.totalCosts)}\n${line}\nCalculated: ${timestamp}`,
  };

  return summaries[calcId] ? summaries[calcId]() : '';
};

/**
 * Copy text to clipboard.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
};

/**
 * Handle copy result button click.
 * @param {HTMLElement} btn
 */
const handleCopyResult = async (btn) => {
  const target = btn.getAttribute('data-target');
  if (!target) return;

  const text = buildResultSummary(target);
  if (!text) {
    showToast('warning', 'Nothing to Copy', 'Calculate first to generate results.');
    return;
  }

  const ok = await copyToClipboard(text);
  if (ok) {
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Copied!';
    btn.disabled  = true;
    showToast('success', 'Copied!', 'Results copied to clipboard.');
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.disabled  = false;
    }, 2000);
  } else {
    showToast('error', 'Copy Failed', 'Could not access clipboard. Please copy manually.');
  }
};


/* ═══════════════════════════════════════════════════════════════════
   16. PDF EXPORT ENGINE
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Export all calculated results to a PDF.
 */
const exportToPDF = () => {
  const hasResults = Object.values(appState.results).some((r) => r !== null);
  if (!hasResults) {
    showToast('warning', 'No Results', 'Calculate at least one metric before exporting.');
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin     = 20;
    const colWidth   = pageWidth - margin * 2;
    let y            = margin;

    // ── Helpers ──
    const checkNewPage = (needed = 20) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const drawLine = (thickness = 0.3) => {
      doc.setLineWidth(thickness);
      doc.setDrawColor(108, 99, 255);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
    };

    const addText = (text, x, fontSize, fontStyle, color) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', fontStyle);
      doc.setTextColor(...color);
      doc.text(text, x, y);
      y += fontSize * 0.45 + 2;
    };

    const addKeyValue = (key, value) => {
      checkNewPage(8);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 120);
      doc.text(key, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(20, 20, 40);
      doc.text(String(value), margin + 70, y);
      y += 7;
    };

    // ── Cover Header ──
    doc.setFillColor(108, 99, 255);
    doc.rect(0, 0, pageWidth, 42, 'F');

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('MarketIQ Pro', margin, 20);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 255);
    doc.text('Marketing Analytics Report', margin, 30);
    doc.text(
      `Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}`,
      margin, 38
    );

    y = 52;

    // ── ROI ──
    if (appState.results.roi) {
      const d = appState.results.roi;
      checkNewPage(50);
      addText('ROI — Return on Investment', margin, 14, 'bold', [108, 99, 255]);
      drawLine();
      addKeyValue('ROI:', formatPercent(d.roi));
      addKeyValue('Net Profit:', formatCurrency(d.netProfit));
      addKeyValue('Total Revenue:', formatCurrency(d.revenue));
      addKeyValue('Total Investment:', formatCurrency(d.investment));
      addKeyValue('Status:', d.roi >= 0 ? 'Profitable' : 'Loss');
      y += 4;
    }

    // ── ROAS ──
    if (appState.results.roas) {
      const d = appState.results.roas;
      checkNewPage(50);
      addText('ROAS — Return on Ad Spend', margin, 14, 'bold', [0, 180, 148]);
      drawLine();
      addKeyValue('ROAS:', `${d.roas}×`);
      addKeyValue('Revenue from Ads:', formatCurrency(d.revenue));
      addKeyValue('Ad Spend:', formatCurrency(d.adSpend));
      addKeyValue('Revenue per $1 Spent:', formatCurrency(d.revenuePerDollar));
      y += 4;
    }

    // ── CPA ──
    if (appState.results.cpa) {
      const d = appState.results.cpa;
      checkNewPage(45);
      addText('CPA — Cost Per Acquisition', margin, 14, 'bold', [255, 107, 53]);
      drawLine();
      addKeyValue('CPA:', formatCurrency(d.cpa));
      addKeyValue('Total Ad Spend:', formatCurrency(d.spend));
      addKeyValue('Conversions:', d.conversions.toLocaleString());
      addKeyValue('Conversions per $100:', String(d.conversionsPerHundred));
      y += 4;
    }

    // ── CPM ──
    if (appState.results.cpm) {
      const d = appState.results.cpm;
      checkNewPage(45);
      addText('CPM — Cost Per 1,000 Impressions', margin, 14, 'bold', [59, 130, 246]);
      drawLine();
      addKeyValue('CPM:', formatCurrency(d.cpm));
      addKeyValue('Total Spend:', formatCurrency(d.spend));
      addKeyValue('Total Impressions:', d.impressions.toLocaleString());
      addKeyValue('Cost per Impression:', `$${d.costPerImpression.toFixed(5)}`);
      y += 4;
    }

    // ── CTR ──
    if (appState.results.ctr) {
      const d = appState.results.ctr;
      checkNewPage(45);
      addText('CTR — Click-Through Rate', margin, 14, 'bold', [245, 158, 11]);
      drawLine();
      addKeyValue('CTR:', formatPercent(d.ctr));
      addKeyValue('Total Clicks:', d.clicks.toLocaleString());
      addKeyValue('Total Impressions:', d.impressions.toLocaleString());
      addKeyValue('Non-Clicks:', d.nonClicks.toLocaleString());
      y += 4;
    }

    // ── Break-even ──
    if (appState.results.breakeven) {
      const d = appState.results.breakeven;
      checkNewPage(55);
      addText('Break-even Analysis', margin, 14, 'bold', [139, 92, 246]);
      drawLine();
      addKeyValue('Break-even Units:', formatNumber(d.breakEvenUnitsCeil));
      addKeyValue('Break-even Revenue:', formatCurrency(d.breakEvenRevenue));
      addKeyValue('Contribution Margin:', formatCurrency(d.contributionMargin));
      addKeyValue('Contribution Ratio:', formatPercent(d.marginRatio));
      addKeyValue('Fixed Costs:', formatCurrency(d.fixedCosts));
      addKeyValue('Variable Cost/Unit:', formatCurrency(d.variableCost));
      addKeyValue('Selling Price/Unit:', formatCurrency(d.sellingPrice));
      y += 4;
    }

    // ── Profit Margin ──
    if (appState.results.margin) {
      const d = appState.results.margin;
      checkNewPage(65);
      addText('Profit Margin Analysis', margin, 14, 'bold', [16, 185, 129]);
      drawLine();
      addKeyValue('Gross Margin:', formatPercent(d.grossMargin));
      addKeyValue('Operating Margin:', formatPercent(d.operatingMargin));
      addKeyValue('Net Profit Margin:', formatPercent(d.netMargin));
      addKeyValue('Gross Profit:', formatCurrency(d.grossProfit));
      addKeyValue('Operating Profit:', formatCurrency(d.operatingProfit));
      addKeyValue('Net Profit:', formatCurrency(d.netProfit));
      addKeyValue('Total Costs:', formatCurrency(d.totalCosts));
      y += 4;
    }

    // ── Footer ──
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 192);
      doc.text(
        `MarketIQ Pro | marketiqpro.app | Page ${i} of ${totalPages}`,
        pageWidth / 2, pageHeight - 10, { align: 'center' }
      );
    }

    doc.save(`MarketIQ-Pro-Report-${Date.now()}.pdf`);
    showToast('success', 'PDF Exported!', 'Your report has been downloaded successfully.');
  } catch (err) {
    showToast('error', 'Export Failed', 'Could not generate PDF. Please try again.');
  }
};


/* ═══════════════════════════════════════════════════════════════════
   17. LOCALSTORAGE ENGINE
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Save current results to localStorage.
 */
const saveToStorage = () => {
  try {
    const data = {
      version: APP_VERSION,
      results: appState.results,
      theme:   appState.theme,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) {
    // Storage full or blocked — silently ignore
  }
};

/**
 * Load and restore results from localStorage.
 */
const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const data = JSON.parse(raw);
    if (!data || data.version !== APP_VERSION) return;

    // Restore results
    if (data.results) {
      Object.keys(data.results).forEach((key) => {
        if (data.results[key] !== null && appState.results.hasOwnProperty(key)) {
          appState.results[key] = data.results[key];
        }
      });
    }

    // Re-render results
    if (appState.results.roi)       updateROIUI(appState.results.roi);
    if (appState.results.roas)      updateROASUI(appState.results.roas);
    if (appState.results.cpa)       updateCPAUI(appState.results.cpa);
    if (appState.results.cpm)       updateCPMUI(appState.results.cpm);
    if (appState.results.ctr)       updateCTRUI(appState.results.ctr);
    if (appState.results.breakeven) updateBreakEvenUI(appState.results.breakeven);
    if (appState.results.margin)    updateMarginUI(appState.results.margin);

    updateDashboard();
  } catch (_) {
    // Corrupt data — silently ignore
  }
};

/**
 * Clear all stored data.
 */
const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
};


/* ═══════════════════════════════════════════════════════════════════
   18. ANIMATION ENGINE
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Animate count-up for stats banner numbers.
 */
const animateStatCounters = () => {
  const counters = document.querySelectorAll('[data-count]');
  counters.forEach((el) => {
    const target   = parseInt(el.getAttribute('data-count'), 10);
    const duration = 1500;
    const start    = performance.now();

    const tick = (now) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
};

/**
 * Hide the loader screen.
 */
const hideLoader = () => {
  const loader = document.getElementById('loader');
  if (!loader) return;
  setTimeout(() => {
    loader.classList.add('loader--hidden');
    loader.addEventListener('transitionend', () => {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, { once: true });
  }, 1600);
};


/* ═══════════════════════════════════════════════════════════════════
   19. HEADER SCROLL BEHAVIOR
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Add/remove scrolled class on header.
 */
const initHeaderScroll = () => {
  const header = document.getElementById('header');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('header--scrolled', window.scrollY > 20);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
};


/* ═══════════════════════════════════════════════════════════════════
   20. KEYBOARD NAVIGATION
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Enable keyboard navigation for calculator tabs.
 * Arrow Left/Right to switch tabs.
 */
const initTabKeyboard = () => {
  const tabs = document.querySelectorAll('.calc-tab');
  const tabsArr = Array.from(tabs);

  tabs.forEach((tab, i) => {
    tab.addEventListener('keydown', (e) => {
      let target = null;
      if (e.key === 'ArrowRight') target = tabsArr[(i + 1) % tabsArr.length];
      if (e.key === 'ArrowLeft')  target = tabsArr[(i - 1 + tabsArr.length) % tabsArr.length];
      if (e.key === 'Home')       target = tabsArr[0];
      if (e.key === 'End')        target = tabsArr[tabsArr.length - 1];

      if (target) {
        e.preventDefault();
        target.focus();
        target.click();
      }
    });
  });

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // ESC closes modal
    if (e.key === 'Escape') {
      const modal = document.getElementById('modal-clear');
      if (modal && !modal.hasAttribute('hidden')) closeClearModal();
      hideTooltip();
    }
  });
};


/* ═══════════════════════════════════════════════════════════════════
   21. EVENT LISTENERS
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Initialize calculator tab switching.
 */
const initTabs = () => {
  const tabs   = document.querySelectorAll('.calc-tab');
  const panels = document.querySelectorAll('.calc-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');

      // Update tabs
      tabs.forEach((t) => {
        t.classList.remove('calc-tab--active');
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
      });
      tab.classList.add('calc-tab--active');
      tab.setAttribute('aria-selected', 'true');
      tab.setAttribute('tabindex', '0');

      // Update panels
      panels.forEach((panel) => {
        if (panel.id === `panel-${targetTab}`) {
          panel.removeAttribute('hidden');
          panel.style.display = '';
        } else {
          panel.setAttribute('hidden', '');
        }
      });

      appState.activeTab = targetTab;
    });
  });
};

/**
 * Initialize all calculator form submissions.
 */
const initCalculatorForms = () => {

  // ── ROI Form ──
  document.getElementById('form-roi')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (appState.isProcessing.roi) return;

    const revenue    = safeParseFloat(document.getElementById('roi-revenue')?.value);
    const investment = safeParseFloat(document.getElementById('roi-investment')?.value);

    const values = { 'roi-revenue': revenue, 'roi-investment': investment };
    if (!validateAllFields(Object.keys(values), values)) return;

    appState.isProcessing.roi = true;
    setButtonLoading('roi-submit', true);

    try {
      const result           = calculateROI(revenue, investment);
      appState.results.roi   = result;
      updateROIUI(result);
      updateDashboard();
      showToast('success', 'ROI Calculated!', `Your ROI is ${formatPercent(result.roi)}`);
    } catch (err) {
      showToast('error', 'Calculation Error', err.message || 'Please check your inputs.');
    } finally {
      appState.isProcessing.roi = false;
      setButtonLoading('roi-submit', false);
    }
  });

  document.getElementById('roi-reset')?.addEventListener('click', () => {
    resetForm('form-roi', ['roi-revenue', 'roi-investment']);
    hideResults('roi');
    appState.results.roi = null;
    destroyChart('roi');
  });

  // ── ROAS Form ──
  document.getElementById('form-roas')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (appState.isProcessing.roas) return;

    const revenue = safeParseFloat(document.getElementById('roas-revenue')?.value);
    const adSpend = safeParseFloat(document.getElementById('roas-adspend')?.value);

    const values = { 'roas-revenue': revenue, 'roas-adspend': adSpend };
    if (!validateAllFields(Object.keys(values), values)) return;

    appState.isProcessing.roas = true;
    setButtonLoading('roas-submit', true);

    try {
      const result            = calculateROAS(revenue, adSpend);
      appState.results.roas   = result;
      updateROASUI(result);
      updateDashboard();
      showToast('success', 'ROAS Calculated!', `Your ROAS is ${result.roas}×`);
    } catch (err) {
      showToast('error', 'Calculation Error', err.message || 'Please check your inputs.');
    } finally {
      appState.isProcessing.roas = false;
      setButtonLoading('roas-submit', false);
    }
  });

  document.getElementById('roas-reset')?.addEventListener('click', () => {
    resetForm('form-roas', ['roas-revenue', 'roas-adspend']);
    hideResults('roas');
    appState.results.roas = null;
    destroyChart('roas');
  });

  // ── CPA Form ──
  document.getElementById('form-cpa')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (appState.isProcessing.cpa) return;

    const spend       = safeParseFloat(document.getElementById('cpa-spend')?.value);
    const conversions = safeParseFloat(document.getElementById('cpa-conversions')?.value);

    const values = { 'cpa-spend': spend, 'cpa-conversions': conversions };
    if (!validateAllFields(Object.keys(values), values)) return;

    appState.isProcessing.cpa = true;
    setButtonLoading('cpa-submit', true);

    try {
      const result           = calculateCPA(spend, conversions);
      appState.results.cpa   = result;
      updateCPAUI(result);
      updateDashboard();
      showToast('success', 'CPA Calculated!', `Your CPA is ${formatCurrency(result.cpa)}`);
    } catch (err) {
      showToast('error', 'Calculation Error', err.message || 'Please check your inputs.');
    } finally {
      appState.isProcessing.cpa = false;
      setButtonLoading('cpa-submit', false);
    }
  });

  document.getElementById('cpa-reset')?.addEventListener('click', () => {
    resetForm('form-cpa', ['cpa-spend', 'cpa-conversions']);
    hideResults('cpa');
    appState.results.cpa = null;
    destroyChart('cpa');
  });

  // ── CPM Form ──
  document.getElementById('form-cpm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (appState.isProcessing.cpm) return;

    const spend       = safeParseFloat(document.getElementById('cpm-spend')?.value);
    const impressions = safeParseFloat(document.getElementById('cpm-impressions')?.value);

    const values = { 'cpm-spend': spend, 'cpm-impressions': impressions };
    if (!validateAllFields(Object.keys(values), values)) return;

    appState.isProcessing.cpm = true;
    setButtonLoading('cpm-submit', true);

    try {
      const result           = calculateCPM(spend, impressions);
      appState.results.cpm   = result;
      updateCPMUI(result);
      updateDashboard();
      showToast('success', 'CPM Calculated!', `Your CPM is ${formatCurrency(result.cpm)}`);
    } catch (err) {
      showToast('error', 'Calculation Error', err.message || 'Please check your inputs.');
    } finally {
      appState.isProcessing.cpm = false;
      setButtonLoading('cpm-submit', false);
    }
  });

  document.getElementById('cpm-reset')?.addEventListener('click', () => {
    resetForm('form-cpm', ['cpm-spend', 'cpm-impressions']);
    hideResults('cpm');
    appState.results.cpm = null;
    destroyChart('cpm');
  });

  // ── CTR Form ──
  document.getElementById('form-ctr')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (appState.isProcessing.ctr) return;

    const clicks      = safeParseFloat(document.getElementById('ctr-clicks')?.value);
    const impressions = safeParseFloat(document.getElementById('ctr-impressions')?.value);

    const values = { 'ctr-clicks': clicks, 'ctr-impressions': impressions };
    if (!validateAllFields(Object.keys(values), values)) return;

    appState.isProcessing.ctr = true;
    setButtonLoading('ctr-submit', true);

    try {
      const result           = calculateCTR(clicks, impressions);
      appState.results.ctr   = result;
      updateCTRUI(result);
      updateDashboard();
      showToast('success', 'CTR Calculated!', `Your CTR is ${formatPercent(result.ctr)}`);
    } catch (err) {
      showToast('error', 'Calculation Error', err.message || 'Please check your inputs.');
    } finally {
      appState.isProcessing.ctr = false;
      setButtonLoading('ctr-submit', false);
    }
  });

  document.getElementById('ctr-reset')?.addEventListener('click', () => {
    resetForm('form-ctr', ['ctr-clicks', 'ctr-impressions']);
    hideResults('ctr');
    appState.results.ctr = null;
    destroyChart('ctr');
  });

  // ── Break-even Form ──
  document.getElementById('form-breakeven')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (appState.isProcessing.breakeven) return;

    const fixedCosts    = safeParseFloat(document.getElementById('be-fixed-costs')?.value);
    const sellingPrice  = safeParseFloat(document.getElementById('be-selling-price')?.value);
    const variableCost  = safeParseFloat(document.getElementById('be-variable-cost')?.value);

    const values = {
      'be-fixed-costs':   fixedCosts,
      'be-selling-price': sellingPrice,
      'be-variable-cost': variableCost,
    };
    if (!validateAllFields(Object.keys(values), values)) return;

    appState.isProcessing.breakeven = true;
    setButtonLoading('be-submit', true);

    try {
      const result                = calculateBreakEven(fixedCosts, sellingPrice, variableCost);
      appState.results.breakeven  = result;
      updateBreakEvenUI(result);
      updateDashboard();
      showToast('success', 'Break-even Calculated!', `Sell ${formatNumber(result.breakEvenUnitsCeil)} units to break even.`);
    } catch (err) {
      showToast('error', 'Calculation Error', err.message || 'Please check your inputs.');
    } finally {
      appState.isProcessing.breakeven = false;
      setButtonLoading('be-submit', false);
    }
  });

  document.getElementById('be-reset')?.addEventListener('click', () => {
    resetForm('form-breakeven', ['be-fixed-costs', 'be-selling-price', 'be-variable-cost']);
    hideResults('breakeven');
    appState.results.breakeven = null;
    destroyChart('breakeven');
  });

  // ── Profit Margin Form ──
  document.getElementById('form-margin')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (appState.isProcessing.margin) return;

    const revenue    = safeParseFloat(document.getElementById('margin-revenue')?.value);
    const cogs       = safeParseFloat(document.getElementById('margin-cogs')?.value);
    const operating  = safeParseFloat(document.getElementById('margin-operating')?.value);
    const taxesRaw   = document.getElementById('margin-taxes')?.value.trim();
    const taxes      = taxesRaw !== '' ? safeParseFloat(taxesRaw) : 0;

    const values = {
      'margin-revenue':   revenue,
      'margin-cogs':      cogs,
      'margin-operating': operating,
    };
    if (!validateAllFields(Object.keys(values), values)) return;

    // Validate taxes if provided
    if (taxes !== 0 && (taxes === null || isNaN(taxes) || taxes < 0)) {
      setFieldError('margin-taxes', 'Taxes must be a valid non-negative number.');
      return;
    }
    setFieldError('margin-taxes', '');

    // Validate total costs don't exceed revenue meaninglessly (allow loss calc)
    appState.isProcessing.margin = true;
    setButtonLoading('margin-submit', true);

    try {
      const result             = calculateProfitMargin(revenue, cogs, operating, taxes || 0);
      appState.results.margin  = result;
      updateMarginUI(result);
      updateDashboard();
      showToast('success', 'Margins Calculated!', `Net Profit Margin: ${formatPercent(result.netMargin)}`);
    } catch (err) {
      showToast('error', 'Calculation Error', err.message || 'Please check your inputs.');
    } finally {
      appState.isProcessing.margin = false;
      setButtonLoading('margin-submit', false);
    }
  });

  document.getElementById('margin-reset')?.addEventListener('click', () => {
    resetForm('form-margin', ['margin-revenue', 'margin-cogs', 'margin-operating', 'margin-taxes']);
    hideResults('margin');
    appState.results.margin = null;
    destroyChart('margin');
  });
};

/**
 * Initialize input clear buttons.
 */
const initInputClearButtons = () => {
  document.querySelectorAll('.input-clear').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrapper = btn.closest('.input-wrapper');
      if (!wrapper) return;
      const input = wrapper.querySelector('.form-input');
      if (!input) return;
      input.value = '';
      input.classList.remove('input--error', 'input--success');
      input.removeAttribute('aria-invalid');
      const errorId = `${input.id}-error`;
      const errorEl = document.getElementById(errorId);
      if (errorEl) errorEl.textContent = '';
      input.focus();
    });
  });
};

/**
 * Initialize real-time input validation on blur.
 */
const initRealtimeValidation = () => {
  Object.keys(VALIDATION_RULES).forEach((fieldId) => {
    const input = document.getElementById(fieldId);
    if (!input) return;

    input.addEventListener('blur', () => {
      if (input.value.trim() === '') {
        input.classList.remove('input--error', 'input--success');
        const errorEl = document.getElementById(`${fieldId}-error`);
        if (errorEl) errorEl.textContent = '';
        return;
      }
      const value  = safeParseFloat(input.value);
      const result = validateField(fieldId, value);
      setFieldError(fieldId, result.valid ? '' : result.message);
    });

    input.addEventListener('input', debounce(() => {
      if (input.value.trim() === '') return;
      if (input.classList.contains('input--error')) {
        const value  = safeParseFloat(input.value);
        const result = validateField(fieldId, value);
        if (result.valid) setFieldError(fieldId, '');
      }
    }, DEBOUNCE_DELAY));
  });
};

/**
 * Initialize footer tab links.
 */
const initFooterTabLinks = () => {
  document.querySelectorAll('.footer-tab-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      const tab   = document.querySelector(`.calc-tab[data-tab="${tabId}"]`);
      if (tab) {
        tab.click();
        tab.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });
};

/**
 * Initialize mobile hamburger menu.
 */
const initMobileMenu = () => {
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('hamburger--open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
    mobileMenu.classList.toggle('mobile-menu--open', isOpen);
    mobileMenu.setAttribute('aria-hidden', String(!isOpen));
    mobileMenu.querySelectorAll('.mobile-menu__link').forEach((link) => {
      link.setAttribute('tabindex', isOpen ? '0' : '-1');
    });
  });

  // Close on link click
  mobileMenu.querySelectorAll('.mobile-menu__link').forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('hamburger--open');
      hamburger.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.remove('mobile-menu--open');
      mobileMenu.setAttribute('aria-hidden', 'true');
      mobileMenu.querySelectorAll('.mobile-menu__link').forEach((l) =>
        l.setAttribute('tabindex', '-1')
      );
    });
  });
};

/**
 * Initialize all copy result buttons.
 */
const initCopyButtons = () => {
  document.querySelectorAll('.copy-result-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleCopyResult(btn));
  });
};

/**
 * Initialize modal buttons.
 */
const initModal = () => {
  document.getElementById('clear-all-btn')?.addEventListener('click', openClearModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeClearModal);
  document.getElementById('modal-confirm')?.addEventListener('click', executeResetAll);
  document.getElementById('modal-backdrop')?.addEventListener('click', closeClearModal);
};

/**
 * Initialize export button.
 */
const initExportButton = () => {
  document.getElementById('export-btn')?.addEventListener('click', exportToPDF);
};

/**
 * Initialize theme toggle.
 */
const initThemeToggle = () => {
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
};

/**
 * Set footer year.
 */
const setFooterYear = () => {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
};

/**
 * Initialize smooth scroll for anchor links.
 */
const initSmoothScroll = () => {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href    = link.getAttribute('href');
      const target  = href === '#' ? null : document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top    = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
};

/**
 * Initialize AOS scroll animations.
 */
const initAOS = () => {
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration:   700,
      easing:     'ease-out-cubic',
      once:       true,
      offset:     60,
      delay:      0,
    });
  }
};

/**
 * Initialize IntersectionObserver for stat counters.
 */
const initStatObserver = () => {
  const statsSection = document.querySelector('.stats-banner');
  if (!statsSection) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateStatCounters();
          observer.disconnect();
        }
      });
    },
    { threshold: 0.3 }
  );

  observer.observe(statsSection);
};


/* ═══════════════════════════════════════════════════════════════════
   22. INITIALIZATION
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Main initialization function.
 * Runs after DOM is fully loaded.
 */
const init = () => {
  // ── Theme ──
  const savedTheme = localStorage.getItem(`${STORAGE_KEY}_theme`) || 'dark';
  applyTheme(savedTheme);

  // ── Core Systems ──
  initTabs();
  initCalculatorForms();
  initInputClearButtons();
  initRealtimeValidation();
  initCopyButtons();
  initModal();
  initExportButton();
  initThemeToggle();
  initFAQ();
  initTooltips();
  initHeaderScroll();
  initTabKeyboard();
  initMobileMenu();
  initFooterTabLinks();
  initSmoothScroll();
  initAOS();
  initStatObserver();
  setFooterYear();

  // ── Restore Previous Session ──
  loadFromStorage();

  // ── Hide Loader ──
  hideLoader();

  // ── PWA / Offline Notification ──
  window.addEventListener('online',  () => showToast('success', 'Back Online',  'Connection restored.'));
  window.addEventListener('offline', () => showToast('warning', 'Offline Mode', 'Working offline — calculations still available.'));
};

// ── DOM Ready ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
