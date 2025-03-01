import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// Default Firebase config - using environment variables when available
const firebaseConfig = {
  // In production, use environment variables
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "YOUR_APP_ID",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "YOUR_MEASUREMENT_ID"
};

// Check for stored config in localStorage (for development purposes)
let configToUse = firebaseConfig;
try {
  // Clear any useLocalDataOnly flag that might be interfering with Firebase
  if (localStorage.getItem('useLocalDataOnly') === 'true') {
    console.log('Resetting useLocalDataOnly flag to ensure Firebase connectivity');
    localStorage.setItem('useLocalDataOnly', 'false');
  }
  
  const storedConfig = localStorage.getItem('firebase_config');
  if (storedConfig) {
    const parsedConfig = JSON.parse(storedConfig);
    if (parsedConfig && parsedConfig.apiKey && parsedConfig.projectId) {
      configToUse = parsedConfig;
      console.log('Using Firebase config from localStorage:', parsedConfig.projectId);
    }
  } else {
    console.log('Using default Firebase config');
  }
} catch (e) {
  console.warn('Error reading Firebase config from localStorage:', e);
  // Reset the config if there was an error
  localStorage.removeItem('firebase_config');
}

// Initialize Firebase
const app = initializeApp(configToUse);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Connect to emulators in development environment if needed
// Uncomment these lines to use Firebase emulators for local development
// if (window.location.hostname === 'localhost') {
//   const { connectStorageEmulator } = require('firebase/storage');
//   connectStorageEmulator(storage, 'localhost', 9199);
//   console.log('Connected to Firebase Storage emulator');
// }

// Helper function to allow manually setting the config (for development)
export const setFirebaseConfig = (config) => {
  try {
    localStorage.setItem('firebase_config', JSON.stringify(config));
    alert('Firebase config saved. Please refresh the page to apply the new config.');
  } catch (e) {
    console.error('Failed to save Firebase config:', e);
    alert('Failed to save Firebase config: ' + e.message);
  }
};

export { db, storage, auth };