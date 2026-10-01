import { initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDDFD9h_H_u0vMtI52xZpCkmPfaCx4uues",
  authDomain: "flawskin.firebaseapp.com",
  projectId: "flawskin",
  storageBucket: "flawskin.firebasestorage.app",
  messagingSenderId: "285799857089",
  appId: "1:285799857089:web:12a55b32a4a1328ff30d40",
};

const app = initializeApp(firebaseConfig);

export const getFirebaseMessaging = async () => {
  const supported = await isSupported();

  if (!supported) {
    console.log("Firebase Messaging is not supported in this browser.");
    return null;
  }

  return getMessaging(app);
};

export default app;