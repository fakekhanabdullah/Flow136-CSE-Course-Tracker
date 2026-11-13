import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Shield, Lock, FileText, ArrowLeft, ExternalLink, CheckCircle2, AlertCircle, Database, RefreshCw, KeyRound, Mail, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Flow136 - BRACU CSE Course Tracker",
  description: "Privacy Policy and Google API Services User Data Policy Compliance statement for Flow136.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "November 9, 2026";
  const contactEmail = "flow136.tracker@gmail.com";
  const appUrl = "https://flow136-cse-course-tracker.vercel.app";

  return (
    <div className="min-h-screen bg-[#030306] bg-gradient-to-b from-[#030306] via-[#05060d] to-[#070914] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#060814]/85 border-b border-white/[0.08] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-bold text-slate-300 hover:text-white transition group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Planner</span>
          </Link>
          <div className="h-4 w-px bg-white/[0.1] hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Shield className="h-4 w-4" />
            </div>
            <span className="font-black text-sm text-white tracking-tight">Flow136</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 hidden md:inline">Legal Docs:</span>
          <span className="px-3 py-1 rounded-lg bg-blue-500/15 border border-blue-400/30 text-blue-300 font-bold">
            Privacy Policy
          </span>
          <Link
            href="/terms"
            className="px-3 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white font-medium transition"
          >
            Terms of Service
          </Link>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-10">
        
        {/* Hero Section */}
        <div className="space-y-4 border-b border-white/[0.08] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Lock className="w-3 h-3" />
            <span>Official Privacy Policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Privacy Policy &amp; Data Protection
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
            Flow136 is an independent student academic planning and degree simulation platform designed for BRAC University Computer Science and Engineering (CSE) students. Your privacy, academic autonomy, and data sovereignty are fundamental to our architecture.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
            <span>Last Updated: <strong className="text-slate-200">{lastUpdated}</strong></span>
            <span>•</span>
            <span>Application: <strong className="text-slate-200">Flow136</strong> ({appUrl})</span>
            <span>•</span>
            <span>Contact: <strong className="text-blue-300">{contactEmail}</strong></span>
          </div>
        </div>

        {/* Highlight Alert: Google API Services User Data Policy / Limited Use */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-950/30 via-[#070a1a] to-[#040612] border-2 border-indigo-500/40 shadow-2xl relative overflow-hidden space-y-3">
          <div className="flex items-center gap-2.5 text-indigo-300 font-black text-sm tracking-wide">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>Google API Services User Data Policy &amp; Limited Use Disclosure</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            Flow136&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline font-bold inline-flex items-center gap-1"
            >
              Google API Services User Data Policy
              <ExternalLink className="w-3 h-3 inline" />
            </a>
            , including the <strong>Limited Use</strong> requirements.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-slate-300">
            <div className="flex items-start gap-2 bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Zero Selling of User Data:</strong> We never sell, rent, or trade your Google data to any third parties.</span>
            </div>
            <div className="flex items-start gap-2 bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Zero Advertising / Marketing:</strong> Google user data is never used for serving ads or targeted profiling.</span>
            </div>
            <div className="flex items-start gap-2 bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Zero Generalized AI Training:</strong> Your Google data is not used to train machine learning or AI models.</span>
            </div>
            <div className="flex items-start gap-2 bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>No Human Read Access:</strong> Human access is restricted unless explicitly requested by you for technical support.</span>
            </div>
          </div>
        </div>

        {/* Section 1: Developer & Entity Identity */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400 font-mono text-base">1.</span>
            <span>Developer &amp; Organization Identity</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Flow136 is operated as an independent, non-commercial open-source student utility for BRAC University CSE students.
          </p>
          <div className="p-4 rounded-2xl bg-[#060814] border border-white/[0.08] space-y-2 text-xs text-slate-300">
            <p><strong>Entity / Project Name:</strong> Flow136 (Student Open-Source Project)</p>
            <p><strong>Developer:</strong> Khan Abdullah (Undergraduate Student, Department of CSE, BRAC University)</p>
            <p><strong>Primary Support Email:</strong> <a href={`mailto:${contactEmail}`} className="text-blue-400 underline">{contactEmail}</a></p>
            <p><strong>Open-Source Repository:</strong> <a href="https://github.com/fakekhanabdullah/Flow136-CSE-Course-Tracker" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">github.com/fakekhanabdullah/Flow136-CSE-Course-Tracker</a></p>
          </div>
        </section>

        {/* Section 2: Data We Collect & Scopes */}
        <section className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400 font-mono text-base">2.</span>
            <span>Information We Collect &amp; Google OAuth Scopes</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Flow136 collects only the minimal data strictly necessary to provide academic degree tracking and optional cloud synchronization:
          </p>

          <div className="space-y-3">
            {/* Scope 1: Userinfo Email & Profile */}
            <div className="p-4 rounded-2xl bg-[#060814] border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-indigo-300">
                  openid, userinfo.email, userinfo.profile
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-white/[0.05]">
                  Basic Profile
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>What it provides:</strong> Your name, Google account email address, and avatar image.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong>Purpose:</strong> To identify your student profile locally, display your active session, and verify that students belong to the BRAC University G-Suite domain (<code>@g.bracu.ac.bd</code>) to safeguard program accuracy.
              </p>
            </div>

            {/* Scope 2: Drive AppData */}
            <div className="p-4 rounded-2xl bg-[#060814] border border-blue-500/25 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-300">
                  https://www.googleapis.com/auth/drive.appdata
                </span>
                <span className="text-[10px] uppercase font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30">
                  Sensitive Scope (Application Data)
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>What it provides:</strong> Read and write access strictly confined to Flow136&apos;s own private application data folder on your Google Drive.
              </p>
              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs text-blue-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  What Flow136 CANNOT see or access:
                </p>
                <p className="text-slate-300">
                  Flow136 <strong>cannot</strong> view, browse, search, edit, or delete any of your personal Google Drive documents, Google Docs, photos, spreadsheets, or files outside its isolated app data storage folder.
                </p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong>Purpose:</strong> Storing your encrypted/structured backup file (<code>flow136_backup.json</code>) so your degree plan and grades synchronize seamlessly between your devices without requiring a centralized third-party database.
              </p>
            </div>

            {/* Academic Data */}
            <div className="p-4 rounded-2xl bg-[#060814] border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-300">
                  Academic Progress Data (Entered by User)
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-white/[0.05]">
                  User Input
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Course codes, grades, completed semesters, target CGPA goal, and thesis/internship selections. This information is saved locally in your browser&apos;s <code>localStorage</code> and optionally backed up to your personal Google Drive.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Architecture & Zero Central Server Storage */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400 font-mono text-base">3.</span>
            <span>No-Backend / Client-Side Architecture</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Flow136 runs as a client-side web application. <strong>We do not operate a centralized backend server, cloud database, or student registry that stores your grades or course records.</strong>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="p-3.5 rounded-xl bg-[#060814] border border-white/[0.08] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Database className="w-4 h-4 text-indigo-400" />
                <span>Local Browser Storage</span>
              </div>
              <p className="text-slate-400">
                Your course data is stored in your browser&apos;s isolated <code>localStorage</code>. It remains on your physical device until you clear your browser data.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#060814] border border-white/[0.08] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <RefreshCw className="w-4 h-4 text-blue-400" />
                <span>Your Google Drive AppData</span>
              </div>
              <p className="text-slate-400">
                When you sign in with Google, backups are written directly from your browser to your Google Drive AppData folder via secure HTTPS REST API calls.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Data Retention, Deletion & Revocation */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400 font-mono text-base">4.</span>
            <span>How to Delete Your Data &amp; Revoke Access</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            You retain 100% control over your data at all times. You can delete all traces of your data through any of the following mechanisms:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300 list-disc list-inside leading-relaxed">
            <li>
              <strong>Clear Local Data:</strong> Open the in-app Settings menu in Flow136 and select <em>&quot;Reset All Data&quot;</em>. This immediately purges all courses, grades, and stored tokens from your browser&apos;s <code>localStorage</code>.
            </li>
            <li>
              <strong>Delete Cloud Backup from Google Drive:</strong> Open your Google Drive in a desktop browser &rarr; Click the <strong>Gear icon (Settings)</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Manage Apps</strong> &rarr; Find <strong>Flow136</strong> &rarr; Click <strong>Options</strong> &rarr; <strong>Delete hidden app data</strong>.
            </li>
            <li>
              <strong>Revoke Google OAuth Authorization:</strong> You can disconnect Flow136 from your Google Account at any time by visiting your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline font-semibold inline-flex items-center gap-0.5"
              >
                Google Account Permissions Dashboard
                <ExternalLink className="w-3 h-3 inline" />
              </a>
              . Once revoked, Flow136 loses all access immediately.
            </li>
          </ul>
        </section>

        {/* Section 5: Cookies & Third-Party Services */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400 font-mono text-base">5.</span>
            <span>Cookies &amp; Third-Party Services</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Flow136 does <strong>not</strong> use advertising cookies, marketing tracking pixels, or third-party behavioral analytics scripts (such as Facebook Pixel or third-party ad trackers).
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            The only third-party service integrated is <strong>Google Identity Services (GSI) / Google APIs</strong>, solely used when you explicitly request Google Sign-In or Google Drive Cloud Synchronization.
          </p>
        </section>

        {/* Section 6: Security Measures */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400 font-mono text-base">6.</span>
            <span>Security Measures</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            We implement strict security practices to ensure student safety:
          </p>
          <ul className="space-y-1.5 text-xs sm:text-sm text-slate-300 list-disc list-inside leading-relaxed">
            <li>All communication between your browser and Google APIs is encrypted in transit using industry-standard <strong>TLS/HTTPS (Transport Layer Security)</strong>.</li>
            <li>Short-lived OAuth2 access tokens are stored in private browser storage and are never logged or transmitted to any third-party infrastructure.</li>
            <li>Content Security Policies and strict scope constraints minimize any exposure risk.</li>
          </ul>
        </section>

        {/* Section 7: Educational Disclaimer */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400 font-mono text-base">7.</span>
            <span>Academic &amp; Institutional Disclaimer</span>
          </h2>
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed space-y-2">
            <p className="font-bold flex items-center gap-1.5 text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Not Officially Affiliated with BRAC University:
            </p>
            <p>
              Flow136 is an independent planning utility created by and for BRAC University CSE students. It is not owned, operated, endorsed, or audited by BRAC University administration. All official grades, transcripts, and graduation clearances are maintained strictly by the BRAC University Registrar, Department of CSE, and USIS/Connect portals.
            </p>
          </div>
        </section>

        {/* Section 8: Changes to this Policy */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400 font-mono text-base">8.</span>
            <span>Changes to this Privacy Policy</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            We may update this Privacy Policy from time to time to reflect improvements or regulatory changes. Any modifications will be posted directly to this page with an updated &quot;Last Updated&quot; timestamp.
          </p>
        </section>

        {/* Section 9: Contact Us */}
        <section className="p-5 sm:p-6 rounded-3xl bg-[#060814] border border-white/[0.08] space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            <span>Questions &amp; Privacy Inquiries</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            If you have any questions, feedback, or data requests regarding this Privacy Policy or Flow136&apos;s data practices, please reach out directly:
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs font-mono text-slate-200 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Email:</span>
              <a href={`mailto:${contactEmail}`} className="text-blue-300 hover:underline font-bold">
                {contactEmail}
              </a>
            </div>
            <span className="hidden sm:inline text-slate-600">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">GitHub:</span>
              <a
                href="https://github.com/fakekhanabdullah/Flow136-CSE-Course-Tracker"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-300 hover:underline"
              >
                Issue Tracker
              </a>
            </div>
          </div>
        </section>

        {/* Bottom Footer */}
        <footer className="pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} Flow136. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-300 transition">Home</Link>
            <Link href="/terms" className="hover:text-slate-300 transition">Terms of Service</Link>
            <a href="https://github.com/fakekhanabdullah/Flow136-CSE-Course-Tracker" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition">GitHub</a>
          </div>
        </footer>

      </main>
    </div>
  );
}
