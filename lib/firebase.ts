import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCnDa2nOWwzn72oWMfQhH7ZWwy7jODsfRI",
  authDomain: "clover-manga.firebaseapp.com",
  projectId: "clover-manga",
  storageBucket: "clover-manga.firebasestorage.app",
  messagingSenderId: "161497943167",
  appId: "1:161497943167:web:dd10c5a968c4d7422c834a",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);