// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-analytics.js";
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    remove,
    push,
    child
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAa8elmr1nAzE-LM2tFDeuptj4Hb5Nvrvw",
    authDomain: "tracker-ed037.firebaseapp.com",
    projectId: "tracker-ed037",
    storageBucket: "tracker-ed037.firebasestorage.app",
    messagingSenderId: "910193491769",
    appId: "1:910193491769:web:9dd9ea87e0707d1920f2e8",
    measurementId: "G-G0XFTS2L4N",
    databaseURL: "https://tracking-47d2e-default-rtdb.europe-west1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

// Firebase Manager Class (Realtime Database)
class FirebaseManager {
    constructor() {
        this.isEnabled = true;
        this.dbPath = 'sugar_entries';
    }

    // Sync all entries to Firebase Realtime Database
    async syncEntries(entries) {
        try {
            const entriesRef = ref(db, this.dbPath);
            
            // Convert array to object with IDs as keys
            const entriesObj = {};
            entries.forEach(entry => {
                entriesObj[entry.id] = {
                    date: entry.date,
                    time: entry.time,
                    mealType: entry.mealType,
                    sugarLevel: entry.sugarLevel,
                    insulinDose: entry.insulinDose,
                    notes: entry.notes || '',
                    createdAt: entry.id
                };
            });

            await set(entriesRef, entriesObj);
            return entries.length;
        } catch (error) {
            console.error('Sync error:', error);
            throw new Error('Failed to sync data to Firebase');
        }
    }

    // Fetch all entries from Firebase Realtime Database
    async fetchEntries() {
        try {
            const entriesRef = ref(db, this.dbPath);
            const snapshot = await get(entriesRef);

            if (!snapshot.exists()) {
                return [];
            }

            const data = snapshot.val();
            const entries = [];

            Object.keys(data).forEach(key => {
                const entry = data[key];
                entries.push({
                    id: parseInt(key),
                    date: entry.date,
                    time: entry.time,
                    mealType: entry.mealType,
                    sugarLevel: entry.sugarLevel,
                    insulinDose: entry.insulinDose,
                    notes: entry.notes || ''
                });
            });

            // Sort by ID (timestamp) descending
            entries.sort((a, b) => b.id - a.id);

            return entries;
        } catch (error) {
            console.error('Fetch error:', error);
            throw new Error('Failed to fetch data from Firebase');
        }
    }

    // Delete a single entry
    async deleteEntry(entryId) {
        try {
            const entryRef = ref(db, `${this.dbPath}/${entryId}`);
            await remove(entryRef);
        } catch (error) {
            console.error('Delete error:', error);
            throw new Error('Failed to delete entry');
        }
    }

    // Delete all entries
    async deleteAllEntries() {
        try {
            const entriesRef = ref(db, this.dbPath);
            await remove(entriesRef);
        } catch (error) {
            console.error('Delete all error:', error);
            throw new Error('Failed to delete all entries');
        }
    }
}

// Export Firebase manager instance
window.firebaseManager = new FirebaseManager();
window.isFirebaseEnabled = true;

