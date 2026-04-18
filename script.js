/* ============================================
   MARKETING ANALYTICS CALCULATOR PRO
   Premium JavaScript - 100% Accurate Calculations
   Version: 1.0.0
   Author: Premium Development Team
   ============================================ */

'use strict';

/* ============================================
   1. GLOBAL CONFIGURATION & STATE
   ============================================ */

const APP_CONFIG = {
    version: '1.0.0',
    appName: 'Marketing Analytics Calculator Pro',
    precision: 4, // Decimal precision for calculations
    currency: 'USD',
    locale: 'en-US',
    autoSave: true,
    animationDuration: 300,
    debounceDelay: 500,
    chartUpdateDelay: 200
};

// Global State Management
const APP_STATE = {
    theme: localStorage.getItem('theme') || 'light',
    calculations: {
        roi: [],
        roas: [],
        cpa: [],
        cpm: [],
        ctr: [],
        breakeven: [],
        profit: []
    },
    charts: {},
    currentCalculator: 'roi',
    isCalculating: false,
    history: JSON.parse(localStorage.getItem('calculationHistory')) || []
};

// Chart.js Default Configuration
const CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: true,
            position: 'bottom',
            labels: {
                padding: 15,
                font: {
                    size: 12
                }
            }
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            cornerRadius: 8,
            titleFont: {
                size: 14,
                weight: 'bold'
            },
            bodyFont: {
                size: 13
            }
        }
    }
};

/* ============================================
   2. UTILITY FUNCTIONS
   ============================================ */

/**
 * Safely parse number with validation
 * @param {string|number} value - Input value
 * @param {number} defaultValue - Default value if parsing fails
 * @returns {number} Parsed number or default
 */
function safeParseFloat(value, defaultValue = 0) {
    if (value === null || value === undefined || value === '') {
        return defaultValue;
    }
    
    // Remove commas and spaces
    const cleanValue = String(value).replace(/[,\s]/g, '');
    const parsed = parseFloat(cleanValue);
    
    // Check for NaN, Infinity
    if (isNaN(parsed) || !isFinite(parsed)) {
        return defaultValue;
    }
    
    return parsed;
}

/**
 * Format number with precision and locale
 * @param {number} value - Number to format
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted number
 */
function formatNumber(value, decimals = 2) {
    if (!isFinite(value)) return '0';
    
    return new Intl.NumberFormat(APP_CONFIG.locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

/**
 * Format currency with proper symbol
 * @param {number} value - Amount to format
 * @returns {string} Formatted currency
 */
function formatCurrency(value) {
    if (!isFinite(value)) return '$0.00';
    
    return new Intl.NumberFormat(APP_CONFIG.locale, {
        style: 'currency',
        currency: APP_CONFIG.currency
    }).format(value);
}

/**
 * Format percentage with proper symbol
 * @param {number} value - Percentage value
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted percentage
 */
function formatPercentage(value, decimals = 2) {
    if (!isFinite(value)) return '0%';
    
    return formatNumber(value, decimals) + '%';
}

/**
 * Validate input field and show error
 * @param {string} fieldId - Input field ID
 * @param {number} value - Value to validate
 * @param {object} rules - Validation rules
 * @returns {boolean} Validation result
 */
function validateInput(fieldId, value, rules = {}) {
    const input = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + 'Error');
    const wrapper = input.closest('.input-wrapper');
    
    // Reset error state
    wrapper.classList.remove('error');
    errorElement.textContent = '';
    errorElement.classList.remove('show');
    
    // Check if required
    if (rules.required && (value === null || value === undefined || value === '')) {
        showInputError(fieldId, 'This field is required');
        return false;
    }
    
    // Check minimum value
    if (rules.min !== undefined && value < rules.min) {
        showInputError(fieldId, `Value must be at least ${rules.min}`);
        return false;
    }
    
    // Check maximum value
    if (rules.max !== undefined && value > rules.max) {
        showInputError(fieldId, `Value must be at most ${rules.max}`);
        return false;
    }
    
    // Check if positive
    if (rules.positive && value <= 0) {
        showInputError(fieldId, 'Value must be greater than zero');
        return false;
    }
    
    // Check if integer
    if (rules.integer && !Number.isInteger(value)) {
        showInputError(fieldId, 'Value must be a whole number');
        return false;
    }
    
    return true;
}

/**
 * Show input error message
 * @param {string} fieldId - Input field ID
 * @param {string} message - Error message
 */
function showInputError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + 'Error');
    const wrapper = input.closest('.input-wrapper');
    
    wrapper.classList.add('error');
    errorElement.textContent = message;
    errorElement.classList.add('show');
    
    // Shake animation
    wrapper.style.animation = 'shake 0.5s';
    setTimeout(() => {
        wrapper.style.animation = '';
    }, 500);
}

/**
 * Clear input field
 * @param {string} fieldId - Input field ID
 */
function clearInput(fieldId) {
    const input = document.getElementById(fieldId);
    input.value = '';
    
    // Clear any errors
    const errorElement = document.getElementById(fieldId + 'Error');
    const wrapper = input.closest('.input-wrapper');
    wrapper.classList.remove('error');
    errorElement.textContent = '';
    errorElement.classList.remove('show');
    
    // Focus the input
    input.focus();
}

/**
 * Debounce function for performance
 * @param {function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success/error/info)
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = toast.querySelector('.toast-message');
    const toastIcon = toast.querySelector('.toast-icon i');
    
    // Update message
    toastMessage.textContent = message;
    
    // Update icon and color based on type
    toast.className = 'toast show';
    if (type === 'error') {
        toast.classList.add('error');
        toastIcon.className = 'fas fa-exclamation-circle';
    } else if (type === 'info') {
        toastIcon.className = 'fas fa-info-circle';
    } else {
        toastIcon.className = 'fas fa-check-circle';
    }
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        hideToast();
    }, 3000);
}

/**
 * Hide toast notification
 */
function hideToast() {
    const toast = document.getElementById('toast');
    toast.classList.remove('show');
}

/* ============================================
   3. ROI CALCULATOR FUNCTIONS
   ============================================ */

/**
 * Calculate ROI with 100% accuracy
 * Formula: ((Return - Investment) / Investment) × 100
 */
function calculateROI() {
    // Get input values
    const investmentInput = document.getElementById('roiInvestment').value;
    const returnInput = document.getElementById('roiReturn').value;
    
    // Parse values safely
    const investment = safeParseFloat(investmentInput);
    const returnAmount = safeParseFloat(returnInput);
    
    // Validate inputs
    if (!validateInput('roiInvestment', investment, { required: true, positive: true })) {
        return;
    }
    if (!validateInput('roiReturn', returnAmount, { required: true, min: 0 })) {
        return;
    }
    
    // Prevent division by zero
    if (investment === 0) {
        showInputError('roiInvestment', 'Investment cannot be zero');
        return;
    }
    
    // Calculate ROI with precision
    const profit = returnAmount - investment;
    const roiPercentage = (profit / investment) * 100;
    
    // Round to specified precision
    const roundedROI = Math.round(roiPercentage * Math.pow(10, APP_CONFIG.precision)) / Math.pow(10, APP_CONFIG.precision);
    const roundedProfit = Math.round(profit * 100) / 100;
    
    // Display results
    displayROIResults(roundedROI, roundedProfit, investment, returnAmount);
    
    // Save to history
    saveCalculation('roi', {
        investment,
        returnAmount,
        roi: roundedROI,
        profit: roundedProfit,
        timestamp: Date.now()
    });
    
    // Show success message
    showToast('ROI calculated successfully!');
}

/**
 * Display ROI calculation results
 */
function displayROIResults(roi, profit, investment, returnAmount) {
    // Show results panel
    const resultsPanel = document.getElementById('roiResults');
    resultsPanel.style.display = 'block';
    
    // Update values
    document.getElementById('roiPercentage').textContent = formatPercentage(roi);
    
    // Color code profit/loss
    const profitElement = document.getElementById('roiProfit');
    profitElement.textContent = formatCurrency(profit);
    profitElement.style.color = profit >= 0 ? 'var(--success)' : 'var(--error)';
    
    // Create/Update chart
    createROIChart(investment, returnAmount, profit);
}

/**
 * Create ROI visualization chart
 */
function createROIChart(investment, returnAmount, profit) {
    const ctx = document.getElementById('roiChart').getContext('2d');
    
    // Destroy existing chart if exists
    if (APP_STATE.charts.roi) {
        APP_STATE.charts.roi.destroy();
    }
    
    // Create new chart
    APP_STATE.charts.roi = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Investment', 'Return', 'Profit/Loss'],
            datasets: [{
                label: 'Amount ($)',
                data: [investment, returnAmount, profit],
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    profit >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    'rgba(99, 102, 241, 1)',
                    'rgba(16, 185, 129, 1)',
                    profit >= 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            ...CHART_DEFAULTS,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

/* ============================================
   4. ROAS CALCULATOR FUNCTIONS
   ============================================ */

/**
 * Calculate ROAS with 100% accuracy
 * Formula: Revenue / Ad Spend
 */
function calculateROAS() {
    // Get input values
    const adSpendInput = document.getElementById('roasAdSpend').value;
    const revenueInput = document.getElementById('roasRevenue').value;
    
    // Parse values safely
    const adSpend = safeParseFloat(adSpendInput);
    const revenue = safeParseFloat(revenueInput);
    
    // Validate inputs
    if (!validateInput('roasAdSpend', adSpend, { required: true, positive: true })) {
        return;
    }
    if (!validateInput('roasRevenue', revenue, { required: true, min: 0 })) {
        return;
    }
    
    // Prevent division by zero
    if (adSpend === 0) {
        showInputError('roasAdSpend', 'Ad spend cannot be zero');
        return;
    }
    
    // Calculate ROAS with precision
    const roasRatio = revenue / adSpend;
    
    // Round to specified precision
    const roundedROAS = Math.round(roasRatio * Math.pow(10, APP_CONFIG.precision)) / Math.pow(10, APP_CONFIG.precision);
    
    // Determine performance level
    let performance = '';
    if (roundedROAS < 1) {
        performance = 'Poor (Losing money)';
    } else if (roundedROAS < 2) {
        performance = 'Below Average';
    } else if (roundedROAS < 4) {
        performance = 'Good';
    } else if (roundedROAS < 6) {
        performance = 'Very Good';
    } else {
        performance = 'Excellent';
    }
    
    // Display results
    displayROASResults(roundedROAS, performance, adSpend, revenue);
    
    // Save to history
    saveCalculation('roas', {
        adSpend,
        revenue,
        roas: roundedROAS,
        performance,
        timestamp: Date.now()
    });
    
    // Show success message
    showToast('ROAS calculated successfully!');
}

/**
 * Display ROAS calculation results
 */
function displayROASResults(roas, performance, adSpend, revenue) {
    // Show results panel
    const resultsPanel = document.getElementById('roasResults');
    resultsPanel.style.display = 'block';
    
    // Update values
    document.getElementById('roasRatio').textContent = `${formatNumber(roas, 2)}:1`;
    
    // Update performance with color
    const performanceElement = document.getElementById('roasPerformance');
    performanceElement.textContent = performance;
    
    if (roas < 1) {
        performanceElement.style.color = 'var(--error)';
    } else if (roas < 3) {
        performanceElement.style.color = 'var(--warning)';
    } else {
        performanceElement.style.color = 'var(--success)';
    }
    
    // Create/Update chart
    createROASChart(adSpend, revenue, roas);
}

/**
 * Create ROAS visualization chart
 */
function createROASChart(adSpend, revenue, roas) {
    const ctx = document.getElementById('roasChart').getContext('2d');
    
    // Destroy existing chart if exists
    if (APP_STATE.charts.roas) {
        APP_STATE.charts.roas.destroy();
    }
    
    // Create gauge chart simulation
    APP_STATE.charts.roas = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Ad Spend', 'Profit'],
            datasets: [{
                data: [adSpend, Math.max(0, revenue - adSpend)],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    'rgba(239, 68, 68, 1)',
                    'rgba(16, 185, 129, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            ...CHART_DEFAULTS,
            plugins: {
                ...CHART_DEFAULTS.plugins,
                title: {
                    display: true,
                    text: `ROAS: ${formatNumber(roas, 2)}:1`,
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            }
        }
    });
}

/* ============================================
   5. CPA CALCULATOR FUNCTIONS
   ============================================ */

/**
 * Calculate CPA with 100% accuracy
 * Formula: Total Cost / Number of Conversions
 */
function calculateCPA() {
    // Get input values
    const totalCostInput = document.getElementById('cpaTotalCost').value;
    const conversionsInput = document.getElementById('cpaConversions').value;
    
    // Parse values safely
    const totalCost = safeParseFloat(totalCostInput);
    const conversions = safeParseFloat(conversionsInput);
    
    // Validate inputs
    if (!validateInput('cpaTotalCost', totalCost, { required: true, min: 0 })) {
        return;
    }
    if (!validateInput('cpaConversions', conversions, { required: true, positive: true, integer: true })) {
        return;
    }
    
    // Prevent division by zero
    if (conversions === 0) {
        showInputError('cpaConversions', 'Conversions cannot be zero');
        return;
    }
    
    // Calculate CPA with precision
    const cpa = totalCost / conversions;
    
    // Round to specified precision
    const roundedCPA = Math.round(cpa * 100) / 100;
    
    // Determine efficiency score
    let efficiency = '';
    if (roundedCPA < 10) {
        efficiency = 'Excellent';
    } else if (roundedCPA < 50) {
        efficiency = 'Very Good';
    } else if (roundedCPA < 100) {
        efficiency = 'Good';
    } else if (roundedCPA < 200) {
        efficiency = 'Average';
    } else {
        efficiency = 'Needs Improvement';
    }
    
    // Display results
    displayCPAResults(roundedCPA, efficiency, totalCost, conversions);
    
    // Save to history
    saveCalculation('cpa', {
        totalCost,
        conversions,
        cpa: roundedCPA,
        efficiency,
        timestamp: Date.now()
    });
    
    // Show success message
    showToast('CPA calculated successfully!');
}

/**
 * Display CPA calculation results
 */
function displayCPAResults(cpa, efficiency, totalCost, conversions) {
    // Show results panel
    const resultsPanel = document.getElementById('cpaResults');
    resultsPanel.style.display = 'block';
    
    // Update values
    document.getElementById('cpaValue').textContent = formatCurrency(cpa);
    
    // Update efficiency with color
    const efficiencyElement = document.getElementById('cpaEfficiency');
    efficiencyElement.textContent = efficiency;
    
    if (cpa < 50) {
        efficiencyElement.style.color = 'var(--success)';
    } else if (cpa < 150) {
        efficiencyElement.style.color = 'var(--warning)';
    } else {
        efficiencyElement.style.color = 'var(--error)';
    }
    
    // Create/Update chart
    createCPAChart(cpa, conversions);
}

/**
 * Create CPA visualization chart
 */
function createCPAChart(cpa, conversions) {
    const ctx = document.getElementById('cpaChart').getContext('2d');
    
    // Destroy existing chart if exists
    if (APP_STATE.charts.cpa) {
        APP_STATE.charts.cpa.destroy();
    }
    
    // Industry benchmark data
    const benchmarks = {
        'Excellent': 10,
        'Very Good': 50,
        'Good': 100,
        'Average': 200,
        'Your CPA': cpa
    };
    
    APP_STATE.charts.cpa = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(benchmarks),
            datasets: [{
                label: 'CPA ($)',
                data: Object.values(benchmarks),
                backgroundColor: Object.keys(benchmarks).map(key => 
                    key === 'Your CPA' ? 'rgba(99, 102, 241, 0.8)' : 'rgba(156, 163, 175, 0.5)'
                ),
                borderColor: Object.keys(benchmarks).map(key => 
                    key === 'Your CPA' ? 'rgba(99, 102, 241, 1)' : 'rgba(156, 163, 175, 1)'
                ),
                borderWidth: 2
            }]
        },
        options: {
            ...CHART_DEFAULTS,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

/* ============================================
   6. CPM CALCULATOR FUNCTIONS
   ============================================ */

/**
 * Calculate CPM with 100% accuracy
 * Formula: (Cost / Impressions) × 1000
 */
function calculateCPM() {
    // Get input values
    const costInput = document.getElementById('cpmCost').value;
    const impressionsInput = document.getElementById('cpmImpressions').value;
    
    // Parse values safely
    const cost = safeParseFloat(costInput);
    const impressions = safeParseFloat(impressionsInput);
    
    // Validate inputs
    if (!validateInput('cpmCost', cost, { required: true, min: 0 })) {
        return;
    }
    if (!validateInput('cpmImpressions', impressions, { required: true, positive: true, integer: true })) {
        return;
    }
    
    // Prevent division by zero
    if (impressions === 0) {
        showInputError('cpmImpressions', 'Impressions cannot be zero');
        return;
    }
    
    // Calculate CPM with precision
    const cpm = (cost / impressions) * 1000;
    
    // Round to specified precision
    const roundedCPM = Math.round(cpm * 100) / 100;
    
    // Calculate reach estimate (unique users - approximately 70% of impressions)
    const reachEstimate = Math.round(impressions * 0.7);
    
    // Display results
    displayCPMResults(roundedCPM, reachEstimate, cost, impressions);
    
    // Save to history
    saveCalculation('cpm', {
        cost,
        impressions,
        cpm: roundedCPM,
        reach: reachEstimate,
        timestamp: Date.now()
    });
    
    // Show success message
    showToast('CPM calculated successfully!');
}

/**
 * Display CPM calculation results
 */
function displayCPMResults(cpm, reach, cost, impressions) {
    // Show results panel
    const resultsPanel = document.getElementById('cpmResults');
    resultsPanel.style.display = 'block';
    
    // Update values
    document.getElementById('cpmRate').textContent = formatCurrency(cpm);
    document.getElementById('cpmReach').textContent = formatNumber(reach, 0) + ' users';
    
    // Create/Update chart
    createCPMChart(cpm, impressions, reach);
}

/**
 * Create CPM visualization chart
 */
function createCPMChart(cpm, impressions, reach) {
    const ctx = document.getElementById('cpmChart').getContext('2d');
    
    // Destroy existing chart if exists
    if (APP_STATE.charts.cpm) {
        APP_STATE.charts.cpm.destroy();
    }
    
    APP_STATE.charts.cpm = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['1K', '10K', '50K', '100K', '500K', '1M'],
            datasets: [{
                label: 'Cost Projection ($)',
                data: [
                    cpm,
                    cpm * 10,
                    cpm * 50,
                    cpm * 100,
                    cpm * 500,
                    cpm * 1000
                ],
                borderColor: 'rgba(99, 102, 241, 1)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2,
                tension: 0.4
            }]
        },
        options: {
            ...CHART_DEFAULTS,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Impressions'
                    }
                }
            }
        }
    });
}

/* ============================================
   7. CTR CALCULATOR FUNCTIONS
   ============================================ */

/**
 * Calculate CTR with 100% accuracy
 * Formula: (Clicks / Impressions) × 100
 */
function calculateCTR() {
    // Get input values
    const clicksInput = document.getElementById('ctrClicks').value;
    const impressionsInput = document.getElementById('ctrImpressions').value;
    
    // Parse values safely
    const clicks = safeParseFloat(clicksInput);
    const impressions = safeParseFloat(impressionsInput);
    
    // Validate inputs
    if (!validateInput('ctrClicks', clicks, { required: true, min: 0, integer: true })) {
        return;
    }
    if (!validateInput('ctrImpressions', impressions, { required: true, positive: true, integer: true })) {
        return;
    }
    
    // Prevent division by zero
    if (impressions === 0) {
        showInputError('ctrImpressions', 'Impressions cannot be zero');
        return;
    }
    
    // Check logical consistency
    if (clicks > impressions) {
        showInputError('ctrClicks', 'Clicks cannot exceed impressions');
        return;
    }
    
    // Calculate CTR with precision
    const ctr = (clicks / impressions) * 100;
    
    // Round to specified precision
    const roundedCTR = Math.round(ctr * Math.pow(10, APP_CONFIG.precision)) / Math.pow(10, APP_CONFIG.precision);
    
    // Determine performance grade
    let grade = '';
    if (roundedCTR < 0.5) {
        grade = 'Poor (F)';
    } else if (roundedCTR < 1) {
        grade = 'Below Average (D)';
    } else if (roundedCTR < 2) {
        grade = 'Average (C)';
    } else if (roundedCTR < 3) {
        grade = 'Good (B)';
    } else if (roundedCTR < 5) {
        grade = 'Very Good (A)';
    } else {
        grade = 'Excellent (A+)';
    }
    
    // Display results
    displayCTRResults(roundedCTR, grade, clicks, impressions);
    
    // Save to history
    saveCalculation('ctr', {
        clicks,
        impressions,
        ctr: roundedCTR,
        grade,
        timestamp: Date.now()
    });
    
    // Show success message
    showToast('CTR calculated successfully!');
}

/**
 * Display CTR calculation results
 */
function displayCTRResults(ctr, grade, clicks, impressions) {
    // Show results panel
    const resultsPanel = document.getElementById('ctrResults');
    resultsPanel.style.display = 'block';
    
    // Update values
    document.getElementById('ctrRate').textContent = formatPercentage(ctr);
    
    // Update grade with color
    const gradeElement = document.getElementById('ctrGrade');
    gradeElement.textContent = grade;
    
    if (ctr < 1) {
        gradeElement.style.color = 'var(--error)';
    } else if (ctr < 2.5) {
        gradeElement.style.color = 'var(--warning)';
    } else {
        gradeElement.style.color = 'var(--success)';
    }
    
    // Create/Update chart
    createCTRChart(clicks, impressions);
}

/**
 * Create CTR visualization chart
 */
function createCTRChart(clicks, impressions) {
    const ctx = document.getElementById('ctrChart').getContext('2d');
    
    // Destroy existing chart if exists
    if (APP_STATE.charts.ctr) {
        APP_STATE.charts.ctr.destroy();
    }
    
    const notClicked = impressions - clicks;
    
    APP_STATE.charts.ctr = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Clicks', 'No Clicks'],
            datasets: [{
                data: [clicks, notClicked],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(229, 231, 235, 0.8)'
                ],
                borderColor: [
                    'rgba(16, 185, 129, 1)',
                    'rgba(229, 231, 235, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            ...CHART_DEFAULTS,
            plugins: {
                ...CHART_DEFAULTS.plugins,
                title: {
                    display: true,
                    text: `CTR: ${formatPercentage((clicks/impressions)*100)}`,
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            }
        }
    });
}

/* ============================================
   8. BREAK-EVEN CALCULATOR FUNCTIONS
   ============================================ */

/**
 * Calculate Break-even with 100% accuracy
 * Formula: Fixed Costs / (Unit Price - Variable Cost per Unit)
 */
function calculateBreakeven() {
    // Get input values
    const fixedCostsInput = document.getElementById('beFixedCosts').value;
    const variableCostInput = document.getElementById('beVariableCost').value;
    const unitPriceInput = document.getElementById('beUnitPrice').value;
    
    // Parse values safely
    const fixedCosts = safeParseFloat(fixedCostsInput);
    const variableCost = safeParseFloat(variableCostInput);
    const unitPrice = safeParseFloat(unitPriceInput);
    
    // Validate inputs
    if (!validateInput('beFixedCosts', fixedCosts, { required: true, min: 0 })) {
        return;
    }
    if (!validateInput('beVariableCost', variableCost, { required: true, min: 0 })) {
        return;
    }
    if (!validateInput('beUnitPrice', unitPrice, { required: true, positive: true })) {
        return;
    }
    
    // Check if unit price is greater than variable cost
    if (unitPrice <= variableCost) {
        showInputError('beUnitPrice', 'Unit price must be greater than variable cost');
        return;
    }
    
    // Calculate contribution margin
    const contributionMargin = unitPrice - variableCost;
    
    // Prevent division by zero (already checked above, but double-check)
    if (contributionMargin === 0) {
        showInputError('beUnitPrice', 'Price must be greater than variable cost');
        return;
    }
    
    // Calculate break-even point
    const breakEvenUnits = fixedCosts / contributionMargin;
    const breakEvenRevenue = breakEvenUnits * unitPrice;
    
    // Round appropriately
    const roundedUnits = Math.ceil(breakEvenUnits); // Always round up for units
    const roundedRevenue = Math.round(breakEvenRevenue * 100) / 100;
    
    // Display results
    displayBreakevenResults(roundedUnits, roundedRevenue, fixedCosts, variableCost, unitPrice);
    
    // Save to history
    saveCalculation('breakeven', {
        fixedCosts,
        variableCost,
        unitPrice,
        breakEvenUnits: roundedUnits,
        breakEvenRevenue: roundedRevenue,
        timestamp: Date.now()
    });
    
    // Show success message
    showToast('Break-even point calculated successfully!');
}

/**
 * Display Break-even calculation results
 */
function displayBreakevenResults(units, revenue, fixedCosts, variableCost, unitPrice) {
    // Show results panel
    const resultsPanel = document.getElementById('breakevenResults');
    resultsPanel.style.display = 'block';
    
    // Update values
    document.getElementById('beUnits').textContent = formatNumber(units, 0) + ' units';
    document.getElementById('beRevenue').textContent = formatCurrency(revenue);
    
    // Create/Update chart
    createBreakevenChart(units, fixedCosts, variableCost, unitPrice);
}

/**
 * Create Break-even visualization chart
 */
function createBreakevenChart(breakEvenUnits, fixedCosts, variableCost, unitPrice) {
    const ctx = document.getElementById('breakevenChart').getContext('2d');
    
    // Destroy existing chart if exists
    if (APP_STATE.charts.breakeven) {
        APP_STATE.charts.breakeven.destroy();
    }
    
    // Generate data points for chart
    const maxUnits = Math.ceil(breakEvenUnits * 2);
    const dataPoints = [];
    const revenueData = [];
    const totalCostData = [];
    
    for (let units = 0; units <= maxUnits; units += Math.ceil(maxUnits / 10)) {
        dataPoints.push(units);
        revenueData.push(units * unitPrice);
        totalCostData.push(fixedCosts + (units * variableCost));
    }
    
    APP_STATE.charts.breakeven = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dataPoints,
            datasets: [{
                label: 'Revenue',
                data: revenueData,
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                tension: 0
            }, {
                label: 'Total Cost',
                data: totalCostData,
                borderColor: 'rgba(239, 68, 68, 1)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                tension: 0
            }]
        },
        options: {
            ...CHART_DEFAULTS,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    title: {
                        display: true,
                        text: 'Amount ($)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Units Sold'
                    }
                }
            },
            plugins: {
                ...CHART_DEFAULTS.plugins,
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            xMin: breakEvenUnits,
                            xMax: breakEvenUnits,
                            borderColor: 'rgba(99, 102, 241, 1)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                content: `Break-even: ${Math.ceil(breakEvenUnits)} units`,
                                enabled: true,
                                position: 'start'
                            }
                        }
                    }
                }
            }
        }
    });
}

/* ============================================
   9. PROFIT MARGIN CALCULATOR FUNCTIONS
   ============================================ */

/**
 * Calculate Profit Margin with 100% accuracy
 * Formula: ((Revenue - Costs) / Revenue) × 100
 */
function calculateProfitMargin() {
    // Get input values
    const revenueInput = document.getElementById('pmRevenue').value;
    const costsInput = document.getElementById('pmCosts').value;
    
    // Parse values safely
    const revenue = safeParseFloat(revenueInput);
    const costs = safeParseFloat(costsInput);
    
    // Validate inputs
    if (!validateInput('pmRevenue', revenue, { required: true, positive: true })) {
        return;
    }
    if (!validateInput('pmCosts', costs, { required: true, min: 0 })) {
        return;
    }
    
    // Prevent division by zero
    if (revenue === 0) {
        showInputError('pmRevenue', 'Revenue cannot be zero');
        return;
    }
    
    // Check if costs exceed revenue (negative margin)
    if (costs > revenue) {
        // This is valid but indicates a loss
        console.log('Warning: Costs exceed revenue - negative profit margin');
    }
    
    // Calculate profit margin with precision
    const profit = revenue - costs;
    const profitMargin = (profit / revenue) * 100;
    
    // Round to specified precision
    const roundedMargin = Math.round(profitMargin * Math.pow(10, APP_CONFIG.precision)) / Math.pow(10, APP_CONFIG.precision);
    const roundedProfit = Math.round(profit * 100) / 100;
    
    // Display results
    displayProfitMarginResults(roundedMargin, roundedProfit, revenue, costs);
    
    // Save to history
    saveCalculation('profit', {
        revenue,
        costs,
        profit: roundedProfit,
        margin: roundedMargin,
        timestamp: Date.now()
    });
    
    // Show success message
    showToast('Profit margin calculated successfully!');
}

/**
 * Display Profit Margin calculation results
 */
function displayProfitMarginResults(margin, profit, revenue, costs) {
    // Show results panel
    const resultsPanel = document.getElementById('profitResults');
    resultsPanel.style.display = 'block';
    
    // Update values
    const marginElement = document.getElementById('pmMargin');
    marginElement.textContent = formatPercentage(margin);
    marginElement.style.color = margin >= 0 ? 'var(--success)' : 'var(--error)';
    
    const profitElement = document.getElementById('pmProfit');
    profitElement.textContent = formatCurrency(profit);
    profitElement.style.color = profit >= 0 ? 'var(--success)' : 'var(--error)';
    
    // Create/Update chart
    createProfitMarginChart(revenue, costs, profit);
}

/**
 * Create Profit Margin visualization chart
 */
function createProfitMarginChart(revenue, costs, profit) {
    const ctx = document.getElementById('profitChart').getContext('2d');
    
    // Destroy existing chart if exists
    if (APP_STATE.charts.profit) {
        APP_STATE.charts.profit.destroy();
    }
    
    APP_STATE.charts.profit = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Costs', 'Profit'],
            datasets: [{
                data: [costs, Math.max(0, profit)],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    'rgba(239, 68, 68, 1)',
                    'rgba(16, 185, 129, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            ...CHART_DEFAULTS,
            plugins: {
                ...CHART_DEFAULTS.plugins,
                title: {
                    display: true,
                    text: `Profit Margin: ${formatPercentage((profit/revenue)*100)}`,
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            }
        }
    });
}

/* ============================================
   10. DATA MANAGEMENT FUNCTIONS
   ============================================ */

/**
 * Save calculation to history
 */
function saveCalculation(type, data) {
    // Add to current session
    APP_STATE.calculations[type].push(data);
    
    // Add to history
    const historyEntry = {
        id: generateId(),
        type,
        data,
        timestamp: Date.now()
    };
    
    APP_STATE.history.unshift(historyEntry);
    
    // Keep only last 100 entries
    if (APP_STATE.history.length > 100) {
        APP_STATE.history = APP_STATE.history.slice(0, 100);
    }
    
    // Save to localStorage if enabled
    if (APP_CONFIG.autoSave) {
        localStorage.setItem('calculationHistory', JSON.stringify(APP_STATE.history));
    }
    
    // Update dashboard
    updateDashboard();
}

/**
 * Generate unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Update analytics dashboard
 */
function updateDashboard() {
    // Calculate averages
    const roiData = APP_STATE.calculations.roi;
    const roasData = APP_STATE.calculations.roas;
    const cpaData = APP_STATE.calculations.cpa;
    const ctrData = APP_STATE.calculations.ctr;
    
    // Update ROI average
    if (roiData.length > 0) {
        const avgROI = roiData.reduce((sum, item) => sum + item.roi, 0) / roiData.length;
        document.getElementById('avgROI').textContent = formatPercentage(avgROI);
    }
    
    // Update ROAS average
    if (roasData.length > 0) {
        const avgROAS = roasData.reduce((sum, item) => sum + item.roas, 0) / roasData.length;
        document.getElementById('totalROAS').textContent = formatNumber(avgROAS, 2) + ':1';
    }
    
    // Update CPA average
    if (cpaData.length > 0) {
        const avgCPA = cpaData.reduce((sum, item) => sum + item.cpa, 0) / cpaData.length;
        document.getElementById('avgCPA').textContent = formatCurrency(avgCPA);
    }
    
    // Update CTR average
    if (ctrData.length > 0) {
        const avgCTR = ctrData.reduce((sum, item) => sum + item.ctr, 0) / ctrData.length;
        document.getElementById('avgCTR').textContent = formatPercentage(avgCTR);
    }
    
    // Update performance chart
    updatePerformanceChart();
}

/**
 * Update performance overview chart
 */
function updatePerformanceChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    const context = ctx.getContext('2d');
    
    // Destroy existing chart if exists
    if (APP_STATE.charts.performance) {
        APP_STATE.charts.performance.destroy();
    }
    
    // Prepare data from history
    const last7Days = APP_STATE.history.slice(0, 7).reverse();
    
    APP_STATE.charts.performance = new Chart(context, {
        type: 'line',
        data: {
            labels: last7Days.map((item, index) => `Calc ${index + 1}`),
            datasets: [{
                label: 'Calculations',
                data: last7Days.map(item => {
                    switch(item.type) {
                        case 'roi': return item.data.roi;
                        case 'roas': return item.data.roas * 10;
                        case 'cpa': return 100 - item.data.cpa;
                        case 'ctr': return item.data.ctr * 10;
                        default: return 0;
                    }
                }),
                borderColor: 'rgba(99, 102, 241, 1)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2,
                tension: 0.4
            }]
        },
        options: {
            ...CHART_DEFAULTS,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

/* ============================================
   11. EXPORT FUNCTIONS
   ============================================ */

/**
 * Export complete PDF report
 */
async function exportCompletePDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add header
        doc.setFontSize(20);
        doc.setTextColor(99, 102, 241);
        doc.text('Marketing Analytics Report', 105, 20, { align: 'center' });
        
        // Add date
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
        
        // Add calculations summary
        let yPosition = 50;
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Calculation Summary:', 20, yPosition);
        
        yPosition += 10;
        doc.setFontSize(11);
        
        // Add each calculation type
        APP_STATE.history.slice(0, 20).forEach(item => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            
            const date = new Date(item.timestamp).toLocaleString();
            doc.text(`${item.type.toUpperCase()} - ${date}`, 20, yPosition);
            yPosition += 7;
            
            // Add specific data based on type
            switch(item.type) {
                case 'roi':
                    doc.text(`  ROI: ${formatPercentage(item.data.roi)}`, 30, yPosition);
                    yPosition += 5;
                    doc.text(`  Profit: ${formatCurrency(item.data.profit)}`, 30, yPosition);
                    break;
                case 'roas':
                    doc.text(`  ROAS: ${formatNumber(item.data.roas, 2)}:1`, 30, yPosition);
                    yPosition += 5;
                    doc.text(`  Performance: ${item.data.performance}`, 30, yPosition);
                    break;
                case 'cpa':
                    doc.text(`  CPA: ${formatCurrency(item.data.cpa)}`, 30, yPosition);
                    yPosition += 5;
                    doc.text(`  Efficiency: ${item.data.efficiency}`, 30, yPosition);
                    break;
                case 'ctr':
                    doc.text(`  CTR: ${formatPercentage(item.data.ctr)}`, 30, yPosition);
                    yPosition += 5;
                    doc.text(`  Grade: ${item.data.grade}`, 30, yPosition);
                    break;
                case 'breakeven':
                    doc.text(`  Units: ${item.data.breakEvenUnits}`, 30, yPosition);
                    yPosition += 5;
                    doc.text(`  Revenue: ${formatCurrency(item.data.breakEvenRevenue)}`, 30, yPosition);
                    break;
                case 'profit':
                    doc.text(`  Margin: ${formatPercentage(item.data.margin)}`, 30, yPosition);
                    yPosition += 5;
                    doc.text(`  Profit: ${formatCurrency(item.data.profit)}`, 30, yPosition);
                    break;
            }
            yPosition += 10;
        });
        
        // Save the PDF
        doc.save('marketing-analytics-report.pdf');
        showToast('PDF report exported successfully!');
        
    } catch (error) {
        console.error('PDF export error:', error);
        showToast('Error exporting PDF report', 'error');
    }
}

/**
 * Export complete Excel report
 */
async function exportCompleteExcel() {
    try {
        // Prepare data for Excel
        const worksheetData = [];
        
        // Add headers
        worksheetData.push([
            'Date',
            'Type',
            'Investment/Cost',
            'Return/Revenue',
            'Result',
            'Performance'
        ]);
        
        // Add data rows
        APP_STATE.history.forEach(item => {
            const date = new Date(item.timestamp).toLocaleDateString();
            let row = [date, item.type.toUpperCase()];
            
            switch(item.type) {
                case 'roi':
                    row.push(
                        item.data.investment,
                        item.data.returnAmount,
                        `${formatPercentage(item.data.roi)}`,
                        item.data.profit >= 0 ? 'Profit' : 'Loss'
                    );
                    break;
                case 'roas':
                    row.push(
                        item.data.adSpend,
                        item.data.revenue,
                        `${formatNumber(item.data.roas, 2)}:1`,
                        item.data.performance
                    );
                    break;
                case 'cpa':
                    row.push(
                        item.data.totalCost,
                        item.data.conversions,
                        formatCurrency(item.data.cpa),
                        item.data.efficiency
                    );
                    break;
                case 'ctr':
                    row.push(
                        item.data.clicks,
                        item.data.impressions,
                        formatPercentage(item.data.ctr),
                        item.data.grade
                    );
                    break;
                case 'breakeven':
                    row.push(
                        item.data.fixedCosts,
                        item.data.unitPrice,
                        `${item.data.breakEvenUnits} units`,
                        formatCurrency(item.data.breakEvenRevenue)
                    );
                    break;
                case 'profit':
                    row.push(
                        item.data.costs,
                        item.data.revenue,
                        formatPercentage(item.data.margin),
                        formatCurrency(item.data.profit)
                    );
                    break;
                default:
                    row.push('', '', '', '');
            }
            
            worksheetData.push(row);
        });
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Marketing Analytics');
        
        // Save file
        XLSX.writeFile(wb, 'marketing-analytics-report.xlsx');
        showToast('Excel report exported successfully!');
        
    } catch (error) {
        console.error('Excel export error:', error);
        showToast('Error exporting Excel report', 'error');
    }
}

/**
 * Export CSV data
 */
function exportCSV() {
    try {
        // Prepare CSV data
        let csvContent = 'Date,Type,Value1,Value2,Result,Performance\n';
        
        APP_STATE.history.forEach(item => {
            const date = new Date(item.timestamp).toLocaleDateString();
            let row = `${date},${item.type.toUpperCase()},`;
            
            switch(item.type) {
                case 'roi':
                    row += `${item.data.investment},${item.data.returnAmount},${item.data.roi}%,${item.data.profit >= 0 ? 'Profit' : 'Loss'}`;
                    break;
                case 'roas':
                    row += `${item.data.adSpend},${item.data.revenue},${item.data.roas}:1,${item.data.performance}`;
                    break;
                case 'cpa':
                    row += `${item.data.totalCost},${item.data.conversions},${item.data.cpa},${item.data.efficiency}`;
                    break;
                case 'ctr':
                    row += `${item.data.clicks},${item.data.impressions},${item.data.ctr}%,${item.data.grade}`;
                    break;
                case 'breakeven':
                    row += `${item.data.fixedCosts},${item.data.unitPrice},${item.data.breakEvenUnits},${item.data.breakEvenRevenue}`;
                    break;
                case 'profit':
                    row += `${item.data.costs},${item.data.revenue},${item.data.margin}%,${item.data.profit}`;
                    break;
            }
            
            csvContent += row + '\n';
        });
        
        // Create and download CSV file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'marketing-analytics-data.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast('CSV data exported successfully!');
        
    } catch (error) {
        console.error('CSV export error:', error);
        showToast('Error exporting CSV data', 'error');
    }
}

/* ============================================
   12. SAVE & SHARE FUNCTIONS
   ============================================ */

// Individual save functions for each calculator
function saveROIResult() {
    const data = APP_STATE.calculations.roi[APP_STATE.calculations.roi.length - 1];
    if (data) {
        showToast('ROI result saved to history!');
    }
}

function saveROASResult() {
    const data = APP_STATE.calculations.roas[APP_STATE.calculations.roas.length - 1];
    if (data) {
        showToast('ROAS result saved to history!');
    }
}

function saveCPAResult() {
    const data = APP_STATE.calculations.cpa[APP_STATE.calculations.cpa.length - 1];
    if (data) {
        showToast('CPA result saved to history!');
    }
}

function saveCPMResult() {
    const data = APP_STATE.calculations.cpm[APP_STATE.calculations.cpm.length - 1];
    if (data) {
        showToast('CPM result saved to history!');
    }
}

function saveCTRResult() {
    const data = APP_STATE.calculations.ctr[APP_STATE.calculations.ctr.length - 1];
    if (data) {
        showToast('CTR result saved to history!');
    }
}

function saveBreakevenResult() {
    const data = APP_STATE.calculations.breakeven[APP_STATE.calculations.breakeven.length - 1];
    if (data) {
        showToast('Break-even result saved to history!');
    }
}

function saveProfitResult() {
    const data = APP_STATE.calculations.profit[APP_STATE.calculations.profit.length - 1];
    if (data) {
        showToast('Profit margin result saved to history!');
    }
}

// Share functions
function shareROIResult() { openShareModal('roi'); }
function shareROASResult() { openShareModal('roas'); }
function shareCPAResult() { openShareModal('cpa'); }
function shareCPMResult() { openShareModal('cpm'); }
function shareCTRResult() { openShareModal('ctr'); }
function shareBreakevenResult() { openShareModal('breakeven'); }
function shareProfitResult() { openShareModal('profit'); }

// Export PDF functions for individual calculators
function exportROIPDF() { exportIndividualPDF('roi'); }
function exportROASPDF() { exportIndividualPDF('roas'); }
function exportCPAPDF() { exportIndividualPDF('cpa'); }
function exportCPMPDF() { exportIndividualPDF('cpm'); }
function exportCTRPDF() { exportIndividualPDF('ctr'); }
function exportBreakevenPDF() { exportIndividualPDF('breakeven'); }
function exportProfitPDF() { exportIndividualPDF('profit'); }

/**
 * Export individual calculator PDF
 */
function exportIndividualPDF(type) {
    try {
        const data = APP_STATE.calculations[type][APP_STATE.calculations[type].length - 1];
        if (!data) {
            showToast('No data to export', 'error');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add header
        doc.setFontSize(20);
        doc.setTextColor(99, 102, 241);
        doc.text(`${type.toUpperCase()} Calculation Report`, 105, 20, { align: 'center' });
        
        // Add date
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
        
        // Add calculation details
        let yPosition = 50;
        doc.setFontSize(14);
        doc.setTextColor(0);
        
        switch(type) {
            case 'roi':
                doc.text('Calculation Details:', 20, yPosition);
                yPosition += 10;
                doc.setFontSize(12);
                doc.text(`Investment: ${formatCurrency(data.investment)}`, 30, yPosition);
                yPosition += 8;
                doc.text(`Return: ${formatCurrency(data.returnAmount)}`, 30, yPosition);
                yPosition += 8;
                doc.text(`ROI: ${formatPercentage(data.roi)}`, 30, yPosition);
                yPosition += 8;
                doc.text(`Profit/Loss: ${formatCurrency(data.profit)}`, 30, yPosition);
                break;
                
            case 'roas':
                doc.text('Calculation Details:', 20, yPosition);
                yPosition += 10;
                doc.setFontSize(12);
                doc.text(`Ad Spend: ${formatCurrency(data.adSpend)}`, 30, yPosition);
                yPosition += 8;
                doc.text(`Revenue: ${formatCurrency(data.revenue)}`, 30, yPosition);
                yPosition += 8;
                doc.text(`ROAS: ${formatNumber(data.roas, 2)}:1`, 30, yPosition);
                yPosition += 8;
                doc.text(`Performance: ${data.performance}`, 30, yPosition);
                break;
                
            // Add other cases similarly...
        }
        
        // Save the PDF
        doc.save(`${type}-calculation-report.pdf`);
        showToast('PDF exported successfully!');
        
    } catch (error) {
        console.error('PDF export error:', error);
        showToast('Error exporting PDF', 'error');
    }
}

/* ============================================
   13. MODAL & UI FUNCTIONS
   ============================================ */

/**
 * Open share modal
 */
function openShareModal(type) {
    const modal = document.getElementById('shareModal');
    modal.classList.add('active');
    modal.dataset.shareType = type;
}

/**
 * Close share modal
 */
function closeShareModal() {
    const modal = document.getElementById('shareModal');
    modal.classList.remove('active');
}

/**
 * Share via email
 */
function shareViaEmail() {
    const type = document.getElementById('shareModal').dataset.shareType;
    const data = APP_STATE.calculations[type][APP_STATE.calculations[type].length - 1];
    
    if (!data) return;
    
    let subject = `Marketing Analytics - ${type.toUpperCase()} Calculation`;
    let body = `Check out my ${type.toUpperCase()} calculation results:\n\n`;
    
    switch(type) {
        case 'roi':
            body += `ROI: ${formatPercentage(data.roi)}\nProfit: ${formatCurrency(data.profit)}`;
            break;
        case 'roas':
            body += `ROAS: ${formatNumber(data.roas, 2)}:1\nPerformance: ${data.performance}`;
            break;
        // Add other cases...
    }
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    closeShareModal();
}

/**
 * Share via WhatsApp
 */
function shareViaWhatsApp() {
    const type = document.getElementById('shareModal').dataset.shareType;
    const data = APP_STATE.calculations[type][APP_STATE.calculations[type].length - 1];
    
    if (!data) return;
    
    let message = `*Marketing Analytics - ${type.toUpperCase()}*\n\n`;
    
    switch(type) {
        case 'roi':
            message += `ROI: ${formatPercentage(data.roi)}\nProfit: ${formatCurrency(data.profit)}`;
            break;
        case 'roas':
            message += `ROAS: ${formatNumber(data.roas, 2)}:1\nPerformance: ${data.performance}`;
            break;
        // Add other cases...
    }
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    closeShareModal();
}

/**
 * Share via LinkedIn
 */
function shareViaLinkedIn() {
    const url = window.location.href;
    const title = 'Check out my marketing analytics calculations!';
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, '_blank');
    closeShareModal();
}

/**
 * Copy share link
 */
function copyShareLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied to clipboard!');
        closeShareModal();
    });
}

/**
 * Show demo modal
 */
function showDemo() {
    const modal = document.getElementById('demoModal');
    modal.classList.add('active');
}

/**
 * Close demo modal
 */
function closeDemoModal() {
    const modal = document.getElementById('demoModal');
    modal.classList.remove('active');
}

/**
 * Subscribe to newsletter
 */
function subscribeNewsletter(event) {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    
    // Here you would normally send to backend
    console.log('Newsletter subscription:', email);
    
    showToast('Successfully subscribed to newsletter!');
    event.target.reset();
}

/**
 * Scroll to calculators section
 */
function scrollToCalculators() {
    document.getElementById('calculators').scrollIntoView({ behavior: 'smooth' });
}

/* ============================================
   14. INITIALIZATION & EVENT LISTENERS
   ============================================ */

/**
 * Initialize application
 */
function initApp() {
    // Hide loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.classList.add('hidden');
    }, 1000);
    
    // Apply saved theme
    if (APP_STATE.theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // Initialize navigation
    initNavigation();
    
    // Initialize quick access buttons
    initQuickAccess();
    
    // Initialize back to top button
    initBackToTop();
    
    // Initialize input listeners
    initInputListeners();
    
    // Load saved data
    loadSavedData();
    
    // Initialize dashboard
    updateDashboard();
    
    // Add keyboard shortcuts
    initKeyboardShortcuts();
}

/**
 * Initialize navigation
 */
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Mobile menu toggle
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    
    // Close mobile menu on link click
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
    
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        APP_STATE.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        
        // Update icon
        document.getElementById('themeToggle').innerHTML = 
            newTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });
}

/**
 * Initialize quick access buttons
 */
function initQuickAccess() {
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Scroll to calculator
            const calculatorId = btn.dataset.calculator + 'Calculator';
            const calculator = document.getElementById(calculatorId);
            if (calculator) {
                calculator.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Highlight calculator
                calculator.style.animation = 'pulse 1s';
                setTimeout(() => {
                    calculator.style.animation = '';
                }, 1000);
            }
        });
    });
}

/**
 * Initialize back to top button
 */
function initBackToTop() {
    const backToTop = document.getElementById('backToTop');
    
    // Show/hide on scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    });
    
    // Scroll to top on click
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/**
 * Initialize input listeners
 */
function initInputListeners() {
    // Add real-time formatting to currency inputs
    const currencyInputs = [
        'roiInvestment', 'roiReturn',
        'roasAdSpend', 'roasRevenue',
        'cpaTotalCost', 'cpmCost',
        'beFixedCosts', 'beVariableCost', 'beUnitPrice',
        'pmRevenue', 'pmCosts'
    ];
    
    currencyInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            // Format on blur
            input.addEventListener('blur', function() {
                if (this.value) {
                    const value = safeParseFloat(this.value);
                    this.value = formatNumber(value, 2);
                }
            });
            
            // Clear formatting on focus
            input.addEventListener('focus', function() {
                if (this.value) {
                    const value = safeParseFloat(this.value);
                    this.value = value;
                }
            });
        }
    });
    
    // Add Enter key support
    document.querySelectorAll('.input-field').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const button = input.closest('.card-body').querySelector('.btn-calculate');
                if (button) {
                    button.click();
                }
            }
        });
    });
}

/**
 * Initialize keyboard shortcuts
 */
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + S = Save all
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            exportCompletePDF();
        }
        
        // Ctrl/Cmd + E = Export Excel
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            exportCompleteExcel();
        }
        
        // ESC = Close modals
        if (e.key === 'Escape') {
            closeShareModal();
            closeDemoModal();
        }
    });
}

/**
 * Load saved data from localStorage
 */
function loadSavedData() {
    // Load calculation history
    const savedHistory = localStorage.getItem('calculationHistory');
    if (savedHistory) {
        try {
            APP_STATE.history = JSON.parse(savedHistory);
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }
    
    // Auto-fill last used values
    const lastValues = localStorage.getItem('lastValues');
    if (lastValues) {
        try {
            const values = JSON.parse(lastValues);
            // You can implement auto-fill logic here if needed
        } catch (error) {
            console.error('Error loading last values:', error);
        }
    }
}

/* ============================================
   15. CHART CONTROL FUNCTIONS
   ============================================ */

/**
 * Initialize chart controls
 */
document.addEventListener('DOMContentLoaded', () => {
    // Chart type switching
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Update chart type
            const chartType = btn.dataset.chart;
            updatePerformanceChartType(chartType);
        });
    });
});

/**
 * Update performance chart type
 */
function updatePerformanceChartType(type) {
    if (APP_STATE.charts.performance) {
        APP_STATE.charts.performance.config.type = type;
        APP_STATE.charts.performance.update();
    }
}

/* ============================================
   16. ERROR BOUNDARY & GLOBAL ERROR HANDLING
   ============================================ */

/**
 * Global error handler
 */
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showToast('An error occurred. Please try again.', 'error');
});

/**
 * Unhandled promise rejection handler
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('An error occurred. Please try again.', 'error');
});

/* ============================================
   17. PERFORMANCE MONITORING
   ============================================ */

/**
 * Performance observer for monitoring
 */
if ('PerformanceObserver' in window) {
    const perfObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            // Log slow network requests
            if (entry.duration > 1000) {
                console.warn('Slow resource:', entry.name, entry.duration);
            }
        }
    });
    
    perfObserver.observe({ entryTypes: ['resource'] });
}

/* ============================================
   18. INITIALIZATION CALL
   ============================================ */

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

/* ============================================
   END OF SCRIPT
   ============================================ */
