import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAb70DRiGBZyxFVKJV6r8bUkKNea1Sxi6E",
  authDomain: "gost-testapp.firebaseapp.com",
  projectId: "gost-testapp",
  storageBucket: "gost-testapp.firebasestorage.app",
  messagingSenderId: "833721732952",
  appId: "1:833721732952:web:731ceca3330a11e0575f2d",
  measurementId: "G-VBG7X9BNN2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };