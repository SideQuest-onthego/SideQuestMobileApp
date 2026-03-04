// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "sidequestmobile-5a01a.firebaseapp.com",
  projectId: "sidequestmobile-5a01a",
  storageBucket: "sidequestmobile-5a01a.firebasestorage.app",
  messagingSenderId: "85484466442",
  appId: "1:85484466442:web:b2129959aa9d9f304bcaf3",
  measurementId: "G-CKCTX79DVL"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app)