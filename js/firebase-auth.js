import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBVffCqpnNB9qfHwwLGiGHRkrYPrrrM5HM",
  authDomain: "testing-c7619.firebaseapp.com",
  projectId: "testing-c7619",
  appId: "1:77860129116:web:feab13b7c2ca8597571999"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export {
  auth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut
};
