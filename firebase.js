// Firebase config for prosjektet ditt
const firebaseConfig = {
  apiKey: "AIzaSyBbJBfcMn1fv7NuWnUpq7CD_eP75uOxtIU",
  authDomain: "studio-518888538-b7e26.firebaseapp.com",
  projectId: "studio-518888538-b7e26",
  storageBucket: "studio-518888538-b7e26.firebasestorage.app",
  messagingSenderId: "1057085342589",
  appId: "1:1057085342589:web:69b73ed524c346d4e30214",
  databaseURL: "https://studio-518888538-b7e26-default-rtdb.europe-west1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
const auth = firebase.auth();
const db = firebase.database();
