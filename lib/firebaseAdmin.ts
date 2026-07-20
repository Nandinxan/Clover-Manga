import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import serviceAccount from '../firebase-key.json';

// 🚀 ЗАСВАР: Төслийн зөв storage bucket нэрийг шууд зааж өглөө
const bucketName = "clover-manga.firebasestorage.app";

// Сэрвэр асах бүрд дахин дахин ачааллахаас сэргийлж шалгах илүү найдвартай логик
const adminApp = getApps().length === 0 
  ? initializeApp({
      credential: cert(serviceAccount as any),
      storageBucket: bucketName,
    })
  : getApp();

// Гадагшаа ашиглах функцуудыг экспортолж байна
export const db = getFirestore(adminApp);
export const bucket = getStorage(adminApp).bucket();
export default adminApp;
