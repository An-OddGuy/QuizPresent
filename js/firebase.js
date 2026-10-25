import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, update, get, remove, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./config.js";
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
// Professor page needs a real (email/password) login; student page uses anonymous auth.
const PROF = document.documentElement.dataset.role === "professor";
export const ready = new Promise(res => onAuthStateChanged(auth, u => { if (u && (PROF ? !u.isAnonymous : u.isAnonymous)) res(u); }));
if (!PROF) signInAnonymously(auth).catch(e => {
  console.error(e);
  alert("Firebase sign-in failed: " + e.code + "\n" + e.message);
});
// "username" is mapped to a fake email so Firebase's email/password auth can be used.
export const loginProfessor = (user, pw) => signInWithEmailAndPassword(auth, `${user.trim().toLowerCase()}@quizpresent.app`, pw);
export const logout = async () => { await signOut(auth); location.reload(); };
export { ref, set, update, get, remove, onValue };
