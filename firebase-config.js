import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCBLW3s3RrS05kEYtxF3_KaVKLTHfxfvIY",
  authDomain: "conta-calorias.firebaseapp.com",
  projectId: "conta-calorias",
  storageBucket: "conta-calorias.firebasestorage.app",
  messagingSenderId: "558202209625",
  appId: "1:558202209625:web:e4ac19fabb2787275c3848",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.firebaseAuth = {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
};

window.firebaseDb = { db, doc, getDoc, setDoc };
