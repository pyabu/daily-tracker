// Modern Daily Health Tracker with Auto-Save
// Data Storage with Auto-Save to Firebase
class TrackerData {
    constructor() {
        this.storageKey = 'sugarTrackerEntries';
        this.entries = this.loadEntries();
    }

    loadEntries() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading data:', error);
            return [];
        }
    }

    saveEntries() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.entries));
            this.autoSyncToFirebase();
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    async autoSyncToFirebase() {
        if (!window.firebaseManager || !window.isFirebaseEnabled) {
            console.log('Firebase not available, skipping auto-sync');
            return;
        }
        
        try {
            console.log('Auto-syncing to Firebase...');
            await window.firebaseManager.syncEntries(this.entries);
            console.log('✅ Auto-sync successful');
            
            // Update last sync time
            const lastSync = document.getElementById('lastSyncTime');
            if (lastSync) {
                const now = new Date();
                lastSync.textContent = now.toLocaleTimeString();
            }
            
            // Show subtle success indicator
            const syncIcon = document.querySelector('.sync-icon');
            if (syncIcon) {
                syncIcon.textContent = '✅';
                setTimeout(() => {
                    syncIcon.textContent = '🔄';
                }, 2000);
            }
        } catch (error) {
            console.error('Auto-sync failed:', error);
            
            // Show error in UI
            const syncText = document.querySelector('.sync-text');
            if (syncText) {
                const originalText = syncText.textContent;
                syncText.textContent = 'Sync failed - Check Firebase';
                syncText.style.color = '#ef4444';
                
                setTimeout(() => {
                    syncText.textContent = originalText;
                    syncText.style.color = '';
                }, 3000);
            }
        }
    }

    addEntry(entry) {
        entry.id = Date.now();
        entry.date = entry.date || new Date().toISOString().split('T')[0];
        this.entries.unshift(entry);
        this.saveEntries();
        return entry;
    }

    getTodayEntries() {
        const today = new Date().toISOString().split('T')[0];
        return this.entries.filter(e => e.date === today);
    }

    getEntriesByDate(date) {
        return this.entries.filter(e => e.date === date);
    }

    exportToExcel() {
        if (this.entries.length === 0) {
            showToast('⚠️ No data to export', 'error');
            return;
        }

        // Prepare data for Excel
        const excelData = this.entries.map(e => ({
            'Date': e.date,
            'Time': e.time,
            'Meal Type': this.capitalize(e.mealType),
            'Sugar Level (mg/dL)': e.sugarLevel !== null ? e.sugarLevel : 'Not Taken',
            'Insulin (units)': e.insulinDose !== null ? e.insulinDose : 'Not Taken',
            'Notes': e.notes || ''
        }));

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Set column widths
        ws['!cols'] = [
            { wch: 12 },  // Date
            { wch: 8 },   // Time
            { wch: 12 },  // Meal Type
            { wch: 20 },  // Sugar Level
            { wch: 15 },  // Insulin
            { wch: 40 }   // Notes
        ];

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Diabetes Tracker');

        // Generate Excel file
        const fileName = `diabetes-tracker-${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }

    capitalize(str) {
        if (!str || typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    exportToCSV() {
        const headers = ['Date', 'Time', 'Meal Type', 'Sugar Level (mg/dL)', 'Insulin (units)', 'Notes'];
        const rows = this.entries.map(e => [
            e.date,
            e.time,
            this.capitalize(e.mealType),
            e.sugarLevel !== null ? e.sugarLevel : 'Not Taken',
            e.insulinDose !== null ? e.insulinDose : 'Not Taken',
            `"${(e.notes || '').replace(/"/g, '""')}"`
        ]);
        
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `diabetes-tracker-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }
}

// App State
const data = new TrackerData();
let chart = null;
let historySearchQuery = '';

function isProfileComplete() {
    try {
        const raw = localStorage.getItem('userInfo');
        if (!raw) return false;
        const u = JSON.parse(raw);
        const nameOk = u && String(u.name || '').trim().length > 0;
        const ageVal = u && u.age;
        const ageOk = ageVal != null && String(ageVal).trim() !== '' && !Number.isNaN(Number(ageVal));
        return nameOk && ageOk;
    } catch {
        return false;
    }
}

function setProfileGate(active) {
    document.body.classList.toggle('profile-required', active);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    checkWelcomeModal();
    setupNavigation();
    setupFormHandlers();
    setupDataNavigateDelegation();
    setupHistorySearch();
    setupContactsListDelegation();
    updateDashboard();
    updateCurrentDate();
    loadAllSettings();
    setupNewFeatureListeners();
    
    // Set default date and time
    const now = new Date();
    document.getElementById('entryDate').value = now.toISOString().split('T')[0];
    document.getElementById('entryTime').value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// Check if user info exists, show welcome modal if not
function checkWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    
    if (!isProfileComplete()) {
        modal.style.display = 'flex';
        setProfileGate(true);
    } else {
        modal.style.display = 'none';
        setProfileGate(false);
        const user = JSON.parse(localStorage.getItem('userInfo'));
        updateUserDisplay(user);
    }
}

// Handle welcome form submission
document.getElementById('welcomeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('userName').value;
    const age = document.getElementById('userAge').value;
    
    const userInfo = {
        name: name,
        age: age,
        createdAt: new Date().toISOString()
    };
    
    // Save to localStorage
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    
    // Update display
    updateUserDisplay(userInfo);
    
    // Hide modal
    document.getElementById('welcomeModal').style.display = 'none';
    setProfileGate(false);
    
    // Show welcome toast
    showToast(`Welcome, ${name}! 🎉`, 'success');
});

// Update user display in top bar
function updateUserDisplay(user) {
    document.getElementById('displayUserName').textContent = user.name;
    document.getElementById('displayUserAge').textContent = `Age: ${user.age}`;
    
    const brand = document.getElementById('topBarBrand');
    if (brand) {
        brand.textContent = user.name || 'Daily Health Tracker';
    }
    
    // Update page subtitle with personalized greeting
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17) greeting = 'Good evening';
    
    document.getElementById('pageSubtitle').textContent = `${greeting}, ${user.name}!`;
}

function setSidebarOpen(isOpen) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const btn = document.getElementById('menuHamburger');
    if (isOpen) {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    } else {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
    if (btn) {
        btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
}

function setupDataNavigateDelegation() {
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-navigate]');
        if (!trigger) return;
        e.preventDefault();
        if (!isProfileComplete()) {
            showToast('Please enter your name and age first.', 'error');
            document.getElementById('welcomeModal').style.display = 'flex';
            setProfileGate(true);
            return;
        }
        navigateTo(trigger.dataset.navigate);
    });
}

// Navigation
function setupNavigation() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            if (!isProfileComplete()) {
                showToast('Please enter your name and age first.', 'error');
                document.getElementById('welcomeModal').style.display = 'flex';
                setProfileGate(true);
                return;
            }
            const page = item.dataset.page;
            navigateTo(page);
            
            if (window.innerWidth <= 768) {
                setSidebarOpen(false);
            }
        });
    });
    
    document.getElementById('menuHamburger')?.addEventListener('click', () => {
        if (!isProfileComplete()) {
            showToast('Please enter your name and age first.', 'error');
            document.getElementById('welcomeModal').style.display = 'flex';
            setProfileGate(true);
            return;
        }
        const open = !sidebar.classList.contains('active');
        setSidebarOpen(open);
    });
    
    document.getElementById('sidebarCloseBtn')?.addEventListener('click', () => {
        setSidebarOpen(false);
    });
    
    overlay?.addEventListener('click', () => {
        setSidebarOpen(false);
    });
    
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            setSidebarOpen(false);
        }
    });
}

function navigateTo(pageName) {
    if (!isProfileComplete()) {
        showToast('Please enter your name and age first.', 'error');
        document.getElementById('welcomeModal').style.display = 'flex';
        setProfileGate(true);
        return;
    }
    
    const targetPage = document.getElementById(`${pageName}-page`);
    if (!targetPage) {
        console.warn('Unknown page:', pageName);
        return;
    }
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });
    
    // Update pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    targetPage.classList.add('active');
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'add-entry': 'Add New Entry',
        'history': 'History & Trends',
        'insights': 'Insights & Patterns',
        'diet-guide': 'Diet Guide',
        'settings': 'Settings'
    };
    document.getElementById('pageTitle').textContent = titles[pageName] || pageName;
    
    // Load page-specific content
    if (pageName === 'history') renderHistory();
    if (pageName === 'insights') renderInsights();
    if (pageName === 'diet-guide') renderDietGuide();
}

// Form Handlers
function setupFormHandlers() {
    document.getElementById('quickEntryForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('sugarLevel').addEventListener('input', updateSugarIndicator);
    
    // Not Taken checkboxes
    const sugarNotTaken = document.getElementById('sugarNotTaken');
    const insulinNotTaken = document.getElementById('insulinNotTaken');
    const sugarInput = document.getElementById('sugarLevel');
    const insulinInput = document.getElementById('insulinDose');
    
    sugarNotTaken.addEventListener('change', (e) => {
        if (e.target.checked) {
            sugarInput.value = '';
            sugarInput.disabled = true;
            sugarInput.removeAttribute('required');
            document.getElementById('sugarIndicator').textContent = '';
            document.getElementById('sugarIndicator').style.background = '';
        } else {
            sugarInput.disabled = false;
            sugarInput.setAttribute('required', 'required');
        }
    });
    
    insulinNotTaken.addEventListener('change', (e) => {
        if (e.target.checked) {
            insulinInput.value = '';
            insulinInput.disabled = true;
        } else {
            insulinInput.disabled = false;
            insulinInput.value = '0';
        }
    });
    
    // Quick actions
    document.getElementById('whatsappQuickSend')?.addEventListener('click', () => {
        if (!isProfileComplete()) {
            showToast('Please enter your name and age first.', 'error');
            document.getElementById('welcomeModal').style.display = 'flex';
            setProfileGate(true);
            return;
        }
        whatsappManager.sendToWhatsApp();
    });
    
    document.getElementById('exportQuick')?.addEventListener('click', () => {
        if (!isProfileComplete()) {
            showToast('Please enter your name and age first.', 'error');
            document.getElementById('welcomeModal').style.display = 'flex';
            setProfileGate(true);
            return;
        }
        data.exportToExcel();
        showToast('📊 Data exported to Excel successfully!', 'success');
    });
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!isProfileComplete()) {
        showToast('Please enter your name and age first.', 'error');
        document.getElementById('welcomeModal').style.display = 'flex';
        setProfileGate(true);
        return;
    }
    
    const mealInput = document.querySelector('input[name="mealType"]:checked');
    if (!mealInput) {
        showToast('Please select a meal type.', 'error');
        return;
    }
    
    const sugarNotTaken = document.getElementById('sugarNotTaken').checked;
    const insulinNotTaken = document.getElementById('insulinNotTaken').checked;
    const sugarValue = document.getElementById('sugarLevel').value;
    const insulinValue = document.getElementById('insulinDose').value;
    
    // Validation: At least one value must be provided
    if (sugarNotTaken && insulinNotTaken) {
        showToast('⚠️ Please provide at least sugar or insulin information', 'error');
        return;
    }
    
    if (!sugarNotTaken && !sugarValue) {
        showToast('⚠️ Please enter sugar level or check "Not Taken"', 'error');
        return;
    }
    
    const entry = {
        date: document.getElementById('entryDate').value,
        time: document.getElementById('entryTime').value,
        mealType: mealInput.value,
        sugarLevel: sugarNotTaken ? null : parseInt(sugarValue),
        insulinDose: insulinNotTaken ? null : (parseFloat(insulinValue) || 0),
        notes: document.getElementById('notes').value
    };

    data.addEntry(entry);
    showToast('✅ Entry saved and synced to cloud!', 'success');
    
    // Check for alerts (only if sugar was taken)
    if (entry.sugarLevel !== null) {
        contactManager.checkLowSugar(entry.sugarLevel);
        contactManager.checkHighSugar(entry.sugarLevel);
    }
    
    // Reset form
    document.getElementById('quickEntryForm').reset();
    document.getElementById('sugarLevel').disabled = false;
    document.getElementById('insulinDose').disabled = false;
    document.getElementById('sugarLevel').setAttribute('required', 'required');
    const now = new Date();
    document.getElementById('entryDate').value = now.toISOString().split('T')[0];
    document.getElementById('entryTime').value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Update dashboard
    updateDashboard();
    
    // Navigate to dashboard
    setTimeout(() => navigateTo('dashboard'), 1000);
}

function updateSugarIndicator() {
    const sugar = parseInt(document.getElementById('sugarLevel').value);
    const indicator = document.getElementById('sugarIndicator');
    
    if (!sugar) {
        indicator.textContent = '';
        indicator.style.background = '';
        return;
    }

    if (sugar < 70) {
        indicator.textContent = '⚠️ Low - Risk of hypoglycemia';
        indicator.style.background = '#fee';
        indicator.style.color = '#c00';
    } else if (sugar >= 70 && sugar <= 140) {
        indicator.textContent = '✅ Normal range';
        indicator.style.background = '#efe';
        indicator.style.color = '#060';
    } else if (sugar > 140 && sugar <= 200) {
        indicator.textContent = '⚠️ Elevated';
        indicator.style.background = '#ffe';
        indicator.style.color = '#880';
    } else {
        indicator.textContent = '🚨 High - Consult doctor';
        indicator.style.background = '#fee';
        indicator.style.color = '#c00';
    }
}

function showAlert(sugar) {
    if (sugar < 70) {
        alert('⚠️ LOW SUGAR ALERT!\nYour blood sugar is below 70 mg/dL. Consider eating something immediately.');
    } else if (sugar > 250) {
        alert('🚨 HIGH SUGAR ALERT!\nYour blood sugar is above 250 mg/dL. Please monitor closely and consult your doctor.');
    }
}

// Dashboard Updates
function updateDashboard() {
    const todayEntries = data.getTodayEntries();
    const stats = calculateStats(todayEntries);
    
    // Update stats cards
    document.getElementById('dailyScore').textContent = stats.score;
    document.getElementById('avgSugar').textContent = stats.avgSugar ? `${stats.avgSugar}` : '--';
    document.getElementById('totalInsulin').textContent = stats.totalInsulin ? `${stats.totalInsulin}u` : '--';
    document.getElementById('totalEntries').textContent = stats.entries;
    
    // Update timeline
    updateTimeline(todayEntries);
    
    // Update recent entries
    renderRecentEntries(todayEntries);
    
    // Update badge
    document.getElementById('timelineBadge').textContent = `${stats.entries} entries`;
}

function calculateStats(entries) {
    if (entries.length === 0) {
        return { score: '--', avgSugar: 0, entries: 0, totalInsulin: 0 };
    }

    // Filter out null values for calculations
    const sugarEntries = entries.filter(e => e.sugarLevel !== null);
    const insulinEntries = entries.filter(e => e.insulinDose !== null);
    
    const avgSugar = sugarEntries.length > 0 
        ? Math.round(sugarEntries.reduce((sum, e) => sum + e.sugarLevel, 0) / sugarEntries.length)
        : 0;
    
    const totalInsulin = insulinEntries.length > 0
        ? insulinEntries.reduce((sum, e) => sum + e.insulinDose, 0)
        : 0;
    
    const inRange = sugarEntries.filter(e => e.sugarLevel >= 70 && e.sugarLevel <= 140).length;
    const score = sugarEntries.length > 0 
        ? Math.round((inRange / sugarEntries.length) * 100)
        : 0;
    
    return {
        score: sugarEntries.length > 0 ? `${score}/100` : '--',
        avgSugar,
        entries: entries.length,
        totalInsulin: totalInsulin.toFixed(1)
    };
}

function updateTimeline(entries) {
    const timeline = document.getElementById('todayTimeline');
    const mealTypes = ['morning', 'afternoon', 'evening', 'dinner', 'snack'];
    const icons = { morning: '🌅', afternoon: '☀️', evening: '🌆', dinner: '🌙', snack: '🍪' };
    const names = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', dinner: 'Dinner', snack: 'Snack' };
    
    timeline.innerHTML = mealTypes.map(meal => {
        const entry = entries.find(e => e.mealType === meal);
        const completed = entry ? 'completed' : '';
        
        let status = 'Not logged';
        if (entry) {
            const sugarText = entry.sugarLevel !== null ? `${entry.sugarLevel} mg/dL` : '<span class="not-taken-badge">Not Taken</span>';
            const insulinText = entry.insulinDose !== null ? `${entry.insulinDose}u` : '<span class="not-taken-badge">Not Taken</span>';
            status = `${sugarText} • ${insulinText}`;
        }
        
        return `
            <div class="timeline-item ${completed}">
                <div class="timeline-icon">${icons[meal]}</div>
                <div class="timeline-content">
                    <h3>${names[meal]}</h3>
                    <div class="timeline-status">${status}</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderRecentEntries(entries) {
    const container = document.getElementById('recentEntries');
    
    if (entries.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">No entries yet today. Click "Quick Add" to start tracking!</p>';
        return;
    }

    container.innerHTML = entries.slice(0, 5).map(entry => {
        const sugarDisplay = entry.sugarLevel !== null 
            ? `${entry.sugarLevel} mg/dL ${getSugarEmoji(entry.sugarLevel)}`
            : '<span class="not-taken-badge">Not Taken</span>';
        
        const insulinDisplay = entry.insulinDose !== null
            ? `${entry.insulinDose} units`
            : '<span class="not-taken-badge">Not Taken</span>';
        
        return `
            <div class="entry-card">
                <div class="entry-header">
                    <span class="entry-time">${formatTime(entry.time)}</span>
                    <span class="entry-meal">${getMealIcon(entry.mealType)} ${capitalize(entry.mealType)}</span>
                </div>
                <div class="entry-details">
                    <div class="entry-detail">
                        <strong>Sugar:</strong> ${sugarDisplay}
                    </div>
                    <div class="entry-detail">
                        <strong>Insulin:</strong> ${insulinDisplay}
                    </div>
                </div>
                ${entry.notes ? `<div class="entry-notes">📝 ${entry.notes}</div>` : ''}
            </div>
        `;
    }).join('');
}

function getFilteredHistoryEntries(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return data.entries;
    return data.entries.filter(e => {
        const hay = `${e.date} ${e.time} ${e.mealType} ${e.sugarLevel} ${e.insulinDose} ${e.notes || ''}`.toLowerCase();
        return hay.includes(q);
    });
}

function renderHistoryList(entries) {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    if (entries.length === 0) {
        const emptyMsg = data.entries.length === 0
            ? 'No entries yet. Add one from Add Entry.'
            : 'No entries match your search.';
        historyList.innerHTML = `<p class="history-empty" style="text-align:center;color:#999;padding:32px;">${emptyMsg}</p>`;
        return;
    }
    
    historyList.innerHTML = entries.map(entry => {
        const sugarDisplay = entry.sugarLevel !== null 
            ? `${entry.sugarLevel} mg/dL`
            : '<span class="not-taken-badge">Not Taken</span>';
        
        const insulinDisplay = entry.insulinDose !== null
            ? `${entry.insulinDose} units`
            : '<span class="not-taken-badge">Not Taken</span>';
        
        return `
            <div class="entry-card">
                <div class="entry-header">
                    <span class="entry-time">${entry.date} ${formatTime(entry.time)}</span>
                    <span class="entry-meal">${getMealIcon(entry.mealType)} ${capitalize(entry.mealType)}</span>
                </div>
                <div class="entry-details">
                    <div class="entry-detail">
                        <strong>Sugar:</strong> ${sugarDisplay}
                    </div>
                    <div class="entry-detail">
                        <strong>Insulin:</strong> ${insulinDisplay}
                    </div>
                </div>
                ${entry.notes ? `<div class="entry-notes">📝 ${escapeHtml(entry.notes)}</div>` : ''}
            </div>
        `;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setupHistorySearch() {
    const el = document.getElementById('searchEntries');
    if (!el) return;
    el.addEventListener('input', () => {
        historySearchQuery = el.value;
        if (document.getElementById('history-page')?.classList.contains('active')) {
            renderHistoryList(getFilteredHistoryEntries(historySearchQuery));
        }
    });
}

// History & Chart
function renderHistory() {
    const canvas = document.getElementById('sugarChart');
    const last7Days = getLast7Days();
    
    if (chart) chart.destroy();
    
    chart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: last7Days.map(d => d.label),
            datasets: [{
                label: 'Average Blood Sugar',
                data: last7Days.map(d => d.avgSugar),
                borderColor: '#0d9488',
                backgroundColor: 'rgba(13, 148, 136, 0.12)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 50,
                    max: 300
                }
            }
        }
    });
    
    renderHistoryList(getFilteredHistoryEntries(historySearchQuery));
}

function getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const entries = data.getEntriesByDate(dateStr);
        
        // Filter out entries where sugar was not taken
        const sugarEntries = entries.filter(e => e.sugarLevel !== null);
        const avgSugar = sugarEntries.length > 0 
            ? Math.round(sugarEntries.reduce((sum, e) => sum + e.sugarLevel, 0) / sugarEntries.length)
            : null;
        
        days.push({
            label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            avgSugar
        });
    }
    return days;
}

// Insights
function renderInsights() {
    const allEntries = data.entries;
    const insights = generateInsights(allEntries);
    const container = document.getElementById('insightsContainer');
    
    if (insights.length === 0) {
        container.innerHTML = '<div class="card"><div class="card-body"><p style="text-align:center;color:#999;padding:40px;">Track for a few days to see insights!</p></div></div>';
        return;
    }

    container.innerHTML = insights.map(insight => `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">${insight.icon} ${insight.title}</h2>
            </div>
            <div class="card-body">
                <p>${insight.message}</p>
            </div>
        </div>
    `).join('');
}

function generateInsights(entries) {
    const insights = [];
    
    if (entries.length < 3) return insights;

    const highSugarEntries = entries.filter(e => e.sugarLevel > 180);
    if (highSugarEntries.length > entries.length * 0.3) {
        insights.push({
            icon: '⚠️',
            title: 'Frequent High Sugar',
            message: `${highSugarEntries.length} out of ${entries.length} readings are above 180 mg/dL. Consider reviewing your diet and medication.`
        });
    }

    const lowSugarEntries = entries.filter(e => e.sugarLevel < 70);
    if (lowSugarEntries.length > 0) {
        insights.push({
            icon: '🚨',
            title: 'Low Sugar Episodes',
            message: `You've had ${lowSugarEntries.length} low sugar reading(s). Keep snacks handy and consult your doctor.`
        });
    }

    const inRange = entries.filter(e => e.sugarLevel >= 70 && e.sugarLevel <= 140).length;
    if (inRange / entries.length > 0.7) {
        insights.push({
            icon: '✅',
            title: 'Great Control!',
            message: `${Math.round((inRange / entries.length) * 100)}% of your readings are in the healthy range. Keep it up!`
        });
    }

    return insights;
}

// Utility Functions
function updateCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', options);
}

function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function getMealIcon(meal) {
    const icons = { morning: '🌅', afternoon: '☀️', evening: '🌆', dinner: '🌙', snack: '🍪' };
    return icons[meal] || '🍽️';
}

function getSugarEmoji(sugar) {
    if (sugar < 70) return '⚠️';
    if (sugar <= 140) return '✅';
    if (sugar <= 200) return '⚠️';
    return '🚨';
}

function capitalize(str) {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const msg = document.getElementById('toastMessage');
    
    icon.textContent = type === 'success' ? '✅' : '❌';
    msg.textContent = message;
    
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// WhatsApp Manager (Fixed and Enhanced)
class WhatsAppManager {
    constructor() {
        this.settings = this.loadSettings();
        this.checkScheduledSend();
    }

    loadSettings() {
        const stored = localStorage.getItem('whatsappSettings');
        return stored ? JSON.parse(stored) : { 
            number: '', 
            time: '21:00', 
            enabled: false 
        };
    }

    saveSettings(settings) {
        this.settings = settings;
        localStorage.setItem('whatsappSettings', JSON.stringify(settings));
        this.updateStatusBadge();
    }

    updateStatusBadge() {
        const badge = document.getElementById('whatsappStatus');
        if (badge) {
            if (this.settings.enabled && this.settings.number) {
                badge.textContent = 'Active';
                badge.classList.add('success');
            } else {
                badge.textContent = 'Disabled';
                badge.classList.remove('success');
            }
        }
    }

    generateDailyReport() {
        const today = new Date().toISOString().split('T')[0];
        const todayEntries = data.getTodayEntries();
        
        if (todayEntries.length === 0) {
            return encodeURIComponent('📊 *Daily Sugar Report*\n\nNo entries recorded today.');
        }

        let report = `📊 *Daily Sugar Report - ${today}*\n\n`;
        
        todayEntries.forEach(entry => {
            const icon = getMealIcon(entry.mealType);
            const meal = capitalize(entry.mealType);
            report += `⏰ ${entry.time} - ${icon} ${meal}\n`;
            
            const sugarText = entry.sugarLevel !== null ? `${entry.sugarLevel} mg/dL` : 'Not Taken';
            const insulinText = entry.insulinDose !== null ? `${entry.insulinDose} units` : 'Not Taken';
            
            report += `🩸 Sugar: ${sugarText}\n`;
            report += `💉 Insulin: ${insulinText}\n`;
            if (entry.notes) report += `📝 ${entry.notes}\n`;
            report += `\n`;
        });

        // Calculate averages only from non-null values
        const sugarEntries = todayEntries.filter(e => e.sugarLevel !== null);
        const insulinEntries = todayEntries.filter(e => e.insulinDose !== null);
        
        const avgSugar = sugarEntries.length > 0
            ? Math.round(sugarEntries.reduce((sum, e) => sum + e.sugarLevel, 0) / sugarEntries.length)
            : 'N/A';
        
        const totalInsulin = insulinEntries.length > 0
            ? insulinEntries.reduce((sum, e) => sum + e.insulinDose, 0).toFixed(1)
            : 'N/A';
        
        report += `📈 *Summary*\n`;
        report += `Average Sugar: ${avgSugar}${typeof avgSugar === 'number' ? ' mg/dL' : ''}\n`;
        report += `Total Insulin: ${totalInsulin}${typeof totalInsulin === 'string' && totalInsulin !== 'N/A' ? ' units' : ''}\n`;
        report += `Entries: ${todayEntries.length}\n`;

        return encodeURIComponent(report);
    }

    /**
     * Opens WhatsApp with prefilled text. `wa.me` cannot press Send for you — user taps Send in WhatsApp.
     * @param {string} number
     * @param {{ silent?: boolean, encodedMessage?: string }} options - encodedMessage skips generateDailyReport
     */
    sendToWhatsApp(number = this.settings.number, options = {}) {
        if (!number || number.trim() === '') {
            if (!options.silent) showToast('⚠️ Please enter a WhatsApp number in Settings', 'error');
            return false;
        }

        const cleanNumber = number.replace(/[^0-9+]/g, '');
        
        if (!cleanNumber.startsWith('+')) {
            if (!options.silent) showToast('⚠️ Number must start with + and country code (e.g., +1234567890)', 'error');
            return false;
        }

        if (cleanNumber.length < 10) {
            if (!options.silent) showToast('⚠️ Invalid phone number format', 'error');
            return false;
        }

        try {
            const message = options.encodedMessage != null ? options.encodedMessage : this.generateDailyReport();
            const finalNumber = cleanNumber.substring(1);
            const url = `https://wa.me/${finalNumber}?text=${message}`;
            this._openWhatsAppUrl(url);
            if (!options.silent) {
                showToast('✅ Opening WhatsApp — tap Send there to deliver', 'success');
            }
            return true;
        } catch (error) {
            console.error('WhatsApp send error:', error);
            if (!options.silent) showToast('❌ Failed to open WhatsApp', 'error');
            return false;
        }
    }

    /** Open WhatsApp in a new tab (same as tapping a link; helps some browsers vs raw window.open from timers). */
    _openWhatsAppUrl(url) {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.setAttribute('aria-hidden', 'true');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    _minutesFromMidnight(hm) {
        const [h, m] = (hm || '00:00').split(':').map((x) => parseInt(x, 10));
        return (h || 0) * 60 + (m || 0);
    }

    _nowHM() {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    /**
     * Once per day after the scheduled time: open WhatsApp with the daily report prefilled.
     */
    maybeSendScheduledDailyReport() {
        if (!this.settings.enabled || !this.settings.number?.trim()) return;

        const today = new Date().toISOString().split('T')[0];
        if (localStorage.getItem('lastWhatsAppSend') === today) return;

        const sched = (this.settings.time || '21:00').slice(0, 5);
        if (this._minutesFromMidnight(this._nowHM()) < this._minutesFromMidnight(sched)) return;

        const ok = this.sendToWhatsApp(this.settings.number, { silent: true });
        if (ok) {
            localStorage.setItem('lastWhatsAppSend', today);
            showToast('📱 Auto daily report: WhatsApp opened — tap Send to finish', 'success');
        }
    }

    /**
     * Opens WhatsApp with a nudge when a meal slot was not logged (reminder flow).
     */
    sendMissedReadingReminder(mealLabel, number = this.settings.number) {
        if (!number || String(number).trim() === '') {
            showToast('⚠️ Add your WhatsApp number above for missed-entry alerts', 'error');
            return false;
        }
        const cleanNumber = number.replace(/[^0-9+]/g, '');
        if (!cleanNumber.startsWith('+') || cleanNumber.length < 10) {
            showToast('⚠️ WhatsApp number must include + and country code', 'error');
            return false;
        }
        const today = new Date().toISOString().split('T')[0];
        const text = `⏰ *Daily Health Tracker*\n\nYou have not logged your *${mealLabel}* glucose reading today (${today}).\n\nPlease open your tracker and add an entry when you can.`;
        const url = `https://wa.me/${cleanNumber.substring(1)}?text=${encodeURIComponent(text)}`;
        this._openWhatsAppUrl(url);
        return true;
    }

    testConnection() {
        const number = document.getElementById('whatsappNumber').value;
        
        if (!number || number.trim() === '') {
            showToast('⚠️ Please enter a WhatsApp number first', 'error');
            return;
        }

        const cleanNumber = number.replace(/[^0-9+]/g, '');
        
        if (!cleanNumber.startsWith('+')) {
            showToast('⚠️ Number must start with + and country code', 'error');
            return;
        }

        // Send test message
        const testMessage = encodeURIComponent('🧪 Test message from Daily Health Tracker\n\nIf you received this, WhatsApp integration is working! ✅');
        const finalNumber = cleanNumber.substring(1);
        const url = `https://wa.me/${finalNumber}?text=${testMessage}`;
        this._openWhatsAppUrl(url);
        showToast('✅ Opening WhatsApp — tap Send to test', 'success');
    }

    checkScheduledSend() {
        const tick = () => this.maybeSendScheduledDailyReport();
        setInterval(tick, 30000);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') tick();
        });
        window.addEventListener('focus', tick);
        tick();
    }
}

// Reminder Manager — time-based checks; optional push + WhatsApp if meal not logged
class ReminderManager {
    constructor() {
        this.settings = this.loadSettings();
        this._watchId = null;
        if (this.settings.enabled) {
            this.startWatch();
        }
    }

    defaultSettings() {
        return {
            times: ['08:00', '14:00', '20:00'],
            enabled: false,
            pushEnabled: false,
            whatsappMissedEnabled: false,
            mealSlots: ['morning', 'afternoon', 'evening']
        };
    }

    loadSettings() {
        const defaults = this.defaultSettings();
        try {
            const stored = localStorage.getItem('reminderSettings');
            if (!stored) return { ...defaults };
            return { ...defaults, ...JSON.parse(stored) };
        } catch {
            return { ...defaults };
        }
    }

    saveSettings(partial) {
        this.settings = { ...this.settings, ...partial };
        localStorage.setItem('reminderSettings', JSON.stringify(this.settings));
        if (this.settings.enabled) {
            this.startWatch();
        } else {
            this.stopWatch();
        }
    }

    stopWatch() {
        if (this._watchId != null) {
            clearInterval(this._watchId);
            this._watchId = null;
        }
    }

    startWatch() {
        this.stopWatch();
        if (!this.settings.enabled) return;
        this._watchId = setInterval(() => this.tick(), 30000);
        this.tick();
    }

    getCurrentTimeHM() {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    tick() {
        if (!this.settings.enabled) return;

        const current = this.getCurrentTimeHM();
        const today = new Date().toISOString().split('T')[0];
        const slots = this.settings.mealSlots && this.settings.mealSlots.length === 3
            ? this.settings.mealSlots
            : ['morning', 'afternoon', 'evening'];

        this.settings.times.forEach((reminderTime, slotIndex) => {
            if (reminderTime !== current) return;

            const storageKey = `missRemind_${today}_${slotIndex}`;
            if (localStorage.getItem(storageKey)) return;

            const mealType = slots[slotIndex] || 'morning';
            const logged = data.getTodayEntries().some(e => e.mealType === mealType);
            if (logged) return;

            localStorage.setItem(storageKey, '1');

            const mealLabel = capitalize(mealType);
            const title = 'Log your glucose';
            const body = `You have not logged your ${mealLabel} reading today. Open Daily Health Tracker to add it.`;

            if (this.settings.pushEnabled && typeof Notification !== 'undefined') {
                if (Notification.permission === 'granted') {
                    try {
                        const n = new Notification(title, {
                            body,
                            tag: `dht-${mealType}-${today}`,
                            renotify: true
                        });
                        n.onclick = () => {
                            window.focus();
                            n.close();
                        };
                    } catch (err) {
                        console.warn('Notification error:', err);
                    }
                }
            }

            if (this.settings.whatsappMissedEnabled) {
                whatsappManager.sendMissedReadingReminder(mealLabel);
            }

            showToast(`⏰ ${mealLabel} reading not logged — check notification or WhatsApp`, 'error');
        });
    }
}

async function requestBrowserNotificationPermission() {
    if (typeof Notification === 'undefined') {
        showToast('Notifications are not supported in this browser', 'error');
        return 'unsupported';
    }
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') {
        showToast('Notifications are blocked. Enable them in browser settings.', 'error');
        return 'denied';
    }
    const result = await Notification.requestPermission();
    return result;
}

// Contact Manager (Enhanced with Multiple Contacts)
class ContactManager {
    constructor() {
        this.contacts = this.loadContacts();
        this.alertSettings = this.loadAlertSettings();
        this.startMissedEntryCheck();
    }

    loadContacts() {
        const stored = localStorage.getItem('emergencyContacts');
        return stored ? JSON.parse(stored) : [];
    }

    saveContacts() {
        localStorage.setItem('emergencyContacts', JSON.stringify(this.contacts));
        this.updateContactsBadge();
    }

    loadAlertSettings() {
        const stored = localStorage.getItem('alertSettings');
        return stored ? JSON.parse(stored) : {
            lowSugarEnabled: true,
            lowSugarThreshold: 70,
            highSugarEnabled: true,
            highSugarThreshold: 250,
            missedEntryEnabled: true,
            missedEntryHours: 6
        };
    }

    saveAlertSettings(settings) {
        this.alertSettings = settings;
        localStorage.setItem('alertSettings', JSON.stringify(settings));
    }

    addContact(name, phone, relation) {
        // Validate
        if (!name || !phone) {
            showToast('⚠️ Please enter name and phone', 'error');
            return false;
        }

        if (!phone.startsWith('+')) {
            showToast('⚠️ Phone must start with + and country code', 'error');
            return false;
        }

        // Check duplicate
        if (this.contacts.some(c => c.phone === phone)) {
            showToast('⚠️ This contact already exists', 'error');
            return false;
        }

        const contact = {
            id: Date.now(),
            name,
            phone,
            relation,
            addedAt: new Date().toISOString()
        };

        this.contacts.push(contact);
        this.saveContacts();
        showToast('✅ Contact added successfully!', 'success');
        return true;
    }

    deleteContact(id) {
        this.contacts = this.contacts.filter(c => c.id !== id);
        this.saveContacts();
        showToast('✅ Contact removed', 'success');
    }

    updateContactsBadge() {
        const badge = document.getElementById('contactStatus');
        if (badge) {
            const count = this.contacts.length;
            badge.textContent = count === 0 ? 'No Contacts' : `${count} Contact${count > 1 ? 's' : ''}`;
            if (count > 0) {
                badge.classList.add('success');
            } else {
                badge.classList.remove('success');
            }
        }
    }

    sendWhatsAppAlert(message) {
        if (this.contacts.length === 0) {
            console.log('No emergency contacts to alert');
            return;
        }

        const encodedMessage = encodeURIComponent(message);
        
        this.contacts.forEach(contact => {
            const cleanNumber = contact.phone.replace(/[^0-9+]/g, '').substring(1);
            const url = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
            
            // Open in new tab (one per contact)
            setTimeout(() => {
                window.open(url, '_blank');
            }, 500);
        });

        showToast(`📱 Alert sent to ${this.contacts.length} contact(s)`, 'success');
    }

    checkLowSugar(sugarLevel) {
        if (!this.alertSettings.lowSugarEnabled) return;
        
        if (sugarLevel < this.alertSettings.lowSugarThreshold) {
            const message = `🚨 LOW SUGAR ALERT!\n\nSugar Level: ${sugarLevel} mg/dL\nThreshold: ${this.alertSettings.lowSugarThreshold} mg/dL\n\nTime: ${new Date().toLocaleString()}\n\nPlease check on the patient immediately!`;
            
            this.sendWhatsAppAlert(message);
            
            // Also show local alert
            if (confirm('🚨 LOW SUGAR ALERT!\n\nYour sugar is dangerously low. Alert sent to emergency contacts.\n\nCall emergency contact now?')) {
                if (this.contacts.length > 0) {
                    window.location.href = `tel:${this.contacts[0].phone}`;
                }
            }
        }
    }

    checkHighSugar(sugarLevel) {
        if (!this.alertSettings.highSugarEnabled) return;
        
        if (sugarLevel > this.alertSettings.highSugarThreshold) {
            const message = `⚠️ HIGH SUGAR ALERT!\n\nSugar Level: ${sugarLevel} mg/dL\nThreshold: ${this.alertSettings.highSugarThreshold} mg/dL\n\nTime: ${new Date().toLocaleString()}\n\nPlease monitor the patient closely.`;
            
            this.sendWhatsAppAlert(message);
            
            // Show local alert
            alert('⚠️ HIGH SUGAR ALERT!\n\nYour sugar is very high. Alert sent to emergency contacts.\n\nPlease monitor closely and consult your doctor.');
        }
    }

    startMissedEntryCheck() {
        if (!this.alertSettings.missedEntryEnabled) return;

        // Check every hour
        setInterval(() => {
            const lastEntry = data.entries[0];
            if (!lastEntry) return;

            const lastEntryTime = new Date(`${lastEntry.date}T${lastEntry.time}`);
            const now = new Date();
            const hoursSinceLastEntry = (now - lastEntryTime) / (1000 * 60 * 60);

            if (hoursSinceLastEntry >= this.alertSettings.missedEntryHours) {
                const lastSent = localStorage.getItem('lastMissedEntryAlert');
                const today = new Date().toISOString().split('T')[0];

                // Only send once per day
                if (lastSent !== today) {
                    const message = `⏰ MISSED ENTRY ALERT!\n\nNo sugar level logged for ${Math.floor(hoursSinceLastEntry)} hours.\n\nLast Entry: ${lastEntry.date} ${lastEntry.time}\nSugar: ${lastEntry.sugarLevel} mg/dL\n\nPlease check on the patient.`;
                    
                    this.sendWhatsAppAlert(message);
                    localStorage.setItem('lastMissedEntryAlert', today);
                    
                    showToast('⏰ Missed entry alert sent to contacts', 'warning');
                }
            }
        }, 3600000); // Check every hour
    }

    callContact(phone) {
        window.location.href = `tel:${phone}`;
    }

    messageContact(phone) {
        const message = encodeURIComponent('Hi, I need assistance with my diabetes management.');
        const cleanNumber = phone.replace(/[^0-9+]/g, '').substring(1);
        window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
    }
}

// Initialize managers
const whatsappManager = new WhatsAppManager();
const reminderManager = new ReminderManager();
const contactManager = new ContactManager();

// Diet Guide Data
const dietData = {
    vegetables: {
        name: 'Vegetables',
        icon: '🥬',
        good: [
            { name: 'Spinach', benefit: 'Low carb, high fiber, rich in iron' },
            { name: 'Broccoli', benefit: 'Low GI, high in vitamins C & K' },
            { name: 'Cauliflower', benefit: 'Low carb alternative to rice/potatoes' },
            { name: 'Cabbage', benefit: 'Low calorie, high fiber' },
            { name: 'Bitter Gourd (Karela)', benefit: 'Natural blood sugar reducer' },
            { name: 'Cucumber', benefit: 'Hydrating, very low carb' },
            { name: 'Tomatoes', benefit: 'Low GI, rich in lycopene' },
            { name: 'Bell Peppers', benefit: 'Low carb, high in vitamin C' },
            { name: 'Okra (Bhindi)', benefit: 'Helps lower blood sugar' },
            { name: 'Green Beans', benefit: 'Low GI, good fiber source' }
        ],
        moderate: [
            { name: 'Carrots', benefit: 'Moderate GI when cooked, eat raw' },
            { name: 'Beets', benefit: 'Higher sugar, eat in small portions' },
            { name: 'Peas', benefit: 'Higher carb, limit portion size' },
            { name: 'Corn', benefit: 'Higher carb, eat occasionally' }
        ],
        avoid: [
            { name: 'Potatoes', reason: 'High GI, spikes blood sugar quickly' },
            { name: 'Sweet Potatoes (large portions)', reason: 'High carb, limit to small amounts' }
        ]
    },
    fruits: {
        name: 'Fruits',
        icon: '🍎',
        good: [
            { name: 'Berries (Strawberries, Blueberries)', benefit: 'Low GI, high antioxidants' },
            { name: 'Apple (with skin)', benefit: 'Good fiber, moderate GI' },
            { name: 'Pear', benefit: 'High fiber, low GI' },
            { name: 'Orange', benefit: 'Good vitamin C, moderate GI' },
            { name: 'Guava', benefit: 'Low GI, high fiber' },
            { name: 'Papaya (small portion)', benefit: 'Good for digestion' },
            { name: 'Watermelon (small portion)', benefit: 'Hydrating, eat in moderation' },
            { name: 'Pomegranate', benefit: 'Antioxidants, moderate portions' }
        ],
        moderate: [
            { name: 'Banana (small)', benefit: 'Higher carb, eat half at a time' },
            { name: 'Grapes', benefit: 'Higher sugar, limit to small handful' },
            { name: 'Mango', benefit: 'High sugar, eat small portions only' },
            { name: 'Pineapple', benefit: 'Moderate GI, small portions' }
        ],
        avoid: [
            { name: 'Dried Fruits (Dates, Raisins)', reason: 'Very high sugar concentration' },
            { name: 'Fruit Juices', reason: 'No fiber, rapid sugar spike' },
            { name: 'Canned Fruits in Syrup', reason: 'Added sugar' },
            { name: 'Chikoo (Sapota)', reason: 'Very high sugar content' }
        ]
    },
    grains: {
        name: 'Grains & Cereals',
        icon: '🌾',
        good: [
            { name: 'Brown Rice', benefit: 'Higher fiber than white rice' },
            { name: 'Quinoa', benefit: 'Complete protein, low GI' },
            { name: 'Oats (Steel-cut)', benefit: 'High fiber, stabilizes blood sugar' },
            { name: 'Barley', benefit: 'Very high fiber, low GI' },
            { name: 'Whole Wheat Roti', benefit: 'Better than white bread' },
            { name: 'Millets (Ragi, Jowar, Bajra)', benefit: 'Low GI, high nutrients' },
            { name: 'Buckwheat', benefit: 'Gluten-free, low GI' }
        ],
        moderate: [
            { name: 'White Rice (small portion)', benefit: 'Limit to 1/2 cup, pair with vegetables' },
            { name: 'Whole Wheat Bread', benefit: 'Better than white, still moderate GI' },
            { name: 'Pasta (whole wheat)', benefit: 'Al dente cooking lowers GI' }
        ],
        avoid: [
            { name: 'White Bread', reason: 'High GI, rapid sugar spike' },
            { name: 'White Rice (large portions)', reason: 'High GI, low fiber' },
            { name: 'Refined Flour (Maida)', reason: 'Very high GI, no nutrients' },
            { name: 'Instant Oats', reason: 'Processed, higher GI than steel-cut' },
            { name: 'Sugary Cereals', reason: 'High sugar, low fiber' }
        ]
    },
    proteins: {
        name: 'Proteins',
        icon: '🍗',
        good: [
            { name: 'Chicken Breast (skinless)', benefit: 'Lean protein, no carbs' },
            { name: 'Fish (Salmon, Tuna, Mackerel)', benefit: 'Omega-3, heart healthy' },
            { name: 'Eggs', benefit: 'Complete protein, very low carb' },
            { name: 'Lentils (Dal)', benefit: 'Plant protein, high fiber' },
            { name: 'Chickpeas (Chana)', benefit: 'Good protein and fiber' },
            { name: 'Tofu', benefit: 'Low carb, plant-based protein' },
            { name: 'Greek Yogurt (unsweetened)', benefit: 'High protein, probiotics' },
            { name: 'Paneer (cottage cheese)', benefit: 'Low carb, high protein' }
        ],
        moderate: [
            { name: 'Red Meat (lean cuts)', benefit: 'Limit to 1-2 times per week' },
            { name: 'Kidney Beans (Rajma)', benefit: 'Higher carb, moderate portions' },
            { name: 'Regular Yogurt', benefit: 'Choose unsweetened varieties' }
        ],
        avoid: [
            { name: 'Processed Meats (Sausages, Bacon)', reason: 'High sodium, preservatives' },
            { name: 'Fried Chicken', reason: 'High fat, breading adds carbs' },
            { name: 'Sweetened Yogurt', reason: 'Added sugars' }
        ]
    },
    nuts: {
        name: 'Nuts & Seeds',
        icon: '🥜',
        good: [
            { name: 'Almonds', benefit: 'Low GI, healthy fats, vitamin E' },
            { name: 'Walnuts', benefit: 'Omega-3, brain health' },
            { name: 'Chia Seeds', benefit: 'High fiber, omega-3' },
            { name: 'Flax Seeds', benefit: 'Fiber, omega-3, lignans' },
            { name: 'Pumpkin Seeds', benefit: 'Magnesium, zinc' },
            { name: 'Sunflower Seeds', benefit: 'Vitamin E, selenium' },
            { name: 'Pistachios', benefit: 'Lower calorie nut option' },
            { name: 'Peanuts (unsalted)', benefit: 'Protein, healthy fats' }
        ],
        moderate: [
            { name: 'Cashews', benefit: 'Higher carb than other nuts, limit portion' },
            { name: 'Coconut', benefit: 'High fat, moderate portions' }
        ],
        avoid: [
            { name: 'Salted/Roasted Nuts', reason: 'High sodium, added oils' },
            { name: 'Honey-Roasted Nuts', reason: 'Added sugars' },
            { name: 'Nut Butters with Sugar', reason: 'Check labels for added sugar' }
        ]
    },
    beverages: {
        name: 'Beverages',
        icon: '☕',
        good: [
            { name: 'Water', benefit: 'Best choice, stay hydrated' },
            { name: 'Green Tea', benefit: 'Antioxidants, may improve insulin sensitivity' },
            { name: 'Black Coffee (unsweetened)', benefit: 'May improve insulin sensitivity' },
            { name: 'Herbal Tea', benefit: 'No calories, various health benefits' },
            { name: 'Buttermilk (unsweetened)', benefit: 'Probiotics, low calorie' },
            { name: 'Vegetable Juice (fresh)', benefit: 'Nutrients, but limit portion' }
        ],
        moderate: [
            { name: 'Milk (low-fat)', benefit: 'Calcium, but has natural sugars' },
            { name: 'Coconut Water', benefit: 'Natural electrolytes, moderate sugar' },
            { name: 'Coffee with Milk', benefit: 'Limit sugar, use low-fat milk' }
        ],
        avoid: [
            { name: 'Soda/Soft Drinks', reason: 'Very high sugar, no nutrients' },
            { name: 'Fruit Juices (packaged)', reason: 'High sugar, no fiber' },
            { name: 'Energy Drinks', reason: 'High sugar and caffeine' },
            { name: 'Sweetened Tea/Coffee', reason: 'Added sugars' },
            { name: 'Alcohol', reason: 'Can cause blood sugar fluctuations' },
            { name: 'Flavored Milk', reason: 'Added sugars' }
        ]
    },
    snacks: {
        name: 'Snacks',
        icon: '🍿',
        good: [
            { name: 'Raw Vegetables with Hummus', benefit: 'Fiber, protein, low GI' },
            { name: 'Handful of Nuts', benefit: 'Healthy fats, protein' },
            { name: 'Boiled Eggs', benefit: 'High protein, zero carbs' },
            { name: 'Greek Yogurt with Berries', benefit: 'Protein, antioxidants' },
            { name: 'Roasted Chickpeas', benefit: 'Fiber, protein, crunchy' },
            { name: 'Cucumber Slices', benefit: 'Hydrating, very low calorie' },
            { name: 'Apple with Peanut Butter', benefit: 'Fiber and protein combo' }
        ],
        moderate: [
            { name: 'Popcorn (air-popped)', benefit: 'Whole grain, watch portions' },
            { name: 'Dark Chocolate (70%+)', benefit: 'Small piece, antioxidants' },
            { name: 'Whole Grain Crackers', benefit: 'Pair with protein' }
        ],
        avoid: [
            { name: 'Chips/Crisps', reason: 'High carb, high sodium, fried' },
            { name: 'Cookies/Biscuits', reason: 'High sugar, refined flour' },
            { name: 'Candy/Sweets', reason: 'Pure sugar, rapid spike' },
            { name: 'Pastries/Cakes', reason: 'High sugar and refined carbs' },
            { name: 'Samosas/Pakoras', reason: 'Deep fried, high carb' },
            { name: 'Namkeen/Bhujia', reason: 'High carb, high sodium, fried' }
        ]
    }
};

let currentDietFilter = 'all';
let currentDietSearch = '';

function renderDietGuide() {
    renderDietCategories();
    setupDietFilters();
    setupDietSearch();
}

function renderDietCategories() {
    const container = document.getElementById('dietCategories');
    if (!container) return;

    const categories = Object.keys(dietData);
    
    container.innerHTML = categories.map(categoryKey => {
        const category = dietData[categoryKey];
        return `
            <div class="card diet-category-card" data-category="${categoryKey}">
                <div class="card-header">
                    <h2 class="card-title">${category.icon} ${category.name}</h2>
                </div>
                <div class="card-body">
                    ${renderFoodList('good', category.good)}
                    ${renderFoodList('moderate', category.moderate)}
                    ${renderFoodList('avoid', category.avoid)}
                </div>
            </div>
        `;
    }).join('');
}

function renderFoodList(type, foods) {
    if (!foods || foods.length === 0) return '';
    
    const titles = {
        good: '✅ Good Choices',
        moderate: '⚠️ Eat in Moderation',
        avoid: '❌ Avoid or Limit'
    };
    
    const classes = {
        good: 'food-good',
        moderate: 'food-moderate',
        avoid: 'food-avoid'
    };

    return `
        <div class="food-section ${classes[type]}" data-type="${type}">
            <h3 class="food-section-title">${titles[type]}</h3>
            <div class="food-list">
                ${foods.map(food => `
                    <div class="food-item" data-food-name="${food.name.toLowerCase()}">
                        <div class="food-name">${food.name}</div>
                        <div class="food-info">${food.benefit || food.reason}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function setupDietFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDietFilter = btn.dataset.category;
            applyDietFilters();
        });
    });
}

function setupDietSearch() {
    const searchInput = document.getElementById('foodSearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        currentDietSearch = e.target.value.toLowerCase();
        applyDietFilters();
    });
}

function applyDietFilters() {
    const allSections = document.querySelectorAll('.food-section');
    const allItems = document.querySelectorAll('.food-item');
    const allCards = document.querySelectorAll('.diet-category-card');
    
    // Reset visibility
    allSections.forEach(section => section.style.display = 'block');
    allItems.forEach(item => item.style.display = 'flex');
    allCards.forEach(card => card.style.display = 'block');
    
    // Apply category filter
    if (currentDietFilter !== 'all') {
        allSections.forEach(section => {
            if (section.dataset.type !== currentDietFilter) {
                section.style.display = 'none';
            }
        });
    }
    
    // Apply search filter
    if (currentDietSearch) {
        allItems.forEach(item => {
            const foodName = item.dataset.foodName;
            if (!foodName.includes(currentDietSearch)) {
                item.style.display = 'none';
            }
        });
        
        // Hide empty sections
        allSections.forEach(section => {
            const visibleItems = section.querySelectorAll('.food-item[style="display: flex;"], .food-item:not([style])');
            if (visibleItems.length === 0) {
                section.style.display = 'none';
            }
        });
        
        // Hide empty cards
        allCards.forEach(card => {
            const visibleSections = card.querySelectorAll('.food-section[style="display: block;"], .food-section:not([style])');
            if (visibleSections.length === 0) {
                card.style.display = 'none';
            }
        });
    }
}

// Load settings
function loadAllSettings() {
    // User Profile
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
        const user = JSON.parse(userInfo);
        document.getElementById('profileName').value = user.name;
        document.getElementById('profileAge').value = user.age;
    }
    
    // WhatsApp settings
    document.getElementById('whatsappNumber').value = whatsappManager.settings.number;
    document.getElementById('whatsappTime').value = whatsappManager.settings.time;
    document.getElementById('autoSendEnabled').checked = whatsappManager.settings.enabled;
    whatsappManager.updateStatusBadge();

    // Reminder settings
    document.getElementById('reminder1').value = reminderManager.settings.times[0];
    document.getElementById('reminder2').value = reminderManager.settings.times[1];
    document.getElementById('reminder3').value = reminderManager.settings.times[2];
    document.getElementById('remindersEnabled').checked = reminderManager.settings.enabled;
    const pushEl = document.getElementById('reminderPushEnabled');
    const waEl = document.getElementById('reminderWhatsAppMissed');
    if (pushEl) pushEl.checked = !!reminderManager.settings.pushEnabled;
    if (waEl) waEl.checked = !!reminderManager.settings.whatsappMissedEnabled;
    
    const reminderBadge = document.getElementById('reminderStatus');
    if (reminderBadge) {
        reminderBadge.textContent = reminderManager.settings.enabled ? 'Active' : 'Disabled';
        if (reminderManager.settings.enabled) {
            reminderBadge.classList.add('success');
        }
    }

    // Contact settings
    renderContactsList();
    contactManager.updateContactsBadge();

    // Alert settings
    document.getElementById('lowSugarAlertEnabled').checked = contactManager.alertSettings.lowSugarEnabled;
    document.getElementById('lowSugarThreshold').value = contactManager.alertSettings.lowSugarThreshold;
    document.getElementById('highSugarAlertEnabled').checked = contactManager.alertSettings.highSugarEnabled;
    document.getElementById('highSugarThreshold').value = contactManager.alertSettings.highSugarThreshold;
    document.getElementById('missedEntryAlertEnabled').checked = contactManager.alertSettings.missedEntryEnabled;
    document.getElementById('missedEntryHours').value = contactManager.alertSettings.missedEntryHours;
    
    // Update storage info
    const totalEntries = data.entries.length;
    document.getElementById('totalEntriesCount').textContent = totalEntries;
    if (document.getElementById('totalEntriesCount2')) {
        document.getElementById('totalEntriesCount2').textContent = totalEntries;
    }
    
    const dataSize = new Blob([JSON.stringify(data.entries)]).size;
    document.getElementById('dataSize').textContent = `${(dataSize / 1024).toFixed(2)} KB`;
    
    // Update last sync time
    const lastSync = document.getElementById('lastSyncTime');
    if (lastSync) {
        lastSync.textContent = 'Just now';
    }
}

// Render contacts list
function renderContactsList() {
    const container = document.getElementById('contactsList');
    
    if (contactManager.contacts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <div class="empty-state-text">No emergency contacts added yet</div>
            </div>
        `;
        return;
    }

    const relationIcons = {
        doctor: '👨‍⚕️',
        family: '👨‍👩‍👧',
        friend: '👥',
        caregiver: '🤝'
    };

    container.innerHTML = contactManager.contacts.map(contact => `
        <div class="contact-item">
            <div class="contact-info">
                <div class="contact-name">${escapeHtml(contact.name)}</div>
                <div class="contact-details">
                    <span class="contact-phone">📱 ${escapeHtml(contact.phone)}</span>
                    <span class="contact-relation">
                        ${relationIcons[contact.relation] || '👤'} ${capitalize(contact.relation)}
                    </span>
                </div>
            </div>
            <div class="contact-actions">
                <button type="button" class="contact-btn call" data-contact-action="call" data-phone="${escapeHtml(contact.phone)}">
                    📞 Call
                </button>
                <button type="button" class="contact-btn message" data-contact-action="message" data-phone="${escapeHtml(contact.phone)}">
                    💬 Message
                </button>
                <button type="button" class="contact-btn delete" data-contact-action="delete" data-id="${contact.id}">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
}

function getReminderSettingsFromDom() {
    return {
        times: [
            document.getElementById('reminder1').value,
            document.getElementById('reminder2').value,
            document.getElementById('reminder3').value
        ],
        enabled: document.getElementById('remindersEnabled').checked,
        pushEnabled: document.getElementById('reminderPushEnabled')?.checked ?? false,
        whatsappMissedEnabled: document.getElementById('reminderWhatsAppMissed')?.checked ?? false
    };
}

function setupContactsListDelegation() {
    const container = document.getElementById('contactsList');
    if (!container) return;
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-contact-action]');
        if (!btn) return;
        const action = btn.dataset.contactAction;
        if (action === 'call') {
            contactManager.callContact(btn.dataset.phone);
        } else if (action === 'message') {
            contactManager.messageContact(btn.dataset.phone);
        } else if (action === 'delete') {
            const id = Number(btn.dataset.id);
            if (confirm('Remove this contact?')) {
                contactManager.deleteContact(id);
                renderContactsList();
            }
        }
    });
}

// Setup feature listeners
function setupNewFeatureListeners() {
    // User Profile - Update
    document.getElementById('updateProfile').addEventListener('click', () => {
        const name = document.getElementById('profileName').value;
        const age = document.getElementById('profileAge').value;
        
        if (!name || !age) {
            showToast('⚠️ Please enter both name and age', 'error');
            return;
        }
        
        const userInfo = {
            name: name,
            age: age,
            updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        updateUserDisplay(userInfo);
        showToast('✅ Profile updated successfully!', 'success');
    });
    
    // WhatsApp - Save number on change
    document.getElementById('whatsappNumber').addEventListener('change', (e) => {
        whatsappManager.saveSettings({
            number: e.target.value,
            time: document.getElementById('whatsappTime').value,
            enabled: document.getElementById('autoSendEnabled').checked
        });
    });

    document.getElementById('whatsappTime').addEventListener('change', (e) => {
        whatsappManager.saveSettings({
            number: document.getElementById('whatsappNumber').value,
            time: e.target.value,
            enabled: document.getElementById('autoSendEnabled').checked
        });
    });

    // WhatsApp - Auto-send toggle
    document.getElementById('autoSendEnabled').addEventListener('change', (e) => {
        const number = document.getElementById('whatsappNumber').value;
        
        if (e.target.checked && (!number || !number.startsWith('+'))) {
            e.target.checked = false;
            showToast('⚠️ Please enter a valid WhatsApp number first (with +)', 'error');
            return;
        }
        
        whatsappManager.saveSettings({
            number: document.getElementById('whatsappNumber').value,
            time: document.getElementById('whatsappTime').value,
            enabled: e.target.checked
        });
        
        if (e.target.checked) {
            whatsappManager.maybeSendScheduledDailyReport();
        }
        showToast(e.target.checked ? '✅ Auto-send enabled!' : '❌ Auto-send disabled', 'success');
    });

    // WhatsApp - Send now button
    document.getElementById('sendNowWhatsApp').addEventListener('click', () => {
        const number = document.getElementById('whatsappNumber').value;
        whatsappManager.sendToWhatsApp(number);
    });

    // WhatsApp - Test button
    document.getElementById('testWhatsApp').addEventListener('click', () => {
        whatsappManager.testConnection();
    });

    // Reminders - Save times on change
    ['reminder1', 'reminder2', 'reminder3'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            reminderManager.saveSettings(getReminderSettingsFromDom());
        });
    });

    // Reminders - Toggle
    document.getElementById('remindersEnabled').addEventListener('change', (e) => {
        const state = getReminderSettingsFromDom();
        state.enabled = e.target.checked;
        reminderManager.saveSettings(state);
        
        const badge = document.getElementById('reminderStatus');
        if (badge) {
            badge.textContent = e.target.checked ? 'Active' : 'Disabled';
            if (e.target.checked) {
                badge.classList.add('success');
            } else {
                badge.classList.remove('success');
            }
        }
        
        showToast(e.target.checked ? '✅ Reminders on — empty slots can trigger notification / WhatsApp.' : '❌ Reminders disabled', 'success');
    });

    document.getElementById('reminderPushEnabled')?.addEventListener('change', async (e) => {
        if (e.target.checked) {
            const perm = await requestBrowserNotificationPermission();
            if (perm !== 'granted') {
                e.target.checked = false;
                reminderManager.saveSettings({ ...getReminderSettingsFromDom(), pushEnabled: false });
                return;
            }
        }
        reminderManager.saveSettings(getReminderSettingsFromDom());
        showToast(e.target.checked ? '✅ Browser notifications enabled' : 'Browser notifications off', 'success');
    });

    document.getElementById('reminderWhatsAppMissed')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            const num = document.getElementById('whatsappNumber').value;
            if (!num || !num.trim().startsWith('+')) {
                e.target.checked = false;
                showToast('⚠️ Save a WhatsApp number with +country code first', 'error');
                reminderManager.saveSettings({ ...getReminderSettingsFromDom(), whatsappMissedEnabled: false });
                return;
            }
        }
        reminderManager.saveSettings(getReminderSettingsFromDom());
        showToast(e.target.checked ? '✅ WhatsApp nudges enabled' : 'WhatsApp nudges off', 'success');
    });

    // Contact - Add
    document.getElementById('addContact').addEventListener('click', () => {
        const name = document.getElementById('contactName').value;
        const phone = document.getElementById('contactPhone').value;
        const relation = document.getElementById('contactRelation').value;
        
        if (contactManager.addContact(name, phone, relation)) {
            // Clear form
            document.getElementById('contactName').value = '';
            document.getElementById('contactPhone').value = '';
            document.getElementById('contactRelation').value = 'doctor';
            
            // Re-render list
            renderContactsList();
        }
    });

    // Alert Settings - Low Sugar
    document.getElementById('lowSugarAlertEnabled').addEventListener('change', (e) => {
        contactManager.saveAlertSettings({
            ...contactManager.alertSettings,
            lowSugarEnabled: e.target.checked
        });
        showToast(e.target.checked ? '✅ Low sugar alerts enabled' : '❌ Low sugar alerts disabled', 'success');
    });

    document.getElementById('lowSugarThreshold').addEventListener('change', (e) => {
        contactManager.saveAlertSettings({
            ...contactManager.alertSettings,
            lowSugarThreshold: parseInt(e.target.value)
        });
    });

    // Alert Settings - High Sugar
    document.getElementById('highSugarAlertEnabled').addEventListener('change', (e) => {
        contactManager.saveAlertSettings({
            ...contactManager.alertSettings,
            highSugarEnabled: e.target.checked
        });
        showToast(e.target.checked ? '✅ High sugar alerts enabled' : '❌ High sugar alerts disabled', 'success');
    });

    document.getElementById('highSugarThreshold').addEventListener('change', (e) => {
        contactManager.saveAlertSettings({
            ...contactManager.alertSettings,
            highSugarThreshold: parseInt(e.target.value)
        });
    });

    // Alert Settings - Missed Entry
    document.getElementById('missedEntryAlertEnabled').addEventListener('change', (e) => {
        contactManager.saveAlertSettings({
            ...contactManager.alertSettings,
            missedEntryEnabled: e.target.checked
        });
        showToast(e.target.checked ? '✅ Missed entry alerts enabled' : '❌ Missed entry alerts disabled', 'success');
    });

    document.getElementById('missedEntryHours').addEventListener('change', (e) => {
        contactManager.saveAlertSettings({
            ...contactManager.alertSettings,
            missedEntryHours: parseInt(e.target.value)
        });
    });

    // Export - Excel
    document.getElementById('exportJSON').addEventListener('click', () => {
        data.exportToExcel();
        showToast('📊 Data exported to Excel!', 'success');
    });

    // Export - CSV (backup option)
    document.getElementById('exportCSV').addEventListener('click', () => {
        data.exportToCSV();
        showToast('📄 Data exported as CSV!', 'success');
    });

    // Clear old data
    if (document.getElementById('clearOldData')) {
        document.getElementById('clearOldData').addEventListener('click', () => {
            if (confirm('⚠️ Clear entries older than 30 days?')) {
                const oldCount = data.entries.length;
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - 30);
                const cutoffStr = cutoffDate.toISOString().split('T')[0];
                
                data.entries = data.entries.filter(e => e.date >= cutoffStr);
                data.saveEntries();
                
                const removed = oldCount - data.entries.length;
                showToast(`✅ Removed ${removed} old entries`, 'success');
                loadAllSettings();
            }
        });
    }

    // Clear all data
    if (document.getElementById('clearAllData')) {
        document.getElementById('clearAllData').addEventListener('click', () => {
            if (confirm('⚠️ Delete ALL data? This cannot be undone!')) {
                if (confirm('🚨 Last chance! Are you absolutely sure?')) {
                    data.entries = [];
                    data.saveEntries();
                    showToast('✅ All data cleared', 'success');
                    updateDashboard();
                    loadAllSettings();
                }
            }
        });
    }
}
