importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyDDFD9h_H_u0vMtI52xZpCkmPfaCx4uues",
  authDomain: "flawskin.firebaseapp.com",
  projectId: "flawskin",
  storageBucket: "flawskin.firebasestorage.app",
  messagingSenderId: "285799857089",
  appId: "1:285799857089:web:12a55b32a4a1328ff30d40",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Background notification:", payload);

  const notificationTitle = payload.notification?.title || "New Order Received";

  const notificationOptions = {
    body: payload.notification?.body || "You have received a new order.",
    icon: "/logo192.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
