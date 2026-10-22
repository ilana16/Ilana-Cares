import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyBjnXUYVgF3_sX4EjtVFrgwyXUt4Q1EKb8",
  authDomain: "icnew-77651.firebaseapp.com",
  projectId: "icnew-77651",
  storageBucket: "icnew-77651.firebasestorage.app",
  messagingSenderId: "184224732465",
  appId: "1:184224732465:web:1d2618ced5316e26dd4c10",
  measurementId: "G-D873W1YVL0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser)
let analytics: import("firebase/analytics").Analytics | undefined;
if (typeof window !== 'undefined') {
  // Optional tracking must never prevent the website or Firebase sign-in loading.
  void import("firebase/analytics").then(async ({ isSupported, getAnalytics }) => {
    if (await isSupported()) analytics = getAnalytics(app);
  }).catch(() => { /* Tracking may be unavailable in private or restricted browsers. */ });
}

export { app, analytics };

