// lib/firebaseAdmin.js
import admin from "firebase-admin"

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
    console.log("[firebase-admin] Initialized successfully")
  } catch (error) {
    console.error("[firebase-admin] Initialization error:", error)
    throw new Error("Firebase Admin initialization failed")
  }
}

export async function verifyFirebaseIdToken(idToken) {
  if (!admin.apps.length) {
    throw new Error("Firebase Admin not initialized")
  }
  return await admin.auth().verifyIdToken(idToken)
}

export default admin