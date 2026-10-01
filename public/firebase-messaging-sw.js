importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"
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


// ======================================================
// NOTIFICATION CLICK
// ======================================================

self.addEventListener("notificationclick", function (event) {

  event.notification.close();

  const url = "https://admin-pannel-8yoq-orcin.vercel.app/";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then(function (clientList) {

      // If admin page is already open, focus it
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      // Otherwise open admin page
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );

});