import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCba3x__PMG6XYf-j06ZZHOZnlhZGl4wIo",
    authDomain: "commercialq-36dad.firebaseapp.com",
    projectId: "commercialq-36dad",
    storageBucket: "commercialq-36dad.firebasestorage.app",
    messagingSenderId: "608063136049",
    appId: "1:608063136049:web:085df9289a154ef25ad010",
    measurementId: "G-PXWTDYZ0LD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { app, analytics, db };
