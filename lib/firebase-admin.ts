import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

let _adminApp: App | null = null;

function getAdminApp(): App {
  if (!_adminApp) {
    _adminApp =
      getApps().length === 0
        ? initializeApp({
            credential: cert({
              projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
                /\\n/g,
                "\n"
              ),
            }),
          })
        : getApps()[0];
  }
  return _adminApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

/**
 * Verify a Firebase ID token from the Authorization header.
 * Returns the decoded uid, or null if invalid/missing.
 */
export async function verifyAuthHeader(
  authHeader: string | null
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}
