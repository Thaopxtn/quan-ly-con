import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

const config = {
  apiKey: "AIzaSyAkD0WZhm3uyLQ4Xlskuxndx0pGdz2jqHk",
  authDomain: "qlconcai.firebaseapp.com",
  projectId: "qlconcai",
  storageBucket: "qlconcai.firebasestorage.app",
  messagingSenderId: "594726838584",
  appId: "1:594726838584:android:7a124bb24cfd34c83221cd",
};

async function testFirebase() {
  console.log('Connecting to Firebase Firestore...');
  const app = initializeApp(config);
  const db = getFirestore(app);

  try {
    const snap = await getDoc(doc(db, 'pairings', '203359'));
    console.log('Document pairings/203359 exists:', snap.exists());
    if (snap.exists()) {
      console.log('Data:', snap.data());
    }

    console.log('\nChecking all documents in pairings collection...');
    const colSnap = await getDocs(collection(db, 'pairings'));
    console.log('Total docs in pairings:', colSnap.size);
    colSnap.forEach(d => {
      console.log(' - Doc ID:', d.id, d.data().childName, d.data().createdAt);
    });
  } catch (err) {
    console.error('Firebase query error:', err.message);
  }
  process.exit(0);
}

testFirebase();
