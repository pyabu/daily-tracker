# 🩸 Smart Sugar & Insulin Tracker

A responsive, reliable web app for tracking blood sugar levels, insulin doses, and meals with smart insights and pattern detection.

## ✨ Features

### Core Tracking
- **5 Meal Categories**: Morning, Afternoon, Evening, Dinner, Snack
- **Blood Sugar Monitoring**: Track levels with instant feedback
- **Insulin Logging**: Record doses in units
- **Meal Notes**: Document what you ate and symptoms

### NEW! 📱 WhatsApp Auto-Send
- **Daily Reports**: Automatically send Excel-format reports to WhatsApp
- **Scheduled Delivery**: Set your preferred time (default: 9 PM)
- **Manual Send**: Send report anytime with one click
- **Formatted Messages**: Professional daily summary with emojis

### NEW! ⏰ Smart Reminders
- **3 Daily Alerts**: Morning, Afternoon, Evening reminders
- **Customizable Times**: Set your own reminder schedule
- **Browser Notifications**: Desktop and mobile alerts
- **Never Miss a Reading**: Stay on track with automatic reminders

### NEW! 👨‍⚕️ Emergency Contact
- **Quick Access**: Save doctor or family member contact
- **One-Tap Call**: Emergency call button in settings
- **Always Available**: Access contact info anytime

### Cloud Sync (🔥 Firebase)
- **Firebase Integration**: Cloud storage and sync
- **Multi-Device Access**: Access your data from any device
- **Secure Authentication**: Email/password login
- **Automatic Backup**: Your data is safe in the cloud
- **Offline First**: Works without internet, sync when ready

### Smart Features
- **Daily Score**: 0-100 rating based on sugar stability
- **Real-time Alerts**: Warnings for low (<70) and high (>250) sugar
- **Visual Timeline**: See your day at a glance
- **Quick Stats**: Average sugar, total entries, insulin usage

### Insights & Analytics
- **7-Day Chart**: Visualize sugar trends over time
- **Pattern Detection**: Identifies high/low sugar patterns
- **Meal Analysis**: Discovers which meals spike your sugar
- **Smart Suggestions**: Personalized recommendations

### Safety Features
- **Instant Alerts**: Immediate warnings for dangerous levels
- **Color-coded Indicators**: Visual feedback on sugar ranges
- **Historical Tracking**: All data stored locally

## 🚀 How to Use

1. **Open the App**: Simply open `index.html` in any modern browser
2. **Add Entry**: Click "+ Add Entry" button
3. **Fill Details**:
   - Time (auto-filled with current time)
   - Meal type
   - Blood sugar level
   - Insulin dose
   - Food/notes
4. **View Insights**: Switch between Today, History, and Insights tabs

## 📊 Sugar Level Ranges

- **Low**: < 70 mg/dL ⚠️ (Risk of hypoglycemia)
- **Normal**: 70-140 mg/dL ✅ (Target range)
- **Elevated**: 141-200 mg/dL ⚠️ (Monitor closely)
- **High**: > 200 mg/dL 🚨 (Consult doctor)

## 💾 Data Storage

### Local Storage (Default)
- All data is stored locally in your browser (localStorage)
- No internet connection required
- Your data never leaves your device
- Private and secure

### Cloud Storage (Optional - Firebase)
- Already configured with your Firebase project
- Sync data across multiple devices
- Automatic cloud backup
- Access from anywhere
- See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for setup instructions

## 📱 Responsive Design

- Works on desktop, tablet, and mobile
- Touch-friendly interface
- Optimized for all screen sizes

## 🔧 Technical Details

- **Pure HTML/CSS/JavaScript** - No frameworks needed
- **Chart.js** - For beautiful graphs
- **LocalStorage API** - For data persistence
- **No backend required** - Runs entirely in browser

## 🎯 Daily Score Calculation

Your daily score is calculated based on:
- Percentage of readings in normal range (70-140 mg/dL)
- Example: 7 out of 10 readings in range = 70/100 score

## 📈 Future Enhancements

Potential additions:
- Export data to PDF/CSV
- Medication reminders
- Food database integration
- Share reports with doctor
- Multi-user support
- Cloud sync option

## ⚠️ Medical Disclaimer

This app is for tracking purposes only. Always consult your healthcare provider for medical advice. Do not use this app as a substitute for professional medical care.

## 🛠️ Installation

No installation needed! Just:
1. Download all files (index.html, app.js, styles.css)
2. Keep them in the same folder
3. Double-click index.html to open

## 🌐 Browser Compatibility

Works on:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

Requires: Modern browser with JavaScript enabled

---

**Made with ❤️ for better diabetes management**
# daily-tracker
