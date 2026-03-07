// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js"; // ADICIONADO

const firebaseConfig = {
  apiKey: "AIzaSyD8osNiKf8Lrlmt2iw0uhSRjdq_wJ3Z3TQ",
  authDomain: "veu-arcano.firebaseapp.com",
  projectId: "veu-arcano",
  storageBucket: "veu-arcano.firebasestorage.app",
  messagingSenderId: "367852610473",
  appId: "1:367852610473:web:12cecb35686c5878701ab8"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // ADICIONADO