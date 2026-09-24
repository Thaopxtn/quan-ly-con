import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';

const config = {
  apiKey: "AIzaSyAkD0WZhm3uyLQ4Xlskuxndx0pGdz2jqHk",
  authDomain: "qlconcai.firebaseapp.com",
  databaseURL: "https://qlconcai-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "qlconcai",
  storageBucket: "qlconcai.firebasestorage.app",
  messagingSenderId: "594726838584",
  appId: "1:594726838584:android:7a124bb24cfd34c83221cd",
};

async function testRtdb() {
  console.log('Connecting to Firebase RTDB...');
  const app = initializeApp(config);
  const rtdb = getDatabase(app);

  try {
    const snap = await get(ref(rtdb, 'pairings'));
    console.log('RTDB pairings exists:', snap.exists());
    if (snap.exists()) {
      console.log('Data:', Object.keys(snap.val()));
      console.log('203359 data:', snap.val()['203359']);
    }
  } catch (err) {
    console.error('RTDB error:', err.message);
  }
  process.exit(0);
}

testRtdb();
