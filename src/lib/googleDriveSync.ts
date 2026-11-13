// Google Drive Cloud Sync & Auth Gatekeeper Service
// Exclusively authorized for BRAC University student accounts (@g.bracu.ac.bd)

export interface CloudUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
  isVerifiedBRACU: boolean;
  hd?: string;
}

export interface DriveBackupPayload {
  version: number;
  updatedAt: string;
  userEmail: string;
  mode: 'tracker' | 'gpa';
  isOnboarded: boolean;
  semesters: any[];
  thesisTrack: 'thesis' | 'project' | 'internship';
  thesisSteps: any;
  projectCompleted: boolean;
  internshipCompleted: boolean;
  onboardingData: any;
  deviceInfo?: string;
  statsSummary?: {
    totalCredits: number;
    completedCredits: number;
    cgpa?: number | null;
  };
}

export interface DriveFileMetadata {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

export type SyncStatus = 'unauthenticated' | 'authenticating' | 'synced' | 'syncing' | 'error' | 'offline';

export const BRACU_STUDENT_DOMAIN = '@g.bracu.ac.bd';
export const DRIVE_BACKUP_FILENAME = 'flow136_cloud_backup.json';
export const DEFAULT_GSI_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '1070140048944-3m8kd1bckdcf84r3dovgbfcsdlqo3l26.apps.googleusercontent.com';

// LocalStorage persistence keys
export const STORAGE_KEYS = {
  USER: 'flow136_cloud_user',
  TOKEN: 'flow136_cloud_token',
  TOKEN_EXP: 'flow136_cloud_token_exp',
  FILE_ID: 'flow136_cloud_file_id',
  LAST_SYNC: 'flow136_last_cloud_sync',
  AUTO_SYNC: 'flow136_auto_sync_enabled',
  CUSTOM_CLIENT_ID: 'flow136_custom_client_id',
  DEMO_MODE: 'flow136_demo_cloud_mode',
  DEMO_DRIVE_STORE: 'flow136_demo_drive_store',
  IS_GUEST: 'flow136_is_guest',
};

/**
 * Validates whether an email belongs to a verified BRAC University student
 */
export function isAuthorizedBRACUStudent(email: string): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(BRACU_STUDENT_DOMAIN);
}

/**
 * Dynamically loads Google Identity Services client script
 */
export function loadGoogleGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();

    // Already loaded
    if ((window as any).google?.accounts?.oauth2) {
      return resolve();
    }

    // Check if script tag exists
    const existingScript = document.getElementById('google-gsi-client-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(new Error('Failed to load Google Identity Services library.'));
    document.head.appendChild(script);
  });
}

/**
 * Checks whether the stored Google OAuth token has expired or is nearing expiration
 */
export function isGoogleTokenExpired(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const exp = localStorage.getItem(STORAGE_KEYS.TOKEN_EXP);
    if (!exp) return false;
    // Expired if current timestamp is within 60 seconds of expiration
    return Date.now() > (parseInt(exp, 10) - 60000);
  } catch {
    return false;
  }
}

/**
 * Safe fetch wrapper that handles network interruptions, CORS errors, and 401 unauthenticated responses gracefully
 */
async function safeDriveFetch(url: string, options: RequestInit): Promise<Response> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const offlineErr = new Error("Device is offline. Cloud sync will automatically resume when reconnected.");
    (offlineErr as any).isOffline = true;
    throw offlineErr;
  }

  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err: any) {
    // When Google OAuth token expires or network fails, browsers reject fetch with TypeError: Failed to fetch
    const isTypeError =
      err instanceof TypeError ||
      err?.name === 'TypeError' ||
      String(err?.message || '').toLowerCase().includes('fetch');

    if (isTypeError) {
      const wrappedErr = new Error("Unable to connect to Google Drive. Your session may have expired or network access is restricted.");
      (wrappedErr as any).isAuthError = true;
      (wrappedErr as any).isNetworkError = true;
      throw wrappedErr;
    }
    throw err;
  }

  if (res.status === 401) {
    const authErr = new Error("Google Drive authorization expired. Please sign in again.");
    (authErr as any).isAuthError = true;
    throw authErr;
  }

  return res;
}

/**
 * Requests an OAuth2 access token with Google Drive AppData and UserInfo scopes
 * Strictly restricted to BRAC University G Suite domain (g.bracu.ac.bd)
 */
export async function requestGoogleAccessToken(clientId: string): Promise<string> {
  await loadGoogleGsiScript();

  if (!(window as any).google?.accounts?.oauth2) {
    throw new Error('Google Identity Services client is not initialized.');
  }

  return new Promise((resolve, reject) => {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid',
        hd: 'g.bracu.ac.bd',
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error || 'Google Sign-In was cancelled or denied.'));
            return;
          }
          if (!response.access_token) {
            reject(new Error('No access token returned from Google.'));
            return;
          }
          const expiresInSec = parseInt(response.expires_in, 10) || 3600;
          try {
            localStorage.setItem(STORAGE_KEYS.TOKEN_EXP, String(Date.now() + expiresInSec * 1000));
          } catch {}
          resolve(response.access_token);
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || 'Google Auth Error occurred.'));
        }
      });

      // Pass hd parameter to enforce Google domain restriction
      client.requestAccessToken({ prompt: 'consent', hd: 'g.bracu.ac.bd' });
    } catch (err: any) {
      reject(err);
    }
  });
}

/**
 * Fetches user profile from Google UserInfo endpoint and enforces the Gatekeeper
 */
export async function fetchGoogleUserProfile(accessToken: string): Promise<CloudUser> {
  const res = await safeDriveFetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to retrieve profile from Google (Status ${res.status}).`);
  }

  const data = await res.json();
  const email = (data.email || '').toLowerCase().trim();

  // 🛡️ AUTH GATEKEEPER CHECK: Strictly check @g.bracu.ac.bd
  const isBRACU = isAuthorizedBRACUStudent(email);
  if (!isBRACU) {
    // Revoke token immediately so no unauthorized access remains
    revokeGoogleToken(accessToken).catch(() => {});
    const err = new Error(
      `Access Denied: Account "${email}" is not authorized. Flow136 Cloud Sync is exclusively available for official BRAC University student accounts (${BRACU_STUDENT_DOMAIN}).`
    );
    (err as any).isGatekeeperError = true;
    (err as any).attemptedEmail = email;
    throw err;
  }

  return {
    id: data.sub,
    name: data.name || email.split('@')[0],
    email: email,
    picture: data.picture,
    isVerifiedBRACU: true,
    hd: data.hd,
  };
}

/**
 * Revokes Google access token
 */
export async function revokeGoogleToken(accessToken: string): Promise<void> {
  if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) return;
  return new Promise((resolve) => {
    try {
      (window as any).google.accounts.oauth2.revoke(accessToken, () => resolve());
    } catch {
      resolve();
    }
  });
}

/**
 * Finds existing Flow136 backup file inside user's private Google Drive appDataFolder
 */
export async function findDriveBackupFile(accessToken: string): Promise<DriveFileMetadata | null> {
  const query = encodeURIComponent(`name = '${DRIVE_BACKUP_FILENAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name,modifiedTime,size)&q=${query}`;

  const res = await safeDriveFetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to query Google Drive (Status ${res.status}).`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }
  return null;
}

/**
 * Uploads (creates or updates) Flow136 backup file in user's Google Drive appDataFolder
 */
export async function saveDriveBackup(
  accessToken: string,
  payload: DriveBackupPayload,
  existingFileId?: string
): Promise<{ fileId: string; modifiedTime: string }> {
  const jsonContent = JSON.stringify(payload, null, 2);

  if (existingFileId) {
    // Update existing file content via PATCH
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
    const res = await safeDriveFetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: jsonContent,
    });

    if (!res.ok) {
      // If file was deleted remotely or 404, fall through to re-create
      if (res.status !== 404) {
        throw new Error(`Failed to update cloud backup on Google Drive (Status ${res.status}).`);
      }
    } else {
      const data = await res.json();
      return {
        fileId: existingFileId,
        modifiedTime: data.modifiedTime || new Date().toISOString(),
      };
    }
  }

  // Create new file inside appDataFolder using multipart upload
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: DRIVE_BACKUP_FILENAME,
    parents: ['appDataFolder'],
    mimeType: 'application/json',
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    jsonContent +
    closeDelimiter;

  const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const res = await safeDriveFetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    throw new Error(`Failed to create backup on Google Drive (Status ${res.status}).`);
  }

  const data = await res.json();
  return {
    fileId: data.id,
    modifiedTime: data.modifiedTime || new Date().toISOString(),
  };
}

/**
 * Downloads Flow136 backup file content from Google Drive appDataFolder
 */
export async function loadDriveBackup(accessToken: string, fileId: string): Promise<DriveBackupPayload> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await safeDriveFetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download backup from Google Drive (Status ${res.status}).`);
  }

  const data = await res.json();
  return data;
}

// -------------------------------------------------------------------------------------------------
// DEMO / SIMULATION MODE SUPPORT
// Allows developer and user testing out-of-the-box without GCP Client ID configured
// -------------------------------------------------------------------------------------------------

export function simulateStudentLogin(email: string, name = 'BRACU CSE Student'): CloudUser {
  const isBRACU = isAuthorizedBRACUStudent(email);
  if (!isBRACU) {
    const err = new Error(
      `Access Denied: Account "${email}" is not authorized. Flow136 Cloud Sync is exclusively available for official BRAC University student accounts (${BRACU_STUDENT_DOMAIN}).`
    );
    (err as any).isGatekeeperError = true;
    (err as any).attemptedEmail = email;
    throw err;
  }

  return {
    id: 'demo-student-sub-136',
    name: name,
    email: email.trim().toLowerCase(),
    picture: undefined,
    isVerifiedBRACU: true,
    hd: 'g.bracu.ac.bd',
  };
}

export function saveDemoDriveBackup(payload: DriveBackupPayload): { fileId: string; modifiedTime: string } {
  const modifiedTime = new Date().toISOString();
  const record = {
    fileId: 'demo-drive-file-136',
    modifiedTime,
    payload,
  };
  localStorage.setItem(STORAGE_KEYS.DEMO_DRIVE_STORE, JSON.stringify(record));
  return {
    fileId: 'demo-drive-file-136',
    modifiedTime,
  };
}

export function loadDemoDriveBackup(): DriveBackupPayload | null {
  const raw = localStorage.getItem(STORAGE_KEYS.DEMO_DRIVE_STORE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed.payload || parsed;
  } catch {
    return null;
  }
}

/**
 * Formats ISO timestamp into friendly readable string
 */
export function formatSyncTimestamp(isoStr: string | null | undefined): string {
  if (!isoStr) return 'Never';
  try {
    const date = new Date(isoStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 15) return 'Just now';
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

    const isToday = date.toDateString() === now.toDateString();
    const timeFormatted = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) {
      return `Today at ${timeFormatted}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${timeFormatted}`;
    }

    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeFormatted}`;
  } catch {
    return 'Recently';
  }
}
