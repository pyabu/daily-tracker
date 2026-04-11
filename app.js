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

    exportToJSON() {
        const dataStr = JSON.stringify({
            entries: this.entries,
            exportDate: new Date().toISOString(),
            version: '2.0'
        }, null, 2);
        
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `diabetes-tracker-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    exportToCSV() {
        const headers = ['Date', 'Time', 'Meal Type', 'Sugar Level (mg/dL)', 'Insulin (units)', 'Notes'];
        const rows = this.entries.map(e => [
            e.date,
            e.time,
            e.mealType,
            e.sugarLevel,
            e.insulinDose,
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
        'settings': 'Settings'
    };
    document.getElementById('pageTitle').textContent = titles[pageName] || pageName;
    
    // Load page-specific content
    if (pageName === 'history') renderHistory();
    if (pageName === 'insights') renderInsights();
}

// Form Handlers
function setupFormHandlers() {
    document.getElementById('quickEntryForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('sugarLevel').addEventListener('input', updateSugarIndicator);
    
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
        data.exportToCSV();
        showToast('📊 Data exported successfully!', 'success');
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
    
    const entry = {
        date: document.getElementById('entryDate').value,
        time: document.getElementById('entryTime').value,
        mealType: mealInput.value,
        sugarLevel: parseInt(document.getElementById('sugarLevel').value),
        insulinDose: parseFloat(document.getElementById('insulinDose').value) || 0,
        notes: document.getElementById('notes').value
    };

    data.addEntry(entry);
    showToast('✅ Entry saved and synced to cloud!', 'success');
    
    // Check for alerts
    contactManager.checkLowSugar(entry.sugarLevel);
    contactManager.checkHighSugar(entry.sugarLevel);
    
    // Reset form
    document.getElementById('quickEntryForm').reset();
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

    const avgSugar = Math.round(entries.reduce((sum, e) => sum + e.sugarLevel, 0) / entries.length);
    const totalInsulin = entries.reduce((sum, e) => sum + e.insulinDose, 0);
    
    const inRange = entries.filter(e => e.sugarLevel >= 70 && e.sugarLevel <= 140).length;
    const score = Math.round((inRange / entries.length) * 100);
    
    return {
        score: `${score}/100`,
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
        const status = entry ? `${entry.sugarLevel} mg/dL • ${entry.insulinDose}u` : 'Not logged';
        
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

    container.innerHTML = entries.slice(0, 5).map(entry => `
        <div class="entry-card">
            <div class="entry-header">
                <span class="entry-time">${formatTime(entry.time)}</span>
                <span class="entry-meal">${getMealIcon(entry.mealType)} ${capitalize(entry.mealType)}</span>
            </div>
            <div class="entry-details">
                <div class="entry-detail">
                    <strong>Sugar:</strong> ${entry.sugarLevel} mg/dL ${getSugarEmoji(entry.sugarLevel)}
                </div>
                <div class="entry-detail">
                    <strong>Insulin:</strong> ${entry.insulinDose} units
                </div>
            </div>
            ${entry.notes ? `<div class="entry-notes">📝 ${entry.notes}</div>` : ''}
        </div>
    `).join('');
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
    
    historyList.innerHTML = entries.map(entry => `
        <div class="entry-card">
            <div class="entry-header">
                <span class="entry-time">${entry.date} ${formatTime(entry.time)}</span>
                <span class="entry-meal">${getMealIcon(entry.mealType)} ${capitalize(entry.mealType)}</span>
            </div>
            <div class="entry-details">
                <div class="entry-detail">
                    <strong>Sugar:</strong> ${entry.sugarLevel} mg/dL
                </div>
                <div class="entry-detail">
                    <strong>Insulin:</strong> ${entry.insulinDose} units
                </div>
            </div>
            ${entry.notes ? `<div class="entry-notes">📝 ${escapeHtml(entry.notes)}</div>` : ''}
        </div>
    `).join('');
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
        const avgSugar = entries.length > 0 
            ? Math.round(entries.reduce((sum, e) => sum + e.sugarLevel, 0) / entries.length)
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
            report += `🩸 Sugar: ${entry.sugarLevel} mg/dL\n`;
            report += `💉 Insulin: ${entry.insulinDose} units\n`;
            if (entry.notes) report += `📝 ${entry.notes}\n`;
            report += `\n`;
        });

        const avgSugar = Math.round(todayEntries.reduce((sum, e) => sum + e.sugarLevel, 0) / todayEntries.length);
        const totalInsulin = todayEntries.reduce((sum, e) => sum + e.insulinDose, 0).toFixed(1);
        
        report += `📈 *Summary*\n`;
        report += `Average Sugar: ${avgSugar} mg/dL\n`;
        report += `Total Insulin: ${totalInsulin} units\n`;
        report += `Entries: ${todayEntries.length}\n`;

        return encodeURIComponent(report);
    }

    sendToWhatsApp(number = this.settings.number) {
        // Validate number
        if (!number || number.trim() === '') {
            showToast('⚠️ Please enter a WhatsApp number in Settings', 'error');
            return false;
        }

        // Clean and validate number format
        const cleanNumber = number.replace(/[^0-9+]/g, '');
        
        if (!cleanNumber.startsWith('+')) {
            showToast('⚠️ Number must start with + and country code (e.g., +1234567890)', 'error');
            return false;
        }

        if (cleanNumber.length < 10) {
            showToast('⚠️ Invalid phone number format', 'error');
            return false;
        }

        try {
            const message = this.generateDailyReport();
            const finalNumber = cleanNumber.substring(1); // Remove + for WhatsApp API
            const url = `https://wa.me/${finalNumber}?text=${message}`;
            
            // Open WhatsApp
            window.open(url, '_blank');
            showToast('✅ Opening WhatsApp...', 'success');
            return true;
        } catch (error) {
            console.error('WhatsApp send error:', error);
            showToast('❌ Failed to open WhatsApp', 'error');
            return false;
        }
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
        
        window.open(url, '_blank');
        showToast('✅ Test message sent! Check WhatsApp', 'success');
    }

    checkScheduledSend() {
        if (!this.settings.enabled || !this.settings.number) return;

        setInterval(() => {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            if (currentTime === this.settings.time) {
                const lastSent = localStorage.getItem('lastWhatsAppSend');
                const today = new Date().toISOString().split('T')[0];
                
                if (lastSent !== today) {
                    this.sendToWhatsApp();
                    localStorage.setItem('lastWhatsAppSend', today);
                    showToast('📱 Daily report sent to WhatsApp!', 'success');
                }
            }
        }, 60000); // Check every minute
    }
}

// Reminder Manager (simplified)
class ReminderManager {
    constructor() {
        this.settings = this.loadSettings();
    }

    loadSettings() {
        const stored = localStorage.getItem('reminderSettings');
        return stored ? JSON.parse(stored) : {
            times: ['08:00', '14:00', '20:00'],
            enabled: false
        };
    }

    saveSettings(settings) {
        this.settings = settings;
        localStorage.setItem('reminderSettings', JSON.stringify(settings));
    }
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
            reminderManager.saveSettings({
                times: [
                    document.getElementById('reminder1').value,
                    document.getElementById('reminder2').value,
                    document.getElementById('reminder3').value
                ],
                enabled: document.getElementById('remindersEnabled').checked
            });
        });
    });

    // Reminders - Toggle
    document.getElementById('remindersEnabled').addEventListener('change', (e) => {
        reminderManager.saveSettings({
            times: [
                document.getElementById('reminder1').value,
                document.getElementById('reminder2').value,
                document.getElementById('reminder3').value
            ],
            enabled: e.target.checked
        });
        
        const badge = document.getElementById('reminderStatus');
        if (badge) {
            badge.textContent = e.target.checked ? 'Active' : 'Disabled';
            if (e.target.checked) {
                badge.classList.add('success');
            } else {
                badge.classList.remove('success');
            }
        }
        
        showToast(e.target.checked ? '✅ Reminders enabled! You will receive 3 alerts per day.' : '❌ Reminders disabled', 'success');
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

    // Export - JSON
    document.getElementById('exportJSON').addEventListener('click', () => {
        data.exportToJSON();
        showToast('📄 Data exported as JSON!', 'success');
    });

    // Export - CSV
    document.getElementById('exportCSV').addEventListener('click', () => {
        data.exportToCSV();
        showToast('📊 Data exported as CSV!', 'success');
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
