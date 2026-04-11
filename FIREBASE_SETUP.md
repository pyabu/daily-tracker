# 🔥 Firebase Setup Guide

Your Firebase is already configured and ready to use! Here's what you need to know.

## ✅ Already Configured

Your app is connected to:
- **Project**: diabetes-5d454
- **Auth Domain**: diabetes-5d454.firebaseapp.com
- **Database**: Cloud Firestore

## 🚀 Quick Start

### 1. Enable Authentication
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **diabetes-5d454**
3. Click **Authentication** in the left menu
4. Click **Get Started**
5. Click **Email/Password** provider
6. Toggle **Enable** to ON
7. Click **Save**

### 2. Enable Firestore Database
1. In Firebase Console, click **Firestore Database**
2. Click **Create Database**
3. Choose **Start in production mode** (we'll add rules next)
4. Select your preferred location (closest to you)
5. Click **Enable**

### 3. Set Firestore Security Rules
1. In Firestore Database, click **Rules** tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **Publish**

## 🎯 How to Use

### Sign Up (First Time)
1. Open your app at http://localhost:8000
2. No login required - start tracking immediately!

### New Features

#### 📱 WhatsApp Auto-Send
1. Go to **Settings** tab
2. Enter your WhatsApp number (with country code, e.g., +1234567890)
3. Set the time you want daily reports sent (default: 9 PM)
4. Toggle **Enable Auto-Send** ON
5. Click **Send Now to WhatsApp** to test
6. Daily reports will be sent automatically in Excel-like format

#### ⏰ Daily Reminders (3 times per day)
1. Go to **Settings** tab
2. Set your 3 reminder times:
   - Morning (default: 8:00 AM)
   - Afternoon (default: 2:00 PM)
   - Evening (default: 8:00 PM)
3. Toggle **Enable Reminders** ON
4. Allow notifications when prompted
5. You'll get alerts 3 times daily to track your sugar

#### 👨‍⚕️ Emergency Contact
1. Go to **Settings** tab
2. Enter contact name (doctor/family member)
3. Enter contact phone number
4. Click **Save Contact**
5. Use **Call Emergency Contact** button in emergencies

### Sync Your Data
1. After signing in, go to **Settings** tab
2. Click **Sync Now** to upload all local data to Firebase
3. Your data is now in the cloud! ☁️

### Access from Another Device
1. Open the app on another device
2. Sign in with the same email/password
3. Click **Download from Cloud**
4. All your data appears! 🎉

## 📊 Data Structure

Your data is stored in Firestore like this:

```
users/
  └── {userId}/
      └── entries/
          ├── {entryId1}
          │   ├── date: "2024-04-10"
          │   ├── time: "08:30"
          │   ├── mealType: "morning"
          │   ├── sugarLevel: 120
          │   ├── insulinDose: 5
          │   ├── notes: "Breakfast"
          │   └── createdAt: timestamp
          ├── {entryId2}
          └── ...
```

## 🔒 Security Features

✅ **Email/Password Authentication** - Secure login
✅ **User Isolation** - Each user only sees their own data
✅ **Firestore Rules** - Server-side security
✅ **HTTPS Only** - All data encrypted in transit
✅ **No Data Sharing** - Your data is private

## 💾 Sync Workflow

### Upload to Cloud:
1. Add entries in your app
2. Click **Sync Now** in Settings
3. All local entries uploaded to Firebase

### Download from Cloud:
1. Sign in on any device
2. Click **Download from Cloud**
3. All cloud entries downloaded
4. Merges with local data (no duplicates)

### Multi-Device Sync:
- **Device A**: Add entries → Sync Now
- **Device B**: Sign in → Download from Cloud
- **Device B**: Add more entries → Sync Now
- **Device A**: Download from Cloud → See new entries!

## 📱 Features

✅ **Automatic Auth State** - Stays signed in
✅ **Offline Support** - Works without internet
✅ **Manual Sync** - You control when to sync
✅ **Merge Logic** - No duplicate entries
✅ **Local Backup** - Data always in localStorage
✅ **Cloud Backup** - Data safe in Firebase

## 🆓 Firebase Free Tier

Your free tier includes:
- ✅ 50,000 reads/day
- ✅ 20,000 writes/day
- ✅ 20,000 deletes/day
- ✅ 1 GB storage
- ✅ 10 GB/month bandwidth
- ✅ Unlimited users

**Perfect for personal use!**

## 🔧 Troubleshooting

### "Permission denied" error
- Make sure you've set up Firestore security rules
- Verify you're signed in
- Check that rules allow access to `/users/{userId}`

### "Auth not enabled"
- Go to Firebase Console → Authentication
- Enable Email/Password provider

### Data not syncing
- Check internet connection
- Verify you're signed in (see email in header)
- Check browser console for errors (F12)

### Can't sign in
- Verify email/password are correct
- Make sure Authentication is enabled in Firebase
- Try signing up with a new account

## 📊 View Your Data in Firebase

1. Go to Firebase Console
2. Click **Firestore Database**
3. Browse to: `users → {your-user-id} → entries`
4. See all your entries!

## 🔄 Export from Firebase

### Method 1: Use App Export
1. Sign in to your app
2. Click **Download from Cloud**
3. Go to Settings → Export as JSON/CSV

### Method 2: Firebase Console
1. Go to Firestore Database
2. Click on your entries collection
3. Use Firebase CLI to export:
```bash
firebase firestore:export gs://your-bucket/backup
```

## 💡 Tips

- **Sync regularly** - Click "Sync Now" after adding entries
- **Download first** - On new device, download before adding entries
- **Keep local backup** - Export to JSON/CSV monthly
- **Strong password** - Protect your health data
- **Sign out on shared devices** - Keep data private

## 🎉 You're All Set!

Your Firebase integration is complete and ready to use. Just:
1. Enable Authentication (Email/Password)
2. Create Firestore Database
3. Set security rules
4. Sign up and start syncing!

---

**Need help?** Check the [Firebase Documentation](https://firebase.google.com/docs)
