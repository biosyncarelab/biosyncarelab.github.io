import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAnalytics,
  isSupported as isAnalyticsSupported,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-analytics.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.useDeviceLanguage();

// Load analytics only on supported targets to avoid reference errors on Node-like UA.
isAnalyticsSupported()
  .then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  })
  .catch((err) => console.warn("Analytics unavailable", err));

const ui = {
  state: document.getElementById("auth-state"),
  email: document.getElementById("user-email"),
  userId: document.getElementById("user-id"),
  googleSignIn: document.getElementById("google-sign-in"),
  googleSignOut: document.getElementById("google-sign-out"),
  emailForm: document.getElementById("email-form"),
  emailInput: document.getElementById("email"),
  passwordInput: document.getElementById("password"),
  emailSignUp: document.getElementById("email-sign-up"),
  messages: document.getElementById("messages"),
};

const setMessage = (text, type = "") => {
  ui.messages.textContent = text;
  ui.messages.dataset.type = type;
};

let isBusy = false;

const refreshControls = () => {
  const user = auth.currentUser;
  const emailSubmit = ui.emailForm.querySelector("button[type='submit']");
  if (ui.googleSignIn) {
    ui.googleSignIn.disabled = isBusy || !!user;
  }
  if (ui.googleSignOut) {
    ui.googleSignOut.disabled = isBusy || !user;
  }
  if (emailSubmit) {
    emailSubmit.disabled = isBusy;
  }
  if (ui.emailSignUp) {
    ui.emailSignUp.disabled = isBusy;
  }
};

const setBusy = (nextBusy) => {
  isBusy = nextBusy;
  refreshControls();
};

const updateAuthState = (user) => {
  if (!user) {
    ui.state.textContent = "Signed out";
    ui.email.textContent = "";
    ui.userId.textContent = "";
    setMessage("");
    refreshControls();
    return;
  }

  ui.state.textContent = "Signed in";
  ui.email.textContent = user.email ? `Email: ${user.email}` : "";
  ui.userId.textContent = `UID: ${user.uid}`;
  refreshControls();
};

const handleError = (error) => {
  console.error(error);
  setMessage(error.message || "Something went wrong", "error");
};

onAuthStateChanged(auth, (user) => {
  updateAuthState(user);
  if (user) {
    setMessage(`Welcome back, ${user.email ?? "friend"}!`, "success");
  } else if (!isBusy) {
    setMessage("Signed out", "info");
  }
});

ui.googleSignIn.addEventListener("click", async () => {
  setBusy(true);
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    handleError(err);
  } finally {
    setBusy(false);
  }
});

ui.googleSignOut.addEventListener("click", async () => {
  setBusy(true);
  try {
    await signOut(auth);
    setMessage("Signed out", "info");
  } catch (err) {
    handleError(err);
  } finally {
    setBusy(false);
  }
});

ui.emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = ui.emailInput.value.trim();
  const password = ui.passwordInput.value.trim();
  if (!email || !password) {
    setMessage("Provide email and password", "error");
    return;
  }

  setBusy(true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    ui.emailForm.reset();
    setMessage("Signed in via email", "success");
  } catch (err) {
    handleError(err);
  } finally {
    setBusy(false);
  }
});

ui.emailSignUp.addEventListener("click", async () => {
  const email = ui.emailInput.value.trim();
  const password = ui.passwordInput.value.trim();
  if (!email || !password) {
    setMessage("Provide email and password to create an account", "error");
    return;
  }

  setBusy(true);
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    ui.emailForm.reset();
    setMessage("Account created. Check your inbox for verification if required.", "success");
  } catch (err) {
    handleError(err);
  } finally {
    setBusy(false);
  }
});

setMessage("Ready.", "info");
refreshControls();
