import admin from "firebase-admin";

let app: admin.app.App;

// Initialize only once (for hot reloads / serverless)
if (!admin.apps.length) {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
} else {
  app = admin.app();
}

/**
 * Provides initialized Firebase Admin SDK components.
 * Ensures single instance in serverless environments.
 */
export async function getAdmin() {
  const db = admin.firestore();
  const auth = admin.auth();
  const bucket = admin.storage().bucket();
  const FieldValue = admin.firestore.FieldValue;

  // ✅ Added `admin` for API routes that need admin.firestore.FieldValue
  return { db, auth, FieldValue, bucket, admin };
}
