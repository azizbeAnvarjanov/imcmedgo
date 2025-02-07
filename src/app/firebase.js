import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBSmGwNQzybcrAK97nEAEWZA-2E-I93zvU",
  authDomain: "imcmed.firebaseapp.com",
  projectId: "imcmed",
  storageBucket: "imcmed.firebasestorage.app",
  messagingSenderId: "602997289405",
  appId: "1:602997289405:web:23fd9fcc586e66d39da2d4",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
