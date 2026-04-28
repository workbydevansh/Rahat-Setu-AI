import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

const requiredConfigEntries = Object.entries(firebaseConfig);

export const isFirebaseConfigured = requiredConfigEntries.every(
  ([, value]) => value.trim().length > 0,
);

let firebaseApp: FirebaseApp | null = null;

if (isFirebaseConfigured) {
  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseApp() {
  if (!firebaseApp) {
    throw new Error(
      "Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* variables to your environment and restart the dev server.",
    );
  }

  return firebaseApp;
}

export const firebasePlaceholder = {
  label: isFirebaseConfigured ? "Firebase env detected" : "Local demo database",
  modules: ["Auth", "Firestore", "Storage"],
  note: isFirebaseConfigured
    ? "Firebase configuration is loaded from environment variables."
    : "Firebase is not configured, so this app is saving demo records in the browser local database.",
};
