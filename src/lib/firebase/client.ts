import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCwZN-HWtOKtR1R7znRi0f2ZPHSaDOwHaw",
  authDomain: "adivo-comic.firebaseapp.com",
  databaseURL: "https://adivo-comic-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "adivo-comic",
  storageBucket: "adivo-comic.firebasestorage.app",
  messagingSenderId: "161775480208",
  appId: "1:161775480208:web:67e1718ce55d0190405715",
  measurementId: "G-5WL94T7JME"
};

let analyticsPromise: Promise<Analytics | null> | null = null;

export function getFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDatabase(): Database {
  return getDatabase(getFirebaseApp());
}

export function initFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(getFirebaseApp()) : null))
      .catch(() => null);
  }
  return analyticsPromise;
}
