"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toBlob } from "html-to-image";
import { 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Award, 
  Info, 
  Calendar, 
  GraduationCap, 
  Filter, 
  ArrowRightLeft,
  X,
  PlusCircle,
  HelpCircle,
  Lock,
  Target,
  TrendingUp,
  TrendingDown,
  FileText,
  Camera,
  List,
  Columns,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Crosshair,
  Repeat,
  Layers,
  BadgeCheck,
  Gauge,
  Search,
  Compass
} from "lucide-react";
import { COURSES, PREREQUISITES, Course, PrereqRule } from "./courses-data";

// Prerequisite Helper functions
const getCoursePrereqs = (courseCode: string, pathway: 'foundation' | 'credit' | null, creditOption?: 'opt1' | 'opt2' | null) => {
  const rule = PREREQUISITES[courseCode] || { hp: [], sp: [] };
  let hp = rule.hp || [];
  let sp = rule.sp || [];

  if (pathway === 'credit') {
    hp = hp.filter(code => !["ENG091", "MAT091", "MAT092"].includes(code));
    sp = sp.filter(code => !["ENG091", "MAT091", "MAT092"].includes(code));
    if (creditOption === 'opt2') {
      hp = hp.filter(code => code !== "ENG101");
      sp = sp.filter(code => code !== "ENG101");
    }
  }

  return { hp, sp };
};

const isCourseCompletedPrior = (courseCode: string, targetSemIdx: number, semestersList: Semester[], appMode: 'tracker' | 'gpa') => {
  for (let idx = 0; idx < targetSemIdx; idx++) {
    const sem = semestersList[idx];
    const found = sem.courses.find(c => c.code === courseCode);
    if (found) {
      const isComp = appMode === 'tracker' 
        ? found.isCompleted 
        : (found.grade !== "" && found.grade !== "F");
      if (isComp) return true;
    }
  }
  return false;
};

const calculateSemesterIntakes = (semestersList: Semester[], starting: { term: 'Spring' | 'Summer' | 'Fall'; year: number }) => {
  const result: { term: 'Spring' | 'Summer' | 'Fall'; year: number }[] = [];
  
  let currentTerm = starting.term;
  let currentYear = starting.year;

  semestersList.forEach((sem) => {
    if (sem.term && sem.year) {
      currentTerm = sem.term;
      currentYear = sem.year;
    }
    
    result.push({ term: currentTerm, year: currentYear });

    if (currentTerm === 'Spring') {
      currentTerm = 'Summer';
    } else if (currentTerm === 'Summer') {
      currentTerm = 'Fall';
    } else if (currentTerm === 'Fall') {
      currentTerm = 'Spring';
      currentYear += 1;
    }
  });

  return result;
};

// Type definitions
interface SelectedCourse {
  code: string;
  grade: string;      // Mode B: 'A', 'A-', 'B+', etc. or '' (Not Taken Yet)
  isCompleted: boolean; // Mode A: simple checkbox completion
}

interface Semester {
  id: string;
  name: string;
  courses: SelectedCourse[];
  isRS?: boolean;
  term?: 'Spring' | 'Summer' | 'Fall';
  year?: number;
  isCollapsed?: boolean;
}

interface OnboardingData {
  pathway: 'foundation' | 'credit' | null;
  foundationOption: 'opt1' | 'opt2' | 'opt3' | null;
  remedialEng091Checked: boolean;
  remedialMat091Checked: boolean;
  remedialMat092Checked: boolean;
  creditOption: 'opt1' | 'opt2' | null;
  rsTerm: '3rd Semester' | '4th Semester' | '5th Semester';
  engStatusPriorToRS: 'caseA' | 'caseB' | 'caseC' | 'caseD' | null;
  startingTerm: 'Spring' | 'Summer' | 'Fall';
  startingYear: number;
}

const GRADING_SCALE: Record<string, number> = {
  "A+": 4.0,
  "A": 4.0,
  "A-": 3.7,
  "B+": 3.3,
  "B": 3.0,
  "B-": 2.7,
  "C+": 2.3,
  "C": 2.0,
  "C-": 1.7,
  "D+": 1.3,
  "D": 1.0,
  "D-": 0.7,
  "F": 0.0
};

const GRADING_SYSTEM_INFO = [
  { marks: "97 - 100*", grade: "A+", points: "4.0", remark: "Exceptional" },
  { marks: "90 - <97*", grade: "A", points: "4.0", remark: "Excellent" },
  { marks: "85 - <90", grade: "A-", points: "3.7", remark: "" },
  { marks: "80 - <85", grade: "B+", points: "3.3", remark: "" },
  { marks: "75 - <80", grade: "B", points: "3.0", remark: "Good" },
  { marks: "70 - <75", grade: "B-", points: "2.7", remark: "" },
  { marks: "65 - <70", grade: "C+", points: "2.3", remark: "" },
  { marks: "60 - <65", grade: "C", points: "2.0", remark: "Fair" },
  { marks: "57 - <60", grade: "C-", points: "1.7", remark: "" },
  { marks: "55 - <57", grade: "D+", points: "1.3", remark: "" },
  { marks: "52 - <55", grade: "D", points: "1.0", remark: "Poor" },
  { marks: "50 - <52", grade: "D-", points: "0.7", remark: "" },
  { marks: "<50", grade: "F", points: "0.0", remark: "Failure" },
];

// Deduplicate courses within a semester, preserving whichever attempt has a grade or is completed
const dedupeSemesterCourses = (courses: SelectedCourse[]): SelectedCourse[] => {
  const seen = new Map<string, SelectedCourse>();
  for (const c of courses) {
    if (!seen.has(c.code)) {
      seen.set(c.code, c);
    } else {
      const existing = seen.get(c.code)!;
      // If the newly encountered one has a grade or is completed, prioritize it over an empty/incomplete one
      if ((c.grade || c.isCompleted) && (!existing.grade && !existing.isCompleted)) {
        seen.set(c.code, c);
      }
    }
  }
  return Array.from(seen.values());
};

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);

  const getHighlightClass = (target: string) => {
    if (tutorialStep === null) return "";
    
    // Fine-tuned soft glows to match theme elegantly without being too intense
    let glow = "";
    if (target === "layout-toggles") {
      glow = "!border-indigo-500/40 !shadow-[0_0_6px_rgba(99,102,241,0.2)] transition-all duration-300";
    } else if (target.startsWith("category-")) {
      glow = "!border-indigo-500/35 !shadow-[0_0_8px_rgba(99,102,241,0.18)] transition-all duration-300";
    } else if (target === "gpa-solver-card" || target === "roi-analyzer") {
      glow = "!border-indigo-500/35 !shadow-[0_0_8px_rgba(99,102,241,0.18)] transition-all duration-300";
    } else {
      glow = "!border-indigo-500/45 !shadow-[0_0_8px_rgba(99,102,241,0.22)] transition-all duration-300";
    }

    if (target === "cta-button" && tutorialStep === 1) return glow;
    if ((target === "pathway-card-a" || target === "pathway-card-b") && tutorialStep === 2) return glow;
    if ((target === "rs-term-select" || target === "starting-intake-select" || target === "english-status-select") && tutorialStep === 3) return glow;
    if (target === "generate-plan-btn" && tutorialStep === 4) return glow;
    if (target === "mode-toggler" && (tutorialStep === 5 || tutorialStep === 7)) return glow;
    if ((target === "category-core" || target === "category-school" || target === "category-electives" || target === "category-gened") && tutorialStep === 6) return glow;
    if (target === "gpa-solver-card" && tutorialStep === 8) return glow;
    if (target === "roi-analyzer" && (tutorialStep === 8 || tutorialStep === 9)) return glow;
    if (target === "layout-toggles" && tutorialStep === 10) return glow;
    if (target === "hamburger-menu" && tutorialStep === 11) return glow;
    if (target === "feeling-lost-btn" && tutorialStep === 12) return glow;
    return "";
  };

  // App settings/modes
  const [mode, setMode] = useState<'tracker' | 'gpa'>('tracker');
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  
  // Onboarding Wizard state
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    pathway: null,
    foundationOption: null,
    remedialEng091Checked: false,
    remedialMat091Checked: false,
    remedialMat092Checked: false,
    creditOption: null,
    rsTerm: "3rd Semester",
    engStatusPriorToRS: null,
    startingTerm: "Spring",
    startingYear: 2025
  });

  // Semesters state
  const [semesters, setSemesters] = useState<Semester[]>([]);

  // Thesis/Capstone state
  const [thesisTrack, setThesisTrack] = useState<'thesis' | 'project' | 'internship'>('thesis');
  const [thesisSteps, setThesisSteps] = useState({
    step1: false, // Proposal submitted & supervisor assigned
    step2: false, // Mid-term defense cleared
    step3: false  // Final thesis defended
  });
  const [projectCompleted, setProjectCompleted] = useState(false);
  const [internshipCompleted, setInternshipCompleted] = useState(false);

  // UI state
  const [activeCourseSelectorSemesterId, setActiveCourseSelectorSemesterId] = useState<string | null>(null);
  const [swappingCourseCode, setSwappingCourseCode] = useState<string | null>(null);
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [courseSearchFilter, setCourseSearchFilter] = useState("All");
  const [activeCategorySelectorKey, setActiveCategorySelectorKey] = useState<string | null>(null);
  const [selectedCategoryCourseCode, setSelectedCategoryCourseCode] = useState<string>("");
  const [selectedCategoryTargetSemesterId, setSelectedCategoryTargetSemesterId] = useState<string>("");
  const [categoryCourseSearchQuery, setCategoryCourseSearchQuery] = useState<string>("");

  useEffect(() => {
    if (activeCategorySelectorKey && semesters.length > 0) {
      setSelectedCategoryTargetSemesterId(semesters[semesters.length - 1].id);
      setSelectedCategoryCourseCode("");
      setCategoryCourseSearchQuery("");
    }
  }, [activeCategorySelectorKey, semesters]);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState<boolean>(false);
  const [showDataDropdown, setShowDataDropdown] = useState<boolean>(false);
  const [backupFileError, setBackupFileError] = useState<string | null>(null);
  const [targetCgpa, setTargetCgpa] = useState<string>("3.50");
  const [showRoiModal, setShowRoiModal] = useState<boolean>(false);
  const [roiThresholdGrade, setRoiThresholdGrade] = useState<string>("B-");
  const [selectedRoiCourses, setSelectedRoiCourses] = useState<Record<string, boolean>>({});
  const [roiTargetGrades, setRoiTargetGrades] = useState<Record<string, string>>({});
  const [showGradingSystemModal, setShowGradingSystemModal] = useState<boolean>(false);
  const [isCapstoneCollapsed, setIsCapstoneCollapsed] = useState<boolean>(false);
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState<boolean>(false);
  const [showGradeSheetModal, setShowGradeSheetModal] = useState<boolean>(false);
  const [snapshotScale, setSnapshotScale] = useState<number>(1);
  const [snapshotHeight, setSnapshotHeight] = useState<number>(700);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 9999
  });

  useEffect(() => {
    if (tutorialStep === null || !isMounted) return;

    const updatePosition = () => {
      const isMd = window.innerWidth >= 768;

      if (isMd) {
        setPopoverStyle({
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          left: 'auto',
          top: 'auto',
          zIndex: 9999,
          width: '384px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        });
      } else {
        setPopoverStyle({
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          right: '16px',
          top: 'auto',
          zIndex: 9999,
          width: 'calc(100vw - 32px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [tutorialStep, isMounted]);

  // Auto-start tutorial on user's first time
  useEffect(() => {
    if (isMounted) {
      try {
        const hasCompleted = localStorage.getItem("flow136_tutorial_completed");
        if (!hasCompleted) {
          setTutorialStep(1);
        }
      } catch (error) {
        console.error("Local storage access blocked, skipping auto-start tour:", error);
      }
    }
  }, [isMounted]);

  const handleTutorialStepChange = (step: number) => {
    if (step < 1) return;
    if (step > 12) {
      try {
        localStorage.setItem("flow136_tutorial_completed", "true");
      } catch (error) {
        console.error("Local storage set blocked:", error);
      }
      setTutorialStep(null);
      return;
    }
    
    setTutorialStep(step);
    
    // Automatic navigation transitions based on the tutorial step
    if (step === 1) {
      setShowDashboard(false);
    } else if (step === 2) {
      setShowDashboard(true);
      setWizardStep(1);
    } else if (step === 3) {
      setShowDashboard(true);
      setWizardStep(2);
    } else if (step === 4) {
      setShowDashboard(true);
      setWizardStep(3);
    } else if (step === 5) {
      setShowDashboard(true);
      // Main dashboard view (ensure we are onboarded or showDashboard is true)
    } else if (step === 6) {
      setShowDashboard(true);
    } else if (step === 7) {
      setShowDashboard(true);
      setMode('tracker');
    } else if (step === 8) {
      setShowDashboard(true);
      setMode('gpa');
    } else if (step === 9) {
      setShowDashboard(true);
      setMode('gpa');
      setShowRoiModal(true);
    } else if (step === 10) {
      setShowDashboard(true);
      setShowRoiModal(false);
    } else if (step === 11) {
      setShowDashboard(true);
    } else if (step === 12) {
      setShowDashboard(true);
    }
  };

  // Dynamic scaling for the Academic Progress Snapshot Preview Modal
  useEffect(() => {
    if (!showGradeSheetModal) return;

    const updateScaling = () => {
      const element = document.getElementById("flow136-grade-sheet-export-node");
      if (!element) return;
      
      const naturalHeight = element.offsetHeight || 700;
      setSnapshotHeight(naturalHeight);

      // Parent container width calculation
      const scrollParent = element.closest('.overflow-y-auto') as HTMLElement | null;
      const containerWidth = scrollParent ? scrollParent.clientWidth : window.innerWidth;
      // Subtract internal padding (16px left + 16px right = 32px safe margin)
      const availableWidth = Math.max(260, (containerWidth || window.innerWidth) - 32);
      
      const scaleVal = Math.min(1, Math.max(0.25, availableWidth / 750));
      setSnapshotScale(scaleVal);
    };

    // Run layout measuring after render
    const timer = setTimeout(updateScaling, 60);
    window.addEventListener("resize", updateScaling);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateScaling);
    };
  }, [showGradeSheetModal, semesters, mode]);

  const [showRoadmapModal, setShowRoadmapModal] = useState<boolean>(false);
  const [roadmapActiveTab, setRoadmapActiveTab] = useState<'all' | 'dept' | 'outside' | 'gened'>('all');
  const [roadmapSearch, setRoadmapSearch] = useState<string>('');
  const [showDashboard, setShowDashboard] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [draggingCourseCode, setDraggingCourseCode] = useState<string | null>(null);
  const [draggingSourceSemesterId, setDraggingSourceSemesterId] = useState<string | null>(null);
  const [dragOverSemesterId, setDragOverSemesterId] = useState<string | null>(null);

  // Monitor screen width for responsive features
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Register Service Worker for PWA (Progressive Web App) support
  useEffect(() => {
    if (
      typeof window !== 'undefined' && 
      'serviceWorker' in navigator && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1' && 
      !window.location.hostname.startsWith('192.168.')
    ) {
      const registerSW = async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered successfully with scope:', reg.scope);
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      };
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  // Hydration fix & LocalStorage Loader & Service Worker Uninstaller for Dev
  useEffect(() => {
    setIsMounted(true);

    // Programmatically unregister and purge any cached files from previous localhost service worker installations
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' || 
        window.location.hostname.startsWith('192.168.')
      ) {
        const devPurgeKey = 'flow136_dev_purged';
        if (!sessionStorage.getItem(devPurgeKey)) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            if (registrations.length > 0) {
              for (let registration of registrations) {
                registration.unregister();
              }
              if ('caches' in window) {
                caches.keys().then((names) => {
                  for (let name of names) {
                    caches.delete(name);
                  }
                });
              }
              sessionStorage.setItem(devPurgeKey, 'true');
              window.location.reload(); // Refresh once to pull fresh uncached client resources
            }
          });
        }
      }
    }

    try {
      const savedView = localStorage.getItem("flow136_view_mode");
      if (savedView === "list" || savedView === "kanban") {
        setViewMode(savedView);
      }

      const savedState = localStorage.getItem("bracu_course_tracker_state");
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed.mode) setMode(parsed.mode);
        if (parsed.isOnboarded !== undefined) setIsOnboarded(parsed.isOnboarded);
        if (parsed.semesters && Array.isArray(parsed.semesters)) {
          const sanitized = parsed.semesters.map((s: Semester) => ({
            ...s,
            courses: dedupeSemesterCourses(s.courses || [])
          }));
          setSemesters(sanitized);
        }
        if (parsed.thesisTrack) setThesisTrack(parsed.thesisTrack);
        if (parsed.thesisSteps) setThesisSteps(parsed.thesisSteps);
        if (parsed.projectCompleted !== undefined) setProjectCompleted(parsed.projectCompleted);
        if (parsed.internshipCompleted !== undefined) setInternshipCompleted(parsed.internshipCompleted);
        if (parsed.onboardingData) setOnboardingData(parsed.onboardingData);
      }
    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
    }
  }, []);

  // Trigger Recommended Curriculum Modal if user completes onboarding and has 0 courses
  useEffect(() => {
    if (!isMounted || !isOnboarded || semesters.length === 0) return;
    
    // Count total courses currently added across all semesters
    const totalCourses = semesters.reduce((acc, sem) => acc + (sem.courses || []).length, 0);
    
    if (totalCourses === 0) {
      const autoShown = localStorage.getItem("flow136_roadmap_auto_shown");
      if (!autoShown) {
        setShowRoadmapModal(true);
        localStorage.setItem("flow136_roadmap_auto_shown", "true");
      }
    }
  }, [isMounted, isOnboarded, semesters]);

  // Synchronize RS card 4th course dynamically based on preceding ENG102 completion
  useEffect(() => {
    if (!isMounted) return;
    
    const rsIdx = semesters.findIndex(s => s.isRS);
    if (rsIdx === -1) return;

    // Check if ENG102 is completed in any semester BEFORE rsIdx
    let eng102CompletedBefore = false;
    for (let i = 0; i < rsIdx; i++) {
      const found = semesters[i].courses.find(c => c.code === "ENG102");
      if (found) {
        const isComp = mode === 'tracker'
          ? found.isCompleted
          : (found.isCompleted && found.grade !== "" && found.grade !== "F");
        if (isComp) {
          eng102CompletedBefore = true;
          break;
        }
      }
    }

    const rsSem = semesters[rsIdx];
    const hasENG102 = rsSem.courses.some(c => c.code === "ENG102");
    const hasBU201 = rsSem.courses.some(c => c.code === "BU201");

    let updatedCourses = [...rsSem.courses];
    let changed = false;

    if (eng102CompletedBefore) {
      // Should have BU201 instead of ENG102
      if (hasENG102) {
        updatedCourses = updatedCourses.map(c => c.code === "ENG102" ? { ...c, code: "BU201" } : c);
        changed = true;
      } else if (!hasBU201) {
        updatedCourses.push({ code: "BU201", grade: "", isCompleted: false });
        changed = true;
      }
    } else {
      // Should have ENG102 instead of BU201
      if (hasBU201) {
        updatedCourses = updatedCourses.map(c => c.code === "BU201" ? { ...c, code: "ENG102" } : c);
        changed = true;
      } else if (!hasENG102) {
        updatedCourses.push({ code: "ENG102", grade: "", isCompleted: false });
        changed = true;
      }
    }

    if (changed) {
      const newSemesters = semesters.map((sem, idx) => {
        if (idx === rsIdx) {
          return { ...sem, courses: updatedCourses };
        }
        return sem;
      });
      setSemesters(newSemesters);
      saveStateToLocalStorage(mode, isOnboarded, newSemesters, thesisTrack, thesisSteps, projectCompleted, internshipCompleted, onboardingData);
    }
  }, [semesters, mode, isMounted]);

  // Sync state to LocalStorage
  const saveStateToLocalStorage = (
    currentMode: 'tracker' | 'gpa',
    currentOnboarded: boolean,
    currentSemesters: Semester[],
    currentThesisTrack: 'thesis' | 'project' | 'internship',
    currentThesisSteps: typeof thesisSteps,
    currentProjectCompleted: boolean,
    currentInternshipCompleted: boolean,
    currentOnboardingData: OnboardingData
  ) => {
    try {
      localStorage.setItem("bracu_course_tracker_state", JSON.stringify({
        mode: currentMode,
        isOnboarded: currentOnboarded,
        semesters: currentSemesters,
        thesisTrack: currentThesisTrack,
        thesisSteps: currentThesisSteps,
        projectCompleted: currentProjectCompleted,
        internshipCompleted: currentInternshipCompleted,
        onboardingData: currentOnboardingData
      }));
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  };

  const updateSemesters = (newSemesters: Semester[]) => {
    const sanitized = newSemesters.map(s => ({
      ...s,
      courses: dedupeSemesterCourses(s.courses || [])
    }));
    setSemesters(sanitized);
    saveStateToLocalStorage(
      mode,
      isOnboarded,
      sanitized,
      thesisTrack,
      thesisSteps,
      projectCompleted,
      internshipCompleted,
      onboardingData
    );
  };

  const handleModeToggle = () => {
    const nextMode = mode === 'tracker' ? 'gpa' : 'tracker';
    setMode(nextMode);
    saveStateToLocalStorage(
      nextMode,
      isOnboarded,
      semesters,
      thesisTrack,
      thesisSteps,
      projectCompleted,
      internshipCompleted,
      onboardingData
    );
  };

  // Onboarding plan generation
  const generateInitialPlan = () => {
    const initialSemesters: Semester[] = [];
    const semNames = [
      "1st Semester",
      "2nd Semester",
      "3rd Semester",
      "4th Semester",
      "5th Semester",
      "6th Semester",
      "7th Semester",
      "8th Semester",
      "9th Semester",
      "10th Semester"
    ];

    const rsIndex = onboardingData.rsTerm === "3rd Semester" ? 2 : (onboardingData.rsTerm === "4th Semester" ? 3 : 4);

    // Create 10 semesters
    let semCounter = 1;
    for (let i = 0; i < 10; i++) {
      const isRS = i === rsIndex;
      const semName = isRS ? "Residential Semester (RS)" : semNames[i];
      initialSemesters.push({
        id: `sem-${i + 1}`,
        name: semName,
        courses: [],
        isRS
      });
    }

    const addedCourses = new Set<string>();

    // 1st Semester Courses (index 0)
    if (onboardingData.pathway === 'foundation') {
      if (onboardingData.remedialEng091Checked) {
        initialSemesters[0].courses.push({ code: "ENG091", grade: "A", isCompleted: true });
        addedCourses.add("ENG091");
      }
      if (onboardingData.remedialMat091Checked) {
        initialSemesters[0].courses.push({ code: "MAT091", grade: "A", isCompleted: true });
        addedCourses.add("MAT091");
      }
      if (onboardingData.remedialMat092Checked) {
        initialSemesters[0].courses.push({ code: "MAT092", grade: "A", isCompleted: true });
        addedCourses.add("MAT092");
      }
    } else if (onboardingData.pathway === 'credit') {
      if (onboardingData.creditOption === 'opt1') {
        initialSemesters[0].courses.push({ code: "ENG101", grade: "", isCompleted: false });
        addedCourses.add("ENG101");
      } else if (onboardingData.creditOption === 'opt2') {
        initialSemesters[0].courses.push({ code: "ENG102", grade: "", isCompleted: false });
        addedCourses.add("ENG102");
      }
    }

    // Pre-populate preceding English courses if they passed them
    if (onboardingData.engStatusPriorToRS === 'caseA') {
      if (!addedCourses.has("ENG101")) {
        const targetSemIdx = onboardingData.pathway === 'foundation' ? 1 : 0;
        initialSemesters[targetSemIdx].courses.push({ code: "ENG101", grade: "", isCompleted: false });
        addedCourses.add("ENG101");
      }
    } else if (onboardingData.engStatusPriorToRS === 'caseB') {
      if (!addedCourses.has("ENG101")) {
        initialSemesters[0].courses.push({ code: "ENG101", grade: "", isCompleted: false });
        addedCourses.add("ENG101");
      }
      if (!addedCourses.has("ENG102")) {
        const targetSemIdx = onboardingData.pathway === 'foundation' ? 2 : 1;
        initialSemesters[targetSemIdx].courses.push({ code: "ENG102", grade: "", isCompleted: false });
        addedCourses.add("ENG102");
      }
    } else if (onboardingData.engStatusPriorToRS === 'caseC') {
      if (!addedCourses.has("ENG101")) {
        initialSemesters[0].courses.push({ code: "ENG101", grade: "", isCompleted: false });
        addedCourses.add("ENG101");
      }
    } else if (onboardingData.engStatusPriorToRS === 'caseD') {
      if (!addedCourses.has("ENG102")) {
        initialSemesters[0].courses.push({ code: "ENG102", grade: "", isCompleted: false });
        addedCourses.add("ENG102");
      }
    }

    // RS Semester card populating (index rsIndex)
    // Part 1: Three universal mandatory core courses (EMB101, HUM103, BNG103)
    initialSemesters[rsIndex].courses.push({ code: "EMB101", grade: "", isCompleted: false });
    addedCourses.add("EMB101");
    initialSemesters[rsIndex].courses.push({ code: "HUM103", grade: "", isCompleted: false });
    addedCourses.add("HUM103");
    initialSemesters[rsIndex].courses.push({ code: "BNG103", grade: "", isCompleted: false });
    addedCourses.add("BNG103");

    // Part 2: English / BU201 Conditional Rule (dynamic placement)
    const eng102Done = addedCourses.has("ENG102");
    const fourthCourse = eng102Done ? "BU201" : "ENG102";
    initialSemesters[rsIndex].courses.push({ code: fourthCourse, grade: "", isCompleted: false });
    addedCourses.add(fourthCourse);

    // Distribute remaining mandatory courses
    const coreDistributionList = [
      "MAT110", "CSE110", 
      "MAT120", "CSE111", "PHY111",
      "CSE220", "CSE230", "PHY112",
      "CSE221", "CSE250", "STA201",
      "BNG103", "HUM103", "CSE251",
      "CSE260", "MAT215", "CSE320",
      "CSE321", "MAT216", "CSE330",
      "CSE331", "CSE340", "CSE341",
      "CSE350", "CSE360", "CSE370",
      "CSE420", "CSE421", "CSE422",
      "CSE423", "CSE460", "CSE461",
      "CSE470", "CSE471"
    ];

    coreDistributionList.forEach(courseCode => {
      if (addedCourses.has(courseCode)) return;

      let placed = false;
      for (let sIdx = 0; sIdx < 10; sIdx++) {
        if (sIdx === rsIndex) continue;

        if (initialSemesters[sIdx].courses.length < 4) {
          initialSemesters[sIdx].courses.push({ code: courseCode, grade: "", isCompleted: false });
          addedCourses.add(courseCode);
          placed = true;
          break;
        }
      }

      if (!placed) {
        const fallbackIdx = 9;
        initialSemesters[fallbackIdx].courses.push({ code: courseCode, grade: "", isCompleted: false });
        addedCourses.add(courseCode);
      }
    });

    if (!addedCourses.has("CSE400")) {
      const cse400Idx = 8;
      initialSemesters[cse400Idx].courses.push({ code: "CSE400", grade: "", isCompleted: false });
      addedCourses.add("CSE400");
    }

    setSemesters(initialSemesters);
    setIsOnboarded(true);
    setWizardStep(1);

    // Sync
    saveStateToLocalStorage(
      mode,
      true,
      initialSemesters,
      thesisTrack,
      thesisSteps,
      projectCompleted,
      internshipCompleted,
      onboardingData
    );
  };

  // Reset all app data
  const handleResetData = () => {
    localStorage.removeItem("bracu_course_tracker_state");
    localStorage.removeItem("bracu_cse_tracker_welcome_shown");
    localStorage.removeItem("flow136_view_mode");
    localStorage.removeItem("flow136_tutorial_completed");
    window.location.reload();
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const stateExport = {
      mode,
      isOnboarded,
      semesters,
      thesisTrack,
      thesisSteps,
      projectCompleted,
      internshipCompleted,
      onboardingData
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stateExport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "Flow136_Backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Generate & Download Academic Progress Snapshot PNG Image
  const handleGenerateGradeSheet = async () => {
    setIsGeneratingSnapshot(true);
    try {
      const node = document.getElementById("flow136-grade-sheet-export-node");
      if (!node) {
        setIsGeneratingSnapshot(false);
        return;
      }

      // Micro-delay to let DOM state settle
      await new Promise(res => setTimeout(res, 50));

      const scrollParent = (node.closest(".overflow-y-auto") || node.parentElement) as HTMLElement;
      const originalScrollTop = scrollParent ? scrollParent.scrollTop : 0;
      const originalScrollLeft = scrollParent ? scrollParent.scrollLeft : 0;

      // Temporarily scroll parent container to top to prevent html-to-image cropping bug
      if (scrollParent) {
        scrollParent.scrollTop = 0;
        scrollParent.scrollLeft = 0;
      }

      const width = node.offsetWidth || 750;
      const height = node.offsetHeight || node.scrollHeight;

      toBlob(node, {
        cacheBust: true,
        skipFonts: false,
        pixelRatio: 2.0, // Clean, high-definition output
        backgroundColor: '#050507',
        width: width,
        height: height,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          maxHeight: 'none',
          overflow: 'visible',
          transform: 'none',
          margin: '0 auto'
        }
      } as any).then((blob) => {
        // Restore parent scroll positions immediately after canvas paint completes
        if (scrollParent) {
          scrollParent.scrollTop = originalScrollTop;
          scrollParent.scrollLeft = originalScrollLeft;
        }

        if (!blob) {
          throw new Error("Blob generation failed");
        }
        // Programmatic fast-download
        const url = URL.createObjectURL(blob);
        const filename = `Flow136_Progress_${cumulativeStats.completedCredits}cr.png`;
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        // Cleanup memory
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setIsGeneratingSnapshot(false);
      }).catch((err) => {
        // Guarantee parent scroll state recovery in error path
        if (scrollParent) {
          scrollParent.scrollTop = originalScrollTop;
          scrollParent.scrollLeft = originalScrollLeft;
        }
        console.error('Image export failed:', err);
        setIsGeneratingSnapshot(false);
      });

    } catch (err) {
      console.error("Failed to generate grade sheet snapshot image:", err);
      setIsGeneratingSnapshot(false);
    }
  };

  // Toggle view mode preference
  const handleToggleViewMode = (mode: 'list' | 'kanban') => {
    setViewMode(mode);
    localStorage.setItem("flow136_view_mode", mode);
  };

  // Move a course from one semester to another via drag-and-drop (Atomic state transition)
  const handleDragMoveCourse = (courseCode: string, sourceSemesterId: string, targetSemesterId: string) => {
    if (sourceSemesterId === targetSemesterId) return;

    const targetSem = semesters.find(s => s.id === targetSemesterId);
    if (targetSem && targetSem.courses.some(c => c.code === courseCode)) {
      setDragOverSemesterId(null);
      return;
    }

    const sourceSem = semesters.find(s => s.id === sourceSemesterId);
    const courseObj = sourceSem?.courses.find(c => c.code === courseCode);
    if (!courseObj) return;

    handleMoveCourse(sourceSemesterId, targetSemesterId, courseObj);
    setDragOverSemesterId(null);
  };

  // Import JSON Backup
  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    setBackupFileError(null);
    const fileReader = new FileReader();
    const files = event.target.files;
    
    if (!files || files.length === 0) return;
    
    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.semesters && Array.isArray(parsed.semesters)) {
          if (parsed.mode) setMode(parsed.mode);
          if (parsed.isOnboarded !== undefined) setIsOnboarded(parsed.isOnboarded);
          setSemesters(parsed.semesters);
          if (parsed.thesisTrack) setThesisTrack(parsed.thesisTrack);
          if (parsed.thesisSteps) setThesisSteps(parsed.thesisSteps);
          if (parsed.projectCompleted !== undefined) setProjectCompleted(parsed.projectCompleted);
          if (parsed.internshipCompleted !== undefined) setInternshipCompleted(parsed.internshipCompleted);
          if (parsed.onboardingData) setOnboardingData(parsed.onboardingData);

          // Save
          saveStateToLocalStorage(
            parsed.mode || mode,
            parsed.isOnboarded !== undefined ? parsed.isOnboarded : isOnboarded,
            parsed.semesters,
            parsed.thesisTrack || thesisTrack,
            parsed.thesisSteps || thesisSteps,
            parsed.projectCompleted !== undefined ? parsed.projectCompleted : projectCompleted,
            parsed.internshipCompleted !== undefined ? parsed.internshipCompleted : internshipCompleted,
            parsed.onboardingData || onboardingData
          );
        } else {
          setBackupFileError("Invalid backup file: Missing semesters layout.");
        }
      } catch (err) {
        setBackupFileError("Failed to parse the backup file. Please ensure it is a valid JSON file.");
      }
    };
    fileReader.readAsText(files[0]);
  };

  // Capstone completion logic based on selected Track and active Mode
  const isCSE400Passed = useMemo(() => {
    let milestonesDone = false;
    if (thesisTrack === 'thesis') {
      milestonesDone = !!(thesisSteps.step1 && thesisSteps.step2 && thesisSteps.step3);
    } else if (thesisTrack === 'project') {
      milestonesDone = !!projectCompleted;
    } else {
      milestonesDone = !!internshipCompleted;
    }

    if (!milestonesDone) return false;

    if (mode === 'gpa') {
      let capstoneGrade = "";
      for (const sem of semesters) {
        const found = sem.courses.find(c => c.code === "CSE400");
        if (found) {
          capstoneGrade = found.grade || "";
          break;
        }
      }
      return capstoneGrade !== "" && capstoneGrade !== "F";
    }

    return true;
  }, [thesisTrack, thesisSteps, projectCompleted, internshipCompleted, mode, semesters]);

  // Master completion rule: if final thesis defended is checked, check step 1 and step 2
  const handleThesisStep3Toggle = (checked: boolean) => {
    const newSteps = {
      step1: checked ? true : thesisSteps.step1,
      step2: checked ? true : thesisSteps.step2,
      step3: checked
    };
    setThesisSteps(newSteps);
    
    // Update grade logic for CSE400 if passed
    const updated = semesters.map(sem => ({
      ...sem,
      courses: sem.courses.map(c => {
        if (c.code === "CSE400") {
          return {
            ...c,
            isCompleted: checked
          };
        }
        return c;
      })
    }));
    updateSemesters(updated);
  };

  // Simulated semesters for the tutorial step 10 to show Repeat ROI boost example
  const simulatedSemesters = useMemo(() => {
    if (tutorialStep === 9) {
      if (semesters.length > 0) {
        return semesters.map((sem, idx) => {
          if (idx === 0) {
            const hasCSE110 = sem.courses.some(c => c.code === "CSE110");
            const newCourses = hasCSE110
              ? sem.courses.map(c => c.code === "CSE110" ? { ...c, isCompleted: true, grade: "B-" } : c)
              : [...sem.courses, { code: "CSE110", isCompleted: true, grade: "B-" }];
            return {
              ...sem,
              courses: newCourses
            };
          }
          return sem;
        });
      }
    }
    return semesters;
  }, [semesters, tutorialStep]);

  // Unique courses dictionary representing the most recent attempts
  // Needed for "Math Rule" (factoring in only newest attempt into credit count and cumulative CGPA)
  const newestCourseAttempts = useMemo(() => {
    const result: Record<string, { semesterIdx: number; course: SelectedCourse }> = {};

    simulatedSemesters.forEach((sem, semIdx) => {
      sem.courses.forEach(c => {
        // Chronologically latest attempt always replaces any previous attempt
        result[c.code] = { semesterIdx: semIdx, course: c };
      });
    });

    return result;
  }, [simulatedSemesters]);

  const isCourseMandatory = useCallback((code: string) => {
    const c = COURSES.find(co => co.code === code);
    if (!c) return false;

    // Scenario B English overrides
    const isScenarioB = onboardingData.pathway === 'credit' && (onboardingData.creditOption === 'opt2' || onboardingData.engStatusPriorToRS === 'caseD');
    if (isScenarioB) {
      if (code === "ENG101") return false;
      if (code === "ENG103") return true;
    } else {
      if (code === "ENG103") return false;
    }

    if (c.category === "School Core (Math & Sciences)") return true;

    return c.mandatory;
  }, [onboardingData.pathway, onboardingData.creditOption, onboardingData.engStatusPriorToRS]);

  const renderMandatoryBadge = useCallback((code: string) => {
    const isScenarioB = onboardingData.pathway === 'credit' && (onboardingData.creditOption === 'opt2' || onboardingData.engStatusPriorToRS === 'caseD');
    
    if (code === "ENG103" && isScenarioB) {
      return (
        <span 
          title="Mandatory Requirement: Because you placed directly into ENG102, ENG103 is required to fulfill your 6-credit GenEd Stream 1 writing comprehension requirement."
          className="text-[9px] font-extrabold border border-amber-500/30 text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider cursor-help select-none shadow-sm"
        >
          Mandatory Core
        </span>
      );
    }

    const isMand = isCourseMandatory(code);
    if (isMand) {
      return (
        <span className="text-[9px] font-extrabold border border-amber-500/30 text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider select-none shadow-sm">
          Mandatory Core
        </span>
      );
    } else {
      return (
        <span className="text-[9px] font-extrabold border border-slate-700/60 text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded-full uppercase tracking-wider select-none">
          Elective
        </span>
      );
    }
  }, [onboardingData.pathway, onboardingData.creditOption, onboardingData.engStatusPriorToRS, isCourseMandatory]);

  const getCategoryTheme = useCallback((category?: string, code?: string) => {
    let cat = category;
    if (!cat && code) {
      const found = COURSES.find(c => c.code === code);
      cat = found?.category || "";
    }
    switch (cat) {
      case "Program Core":
        return {
          label: "Program Core",
          badge: "bg-blue-500/15 border-blue-500/30 text-blue-300",
          cardBorder: "border-blue-500/25 hover:border-blue-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(59,130,246,0.06)]",
          codePill: "text-blue-300 border-blue-500/30 bg-blue-950/40",
          accentColor: "#3b82f6",
          leftBar: "bg-blue-500"
        };
      case "School Core (Math & Sciences)":
        return {
          label: "School Core",
          badge: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          cardBorder: "border-cyan-500/25 hover:border-cyan-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(6,182,212,0.06)]",
          codePill: "text-cyan-300 border-cyan-500/30 bg-cyan-950/40",
          accentColor: "#06b6d4",
          leftBar: "bg-cyan-500"
        };
      case "Capstone (Thesis / Project / Internship)":
        return {
          label: "Capstone",
          badge: "bg-purple-500/15 border-purple-500/30 text-purple-300",
          cardBorder: "border-purple-500/25 hover:border-purple-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(168,85,247,0.06)]",
          codePill: "text-purple-300 border-purple-500/30 bg-purple-950/40",
          accentColor: "#a855f7",
          leftBar: "bg-purple-500"
        };
      case "CSE Major Elective":
        return {
          label: "CSE Elective",
          badge: "bg-amber-500/15 border-amber-500/30 text-amber-300",
          cardBorder: "border-amber-500/25 hover:border-amber-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(245,158,11,0.06)]",
          codePill: "text-amber-300 border-amber-500/30 bg-amber-950/40",
          accentColor: "#f59e0b",
          leftBar: "bg-amber-500"
        };
      case "GenEd Stream 1":
        return {
          label: "Stream 1",
          badge: "bg-rose-500/15 border-rose-500/30 text-rose-300",
          cardBorder: "border-rose-500/25 hover:border-rose-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(244,63,94,0.06)]",
          codePill: "text-rose-300 border-rose-500/30 bg-rose-950/40",
          accentColor: "#f43f5e",
          leftBar: "bg-rose-500"
        };
      case "GenEd Stream 2":
        return {
          label: "Stream 2",
          badge: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300",
          cardBorder: "border-indigo-500/25 hover:border-indigo-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(99,102,241,0.06)]",
          codePill: "text-indigo-300 border-indigo-500/30 bg-indigo-950/40",
          accentColor: "#6366f1",
          leftBar: "bg-indigo-500"
        };
      case "GenEd Stream 3":
        return {
          label: "Stream 3",
          badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
          cardBorder: "border-emerald-500/25 hover:border-emerald-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(16,185,129,0.06)]",
          codePill: "text-emerald-300 border-emerald-500/30 bg-emerald-950/40",
          accentColor: "#10b981",
          leftBar: "bg-emerald-500"
        };
      case "GenEd Stream 4":
        return {
          label: "Stream 4",
          badge: "bg-violet-500/15 border-violet-500/30 text-violet-300",
          cardBorder: "border-violet-500/25 hover:border-violet-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(139,92,246,0.06)]",
          codePill: "text-violet-300 border-violet-500/30 bg-violet-950/40",
          accentColor: "#8b5cf6",
          leftBar: "bg-violet-500"
        };
      case "GenEd Stream 5":
        return {
          label: "Stream 5",
          badge: "bg-teal-500/15 border-teal-500/30 text-teal-300",
          cardBorder: "border-teal-500/25 hover:border-teal-500/50",
          cardGlow: "shadow-[0_0_15px_rgba(20,184,166,0.06)]",
          codePill: "text-teal-300 border-teal-500/30 bg-teal-950/40",
          accentColor: "#14b8a6",
          leftBar: "bg-teal-500"
        };
      case "Non-Credit":
        return {
          label: "Non-Credit",
          badge: "bg-zinc-800/50 border-zinc-700/60 text-slate-400",
          cardBorder: "border-zinc-800/80 hover:border-zinc-700/80",
          cardGlow: "",
          codePill: "text-slate-300 border-zinc-700/60 bg-zinc-900/60",
          accentColor: "#64748b",
          leftBar: "bg-slate-600"
        };
      default:
        return {
          label: "Elective",
          badge: "bg-zinc-800/50 border-zinc-700/60 text-slate-400",
          cardBorder: "border-zinc-800/80 hover:border-zinc-700/80",
          cardGlow: "",
          codePill: "text-slate-300 border-zinc-700/60 bg-zinc-900/60",
          accentColor: "#64748b",
          leftBar: "bg-slate-600"
        };
    }
  }, []);

  // Chronological term/year calculation for semesters
  const semesterIntakes = useMemo(() => {
    return calculateSemesterIntakes(semesters, {
      term: onboardingData.startingTerm || 'Spring',
      year: onboardingData.startingYear || 2025
    });
  }, [semesters, onboardingData.startingTerm, onboardingData.startingYear]);

  // Repeat ROI Recommendations & Multi-Course Simulation for Mode B
  const roiAnalysis = useMemo(() => {
    if (mode !== 'gpa') return {
      currentCgpa: 0,
      totalCgpaCredits: 0,
      candidates: [],
      combinedSelectedCount: 0,
      combinedSelectedCredits: 0,
      combinedNewCgpa: 0,
      combinedDelta: 0,
      hasDecreases: false,
      hasIncreases: false,
    };

    let totalCgpaCredits = 0;
    let totalCgpaPoints = 0;

    Object.keys(newestCourseAttempts).forEach(code => {
      const { course } = newestCourseAttempts[code];
      const courseData = COURSES.find(co => co.code === code);
      const credits = code === "CSE400" ? 4 : (courseData?.credits ?? 3);

      if (courseData?.category === "Non-Credit" || (courseData?.credits ?? 0) === 0) return;

      if (course.isCompleted && course.grade && GRADING_SCALE[course.grade] !== undefined) {
        totalCgpaCredits += credits;
        totalCgpaPoints += GRADING_SCALE[course.grade] * credits;
      }
    });

    const currentCgpa = totalCgpaCredits > 0 ? (totalCgpaPoints / totalCgpaCredits) : 0.00;

    const thresholdGp = roiThresholdGrade === 'all'
      ? 4.0
      : (GRADING_SCALE[roiThresholdGrade] ?? 2.7);

    const candidates: {
      code: string;
      title: string;
      credits: number;
      currentGrade: string;
      currentGp: number;
      targetGrade: string;
      targetGp: number;
      isSelected: boolean;
      delta: number;
      newCgpa: number;
      isF: boolean;
    }[] = [];

    Object.keys(newestCourseAttempts).forEach(code => {
      const { course } = newestCourseAttempts[code];
      const courseData = COURSES.find(co => co.code === code);
      const credits = code === "CSE400" ? 4 : (courseData?.credits ?? 3);

      if (courseData?.category === "Non-Credit" || (courseData?.credits ?? 0) === 0) return;

      if (course.isCompleted && course.grade && GRADING_SCALE[course.grade] !== undefined) {
        const currentGp = GRADING_SCALE[course.grade];
        const isF = course.grade === 'F';

        // Courses with F are always automatically included; other courses check against threshold
        const isEligible = isF || (roiThresholdGrade === 'all' ? currentGp < 4.0 : currentGp <= thresholdGp);

        if (isEligible) {
          const targetGrade = roiTargetGrades[code] || "A";
          const targetGp = GRADING_SCALE[targetGrade] ?? 4.0;
          const isSelected = selectedRoiCourses[code] ?? true;

          // Single course delta
          const singleNewPoints = totalCgpaPoints - (currentGp * credits) + (targetGp * credits);
          const singleNewCgpa = totalCgpaCredits > 0 ? (singleNewPoints / totalCgpaCredits) : 0;
          const delta = singleNewCgpa - currentCgpa;

          candidates.push({
            code,
            title: courseData?.title || code,
            credits,
            currentGrade: course.grade,
            currentGp,
            targetGrade,
            targetGp,
            isSelected,
            delta,
            newCgpa: singleNewCgpa,
            isF
          });
        }
      }
    });

    // Sort candidates by potential boost with target grade
    candidates.sort((a, b) => b.delta - a.delta);

    // Calculate combined effect for selected courses
    let combinedPointDelta = 0;
    let combinedSelectedCount = 0;
    let combinedSelectedCredits = 0;
    let hasDecreases = false;
    let hasIncreases = false;

    candidates.forEach(c => {
      if (c.isSelected) {
        combinedSelectedCount++;
        combinedSelectedCredits += c.credits;
        const ptDelta = (c.targetGp - c.currentGp) * c.credits;
        combinedPointDelta += ptDelta;
        if (c.targetGp < c.currentGp) {
          hasDecreases = true;
        } else if (c.targetGp > c.currentGp) {
          hasIncreases = true;
        }
      }
    });

    const combinedNewPoints = totalCgpaPoints + combinedPointDelta;
    const combinedNewCgpa = totalCgpaCredits > 0 ? (combinedNewPoints / totalCgpaCredits) : 0;
    const combinedDelta = combinedNewCgpa - currentCgpa;

    return {
      currentCgpa,
      totalCgpaCredits,
      candidates,
      combinedSelectedCount,
      combinedSelectedCredits,
      combinedNewCgpa,
      combinedDelta,
      hasDecreases,
      hasIncreases
    };
  }, [newestCourseAttempts, mode, roiThresholdGrade, roiTargetGrades, selectedRoiCourses]);

  const roiRecommendations = roiAnalysis.candidates;



  // Semester GPA calculations (all courses taken in that semester count)
  const semesterStats = useMemo(() => {
    return simulatedSemesters.map(sem => {
      let totalLoad = 0;
      let gradableCredits = 0;
      let totalPoints = 0;
      let hasGrades = false;

      sem.courses.forEach(c => {
        if (c.code === "CSE400") return;
        const courseData = COURSES.find(co => co.code === c.code);
        const credits = courseData?.credits ?? 3;
        
        // Non-credit courses carry 0 credits
        if (courseData?.category === "Non-Credit") return;

        totalLoad += credits;

        let isComp = c.isCompleted;
        if (mode === 'gpa' && isComp && c.grade && GRADING_SCALE[c.grade] !== undefined) {
          gradableCredits += credits;
          totalPoints += GRADING_SCALE[c.grade] * credits;
          hasGrades = true;
        }
      });

      return {
        id: sem.id,
        credits: totalLoad,
        gpa: gradableCredits > 0 ? (totalPoints / gradableCredits) : null,
        hasGrades
      };
    });
  }, [semesters, mode]);

  // Cumulative Stats using the Math Rule (newest attempt only)
  const cumulativeStats = useMemo(() => {
    // 1. Total Degree Credits Engine: count unique credit-bearing courses completed/passed in ANY semester
    const completedUniqueCourses = new Set<string>();
    semesters.forEach(sem => {
      sem.courses.forEach(c => {
        const courseData = COURSES.find(co => co.code === c.code);
        if (courseData?.category === "Non-Credit" || (courseData?.credits ?? 0) === 0) return;

        let isComp = mode === 'tracker' 
          ? c.isCompleted 
          : (c.isCompleted && c.grade !== "" && c.grade !== "F");
        if (c.code === "CSE400") {
          isComp = isCSE400Passed;
        }

        if (isComp) {
          completedUniqueCourses.add(c.code);
        }
      });
    });

    let totalCompletedCredits = 0;
    completedUniqueCourses.forEach(code => {
      const courseData = COURSES.find(co => co.code === code);
      const credits = code === "CSE400" ? 4 : (courseData?.credits ?? 3);
      totalCompletedCredits += credits;
    });

    // 2. Cumulative CGPA Engine: includes only the latest graded attempt
    let totalCgpaCredits = 0;
    let totalCgpaPoints = 0;

    Object.keys(newestCourseAttempts).forEach(code => {
      const { course } = newestCourseAttempts[code];
      const courseData = COURSES.find(co => co.code === code);
      const credits = code === "CSE400" ? 4 : (courseData?.credits ?? 3);

      if (courseData?.category === "Non-Credit") return;

      let isComp = course.isCompleted;
      if (code === "CSE400") {
        isComp = isCSE400Passed;
      }
      if (mode === 'gpa' && isComp && course.grade && GRADING_SCALE[course.grade] !== undefined) {
        totalCgpaCredits += credits;
        totalCgpaPoints += GRADING_SCALE[course.grade] * credits;
      }
    });

    return {
      completedCredits: totalCompletedCredits,
      cgpa: totalCgpaCredits > 0 ? (totalCgpaPoints / totalCgpaCredits) : 0.00
    };
  }, [semesters, newestCourseAttempts, mode, isCSE400Passed]);

  // Target CGPA Solver calculation for Mode B
  const targetSolverResult = useMemo(() => {
    const targetVal = parseFloat(targetCgpa) || 0;
    const completedCredits = cumulativeStats.completedCredits;
    const currentCgpa = cumulativeStats.cgpa;
    const remainingCredits = Math.max(0, 136 - completedCredits);

    if (remainingCredits <= 0) {
      return {
        isAchieved: true,
        requiredGpa: 0,
        maxPossibleCgpa: currentCgpa,
        remainingCredits: 0
      };
    }

    const requiredGpa = ((targetVal * 136) - (currentCgpa * completedCredits)) / remainingCredits;
    const maxPossibleCgpa = ((currentCgpa * completedCredits) + (4.00 * remainingCredits)) / 136;

    let letterEquivalent = "A";
    if (requiredGpa > 3.7) letterEquivalent = "A";
    else if (requiredGpa > 3.3) letterEquivalent = "A-";
    else if (requiredGpa > 3.0) letterEquivalent = "B+";
    else if (requiredGpa > 2.7) letterEquivalent = "B";
    else if (requiredGpa > 2.3) letterEquivalent = "B-";
    else if (requiredGpa > 2.0) letterEquivalent = "C+";
    else if (requiredGpa > 1.7) letterEquivalent = "C";
    else if (requiredGpa > 1.3) letterEquivalent = "C-";
    else if (requiredGpa > 1.0) letterEquivalent = "D+";
    else if (requiredGpa > 0.7) letterEquivalent = "D";
    else if (requiredGpa > 0.0) letterEquivalent = "D-";
    else letterEquivalent = "F";

    return {
      isAchieved: false,
      requiredGpa,
      maxPossibleCgpa,
      remainingCredits,
      letterEquivalent
    };
  }, [targetCgpa, cumulativeStats]);

  // First semester GPA alert (Standing rule: Semester 1 GPA < 1.00 triggers warning)
  const firstSemesterGpa = useMemo(() => {
    const sem1 = semesterStats.find(s => s.id === "sem-1");
    return sem1?.gpa ?? null;
  }, [semesterStats]);

  // Prerequisite validations
  // Checks hard and soft prerequisites for each course scheduled in each semester card
  const prerequisiteWarnings = useMemo(() => {
    const warnings: Record<string, { type: 'hard' | 'soft'; missing: string[] }> = {};

    semesters.forEach((sem, semIdx) => {
      sem.courses.forEach(c => {
        const { hp, sp } = getCoursePrereqs(c.code, onboardingData.pathway, onboardingData.creditOption);

        // Check Hard Prerequisites (blocking)
        const missingHp = hp.filter(code => !isCourseCompletedPrior(code, semIdx, semesters, mode));
        if (missingHp.length > 0) {
          warnings[`${sem.id}_${c.code}`] = { type: 'hard', missing: missingHp };
          return; // Hard warning takes priority
        }

        // Check Soft Prerequisites (advisory)
        const missingSp = sp.filter(code => !isCourseCompletedPrior(code, semIdx, semesters, mode));
        if (missingSp.length > 0) {
          warnings[`${sem.id}_${c.code}`] = { type: 'soft', missing: missingSp };
        }
      });
    });

    return warnings;
  }, [semesters, mode, onboardingData.pathway, onboardingData.creditOption]);

  // Retake & Repeat Badges and Warnings
  // Evaluates every course row contextually
  const courseAttemptStats = useMemo(() => {
    const history: Record<string, SelectedCourse[]> = {};
    const result: Record<string, { badge: string; isError: boolean; statusText: string }> = {};

    semesters.forEach(sem => {
      sem.courses.forEach(c => {
        if (!history[c.code]) {
          history[c.code] = [];
        }
        history[c.code].push(c);
        
        const attempts = history[c.code];
        const attemptIndex = attempts.length; // 1-indexed

        if (attemptIndex === 1) {
          result[`${sem.id}_${c.code}`] = { badge: "", isError: false, statusText: "" };
        } else {
          // Repeat/Retake checks
          // Check if previous attempts failed (all F or not completed)
          const allPreviousFailed = attempts.slice(0, -1).every(prev => {
            return mode === 'tracker' ? !prev.isCompleted : prev.grade === 'F';
          });

          if (allPreviousFailed) {
            // It's a Retake
            if (attemptIndex === 2) {
              result[`${sem.id}_${c.code}`] = { 
                badge: "Retake (1 of 2 used)", 
                isError: false, 
                statusText: "Second attempt after failing previously." 
              };
            } else if (attemptIndex === 3) {
              result[`${sem.id}_${c.code}`] = { 
                badge: "Retake (2 of 2 used)", 
                isError: false, 
                statusText: "Final allowed retake attempt." 
              };
            } else {
              result[`${sem.id}_${c.code}`] = { 
                badge: "Max retakes exceeded", 
                isError: true, 
                statusText: "Max retakes exceeded. Special department head permission required." 
              };
            }
          } else {
            // It's a Repeat (some previous attempt passed)
            if (attemptIndex === 2) {
              result[`${sem.id}_${c.code}`] = { 
                badge: "Repeat (Grade Improvement)", 
                isError: false, 
                statusText: "Grade Improvement repeat (limit once)." 
              };
            } else {
              result[`${sem.id}_${c.code}`] = { 
                badge: "Repeat limit exceeded", 
                isError: true, 
                statusText: "Course has already been repeated once after passing." 
              };
            }
          }
        }
      });
    });

    return result;
  }, [semesters, mode]);

  // Curriculum category-wise credit counts and progress
  const curriculumProgress = useMemo(() => {
    // Set of course codes completed
    const completedCodes = new Set<string>();

    semesters.forEach(sem => {
      sem.courses.forEach(c => {
        let isComp = mode === 'tracker'
          ? c.isCompleted
          : (c.isCompleted && c.grade !== "" && c.grade !== "F");
        if (c.code === "CSE400") {
          isComp = isCSE400Passed;
        }
        if (isComp) {
          completedCodes.add(c.code);
        }
      });
    });

    const isScenarioB = onboardingData.pathway === 'credit' && (onboardingData.creditOption === 'opt2' || onboardingData.engStatusPriorToRS === 'caseD');

    // 1. Program Core (Mandatory): Target = 75 Credits (CSE400 Thesis is tracked separately)
    let coreCompleted = 0;
    COURSES.forEach(c => {
      if (c.code === "CSE400") return; // Tracked separately
      if (c.category === "CSE Program Core" && c.mandatory) {
        if (completedCodes.has(c.code)) {
          coreCompleted += c.credits;
        }
      }
    });

    // 2. School Core (Math & Sciences): Target = 12 Credits (4 courses)
    let schoolCoreCompleted = 0;
    const schoolCoreList = ["MAT120", "MAT215", "MAT216", "PHY112"];
    schoolCoreList.forEach(code => {
      if (completedCodes.has(code)) {
        schoolCoreCompleted += 3;
      }
    });

    // 3. CSE Major Electives: Target = 6 Credits
    let electiveCompleted = 0;
    COURSES.forEach(c => {
      if (c.category === "CSE Major Elective" && completedCodes.has(c.code)) {
        electiveCompleted += c.credits;
      }
    });

    // 4. GenEd Stream 1 (Writing Comprehension): Target = 6 Credits (2 courses)
    let stream1Completed = 0;
    if (isScenarioB) {
      if (completedCodes.has("ENG102")) stream1Completed += 3;
      if (completedCodes.has("ENG103")) stream1Completed += 3;
    } else {
      if (completedCodes.has("ENG101")) stream1Completed += 3;
      if (completedCodes.has("ENG102")) stream1Completed += 3;
    }

    // 5. GenEd Stream 2 (Math & Natural Sciences): Target = 9 Credits (3 courses)
    // Mandatory for CSE: MAT110, PHY111, STA201
    let stream2Completed = 0;
    const stream2CoreList = ["MAT110", "PHY111", "STA201"];
    stream2CoreList.forEach(code => {
      if (completedCodes.has(code)) {
        stream2Completed += 3;
      }
    });

    // 6. GenEd Stream 3 (Arts & Humanities): Target = 9 Credits (3 courses)
    // Mandatory: BNG103, HUM103. Elective: 1 course from stream 3.
    let stream3Completed = 0;
    if (completedCodes.has("BNG103")) stream3Completed += 3;
    if (completedCodes.has("HUM103")) stream3Completed += 3;

    const stream3ElectivePool = [
      "ENG110", "ENG113", "ENG114", "ENG115", "ENG333", "HST102", "HST103", "HST104",
      "HUM101", "HUM102", "HUM207", "HUM210", "HUM301"
    ];
    const stream3ElectivesCompleted: string[] = [];
    stream3ElectivePool.forEach(code => {
      if (completedCodes.has(code)) {
        stream3ElectivesCompleted.push(code);
      }
    });
    if (stream3ElectivesCompleted.length > 0) {
      stream3Completed += 3;
    }
    const stream3OverflowCount = Math.max(0, stream3ElectivesCompleted.length - 1);

    // 7. GenEd Stream 4 (Social Sciences): Target = 6 Credits (2 courses)
    // Mandatory: EMB101 only. Elective: 1 course from stream 4.
    let stream4Completed = 0;
    if (completedCodes.has("EMB101")) stream4Completed += 3;

    const stream4ElectivePool = [
      "ANT101", "ANT342", "ANT351", "BUS102", "BUS201", "BUS333", "BUS335",
      "DEV104", "DEV201", "ECO101", "ECO102", "ECO105", "POL101", "POL102",
      "POL103", "POL201", "POL202", "POL203", "POL210", "PSY101", "PSY102",
      "SOC101", "SOC201", "BU201"
    ];
    const stream4ElectivesCompleted: string[] = [];
    stream4ElectivePool.forEach(code => {
      if (completedCodes.has(code)) {
        stream4ElectivesCompleted.push(code);
      }
    });
    if (stream4ElectivesCompleted.length > 0) {
      stream4Completed += 3;
    }
    const stream4OverflowCount = Math.max(0, stream4ElectivesCompleted.length - 1);

    // 8. GenEd Stream 5 (CST): Target = 3 Credits (1 course)
    // Elective: 1 course from stream 5.
    let stream5Completed = 0;
    const stream5ElectivePool = [
      "CST201", "CST204", "CST301", "CST302", "CST303", "CST304", "CST305",
      "CST306", "CST307", "CST308", "CST309", "CST310", "CST314", "CST333", "BUS334"
    ];
    const stream5ElectivesCompleted: string[] = [];
    stream5ElectivePool.forEach(code => {
      if (completedCodes.has(code)) {
        stream5ElectivesCompleted.push(code);
      }
    });
    if (stream5ElectivesCompleted.length > 0) {
      stream5Completed += 3;
    }
    const stream5OverflowCount = Math.max(0, stream5ElectivesCompleted.length - 1);

    // 9. GenEd Electives (Free Choice): Target = 6 Credits (2 courses)
    // Overflow Rule: Track all completed courses already counted for primary stream requirements
    const alreadyCountedCodes = new Set<string>();

    // Stream 1 primary
    if (isScenarioB) {
      if (completedCodes.has("ENG102")) alreadyCountedCodes.add("ENG102");
      if (completedCodes.has("ENG103")) alreadyCountedCodes.add("ENG103");
    } else {
      if (completedCodes.has("ENG101")) alreadyCountedCodes.add("ENG101");
      if (completedCodes.has("ENG102")) alreadyCountedCodes.add("ENG102");
    }

    // Stream 2 primary
    stream2CoreList.forEach(code => {
      if (completedCodes.has(code)) alreadyCountedCodes.add(code);
    });

    // Stream 3 primary
    if (completedCodes.has("BNG103")) alreadyCountedCodes.add("BNG103");
    if (completedCodes.has("HUM103")) alreadyCountedCodes.add("HUM103");
    const firstStream3Elective = stream3ElectivePool.find(code => completedCodes.has(code));
    if (firstStream3Elective) alreadyCountedCodes.add(firstStream3Elective);

    // Stream 4 primary
    if (completedCodes.has("EMB101")) alreadyCountedCodes.add("EMB101");
    const firstStream4Elective = stream4ElectivePool.find(code => completedCodes.has(code));
    if (firstStream4Elective) alreadyCountedCodes.add(firstStream4Elective);

    // Stream 5 primary
    const firstStream5Elective = stream5ElectivePool.find(code => completedCodes.has(code));
    if (firstStream5Elective) alreadyCountedCodes.add(firstStream5Elective);

    let overflowCredits = 0;
    completedCodes.forEach(code => {
      if (alreadyCountedCodes.has(code)) return;
      if (code.startsWith("CSE")) return;
      if (schoolCoreList.includes(code)) return;
      if (["CSE101", "MAT101", "PHY101", "STA101"].includes(code)) return;

      const courseInfo = COURSES.find(co => co.code === code);
      const cr = courseInfo ? courseInfo.credits : 3;
      if (cr === 0) return;

      overflowCredits += cr;
    });

    const freeGenEdCredits = Math.min(6, overflowCredits);

    return {
      coreCompleted,
      coreTotal: 75,
      schoolCoreCompleted,
      schoolCoreTotal: 12,
      electiveCompleted,
      electiveTotal: 6,
      stream1Completed,
      stream1Total: 6,
      stream2Completed,
      stream2Total: 9,
      stream3Completed,
      stream3Total: 9,
      stream4Completed,
      stream4Total: 6,
      stream5Completed,
      stream5Total: 3,
      freeGenEdCredits,
      freeGenEdTotal: 6,
      thesisCompleted: isCSE400Passed ? 4 : 0,
      thesisTotal: 4
    };
  }, [semesters, mode, isCSE400Passed, onboardingData.pathway, onboardingData.creditOption, onboardingData.engStatusPriorToRS]);

  // Semester cards operations
  const handleAddSemester = () => {
    const nextIdx = semesters.length + 1;
    const newSem: Semester = {
      id: `sem-custom-${Date.now()}`,
      name: `${nextIdx}th Semester`,
      courses: []
    };
    updateSemesters([...semesters, newSem]);
  };

  const isAnyExpanded = useMemo(() => {
    return semesters.some(sem => !sem.isCollapsed) || !isCapstoneCollapsed;
  }, [semesters, isCapstoneCollapsed]);

  const handleToggleAllCollapse = () => {
    const targetState = isAnyExpanded;
    const updated = semesters.map(sem => ({
      ...sem,
      isCollapsed: targetState
    }));
    updateSemesters(updated);
    setIsCapstoneCollapsed(targetState);
  };

  const handleOverrideIntake = (semId: string, term: 'Spring' | 'Summer' | 'Fall', year: number) => {
    const updated = semesters.map(sem => {
      if (sem.id === semId) {
        return { ...sem, term, year };
      }
      return sem;
    });
    updateSemesters(updated);
  };

  const handleMarkAsRS = (semId: string) => {
    const targetIdx = semesters.findIndex(s => s.id === semId);
    if (targetIdx === -1) return;

    let eng102CompletedBefore = false;
    for (let i = 0; i < targetIdx; i++) {
      const found = semesters[i].courses.find(c => c.code === "ENG102");
      if (found) {
        const isComp = mode === 'tracker'
          ? found.isCompleted
          : (found.isCompleted && found.grade !== "" && found.grade !== "F");
        if (isComp) {
          eng102CompletedBefore = true;
          break;
        }
      }
    }

    const fourthCourse = eng102CompletedBefore ? "BU201" : "ENG102";

    const updated = semesters.map((sem, idx) => {
      if (sem.id === semId) {
        return {
          ...sem,
          name: "Residential Semester (RS)",
          isRS: true,
          courses: [
            { code: "EMB101", grade: "", isCompleted: false },
            { code: "BNG103", grade: "", isCompleted: false },
            { code: "HUM103", grade: "", isCompleted: false },
            { code: fourthCourse, grade: "", isCompleted: false }
          ]
        };
      } else if (sem.isRS) {
        return {
          ...sem,
          name: `${idx + 1}th Semester`,
          isRS: false
        };
      }
      return sem;
    });

    updateSemesters(updated);
  };

  const handleDeleteSemester = (id: string) => {
    const updated = semesters.filter(s => s.id !== id);
    // Auto-adjust names to maintain clean index order if they are custom numbered
    const autoAdjusted = updated.map((sem, idx) => {
      if (sem.name.endsWith("Semester") && !sem.isRS) {
        return {
          ...sem,
          name: `${idx + 1}th Semester`
        };
      }
      return sem;
    });
    updateSemesters(autoAdjusted);
  };

  const handleRemoveCourse = (semId: string, courseCode: string, courseIdx?: number) => {
    const updated = semesters.map(sem => {
      if (sem.id === semId) {
        return {
          ...sem,
          courses: typeof courseIdx === 'number'
            ? sem.courses.filter((_, idx) => idx !== courseIdx)
            : sem.courses.filter(c => c.code !== courseCode)
        };
      }
      return sem;
    });
    updateSemesters(updated);
  };

  const handleAddCourseToSemester = (semId: string, courseCode: string) => {
    const targetSem = semesters.find(s => s.id === semId);
    if (!targetSem) return;

    // Strict duplicate check: if the semester already has this course, don't allow duplicate!
    if (swappingCourseCode) {
      if (courseCode !== swappingCourseCode && targetSem.courses.some(c => c.code === courseCode)) {
        return;
      }
    } else {
      if (targetSem.courses.some(c => c.code === courseCode)) {
        return;
      }
    }

    const updated = semesters.map(sem => {
      if (sem.id === semId) {
        if (swappingCourseCode) {
          return {
            ...sem,
            courses: sem.courses.map(c => {
              if (c.code === swappingCourseCode) {
                return { code: courseCode, grade: "", isCompleted: false };
              }
              return c;
            })
          };
        } else {
          return {
            ...sem,
            courses: [...sem.courses, { code: courseCode, grade: "", isCompleted: false }]
          };
        }
      }
      return sem;
    });
    updateSemesters(updated);
    setActiveCourseSelectorSemesterId(null);
    setSwappingCourseCode(null);
    setCourseSearchQuery("");
  };

  const handleAddCategoryCourse = () => {
    if (!selectedCategoryCourseCode || !selectedCategoryTargetSemesterId) return;
    setSwappingCourseCode(null);
    handleAddCourseToSemester(selectedCategoryTargetSemesterId, selectedCategoryCourseCode);
    setActiveCategorySelectorKey(null);
    setSelectedCategoryCourseCode("");
    setCategoryCourseSearchQuery("");
  };

  const handleMoveCourse = (sourceSemId: string, destSemId: string, course: SelectedCourse) => {
    const destSem = semesters.find(s => s.id === destSemId);
    if (destSem && destSem.courses.some(c => c.code === course.code)) {
      return; // Already in destination semester!
    }
    const updated = semesters.map(sem => {
      // Remove from source
      if (sem.id === sourceSemId) {
        return {
          ...sem,
          courses: sem.courses.filter(c => c.code !== course.code)
        };
      }
      // Add to dest
      if (sem.id === destSemId) {
        if (sem.courses.some(c => c.code === course.code)) return sem;
        return {
          ...sem,
          courses: [...sem.courses, course]
        };
      }
      return sem;
    });
    updateSemesters(updated);
  };

  const cse400Course = useMemo(() => {
    for (const sem of semesters) {
      const found = sem.courses.find(c => c.code === "CSE400");
      if (found) return found;
    }
    return null;
  }, [semesters]);

  const handleCSE400CompletionToggle = (isCompleted: boolean) => {
    const updated = semesters.map(sem => ({
      ...sem,
      courses: sem.courses.map(c => {
        if (c.code === "CSE400") {
          return { ...c, isCompleted };
        }
        return c;
      })
    }));
    updateSemesters(updated);
  };

  const handleCSE400GradeChange = (grade: string) => {
    const updated = semesters.map(sem => ({
      ...sem,
      courses: sem.courses.map(c => {
        if (c.code === "CSE400") {
          return { ...c, grade, isCompleted: grade !== "" };
        }
        return c;
      })
    }));
    updateSemesters(updated);
  };

  const handleGradeChange = (semId: string, courseCode: string, grade: string) => {
    const updated = semesters.map(sem => {
      if (sem.id === semId) {
        return {
          ...sem,
          courses: sem.courses.map(c => {
            if (c.code === courseCode) {
              return {
                ...c,
                grade,
                isCompleted: grade !== "" ? true : c.isCompleted
              };
            }
            return c;
          })
        };
      }
      return sem;
    });
    updateSemesters(updated);
  };

  const handleToggleSemesterAllCompleted = (semId: string) => {
    const sem = semesters.find(s => s.id === semId);
    if (!sem) return;
    const allCompleted = sem.courses.every(c => c.isCompleted);
    const updated = semesters.map(s => {
      if (s.id === semId) {
        return {
          ...s,
          courses: s.courses.map(c => ({
            ...c,
            isCompleted: !allCompleted,
            grade: allCompleted ? "" : (c.grade || "")
          }))
        };
      }
      return s;
    });
    updateSemesters(updated);
  };

  const handleCompletionToggle = (semId: string, courseCode: string, isCompleted: boolean) => {
    const updated = semesters.map(sem => {
      if (sem.id === semId) {
        return {
          ...sem,
          courses: sem.courses.map(c => {
            if (c.code === courseCode) {
              return {
                ...c,
                isCompleted,
                grade: !isCompleted ? "" : c.grade
              };
            }
            return c;
          })
        };
      }
      return sem;
    });
    updateSemesters(updated);
  };

  // Search combobox logic
  const filteredSearchCourses = useMemo(() => {
    let list = COURSES;
    if (courseSearchFilter !== "All") {
      list = COURSES.filter(c => {
        if (courseSearchFilter === "Core") return c.mandatory && c.category === "CSE Program Core";
        if (courseSearchFilter === "Math/Science") return c.category === "School Core (Math & Sciences)" || c.category === "GenEd Stream 2";
        if (courseSearchFilter === "GenEd") return c.category.startsWith("GenEd");
        if (courseSearchFilter === "Electives") return c.category === "CSE Major Elective";
        return true;
      });
    }

    if (courseSearchQuery.trim() !== "") {
      const q = courseSearchQuery.toLowerCase();
      list = list.filter(c => 
        c.code.toLowerCase().includes(q) || 
        c.title.toLowerCase().includes(q)
      );
    }

    return list.slice(0, 200); // cap size to prevent layout lag without truncating category tabs
  }, [courseSearchQuery, courseSearchFilter]);

  // Category Course Selection Modal Memos
  const getCompletedCourseState = useCallback((courseCode: string) => {
    for (const sem of semesters) {
      const found = sem.courses.find(c => c.code === courseCode);
      if (found) {
        const isComp = mode === 'tracker' 
          ? found.isCompleted 
          : (found.isCompleted && found.grade !== "");
        if (isComp) {
          return { isCompleted: true, grade: found.grade };
        }
      }
    }
    if (courseCode === "CSE400" && isCSE400Passed) {
      return { isCompleted: true, grade: "" };
    }
    return { isCompleted: false, grade: "" };
  }, [semesters, mode, isCSE400Passed]);

  const categoryDetails = useMemo(() => {
    if (!activeCategorySelectorKey) return { name: "", desc: "" };
    switch (activeCategorySelectorKey) {
      case 'core':
        return { name: "Program Core (Mandatory)", desc: "Mandatory Core Computing Courses" };
      case 'thesis':
        return { name: "Capstone Thesis (CSE400)", desc: "Final Year Capstone Phase" };
      case 'schoolCore':
        return { name: "School Core", desc: "Mathematics & Natural Sciences Core Requirements" };
      case 'electives':
        return { name: "CSE Major Electives", desc: "Major Elective Specialization Tracks" };
      case 'stream1':
        return { name: "GenEd Stream 1 (Writing Comprehension)", desc: "Writing Comprehension Electives" };
      case 'stream2':
        return { name: "GenEd Stream 2 (Math & Natural Sciences)", desc: "Math & Natural Sciences Electives" };
      case 'stream3':
        return { name: "GenEd Stream 3 (Arts & Humanities)", desc: "Arts & Humanities Electives" };
      case 'stream4':
        return { name: "GenEd Stream 4 (Social Sciences)", desc: "Social Sciences Electives" };
      case 'stream5':
        return { name: "GenEd Stream 5 (Communities / CST)", desc: "Communities & Civilizations Studies" };
      case 'freeGenEd':
        return { name: "GenEd Electives (Free Choice)", desc: "Free Choice Stream Electives (any Stream 1-5 course)" };
      default:
        return { name: "Add Course", desc: "" };
    }
  }, [activeCategorySelectorKey]);

  const categoryFilteredCourses = useMemo(() => {
    if (!activeCategorySelectorKey) return [];
    
    const isMandatoryGenEd = (code: string) => {
      const mandatoryCodes = ["ENG101", "ENG102", "ENG103", "MAT110", "PHY111", "STA201", "BNG103", "HUM103", "EMB101"];
      return mandatoryCodes.includes(code);
    };

    let list: Course[] = [];
    switch (activeCategorySelectorKey) {
      case 'core':
        list = COURSES.filter(c => c.category === "CSE Program Core" && c.code !== "CSE400");
        break;
      case 'thesis':
        list = COURSES.filter(c => c.code === "CSE400");
        break;
      case 'schoolCore':
        list = COURSES.filter(c => c.category === "School Core (Math & Sciences)");
        break;
      case 'electives':
        list = COURSES.filter(c => c.category === "CSE Major Elective");
        break;
      case 'stream1':
        list = COURSES.filter(c => c.category === "GenEd Stream 1");
        break;
      case 'stream2':
        list = COURSES.filter(c => c.category === "GenEd Stream 2");
        break;
      case 'stream3':
        list = COURSES.filter(c => c.category === "GenEd Stream 3");
        break;
      case 'stream4':
        list = COURSES.filter(c => c.category === "GenEd Stream 4");
        break;
      case 'stream5':
        list = COURSES.filter(c => c.category === "GenEd Stream 5");
        break;
      case 'freeGenEd':
        list = COURSES.filter(c => c.category.startsWith("GenEd") && !isMandatoryGenEd(c.code));
        break;
      default:
        list = [];
    }

    // Also apply text search filtering if active
    if (categoryCourseSearchQuery.trim() !== "") {
      const q = categoryCourseSearchQuery.toLowerCase();
      list = list.filter(c => 
        c.code.toLowerCase().includes(q) || 
        c.title.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeCategorySelectorKey, categoryCourseSearchQuery]);

  const CSE400 = ({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) => {
    return (
      <div className="bg-[#08080d]/95 border border-purple-500/30 rounded-3xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden mt-8">
        <div className="absolute top-0 right-0 h-40 w-40 bg-purple-500/[0.04] rounded-full blur-3xl pointer-events-none" />
        
        <div className={`flex flex-wrap items-center justify-between gap-3 ${isCollapsed ? "" : "border-b border-white/[0.06] pb-5 mb-6"}`}>
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)] shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight">
                CSE400 — Final Year Capstone
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Academic Research Thesis, Engineering Project, or Corporate Internship</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-bold bg-[#0e0e14] border border-purple-500/30 text-purple-300 px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
              {isCSE400Passed ? "Completed: 4 / 4 Cr" : "Incomplete: 0 / 4 Cr"}
            </span>
            {isCSE400Passed ? (
              <span className="text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-full uppercase tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                Passed / Defended
              </span>
            ) : (
              <span className="text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-full uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                In Progress
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onToggle) {
                  onToggle();
                }
              }}
              aria-label="Toggle Capstone Module"
              className="relative z-30 pointer-events-auto cursor-pointer flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.08] text-slate-300 hover:text-white transition-all select-none flex-shrink-0"
              title={isCollapsed ? "Expand Capstone" : "Minimize Capstone"}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="space-y-6">
            {/* Track selector tabs/cards */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Choose Capstone Track Path</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {(['thesis', 'project', 'internship'] as const).map(track => {
                  const isSelected = thesisTrack === track;
                  let desc = "";
                  let title = "";
                  if (track === 'thesis') {
                    title = "Thesis";
                    desc = "Academic Research Track";
                  } else if (track === 'project') {
                    title = "Project";
                    desc = "System & Software Development Track";
                  } else {
                    title = "Internship";
                    desc = "Corporate Industry Track";
                  }

                  return (
                    <button
                      key={track}
                      onClick={() => {
                        setThesisTrack(track);
                        saveStateToLocalStorage(mode, isOnboarded, semesters, track, thesisSteps, projectCompleted, internshipCompleted, onboardingData);
                      }}
                      className={`p-4 sm:p-5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer group ${
                        isSelected 
                          ? 'border-purple-500 bg-purple-950/25 text-white font-semibold shadow-[0_0_20px_rgba(168,85,247,0.2)]' 
                          : 'bg-[#0a0a10] border border-white/[0.08] hover:border-white/[0.18] hover:bg-[#0e0e14] text-slate-400 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-bold text-sm ${isSelected ? 'text-purple-300 font-extrabold' : 'text-slate-200'}`}>
                            {title}
                          </span>
                          <span className={`h-2.5 w-2.5 rounded-full transition ${isSelected ? 'bg-purple-400 shadow-[0_0_8px_#c084fc]' : 'bg-slate-700'}`} />
                        </div>
                        <p className="text-xs leading-relaxed text-slate-400 group-hover:text-slate-300 transition">
                          {desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checklist & Grade details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-white/[0.06]">
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Milestone Checklist</p>
                
                {thesisTrack === 'thesis' && (
                  <div className="space-y-3 bg-[#0a0a10] border border-white/[0.08] p-5 rounded-2xl">
                    <div className="flex items-center gap-3 text-xs text-slate-200 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          const updatedSteps = { ...thesisSteps, step1: !thesisSteps.step1 };
                          setThesisSteps(updatedSteps);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, updatedSteps, projectCompleted, internshipCompleted, onboardingData);
                        }}
                        className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 focus:outline-none ${
                          thesisSteps.step1
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-transparent shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                            : 'border-white/20 bg-white/[0.03] hover:border-white/40'
                        }`}
                      >
                        {thesisSteps.step1 && (
                          <Check className="h-3 w-3 text-white stroke-[3]" />
                        )}
                      </button>
                      <span
                        onClick={() => {
                          const updatedSteps = { ...thesisSteps, step1: !thesisSteps.step1 };
                          setThesisSteps(updatedSteps);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, updatedSteps, projectCompleted, internshipCompleted, onboardingData);
                        }}
                        className="cursor-pointer hover:text-white transition-colors font-medium"
                      >
                        Step 1: Thesis Topic &amp; Advisor Approved
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-200 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          const updatedSteps = { ...thesisSteps, step2: !thesisSteps.step2 };
                          setThesisSteps(updatedSteps);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, updatedSteps, projectCompleted, internshipCompleted, onboardingData);
                        }}
                        className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 focus:outline-none ${
                          thesisSteps.step2
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-transparent shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                            : 'border-white/20 bg-white/[0.03] hover:border-white/40'
                        }`}
                      >
                        {thesisSteps.step2 && (
                          <Check className="h-3 w-3 text-white stroke-[3]" />
                        )}
                      </button>
                      <span
                        onClick={() => {
                          const updatedSteps = { ...thesisSteps, step2: !thesisSteps.step2 };
                          setThesisSteps(updatedSteps);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, updatedSteps, projectCompleted, internshipCompleted, onboardingData);
                        }}
                        className="cursor-pointer hover:text-white transition-colors font-medium"
                      >
                        Step 2: Mid-term defense cleared
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-200 select-none">
                      <button
                        type="button"
                        onClick={() => handleThesisStep3Toggle(!thesisSteps.step3)}
                        className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 focus:outline-none ${
                          thesisSteps.step3
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-transparent shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                            : 'border-white/20 bg-white/[0.03] hover:border-white/40'
                        }`}
                      >
                        {thesisSteps.step3 && (
                          <Check className="h-3 w-3 text-white stroke-[3]" />
                        )}
                      </button>
                      <span
                        onClick={() => handleThesisStep3Toggle(!thesisSteps.step3)}
                        className="font-semibold text-white cursor-pointer hover:text-purple-300 transition-colors"
                      >
                        Step 3: Final defense report defended &amp; approved
                      </span>
                    </div>
                  </div>
                )}

                {thesisTrack === 'project' && (
                  <div className="bg-[#0a0a10] border border-white/[0.08] p-5 rounded-2xl">
                    <div className="flex items-start gap-3 text-xs text-slate-200 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !projectCompleted;
                          setProjectCompleted(nextVal);
                          handleCSE400CompletionToggle(nextVal);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, thesisSteps, nextVal, internshipCompleted, onboardingData);
                        }}
                        className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 focus:outline-none mt-0.5 ${
                          projectCompleted
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-transparent shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                            : 'border-white/20 bg-white/[0.03] hover:border-white/40'
                        }`}
                      >
                        {projectCompleted && (
                          <Check className="h-3 w-3 text-white stroke-[3]" />
                        )}
                      </button>
                      <div
                        onClick={() => {
                          const nextVal = !projectCompleted;
                          setProjectCompleted(nextVal);
                          handleCSE400CompletionToggle(nextVal);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, thesisSteps, nextVal, internshipCompleted, onboardingData);
                        }}
                        className="cursor-pointer"
                      >
                        <p className="font-semibold text-white hover:text-purple-300 transition-colors">Final Project Built &amp; Defended</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Marks capstone complete and awards 4 degree credits</p>
                      </div>
                    </div>
                  </div>
                )}

                {thesisTrack === 'internship' && (
                  <div className="bg-[#0a0a10] border border-white/[0.08] p-5 rounded-2xl">
                    <div className="flex items-start gap-3 text-xs text-slate-200 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !internshipCompleted;
                          setInternshipCompleted(nextVal);
                          handleCSE400CompletionToggle(nextVal);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, thesisSteps, projectCompleted, nextVal, onboardingData);
                        }}
                        className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 focus:outline-none mt-0.5 ${
                          internshipCompleted
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-transparent shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                            : 'border-white/20 bg-white/[0.03] hover:border-white/40'
                        }`}
                      >
                        {internshipCompleted && (
                          <Check className="h-3 w-3 text-white stroke-[3]" />
                        )}
                      </button>
                      <div
                        onClick={() => {
                          const nextVal = !internshipCompleted;
                          setInternshipCompleted(nextVal);
                          handleCSE400CompletionToggle(nextVal);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, thesisSteps, projectCompleted, nextVal, onboardingData);
                        }}
                        className="cursor-pointer"
                      >
                        <p className="font-semibold text-white hover:text-purple-300 transition-colors">Internship Completed &amp; Report Submitted</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Marks capstone complete and awards 4 degree credits</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {mode === 'gpa' && (
                <div className="space-y-3 bg-[#0a0a10] border border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Final Capstone Grade</label>
                    <p className="text-xs text-slate-400 leading-relaxed">Select the final grade scored in CSE400 for cumulative CGPA calculation.</p>
                  </div>
                  <select
                    value={cse400Course?.grade || ""}
                    onChange={(e) => handleCSE400GradeChange(e.target.value)}
                    className="bg-[#050508] border border-white/[0.1] text-xs text-slate-100 rounded-xl px-3.5 py-2.5 w-full focus:border-purple-400 outline-none cursor-pointer mt-3 font-semibold shadow-inner transition"
                  >
                    <option value="">Select Grade</option>
                    {Object.keys(GRADING_SCALE).map(g => (
                      <option key={g} value={g}>{g} ({GRADING_SCALE[g].toFixed(1)})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTutorial = () => {
    if (tutorialStep === null || tutorialStep < 1 || tutorialStep > 12) return null;

    const tourSteps = [
      {
        title: "1. Welcome to Flow136!",
        desc: "Welcome to your curriculum companion. Please click on the 'Continue to Tracker' button on the landing page to enter the app and begin the tour!",
      },
      {
        title: "2. Starting Pathway Status",
        desc: "First, choose your starting entry point (Pathway A or Pathway B) based on your freshman entry courses, select any remedial options, and click 'Continue'.",
      },
      {
        title: "3. RS & English Placement",
        desc: "Select your target RS Semester, starting intake (Term & Year), and English status prior to RS, then click 'Next Step' to continue.",
      },
      {
        title: "4. Generate Study Plan",
        desc: "Review your generated layout summary. If you need to change anything, click 'Back' to adjust details (the tutorial will wait). Once verified, click 'Generate Plan'!",
      },
      {
        title: "5. Welcome to the Dashboard",
        desc: "Welcome to your active planner dashboard! Notice that Flow136 supports two tracking modes: Course Tracker (left) and Course + CGPA Planner (right). Click 'Next' to proceed.",
      },
      {
        title: "6. Sidebar Requirements",
        desc: "Look at the sidebar. Click on any category (like 'Program Core' or 'GenEd Streams') to view its courses, track credit completion, or add courses directly.",
      },
      {
        title: "7. CGPA Planner Mode",
        desc: "Let's explore the GPA calculators. Please switch over to 'Course + CGPA Planner' mode by clicking the toggler in the header.",
      },
      {
        title: "8. GPA Solver & ROI Analyzer",
        desc: "In GPA mode, you can use the Target Solver to see required grade averages, and the Repeat ROI Analyzer to discover retake choices.",
      },
      {
        title: "9. Repeat ROI Simulation",
        desc: "For example: we temporarily added CSE110 in Semester 1 with a grade of 2.7 (B-). The analyzer shows that retaking it and scoring a 4.0 (A) will boost your overall CGPA. Click 'Next' to clean up this sample.",
      },
      {
        title: "10. View Layout Modes",
        desc: "Customize your timeline view. Switch between the vertical 'List View' feed and the horizontal 'Kanban Board' layout in the header. Click 'Next' to proceed.",
      },
      {
        title: "11. Export & Backups",
        desc: "Open the Hamburger menu (≡) in the header. Here you can backup/export your plan, restore data, or take a gradesheet snapshot of your progress.",
      },
      {
        title: "12. Suggested Pathways",
        desc: "If you ever get confused, click the 'Feeling lost?' button to see the recommended curriculum pathway flow. That concludes our tour! Click 'Finish' to begin!",
      },
    ];

    const currentStepData = tourSteps[tutorialStep - 1];
    if (!currentStepData) return null;

    let stepTitle = currentStepData.title;
    let stepDesc = currentStepData.desc;

    // Boundary correction: If user went back in the wizard on step 4, pause instructions
    if (tutorialStep === 4 && wizardStep < 3) {
      stepTitle = "Adjusting Onboarding Settings...";
      stepDesc = "Please finish adjusting your choices in the setup wizard and click 'Continue' to return to the 'Generate Your Study Plan' page to resume the tour.";
    }

    const isNextHidden = [2, 3, 4].includes(tutorialStep) && !isOnboarded;

    return (
      <div style={popoverStyle} className="w-[calc(100vw-32px)] md:w-96 px-4 md:px-0">
        <div className="bg-[#09090b]/95 border border-slate-800 backdrop-blur-md rounded-2xl p-5 shadow-[0_0_30px_rgba(99,102,241,0.15)] flex flex-col gap-3 relative overflow-hidden text-left">
          {/* Ambient glow inside popover */}
          <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
          
          <div className="flex items-center justify-between z-10">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              Tutorial &bull; Step {tutorialStep} of {tourSteps.length}
            </span>
            <button
              onClick={() => {
                try {
                  localStorage.setItem("flow136_tutorial_completed", "true");
                } catch (error) {
                  console.error("Local storage error:", error);
                }
                setTutorialStep(null);
              }}
              className="text-slate-450 hover:text-indigo-400 transition text-[10px] uppercase font-bold cursor-pointer"
            >
              Skip
            </button>
          </div>

          <div className="space-y-1 z-10">
            <h4 className="text-sm font-bold text-slate-100">{stepTitle}</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{stepDesc}</p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden z-10 border border-slate-800/40">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300"
              style={{ width: `${(tutorialStep / tourSteps.length) * 100}%` }}
            />
          </div>

          <div className="flex justify-between items-center mt-2 z-10">
            <button
              disabled={tutorialStep === 1 || (isOnboarded && tutorialStep === 5)}
              onClick={() => handleTutorialStepChange(tutorialStep - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-zinc-900/50 hover:bg-zinc-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition disabled:opacity-30 disabled:pointer-events-none"
            >
              Back
            </button>
            {isNextHidden ? (
              <span className="text-[10px] font-medium text-slate-400 italic animate-pulse">
                Follow instructions to proceed...
              </span>
            ) : (
              <button
                onClick={() => handleTutorialStepChange(tutorialStep + 1)}
                className="bg-indigo-600 hover:bg-indigo-500 text-slate-100 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-md transition-all duration-200 shadow-indigo-600/10 hover:shadow-indigo-600/20"
              >
                {tutorialStep === tourSteps.length ? "Finish" : "Next"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };
  if (!isMounted) {
    return (
      <div className="min-h-screen w-full bg-[#030303] bg-gradient-to-b from-[#050507] via-[#09090b] to-[#0d0d12] text-slate-100 font-sans antialiased flex flex-col justify-between relative overflow-hidden animate-pulse">
        {/* Header Skeleton */}
        <header className="px-6 py-5 max-w-7xl mx-auto w-full flex items-center justify-between border-b border-slate-900/50 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-8.5 w-8.5 rounded-xl bg-slate-800/50" />
            <div className="space-y-1.5">
              <div className="h-4.5 w-20 bg-slate-800/60 rounded" />
              <div className="h-3 w-40 bg-slate-800/40 rounded" />
            </div>
          </div>
          <div className="h-8 w-24 bg-slate-800/50 rounded-xl" />
        </header>

        {/* Hero Section Skeleton */}
        <main className="flex-grow flex flex-col items-center justify-center text-center px-4 py-16 relative z-10 max-w-6xl mx-auto w-full">
          {/* Badge Skeleton */}
          <div className="h-7 w-48 bg-slate-800/45 rounded-full mb-8" />

          {/* Title Skeleton */}
          <div className="h-16 w-3/4 max-w-xl bg-slate-800/60 rounded-2xl mb-6 mx-auto" />
          
          {/* Subtitle Skeletons */}
          <div className="space-y-2.5 mb-10 w-2/3 max-w-md mx-auto">
            <div className="h-6 w-full bg-slate-800/50 rounded-lg mx-auto" />
            <div className="h-5 w-5/6 bg-slate-800/30 rounded-lg mx-auto" />
          </div>

          {/* Button Skeleton */}
          <div className="h-14 w-52 bg-slate-800/70 rounded-full mb-20 mx-auto" />

          {/* Grid Skeleton */}
          <div className="w-full">
            <div className="h-4 w-28 bg-slate-800/40 rounded mx-auto mb-10" />
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-zinc-950/40 border border-slate-800/80 rounded-xl p-6 flex flex-col items-center">
                  <div className="h-12 w-12 rounded-xl bg-slate-800/50 mb-4" />
                  <div className="h-4 w-24 bg-slate-800/60 rounded mb-2.5" />
                  <div className="space-y-1.5 w-full">
                    <div className="h-3 w-full bg-slate-800/35 rounded" />
                    <div className="h-3 w-5/6 bg-slate-800/30 rounded mx-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        
        {/* Footer Skeleton */}
        <footer className="px-6 py-6 border-t border-slate-900/50 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="h-3.5 w-36 bg-slate-800/30 rounded" />
          <div className="h-3.5 w-44 bg-slate-800/30 rounded" />
        </footer>
      </div>
    );
  }

  const currentLayout = viewMode;

  if (!showDashboard) {
    return (
      <div className="min-h-screen w-full bg-[#030304] bg-gradient-to-b from-[#030304] via-[#060609] to-[#0a0a0f] text-slate-100 font-sans antialiased flex flex-col justify-between relative overflow-hidden">
        {/* Ambient background glow accents */}
        <div className="absolute top-[-15%] left-[-8%] w-[50%] h-[50%] rounded-full bg-blue-600/[0.08] blur-[160px] pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-8%] w-[50%] h-[50%] rounded-full bg-purple-600/[0.08] blur-[160px] pointer-events-none" />
        <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-600/[0.05] blur-[180px] pointer-events-none z-0" />

        {/* Top Header/Bar for Landing */}
        <header className="px-6 py-5 max-w-7xl mx-auto w-full flex items-center justify-between border-b border-white/[0.06] relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 border border-blue-400/30 flex items-center justify-center shadow-[0_4px_20px_rgba(59,130,246,0.3)] shrink-0">
              <svg className="h-5.5 w-5.5 text-white fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">
              Flow136
            </h1>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-grow flex flex-col items-center justify-center text-center px-4 py-16 relative z-10 max-w-6xl mx-auto w-full">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-indigo-300 mb-8 backdrop-blur-md shadow-sm">
            <GraduationCap className="h-4 w-4 text-indigo-400" />
            <span>BRACU CSE Degree Companion</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400 max-w-5xl mx-auto leading-none mb-6">
            Welcome to Flow136
          </h1>

          <p className="text-xl md:text-2xl lg:text-3xl text-slate-100 font-extrabold tracking-tight max-w-2xl mx-auto leading-relaxed text-center">
            Your curriculum, minus the complexity.
          </p>

          <p className="text-xs md:text-sm text-slate-400 font-medium mt-3 mb-10 max-w-md mx-auto leading-relaxed text-center">
            Interactive progress tracker, prerequisite validator & graduation planner for BRACU CSE.
          </p>

          {/* Glowing CTA Button */}
          <div className="mb-20">
            <button
              onClick={() => {
                setShowDashboard(true);
                if (tutorialStep === 1) {
                  handleTutorialStepChange(2);
                }
              }}
              className={`bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white shadow-[0_0_28px_rgba(79,70,229,0.38)] hover:shadow-[0_0_40px_rgba(79,70,229,0.58)] transition-all duration-300 rounded-2xl px-10 py-4.5 font-bold text-base md:text-lg cursor-pointer transform active:scale-95 inline-flex items-center gap-3 border border-blue-400/30 ${getHighlightClass('cta-button')}`}
              data-tutorial="cta-button"
            >
              <span>Continue to Tracker</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          {/* Feature Highlights Grid */}
          <div className="w-full">
            <div className="text-center mb-10">
              <h2 className="text-xs uppercase tracking-widest text-slate-400 font-bold">Core Features</h2>
              <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto mt-2 rounded-full" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
              {/* Feature 1 */}
              <div className="bg-[#08080d]/80 border border-white/[0.08] hover:border-blue-500/40 rounded-3xl p-6 backdrop-blur-xl flex flex-col items-center text-center shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_40px_rgba(59,130,246,0.12)] transition-all duration-300 group hover:-translate-y-1.5">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 mb-4 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 mb-2">CGPA Tracker</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  Log grades, track semester GPAs, and monitor cumulative progress dynamically.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-[#08080d]/80 border border-white/[0.08] hover:border-purple-500/40 rounded-3xl p-6 backdrop-blur-xl flex flex-col items-center text-center shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_40px_rgba(168,85,247,0.12)] transition-all duration-300 group hover:-translate-y-1.5">
                <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 mb-4 group-hover:bg-purple-500/20 group-hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 mb-2">GenEd Progress</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  Auto-validate GenEd stream distributions and ensure all graduation credits align.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-[#08080d]/80 border border-white/[0.08] hover:border-emerald-500/40 rounded-3xl p-6 backdrop-blur-xl flex flex-col items-center text-center shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.12)] transition-all duration-300 group hover:-translate-y-1.5">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-4 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 mb-2">CGPA ROI Analyzer</h3>
                <p className="text-xs text-slate-450 leading-relaxed font-normal">
                  Analyze retake options and see the exact return on investment for grade improvements.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-[#08080d]/80 border border-white/[0.08] hover:border-amber-500/40 rounded-3xl p-6 backdrop-blur-xl flex flex-col items-center text-center shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.12)] transition-all duration-300 group hover:-translate-y-1.5">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mb-4 group-hover:bg-amber-500/20 group-hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                  <Target className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 mb-2">Target Calculator</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  Solve exactly what GPAs you need in future semesters to reach your target goals.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-[#08080d]/80 border border-white/[0.08] hover:border-rose-500/40 rounded-3xl p-6 backdrop-blur-xl flex flex-col items-center text-center shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_40px_rgba(244,63,94,0.12)] transition-all duration-300 group hover:-translate-y-1.5">
                <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 mb-4 group-hover:bg-rose-500/20 group-hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                  <Camera className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 mb-2">Snapshot Progress</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  Instantly download your official curriculum progress as a crisp PNG image.
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Landing Page Footer */}
        <footer className="w-full py-10 px-6 border-t border-white/[0.06] bg-[#050508]/80 backdrop-blur-md relative z-10 text-center flex flex-col items-center justify-center gap-5">
          {/* Connect with me social links */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-semibold text-slate-100">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase leading-none self-center">Connect with me:</span>
            <a
              href="https://github.com/fakekhanabdullah"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.16] text-xs text-slate-300 hover:text-white transition-all duration-200"
            >
              <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
              <span>GitHub</span>
            </a>
            <a
              href="https://www.linkedin.com/in/khan-abdullahh"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.16] text-xs text-slate-300 hover:text-white transition-all duration-200"
            >
              <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              <span>LinkedIn</span>
            </a>
          </div>

          {/* Muted Copyright Disclaimer */}
          <div className="text-xs text-slate-400 leading-relaxed font-normal">
            <p>© 2026 Flow136. Made by: Khan Abdullah</p>
          </div>

          <p className="text-[10px] text-slate-400 max-w-md leading-relaxed">
            Disclaimer: Not officially affiliated with BRAC University. All curriculum guidelines and course codes reflect official CSE program requirements.
          </p>
        </footer>
        {renderTutorial()}
      </div>
    );
  }


  return (
    <div className="min-h-screen w-full bg-[#030304] bg-gradient-to-b from-[#030304] via-[#050508] to-[#07070b] text-slate-100 font-sans antialiased flex flex-col">
      <header className="border-b border-white/[0.08] bg-[#050508]/90 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-6 py-3.5 shadow-2xl shadow-black/40 w-full relative">
        {/* Desktop Header Layout (Screens >= 1024px) */}
        <div className="hidden lg:flex w-full max-w-7xl mx-auto items-center justify-between relative min-h-[50px]">
          {/* Left: Logo */}
          <div 
            onClick={() => setShowDashboard(false)}
            className="flex items-center gap-3 cursor-pointer select-none hover:opacity-90 active:scale-95 transition-all relative z-20 shrink-0"
            title="Back to Landing Page"
          >
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 border border-blue-400/30 flex items-center justify-center shadow-[0_8px_22px_rgba(37,99,235,0.32)] shrink-0">
              <svg className="h-5.5 w-5.5 text-white fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">
              Flow136
            </h1>
          </div>

          {/* Center: Mode Toggler (Dead Center) */}
          <div 
            className={`absolute left-1/2 transform -translate-x-1/2 top-1/2 -translate-y-1/2 z-10 bg-[#08080d] border border-white/[0.08] p-1.5 rounded-2xl flex shadow-inner gap-1.5 ${getHighlightClass('mode-toggler')}`}
            data-tutorial="mode-toggler"
          >
            <button
              type="button"
              onClick={() => mode !== 'tracker' && handleModeToggle()}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'tracker' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 border border-blue-400/20' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
              }`}
            >
              Course Tracker Only
            </button>
            <button
              type="button"
              onClick={() => {
                if (mode !== 'gpa') {
                  handleModeToggle();
                  if (tutorialStep === 7) {
                    handleTutorialStepChange(8);
                  }
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'gpa' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 border border-blue-400/20' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
              }`}
            >
              Course + CGPA Planner
            </button>
          </div>

          {/* Right Action Group: Feeling Lost, Hamburger dropdown, Reset */}
          <div className="flex items-center gap-3 relative z-20">
            {/* 1. Feeling lost? */}
            <button
              type="button"
              onClick={() => setShowRoadmapModal(true)}
              className={`inline-flex items-center gap-2 bg-[#0c0c12] hover:bg-[#121218] border border-white/[0.08] hover:border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-all cursor-pointer shadow-sm ${getHighlightClass('feeling-lost-btn')}`}
              title="View recommended CSE/CS curriculum roadmap"
              data-tutorial="feeling-lost-btn"
            >
              <HelpCircle className="h-4 w-4 text-indigo-400" />
              <span>Feeling lost?</span>
            </button>

            {/* 2. Hamburger Dropdown Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowDataDropdown(!showDataDropdown);
                  setShowHeaderMenu(false);
                }}
                className={`h-10 w-10 rounded-2xl border flex items-center justify-center transition-all text-xs font-semibold cursor-pointer ${
                  showDataDropdown 
                    ? 'bg-blue-600/15 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/20' 
                    : 'bg-[#0c0c12] hover:bg-[#121218] border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.16]'
                } ${getHighlightClass('hamburger-menu')}`}
                title="Menu"
                data-tutorial="hamburger-menu"
              >
                <svg className="h-4.5 w-4.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>

              {showDataDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-[#09090e] border border-white/[0.1] rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      handleExportBackup();
                      setShowDataDropdown(false);
                    }}
                    className="w-full px-3 py-2.5 hover:bg-white/[0.05] text-left text-xs text-slate-200 hover:text-white rounded-xl flex items-center gap-2.5 transition cursor-pointer font-medium"
                  >
                    <Download className="h-4 w-4 text-blue-400" />
                    <span>Backup Data</span>
                  </button>
                  <label className="w-full px-3 py-2.5 hover:bg-white/[0.05] text-left text-xs text-slate-200 hover:text-white rounded-xl flex items-center gap-2.5 cursor-pointer transition font-medium">
                    <Upload className="h-4 w-4 text-indigo-400" />
                    <span>Restore Data</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        handleImportBackup(e);
                        setShowDataDropdown(false);
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGradeSheetModal(true);
                      setShowDataDropdown(false);
                    }}
                    className="w-full px-3 py-2.5 hover:bg-white/[0.05] text-left text-xs text-slate-200 hover:text-white rounded-xl flex items-center gap-2.5 transition cursor-pointer font-medium"
                  >
                    <Camera className="h-4 w-4 text-purple-400" />
                    <span>Snapshot Progress</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTutorialStep(5);
                      setShowDashboard(true);
                      setShowDataDropdown(false);
                    }}
                    className="w-full px-3 py-2.5 hover:bg-white/[0.05] text-left text-xs text-slate-200 hover:text-white rounded-xl flex items-center gap-2.5 transition cursor-pointer font-medium"
                  >
                    <HelpCircle className="h-4 w-4 text-amber-400" />
                    <span>Restart Tour</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Reset Button */}
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              title="Reset tracker to onboarding defaults"
              className="h-10 w-10 rounded-2xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 hover:border-rose-700/50 text-rose-400 flex items-center justify-center transition cursor-pointer shadow-sm"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile Header Layout (Screens < 1024px - Vertically Stacked & Center-Aligned) */}
        <div className="flex lg:hidden flex-col items-center text-center gap-3.5 w-full">
          {/* 1. Logo and Catchphrase */}
          <div 
            onClick={() => setShowDashboard(false)}
            className="flex items-center gap-2.5 cursor-pointer select-none hover:opacity-85 active:scale-95 transition-all"
            title="Back to Landing Page"
          >
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-400/30 flex items-center justify-center shadow-[0_6px_18px_rgba(37,99,235,0.3)] shrink-0">
              <svg className="h-5 w-5 text-white fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">
              Flow136
            </h1>
          </div>

          {/* 2. Mode Toggler */}
          <div 
            className={`bg-[#08080d] border border-white/[0.08] p-1.5 rounded-2xl flex w-full max-w-[340px] justify-between gap-1 shadow-inner ${getHighlightClass('mode-toggler')}`}
            data-tutorial="mode-toggler"
          >
            <button
              type="button"
              onClick={() => mode !== 'tracker' && handleModeToggle()}
              className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all text-center cursor-pointer ${
                mode === 'tracker' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 border border-blue-400/20' 
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Course Tracker Only
            </button>
            <button
              type="button"
              onClick={() => {
                if (mode !== 'gpa') {
                  handleModeToggle();
                  if (tutorialStep === 7) {
                    handleTutorialStepChange(8);
                  }
                }
              }}
              className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all text-center cursor-pointer ${
                mode === 'gpa' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 border border-blue-400/20' 
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Course + CGPA Planner
            </button>
          </div>

          {/* 3. Actions Row: Help, Reset, Hamburger */}
          <div className="w-full max-w-[260px] flex gap-2.5 justify-center">
            {/* Help/Roadmap Button */}
            <button
              type="button"
              onClick={() => setShowRoadmapModal(true)}
              className={`h-10 w-10 bg-[#0c0c12] hover:bg-[#121218] border border-white/[0.08] text-indigo-300 hover:text-white flex items-center justify-center rounded-2xl transition cursor-pointer shadow-sm ${getHighlightClass('feeling-lost-btn')}`}
              title="View recommended CSE/CS curriculum roadmap"
              data-tutorial="feeling-lost-btn"
            >
              <HelpCircle className="h-4.5 w-4.5 text-indigo-400" />
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              title="Reset tracker to onboarding defaults"
              className="h-10 w-10 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-400 flex items-center justify-center rounded-2xl transition cursor-pointer shadow-sm"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowHeaderMenu(!showHeaderMenu);
                  setShowDataDropdown(false);
                }}
                className={`h-10 w-10 rounded-2xl border flex items-center justify-center transition-all cursor-pointer ${
                  showHeaderMenu 
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-md shadow-blue-500/20' 
                    : 'bg-[#0c0c12] hover:bg-[#121218] border-white/[0.08] text-slate-300 hover:text-white'
                } ${getHighlightClass('hamburger-menu')}`}
                title="Menu"
                data-tutorial="hamburger-menu"
              >
                <svg className="h-4.5 w-4.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>

              {/* Mobile Menu Dropdown */}
              {showHeaderMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-[#09090e] border border-white/[0.1] rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      handleExportBackup();
                      setShowHeaderMenu(false);
                    }}
                    className="w-full px-3 py-2.5 hover:bg-slate-900/70 text-left text-xs text-slate-200 hover:text-white rounded-xl flex items-center gap-2.5 transition cursor-pointer font-medium"
                  >
                    <Download className="h-4 w-4 text-blue-400" />
                    <span>Backup Data</span>
                  </button>
                  <label className="w-full px-3 py-2.5 hover:bg-slate-900/70 text-left text-xs text-slate-200 hover:text-white rounded-xl flex items-center gap-2.5 cursor-pointer transition font-medium">
                    <Upload className="h-4 w-4 text-indigo-400" />
                    <span>Restore Data</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        handleImportBackup(e);
                        setShowHeaderMenu(false);
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGradeSheetModal(true);
                      setShowHeaderMenu(false);
                    }}
                    className="w-full px-3 py-2.5 hover:bg-slate-900/70 text-left text-xs text-slate-200 hover:text-white rounded-xl flex items-center gap-2.5 transition cursor-pointer font-medium"
                  >
                    <Camera className="h-4 w-4 text-purple-400" />
                    <span>Snapshot Progress</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTutorialStep(5);
                      setShowDashboard(true);
                      setShowHeaderMenu(false);
                    }}
                    className="w-full px-3 py-2.5 hover:bg-slate-900/70 text-left text-xs text-slate-200 hover:text-white rounded-xl flex items-center gap-2.5 transition cursor-pointer font-medium"
                  >
                    <HelpCircle className="h-4 w-4 text-amber-400" />
                    <span>Restart Tour</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. Top-level Alert Panels (Standing warnings) */}
      {mode === 'gpa' && (
        <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 pt-4 flex flex-col gap-3">
          {cumulativeStats.cgpa > 0 && cumulativeStats.cgpa < 1.50 && (
            <div className="flex items-center gap-3 bg-red-950/20 border border-red-900/50 p-4 rounded-xl text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">
                <span className="font-bold">Academic Probation:</span> Your CGPA is below 1.50. You must raise it to 1.50+ next semester to avoid dismissal.
              </p>
            </div>
          )}
          {firstSemesterGpa !== null && firstSemesterGpa < 1.00 && (
            <div className="flex items-center gap-3 bg-amber-950/20 border border-amber-900/50 p-4 rounded-xl text-amber-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">
                <span className="font-bold">High Risk:</span> 1st Semester CGPA below 1.00. Immediate academic counseling required.
              </p>
            </div>
          )}
        </div>
      )}

      {backupFileError && (
        <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 mt-4">
          <div className="flex items-center justify-between gap-3 bg-rose-950/30 border border-rose-900/40 p-4 rounded-xl text-rose-400">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm">{backupFileError}</p>
            </div>
            <button onClick={() => setBackupFileError(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Dashboard Layout */}      {!isOnboarded ? (
        /* Onboarding Wizard Modal overlay if not onboarded */
        <div className="flex-1 flex items-center justify-center p-4 md:p-6 bg-[#030304] bg-gradient-to-b from-[#030304] via-[#08080d] to-[#030304]">
          <div className="w-full max-w-xl mx-auto bg-[#08080d]/95 border border-slate-700/80 rounded-3xl shadow-2xl relative overflow-hidden p-6 sm:p-8 space-y-6">
            
            {/* Ambient glows inside card */}
            <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

            {/* Header & Step Indicators */}
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                    <svg className="h-4.5 w-4.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Curriculum Setup</h3>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0e0e14] border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step</span>
                  <span className="text-xs font-black text-indigo-400">{wizardStep}/3</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex gap-2 w-full">
                {[1, 2, 3].map(s => (
                  <div
                    key={s}
                    className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                      s <= wizardStep 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-sm shadow-indigo-500/30' 
                        : 'bg-[#0e0e14] border border-slate-800/80'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Step 1: Starting State (Credit vs. Non-Credit) */}
            {wizardStep === 1 && (
              <div className="space-y-6 relative z-10">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-white">1st Semester Starting State</h2>
                  <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                    How did you start your 1st Semester at BRACU? Choose your starting entry point to map your calculus and English pathways.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Pathway Buttons */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <button
                      onClick={() => setOnboardingData({
                        ...onboardingData,
                        pathway: 'foundation',
                        foundationOption: onboardingData.foundationOption || 'opt1',
                        creditOption: null
                      })}
                      className={`p-4 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between h-28 cursor-pointer ${
                        onboardingData.pathway === 'foundation'
                          ? 'bg-gradient-to-br from-indigo-900/30 to-blue-900/20 border-indigo-500 text-indigo-300 font-bold shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                          : 'bg-[#0e0e14]/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-100 hover:bg-[#121218]/70'
                      } ${getHighlightClass('pathway-card-a')}`}
                      data-tutorial="pathway-card-a"
                    >
                      <div className="h-8 w-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <BookOpen className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-xs text-white font-black">Pathway A</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Non-Credit Foundation</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setOnboardingData({
                        ...onboardingData,
                        pathway: 'credit',
                        creditOption: onboardingData.creditOption || 'opt1',
                        foundationOption: null
                      })}
                      className={`p-4 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between h-28 cursor-pointer ${
                        onboardingData.pathway === 'credit'
                          ? 'bg-gradient-to-br from-indigo-900/30 to-blue-900/20 border-indigo-500 text-indigo-300 font-bold shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                          : 'bg-[#0e0e14]/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-100 hover:bg-[#121218]/70'
                      } ${getHighlightClass('pathway-card-b')}`}
                      data-tutorial="pathway-card-b"
                    >
                      <div className="h-8 w-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                        <Award className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-xs text-white font-black">Pathway B</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Direct Credit Courses</p>
                      </div>
                    </button>
                  </div>

                  {/* Sub-options for Pathway A */}
                  {onboardingData.pathway === 'foundation' && (
                    <div className="space-y-3 pt-2">
                      <label className="block text-xs font-bold tracking-wider text-slate-400 mt-4 mb-2">Select all required non-credit courses:</label>
                      
                      <label className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                        onboardingData.remedialEng091Checked
                          ? 'bg-gradient-to-br from-indigo-900/25 to-blue-900/15 border-indigo-500/80 text-indigo-300 font-bold shadow-md shadow-indigo-500/10'
                          : 'bg-[#0e0e14]/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-100 hover:bg-[#121218]/70'
                      }`}>
                        <input
                          type="checkbox"
                          checked={onboardingData.remedialEng091Checked}
                          onChange={(e) => setOnboardingData({ ...onboardingData, remedialEng091Checked: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all duration-200 shrink-0 mt-0.5 ${
                          onboardingData.remedialEng091Checked
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-transparent shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                            : 'border-white/20 bg-white/[0.04]'
                        }`}>
                          {onboardingData.remedialEng091Checked && (
                            <Check className="h-3 w-3 text-white stroke-[3]" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-100">ENG091 ({COURSES.find(c => c.code === "ENG091")?.title})</p>
                          <p className="text-xs text-slate-400 mt-0.5 font-medium">Required for students needing basic English grounding</p>
                        </div>
                      </label>

                      <label className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                        onboardingData.remedialMat091Checked
                          ? 'bg-gradient-to-br from-indigo-900/25 to-blue-900/15 border-indigo-500/80 text-indigo-300 font-bold shadow-md shadow-indigo-500/10'
                          : 'bg-[#0e0e14]/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-100 hover:bg-[#121218]/70'
                      }`}>
                        <input
                          type="checkbox"
                          checked={onboardingData.remedialMat091Checked}
                          onChange={(e) => setOnboardingData({ ...onboardingData, remedialMat091Checked: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all duration-200 shrink-0 mt-0.5 ${
                          onboardingData.remedialMat091Checked
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-transparent shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                            : 'border-white/20 bg-white/[0.04]'
                        }`}>
                          {onboardingData.remedialMat091Checked && (
                            <Check className="h-3 w-3 text-white stroke-[3]" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-100">MAT091 ({COURSES.find(c => c.code === "MAT091")?.title})</p>
                          <p className="text-xs text-slate-400 mt-0.5 font-medium">Basic remedial pre-calculus algebra</p>
                        </div>
                      </label>

                      <label className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                        onboardingData.remedialMat092Checked
                          ? 'bg-gradient-to-br from-indigo-900/25 to-blue-900/15 border-indigo-500/80 text-indigo-300 font-bold shadow-md shadow-indigo-500/10'
                          : 'bg-[#0e0e14]/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-100 hover:bg-[#121218]/70'
                      }`}>
                        <input
                          type="checkbox"
                          checked={onboardingData.remedialMat092Checked}
                          onChange={(e) => setOnboardingData({ ...onboardingData, remedialMat092Checked: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all duration-200 shrink-0 mt-0.5 ${
                          onboardingData.remedialMat092Checked
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-transparent shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                            : 'border-white/20 bg-white/[0.04]'
                        }`}>
                          {onboardingData.remedialMat092Checked && (
                            <Check className="h-3 w-3 text-white stroke-[3]" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-100">MAT092 ({COURSES.find(c => c.code === "MAT092")?.title})</p>
                          <p className="text-xs text-slate-400 mt-0.5 font-medium">Intermediate remedial algebra prior to MAT110 Calculus</p>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Sub-options for Pathway B */}
                  {onboardingData.pathway === 'credit' && (
                    <div className="space-y-3 pt-2">
                      <label className="block text-xs font-bold tracking-wider text-slate-400 mt-4 mb-2">Select starting English course:</label>
                      
                      <button
                        onClick={() => {
                          const nextPriorStatus = onboardingData.engStatusPriorToRS === 'caseD'
                            ? null
                            : onboardingData.engStatusPriorToRS;
                          setOnboardingData({
                            ...onboardingData,
                            creditOption: 'opt1',
                            engStatusPriorToRS: nextPriorStatus
                          });
                        }}
                        className={`w-full p-4 rounded-2xl border text-left text-xs transition-all duration-300 flex items-center justify-between cursor-pointer ${
                          onboardingData.creditOption === 'opt1'
                            ? 'bg-gradient-to-br from-indigo-900/30 to-blue-900/20 border-indigo-500 text-indigo-300 font-bold shadow-md shadow-indigo-500/15'
                            : 'bg-[#0e0e14]/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-100 hover:bg-[#121218]/70'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-white text-sm">Option 1: Started with ENG101</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Assigns ENG101 ({COURSES.find(c => c.code === "ENG101")?.title}) to Semester 1</p>
                        </div>
                        {onboardingData.creditOption === 'opt1' && <Check className="h-5 w-5 text-indigo-400" />}
                      </button>

                      <button
                        onClick={() => {
                          const nextPriorStatus = (onboardingData.engStatusPriorToRS === 'caseA' || onboardingData.engStatusPriorToRS === 'caseD')
                            ? onboardingData.engStatusPriorToRS
                            : null;
                          setOnboardingData({
                            ...onboardingData,
                            creditOption: 'opt2',
                            engStatusPriorToRS: nextPriorStatus
                          });
                        }}
                        className={`w-full p-4 rounded-2xl border text-left text-xs transition-all duration-300 flex items-center justify-between cursor-pointer ${
                          onboardingData.creditOption === 'opt2'
                            ? 'bg-gradient-to-br from-indigo-900/30 to-blue-900/20 border-indigo-500 text-indigo-300 font-bold shadow-md shadow-indigo-500/15'
                            : 'bg-[#0e0e14]/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-100 hover:bg-[#121218]/70'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-white text-sm">Option 2: Started with ENG102</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Assigns ENG102 ({COURSES.find(c => c.code === "ENG102")?.title}) to Semester 1</p>
                        </div>
                        {onboardingData.creditOption === 'opt2' && <Check className="h-5 w-5 text-indigo-400" />}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setWizardStep(2);
                      if (tutorialStep === 2) {
                        handleTutorialStepChange(3);
                      }
                    }}
                    disabled={!onboardingData.pathway}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 hover:from-blue-500 hover:via-indigo-500 hover:to-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-500/25 transition duration-200 cursor-pointer text-xs uppercase tracking-wider active:scale-[0.98]"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: RS Semester and Placement status */}
            {wizardStep === 2 && (
              <div className="space-y-6 relative z-10">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-white">RS & English Placement Engine</h2>
                  <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                    Set up your Residential Semester. The engine will evaluate prerequisites to auto-populate the RS card.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Select RS Term */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold tracking-wider text-slate-400">When will you attend RS?</label>
                    <div className="grid grid-cols-3 gap-2.5" data-tutorial="rs-term-select">
                      {(["3rd Semester", "4th Semester", "5th Semester"] as const).map(term => (
                        <button
                          key={term}
                          onClick={() => setOnboardingData({ ...onboardingData, rsTerm: term })}
                          className={`p-3.5 rounded-2xl border text-xs font-bold text-center transition-all duration-300 cursor-pointer ${
                            onboardingData.rsTerm === term
                              ? 'bg-gradient-to-br from-indigo-900/30 to-blue-900/20 border-indigo-500 text-indigo-300 font-bold shadow-md shadow-indigo-500/15'
                              : 'bg-[#0e0e14]/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-100 hover:bg-[#121218]/70'
                          } ${getHighlightClass('rs-term-select')}`}
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Select Starting Intake */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold tracking-wider text-slate-400">Starting intake:</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <select
                          value={onboardingData.startingTerm}
                          onChange={(e) => setOnboardingData({ ...onboardingData, startingTerm: e.target.value as any })}
                          className={`w-full appearance-none bg-[#0e0e14] border border-slate-800/80 text-xs pl-3.5 pr-9 py-2.5 rounded-2xl text-slate-100 outline-none focus:border-indigo-500 transition cursor-pointer font-semibold ${getHighlightClass('starting-intake-select')}`}
                          data-tutorial="starting-intake-select"
                        >
                          <option value="Spring">Spring</option>
                          <option value="Summer">Summer</option>
                          <option value="Fall">Fall</option>
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      
                      <div className="relative">
                        <select
                          value={onboardingData.startingYear}
                          onChange={(e) => setOnboardingData({ ...onboardingData, startingYear: parseInt(e.target.value) })}
                          className={`w-full appearance-none bg-[#0e0e14] border border-slate-800/80 text-xs pl-3.5 pr-9 py-2.5 rounded-2xl text-slate-100 outline-none focus:border-indigo-500 transition cursor-pointer font-semibold ${getHighlightClass('starting-intake-select')}`}
                        >
                          {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Select English Prior Status */}
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-bold tracking-wider text-slate-400">
                      English status prior to RS:
                    </label>
                    <div className="space-y-2.5" data-tutorial="english-status-select">
                      
                      {onboardingData.creditOption === 'opt2' ? (
                        <>
                          <button
                            onClick={() => setOnboardingData({ ...onboardingData, engStatusPriorToRS: 'caseA' })}
                            className={`w-full p-4 rounded-2xl border text-left text-xs transition-all duration-300 flex items-center justify-between cursor-pointer ${
                              onboardingData.engStatusPriorToRS === 'caseA'
                                ? 'bg-gradient-to-br from-indigo-900/30 to-blue-900/20 border-indigo-500 text-indigo-300 font-bold shadow-md shadow-indigo-500/15'
                                : 'bg-[#0e0e14]/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-100 hover:bg-[#121218]/70'
                            } ${getHighlightClass('english-status-select')}`}
                          >
                            <div>
                              <p className="text-white font-bold text-xs">Have not completed ENG102 before RS (will take ENG102 during RS)</p>
                              <p className="text-[10px] text-indigo-400 mt-0.5 font-medium">RS card will auto-assign: ENG102 as your 4th course</p>
                            </div>
                            {onboardingData.engStatusPriorToRS === 'caseA' && <Check className="h-5 w-5 text-indigo-400 shrink-0" />}
                          </button>

                          <button
                            onClick={() => setOnboardingData({ ...onboardingData, engStatusPriorToRS: 'caseD' })}
                            className={`w-full p-4 rounded-2xl border text-left text-xs transition-all duration-300 flex items-center justify-between cursor-pointer ${
                              onboardingData.engStatusPriorToRS === 'caseD'
                                ? 'bg-gradient-to-br from-indigo-900/30 to-blue-900/20 border-indigo-500 text-indigo-300 font-bold shadow-md shadow-indigo-500/15'
                                : 'bg-[#0e0e14]/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-100 hover:bg-[#121218]/70'
                            } ${getHighlightClass('english-status-select')}`}
                          >
                            <div>
                              <p className="text-white font-bold text-xs">Completed ENG102 before RS</p>
                              <p className="text-[10px] text-emerald-400 mt-0.5 font-medium">RS card will auto-assign: BU201 as your 4th course</p>
                            </div>
                            {onboardingData.engStatusPriorToRS === 'caseD' && <Check className="h-5 w-5 text-indigo-400 shrink-0" />}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setOnboardingData({ ...onboardingData, engStatusPriorToRS: 'caseA' })}
                            className={`w-full p-4 rounded-2xl border text-left text-xs transition-all duration-300 flex items-center justify-between cursor-pointer ${
                              onboardingData.engStatusPriorToRS === 'caseA'
                                ? 'bg-gradient-to-br from-indigo-900/30 to-blue-900/20 border-indigo-500 text-indigo-300 font-bold shadow-md shadow-indigo-500/15'
                                : 'bg-[#0e0e14]/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-100 hover:bg-[#121218]/70'
                            } ${getHighlightClass('english-status-select')}`}
                          >
                            <div>
                              <p className="text-white font-bold text-xs">Passed ENG101, but NOT ENG102 before RS</p>
                              <p className="text-[10px] text-indigo-400 mt-0.5 font-medium">RS card will auto-assign: ENG102 as your 4th course</p>
                            </div>
                            {onboardingData.engStatusPriorToRS === 'caseA' && <Check className="h-5 w-5 text-indigo-400 shrink-0" />}
                          </button>

                          <button
                            onClick={() => setOnboardingData({ ...onboardingData, engStatusPriorToRS: 'caseB' })}
                            className={`w-full p-4 rounded-2xl border text-left text-xs transition-all duration-300 flex items-center justify-between cursor-pointer ${
                              onboardingData.engStatusPriorToRS === 'caseB'
                                ? 'bg-gradient-to-br from-indigo-900/30 to-blue-900/20 border-indigo-500 text-indigo-300 font-bold shadow-md shadow-indigo-500/15'
                                : 'bg-[#0e0e14]/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-100 hover:bg-[#121218]/70'
                            } ${getHighlightClass('english-status-select')}`}
                          >
                            <div>
                              <p className="text-white font-bold text-xs">Passed ENG101 and ENG102 before RS</p>
                              <p className="text-[10px] text-emerald-400 mt-0.5 font-medium">RS card will auto-assign: BU201 as your 4th course</p>
                            </div>
                            {onboardingData.engStatusPriorToRS === 'caseB' && <Check className="h-5 w-5 text-indigo-400 shrink-0" />}
                          </button>

                          <button
                            onClick={() => setOnboardingData({ ...onboardingData, engStatusPriorToRS: 'caseC' })}
                            className={`w-full p-4 rounded-2xl border text-left text-xs transition-all duration-300 flex items-center justify-between cursor-pointer ${
                              onboardingData.engStatusPriorToRS === 'caseC'
                                ? 'bg-gradient-to-br from-indigo-900/30 to-blue-900/20 border-indigo-500 text-indigo-300 font-bold shadow-md shadow-indigo-500/15'
                                : 'bg-[#0e0e14]/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-100 hover:bg-[#121218]/70'
                            } ${getHighlightClass('english-status-select')}`}
                          >
                            <div>
                              <p className="text-white font-bold text-xs">Failed ENG101 before RS</p>
                              <p className="text-[10px] text-emerald-400 mt-0.5 font-medium">RS card will auto-assign: BU201 as your 4th course</p>
                            </div>
                            {onboardingData.engStatusPriorToRS === 'caseC' && <Check className="h-5 w-5 text-indigo-400 shrink-0" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="text-slate-400 hover:text-slate-200 text-xs font-bold transition cursor-pointer px-4 py-2 rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (onboardingData.engStatusPriorToRS) {
                        setWizardStep(3);
                        if (tutorialStep === 3) {
                          handleTutorialStepChange(4);
                        }
                      }
                    }}
                    disabled={!onboardingData.engStatusPriorToRS}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 hover:from-blue-500 hover:via-indigo-500 hover:to-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-500/25 transition duration-200 cursor-pointer text-xs uppercase tracking-wider active:scale-[0.98]"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Summary and Generation */}
            {wizardStep === 3 && (
              <div className="space-y-6 relative z-10">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-white">Generate Your Study Plan</h2>
                  <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                    Review your generated curriculum layout summary:
                  </p>
                </div>

                <div className="bg-[#050508] border border-slate-800/80 p-5 rounded-2xl space-y-1 text-xs shadow-inner">
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-800/60 last:border-0">
                    <span className="text-slate-400 font-medium">Starting Pathway:</span>
                    <span className="text-right text-xs font-bold text-slate-200 break-words max-w-[65%] capitalize">
                      {onboardingData.pathway === 'foundation' ? "Non-Credit Foundation" : "Direct Credit Course"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-slate-800/60 last:border-0">
                    <span className="text-slate-400 font-medium">1st Semester Course:</span>
                    <span className="text-right text-xs font-bold text-indigo-300 break-words max-w-[65%]">
                      {onboardingData.pathway === 'foundation' 
                        ? ([
                            onboardingData.remedialEng091Checked ? "ENG091" : null,
                            onboardingData.remedialMat091Checked ? "MAT091" : null,
                            onboardingData.remedialMat092Checked ? "MAT092" : null
                          ].filter(Boolean).join(" + ") || "None (Remedial Exempt)")
                        : (onboardingData.creditOption === 'opt1' ? "ENG101" : "ENG102")
                      }
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-slate-800/60 last:border-0">
                    <span className="text-slate-400 font-medium">RS Semester Card:</span>
                    <span className="text-right text-xs font-bold text-emerald-400 break-words max-w-[65%]">
                      {onboardingData.rsTerm}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-slate-800/60 last:border-0">
                    <span className="text-slate-400 font-medium">RS Course Population:</span>
                    <span className="text-right text-xs font-bold text-slate-200 break-words max-w-[65%]">
                      {onboardingData.engStatusPriorToRS === 'caseA' ? "EMB101 + HUM103 + BNG103 + ENG102" : "EMB101 + HUM103 + BNG103 + BU201"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="text-slate-400 hover:text-slate-200 text-xs font-bold transition cursor-pointer px-4 py-2 rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      generateInitialPlan();
                      if (tutorialStep === 4) {
                        handleTutorialStepChange(5);
                      }
                    }}
                    className={`px-7 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 hover:from-blue-500 hover:via-indigo-500 hover:to-indigo-400 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-500/25 transition duration-200 cursor-pointer text-xs uppercase tracking-wider active:scale-[0.98] ${getHighlightClass('generate-plan-btn')}`}
                    data-tutorial="generate-plan-btn"
                  >
                    Generate Plan
                  </button>
                </div>
              </div>
            )}

            {/* Dynamic spacer on mobile when tutorial is active, so the user can scroll past the floating tutorial popover */}
            {tutorialStep !== null && (
              <div className="h-60 md:hidden" />
            )}
          </div>
        </div>
      ) : (
        /* Actual App Dashboard */
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-6 py-4 flex flex-col min-w-0">
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-w-0 w-full">
            
            {/* A. LEFT SIDEBAR: Degree Progress & Statistics */}
            <aside className="w-full lg:w-[38%] shrink-0 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-32px)] flex flex-col gap-6 lg:overflow-y-auto pr-4 custom-scrollbar">
              
              {/* 1. Degree Standing Card */}
              <div className="bg-[#08080d]/90 border border-slate-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md shrink-0">
                <div className="absolute top-0 right-0 h-32 w-32 bg-blue-500/[0.03] rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-bold text-blue-400 tracking-wider uppercase flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4" />
                    Degree Standing
                  </h2>
                  <span className="text-[11px] font-mono font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                    {Math.round((cumulativeStats.completedCredits / 136) * 100)}%
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-baseline text-xs mb-2">
                      <span className="text-slate-400 font-medium">Completed Credits</span>
                      <span className="text-slate-100 font-extrabold text-sm">{cumulativeStats.completedCredits} <span className="text-slate-400 font-normal text-xs">/ 136 Cr</span></span>
                    </div>
                    <div className="h-3 w-full bg-[#040406] border border-slate-800/80 rounded-full overflow-hidden p-0.5 shadow-inner">
                      <div 
                        style={{ width: `${Math.min(100, (cumulativeStats.completedCredits / 136) * 100)}%` }}
                        className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-indigo-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

                {/* 2. Middle Section: Cumulative CGPA display, Probation Badge, and the Target CGPA Solver widget */}
                {mode === 'gpa' && (
                  <div className="bg-[#08080d]/90 border border-slate-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md shrink-0 space-y-6">
                    <h2 className="text-xs font-bold text-indigo-400 tracking-wider uppercase flex items-center gap-2">
                      <Gauge className="h-4 w-4" />
                      GPA Dashboard
                    </h2>

                    {/* Cumulative CGPA Box */}
                    <div className="bg-[#0e0e14]/70 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-inner">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Cumulative CGPA</p>
                        <p className="text-3xl lg:text-4xl font-black text-white mt-1 tracking-tight">
                          {cumulativeStats.cgpa.toFixed(2)}
                        </p>
                      </div>
                      <div className="pt-0.5">
                        {cumulativeStats.cgpa >= 2.0 ? (
                          <span className="inline-flex items-center justify-center whitespace-nowrap text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-3.5 py-1.5 rounded-xl uppercase tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                            Good Standing
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center whitespace-nowrap text-xs font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400 px-3.5 py-1.5 rounded-xl uppercase tracking-wider shadow-[0_0_12px_rgba(244,63,94,0.15)]">
                            Probation Range
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Target CGPA Solver Widget */}
                    <div 
                      className={`bg-[#0e0e14]/60 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4 transition-all ${getHighlightClass('gpa-solver-card')}`}
                      data-tutorial="gpa-solver-card"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.18)] shrink-0">
                            <Crosshair className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold tracking-wider text-slate-100 uppercase truncate">
                              TARGET SOLVER
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              CGPA Goal Calculator
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 bg-[#050508] border border-slate-800 focus-within:border-indigo-500/50 rounded-xl px-3 py-1.5 shadow-inner transition-colors shrink-0">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Goal:</span>
                          <input
                            type="number"
                            step="0.01"
                            min="1.5"
                            max="4.0"
                            value={targetCgpa}
                            onChange={(e) => setTargetCgpa(e.target.value)}
                            className="w-12 text-sm font-bold font-mono text-indigo-300 bg-transparent focus:outline-none text-center appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none selection:bg-indigo-500/30"
                          />
                        </div>
                      </div>

                      {targetSolverResult.isAchieved ? (
                        <div className="flex items-center gap-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3.5 text-emerald-300">
                          <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div className="min-w-0 text-xs">
                            <p className="font-bold text-emerald-200 uppercase tracking-wider text-[11px]">Goal Achieved!</p>
                            <p className="text-emerald-300/80 text-[11px] mt-0.5">
                              Graduation requirements fulfilled. Final CGPA: <span className="font-bold font-mono text-emerald-200">{targetSolverResult.maxPossibleCgpa.toFixed(2)}</span>
                            </p>
                          </div>
                        </div>
                      ) : targetSolverResult.requiredGpa > 4.00 ? (
                        <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3.5 space-y-2 text-rose-300">
                          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs tracking-wider uppercase">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>Target Out of Reach</span>
                          </div>
                          <p className="text-[11px] text-rose-300/80 leading-relaxed">
                            Even scoring a flat <strong className="text-rose-200 font-bold">4.00 (all A's)</strong> across your remaining credits yields a maximum possible graduation CGPA of <span className="font-mono font-bold text-rose-200 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">{targetSolverResult.maxPossibleCgpa.toFixed(2)}</span>.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2.5">
                            {/* Required GPA Stat Card */}
                            <div className="bg-[#050508]/80 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                              <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                                Required GPA / Sem
                              </span>
                              <div className="flex items-baseline gap-2 mt-1.5">
                                <span className="text-xl font-bold font-mono text-white tracking-tight">
                                  {Math.max(0, targetSolverResult.requiredGpa).toFixed(2)}
                                </span>
                                <span className="text-[11px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-lg">
                                  {targetSolverResult.letterEquivalent}
                                </span>
                              </div>
                            </div>

                            {/* Remaining Credits Stat Card */}
                            <div className="bg-[#050508]/80 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
                              <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                                Remaining Credits
                              </span>
                              <div className="flex items-baseline gap-1 mt-1.5">
                                <span className="text-xl font-bold font-mono text-slate-100 tracking-tight">
                                  {targetSolverResult.remainingCredits}
                                </span>
                                <span className="text-[11px] font-medium text-slate-400">
                                  cr
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Summary Row */}
                          <div className="flex items-center gap-2.5 bg-[#050508]/60 border border-slate-800/60 rounded-xl px-3 py-2 text-[11px] text-slate-300 leading-relaxed">
                            <ArrowUpRight className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            <span>
                              Maintain an average of <strong className="text-indigo-300 font-semibold">{Math.max(0, targetSolverResult.requiredGpa).toFixed(2)} ({targetSolverResult.letterEquivalent})</strong> over remaining credits to reach your <strong className="text-white font-semibold">{targetCgpa}</strong> goal.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Repeat ROI Analyzer Sidebar Widget */}
                    <div 
                      className={`bg-[#0e0e14]/60 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg transition-all ${getHighlightClass('roi-analyzer')}`}
                      data-tutorial="roi-analyzer"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.18)] shrink-0">
                            <Repeat className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold tracking-wider text-slate-100 uppercase truncate">
                              REPEAT ROI ANALYZER
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              Simulate grade improvement impact
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowRoiModal(true)}
                          className="px-3.5 py-2 bg-[#121218] hover:bg-[#161622] border border-slate-700/80 hover:border-indigo-500/50 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] shrink-0 cursor-pointer"
                        >
                          <span>{roiAnalysis.candidates.length} courses</span>
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Bottom Section: Category Requirements */}
                <div className="bg-[#08080d]/90 border border-slate-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md shrink-0 space-y-5">
                  <h2 className="text-xs font-bold text-indigo-400 tracking-wider uppercase flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Category Requirements
                  </h2>

                  <div className="space-y-3.5">
                    {/* 1. Mandatory Core - Blue Accent Card */}
                    <button
                      type="button"
                      onClick={() => setActiveCategorySelectorKey('core')}
                      className={`w-full text-left cursor-pointer bg-blue-950/15 border border-blue-500/20 hover:bg-blue-950/25 hover:border-blue-500/40 transition-all rounded-2xl p-4 flex flex-col gap-2.5 focus:outline-none group shadow-sm ${getHighlightClass('category-core')}`}
                      data-tutorial="category-core"
                    >
                      <div className="w-full flex justify-between items-center text-xs">
                        <span className="text-blue-200 font-semibold group-hover:text-blue-100 transition-colors">Program Core (Mandatory)</span>
                        <span className="text-blue-300 font-extrabold text-[11px] bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 rounded-full">{curriculumProgress.coreCompleted} / {curriculumProgress.coreTotal} Cr</span>
                      </div>
                      <div className="h-2.5 w-full bg-[#040406] border border-blue-500/20 rounded-full overflow-hidden p-0.5">
                        <div 
                          style={{ width: `${(curriculumProgress.coreCompleted / curriculumProgress.coreTotal) * 100}%` }}
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                        />
                      </div>
                    </button>

                    {/* Capstone Thesis - Purple Accent Card */}
                    <div
                      className={`w-full bg-purple-950/15 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-4 flex flex-col gap-2.5 transition-all shadow-sm ${getHighlightClass('category-thesis')}`}
                    >
                      <div className="w-full flex justify-between items-center text-xs">
                        <span className="text-purple-200 font-semibold">Capstone Thesis (CSE400)</span>
                        <span className="text-purple-300 font-extrabold text-[11px] bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-full">{curriculumProgress.thesisCompleted} / {curriculumProgress.thesisTotal} Cr</span>
                      </div>
                      <div className="h-2.5 w-full bg-[#040406] border border-purple-500/20 rounded-full overflow-hidden p-0.5">
                        <div 
                          style={{ width: `${(curriculumProgress.thesisCompleted / curriculumProgress.thesisTotal) * 100}%` }}
                          className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                        />
                      </div>
                    </div>

                    {/* 2. School Core (Math & Sciences) - Cyan Accent Card */}
                    <button
                      type="button"
                      onClick={() => setActiveCategorySelectorKey('schoolCore')}
                      className={`w-full text-left cursor-pointer bg-cyan-950/15 border border-cyan-500/20 hover:bg-cyan-950/25 hover:border-cyan-500/40 transition-all rounded-2xl p-4 flex flex-col gap-2.5 focus:outline-none group shadow-sm ${getHighlightClass('category-school')}`}
                      data-tutorial="category-school"
                    >
                      <div className="w-full flex justify-between items-center text-xs">
                        <span className="text-cyan-200 font-semibold group-hover:text-cyan-100 transition-colors">School Core (Math &amp; Sciences)</span>
                        <span className="text-cyan-300 font-extrabold text-[11px] bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">{curriculumProgress.schoolCoreCompleted} / {curriculumProgress.schoolCoreTotal} Cr</span>
                      </div>
                      <div className="h-2.5 w-full bg-[#040406] border border-cyan-500/20 rounded-full overflow-hidden p-0.5">
                        <div 
                          style={{ width: `${(curriculumProgress.schoolCoreCompleted / curriculumProgress.schoolCoreTotal) * 100}%` }}
                          className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                        />
                      </div>
                    </button>

                    {/* 3. CSE Major Electives - Amber Accent Card */}
                    <button
                      type="button"
                      onClick={() => setActiveCategorySelectorKey('electives')}
                      className={`w-full text-left cursor-pointer bg-amber-950/15 border border-amber-500/20 hover:bg-amber-950/25 hover:border-amber-500/40 transition-all rounded-2xl p-4 flex flex-col gap-2.5 focus:outline-none group shadow-sm ${getHighlightClass('category-electives')}`}
                      data-tutorial="category-electives"
                    >
                      <div className="w-full flex justify-between items-center text-xs">
                        <span className="text-amber-200 font-semibold group-hover:text-amber-100 transition-colors">CSE Major Electives</span>
                        <span className="text-amber-300 font-extrabold text-[11px] bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">{curriculumProgress.electiveCompleted} / {curriculumProgress.electiveTotal} Cr</span>
                      </div>
                      <div className="h-2.5 w-full bg-[#040406] border border-amber-500/20 rounded-full overflow-hidden p-0.5">
                        <div 
                          style={{ width: `${(curriculumProgress.electiveCompleted / curriculumProgress.electiveTotal) * 100}%` }}
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                        />
                      </div>
                    </button>
                  </div>

                  {/* 4. GenEd Streams */}
                  <div className="pt-4 border-t border-slate-800/80 space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GenEd Streams Progress (39 Cr Total)</p>
                    
                    {/* Stream 1: Writing */}
                    <button
                      type="button"
                      onClick={() => setActiveCategorySelectorKey('stream1')}
                      className={`w-full text-left cursor-pointer bg-rose-950/10 border border-rose-500/15 hover:bg-rose-950/20 hover:border-rose-500/35 transition-all rounded-xl p-3 flex flex-col gap-2 focus:outline-none group ${getHighlightClass('category-gened')}`}
                      data-tutorial="category-gened"
                    >
                      <div className="w-full flex justify-between items-center text-[11px]">
                        <span className="text-rose-200/90 group-hover:text-rose-100 font-medium">GenEd Stream 1 (Writing Comprehension)</span>
                        <span className="text-rose-300 font-extrabold text-[10px] bg-rose-500/15 border border-rose-500/25 px-2 py-0.5 rounded-full">{curriculumProgress.stream1Completed} / {curriculumProgress.stream1Total} Cr</span>
                      </div>
                      <div className="h-2 w-full bg-[#040406] border border-rose-500/15 rounded-full overflow-hidden p-0.5">
                        <div 
                          style={{ width: `${(curriculumProgress.stream1Completed / curriculumProgress.stream1Total) * 100}%` }}
                          className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-300"
                        />
                      </div>
                    </button>

                    {/* Stream 2: Math/Sci */}
                    <button
                      type="button"
                      onClick={() => setActiveCategorySelectorKey('stream2')}
                      className={`w-full text-left cursor-pointer bg-indigo-950/10 border border-indigo-500/15 hover:bg-indigo-950/20 hover:border-indigo-500/35 transition-all rounded-xl p-3 flex flex-col gap-2 focus:outline-none group ${getHighlightClass('category-gened')}`}
                      data-tutorial="category-gened"
                    >
                      <div className="w-full flex justify-between items-center text-[11px]">
                        <span className="text-indigo-200/90 group-hover:text-indigo-100 font-medium">GenEd Stream 2 (Math &amp; Natural Sciences)</span>
                        <span className="text-indigo-300 font-extrabold text-[10px] bg-indigo-500/15 border border-indigo-500/25 px-2 py-0.5 rounded-full">{curriculumProgress.stream2Completed} / {curriculumProgress.stream2Total} Cr</span>
                      </div>
                      <div className="h-2 w-full bg-[#040406] border border-indigo-500/15 rounded-full overflow-hidden p-0.5">
                        <div 
                          style={{ width: `${(curriculumProgress.stream2Completed / curriculumProgress.stream2Total) * 100}%` }}
                          className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-300"
                        />
                      </div>
                    </button>

                    {/* Stream 3: Arts */}
                    <button
                      type="button"
                      onClick={() => setActiveCategorySelectorKey('stream3')}
                      className={`w-full text-left cursor-pointer bg-emerald-950/10 border border-emerald-500/15 hover:bg-emerald-950/20 hover:border-emerald-500/35 transition-all rounded-xl p-3 flex flex-col gap-2 focus:outline-none group ${getHighlightClass('category-gened')}`}
                      data-tutorial="category-gened"
                    >
                      <div className="w-full flex justify-between items-center text-[11px]">
                        <span className="text-emerald-200/90 group-hover:text-emerald-100 font-medium">GenEd Stream 3 (Arts &amp; Humanities)</span>
                        <span className="text-emerald-300 font-extrabold text-[10px] bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full">{curriculumProgress.stream3Completed} / {curriculumProgress.stream3Total} Cr</span>
                      </div>
                      <div className="h-2 w-full bg-[#040406] border border-emerald-500/15 rounded-full overflow-hidden p-0.5">
                        <div 
                          style={{ width: `${(curriculumProgress.stream3Completed / curriculumProgress.stream3Total) * 100}%` }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                        />
                      </div>
                    </button>

                    {/* Stream 4: Social */}
                    <button
                      type="button"
                      onClick={() => setActiveCategorySelectorKey('stream4')}
                      className={`w-full text-left cursor-pointer bg-violet-950/10 border border-violet-500/15 hover:bg-violet-950/20 hover:border-violet-500/35 transition-all rounded-xl p-3 flex flex-col gap-2 focus:outline-none group ${getHighlightClass('category-gened')}`}
                      data-tutorial="category-gened"
                    >
                      <div className="w-full flex justify-between items-center text-[11px]">
                        <span className="text-violet-200/90 group-hover:text-violet-100 font-medium">GenEd Stream 4 (Social Sciences)</span>
                        <span className="text-violet-300 font-extrabold text-[10px] bg-violet-500/15 border border-violet-500/25 px-2 py-0.5 rounded-full">{curriculumProgress.stream4Completed} / {curriculumProgress.stream4Total} Cr</span>
                      </div>
                      <div className="h-2 w-full bg-[#040406] border border-violet-500/15 rounded-full overflow-hidden p-0.5">
                        <div 
                          style={{ width: `${(curriculumProgress.stream4Completed / curriculumProgress.stream4Total) * 100}%` }}
                          className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-300"
                        />
                      </div>
                    </button>

                    {/* Stream 5: CST */}
                    <button
                      type="button"
                      onClick={() => setActiveCategorySelectorKey('stream5')}
                      className={`w-full text-left cursor-pointer bg-teal-950/10 border border-teal-500/15 hover:bg-teal-950/20 hover:border-teal-500/35 transition-all rounded-xl p-3 flex flex-col gap-2 focus:outline-none group ${getHighlightClass('category-gened')}`}
                      data-tutorial="category-gened"
                    >
                      <div className="w-full flex justify-between items-center text-[11px]">
                        <span className="text-teal-200/90 group-hover:text-teal-100 font-medium">GenEd Stream 5 (Communities / CST)</span>
                        <span className="text-teal-300 font-extrabold text-[10px] bg-teal-500/15 border border-teal-500/25 px-2 py-0.5 rounded-full">{curriculumProgress.stream5Completed} / {curriculumProgress.stream5Total} Cr</span>
                      </div>
                      <div className="h-2 w-full bg-[#040406] border border-teal-500/15 rounded-full overflow-hidden p-0.5">
                        <div 
                          style={{ width: `${(curriculumProgress.stream5Completed / curriculumProgress.stream5Total) * 100}%` }}
                          className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-300"
                        />
                      </div>
                    </button>

                    {/* Free GenEd Choice */}
                    <button
                      type="button"
                      onClick={() => setActiveCategorySelectorKey('freeGenEd')}
                      className={`w-full text-left cursor-pointer bg-slate-900/30 border border-slate-800 hover:bg-slate-900/50 hover:border-slate-700 transition-all rounded-xl p-3 flex flex-col gap-2 focus:outline-none group ${getHighlightClass('category-gened')}`}
                      data-tutorial="category-gened"
                    >
                      <div className="w-full flex justify-between items-center text-[11px]">
                        <span className="text-slate-300 group-hover:text-white font-medium">GenEd Electives (Free Choice)</span>
                        <span className="text-slate-300 font-extrabold text-[10px] bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded-full">{curriculumProgress.freeGenEdCredits} / {curriculumProgress.freeGenEdTotal} Cr</span>
                      </div>
                      <div className="h-2 w-full bg-[#040406] border border-slate-800 rounded-full overflow-hidden p-0.5">
                        <div 
                          style={{ width: `${(curriculumProgress.freeGenEdCredits / curriculumProgress.freeGenEdTotal) * 100}%` }}
                          className="h-full bg-gradient-to-r from-slate-500 to-indigo-500 rounded-full transition-all duration-300"
                        />
                      </div>
                    </button>
                  </div>
                </div>
              </aside>

          {/* B. RIGHT PANEL: Semester Timeline Card Schedule */}
          <main className="flex-1 w-full min-w-0 max-w-full lg:overflow-y-auto pr-0 lg:pr-4 custom-scrollbar space-y-6 pb-20">
            
            {/* Semester timelines header */}
            <div className="grid grid-cols-3 items-center border-b border-slate-800/80 pb-3">
              {/* Left Column: Title */}
              <div className="flex justify-start">
                <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                  <span>Semester Planner</span>
                </h2>
              </div>

              {/* Center Column: View Switcher Toggle */}
              <div className="flex justify-center">
                <div 
                  className={`flex items-center bg-[#050508] border border-slate-800/90 rounded-2xl p-1 shadow-inner ${getHighlightClass('layout-toggles')}`}
                  data-tutorial="layout-toggles"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleViewMode("list")}
                    title="List Feed"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currentLayout === "list"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleViewMode("kanban")}
                    title="Kanban Board"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currentLayout === "kanban"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Columns className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Board</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex justify-end items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleAllCollapse}
                  className="bg-[#08080d] border border-slate-800/80 hover:border-slate-700/80 text-slate-300 hover:text-white p-2 rounded-2xl transition flex items-center justify-center h-9 w-9 shrink-0 cursor-pointer shadow-sm"
                  title={isAnyExpanded ? "Collapse All" : "Expand All"}
                >
                  {isAnyExpanded ? (
                    <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="6" x2="13" y2="6" />
                      <line x1="3" y1="12" x2="13" y2="12" />
                      <line x1="3" y1="18" x2="13" y2="18" />
                      <path d="M18 4V10M18 10L15 7M18 10L21 7" />
                      <path d="M18 20V14M18 14L15 17M18 14L21 17" />
                    </svg>
                  ) : (
                    <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="6" x2="13" y2="6" />
                      <line x1="3" y1="12" x2="13" y2="12" />
                      <line x1="3" y1="18" x2="13" y2="18" />
                      <path d="M18 10V4M18 4L15 7M18 4L21 7" />
                      <path d="M18 14V20M18 20L15 17M18 20L21 17" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleAddSemester}
                  className="flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl shadow-lg shadow-blue-600/25 transition whitespace-nowrap h-9 w-9 shrink-0 cursor-pointer"
                  title="Add New Semester"
                >
                  <Plus className="h-4.5 w-4.5 shrink-0 stroke-[2.2]" />
                </button>
              </div>
            </div>

            {/* List of Semester Cards */}
            <div className={
              currentLayout === 'kanban' 
                ? "flex flex-row gap-4 sm:gap-6 overflow-x-auto pt-8 pb-5 px-1 sm:px-3 items-end snap-x max-w-full min-w-0 custom-scrollbar scale-y-[-1]" 
                : "space-y-6"
            }>
              {simulatedSemesters.map((sem, semIdx) => {
                const stats = semesterStats.find(s => s.id === sem.id);
                const hasCSE400 = sem.courses.some(c => c.code === "CSE400");
                const isSemester9Plus = semIdx >= 8; // index 8 is the 9th semester card
                const intake = semesterIntakes[semIdx];
                const isAllCompleted = sem.courses.length > 0 && sem.courses.every(c => c.isCompleted);

                return (
                  <div 
                    key={sem.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const code = e.dataTransfer.getData("text/plain");
                      if (draggingSourceSemesterId) {
                        handleDragMoveCourse(code, draggingSourceSemesterId, sem.id);
                      }
                    }}
                    onDragEnter={() => setDragOverSemesterId(sem.id)}
                    onDragLeave={() => setDragOverSemesterId(null)}
                    className={`${
                      currentLayout === 'kanban' 
                        ? `w-[84vw] sm:w-[340px] min-w-[280px] max-w-[340px] flex-shrink-0 snap-start flex flex-col scale-y-[-1] self-end` 
                        : ""
                    } border rounded-3xl overflow-visible shadow-xl backdrop-blur-md hover:border-white/[0.12] transition-all duration-300 relative ${
                      draggingCourseCode && dragOverSemesterId === sem.id 
                        ? "border-dashed border-2 border-indigo-500 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.2)]" 
                        : sem.isRS 
                          ? "border-indigo-500/30 bg-[#0a0b12]/95 shadow-[0_0_20px_rgba(99,102,241,0.06)]" 
                          : "border-white/[0.08] bg-[#07070b]/95"
                    }`}
                  >
                    <div className="absolute top-0 right-0 h-28 w-28 bg-indigo-500/[0.02] rounded-full blur-2xl pointer-events-none" />
                    {/* Semester Card Header */}
                    {sem.isCollapsed ? (
                      /* Collapsed Compact State */
                      <div className="bg-white/[0.02] p-3.5 rounded-3xl flex items-center justify-between gap-2.5 transition-all">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            onClick={() => handleToggleSemesterAllCompleted(sem.id)}
                            title={isAllCompleted ? "Mark all incomplete" : "Mark all completed"}
                            className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              isAllCompleted
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-transparent shadow-[0_0_10px_rgba(59,130,246,0.6)]'
                                : 'border-white/20 bg-white/[0.03] hover:border-white/40'
                            }`}
                          >
                            {isAllCompleted && (
                              <Check className="h-3 w-3 text-white stroke-[3]" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-black text-sm text-white tracking-tight truncate">
                                {`Semester ${semIdx + 1}`}
                              </h3>
                              <span className="text-[11px] text-slate-400 font-semibold font-mono">
                                ({sem.term || intake?.term || 'Spring'} {sem.year || intake?.year || 2025})
                              </span>
                              {sem.isRS && (
                                <span className="text-[9px] font-extrabold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                  RS
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                              <span><strong className="text-white font-mono">{stats?.credits ?? 0}</strong> Credits</span>
                              {mode === 'gpa' && stats?.gpa != null && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-indigo-300 font-bold font-mono">GPA {stats.gpa.toFixed(2)}</span>
                                </>
                              )}
                              <span className="text-slate-600">•</span>
                              <span>{sem.courses.length} course{sem.courses.length !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Expand & Delete */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = semesters.map(s => {
                                if (s.id === sem.id) {
                                  return { ...s, isCollapsed: false };
                                }
                                return s;
                              });
                              updateSemesters(updated);
                            }}
                            className="w-7 h-7 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                            title="Expand Semester"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteSemester(sem.id)}
                            className="w-7 h-7 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 border border-white/[0.08] hover:border-rose-500/30 text-slate-400 hover:text-rose-400 flex items-center justify-center transition cursor-pointer"
                            title="Delete Semester"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Expanded State Header */
                      <div className="bg-white/[0.02] p-4 rounded-t-3xl border-b border-white/[0.06] space-y-3 transition-all">
                        {/* Row 1: Checkbox + Title on left; Minimize + Trash on right */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              onClick={() => handleToggleSemesterAllCompleted(sem.id)}
                              title={isAllCompleted ? "Mark all incomplete" : "Mark all completed"}
                              className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                isAllCompleted
                                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-transparent shadow-[0_0_10px_rgba(59,130,246,0.6)]'
                                  : 'border-white/20 bg-white/[0.03] hover:border-white/40'
                              }`}
                            >
                              {isAllCompleted && (
                                <Check className="h-3 w-3 text-white stroke-[3]" />
                              )}
                            </button>
                            <h3 className="font-black text-sm text-white tracking-tight truncate">
                              {`Semester ${semIdx + 1}`}
                            </h3>
                          </div>

                          {/* Top Right Action Group: Minimize & Delete */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = semesters.map(s => {
                                  if (s.id === sem.id) {
                                    return { ...s, isCollapsed: true };
                                  }
                                  return s;
                                });
                                updateSemesters(updated);
                              }}
                              className="w-7 h-7 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                              title="Minimize Semester"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteSemester(sem.id)}
                              className="w-7 h-7 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 border border-white/[0.08] hover:border-rose-500/30 text-slate-400 hover:text-rose-400 flex items-center justify-center transition cursor-pointer"
                              title="Delete Semester"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Row 2: Intake Selectors on left; Add Course Button on right */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <select
                              value={sem.term || intake?.term || 'Spring'}
                              onChange={(e) => handleOverrideIntake(sem.id, e.target.value as any, sem.year || intake?.year || onboardingData.startingYear)}
                              className="bg-[#08080d] border border-white/[0.1] hover:border-indigo-400/40 text-[11px] text-slate-200 rounded-xl px-2.5 py-1 outline-none cursor-pointer focus:border-indigo-400 font-semibold transition shadow-inner"
                            >
                              <option value="Spring">Spring</option>
                              <option value="Summer">Summer</option>
                              <option value="Fall">Fall</option>
                            </select>
                            <select
                              value={sem.year || intake?.year || 2025}
                              onChange={(e) => handleOverrideIntake(sem.id, sem.term || intake?.term || 'Spring', parseInt(e.target.value))}
                              className="bg-[#08080d] border border-white/[0.1] hover:border-indigo-400/40 text-[11px] text-slate-200 rounded-xl px-2.5 py-1 outline-none cursor-pointer focus:border-indigo-400 font-semibold transition shadow-inner"
                            >
                              {Array.from({ length: 101 }, (_, i) => 2001 + i).map(year => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </select>
                          </div>

                          <button
                            onClick={() => {
                              setSwappingCourseCode(null);
                              setActiveCourseSelectorSemesterId(sem.id);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white px-3 py-1 rounded-xl flex items-center gap-1.5 text-xs font-bold transition shadow-md shadow-indigo-600/20 cursor-pointer shrink-0"
                            title="Add Course to Semester"
                          >
                            <PlusCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>Add Course</span>
                          </button>
                        </div>

                        {/* Row 3: Metrics (Credits, GPA, RS status) */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-medium text-slate-300 bg-[#090a10] border border-white/[0.08] px-2.5 py-0.5 rounded-lg shadow-inner">
                              Credits: <strong className="text-white font-mono">{stats?.credits ?? 0}</strong>
                            </span>
                            {mode === 'gpa' && stats?.gpa != null && (
                              <span className="text-[11px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-0.5 rounded-lg">
                                GPA: <strong className="font-mono">{stats.gpa.toFixed(2)}</strong>
                              </span>
                            )}
                          </div>

                          <div>
                            {sem.isRS ? (
                              <span className="text-[10px] font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-lg tracking-wider uppercase select-none shadow-sm">
                                RS
                              </span>
                            ) : (
                              <button
                                onClick={() => handleMarkAsRS(sem.id)}
                                className="text-[10px] font-bold bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.16] text-slate-400 hover:text-slate-200 px-2.5 py-0.5 rounded-lg tracking-wider uppercase transition cursor-pointer"
                              >
                                Mark as RS
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Course list grid in Semester Card */}
                    {!sem.isCollapsed && (
                      <div className={`p-4 flex-grow ${currentLayout === 'kanban' ? 'space-y-0' : 'space-y-2.5'}`}>
                      
                      {sem.courses.length === 0 && (
                        <div className="py-8 text-center text-slate-400 text-xs italic">
                          No courses scheduled in this semester.
                        </div>
                      )}

                      {sem.courses.map((c, cIdx) => {
                        const courseDetails = COURSES.find(co => co.code === c.code);
                        const isCSE400Row = c.code === "CSE400";
                        const warnings = prerequisiteWarnings[`${sem.id}_${c.code}`];
                        const attempt = courseAttemptStats[`${sem.id}_${c.code}`];
                        
                        // Filter out CSE400 from semester cards (rendered globally as standalone widget instead)
                        if (isCSE400Row) {
                          return null;
                        }

                        const isCreditCourse = courseDetails?.category !== "Non-Credit" && (courseDetails?.credits ?? 3) > 0;
                        const theme = getCategoryTheme(courseDetails?.category, c.code);

                        return (
                          <div 
                            key={`${c.code}_${cIdx}`}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", c.code);
                              setDraggingSourceSemesterId(sem.id);
                              setTimeout(() => {
                                setDraggingCourseCode(c.code);
                              }, 0);
                            }}
                            onDragEnd={() => {
                              setDraggingCourseCode(null);
                              setDraggingSourceSemesterId(null);
                            }}
                            className={`group transition-all duration-200 ${
                              currentLayout === 'kanban' 
                                ? `p-3.5 border rounded-2xl bg-[#09090f]/90 hover:bg-[#0e0e16]/95 shadow-md mb-3 cursor-grab flex flex-col justify-between gap-3 ${theme.cardBorder} ${theme.cardGlow}` 
                                : `p-3.5 sm:p-4 rounded-2xl bg-[#09090f]/80 hover:bg-[#0e0e16]/90 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 relative ${theme.cardBorder} ${theme.cardGlow}`
                            } ${
                              draggingCourseCode === c.code 
                                ? currentLayout === 'kanban'
                                  ? "scale-105 shadow-2xl cursor-grabbing border-indigo-500 bg-indigo-950/40" 
                                  : "border-indigo-500 bg-indigo-950/30"
                                : ""
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              {/* Left category accent bar */}
                              <div className={`w-1 self-stretch rounded-full ${theme.leftBar} shrink-0 opacity-80`} />

                              {/* Left side checklist check & Mode B Grade dropdown */}
                              <div className="flex items-center gap-2 mt-0.5 shrink-0">
                                <button
                                  onClick={() => handleCompletionToggle(sem.id, c.code, !c.isCompleted)}
                                  title={c.isCompleted ? "Mark as incomplete" : "Mark as complete"}
                                  className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 focus:outline-none ${
                                    c.isCompleted
                                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-transparent shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                                      : 'border-white/20 bg-white/[0.03] hover:border-white/40'
                                  }`}
                                >
                                  {c.isCompleted && (
                                    <Check className="h-3 w-3 text-white stroke-[3]" />
                                  )}
                                </button>
                                
                                {mode === 'gpa' && isCreditCourse && (
                                  <select
                                    value={c.grade}
                                    onChange={(e) => handleGradeChange(sem.id, c.code, e.target.value)}
                                    className="bg-[#050508] border border-white/[0.1] hover:border-indigo-400/50 text-[11px] font-bold text-indigo-300 rounded-lg px-2 py-0.5 focus:border-indigo-400 outline-none cursor-pointer shadow-inner transition"
                                  >
                                    <option value="">Grade</option>
                                    {Object.keys(GRADING_SCALE).map(g => (
                                      <option key={g} value={g}>{g} ({GRADING_SCALE[g].toFixed(1)})</option>
                                    ))}
                                  </select>
                                )}

                                {mode === 'gpa' && !isCreditCourse && c.isCompleted && (
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                                    Passed
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className={`font-mono font-black text-xs sm:text-sm tracking-tight px-2 py-0.5 rounded-lg border shadow-inner ${theme.codePill}`}>
                                    {c.code}
                                  </span>
                                  <span className="text-slate-200 group-hover:text-white font-semibold text-xs sm:text-sm transition-colors truncate max-w-[200px] sm:max-w-none">
                                    {courseDetails?.title ?? "Custom Elective Course"}
                                  </span>
                                  <span className="text-[10px] text-slate-300 bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded-md font-mono font-semibold">
                                    {(courseDetails?.credits ?? 3)} Cr
                                  </span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border select-none ${theme.badge}`}>
                                    {theme.label}
                                  </span>
                                  {renderMandatoryBadge(c.code)}

                                  {/* Retake & Repeat badges */}
                                  {attempt?.badge && (
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                      attempt.isError 
                                        ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400' 
                                        : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                                    }`}>
                                      {attempt.badge}
                                    </span>
                                  )}
                                </div>

                                {/* Warning outputs */}
                                <div className="space-y-1 mt-1.5">
                                  {warnings && warnings.type === 'hard' && (
                                    <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[10px]">
                                      <AlertTriangle className="h-3 w-3 shrink-0 text-rose-400" />
                                      <span>Prerequisite warning: Requires {warnings.missing.join(", ")} prior to this semester</span>
                                    </div>
                                  )}
                                  {warnings && warnings.type === 'soft' && (
                                    <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[10px]">
                                      <Info className="h-3 w-3 shrink-0 text-amber-400" />
                                      <span>Tip: Soft Prerequisite recommended first ({warnings.missing.join(", ")})</span>
                                    </div>
                                  )}
                                  {attempt?.isError && (
                                    <div className="flex items-center gap-1.5 text-rose-400 font-medium text-[10px]">
                                      <AlertTriangle className="h-3 w-3 shrink-0" />
                                      <span>{attempt.statusText}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right side selectors and management */}
                            <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0">
                              
                              {/* Move course dropdown/selection */}
                              <div className="relative">
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleMoveCourse(sem.id, e.target.value, c);
                                      e.target.value = ""; // Reset
                                    }
                                  }}
                                  className="bg-[#050508] hover:bg-[#0c0c12] border border-white/[0.08] hover:border-white/[0.18] text-[10px] font-semibold text-slate-300 rounded-xl px-2.5 py-1.5 cursor-pointer transition focus:outline-none shadow-sm"
                                >
                                  <option value="">Move To...</option>
                                  {semesters.filter(s => s.id !== sem.id).map(s => {
                                    const destIdx = semesters.findIndex(semItem => semItem.id === s.id);
                                    const { hp } = getCoursePrereqs(c.code, onboardingData.pathway, onboardingData.creditOption);
                                    const missingHp = hp.filter(code => !isCourseCompletedPrior(code, destIdx, semesters, mode));
                                    const isLocked = missingHp.length > 0;
                                    const alreadyInDest = s.courses.some(course => course.code === c.code);
                                    return (
                                      <option key={s.id} value={s.id} disabled={isLocked || alreadyInDest}>
                                        {s.name} {alreadyInDest ? "(Already added)" : (isLocked ? "🔒" : "")}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              {/* Swap Course button */}
                              <button
                                onClick={() => {
                                  setActiveCourseSelectorSemesterId(sem.id);
                                  setSwappingCourseCode(c.code);
                                }}
                                title="Swap Course"
                                className="h-7 w-7 rounded-xl bg-white/[0.03] hover:bg-indigo-500/20 border border-white/[0.08] hover:border-indigo-500/40 text-slate-400 hover:text-indigo-300 flex items-center justify-center transition cursor-pointer shadow-sm"
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                              </button>

                              {/* Remove Course button */}
                              <button
                                onClick={() => handleRemoveCourse(sem.id, c.code, cIdx)}
                                className="h-7 w-7 rounded-xl bg-white/[0.03] hover:bg-rose-500/20 border border-white/[0.08] hover:border-rose-500/40 text-slate-400 hover:text-rose-400 flex items-center justify-center transition cursor-pointer shadow-sm"
                                title="Remove Course"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  </div>
                );
              })}
            </div>

            {/* Standalone Capstone & Graduation Module */}
            <CSE400 
              isCollapsed={isCapstoneCollapsed} 
              onToggle={() => setIsCapstoneCollapsed(prev => !prev)} 
            />
          </main>

          </div>
        </div>
      )}

      {/* 4. Search and Add Course Combobox Overlay */}
      {activeCourseSelectorSemesterId !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#08080d]/98 border border-white/[0.1] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] backdrop-blur-xl">
            
            {/* Combobox Header */}
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm">
                  {swappingCourseCode ? <ArrowRightLeft className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white tracking-tight">
                    {swappingCourseCode ? `Swap Course: ${swappingCourseCode}` : "Add Course to Semester"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-normal">
                    {swappingCourseCode 
                      ? "Select a new course to swap into this slot" 
                      : "Select a course to add to your semester timeline plan"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setActiveCourseSelectorSemesterId(null);
                  setSwappingCourseCode(null);
                  setCourseSearchQuery("");
                }} 
                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Combobox Filter tabs and Search */}
            <div className="p-5 bg-[#050508]/60 border-b border-white/[0.06] space-y-3.5">
              <input
                type="text"
                placeholder="Search by code (e.g. CSE220) or name..."
                value={courseSearchQuery}
                onChange={(e) => setCourseSearchQuery(e.target.value)}
                className="w-full bg-[#030305] border border-white/[0.1] text-xs px-4 py-2.5 rounded-2xl text-slate-100 outline-none focus:border-indigo-400 transition shadow-inner font-medium"
              />

              <div className="flex flex-wrap gap-1.5">
                {["All", "Core", "Electives", "Math/Science", "GenEd"].map(filterTab => (
                  <button
                    key={filterTab}
                    onClick={() => setCourseSearchFilter(filterTab)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      courseSearchFilter === filterTab
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-transparent text-white shadow-md shadow-blue-500/20'
                        : 'bg-[#08080d] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {filterTab}
                  </button>
                ))}
              </div>
            </div>

            {/* Search list results */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] p-3 space-y-1 custom-scrollbar">
              {filteredSearchCourses.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  No matching courses found.
                </div>
              ) : (
                filteredSearchCourses.map(course => {
                  const targetSemIdx = semesters.findIndex(s => s.id === activeCourseSelectorSemesterId);
                  const targetSem = semesters.find(s => s.id === activeCourseSelectorSemesterId);
                  const isAlreadyInSem = targetSem?.courses.some(c => c.code === course.code);
                  const isSwappingSelf = swappingCourseCode === course.code;
                  const isBlockedDuplicate = isAlreadyInSem && !isSwappingSelf;

                  const { hp } = getCoursePrereqs(course.code, onboardingData.pathway, onboardingData.creditOption);
                  const missingHp = hp.filter(code => !isCourseCompletedPrior(code, targetSemIdx, semesters, mode));
                  const isLocked = missingHp.length > 0;
                  const theme = getCategoryTheme(course.category, course.code);

                  const isDisabled = isLocked || isBlockedDuplicate;

                  return (
                    <button
                      key={course.code}
                      disabled={isDisabled}
                      onClick={() => {
                        if (activeCourseSelectorSemesterId) {
                          handleAddCourseToSemester(activeCourseSelectorSemesterId, course.code);
                        }
                      }}
                      className={`w-full p-3.5 text-left rounded-2xl transition flex items-center justify-between text-xs group ${
                        isDisabled ? 'opacity-40 cursor-not-allowed bg-transparent' : 'cursor-pointer hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-mono font-black text-xs sm:text-sm px-2 py-0.5 rounded-lg border shadow-inner ${theme.codePill}`}>
                            {course.code}
                          </span>
                          <span className="text-[10px] bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded-lg font-mono font-semibold text-slate-300">
                            {course.credits} Credits
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border select-none ${theme.badge}`}>
                            {theme.label}
                          </span>
                          {renderMandatoryBadge(course.code)}
                        </div>
                        <p className="text-slate-300 text-xs mt-1 font-medium truncate">{course.title}</p>
                        {isBlockedDuplicate && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-400 font-semibold">
                            <Info className="h-3 w-3 shrink-0" />
                            <span>Already added to this semester</span>
                          </div>
                        )}
                        {isLocked && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-rose-400 font-semibold">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Cannot Add: Missing Hard Prerequisite ({missingHp.join(", ")})</span>
                          </div>
                        )}
                      </div>

                      <div className="shrink-0">
                        {isBlockedDuplicate ? (
                          <span className="text-[10px] font-semibold text-slate-400 bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded-xl whitespace-nowrap">
                            In Semester
                          </span>
                        ) : isLocked ? (
                          <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-xl whitespace-nowrap">
                            Locked
                          </span>
                        ) : swappingCourseCode ? (
                          <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 rounded-xl whitespace-nowrap flex items-center gap-1">
                            <ArrowRightLeft className="h-3 w-3 shrink-0" /> Swap
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-xl whitespace-nowrap flex items-center gap-1">
                            <Plus className="h-3 w-3 shrink-0" /> Add
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* 4.5. Category Course Selector Modal Overlay */}
      {activeCategorySelectorKey !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#08080d]/98 border border-white/[0.1] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] backdrop-blur-xl">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white tracking-tight">
                    Add to {categoryDetails.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-normal">
                    {categoryDetails.desc}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setActiveCategorySelectorKey(null);
                  setSelectedCategoryCourseCode("");
                  setCategoryCourseSearchQuery("");
                }} 
                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Target Semester Selector */}
            <div className="p-5 bg-[#050508]/60 border-b border-white/[0.06] space-y-2">
              <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Select Target Semester:</label>
              <div className="relative">
                <select
                  value={selectedCategoryTargetSemesterId}
                  onChange={(e) => setSelectedCategoryTargetSemesterId(e.target.value)}
                  className="w-full appearance-none bg-[#030305] border border-white/[0.1] hover:border-white/[0.2] text-xs pl-4 pr-11 py-3 rounded-2xl text-slate-100 outline-none focus:border-indigo-400 transition cursor-pointer shadow-inner font-semibold"
                >
                  {semesters.map((sem, semIdx) => {
                    const intake = semesterIntakes[semIdx];
                    const semTermYear = `${sem.term || intake?.term || 'Spring'} ${sem.year || intake?.year || 2025}`;
                    const semLabel = sem.isRS ? `RS (${semTermYear})` : `${sem.name} (${semTermYear})`;
                    return (
                      <option key={sem.id} value={sem.id}>
                        {semLabel}
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 flex items-center">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Course Search Input */}
            <div className="p-5 bg-[#050508]/60 border-b border-white/[0.06] space-y-2">
              <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Select Course to Add:</label>
              <input
                type="text"
                placeholder="Search course by code or title..."
                value={categoryCourseSearchQuery}
                onChange={(e) => setCategoryCourseSearchQuery(e.target.value)}
                className="w-full bg-[#030305] border border-white/[0.1] text-xs px-4 py-2.5 rounded-2xl text-slate-100 outline-none focus:border-indigo-400 transition shadow-inner font-medium"
              />
            </div>

            {/* Filtered Courses List */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] p-3 space-y-1 bg-[#050508]/40 custom-scrollbar">
              {categoryFilteredCourses.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  {categoryCourseSearchQuery.trim() !== "" 
                    ? "No matching courses found."
                    : "All courses in this category have already been planned or completed!"}
                </div>
              ) : (
                categoryFilteredCourses.map(course => {
                  const targetSemIdx = semesters.findIndex(s => s.id === selectedCategoryTargetSemesterId);
                  const targetSem = semesters.find(s => s.id === selectedCategoryTargetSemesterId);
                  const isAlreadyInSem = targetSem?.courses.some(c => c.code === course.code);

                  const { hp } = getCoursePrereqs(course.code, onboardingData.pathway, onboardingData.creditOption);
                  const missingHp = hp.filter(code => !isCourseCompletedPrior(code, targetSemIdx, semesters, mode));
                  const isLocked = missingHp.length > 0;
                  const isSelected = selectedCategoryCourseCode === course.code;
                  const theme = getCategoryTheme(course.category, course.code);

                  const compState = getCompletedCourseState(course.code);
                  const isCompleted = compState.isCompleted;

                  const isDisabled = isLocked || isAlreadyInSem;

                  return (
                    <button
                      key={course.code}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => !isDisabled && setSelectedCategoryCourseCode(course.code)}
                      className={`w-full p-3.5 text-left rounded-2xl border transition flex items-center justify-between text-xs group ${
                        isDisabled 
                          ? 'opacity-40 cursor-not-allowed border-transparent bg-transparent' 
                          : isSelected
                            ? 'bg-indigo-600/15 border-indigo-500/80 text-white shadow-md'
                            : 'bg-transparent border-transparent text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] cursor-pointer'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-mono font-black text-xs sm:text-sm px-2 py-0.5 rounded-lg border shadow-inner ${theme.codePill}`}>
                            {course.code}
                          </span>
                          <span className="text-[10px] bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded-lg font-mono font-semibold text-slate-300">
                            {course.credits} Credits
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border select-none ${theme.badge}`}>
                            {theme.label}
                          </span>
                          {renderMandatoryBadge(course.code)}
                          {isCompleted && (
                            <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Completed {compState.grade && `(${compState.grade})`}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-300 text-xs mt-1 font-medium truncate">{course.title}</p>
                        {isAlreadyInSem && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-400 font-semibold">
                            <Info className="h-3 w-3 shrink-0" />
                            <span>Already added to selected semester</span>
                          </div>
                        )}
                        {isLocked && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-rose-400 font-semibold">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Cannot Add: Missing Hard Prerequisite ({missingHp.join(", ")})</span>
                          </div>
                        )}
                      </div>

                      <div className="shrink-0">
                        {isAlreadyInSem ? (
                          <span className="text-[10px] font-semibold text-slate-400 bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded-xl whitespace-nowrap">
                            In Semester
                          </span>
                        ) : isLocked ? (
                          <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-xl whitespace-nowrap">
                            Locked
                          </span>
                        ) : isSelected ? (
                          <span className="text-[10px] font-bold text-white bg-indigo-600 px-2.5 py-1 rounded-xl whitespace-nowrap flex items-center gap-1 shadow-sm">
                            <Check className="h-3 w-3 shrink-0" /> Selected
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-xl whitespace-nowrap">
                            Select
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-white/[0.08] flex gap-3 bg-[#050508]/60">
              <button
                type="button"
                onClick={() => {
                  setActiveCategorySelectorKey(null);
                  setSelectedCategoryCourseCode("");
                  setCategoryCourseSearchQuery("");
                }}
                className="flex-1 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-bold rounded-2xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedCategoryCourseCode || (selectedCategoryTargetSemesterId ? semesters.find(s => s.id === selectedCategoryTargetSemesterId)?.courses.some(c => c.code === selectedCategoryCourseCode) : false)}
                onClick={handleAddCategoryCourse}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-600/25 transition cursor-pointer"
              >
                Add Course
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. Reset Confirmation Modal overlay */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#08080d]/95 border border-slate-700/80 rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="h-10 w-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Reset Planner</h3>
                <p className="text-[11px] text-rose-300">Irreversible Action</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              This action will completely wipe out your course schedule, grades, and Capstone thesis records.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 bg-[#050508] hover:bg-[#0e0e14] border border-slate-800 text-slate-200 text-xs font-bold rounded-2xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetData}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-rose-600/30 transition duration-200 cursor-pointer"
              >
                Wipe Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proper Stationary Footer Section */}
      <footer className="mt-auto pt-8 pb-6 border-t border-slate-800/80 bg-[#030304] flex flex-col items-center justify-center gap-4 text-center">
        {/* Connect with me social links */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs font-bold text-slate-400">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-none">Connect with me:</span>
          <a
            href="https://github.com/fakekhanabdullah"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#08080d] border border-slate-800 hover:border-indigo-500/50 hover:text-indigo-400 transition leading-none text-slate-300"
          >
            <svg className="h-3.5 w-3.5 fill-current text-slate-400 hover:text-indigo-400 shrink-0" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
            <span className="leading-none">GitHub</span>
          </a>
          <span className="text-zinc-700 self-center">|</span>
          <a
            href="https://www.linkedin.com/in/khan-abdullahh"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#08080d] border border-slate-800 hover:border-indigo-500/50 hover:text-indigo-400 transition leading-none text-slate-300"
          >
            <svg className="h-3.5 w-3.5 fill-current text-slate-400 hover:text-indigo-400 shrink-0" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            <span className="leading-none">LinkedIn</span>
          </a>
        </div>

        {/* Muted Copyright Disclaimer */}
        <div className="text-[11px] text-slate-400 leading-relaxed font-medium">
          <p>© 2026 Flow136. Made with care by <strong className="text-slate-200">Khan Abdullah</strong></p>
        </div>
      </footer>

      {/* 5. Grade Sheet Preview Modal */}
      {showGradeSheetModal && isMounted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto print:p-0 print:static print:bg-transparent print:backdrop-none no-print-backdrop">
          <div className="bg-[#08080d]/98 border border-white/10 rounded-3xl max-w-4xl w-full p-4 sm:p-6 text-slate-100 shadow-2xl relative flex flex-col max-h-[94vh] overflow-hidden backdrop-blur-xl transition print:max-h-none print:border-none print:shadow-none print:w-full print:p-0 print:bg-transparent print-only-container">
            
            {/* Modal Action Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-white/[0.08] no-print">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)] shrink-0">
                  <Camera className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">Academic Progress Snapshot Preview</h3>
                  <p className="text-[10px] text-slate-400 font-medium">High-resolution exportable grade sheet</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Control 1: Download PNG Button */}
                <button
                  onClick={handleGenerateGradeSheet}
                  disabled={isGeneratingSnapshot}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 hover:from-blue-500 hover:via-indigo-500 hover:to-indigo-400 text-white text-xs font-extrabold px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl transition shadow-lg shadow-indigo-500/25 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                >
                  <Download className="h-4 w-4" />
                  <span>{isGeneratingSnapshot ? "Generating PNG..." : "Download PNG"}</span>
                </button>

                {/* Control 2: Close Button */}
                <button
                  onClick={() => setShowGradeSheetModal(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
                  title="Close preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Grade Sheet Container */}
            <div className="overflow-y-auto overflow-x-hidden max-w-full custom-scrollbar py-3 sm:py-4 flex items-start justify-center flex-grow">
              {/* Dynamic responsive scaling wrapper to fit 750px cleanly in any viewport width */}
              <div 
                className="shrink-0 transition-all duration-300 relative"
                style={{
                  width: `${750 * snapshotScale}px`,
                  height: `${snapshotHeight * snapshotScale}px`,
                }}
              >
                <div
                  style={{
                    width: '750px',
                    transform: `scale(${snapshotScale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  {/* Visible Grade Sheet Node Target */}
                  <div 
                    id="flow136-grade-sheet-export-node"
                    style={{ 
                      backgroundColor: '#030305',
                      fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                    }}
                    className="w-[750px] min-w-[750px] h-auto min-h-[600px] border border-white/[0.12] rounded-3xl p-7 shadow-2xl text-slate-100 relative overflow-visible font-sans bg-[#030305]"
                  >
                  {/* Ambient Background Glow (Z-Index 0) */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[160px] bg-indigo-500/[0.07] blur-3xl pointer-events-none rounded-full" />

                  {/* Watermark Background (Z-Index 0) */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden gap-6 opacity-[0.035]">
                    <div className="h-28 w-28 rounded-3xl border-2 border-indigo-400 flex items-center justify-center">
                      <Compass className="h-16 w-16 text-indigo-400" />
                    </div>
                    <span className="text-[85px] font-black tracking-tight text-white whitespace-nowrap">
                      Flow136
                    </span>
                  </div>

                  {/* Section 1: Header (Z-Index 10) */}
                  <div className="flex items-center justify-between pb-5 border-b border-white/[0.08] relative z-10">
                    <div className="flex items-center gap-3.5">
                      <div className="h-11 w-11 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.25)] shrink-0">
                        <Compass className="h-6 w-6 text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-2xl font-black tracking-tight text-white">Flow136</h1>
                          <span className="text-[10px] font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            CSE Curriculum
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 uppercase block mt-0.5">
                          ACADEMIC PROGRESS &amp; GRADE REPORT
                        </span>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="inline-block px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-bold text-indigo-300">
                        {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Target: 136 Degree Credits
                      </p>
                    </div>
                  </div>

                  {/* Section 2: Executive Status Bars & Standing (Z-Index 10) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-5 relative z-10">
                    {/* Master Credits Box */}
                    <div className="bg-[#08080f] border border-white/[0.08] p-4 rounded-2xl space-y-3 shadow-md">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">Total Degree Progress</span>
                        <span className="text-white font-black">{cumulativeStats.completedCredits} / 136 Cr Completed</span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="h-3 w-full bg-[#030306] border border-white/[0.08] rounded-full overflow-hidden p-0.5 shadow-inner">
                        <div 
                          style={{ width: `${Math.min(100, (cumulativeStats.completedCredits / 136) * 100)}%` }}
                          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                        />
                      </div>

                      {/* Mini Categories & Timeline Stats */}
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div className="flex items-center justify-between p-2 rounded-xl bg-blue-500/[0.06] border border-blue-500/20">
                          <span className="text-blue-300 font-semibold flex items-center gap-1.5 text-[10px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                            Dept Core
                          </span>
                          <span className="font-mono font-bold text-blue-200 text-[10px]">{curriculumProgress.coreCompleted}/{curriculumProgress.coreTotal} Cr</span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/20">
                          <span className="text-cyan-300 font-semibold flex items-center gap-1.5 text-[10px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                            School Core
                          </span>
                          <span className="font-mono font-bold text-cyan-200 text-[10px]">{curriculumProgress.schoolCoreCompleted}/{curriculumProgress.schoolCoreTotal} Cr</span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
                          <span className="text-amber-300 font-semibold flex items-center gap-1.5 text-[10px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                            Electives
                          </span>
                          <span className="font-mono font-bold text-amber-200 text-[10px]">{curriculumProgress.electiveCompleted}/6 Cr</span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-xl bg-purple-500/[0.06] border border-purple-500/20">
                          <span className="text-purple-300 font-semibold flex items-center gap-1.5 text-[10px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                            Capstone
                          </span>
                          <span className="font-mono font-bold text-purple-200 text-[10px]">{curriculumProgress.thesisCompleted}/{curriculumProgress.thesisTotal} Cr</span>
                        </div>

                        <div className="col-span-2 flex items-center justify-between p-2 rounded-xl bg-rose-500/[0.06] border border-rose-500/20">
                          <span className="text-rose-300 font-semibold flex items-center gap-1.5 text-[10px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                            GenEd Streams
                          </span>
                          <span className="font-mono font-bold text-rose-200 text-[10px]">{curriculumProgress.stream1Completed + curriculumProgress.stream2Completed + curriculumProgress.stream3Completed + curriculumProgress.stream4Completed + curriculumProgress.stream5Completed}/39 Cr</span>
                        </div>

                        <div className="col-span-2 pt-2 border-t border-white/[0.06] flex justify-between text-[10px] text-slate-400">
                          <span>Semesters Planned: <strong className="text-indigo-300 font-mono">{semesters.length}</strong></span>
                          <span>Completed Courses: <strong className="text-emerald-400 font-mono">{semesters.reduce((acc, sem) => acc + sem.courses.filter(c => mode === 'tracker' ? c.isCompleted : (c.isCompleted && c.grade !== "" && c.grade !== "F")).length, 0) + (isCSE400Passed ? 1 : 0)}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Academic Standing & CGPA Display */}
                    {mode === 'gpa' ? (
                      <div className="bg-[#08080f] border border-white/[0.08] p-4 rounded-2xl flex flex-col justify-between shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cumulative CGPA</span>
                          {cumulativeStats.cgpa >= 2.0 ? (
                            <span className="inline-flex items-center justify-center whitespace-nowrap text-[9px] font-extrabold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              Good Standing
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center whitespace-nowrap text-[9px] font-extrabold bg-rose-500/15 border border-rose-500/30 text-rose-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              Academic Probation
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-3xl font-black text-white mt-1">
                            {cumulativeStats.cgpa.toFixed(2)} <span className="text-xs text-slate-400 font-mono font-normal">/ 4.00</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Evaluated across chronologically latest course attempts.
                          </p>
                        </div>
                        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400">
                          <span>Total Graded Credits: <strong className="text-white font-mono">{cumulativeStats.completedCredits} Cr</strong></span>
                          <span>Scale: <strong className="text-indigo-300 font-mono">UGC 4.00</strong></span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#08080f] border border-white/[0.08] p-4 rounded-2xl flex flex-col justify-between shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Planning Mode</span>
                          <span className="text-[9px] font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-2.5 py-0.5 rounded-full uppercase">
                            Curriculum Tracker
                          </span>
                        </div>
                        <div className="my-auto py-2">
                          <p className="text-xs text-slate-200 font-semibold">
                            Graduation Progress: {((cumulativeStats.completedCredits / 136) * 100).toFixed(1)}%
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {136 - cumulativeStats.completedCredits > 0 
                              ? `${136 - cumulativeStats.completedCredits} credits remaining to complete degree requirements.`
                              : 'All degree credit requirements fulfilled!'}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-white/[0.06] text-[10px] text-slate-400 flex justify-between">
                          <span>Target: 136 Credits</span>
                          <span className="text-emerald-400 font-semibold">Track Active</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 3: Completed Courses Table / Grade Sheet (Z-Index 10) */}
                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-black tracking-wider text-white uppercase flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-indigo-400" />
                        COMPLETED COURSEWORK
                      </h2>
                      <span className="text-[10px] font-mono text-slate-400">
                        Official Degree Audit
                      </span>
                    </div>
                    
                    {(() => {
                      const exportCompletedCourses: Array<{ code: string; title: string; credits: number; grade: string; semesterName: string }> = [];
                      
                      semesters.forEach((sem, semIdx) => {
                        const intake = semesterIntakes[semIdx];
                        const semTermYear = `${sem.term || intake?.term || 'Spring'} ${sem.year || intake?.year || 2025}`;
                        const semLabel = sem.isRS ? `RS (${semTermYear})` : `${sem.name} (${semTermYear})`;

                        sem.courses.forEach(c => {
                          if (c.code === "CSE400") return;
                          const isComp = mode === 'tracker' ? c.isCompleted : (c.isCompleted && c.grade !== "" && c.grade !== "F");
                          if (isComp) {
                            const cData = COURSES.find(co => co.code === c.code);
                            exportCompletedCourses.push({
                              code: c.code,
                              title: cData?.title || c.code,
                              credits: cData?.category === "Non-Credit" ? 0 : (cData?.credits ?? 3),
                              grade: c.grade || "-",
                              semesterName: semLabel
                            });
                          }
                        });
                      });

                      if (isCSE400Passed) {
                        let capGrade = "-";
                        for (const sem of semesters) {
                          const found = sem.courses.find(c => c.code === "CSE400");
                          if (found) {
                            capGrade = found.grade || "-";
                            break;
                          }
                        }
                        exportCompletedCourses.push({
                          code: "CSE400",
                          title: "Final Year Capstone: Thesis, Project, or Internship",
                          credits: 4,
                          grade: capGrade,
                          semesterName: "Capstone Phase"
                        });
                      }

                      if (exportCompletedCourses.length === 0) {
                        return (
                          <div className="p-6 text-center text-slate-400 text-xs italic border border-white/[0.08] rounded-2xl bg-[#08080f]">
                            No completed courses recorded yet.
                          </div>
                        );
                      }

                      return (
                        <div className="w-full border border-white/[0.08] rounded-2xl overflow-hidden bg-[#08080f] shadow-md">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-white/[0.03] border-b border-white/[0.08] text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                                <th className="py-2.5 px-3">Course</th>
                                <th className="py-2.5 px-3">Title</th>
                                <th className="py-2.5 px-3 text-center">Credits</th>
                                {mode === 'gpa' && <th className="py-2.5 px-3 text-right">Grade</th>}
                                <th className="py-2.5 px-3 text-right">Semester</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                              {exportCompletedCourses.map((item, idx) => {
                                const theme = getCategoryTheme(undefined, item.code);
                                return (
                                  <tr key={`${item.code}_${idx}`} className="hover:bg-white/[0.02]">
                                    <td className="py-2 px-3">
                                      <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-lg border shadow-inner ${theme.codePill}`}>
                                        {item.code}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-slate-200 font-medium">{item.title}</td>
                                    <td className="py-2 px-3 text-center">
                                      <span className="font-mono text-[10px] text-slate-300 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded">
                                        {item.credits} Cr
                                      </span>
                                    </td>
                                    {mode === 'gpa' && (
                                      <td className="py-2 px-3 font-bold font-mono text-emerald-400 text-right">
                                        {item.grade}
                                      </td>
                                    )}
                                    <td className="py-2 px-3 text-slate-400 text-right text-[11px] font-mono">{item.semesterName}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Section 4: Footer Watermark (Z-Index 10) */}
                  <div className="border-t border-white/[0.08] mt-5 pt-3.5 relative z-10 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-bold">Flow136</span>
                      <span>&bull; Your curriculum, minus the complexity.</span>
                    </div>
                    <div className="font-mono text-[10px] text-indigo-400 font-semibold">
                      flow136-cse-course-tracker.vercel.app
                    </div>
                  </div>
                </div> {/* End flow136-grade-sheet-export-node */}
                </div> {/* End inner-transform-wrapper */}
              </div> {/* End scale-wrapper */}
            </div> {/* End scrollable container */}

            {/* Modal Footer Controls */}
            <div className="pt-3 border-t border-white/[0.08] flex justify-end gap-3 no-print">
              <button
                onClick={() => setShowGradeSheetModal(false)}
                className="px-5 py-2.5 bg-[#050508] hover:bg-[#0e0e14] border border-white/10 rounded-2xl text-xs font-bold text-slate-200 transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Recommended Curriculum Roadmap Modal Overlay ("Feeling Lost?") */}
      {showRoadmapModal && (() => {
        const q = roadmapSearch.toLowerCase().trim();
        const matchCourse = (item: { code: string; title: string }) => 
          !q || item.code.toLowerCase().includes(q) || item.title.toLowerCase().includes(q);

        const DEPT_CORE = [
          { code: "CSE110", title: "Programming Language I", credits: 3 },
          { code: "CSE111", title: "Programming Language II", credits: 3 },
          { code: "CSE220", title: "Data Structures", credits: 3 },
          { code: "CSE221", title: "Algorithms", credits: 3 },
          { code: "CSE230", title: "Discrete Mathematics", credits: 3 },
          { code: "CSE250", title: "Circuits and Electronics", credits: 3 },
          { code: "CSE251", title: "Electronic Devices and Circuits", credits: 3 },
          { code: "CSE260", title: "Digital Logic Design", credits: 3 },
          { code: "CSE320", title: "Data Communications", credits: 3 },
          { code: "CSE321", title: "Operating Systems", credits: 3 },
          { code: "CSE330", title: "Numerical Methods", credits: 3 },
          { code: "CSE331", title: "Automata and Computability", credits: 3 },
          { code: "CSE340", title: "Computer Architecture", credits: 3 },
          { code: "CSE341", title: "Microprocessors", credits: 3 },
          { code: "CSE350", title: "Digital Electronics and Pulse Techniques", credits: 3 },
          { code: "CSE360", title: "Computer Interfacing", credits: 3 },
          { code: "CSE370", title: "Database Systems", credits: 3 },
          { code: "CSE420", title: "Compiler Design", credits: 3 },
          { code: "CSE421", title: "Computer Networks", credits: 3 },
          { code: "CSE422", title: "Artificial Intelligence", credits: 3 },
          { code: "CSE423", title: "Computer Graphics", credits: 3 },
          { code: "CSE460", title: "VLSI Design", credits: 3 },
          { code: "CSE461", title: "Introduction to Robotics", credits: 3 },
          { code: "CSE470", title: "Software Engineering", credits: 3 },
          { code: "CSE471", title: "Systems Analysis and Design", credits: 3 },
        ];

        const CAPSTONE = [
          { code: "CSE400", title: "Thesis / Internship / Final Project", credits: 4 }
        ];

        const CSE_ELECTIVES = [
          { code: "CSE101", title: "Introduction to Computer Science", credits: 3 },
          { code: "CSE310", title: "Object-Oriented Programming", credits: 3 },
          { code: "CSE342", title: "Computer Systems Engineering", credits: 3 },
          { code: "CSE371", title: "Management Information Systems", credits: 3 },
          { code: "CSE390", title: "Technical Communication", credits: 3 },
          { code: "CSE391", title: "Programming for the Internet", credits: 3 },
          { code: "CSE392", title: "Signals and Systems", credits: 3 },
          { code: "CSE410", title: "Advance Programming In UNIX", credits: 3 },
          { code: "CSE419", title: "Programming Languages and Competitive Programming", credits: 3 },
          { code: "CSE424", title: "Pattern Recognition", credits: 3 },
          { code: "CSE425", title: "Neural Networks", credits: 3 },
          { code: "CSE426", title: "Advanced Algorithms", credits: 3 },
          { code: "CSE427", title: "Machine Learning", credits: 3 },
          { code: "CSE428", title: "Image Processing", credits: 3 },
          { code: "CSE429", title: "Basic Multimedia Theory", credits: 3 },
          { code: "CSE430", title: "Digital Signal Processing", credits: 3 },
          { code: "CSE431", title: "Natural Language Processing", credits: 3 },
          { code: "CSE432", title: "Speech Recognition and Synthesis", credits: 3 },
          { code: "CSE462", title: "Fault-Tolerant Systems", credits: 3 },
          { code: "CSE472", title: "Human-Computer Interface", credits: 3 },
          { code: "CSE473", title: "Financial Engineering & Technology", credits: 3 },
          { code: "CSE474", title: "Simulation and Modeling", credits: 3 },
          { code: "CSE490", title: "WAN Routing / Special Topics", credits: 3 },
          { code: "CSE491", title: "Independent Study", credits: 3 }
        ];

        const BIL_COURSES = [
          { code: "ENG091", title: "Foundation Course in English", credits: 0, isRemedial: true },
          { code: "ENG101", title: "English Fundamentals", credits: 3, isRemedial: false },
          { code: "ENG102", title: "English Composition I", credits: 3, isRemedial: false },
          { code: "ENG103", title: "English Composition II", credits: 3, isRemedial: false }
        ];

        const MNS_COURSES = [
          { code: "MAT092", title: "Intermediate Course in Mathematics", credits: 0, isRemedial: true },
          { code: "MAT110", title: "Math I: Differential Calculus & Geometry", credits: 3, isRemedial: false },
          { code: "PHY111", title: "Principles of Physics I", credits: 3, isRemedial: false },
          { code: "STA201", title: "Elements of Statistics and Probability", credits: 3, isRemedial: false },
          { code: "MAT120", title: "Math II: Integral Calculus & Differential Eq.", credits: 3, isRemedial: false },
          { code: "MAT215", title: "Math III: Complex Variables & Laplace", credits: 3, isRemedial: false },
          { code: "MAT216", title: "Math IV: Linear Algebra & Fourier Analysis", credits: 3, isRemedial: false },
          { code: "PHY112", title: "Principles of Physics II", credits: 3, isRemedial: false }
        ];

        const TARC_COURSES = [
          { code: "HUM103", title: "Ethics and Culture", credits: 3 },
          { code: "BNG103", title: "Bangla Bhasha o Shahitto", credits: 3 },
          { code: "EMB101", title: "Emergence of Bangladesh", credits: 3 }
        ];

        const GENED_STREAMS = [
          {
            stream: "Stream 2",
            title: "Math & Natural Sciences",
            badge: "bg-purple-500/15 border-purple-500/30 text-purple-300",
            pill: "bg-[#0e0e14] border-purple-500/25 text-purple-200 hover:border-purple-500/50",
            courses: ["BIO101","CHE101","ENV103","GSC110","MAT101","PHY101","STA101"]
          },
          {
            stream: "Stream 3",
            title: "Arts & Humanities",
            badge: "bg-sky-500/15 border-sky-500/30 text-sky-300",
            pill: "bg-[#0e0e14] border-sky-500/25 text-sky-200 hover:border-sky-500/50",
            courses: ["ENG110","ENG113","ENG114","ENG115","ENG333","HST102","HST103","HST104","HUM101","HUM102","HUM207","HUM210","HUM301"]
          },
          {
            stream: "Stream 4",
            title: "Social Sciences",
            badge: "bg-teal-500/15 border-teal-500/30 text-teal-300",
            pill: "bg-[#0e0e14] border-teal-500/25 text-teal-200 hover:border-teal-500/50",
            courses: ["ANT101","ANT342","ANT351","BUS102","BUS201","BUS333","BUS335","BU201","DEV104","DEV201","ECO101","ECO102","ECO105","POL101","POL102","POL103","POL201","POL202","POL203","POL210","PSY101","PSY102","SOC101","SOC201"]
          },
          {
            stream: "Stream 5",
            title: "Communities (CST)",
            badge: "bg-rose-500/15 border-rose-500/30 text-rose-300",
            pill: "bg-[#0e0e14] border-rose-500/25 text-rose-200 hover:border-rose-500/50",
            courses: ["BUS334","CST201","CST204","CST301","CST302","CST303","CST304","CST305","CST306","CST307","CST308","CST309","CST310","CST314","CST333"]
          }
        ];

        const filteredDeptCore = DEPT_CORE.filter(matchCourse);
        const filteredCapstone = CAPSTONE.filter(matchCourse);
        const filteredElectives = CSE_ELECTIVES.filter(matchCourse);
        const filteredBil = BIL_COURSES.filter(matchCourse);
        const filteredMns = MNS_COURSES.filter(matchCourse);
        const filteredTarc = TARC_COURSES.filter(matchCourse);

        const showDept = roadmapActiveTab === 'all' || roadmapActiveTab === 'dept';
        const showOutside = roadmapActiveTab === 'all' || roadmapActiveTab === 'outside';
        const showGened = roadmapActiveTab === 'all' || roadmapActiveTab === 'gened';

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
            <div className="bg-[#08080d]/98 border border-white/[0.1] rounded-3xl max-w-[96vw] md:max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl relative overflow-hidden backdrop-blur-xl text-xs md:text-sm">
              {/* Ambient glows inside modal */}
              <div className="absolute top-[-10%] left-[-10%] w-[35%] h-[35%] rounded-full bg-blue-500/10 blur-[90px] pointer-events-none" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] rounded-full bg-indigo-500/10 blur-[90px] pointer-events-none" />
              
              {/* Header */}
              <div className="px-4 sm:px-6 md:px-7 py-3.5 sm:py-4 border-b border-white/[0.08] flex items-center justify-between gap-3 relative z-10 shrink-0 bg-[#0e0e14]/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)] shrink-0">
                    <Compass className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-white tracking-tight leading-tight truncate">
                      CSE Curriculum Roadmap &amp; Guide
                    </h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5 font-bold truncate">
                      FYAT Recommended 136-Credit Degree Distribution
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowRoadmapModal(false);
                    setRoadmapSearch("");
                  }}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Segmented Filter Pills & Search Bar Strip */}
              <div className="px-4 sm:px-6 md:px-7 py-2.5 sm:py-3 border-b border-white/[0.06] bg-[#050508]/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 relative z-10 shrink-0">
                {/* Segmented Category Filter Pills */}
                <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-[#0b0c14] border border-white/[0.08] rounded-2xl w-full sm:w-auto overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setRoadmapActiveTab('all')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      roadmapActiveTab === 'all'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    All Modules (45)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoadmapActiveTab('dept')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      roadmapActiveTab === 'dept'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                    <span>Dept Core (25+2)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoadmapActiveTab('outside')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      roadmapActiveTab === 'outside'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0" />
                    <span>Outside Dept</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoadmapActiveTab('gened')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      roadmapActiveTab === 'gened'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" />
                    <span>GenEd Streams</span>
                  </button>
                </div>

                {/* Instant Search Bar */}
                <div className="relative w-full sm:w-64 shrink-0">
                  <input
                    type="text"
                    placeholder="Search course code or title..."
                    value={roadmapSearch}
                    onChange={(e) => setRoadmapSearch(e.target.value)}
                    className="w-full bg-[#08080d] border border-white/[0.1] hover:border-white/[0.2] text-xs pl-8 pr-7 py-2 rounded-xl text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-400 transition shadow-inner font-medium"
                  />
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {roadmapSearch && (
                    <button
                      onClick={() => setRoadmapSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Modal Content */}
              <div className="flex-grow overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 relative z-10 custom-scrollbar space-y-5 sm:space-y-6">
                
                {/* Stats Summary Bar */}
                <div className="bg-[#0c0c14]/70 border border-white/[0.07] rounded-2xl p-3 sm:p-4 space-y-3 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 border-b border-white/[0.06] pb-2.5 sm:pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        CSE Curriculum Breakdown
                      </span>
                      <span className="text-[10px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-2.5 py-0.5 rounded-full font-bold">
                        136 Credits Total
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                      132 Academic + 4 Non-Academic Credits &bull; 45 Total Courses
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    <div className="p-2.5 rounded-xl bg-[#050508] border border-white/[0.06] flex flex-col items-center text-center">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        <span>Dept Core</span>
                      </div>
                      <span className="text-xs font-black text-white mt-1">25 Courses</span>
                      <span className="text-[10px] text-slate-500 font-mono">75 Credits</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#050508] border border-white/[0.06] flex flex-col items-center text-center">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        <span>Electives</span>
                      </div>
                      <span className="text-xs font-black text-white mt-1">2 Courses</span>
                      <span className="text-[10px] text-slate-500 font-mono">6 Credits</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#050508] border border-white/[0.06] flex flex-col items-center text-center">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                        <span>Capstone</span>
                      </div>
                      <span className="text-xs font-black text-white mt-1">1 Course</span>
                      <span className="text-[10px] text-slate-500 font-mono">4 Credits</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#050508] border border-white/[0.06] flex flex-col items-center text-center">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                        <span>MNS</span>
                      </div>
                      <span className="text-xs font-black text-white mt-1">7 Courses</span>
                      <span className="text-[10px] text-slate-500 font-mono">21 Credits</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#050508] border border-white/[0.06] flex flex-col items-center text-center">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                        <span>GenEd</span>
                      </div>
                      <span className="text-xs font-black text-white mt-1">5 Courses</span>
                      <span className="text-[10px] text-slate-500 font-mono">15 Credits</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#050508] border border-white/[0.06] flex flex-col items-center text-center">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                        <span>TARC (RS)</span>
                      </div>
                      <span className="text-xs font-black text-white mt-1">3 Courses</span>
                      <span className="text-[10px] text-slate-500 font-mono">9 Credits</span>
                    </div>
                    <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-[#050508] border border-white/[0.06] flex flex-col items-center text-center">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                        <span>BIL (English)</span>
                      </div>
                      <span className="text-xs font-black text-white mt-1">2 Courses</span>
                      <span className="text-[10px] text-slate-500 font-mono">6 Credits</span>
                    </div>
                  </div>
                </div>

                {/* Section 1: Department Core (Program Core + Capstone) */}
                {showDept && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 pb-2.5 border-b border-white/[0.06]">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="text-[11px] font-black text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 rounded-lg uppercase tracking-wider shrink-0">
                          Program Core
                        </span>
                        <h4 className="font-extrabold text-xs sm:text-sm text-white">25 Mandatory Computing Courses</h4>
                      </div>
                      <span className="text-[11px] sm:text-xs text-slate-400 font-mono font-semibold shrink-0">75 Credits Total</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {filteredDeptCore.map((c) => (
                        <div 
                          key={c.code}
                          className="p-3 rounded-2xl bg-[#07070c] border border-white/[0.07] hover:border-blue-500/40 hover:bg-[#0c0c16] transition-all flex items-center justify-between gap-2.5 group shadow-sm"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono font-black text-xs text-blue-300 bg-blue-950/40 border border-blue-500/30 px-2 py-0.5 rounded-lg shadow-inner shrink-0">
                              {c.code}
                            </span>
                            <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate transition-colors">
                              {c.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-md shrink-0">
                            {c.credits} Cr
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Capstone */}
                    <div className="pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 pb-2.5 border-b border-white/[0.06]">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-[11px] font-black text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-lg uppercase tracking-wider shrink-0">
                            Capstone
                          </span>
                          <h4 className="font-extrabold text-xs sm:text-sm text-white">Graduation Milestone</h4>
                        </div>
                        <span className="text-[11px] sm:text-xs text-slate-400 font-mono font-semibold shrink-0">4 Credits</span>
                      </div>

                      <div className="mt-2.5">
                        {filteredCapstone.map((c) => (
                          <div 
                            key={c.code}
                            className="p-3.5 rounded-2xl bg-[#090712] border border-purple-500/30 hover:border-purple-500/60 transition-all flex items-center justify-between gap-3 group shadow-sm"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono font-black text-xs text-purple-300 bg-purple-950/60 border border-purple-500/40 px-2 py-0.5 rounded-lg shadow-inner shrink-0">
                                {c.code}
                              </span>
                              <span className="text-xs font-bold text-slate-100 group-hover:text-white truncate">
                                {c.title}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono font-bold text-purple-300 bg-purple-500/10 border border-purple-500/25 px-2 py-0.5 rounded-md shrink-0">
                              4 Credits
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CSE Major Electives */}
                    <div className="pt-2 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 pb-2.5 border-b border-white/[0.06]">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-[11px] font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-lg uppercase tracking-wider shrink-0">
                            CSE Major Electives
                          </span>
                          <h4 className="font-extrabold text-xs sm:text-sm text-white">
                            Select 2 Courses <span className="text-slate-400 font-normal text-[11px] sm:text-xs">(from 24 Available)</span>
                          </h4>
                        </div>
                        <span className="text-[11px] sm:text-xs text-slate-400 font-mono font-semibold shrink-0">6 Credits Required</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {filteredElectives.map((c) => (
                          <div 
                            key={c.code}
                            className="p-3 rounded-2xl bg-[#07070c] border border-white/[0.07] hover:border-amber-500/40 hover:bg-[#0c0c16] transition-all flex items-center justify-between gap-2.5 group shadow-sm"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono font-black text-xs text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-lg shadow-inner shrink-0">
                                {c.code}
                              </span>
                              <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate transition-colors">
                                {c.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-md shrink-0">
                              {c.credits} Cr
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 2: Outside Department (MNS, BIL, RS) */}
                {showOutside && (
                  <div className="space-y-5">
                    {/* MNS Math & Natural Sciences */}
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 pb-2.5 border-b border-white/[0.06]">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-[11px] font-black text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg uppercase tracking-wider shrink-0">
                            MNS
                          </span>
                          <h4 className="font-extrabold text-xs sm:text-sm text-white">
                            Mathematics &amp; Natural Sciences <span className="text-slate-400 font-normal text-[11px] sm:text-xs">(7 Courses)</span>
                          </h4>
                        </div>
                        <span className="text-[11px] sm:text-xs text-slate-400 font-mono font-semibold shrink-0">21 Academic Credits</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {filteredMns.map((c) => (
                          <div 
                            key={c.code}
                            className="p-3 rounded-2xl bg-[#07070c] border border-white/[0.07] hover:border-cyan-500/40 hover:bg-[#0c0c16] transition-all flex items-center justify-between gap-2.5 group shadow-sm"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono font-black text-xs text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-lg shadow-inner shrink-0">
                                {c.code}
                              </span>
                              <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate transition-colors">
                                {c.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {c.isRemedial && (
                                <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-md uppercase">
                                  Non-Credit
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-md">
                                {c.credits} Cr
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* BIL Languages */}
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 pb-2.5 border-b border-white/[0.06]">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-[11px] font-black text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 rounded-lg uppercase tracking-wider shrink-0">
                            BIL
                          </span>
                          <h4 className="font-extrabold text-xs sm:text-sm text-white">
                            Brac Institute of Languages <span className="text-slate-400 font-normal text-[11px] sm:text-xs">(2 Courses Needed)</span>
                          </h4>
                        </div>
                        <span className="text-[11px] sm:text-xs text-slate-400 font-mono font-semibold shrink-0">6 Academic Credits</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {filteredBil.map((c) => (
                          <div 
                            key={c.code}
                            className="p-3 rounded-2xl bg-[#07070c] border border-white/[0.07] hover:border-sky-500/40 hover:bg-[#0c0c16] transition-all flex items-center justify-between gap-2.5 group shadow-sm"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono font-black text-xs text-sky-300 bg-sky-950/40 border border-sky-500/30 px-2 py-0.5 rounded-lg shadow-inner shrink-0">
                                {c.code}
                              </span>
                              <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate transition-colors">
                                {c.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {c.isRemedial && (
                                <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-md uppercase">
                                  Non-Credit
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-md">
                                {c.credits} Cr
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* TARC Residential Semester */}
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 pb-2.5 border-b border-white/[0.06]">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-[11px] font-black text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg uppercase tracking-wider shrink-0">
                            TARC (RS)
                          </span>
                          <h4 className="font-extrabold text-xs sm:text-sm text-white">
                            Residential Semester <span className="text-slate-400 font-normal text-[11px] sm:text-xs">(3 Courses Mandatory)</span>
                          </h4>
                        </div>
                        <span className="text-[11px] sm:text-xs text-slate-400 font-mono font-semibold shrink-0">9 Academic Credits</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {filteredTarc.map((c) => (
                          <div 
                            key={c.code}
                            className="p-3 rounded-2xl bg-[#07070c] border border-white/[0.07] hover:border-indigo-500/40 hover:bg-[#0c0c16] transition-all flex items-center justify-between gap-2.5 group shadow-sm"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono font-black text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 px-2 py-0.5 rounded-lg shadow-inner shrink-0">
                                {c.code}
                              </span>
                              <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate transition-colors">
                                {c.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-md shrink-0">
                              {c.credits} Cr
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 3: COD GenEd Electives */}
                {showGened && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 pb-2.5 border-b border-white/[0.06]">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="text-[11px] font-black text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 rounded-lg uppercase tracking-wider shrink-0">
                          COD
                        </span>
                        <h4 className="font-extrabold text-xs sm:text-sm text-white">
                          General Education Streams <span className="text-slate-400 font-normal text-[11px] sm:text-xs">(5 Courses Required)</span>
                        </h4>
                      </div>
                      <span className="text-[11px] sm:text-xs text-slate-400 font-mono font-semibold shrink-0">15 Academic Credits</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {GENED_STREAMS.map((st) => (
                        <div 
                          key={st.stream}
                          className="p-4 rounded-2xl bg-[#07070c] border border-white/[0.07] space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-white/[0.05] pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${st.badge}`}>
                                {st.stream}
                              </span>
                              <h5 className="font-bold text-xs text-white">{st.title}</h5>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {st.courses.length} options
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                            {st.courses.map((code) => {
                              const detail = COURSES.find(co => co.code === code);
                              const isHighlight = q && (code.toLowerCase().includes(q) || (detail && detail.title.toLowerCase().includes(q)));
                              return (
                                <span
                                  key={code}
                                  title={detail ? `${code}: ${detail.title} (${detail.credits} Cr)` : code}
                                  className={`font-mono text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-help select-none ${
                                    isHighlight
                                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 scale-105 shadow-sm'
                                      : st.pill
                                  }`}
                                >
                                  {code}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* GenEd Guidelines Link Banner */}
                <div className="bg-[#0e0e14]/60 border border-white/[0.08] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 text-center sm:text-left">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                    <div>
                      <p className="text-xs text-slate-100 font-bold">
                        Need official clarification on GenEd stream rules?
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Check prerequisites and eligible courses directly on the university website.
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://www.bracu.ac.bd/avilable-program/general-education-gened"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer shrink-0"
                  >
                    <span>Official GenEd Guidelines</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>

              </div>

              {/* Modal Footer with Attribution & Category Guide */}
              <div className="px-4 sm:px-6 py-3 border-t border-white/[0.08] bg-[#050508] flex flex-col md:flex-row items-center justify-between gap-3 text-[10px] text-slate-400 shrink-0 relative z-10 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3">
                  <span className="font-black uppercase tracking-wider text-indigo-400 shrink-0">
                    Category Guide:
                  </span>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-2.5">
                    <span className="font-bold text-blue-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Program Core
                    </span>
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Electives
                    </span>
                    <span className="font-bold text-purple-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                      Capstone
                    </span>
                    <span className="font-bold text-cyan-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                      MNS
                    </span>
                    <span className="font-bold text-sky-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                      BIL
                    </span>
                    <span className="font-bold text-indigo-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      RS
                    </span>
                    <span className="font-bold text-rose-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      GenEd
                    </span>
                  </div>
                </div>

                <div className="text-slate-400 text-center md:text-right text-[10px]">
                  Curriculum Guideline by <strong className="text-slate-200">Badhon Nandi</strong> (FYAT Mentor), OAA Brac University
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Repeat ROI Analyzer Dedicated Popup Modal */}
      {showRoiModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-[#08080d]/98 border border-slate-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-[#0e0e14]/40">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)] shrink-0">
                  <Repeat className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white tracking-tight">Repeat ROI Analyzer</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Simulate grade improvements, retake scenarios &amp; CGPA impact</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGradingSystemModal(true)}
                  title="View Official University Grading Scale"
                  className="text-indigo-300 hover:text-indigo-200 text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 px-3.5 py-2 rounded-2xl border border-indigo-500/30 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Award className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Grading System</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowRoiModal(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-4">
              {/* Threshold Filter Bar */}
              <div className="p-4 rounded-2xl bg-[#0e0e14]/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-300">
                    Detect courses with grade ≤
                  </span>
                  <select
                    value={roiThresholdGrade}
                    onChange={(e) => setRoiThresholdGrade(e.target.value)}
                    className="text-xs font-bold bg-[#050508] text-indigo-300 border border-slate-700/80 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-400 cursor-pointer shadow-inner"
                  >
                    <option value="B-">B- (2.7) — Standard Policy</option>
                    <option value="B">B (3.0)</option>
                    <option value="B+">B+ (3.3)</option>
                    <option value="A-">A- (3.7)</option>
                    <option value="C+">C+ (2.3)</option>
                    <option value="C">C (2.0)</option>
                    <option value="C-">C- (1.7)</option>
                    <option value="D+">D+ (1.3)</option>
                    <option value="D">D (1.0)</option>
                    <option value="D-">D- (0.7)</option>
                    <option value="all">All Gradable (&lt; 4.0)</option>
                  </select>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-bold self-start sm:self-auto">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse shrink-0" />
                  <span>F grades always included</span>
                </div>
              </div>

              {/* Combined Multi-Course Simulation Banner */}
              {roiAnalysis.combinedSelectedCount > 0 ? (
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
                  roiAnalysis.combinedDelta > 0
                    ? 'bg-gradient-to-r from-emerald-950/30 to-[#0e0e14]/60 border-emerald-500/30 text-emerald-300'
                    : roiAnalysis.combinedDelta < 0
                      ? 'bg-gradient-to-r from-rose-950/30 to-[#0e0e14]/60 border-rose-500/30 text-rose-300'
                      : 'bg-[#0e0e14]/60 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {roiAnalysis.combinedDelta > 0 ? (
                        <div className="h-6 w-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                      ) : roiAnalysis.combinedDelta < 0 ? (
                        <div className="h-6 w-6 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                          <TrendingDown className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="h-6 w-6 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                          <Target className="h-4 w-4" />
                        </div>
                      )}
                      <span>
                        Combined Simulation ({roiAnalysis.combinedSelectedCount} course{roiAnalysis.combinedSelectedCount > 1 ? 's' : ''}, {roiAnalysis.combinedSelectedCredits} Cr)
                      </span>
                    </div>
                    <span className={`text-xs font-black px-3 py-1 rounded-full border self-start sm:self-auto ${
                      roiAnalysis.combinedDelta > 0
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : roiAnalysis.combinedDelta < 0
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}>
                      {roiAnalysis.combinedDelta > 0 ? `+${roiAnalysis.combinedDelta.toFixed(3)}` : roiAnalysis.combinedDelta.toFixed(3)} CGPA
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs pt-2 border-t border-white/5">
                    <span className="text-slate-300">
                      Current: <strong className="text-white font-mono">{roiAnalysis.currentCgpa.toFixed(2)}</strong> → Projected: <strong className={`font-mono ${
                        roiAnalysis.combinedDelta > 0 ? 'text-emerald-300 font-bold' : roiAnalysis.combinedDelta < 0 ? 'text-rose-300 font-bold' : 'text-white'
                      }`}>{roiAnalysis.combinedNewCgpa.toFixed(2)}</strong>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {roiAnalysis.combinedDelta > 0
                        ? `Boosts CGPA by +${roiAnalysis.combinedDelta.toFixed(3)} points`
                        : roiAnalysis.combinedDelta < 0
                          ? `⚠️ Warning: Lowers CGPA by ${Math.abs(roiAnalysis.combinedDelta).toFixed(3)} points`
                          : 'No net change to overall CGPA'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-dashed border-slate-800/80 text-center text-xs text-slate-400 bg-[#0e0e14]/30">
                  Select one or more courses below using the checkboxes to calculate combined repeat impact.
                </div>
              )}

              {/* Toolbar & Course Count */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs font-semibold text-slate-400">
                  {roiAnalysis.candidates.length} course{roiAnalysis.candidates.length !== 1 ? 's' : ''} detected
                </span>

                {roiAnalysis.candidates.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected: Record<string, boolean> = {};
                        roiAnalysis.candidates.forEach(c => { allSelected[c.code] = true; });
                        setSelectedRoiCourses(allSelected);
                      }}
                      className="text-slate-400 hover:text-indigo-300 transition underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        const allDeselected: Record<string, boolean> = {};
                        roiAnalysis.candidates.forEach(c => { allDeselected[c.code] = false; });
                        setSelectedRoiCourses(allDeselected);
                      }}
                      className="text-slate-400 hover:text-indigo-300 transition underline cursor-pointer"
                    >
                      Clear
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setRoiTargetGrades({})}
                      title="Reset all target repeat grades to 4.0 (A)"
                      className="text-slate-400 hover:text-indigo-300 transition underline cursor-pointer"
                    >
                      Reset Grades
                    </button>
                  </div>
                )}
              </div>

              {/* Course Cards List */}
              {roiAnalysis.candidates.length === 0 ? (
                <div className="p-8 rounded-3xl border border-slate-800/80 bg-[#0e0e14]/30 text-center space-y-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                    <Check className="h-5 w-5" />
                  </div>
                  <p className="text-xs text-slate-200 font-medium">
                    No courses found with grade ≤ {roiThresholdGrade} (or F).
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    You have no poor performing courses under this threshold. You can raise the threshold to include courses with higher grades.
                  </p>
                  <button
                    type="button"
                    onClick={() => setRoiThresholdGrade('all')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <span>Show All Gradable Courses (&lt; 4.0)</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                  {roiAnalysis.candidates.map((item) => {
                    const isSelected = item.isSelected;
                    const isBoost = item.delta > 0;
                    const isDrop = item.delta < 0;

                    return (
                      <div 
                        key={item.code} 
                        className={`p-4 rounded-2xl border transition-all ${
                          isSelected 
                            ? 'bg-[#12121c]/80 border-indigo-500/40 shadow-md' 
                            : 'bg-[#0e0e14]/40 border-slate-800/60 opacity-80 hover:opacity-100 hover:bg-[#0e0e14]/70'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                          {/* Course info & Checkbox */}
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRoiCourses(prev => ({
                                  ...prev,
                                  [item.code]: !isSelected
                                }));
                              }}
                              className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 focus:outline-none ${
                                isSelected
                                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-transparent shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                                  : 'border-white/20 bg-white/[0.03] hover:border-white/40'
                              }`}
                              title="Include in combined repeat calculation"
                            >
                              {isSelected && (
                                <Check className="h-3 w-3 text-white stroke-[3]" />
                              )}
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-sm text-white bg-[#060609] border border-slate-700/80 px-2 py-0.5 rounded-lg shadow-inner">{item.code}</span>
                                <span className="text-[11px] text-slate-400 font-semibold font-mono">({item.credits} Cr)</span>
                                {item.isF && (
                                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                    F Failed
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-300 truncate block max-w-xs sm:max-w-md mt-1 font-medium" title={item.title}>
                                {item.title}
                              </span>
                            </div>
                          </div>

                          {/* Current Grade & Target Grade Dropdown */}
                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-bold">Current</span>
                              <span className={`text-xs font-black px-2.5 py-1 rounded-xl border inline-block ${
                                item.isF 
                                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-300' 
                                  : 'bg-[#050508] border-slate-700 text-slate-200'
                              }`}>
                                {item.currentGrade} ({item.currentGp.toFixed(1)})
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-bold">Repeat As</span>
                              <select
                                value={item.targetGrade}
                                onChange={(e) => {
                                  const newG = e.target.value;
                                  setRoiTargetGrades(prev => ({
                                    ...prev,
                                    [item.code]: newG
                                  }));
                                }}
                                className="text-xs font-bold bg-[#050508] text-slate-100 border border-slate-700 hover:border-indigo-400 rounded-xl px-2.5 py-1 focus:outline-none focus:border-indigo-400 cursor-pointer shadow-inner"
                              >
                                {Object.keys(GRADING_SCALE).map(g => (
                                  <option key={g} value={g}>
                                    {g} ({GRADING_SCALE[g].toFixed(1)})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Individual Course Impact Sub-bar */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/60 text-xs">
                          <div className="flex items-center gap-1.5">
                            {isBoost ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <TrendingUp className="h-3.5 w-3.5" />
                                +{item.delta.toFixed(3)} CGPA Boost
                              </span>
                            ) : isDrop ? (
                              <span className="text-rose-400 font-bold flex items-center gap-1">
                                <TrendingDown className="h-3.5 w-3.5" />
                                {item.delta.toFixed(3)} CGPA Drop
                              </span>
                            ) : (
                              <span className="text-slate-400 font-semibold">
                                ±0.000 CGPA (No Change)
                              </span>
                            )}
                          </div>

                          <span className="text-slate-400 text-[11px]">
                            Yields <strong className={isBoost ? 'text-emerald-300' : isDrop ? 'text-rose-300' : 'text-slate-200'}>{item.newCgpa.toFixed(2)} CGPA</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-800/80 bg-[#0e0e14]/30 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRoiModal(false)}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-2xl transition cursor-pointer shadow-lg shadow-blue-600/25"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Grading System Reference Modal */}
      {showGradingSystemModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#08080d]/98 border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-[#0e0e14]/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white tracking-tight">Grading System</h3>
                  <p className="text-xs text-slate-400 mt-0.5">University standard grade points &amp; marks distribution</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGradingSystemModal(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto custom-scrollbar space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                The grades at the university will be indicated in the following manner:
              </p>

              <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-[#0e0e14]/30">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-[#050508] text-[10px] uppercase font-bold text-slate-400">
                      <th className="p-3">Marks Range</th>
                      <th className="p-3 text-center">Grade</th>
                      <th className="p-3 text-center">Grade Point</th>
                      <th className="p-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {GRADING_SYSTEM_INFO.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className="border-b border-slate-800/60 last:border-0 hover:bg-white/[0.02] transition"
                      >
                        <td className="p-3 font-mono text-[11px] text-slate-300">{row.marks}</td>
                        <td className="p-3 font-bold text-center text-indigo-300">{row.grade}</td>
                        <td className="p-3 font-mono font-semibold text-center text-slate-200">({row.points})</td>
                        <td className="p-3 text-slate-400 font-medium">{row.remark || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-800/80 bg-[#0e0e14]/30 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGradingSystemModal(false)}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-600/25 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {renderTutorial()}
    </div>
  );
}
