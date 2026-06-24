const firebaseConfig = {
  apiKey: "AIzaSyBbJBfcMn1fv7NuWnUpq7CD_eP75uOxtIU",
  authDomain: "studio-518888538-b7e26.firebaseapp.com",
  projectId: "studio-518888538-b7e26",
  databaseURL: "https://studio-518888538-b7e26-default-rtdb.europe-west1.firebasedatabase.app"
};

let db = null;
let auth = null;

try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
  auth = firebase.auth();
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  console.log("✅ Firebase koblet til");
} catch (error) {
  console.error("❌ Firebase-feil:", error);
}
