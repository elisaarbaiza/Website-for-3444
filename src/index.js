import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const firebaseApp = initializeApp({
  apiKey: "AIzaSyBVffCqpnNB9qfHwwLGiGHRkrYPrrrM5HM",
  authDomain: "testing-c7619.firebaseapp.com",
  projectId: "testing-c7619",
  storageBucket: "testing-c7619.firebasestorage.app",
  messagingSenderId: "77860129116",
  appId: "1:77860129116:web:feab13b7c2ca8597571999",
  measurementId: "G-5VZD5D4PJS"
});

const auth = getAuth(firebaseApp);

onAuthStateChanged(auth, (user) => {
  if (user != null) {
    console.log("User is logged in");
  } else {
    console.log("User is logged out");
  }
});