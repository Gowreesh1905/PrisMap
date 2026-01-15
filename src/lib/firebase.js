// src/lib/firebase.js
import { GoogleAuthProvider } from "firebase/auth";

// We export empty/dummy objects so your components don't break when they import them
export const auth = {
  currentUser: {
    displayName: "Guest Designer",
    email: "guest@prismap.com",
    photoURL: "https://ui-avatars.com/api/?name=Guest+Designer"
  },
  onAuthStateChanged: (callback) => {
    // Pretend the user is always logged in
    callback({ displayName: "Guest Designer", uid: "local-dev-id" });
    return () => { }; // Mock unsubscribe
  },
  signOut: () => Promise.resolve(),
};

export const googleProvider = new GoogleAuthProvider();

export const db = {
  collection: () => ({
    doc: () => ({
      set: () => Promise.resolve(),
      get: () => Promise.resolve({ exists: false }),
      onSnapshot: (callback) => {
        callback({ data: () => ({}) });
        return () => { };
      }
    }),
  }),
};

const app = {};
export default app;