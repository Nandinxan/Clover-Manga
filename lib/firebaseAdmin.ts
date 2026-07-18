import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import serviceAccount from '../firebase-key.json';

const projectId = serviceAccount.project_id;

// Сэрвэр асах бүрд дахин дахин ачааллахаас сэргийлж шалгаж байна
const adminApp = getApps().length === 0 
  ? initializeApp({
      credential: cert(serviceAccount as any),
      storageBucket: `${projectId}.appspot.com`,
    })
  : getApps()[0];

// Гадагшаа ашиглах функцуудыг экспортолж байна
export const db = getFirestore(adminApp);
export const bucket = getStorage(adminApp).bucket();
export default adminApp;
