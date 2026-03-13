import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, remove, onValue, off } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCyFdzaTM2hPbUypss-WXbCqOo-NA4Y_HY",
  authDomain: "shamshad-chappal-store.firebaseapp.com",
  databaseURL: "https://shamshad-chappal-store-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "shamshad-chappal-store",
  storageBucket: "shamshad-chappal-store.firebasestorage.app",
  messagingSenderId: "770696545277",
  appId: "1:770696545277:web:e7081b041978dccab1cf94"
};

const app = initializeApp(firebaseConfig);
export const firebaseDb = getDatabase(app);

// Helper to write a full table snapshot to Firebase
export async function syncTableToFirebase(tableName: string, data: any[]) {
  try {
    const tableRef = ref(firebaseDb, `tables/${tableName}`);
    const mapped: Record<string, any> = {};
    for (const row of data) {
      if (row.id) {
        mapped[row.id] = row;
      }
    }
    await set(tableRef, mapped);
    console.log(`[Firebase] Synced ${data.length} rows to ${tableName}`);
  } catch (err) {
    console.error(`[Firebase] Failed to sync ${tableName}:`, err);
  }
}

// Sync a single record
export async function syncRecordToFirebase(tableName: string, recordId: string, data: any) {
  try {
    const recordRef = ref(firebaseDb, `tables/${tableName}/${recordId}`);
    await set(recordRef, data);
  } catch (err) {
    console.error(`[Firebase] Failed to sync record ${tableName}/${recordId}:`, err);
  }
}

// Delete a single record from Firebase
export async function deleteRecordFromFirebase(tableName: string, recordId: string) {
  try {
    const recordRef = ref(firebaseDb, `tables/${tableName}/${recordId}`);
    await remove(recordRef);
  } catch (err) {
    console.error(`[Firebase] Failed to delete record ${tableName}/${recordId}:`, err);
  }
}

// Update sync metadata
export async function updateSyncMetadata(tableName: string) {
  try {
    const metaRef = ref(firebaseDb, `sync_metadata/${tableName}`);
    await set(metaRef, {
      lastSynced: new Date().toISOString(),
      source: "lovable_cloud",
    });
  } catch (err) {
    console.error(`[Firebase] Failed to update metadata for ${tableName}:`, err);
  }
}

export { ref, onValue, off };
