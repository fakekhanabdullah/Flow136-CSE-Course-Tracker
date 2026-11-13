import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { FileText, ArrowLeft, ShieldCheck, AlertTriangle, ExternalLink, Scale, CheckCircle2, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | Flow136 - BRACU CSE Course Tracker",
  description: "Terms of Service and Conditions of Use for Flow136.",
};

export default function TermsOfServicePage() {
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
              <FileText className="h-4 w-4" />
            </div>
            <span className="font-black text-sm text-white tracking-tight">Flow136</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 hidden md:inline">Legal Docs:</span>
          <Link
            href="/privacy"
            className="px-3 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white font-medium transition"
          >
            Privacy Policy
          </Link>
          <span className="px-3 py-1 rounded-lg bg-blue-500/15 border border-blue-400/30 text-blue-300 font-bold">
            Terms of Service
          </span>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-10">
        
        {/* Hero Section */}
        <div className="space-y-4 border-b border-white/[0.08] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Scale className="w-3 h-3" />
            <span>Terms of Service</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Terms of Service &amp; User Agreement
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
            Please read these Terms of Service carefully before accessing or using Flow136. By accessing, bookmarking, or using any part of Flow136, you agree to be bound by these terms.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
            <span>Last Updated: <strong className="text-slate-200">{lastUpdated}</strong></span>
            <span>•</span>
            <span>Platform: <strong className="text-slate-200">Flow136</strong> ({appUrl})</span>
            <span>•</span>
            <span>Contact: <strong className="text-blue-300">{contactEmail}</strong></span>
          </div>
        </div>

        {/* Section 1: Acceptance of Terms */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400 font-mono text-base">1.</span>
            <span>Acceptance of Terms</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            By creating an academic plan, tracking grades, using the GPA simulator, or signing in with Google to synchronize your degree data, you represent and warrant that you agree to comply with and be bound by these Terms of Service and our{" "}
            <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline font-medium">
              Privacy Policy
            </Link>
            . If you do not agree with any part of these terms, you should not access or use the application.
          </p>
        </section>

        {/* Section 2: Purpose & Educational Disclaimer */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400 font-mono text-base">2.</span>
            <span>Academic Purpose &amp; Institutional Disclaimer</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Flow136 is an unofficial academic planning and degree simulation tool built independently to assist students enrolled in the Bachelor of Science in Computer Science and Engineering (CSE) curriculum at BRAC University.
          </p>
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed space-y-2">
            <p className="font-bold flex items-center gap-1.5 text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Important Academic Disclaimer:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Flow136 is <strong>NOT</strong> an official service, affiliate, or representative of BRAC University or the Department of CSE.</li>
              <li>Calculations, prerequisite mappings, and simulated GPAs provided by Flow136 are for personal planning, estimating, and projection purposes only.</li>
              <li>Official academic status, GPA, credit standing, prerequisite clearances, and graduation eligibility are governed exclusively by official BRAC University portals (such as USIS, Connect, and the Office of the Registrar). Students must confirm all graduation requirements directly with their department academic advisors.</li>
            </ul>
          </div>
        </section>

        {/* Section 3: Google Identity & OAuth Services */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400 font-mono text-base">3.</span>
            <span>Google Identity &amp; Cloud Drive Services</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Flow136 offers optional authentication and cloud backup powered by Google Identity Services and Google Drive REST APIs. By utilizing Google Sign-in:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <li>You agree to comply with Google&apos;s applicable Terms of Service and Privacy Policies.</li>
            <li>You grant Flow136 permission to access your designated Google Drive hidden Application Data folder (<code>drive.appdata</code>) solely to save, retrieve, and delete your academic plan backup file (<code>flow136_backup.json</code>).</li>
            <li>You understand that Flow136 does not inspect, read, or alter any personal files, documents, or photos in your Google Drive outside this isolated application folder.</li>
            <li>Flow136 complies strictly with the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline font-medium">Google API Services User Data Policy</a>, including its Limited Use requirements.</li>
          </ul>
        </section>

        {/* Section 4: User Responsibilities & Conduct */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400 font-mono text-base">4.</span>
            <span>User Responsibilities &amp; Conduct</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            When using Flow136, you agree that you will:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <li>Provide accurate grade and credit entries for your own personal simulation.</li>
            <li>Maintain the confidentiality and security of your Google account credentials and browser sessions.</li>
            <li>Not use the platform for any illegal, harmful, or abusive purpose, including attempting to reverse-engineer unauthorized exploits against Google APIs or BRAC University systems.</li>
            <li>Acknowledge that local data storage resides in your browser cache and you are responsible for maintaining backups or cloud synchronization of your plan.</li>
          </ul>
        </section>

        {/* Section 5: Intellectual Property & Open Source */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400 font-mono text-base">5.</span>
            <span>Intellectual Property &amp; Open Source</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            The Flow136 source code is an open-source project created by Khan Abdullah. Course titles, codes, and credit weighting represent public curricular information of BRAC University.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            All visual interfaces, design tokens, responsive graph implementations, and custom algorithms are subject to the project&apos;s open-source license hosted on our official GitHub repository.
          </p>
        </section>

        {/* Section 6: Disclaimer of Warranties */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400 font-mono text-base">6.</span>
            <span>Disclaimer of Warranties</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            FLOW136 IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMISSIBLE UNDER APPLICABLE LAW, THE MAINTAINERS DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND ACCURACY OF CURRICULAR INFORMATION.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF BUGS, OR THAT SIMULATED CGPA CALCULATIONS ARE FREE OF MINOR ROUNDING DEVIATIONS FROM OFFICIAL UNIVERSITY GRADING SOFTWARE.
          </p>
        </section>

        {/* Section 7: Limitation of Liability */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400 font-mono text-base">7.</span>
            <span>Limitation of Liability</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            IN NO EVENT SHALL FLOW136, ITS MAINTAINERS, CONTRIBUTORS, OR AFFILIATES BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES ARISING IN ANY WAY OUT OF THE USE OR INABILITY TO USE THIS APPLICATION, INCLUDING BUT NOT LIMITED TO ADVISING DECISIONS, COURSE RETAKES, DROPPED COURSES, OR LOSS OF DATA.
          </p>
        </section>

        {/* Section 8: Termination & Changes */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span className="text-blue-400 font-mono text-base">8.</span>
            <span>Modifications to the Service &amp; Terms</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            We reserve the right to modify, suspend, or discontinue Flow136, or update these Terms of Service, at any time without prior notice. Continued use of the platform following any modifications constitutes your binding acceptance of the revised Terms.
          </p>
        </section>

        {/* Section 9: Contact */}
        <section className="p-5 sm:p-6 rounded-3xl bg-[#060814] border border-white/[0.08] space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            <span>Contact &amp; Inquiries</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            For questions, legal inquiries, or concerns regarding these Terms of Service, please contact:
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
                Flow136-CSE-Course-Tracker
              </a>
            </div>
          </div>
        </section>

        {/* Bottom Footer */}
        <footer className="pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} Flow136. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-300 transition">Home</Link>
            <Link href="/privacy" className="hover:text-slate-300 transition">Privacy Policy</Link>
            <a href="https://github.com/fakekhanabdullah/Flow136-CSE-Course-Tracker" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition">GitHub</a>
          </div>
        </footer>

      </main>
    </div>
  );
}
