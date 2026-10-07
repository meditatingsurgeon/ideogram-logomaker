import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App;

export function getAdminApp() {
  if (!adminApp) {
    if (!getApps().length) {
      adminApp = initializeApp({
        // Uses default credentials automatically provided by the environment
      });
    } else {
      adminApp = getApp();
    }
  }
  return adminApp;
}

export const verifyAuthToken = async (idToken: string) => {
  const app = getAdminApp();
  try {
    const decodedToken = await getAuth(app).verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying auth token', error);
    throw new Error('Unauthorized');
  }
};
