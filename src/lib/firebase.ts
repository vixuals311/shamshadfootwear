import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  collection,
  writeBatch,
  getDocs,
} from "firebase/firestore";

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
export const firebaseDb = getFirestore(app);

// Helper to write a full table snapshot to Firestore
export async function syncTableToFirebase(tableName: string, data: any[]) {
  try {
    const BATCH_SIZE = 500; // Firestore batch limit
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = writeBatch(firebaseDb);
      const chunk = data.slice(i, i + BATCH_SIZE);
      for (const row of chunk) {
        if (row.id) {
          const docRef = doc(firebaseDb, "tables", tableName, "records", row.id);
          batch.set(docRef, row);
        }
      }
      await batch.commit();
    }
    console.log(`[Firebase] Synced ${data.length} rows to ${tableName}`);
  } catch (err) {
    console.error(`[Firebase] Failed to sync ${tableName}:`, err);
  }
}

// Sync a single record
export async function syncRecordToFirebase(tableName: string, recordId: string, data: any) {
  try {
    const docRef = doc(firebaseDb, "tables", tableName, "records", recordId);
    await setDoc(docRef, data);
  } catch (err) {
    console.error(`[Firebase] Failed to sync record ${tableName}/${recordId}:`, err);
  }
}

// Delete a single record from Firestore
export async function deleteRecordFromFirebase(tableName: string, recordId: string) {
  try {
    const docRef = doc(firebaseDb, "tables", tableName, "records", recordId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`[Firebase] Failed to delete record ${tableName}/${recordId}:`, err);
  }
}

// Update sync metadata
export async function updateSyncMetadata(tableName: string) {
  try {
    const metaRef = doc(firebaseDb, "sync_metadata", tableName);
    await setDoc(metaRef, {
      lastSynced: new Date().toISOString(),
      source: "lovable_cloud",
    });
  } catch (err) {
    console.error(`[Firebase] Failed to update metadata for ${tableName}:`, err);
  }
}

// Read a full table snapshot from Firestore (used during Cloud outage failover)
export async function readTableFromFirebase(tableName: string): Promise<any[]> {
  const colRef = collection(firebaseDb, "tables", tableName, "records");
  const snap = await getDocs(colRef);
  const rows: any[] = [];
  snap.forEach((d) => rows.push(d.data()));
  return rows;
}
