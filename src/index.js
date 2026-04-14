
import './styles.css';
import { 
  hideLoginError, 
  showLoginState, 
  showLoginForm, 
  showApp, 
  showLoginError, 
  btnLogin,
  btnSignup,
  btnLogout
} from './ui'

import { initializeApp } from 'firebase/app';
import { 
  getAuth,
  onAuthStateChanged, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  connectAuthEmulator
} from 'firebase/auth';

const firebaseApp = initializeApp({
  apiKey: "AIzaSyBVffCqpnNB9qfHwwLGiGHRkrYPrrrM5HM",
  authDomain: "testing-c7619.firebaseapp.com",
  projectId: "testing-c7619",
  storageBucket: "testing-c7619.firebasestorage.app",
  messagingSenderId: "77860129116",
  appId: "1:77860129116:web:feab13b7c2ca8597571999",
  measurementId: "G-5VZD5D4PJS"
});

// Login using email/password
const loginEmailPassword = async () => {
  const loginEmail = txtEmail.value
  const loginPassword = txtPassword.value

  // step 1: try doing this w/o error handling, and then add try/catch

  
   try {
    const userCredintial = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    console.log(userCredintial.user);
  }
  catch(error) {
   console.log(`There was an error: ${error}`)
   showLoginError(error)
   }
}


// Create new account using email/password
const createAccount = async () => {
  const email = txtEmail.value
  const password = txtPassword.value

  try {
    await createUserWithEmailAndPassword(auth, email, password)
  }
  catch(error) {
    console.log(`There was an error: ${error}`)
    showLoginError(error)
  } 
}

// Monitor auth state
const monitorAuthState = async () => {
  onAuthStateChanged(auth, user => {
    if (user) {
      console.log(user)
      showApp()
      showLoginState(user)

      hideLoginError()
      hideLinkError()
    }
    else {
      showLoginForm()
      lblAuthState.innerHTML = `You're not logged in.`
    }
  })
}

// Log out
const logout = async () => {
  await signOut(auth);
}

btnLogin.addEventListener("click", loginEmailPassword) 
btnSignup.addEventListener("click", createAccount)
btnLogout.addEventListener("click", logout)

const auth = getAuth(firebaseApp);
connectAuthEmulator(auth, "http://localhost:9099");

monitorAuthState();