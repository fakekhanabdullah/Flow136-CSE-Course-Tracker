# Privacy Policy for Flow136

**Effective Date:** November 9, 2026  
**Application Name:** Flow136 (BRACU CSE Course Tracker & Planner)  
**Production URL:** https://flow136-cse-course-tracker.vercel.app  
**Application / Entity Name:** Flow136 (Student Open-Source Project)  
**Lead Developer:** Khan Abdullah (Undergraduate Student, Department of CSE, BRAC University)  
**Contact Email:** flow136.tracker@gmail.com  
**Source Repository:** https://github.com/fakekhanabdullah/Flow136-CSE-Course-Tracker  

---

## 1. Introduction
Flow136 is an open-source, student-focused academic planning and GPA simulation platform developed to assist students in tracking their 136-credit Bachelor of Science in Computer Science and Engineering (CSE) curriculum at BRAC University.

This Privacy Policy explains how Flow136 accesses, collects, uses, stores, and protects user data, specifically including data obtained through Google Identity Services and Google Drive APIs.

---

## 2. Google API Services User Data Policy Compliance (Limited Use Disclosure)

> **Flow136's use and transfer to any other app of information received from Google APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.**

In strict adherence to the Google API Services User Data Policy:
* **Zero Selling of User Data:** We do not sell, rent, lease, or monetize your Google user data or academic data to third parties, data brokers, or advertising networks under any circumstances.
* **Zero Advertising or Marketing:** We do not use Google user data to serve targeted advertisements, market third-party services, or create consumer behavioral profiles.
* **Zero Generalized AI/ML Training:** We do not use Google user data to train, retrain, or improve generalized machine learning or artificial intelligence models.
* **Human Access Restrictions:** Flow136 developers and maintainers do not read or view your Google Drive backup data or profile data. Human access is strictly limited to instances where:
  1. You have provided explicit, affirmative consent for technical troubleshooting;
  2. It is necessary for security reasons (such as investigating an exploit); or
  3. It is required by applicable law.

---

## 3. Information We Collect and Google OAuth Scopes

Flow136 follows a strict data-minimization approach. We request only the permissions necessary for personal academic tracking:

### A. Google OAuth 2.0 Scopes Requested
1. `openid`, `https://www.googleapis.com/auth/userinfo.email`, `https://www.googleapis.com/auth/userinfo.profile`
   * **Data Received:** User's full name, email address, and profile picture avatar.
   * **Purpose:** To verify that students authenticate with an authorized Google Workspace address (such as `@g.bracu.ac.bd`), display the user profile in the sync header, and identify user sessions locally.
2. `https://www.googleapis.com/auth/drive.appdata` (Application Data Folder)
   * **Data Received:** Access strictly restricted to Flow136's isolated hidden Application Data folder in Google Drive.
   * **Clear Boundary:** Flow136 **CANNOT** view, read, search, modify, or delete any of your personal Google Drive files, Google Docs, photos, sheets, or documents outside of its own dedicated app storage folder.
   * **Purpose:** Writing, retrieving, and updating a single structured JSON backup file (`flow136_backup.json`) containing your degree plan, course statuses, and simulated grades, enabling cross-device sync.

### B. User-Entered Academic Data
* Course enrollment statuses (completed, in-progress, planned).
* Simulated course letter grades and term GPA goals.
* Selected degree track (e.g., Thesis vs. Non-Thesis Internship).
* Custom semesters and course additions.

---

## 4. Architecture & Data Storage (No Centralized Database)

Flow136 is designed with a **client-side, privacy-first architecture**:
* **No Central Server Database:** Flow136 does **not** host a centralized database, backend server, or user registry storing your grades or student identification numbers.
* **Local Browser Storage:** All active course data is stored locally in your browser's `localStorage`.
* **Personal Cloud Storage:** When you enable Google Drive synchronization, backup files are written directly from your browser to your personal Google Drive AppData folder via secure HTTPS API requests. At no point does your academic data traverse any third-party intermediary server.

---

## 5. Data Retention, Deletion, and Revoking Permissions

You retain complete autonomy and control over all data associated with Flow136:

### A. Deleting Local Data
You can clear all locally stored courses, grades, and preferences at any time by clicking the **"Reset All Data"** button in the in-app settings menu.

### B. Deleting Google Drive Cloud Backup
To remove the cloud backup created by Flow136:
1. Open [Google Drive](https://drive.google.com) in your web browser.
2. Click the **Gear icon (Settings)** at the top right, then select **Settings**.
3. In the left sidebar, click **Manage Apps**.
4. Scroll to **Flow136**.
5. Click **Options** &rarr; **Delete hidden app data**.

### C. Revoking OAuth Access
You can revoke Flow136's access to your Google Account at any time:
1. Visit your [Google Account Permissions Dashboard](https://myaccount.google.com/permissions).
2. Select **Flow136**.
3. Click **Remove Access** (or **Delete all connections**).
4. Once revoked, Flow136 cannot access your Google profile or Drive AppData folder.

---

## 6. Security Standards

* **Encryption in Transit:** All interactions with Google APIs use industry-standard HTTPS encryption (TLS 1.3).
* **Token Handling:** Access tokens are short-lived, stored locally in the browser session, and are never transmitted to unauthorized endpoints.
* **Domain Restrictions:** G-Suite gatekeeping restricts authentication to verified BRAC University accounts (`@g.bracu.ac.bd`) or explicit guest mode, protecting students from external data contamination.

---

## 7. Institutional Disclaimer

Flow136 is an independent student planning tool. It is **not** officially affiliated with, endorsed by, or managed by BRAC University or the BRACU Department of Computer Science and Engineering. Official graduation status and grade transcripts are determined exclusively by official university systems (USIS/Connect).

---

## 8. Contact & Inquiries

For questions regarding this Privacy Policy, verification inquiries, or data protection practices, please contact:

* **Email:** flow136.tracker@gmail.com  
* **GitHub Issues:** https://github.com/fakekhanabdullah/Flow136-CSE-Course-Tracker/issues  
* **Lead Developer:** Khan Abdullah  
