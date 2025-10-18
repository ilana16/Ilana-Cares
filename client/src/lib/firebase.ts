import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

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
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, analytics };

