import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { env } from './env.config';

let firebaseApp: App;

export function initializeFirebase(): App {
  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    return existingApps[0];
  }

  // Mode A: Service Account JSON file path
  if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccountPath = path.resolve(process.cwd(), env.FIREBASE_SERVICE_ACCOUNT_PATH);
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Firebase service account file not found at: ${serviceAccountPath}`);
    }
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || env.FIREBASE_PROJECT_ID,
    });
    return firebaseApp;
  }

  // Mode B: Direct environment variables
  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    firebaseApp = initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      projectId: env.FIREBASE_PROJECT_ID,
    });
    return firebaseApp;
  }

  // If no explicit credentials provided, fail clearly with a startup error
  throw new Error(
    'Firebase initialization failed: Valid Firebase credentials are required. ' +
    'Configure FIREBASE_SERVICE_ACCOUNT_PATH in .env (pointing to credentials/serviceAccountKey.json) ' +
    'or provide FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
  );
}

export function isFirebaseConfigured(): boolean {
  if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccountPath = path.resolve(process.cwd(), env.FIREBASE_SERVICE_ACCOUNT_PATH);
    if (fs.existsSync(serviceAccountPath)) {
      return true;
    }
  }
  if (
    env.FIREBASE_PROJECT_ID &&
    env.FIREBASE_PROJECT_ID.trim() !== '' &&
    env.FIREBASE_CLIENT_EMAIL &&
    env.FIREBASE_CLIENT_EMAIL.trim() !== '' &&
    env.FIREBASE_PRIVATE_KEY &&
    env.FIREBASE_PRIVATE_KEY.trim() !== ''
  ) {
    return true;
  }
  return false;
}

let _firestore: Firestore | null = null;

export const getFirestoreInstance = (): Firestore => {
  if (!_firestore) {
    initializeFirebase();
    _firestore = getFirestore();
    _firestore.settings({ ignoreUndefinedProperties: true });
  }
  return _firestore;
};

// Proxy export for clean import syntax: import { db } from '../config/firebase'
export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    const firestore = getFirestoreInstance();
    const value = (firestore as any)[prop];
    return typeof value === 'function' ? value.bind(firestore) : value;
  },
});

export { FieldValue, Firestore };
