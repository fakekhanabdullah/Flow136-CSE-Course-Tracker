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
  FileText,
  List,
  Columns
} from "lucide-react";
import { COURSES, PREREQUISITES, Course, PrereqRule } from "./courses-data";

// Prerequisite Helper functions
const getCoursePrereqs = (courseCode: string, pathway: 'foundation' | 'credit' | null) => {
  const rule = PREREQUISITES[courseCode] || { hp: [], sp: [] };
  let hp = rule.hp || [];
  let sp = rule.sp || [];

  if (pathway === 'credit') {
    hp = hp.filter(code => !["ENG091", "MAT091", "MAT092"].includes(code));
    sp = sp.filter(code => !["ENG091", "MAT091", "MAT092"].includes(code));
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
  "F": 0.0
};

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

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
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [backupFileError, setBackupFileError] = useState<string | null>(null);
  const [targetCgpa, setTargetCgpa] = useState<string>("3.50");
  const [roiExpanded, setRoiExpanded] = useState<boolean>(false);
  const [isCapstoneCollapsed, setIsCapstoneCollapsed] = useState<boolean>(false);
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState<boolean>(false);
  const [showGradeSheetModal, setShowGradeSheetModal] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [draggingCourseCode, setDraggingCourseCode] = useState<string | null>(null);
  const [draggingSourceSemesterId, setDraggingSourceSemesterId] = useState<string | null>(null);
  const [dragOverSemesterId, setDragOverSemesterId] = useState<string | null>(null);

  // Monitor screen width to automatically disable Kanban view on mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Hydration fix & LocalStorage Loader
  useEffect(() => {
    setIsMounted(true);
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
        if (parsed.semesters) setSemesters(parsed.semesters);
        if (parsed.thesisTrack) setThesisTrack(parsed.thesisTrack);
        if (parsed.thesisSteps) setThesisSteps(parsed.thesisSteps);
        if (parsed.projectCompleted !== undefined) setProjectCompleted(parsed.projectCompleted);
        if (parsed.internshipCompleted !== undefined) setInternshipCompleted(parsed.internshipCompleted);
        if (parsed.onboardingData) setOnboardingData(parsed.onboardingData);
      }
      
      const welcomeShown = localStorage.getItem("bracu_cse_tracker_welcome_shown");
      if (!welcomeShown) {
        setShowWelcomeModal(true);
      }
    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
    }
  }, []);

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
    setSemesters(newSemesters);
    saveStateToLocalStorage(
      mode,
      isOnboarded,
      newSemesters,
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
    setOnboardingData({
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
    setSemesters([]);
    setThesisTrack('thesis');
    setThesisSteps({ step1: false, step2: false, step3: false });
    setProjectCompleted(false);
    setInternshipCompleted(false);
    setIsOnboarded(false);
    setWizardStep(1);
    setShowResetConfirm(false);
    setShowWelcomeModal(true);
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
      await new Promise(res => setTimeout(res, 30));

      toBlob(node, {
        cacheBust: false,
        skipFonts: false,
        pixelRatio: 1.5,
        backgroundColor: '#030712',
        width: 750,
        height: node.scrollHeight,
        windowWidth: 1200,
        windowHeight: node.scrollHeight + 100,
        style: {
          width: '750px',
          height: `${node.scrollHeight}px`,
          maxHeight: 'none',
          overflow: 'visible'
        }
      } as any).then((blob) => {
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

  // Unique courses dictionary representing the most recent attempts
  // Needed for "Math Rule" (factoring in only newest attempt into credit count and cumulative CGPA)
  const newestCourseAttempts = useMemo(() => {
    const result: Record<string, { semesterIdx: number; course: SelectedCourse }> = {};

    semesters.forEach((sem, semIdx) => {
      sem.courses.forEach(c => {
        const existing = result[c.code];
        if (!existing) {
          result[c.code] = { semesterIdx: semIdx, course: c };
        } else {
          // Prefer the latest graded attempt for CGPA.
          const newHasGrade = c.grade !== "";
          const existingHasGrade = existing.course.grade !== "";
          if (newHasGrade || !existingHasGrade) {
            result[c.code] = { semesterIdx: semIdx, course: c };
          }
        }
      });
    });

    return result;
  }, [semesters]);

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
          className="text-[8px] font-extrabold border border-amber-500/30 text-amber-400 bg-amber-500/5 px-1.5 py-0.5 rounded uppercase tracking-wider cursor-help select-none"
        >
          [Mandatory Core]
        </span>
      );
    }

    const isMand = isCourseMandatory(code);
    if (isMand) {
      return (
        <span className="text-[8px] font-extrabold border border-amber-500/30 text-amber-400 bg-amber-500/5 px-1.5 py-0.5 rounded uppercase tracking-wider select-none">
          [Mandatory Core]
        </span>
      );
    } else {
      return (
        <span className="text-[8px] font-extrabold border border-zinc-800 text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded uppercase tracking-wider select-none">
          [Elective]
        </span>
      );
    }
  }, [isCourseMandatory, onboardingData.pathway, onboardingData.creditOption, onboardingData.engStatusPriorToRS]);

  // Chronological term/year calculation for semesters
  const semesterIntakes = useMemo(() => {
    return calculateSemesterIntakes(semesters, {
      term: onboardingData.startingTerm || 'Spring',
      year: onboardingData.startingYear || 2025
    });
  }, [semesters, onboardingData.startingTerm, onboardingData.startingYear]);

  // Repeat ROI Recommendations for Mode B
  const roiRecommendations = useMemo(() => {
    if (mode !== 'gpa') return [];

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

    const items: { code: string; currentGrade: string; delta: number; newCgpa: number }[] = [];

    Object.keys(newestCourseAttempts).forEach(code => {
      const { course } = newestCourseAttempts[code];
      const courseData = COURSES.find(co => co.code === code);
      const credits = code === "CSE400" ? 4 : (courseData?.credits ?? 3);

      if (courseData?.category === "Non-Credit" || (courseData?.credits ?? 0) === 0) return;

      if (course.isCompleted && course.grade) {
        const gp = GRADING_SCALE[course.grade];
        if (gp >= 1.7 && gp <= 2.7) {
          const newPoints = totalCgpaPoints - (gp * credits) + (4.0 * credits);
          const newCgpa = newPoints / totalCgpaCredits;
          const delta = newCgpa - currentCgpa;
          items.push({
            code,
            currentGrade: course.grade,
            delta,
            newCgpa
          });
        }
      }
    });

    return items.sort((a, b) => b.delta - a.delta);
  }, [newestCourseAttempts, mode]);



  // Semester GPA calculations (all courses taken in that semester count)
  const semesterStats = useMemo(() => {
    return semesters.map(sem => {
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
    else if (requiredGpa > 0.0) letterEquivalent = "D";
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
        const { hp, sp } = getCoursePrereqs(c.code, onboardingData.pathway);

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
  }, [semesters, mode, onboardingData.pathway]);

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

  const handleRemoveCourse = (semId: string, courseCode: string) => {
    const updated = semesters.map(sem => {
      if (sem.id === semId) {
        return {
          ...sem,
          courses: sem.courses.filter(c => c.code !== courseCode)
        };
      }
      return sem;
    });
    updateSemesters(updated);
  };

  const handleAddCourseToSemester = (semId: string, courseCode: string) => {
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
          if (sem.courses.some(c => c.code === courseCode)) return sem;
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

  const handleMoveCourse = (sourceSemId: string, destSemId: string, course: SelectedCourse) => {
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
          return { ...c, grade };
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
                grade
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

  const handleCompletionToggle = (semId: string, courseCode: string, isCompleted: boolean) => {
    const updated = semesters.map(sem => {
      if (sem.id === semId) {
        return {
          ...sem,
          courses: sem.courses.map(c => {
            if (c.code === courseCode) {
              return {
                ...c,
                isCompleted
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

  const CSE400 = ({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) => {
    return (
      <div className="bg-zinc-950/75 border border-zinc-850 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden mt-6">
        <div className="absolute top-0 right-0 h-40 w-40 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className={`flex flex-wrap items-center justify-between gap-3 ${isCollapsed ? "" : "border-b border-zinc-800/80 pb-4 mb-6"}`}>
          <div>
            <h3 className="font-extrabold text-base text-white tracking-tight flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-400" />
              CSE400
            </h3>
            <p className="text-xs text-zinc-450 mt-1">Final Year Capstone: Thesis, Project, or Internship</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold bg-zinc-950/40 border border-zinc-800 text-indigo-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {isCSE400Passed ? "Completed: 4 / 4 Cr" : "Incomplete: 0 / 4 Cr"}
            </span>
            {isCSE400Passed ? (
              <span className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Passed / Defended
              </span>
            ) : (
              <span className="text-[10px] font-bold bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
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
              className="relative z-30 pointer-events-auto cursor-pointer flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all select-none flex-shrink-0"
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
              <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider block">Choose Capstone Track Path</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                      className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all duration-300 group ${
                        isSelected 
                          ? 'border-indigo-400 bg-indigo-500/10 text-white font-semibold shadow-[0_0_12px_rgba(99,102,241,0.15)]' 
                          : 'bg-zinc-955/40 border-zinc-800 hover:border-zinc-700 text-slate-400 hover:bg-white/5 hover:text-zinc-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-bold text-xs ${isSelected ? 'text-indigo-400 font-extrabold' : 'text-zinc-350'}`}>
                            {title}
                          </span>
                          <span className={`h-2 w-2 rounded-full transition ${isSelected ? 'bg-indigo-500 shadow-[0_0_8px_#6366f1]' : 'bg-zinc-800'}`} />
                        </div>
                        <p className="text-[10px] leading-relaxed text-zinc-500 group-hover:text-zinc-405 transition">
                          {desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checklist & Grade details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-zinc-800/80">
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider">Milestone Checklist</p>
                
                {thesisTrack === 'thesis' && (
                  <div className="space-y-3 bg-zinc-900/30 border border-zinc-855 p-4 rounded-xl">
                    <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={thesisSteps.step1}
                        onChange={(e) => {
                          const updatedSteps = { ...thesisSteps, step1: e.target.checked };
                          setThesisSteps(updatedSteps);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, updatedSteps, projectCompleted, internshipCompleted, onboardingData);
                        }}
                        className="h-4 w-4 accent-purple-500 rounded border-zinc-800"
                      />
                      <span>Step 1: Thesis Topic & Advisor Approved</span>
                    </label>
                    <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={thesisSteps.step2}
                        onChange={(e) => {
                          const updatedSteps = { ...thesisSteps, step2: e.target.checked };
                          setThesisSteps(updatedSteps);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, updatedSteps, projectCompleted, internshipCompleted, onboardingData);
                        }}
                        className="h-4 w-4 accent-purple-500 rounded border-zinc-800"
                      />
                      <span>Step 2: Mid-term defense cleared</span>
                    </label>
                    <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={thesisSteps.step3}
                        onChange={(e) => handleThesisStep3Toggle(e.target.checked)}
                        className="h-4 w-4 accent-purple-500 rounded border-zinc-800"
                      />
                      <span className="font-semibold text-white">Step 3: Final defense report defended & approved</span>
                    </label>
                  </div>
                )}

                {thesisTrack === 'project' && (
                  <div className="bg-zinc-900/30 border border-zinc-855 p-4 rounded-xl">
                    <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={projectCompleted}
                        onChange={(e) => {
                          setProjectCompleted(e.target.checked);
                          handleCSE400CompletionToggle(e.target.checked);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, thesisSteps, e.target.checked, internshipCompleted, onboardingData);
                        }}
                        className="h-4.5 w-4.5 accent-purple-500 rounded border-zinc-800"
                      />
                      <div>
                        <p className="font-semibold text-white">Final Project Built & Defended</p>
                        <p className="text-[10px] text-zinc-555 mt-0.5">Marks capstone complete and awards 4 degree credits</p>
                      </div>
                    </label>
                  </div>
                )}

                {thesisTrack === 'internship' && (
                  <div className="bg-zinc-900/30 border border-zinc-855 p-4 rounded-xl">
                    <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={internshipCompleted}
                        onChange={(e) => {
                          setInternshipCompleted(e.target.checked);
                          handleCSE400CompletionToggle(e.target.checked);
                          saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, thesisSteps, projectCompleted, e.target.checked, onboardingData);
                        }}
                        className="h-4.5 w-4.5 accent-purple-500 rounded border-zinc-800"
                      />
                      <div>
                        <p className="font-semibold text-white">Internship Completed & Report Submitted</p>
                        <p className="text-[10px] text-zinc-555 mt-0.5">Marks capstone complete and awards 4 degree credits</p>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {mode === 'gpa' && (
                <div className="space-y-3 bg-zinc-900/30 border border-zinc-855 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider block mb-1">Final Capstone Grade</label>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">Select the final grade scored in CSE400 for cumulative CGPA calculation.</p>
                  </div>
                  <select
                    value={cse400Course?.grade || ""}
                    onChange={(e) => handleCSE400GradeChange(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-xl px-3 py-2 w-full focus:border-purple-500 outline-none cursor-pointer mt-2 font-semibold"
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

  if (!isMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08080a] text-zinc-100 font-sans">
        <div className="flex flex-col items-center gap-4 text-center">
          <GraduationCap className="h-16 w-16 text-indigo-500 animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight">Loading Flow136...</h1>
          <p className="text-zinc-500 text-sm">Organizing your degree curriculum...</p>
        </div>
      </div>
    );
  }

  const currentLayout = isMobile ? 'list' : viewMode;

  return (
    <div className="min-h-screen w-full bg-[#030303] bg-gradient-to-b from-[#050507] via-[#09090b] to-[#0d0d12] text-zinc-100 font-sans antialiased flex flex-col">
      {/* 1. Header Navigation */}
      <header className="border-b border-zinc-800/80 bg-[#050507]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl shadow-black/30">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl border border-indigo-400/30 bg-indigo-500/10 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <svg className="h-5.5 w-5.5 text-indigo-400 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Flow136
            </h1>
            <p className="text-xs text-purple-400 font-medium tracking-wide">Your curriculum, minus the complexity.</p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex bg-zinc-950/40 border border-white/5 p-1 rounded-xl">
            <button
              onClick={() => mode !== 'tracker' && handleModeToggle()}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'tracker' 
                  ? 'bg-purple-950/20 text-purple-400 border border-purple-500/20 shadow-md' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Course Tracker Only
            </button>
            <button
              onClick={() => mode !== 'gpa' && handleModeToggle()}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'gpa' 
                  ? 'bg-purple-950/20 text-purple-400 border border-purple-500/20 shadow-md' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Course + CGPA Planner
            </button>
          </div>

          {/* Backup Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBackup}
              title="Download backup plan"
              className="flex items-center gap-1.5 bg-zinc-950/40 hover:bg-zinc-900/60 border border-white/5 text-zinc-300 text-xs px-3 py-2 rounded-xl transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Backup</span>
            </button>
            
            <label className="flex items-center gap-1.5 bg-zinc-950/40 hover:bg-zinc-900/60 border border-white/5 text-zinc-300 text-xs px-3 py-2 rounded-xl cursor-pointer transition">
              <Upload className="h-3.5 w-3.5" />
              <span>Restore</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setShowGradeSheetModal(true)}
              className="inline-flex items-center gap-2 bg-slate-900/80 hover:bg-indigo-600/20 border border-indigo-500/30 text-slate-200 hover:text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-all cursor-pointer shadow-sm"
              title="Open official progress grade sheet preview modal"
            >
              <FileText className="h-3.5 w-3.5 text-indigo-400" />
              <span>Snapshot Progress</span>
            </button>
 
            <button
              onClick={() => setShowResetConfirm(true)}
              title="Reset tracker to onboarding defaults"
              className="bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/20 text-rose-400 p-2 rounded-xl transition"
            >
              <RotateCcw className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Top-level Alert Panels (Standing warnings) */}
      {mode === 'gpa' && (
        <div className="px-6 pt-4 flex flex-col gap-3">
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
        <div className="mx-6 mt-4 flex items-center justify-between gap-3 bg-rose-950/30 border border-rose-900/40 p-4 rounded-xl text-rose-400">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm">{backupFileError}</p>
          </div>
          <button onClick={() => setBackupFileError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 3. Main Dashboard Layout */}
      {!isOnboarded ? (
        /* Onboarding Wizard Modal overlay if not onboarded */
        <div className="flex-1 flex items-center justify-center p-6 pb-20 bg-gradient-to-br from-[#030303] via-[#08080a] to-[#0d0d12] overflow-y-auto">
          <div className="w-full max-w-2xl bg-zinc-950/75 border border-zinc-855 rounded-2xl shadow-2xl transition-all backdrop-blur-md overflow-hidden p-0 pb-16 mb-16">
            <div className="w-full max-h-[85vh] overflow-y-auto p-8 pr-6 custom-scrollbar">
            {/* Step Indicators */}
            <div className="flex items-center gap-2 mb-8">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full ${
                    s <= wizardStep 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600' 
                      : 'bg-zinc-800'
                  }`}
                />
              ))}
            </div>

            {/* Step 1: Starting State (Credit vs. Non-Credit) */}
            {wizardStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">1st Semester Starting State</h2>
                  <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                    How did you start your 1st Semester at BRACU? Choose your starting entry point to map your calculus and English pathways.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Pathway Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setOnboardingData({
                        ...onboardingData,
                        pathway: 'foundation',
                        foundationOption: onboardingData.foundationOption || 'opt1',
                        creditOption: null
                      })}
                      className={`p-4 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between h-28 ${
                        onboardingData.pathway === 'foundation'
                          ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-400 font-semibold shadow-[0_0_12px_rgba(139,92,246,0.1)]'
                          : 'bg-slate-900/40 border-indigo-500/10 text-zinc-400 hover:border-indigo-500/20 hover:text-zinc-200'
                      }`}
                    >
                      <BookOpen className="h-5 w-5" />
                      <div>
                        <p className="text-xs text-white font-bold">Pathway A</p>
                        <p className="text-[10px] text-zinc-550 mt-0.5">Non-Credit Foundation</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setOnboardingData({
                        ...onboardingData,
                        pathway: 'credit',
                        creditOption: onboardingData.creditOption || 'opt1',
                        foundationOption: null
                      })}
                      className={`p-4 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between h-28 ${
                        onboardingData.pathway === 'credit'
                          ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-400 font-semibold shadow-[0_0_12px_rgba(139,92,246,0.1)]'
                          : 'bg-slate-900/40 border-indigo-500/10 text-zinc-400 hover:border-indigo-500/20 hover:text-zinc-200'
                      }`}
                    >
                      <Award className="h-5 w-5" />
                      <div>
                        <p className="text-xs text-white font-bold">Pathway B</p>
                        <p className="text-[10px] text-zinc-555 mt-0.5">Direct Credit Courses</p>
                      </div>
                    </button>
                  </div>

                  {/* Sub-options for Pathway A */}
                  {onboardingData.pathway === 'foundation' && (
                    <div className="space-y-2 pt-2">
                      <label className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">Select all required non-credit courses:</label>
                      
                      <label className="flex items-start gap-3 bg-slate-900/40 p-4 rounded-xl border border-indigo-500/10 hover:border-indigo-500/20 transition-all duration-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={onboardingData.remedialEng091Checked}
                          onChange={(e) => setOnboardingData({ ...onboardingData, remedialEng091Checked: e.target.checked })}
                          className="mt-1 h-4.5 w-4.5 accent-indigo-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">ENG091 (Foundation Course in English)</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Required for students needing basic English grounding</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 bg-slate-900/40 p-4 rounded-xl border border-indigo-500/10 hover:border-indigo-500/20 transition-all duration-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={onboardingData.remedialMat091Checked}
                          onChange={(e) => setOnboardingData({ ...onboardingData, remedialMat091Checked: e.target.checked })}
                          className="mt-1 h-4.5 w-4.5 accent-indigo-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">MAT091 (Basic Course in Mathematics I)</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Basic remedial pre-calculus algebra</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 bg-slate-900/40 p-4 rounded-xl border border-indigo-500/10 hover:border-indigo-500/20 transition-all duration-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={onboardingData.remedialMat092Checked}
                          onChange={(e) => setOnboardingData({ ...onboardingData, remedialMat092Checked: e.target.checked })}
                          className="mt-1 h-4.5 w-4.5 accent-indigo-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">MAT092 (Basic Course in Mathematics II)</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Intermediate remedial algebra prior to MAT110 Calculus</p>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Sub-options for Pathway B */}
                  {onboardingData.pathway === 'credit' && (
                    <div className="space-y-2 pt-2">
                      <label className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">Select Starting English course:</label>
                      
                      <button
                        onClick={() => setOnboardingData({ ...onboardingData, creditOption: 'opt1' })}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition-all duration-300 flex items-center justify-between ${
                          onboardingData.creditOption === 'opt1'
                            ? 'bg-indigo-950/20 border-indigo-500/30 text-white font-semibold shadow-[0_0_12px_rgba(139,92,246,0.1)]'
                            : 'bg-slate-900/40 border-indigo-500/10 text-zinc-400 hover:border-indigo-500/20 hover:text-zinc-200'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-white">Option 1: Started with ENG101</p>
                          <p className="text-[10px] text-zinc-550 mt-0.5">Assigns ENG101 (English Fundamentals) to Semester 1</p>
                        </div>
                        {onboardingData.creditOption === 'opt1' && <Check className="h-4 w-4 text-indigo-400" />}
                      </button>

                      <button
                        onClick={() => setOnboardingData({ ...onboardingData, creditOption: 'opt2' })}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition-all duration-300 flex items-center justify-between ${
                          onboardingData.creditOption === 'opt2'
                            ? 'bg-indigo-950/20 border-indigo-500/30 text-white font-semibold shadow-[0_0_12px_rgba(139,92,246,0.1)]'
                            : 'bg-slate-900/40 border-indigo-500/10 text-zinc-400 hover:border-indigo-500/20 hover:text-zinc-200'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-white">Option 2: Started with ENG102</p>
                          <p className="text-[10px] text-zinc-555 mt-0.5">Assigns ENG102 (Composition I) to Semester 1</p>
                        </div>
                        {onboardingData.creditOption === 'opt2' && <Check className="h-4 w-4 text-indigo-400" />}
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setWizardStep(2)}
                  disabled={!onboardingData.pathway}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg transition"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Step 2: RS Semester and Placement status */}
            {wizardStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">RS & English Placement Engine</h2>
                  <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                    Set up your Residential Semester. The engine will evaluate prerequisites to auto-populate the RS card.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* Select RS Term */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">When did you (or when will you) attend RS?</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["3rd Semester", "4th Semester", "5th Semester"] as const).map(term => (
                        <button
                          key={term}
                          onClick={() => setOnboardingData({ ...onboardingData, rsTerm: term })}
                          className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all duration-300 ${
                            onboardingData.rsTerm === term
                              ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-400 font-bold shadow-[0_0_12px_rgba(139,92,246,0.1)]'
                              : 'bg-slate-900/40 border-indigo-500/10 text-zinc-400 hover:border-indigo-500/20 hover:text-zinc-200'
                          }`}
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Select Starting Intake */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">What was your Starting Intake?</label>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={onboardingData.startingTerm}
                        onChange={(e) => setOnboardingData({ ...onboardingData, startingTerm: e.target.value as any })}
                        className="w-full bg-slate-900/60 border border-indigo-500/20 text-xs px-3.5 py-2.5 rounded-xl text-white outline-none focus:border-indigo-500 transition cursor-pointer"
                      >
                        <option value="Spring">Spring</option>
                        <option value="Summer">Summer</option>
                        <option value="Fall">Fall</option>
                      </select>
                      
                      <select
                        value={onboardingData.startingYear}
                        onChange={(e) => setOnboardingData({ ...onboardingData, startingYear: parseInt(e.target.value) })}
                        className="w-full bg-slate-900/60 border border-indigo-500/20 text-xs px-3.5 py-2.5 rounded-xl text-white outline-none focus:border-indigo-500 transition cursor-pointer"
                      >
                        {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Select English Prior Status */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">English course status PRIOR to attending RS</label>
                    <div className="space-y-2">
                      
                      <button
                        onClick={() => setOnboardingData({ ...onboardingData, engStatusPriorToRS: 'caseA' })}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition-all duration-300 flex items-center justify-between ${
                          onboardingData.engStatusPriorToRS === 'caseA'
                            ? 'bg-indigo-950/20 border-indigo-500/30 text-white font-semibold shadow-[0_0_12px_rgba(139,92,246,0.1)]'
                            : 'bg-slate-900/40 border-indigo-500/10 text-zinc-400 hover:border-indigo-500/20 hover:text-zinc-200'
                        }`}
                      >
                        <div>
                          <p className="text-zinc-200 font-semibold text-xs">Passed ENG101, but NOT ENG102 before RS</p>
                          <p className="text-[9px] text-indigo-400 mt-0.5">RS card will auto-assign: ENG102 as your 4th course</p>
                        </div>
                        {onboardingData.engStatusPriorToRS === 'caseA' && <Check className="h-4 w-4 text-indigo-400" />}
                      </button>
 
                      <button
                        onClick={() => setOnboardingData({ ...onboardingData, engStatusPriorToRS: 'caseB' })}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition-all duration-300 flex items-center justify-between ${
                          onboardingData.engStatusPriorToRS === 'caseB'
                            ? 'bg-indigo-950/20 border-indigo-500/30 text-white font-semibold shadow-[0_0_12px_rgba(139,92,246,0.1)]'
                            : 'bg-slate-900/40 border-indigo-500/10 text-zinc-400 hover:border-indigo-500/20 hover:text-zinc-200'
                        }`}
                      >
                        <div>
                          <p className="text-zinc-200 font-semibold text-xs">Passed ENG101 and ENG102 before RS</p>
                          <p className="text-[9px] text-emerald-400 mt-0.5">RS card will auto-assign: BU201 as your 4th course</p>
                        </div>
                        {onboardingData.engStatusPriorToRS === 'caseB' && <Check className="h-4 w-4 text-indigo-400" />}
                      </button>
 
                      <button
                        onClick={() => setOnboardingData({ ...onboardingData, engStatusPriorToRS: 'caseC' })}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition-all duration-300 flex items-center justify-between ${
                          onboardingData.engStatusPriorToRS === 'caseC'
                            ? 'bg-indigo-950/20 border-indigo-500/30 text-white font-semibold shadow-[0_0_12px_rgba(139,92,246,0.1)]'
                            : 'bg-slate-900/40 border-indigo-500/10 text-zinc-400 hover:border-indigo-500/20 hover:text-zinc-200'
                        }`}
                      >
                        <div>
                          <p className="text-zinc-200 font-semibold text-xs">Failed ENG101 before RS</p>
                          <p className="text-[9px] text-emerald-400 mt-0.5">RS card will auto-assign: BU201 as your 4th course</p>
                        </div>
                        {onboardingData.engStatusPriorToRS === 'caseC' && <Check className="h-4 w-4 text-indigo-400" />}
                      </button>
 
                      <button
                        onClick={() => setOnboardingData({ ...onboardingData, engStatusPriorToRS: 'caseD' })}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition-all duration-300 flex items-center justify-between ${
                          onboardingData.engStatusPriorToRS === 'caseD'
                            ? 'bg-indigo-950/20 border-indigo-500/30 text-white font-semibold shadow-[0_0_12px_rgba(139,92,246,0.1)]'
                            : 'bg-slate-900/40 border-indigo-500/10 text-zinc-400 hover:border-indigo-500/20 hover:text-zinc-200'
                        }`}
                      >
                        <div>
                          <p className="text-zinc-200 font-semibold text-xs">Started with ENG102 and completed before RS</p>
                          <p className="text-[9px] text-emerald-400 mt-0.5">RS card will auto-assign: BU201 as your 4th course</p>
                        </div>
                        {onboardingData.engStatusPriorToRS === 'caseD' && <Check className="h-4 w-4 text-indigo-400" />}
                      </button>
 
                    </div>
                  </div>
                </div>
 
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="flex-1 py-3 bg-slate-900/40 hover:bg-slate-900/60 border border-indigo-500/15 text-zinc-300 font-semibold rounded-xl transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (onboardingData.engStatusPriorToRS) {
                        setWizardStep(3);
                      }
                    }}
                    disabled={!onboardingData.engStatusPriorToRS}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg transition"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Summary and Generation */}
            {wizardStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">Generate Your Study Plan</h2>
                  <p className="text-zinc-400 text-xs mt-1">Review your generated curriculum layout summary:</p>
                </div>

                <div className="bg-slate-900/40 border border-indigo-500/10 p-5 rounded-xl space-y-4 text-xs shadow-[0_0_15px_rgba(99,102,241,0.03)]">
                  <div className="flex justify-between border-b border-white/5 pb-2.5">
                    <span className="text-zinc-500">Starting Pathway:</span>
                    <span className="text-white font-semibold capitalize">
                      {onboardingData.pathway === 'foundation' ? "Non-Credit Foundation" : "Direct Credit Course"}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-white/5 pb-2.5">
                    <span className="text-zinc-500">1st Semester Course:</span>
                    <span className="text-indigo-400 font-semibold">
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

                  <div className="flex justify-between border-b border-white/5 pb-2.5">
                    <span className="text-zinc-500">RS Semester Card:</span>
                    <span className="text-white font-semibold">{onboardingData.rsTerm} location</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-zinc-500">RS Course Population:</span>
                    <span className="text-indigo-400 font-semibold">
                      {onboardingData.engStatusPriorToRS === 'caseA' ? "EMB101 + HUM103 + BNG103 + ENG102" : "EMB101 + HUM103 + BNG103 + BU201"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="flex-1 py-3 bg-slate-900/40 hover:bg-slate-900/60 border border-indigo-500/15 text-zinc-300 font-semibold rounded-xl transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={generateInitialPlan}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition"
                  >
                    Generate Plan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      ) : (
        /* Actual App Dashboard */
        <div className="flex-1 w-full max-w-[1600px] mx-auto px-4 lg:px-6 py-4 flex flex-col">
          <div className="flex-1 flex flex-col lg:flex-row gap-6">
            
            {/* A. LEFT SIDEBAR: Degree Progress & Statistics */}
            <aside className="w-full lg:w-[38%] shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-48px)] flex flex-col pb-6">
              
              {/* Unified Progress & Requirements Module */}
              <div className="bg-zinc-950/75 border border-zinc-855 rounded-2xl shadow-2xl shadow-black/45 backdrop-blur-md flex flex-col lg:max-h-full overflow-hidden p-0">
                <div className="w-full overflow-y-auto p-5 pr-3 custom-scrollbar flex flex-col lg:max-h-full">
                
                {/* 1. Top Section: Degree Standing Header & Completed Credits progress bar */}
                <div className="relative overflow-hidden mb-4 shrink-0">
                  <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <h2 className="text-xs font-bold text-indigo-400 tracking-wider uppercase flex items-center gap-2 mb-3">
                    <GraduationCap className="h-4 w-4" />
                    Degree Standing
                  </h2>
                  
                  <div className="space-y-3">
                    {/* Credit Progress */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-zinc-400 font-medium">Completed Credits</span>
                        <span className="text-white font-extrabold">{cumulativeStats.completedCredits} / 136 Cr</span>
                      </div>
                      <div className="h-3 w-full bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden p-0.5">
                        <div 
                          style={{ width: `${Math.min(100, (cumulativeStats.completedCredits / 136) * 100)}%` }}
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Middle Section: Cumulative CGPA display, Probation Badge, and the Target CGPA Solver widget */}
                {mode === 'gpa' && (
                  <div className="space-y-4 mb-4 shrink-0">
                    
                    {/* Cumulative CGPA Box */}
                    <div className="bg-zinc-900/30 border border-zinc-855 p-5 rounded-xl flex flex-col gap-3 shadow-[0_0_15px_rgba(99,102,241,0.03)]">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Cumulative CGPA</p>
                        <p className="text-3xl lg:text-4xl font-extrabold text-white mt-1 tracking-tight">
                          {cumulativeStats.cgpa.toFixed(2)}
                        </p>
                      </div>
                      <div className="pt-0.5">
                        {cumulativeStats.cgpa >= 2.0 ? (
                          <span className="inline-flex items-center justify-center whitespace-nowrap text-[10px] font-extrabold bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 px-3 py-1 rounded-full uppercase tracking-wider">
                            Good Standing
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center whitespace-nowrap text-[10px] font-extrabold bg-rose-500/10 border border-rose-500/20 text-rose-450 px-3 py-1 rounded-full uppercase tracking-wider">
                            Probation Range
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Target CGPA Solver Widget */}
                    <div className="bg-zinc-900/30 border border-zinc-855 p-5 rounded-xl space-y-3.5 shadow-[0_0_15px_rgba(99,102,241,0.03)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <Target className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-xs font-semibold tracking-wider text-slate-300 uppercase">Target Solver</p>
                        </div>
                        
                        <div className="inline-flex items-center gap-1.5 bg-slate-900/90 border border-indigo-500/30 rounded-lg px-3 py-1.5 shadow-inner">
                          <span className="text-xs text-slate-400">Target:</span>
                          <input
                            type="number"
                            step="0.01"
                            min="1.5"
                            max="4.0"
                            value={targetCgpa}
                            onChange={(e) => setTargetCgpa(e.target.value)}
                            className="w-12 text-sm font-semibold text-white bg-transparent focus:outline-none focus:text-indigo-300 text-center appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </div>
                      </div>

                      {targetSolverResult.isAchieved ? (
                        <div className="text-sm leading-relaxed text-slate-350">
                          🎉 Graduation requirements met! Your final CGPA is <span className="font-semibold text-indigo-300 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{targetSolverResult.maxPossibleCgpa.toFixed(2)}</span>.
                        </div>
                      ) : targetSolverResult.requiredGpa > 4.00 ? (
                        <div className="bg-rose-950/15 border border-rose-900/30 p-3 rounded-lg text-rose-400 space-y-1 text-xs leading-relaxed">
                          <p className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider">⚠️ Out of Reach</p>
                          <p>This target is mathematically out of reach. If you score a flat 4.00 (all A's) across your remaining credits, your maximum possible graduation CGPA will be <span className="font-semibold text-indigo-300 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{targetSolverResult.maxPossibleCgpa.toFixed(2)}</span>.</p>
                        </div>
                      ) : (
                        <div className="text-sm leading-relaxed text-slate-300">
                          To reach <span className="font-semibold text-indigo-300 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{targetCgpa}</span>, you need to maintain an average semester grade of <span className="font-semibold text-indigo-300 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{targetSolverResult.requiredGpa.toFixed(2)}</span> (approx. <span className="font-semibold text-indigo-300 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{targetSolverResult.letterEquivalent}</span>) over your remaining <span className="font-semibold text-indigo-300 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{targetSolverResult.remainingCredits} credits</span>.
                        </div>
                      )}
                    </div>

                    {/* Repeat ROI Analyzer Widget */}
                    <div className="bg-zinc-900/30 border border-zinc-855 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(99,102,241,0.03)]">
                      <div className="p-5 flex items-center justify-between border-b border-white/5 bg-zinc-950/20">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <TrendingUp className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-xs font-semibold tracking-wider text-slate-300 uppercase">Repeat ROI Analyzer</p>
                        </div>
                        
                        <button
                          onClick={() => setRoiExpanded(!roiExpanded)}
                          className="text-zinc-500 font-bold text-[10px] bg-zinc-900 px-2 py-1 rounded border border-zinc-800 flex items-center gap-1.5 hover:text-indigo-400 transition"
                        >
                          <span>{roiRecommendations.length} courses</span>
                          {roiExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>

                      {roiExpanded && (
                        <div className="p-5 border-t border-zinc-850 bg-zinc-950/10 space-y-3">
                          {roiRecommendations.length === 0 ? (
                            <div className="text-sm text-zinc-500 py-2 leading-relaxed">
                              No C- to B- range courses found to repeat.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="bg-indigo-950/20 border border-indigo-900/30 p-3 rounded-lg text-indigo-350 text-xs leading-relaxed">
                                <span className="font-bold text-white">Biggest Impact:</span> Repeating <span className="font-bold text-white">{roiRecommendations[0].code}</span> (Current: <span className="font-semibold text-zinc-400">{roiRecommendations[0].currentGrade}</span>) to an A will boost your overall CGPA by <span className="font-extrabold text-indigo-400">+{roiRecommendations[0].delta.toFixed(3)}</span> points.
                              </div>

                              <div className="space-y-2">
                                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Top 3 Optimization Targets</p>
                                {roiRecommendations.slice(0, 3).map((item, idx) => (
                                  <div key={item.code} className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-900 last:border-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-bold text-zinc-550 w-3">{idx + 1}.</span>
                                      <span className="font-bold text-zinc-200">{item.code}</span>
                                      <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1 rounded border border-zinc-850">{item.currentGrade}</span>
                                    </div>
                                    <div className="text-right text-[11px]">
                                      <span className="text-indigo-400 font-bold">+{item.delta.toFixed(3)} CGPA</span>
                                      <span className="text-[9px] text-zinc-555 block">Yields {item.newCgpa.toFixed(2)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Divider */}
                <div className="border-t border-white/10 my-4 shrink-0" />

                {/* 4. Bottom Section: Category Requirements */}
                <div className="space-y-3">
                  <h2 className="text-xs font-bold text-indigo-400 tracking-wider uppercase flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Category Requirements
                  </h2>

                  <div className="space-y-3">
                    {/* 1. Mandatory Core */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-zinc-350 font-semibold">Program Core (Mandatory)</span>
                        <span className="text-zinc-500 font-extrabold">{curriculumProgress.coreCompleted} / {curriculumProgress.coreTotal} Cr</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-955 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${(curriculumProgress.coreCompleted / curriculumProgress.coreTotal) * 100}%` }}
                          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>

                    {/* Capstone Thesis */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-zinc-350 font-semibold">Capstone Thesis (CSE400)</span>
                        <span className="text-zinc-500 font-extrabold">{curriculumProgress.thesisCompleted} / {curriculumProgress.thesisTotal} Cr</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-955 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${(curriculumProgress.thesisCompleted / curriculumProgress.thesisTotal) * 100}%` }}
                          className="h-full bg-purple-500/80 rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>

                    {/* 2. School Core (Math & Sciences) */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-zinc-355 font-semibold">School Core (Math & Sciences)</span>
                        <span className="text-zinc-500 font-extrabold">{curriculumProgress.schoolCoreCompleted} / {curriculumProgress.schoolCoreTotal} Cr</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-955 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${(curriculumProgress.schoolCoreCompleted / curriculumProgress.schoolCoreTotal) * 100}%` }}
                          className="h-full bg-purple-500 rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>

                    {/* 3. CSE Major Electives */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-zinc-355 font-semibold">CSE Major Electives</span>
                        <span className="text-zinc-500 font-extrabold">{curriculumProgress.electiveCompleted} / {curriculumProgress.electiveTotal} Cr</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-955 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${(curriculumProgress.electiveCompleted / curriculumProgress.electiveTotal) * 100}%` }}
                          className="h-full bg-indigo-400 rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>

                    {/* 4. GenEd Streams */}
                    <div className="pt-2 border-t border-white/5 space-y-2.5">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">GenEd Streams Progress (39 Cr Total)</p>
                      
                      {/* Stream 1: Writing */}
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-zinc-400">GenEd Stream 1 (Writing Comprehension)</span>
                          <span className="text-zinc-550 font-extrabold">{curriculumProgress.stream1Completed} / {curriculumProgress.stream1Total} Cr</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-955 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${(curriculumProgress.stream1Completed / curriculumProgress.stream1Total) * 100}%` }}
                            className="h-full bg-indigo-500/70 rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>

                      {/* Stream 2: Math/Sci */}
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-zinc-400">GenEd Stream 2 (Math & Natural Sciences)</span>
                          <span className="text-zinc-550 font-extrabold">{curriculumProgress.stream2Completed} / {curriculumProgress.stream2Total} Cr</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-955 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${(curriculumProgress.stream2Completed / curriculumProgress.stream2Total) * 100}%` }}
                            className="h-full bg-indigo-500/70 rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>

                      {/* Stream 3: Arts */}
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-zinc-400">GenEd Stream 3 (Arts & Humanities)</span>
                          <span className="text-zinc-555 font-extrabold">{curriculumProgress.stream3Completed} / {curriculumProgress.stream3Total} Cr</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-955 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${(curriculumProgress.stream3Completed / curriculumProgress.stream3Total) * 100}%` }}
                            className="h-full bg-indigo-500/70 rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>

                      {/* Stream 4: Social */}
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-zinc-400">GenEd Stream 4 (Social Sciences)</span>
                          <span className="text-zinc-555 font-extrabold">{curriculumProgress.stream4Completed} / {curriculumProgress.stream4Total} Cr</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-955 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${(curriculumProgress.stream4Completed / curriculumProgress.stream4Total) * 100}%` }}
                            className="h-full bg-indigo-500/70 rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>

                      {/* Stream 5: CST */}
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-zinc-400">GenEd Stream 5 (Communities / CST)</span>
                          <span className="text-zinc-555 font-extrabold">{curriculumProgress.stream5Completed} / {curriculumProgress.stream5Total} Cr</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-955 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${(curriculumProgress.stream5Completed / curriculumProgress.stream5Total) * 100}%` }}
                            className="h-full bg-indigo-500/70 rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>

                      {/* Free GenEd Choice */}
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-zinc-400">GenEd Electives (Free Choice)</span>
                          <span className="text-zinc-555 font-extrabold">{curriculumProgress.freeGenEdCredits} / {curriculumProgress.freeGenEdTotal} Cr</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-955 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${(curriculumProgress.freeGenEdCredits / curriculumProgress.freeGenEdTotal) * 100}%` }}
                            className="h-full bg-indigo-500/70 rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                </div>
              </div>
            </aside>

          {/* B. RIGHT PANEL: Semester Timeline Card Schedule */}
          <main className="flex-1 lg:overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-6">
            
            {/* Semester timelines header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-400" />
                <h2 className="text-base font-bold tracking-tight text-white">Curriculum Plan Semester Cards</h2>
              </div>
              <div className="flex items-center gap-2">
                {/* View Switcher Toggle (Hidden on mobile) */}
                <div className="hidden md:flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 shadow-inner mr-2">
                  <button
                    onClick={() => handleToggleViewMode("list")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      currentLayout === "list"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    <span>List Feed</span>
                  </button>
                  <button
                    onClick={() => handleToggleViewMode("kanban")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      currentLayout === "kanban"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Columns className="h-3.5 w-3.5" />
                    <span>Kanban Board</span>
                  </button>
                </div>

                <button
                  onClick={handleToggleAllCollapse}
                  className="bg-zinc-900/60 border border-zinc-800/80 hover:bg-indigo-500/10 hover:border-indigo-500/20 text-zinc-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                >
                  {isAnyExpanded ? "Collapse All" : "Expand All"}
                </button>
                <button
                  onClick={handleAddSemester}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Semester</span>
                </button>
              </div>
            </div>

            {/* List of Semester Cards */}
            <div className={currentLayout === 'kanban' ? "flex flex-row gap-6 overflow-x-auto pt-8 pb-3 px-1 items-end snap-x max-w-full custom-scrollbar scale-y-[-1]" : "space-y-6"}>
              {semesters.map((sem, semIdx) => {
                const stats = semesterStats.find(s => s.id === sem.id);
                const hasCSE400 = sem.courses.some(c => c.code === "CSE400");
                const isSemester9Plus = semIdx >= 8; // index 8 is the 9th semester card
                const intake = semesterIntakes[semIdx];

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
                        ? "w-[340px] min-w-[340px] flex-shrink-0 snap-start scale-y-[-1]" 
                        : ""
                    } bg-zinc-955/70 border rounded-2xl overflow-visible shadow-xl backdrop-blur-md hover:border-zinc-800 transition-all duration-300 ${
                      draggingCourseCode && dragOverSemesterId === sem.id 
                        ? "border-dashed border-2 border-indigo-500 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.15)]" 
                        : "border-zinc-850"
                    }`}
                  >
                                  {/* Semester Card Header */}
                    <div className={`bg-white/[0.02] px-5 py-4 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl ${sem.isCollapsed ? "rounded-b-2xl" : "border-b border-white/5"}`}>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_6px_#8b5cf6]" />
                        <h3 className="font-bold text-sm text-white tracking-tight flex flex-wrap items-center gap-2">
                          <span>{sem.isRS ? "Residential Semester (RS)" : `Semester ${semIdx + 1}`}</span>
                          <span className="text-zinc-700 font-normal">|</span>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={sem.term || intake?.term || 'Spring'}
                              onChange={(e) => handleOverrideIntake(sem.id, e.target.value as any, sem.year || intake?.year || onboardingData.startingYear)}
                              className="bg-zinc-955/40 border border-white/5 hover:border-white/10 text-xs text-zinc-200 rounded-lg px-3 py-1.5 outline-none cursor-pointer focus:border-purple-500 font-semibold transition"
                            >
                              <option value="Spring">Spring</option>
                              <option value="Summer">Summer</option>
                              <option value="Fall">Fall</option>
                            </select>
                            <select
                              value={sem.year || intake?.year || 2025}
                              onChange={(e) => handleOverrideIntake(sem.id, sem.term || intake?.term || 'Spring', parseInt(e.target.value))}
                              className="bg-zinc-955/40 border border-white/5 hover:border-white/10 text-xs text-zinc-200 rounded-lg px-3 py-1.5 outline-none cursor-pointer focus:border-purple-500 font-semibold transition"
                            >
                              {Array.from({ length: 101 }, (_, i) => 2001 + i).map(year => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </select>
                          </div>
                        </h3>
                        {sem.isRS ? (
                          <span className="text-[9px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-md tracking-wider uppercase select-none">
                            RS Campus
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarkAsRS(sem.id)}
                            className="text-[9px] font-bold bg-zinc-955/40 border border-white/5 hover:border-white/10 text-zinc-400 hover:text-zinc-200 px-2.5 py-1 rounded-md tracking-wider uppercase transition"
                          >
                            Mark as RS
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-500">Credits: <span className="text-zinc-300 font-semibold">{stats?.credits ?? 0}</span></span>
                          {mode === 'gpa' && stats?.gpa != null && (
                            <span className="text-zinc-500">Semester GPA: <span className="text-indigo-400 font-bold">{stats.gpa.toFixed(2)}</span></span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 pl-3 border-l border-zinc-800">
                          <button
                            onClick={() => setActiveCourseSelectorSemesterId(sem.id)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span>Add Course</span>
                          </button>

                           <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = semesters.map(s => {
                                if (s.id === sem.id) {
                                  return { ...s, isCollapsed: !(s.isCollapsed || false) };
                                }
                                return s;
                              });
                              updateSemesters(updated);
                            }}
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition"
                            title={sem.isCollapsed ? "Expand Semester" : "Minimize Semester"}
                          >
                            {sem.isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                          </button>

                          <button
                            onClick={() => handleDeleteSemester(sem.id)}
                            className="text-zinc-600 hover:text-rose-400 p-1.5 rounded-lg transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Course list grid in Semester Card */}
                    {!sem.isCollapsed && (
                      <div className="p-4 divide-y divide-zinc-800/60">
                      
                      {sem.courses.length === 0 && (
                        <div className="py-6 text-center text-zinc-500 text-xs">
                          No courses scheduled in this semester.
                        </div>
                      )}

                      {sem.courses.map((c) => {
                        const courseDetails = COURSES.find(co => co.code === c.code);
                        const isCSE400Row = c.code === "CSE400";
                        const warnings = prerequisiteWarnings[`${sem.id}_${c.code}`];
                        const attempt = courseAttemptStats[`${sem.id}_${c.code}`];
                        
                        // Filter out CSE400 from semester cards (rendered globally as standalone widget instead)
                        if (isCSE400Row) {
                          return null;
                        }

                        const isCreditCourse = courseDetails?.category !== "Non-Credit" && (courseDetails?.credits ?? 3) > 0;

                        return (
                          <div 
                            key={c.code}
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
                            className={`flex justify-between gap-3 text-xs group transition-all duration-200 ${
                              currentLayout === 'kanban' 
                                ? "flex-col p-3.5 border border-zinc-800/85 rounded-xl bg-zinc-900/45 hover:bg-zinc-900/70 hover:border-zinc-700/60 shadow-md mb-3 cursor-grab" 
                                : "flex-col md:flex-row md:items-center py-3.5 border-b border-zinc-800/40 last:border-b-0 relative"
                            } ${
                              draggingCourseCode === c.code 
                                ? currentLayout === 'kanban'
                                  ? "scale-105 shadow-2xl cursor-grabbing border-indigo-500 bg-indigo-955/25" 
                                  : "bg-indigo-955/20"
                                : ""
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              
                              {/* Left side checklist check & Mode B Grade dropdown */}
                              <div className="flex items-center gap-2 mt-0.5">
                                <input
                                  type="checkbox"
                                  checked={c.isCompleted}
                                  onChange={(e) => handleCompletionToggle(sem.id, c.code, e.target.checked)}
                                  className="h-4.5 w-4.5 accent-indigo-500 cursor-pointer"
                                />
                                
                                {mode === 'gpa' && isCreditCourse && (
                                  <select
                                    value={c.grade}
                                    onChange={(e) => handleGradeChange(sem.id, c.code, e.target.value)}
                                    className="bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-200 rounded px-1.5 py-0.5 focus:border-indigo-500 outline-none cursor-pointer"
                                  >
                                    <option value="">Grade</option>
                                    {Object.keys(GRADING_SCALE).map(g => (
                                      <option key={g} value={g}>{g} ({GRADING_SCALE[g].toFixed(1)})</option>
                                    ))}
                                  </select>
                                )}

                                {mode === 'gpa' && !isCreditCourse && c.isCompleted && (
                                  <span className="text-[10px] font-bold text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                    Passed
                                  </span>
                                )}
                              </div>

                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-extrabold text-sm text-zinc-200 tracking-tight">{c.code}</span>
                                  <span className="text-zinc-400 font-medium">{courseDetails?.title ?? "Custom Elective Course"}</span>
                                  <span className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded font-mono">
                                    {(courseDetails?.credits ?? 3)} Cr
                                  </span>
                                  {renderMandatoryBadge(c.code)}

                                  {/* Retake & Repeat badges */}
                                  {attempt?.badge && (
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                      attempt.isError 
                                        ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' 
                                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                    }`}>
                                      {attempt.badge}
                                    </span>
                                  )}
                                </div>

                                {/* Warning outputs */}
                                <div className="space-y-1 mt-1">
                                  {warnings && warnings.type === 'hard' && (
                                    <div className="flex items-center gap-1.5 text-rose-450 font-bold text-[10px]">
                                      <AlertTriangle className="h-3 w-3 shrink-0 text-rose-455" />
                                      <span>Prerequisite warning: Requires {warnings.missing.join(", ")} prior to this semester</span>
                                    </div>
                                  )}
                                  {warnings && warnings.type === 'soft' && (
                                    <div className="flex items-center gap-1.5 text-amber-450 font-semibold text-[10px]">
                                      <Info className="h-3 w-3 shrink-0 text-amber-455" />
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
                            <div className="flex items-center gap-3 self-end md:self-auto">
                              
                              {/* Move course dropdown/selection */}
                              <div className="relative">
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleMoveCourse(sem.id, e.target.value, c);
                                      e.target.value = ""; // Reset
                                    }
                                  }}
                                  className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] text-zinc-400 rounded-lg px-2 py-1 cursor-pointer transition focus:outline-none"
                                >
                                  <option value="">Move To...</option>
                                  {semesters.filter(s => s.id !== sem.id).map(s => {
                                    const destIdx = semesters.findIndex(semItem => semItem.id === s.id);
                                    const { hp } = getCoursePrereqs(c.code, onboardingData.pathway);
                                    const missingHp = hp.filter(code => !isCourseCompletedPrior(code, destIdx, semesters, mode));
                                    const isLocked = missingHp.length > 0;
                                    return (
                                      <option key={s.id} value={s.id} disabled={isLocked}>
                                        {s.name} {isLocked ? "🔒" : ""}
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
                                className="text-zinc-600 hover:text-indigo-400 p-1.5 rounded transition"
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                              </button>

                              {/* Remove Course button */}
                              <button
                                onClick={() => handleRemoveCourse(sem.id, c.code)}
                                className="text-zinc-600 hover:text-rose-400 p-1.5 rounded transition"
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
          <div className="bg-[#0f0f13] border border-zinc-850 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Combobox Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">
                  {swappingCourseCode ? `Swap Course: ${swappingCourseCode}` : "Add Course to Semester"}
                </h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {swappingCourseCode 
                    ? "Select a new course to swap into this slot" 
                    : "Select a course to add to your semester timeline plan"}
                </p>
              </div>
              <button 
                onClick={() => {
                  setActiveCourseSelectorSemesterId(null);
                  setSwappingCourseCode(null);
                  setCourseSearchQuery("");
                }} 
                className="text-zinc-400 hover:text-white p-1 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Combobox Filter tabs and Search */}
            <div className="p-4 bg-zinc-900/30 border-b border-zinc-800 space-y-3">
              <input
                type="text"
                placeholder="Search by code (e.g. CSE220) or name..."
                value={courseSearchQuery}
                onChange={(e) => setCourseSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-white outline-none focus:border-indigo-500 transition"
              />

              <div className="flex flex-wrap gap-1.5">
                {["All", "Core", "Electives", "Math/Science", "GenEd"].map(filterTab => (
                  <button
                    key={filterTab}
                    onClick={() => setCourseSearchFilter(filterTab)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition ${
                      courseSearchFilter === filterTab
                        ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                        : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {filterTab}
                  </button>
                ))}
              </div>
            </div>

            {/* Search list results */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-850 p-2 space-y-1">
              {filteredSearchCourses.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  No matching courses found.
                </div>
              ) : (
                filteredSearchCourses.map(course => {
                  const targetSemIdx = semesters.findIndex(s => s.id === activeCourseSelectorSemesterId);
                  const { hp } = getCoursePrereqs(course.code, onboardingData.pathway);
                  const missingHp = hp.filter(code => !isCourseCompletedPrior(code, targetSemIdx, semesters, mode));
                  const isLocked = missingHp.length > 0;

                  return (
                    <button
                      key={course.code}
                      disabled={isLocked}
                      onClick={() => {
                        if (activeCourseSelectorSemesterId) {
                          handleAddCourseToSemester(activeCourseSelectorSemesterId, course.code);
                        }
                      }}
                      className={`w-full p-3 text-left hover:bg-zinc-900/60 rounded-xl transition flex items-center justify-between text-xs group ${
                        isLocked ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-white text-sm tracking-tight group-hover:text-indigo-400 transition">{course.code}</span>
                          <span className="text-[9px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded font-mono text-zinc-400">
                            {course.credits} Credits
                          </span>
                          {renderMandatoryBadge(course.code)}
                        </div>
                        <p className="text-zinc-500 text-[10px] mt-0.5">{course.title}</p>
                        {isLocked && (
                          <div className="flex items-center gap-1 mt-1 text-[9px] text-rose-400 font-semibold">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Cannot Add: Missing Hard Prerequisite ({missingHp.join(", ")})</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[9px] text-zinc-600 font-semibold uppercase tracking-wider">
                          {course.category}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* 5. Reset Confirmation Modal overlay */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f13] border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="font-bold text-sm text-white">Reset Course Planner</h3>
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed">
              This action will completely wipe out your course schedule, grades, and Capstone thesis records. This is irreversible.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResetData}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-lg transition"
              >
                Wipe Data & Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Onboarding Modal */}
      {showWelcomeModal && isMounted && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950/90 border border-zinc-800 p-8 rounded-3xl max-w-lg w-full text-center space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-xl transition">
            <div className="absolute -top-12 -right-12 h-32 w-32 bg-purple-500/10 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -bottom-12 -left-12 h-32 w-32 bg-cyan-500/10 rounded-full blur-2xl animate-pulse" />
            
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-2">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Welcome to Flow136 
              </h2>
              <p className="text-xs text-zinc-400 font-medium italic">
                "Your curriculum, minus the complexity."
              </p>
            </div>

            <div className="space-y-3 text-left">
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-bold text-xs text-white">100% Client-Side & Offline Ready</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">All data stays safely in your local browser cache.</p>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-bold text-xs text-white">39-Credit GenEd & Prerequisite Engine</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Auto-tracks mandatory core and stream limits.</p>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-bold text-xs text-white">Dual Modes</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Seamlessly switch between simple Course Tracking and live CGPA Planning.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                localStorage.setItem("bracu_cse_tracker_welcome_shown", "true");
                setShowWelcomeModal(false);
              }}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-2xl shadow-[0_0_20px_rgba(139,92,246,0.25)] hover:shadow-[0_0_25px_rgba(139,92,246,0.4)] transition-all duration-300 transform active:scale-[0.98] uppercase tracking-wider"
            >
              Start Mapping My Degree
            </button>
          </div>
        </div>
      )}

      {/* Proper Stationary Footer Section */}
      <footer className="mt-auto pt-8 pb-6 border-t border-zinc-900 bg-zinc-950/20 flex flex-col items-center justify-center gap-4 text-center">
        {/* Connect with me social links */}
        <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Connect with me:</span>
          <a
            href="https://github.com/fakekhanabdullah"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-indigo-400 transition"
          >
            <svg className="h-3.5 w-3.5 fill-current text-zinc-400 hover:text-indigo-400" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
            <span>GitHub</span>
          </a>
          <span className="text-zinc-800">|</span>
          <a
            href="https://www.linkedin.com/in/khan-abdullahh"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-indigo-400 transition"
          >
            <svg className="h-3.5 w-3.5 fill-current text-zinc-400 hover:text-indigo-400" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            <span>LinkedIn</span>
          </a>
        </div>

        {/* Muted Copyright Disclaimer */}
        <div className="text-[10px] text-zinc-550 leading-relaxed font-medium">
          <p>© 2026 Flow136. Made by: Khan Abdullah</p>
        </div>
      </footer>

      {/* 5. Grade Sheet Preview Modal */}
      {showGradeSheetModal && isMounted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:static print:bg-transparent print:backdrop-none no-print-backdrop">
          <div className="bg-slate-950 border border-indigo-500/30 rounded-3xl max-w-4xl w-full p-6 text-white shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden backdrop-blur-xl transition print:max-h-none print:border-none print:shadow-none print:w-full print:p-0 print:bg-transparent print-only-container">
            
            {/* Modal Action Header Bar (3 Controls) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10 no-print">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">Academic Progress Snapshot Preview</h3>
              </div>
              <div className="flex items-center gap-3">
                {/* Control 1: Download PNG Button */}
                <button
                  onClick={handleGenerateGradeSheet}
                  disabled={isGeneratingSnapshot}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>{isGeneratingSnapshot ? "Generating PNG..." : "Download PNG"}</span>
                </button>

                {/* Control 2: Close Button */}
                <button
                  onClick={() => setShowGradeSheetModal(false)}
                  className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
                  title="Close preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Grade Sheet Container */}
            <div className="overflow-y-auto overflow-x-auto max-w-full custom-scrollbar pt-4 pr-1 pb-4 space-y-6">
              {/* Visible Grade Sheet Node Target */}
              <div 
                id="flow136-grade-sheet-export-node"
                style={{ 
                  backgroundColor: '#030712',
                  fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}
                className="w-[750px] min-w-[750px] h-auto min-h-[600px] border-2 border-indigo-500/40 rounded-2xl p-6 shadow-2xl text-white relative overflow-visible font-sans mx-auto"
              >
                {/* Watermark Background (Z-Index 0) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
                  <span className="text-[120px] font-black tracking-tighter text-white/[0.03] transform -rotate-12 whitespace-nowrap">
                    FLOW 136
                  </span>
                </div>

                {/* Section 1: Header (Z-Index 10) */}
                <div className="flex items-center justify-between pb-6 border-b border-white/10 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl border border-indigo-400/30 bg-indigo-500/10 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.25)]">
                      <GraduationCap className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-extrabold tracking-tight text-white">Flow136</h1>
                      <span className="text-[10px] font-semibold tracking-widest text-indigo-400 uppercase block">
                        OFFICIAL CURRICULUM PROGRESS & GRADE SHEET
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-indigo-300 block">
                      {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Planner
                    </span>
                    <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                      Target Goal: 136 Credits
                    </p>
                  </div>
                </div>

                {/* Section 2: Executive Status Bars & Standing (Z-Index 10) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 relative z-10">
                  {/* Master Credits Box */}
                  <div className="bg-slate-900/60 border border-indigo-500/20 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400 font-medium uppercase tracking-wider text-[10px]">Total Degree Progress</span>
                      <span className="text-white font-extrabold">{cumulativeStats.completedCredits} / 136 Cr Completed</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-955 border border-white/10 rounded-full overflow-hidden p-0.5">
                      <div 
                        style={{ width: `${Math.min(100, (cumulativeStats.completedCredits / 136) * 100)}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                      />
                    </div>
                    {/* Mini Categories & Timeline Stats */}
                    <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] text-zinc-400">
                      <div>Program Core: <span className="text-zinc-200 font-semibold">{curriculumProgress.coreCompleted}/{curriculumProgress.coreTotal} Cr</span></div>
                      <div>School Core: <span className="text-zinc-200 font-semibold">{curriculumProgress.schoolCoreCompleted}/{curriculumProgress.schoolCoreTotal} Cr</span></div>
                      <div>GenEd Streams: <span className="text-zinc-200 font-semibold">{curriculumProgress.stream1Completed + curriculumProgress.stream2Completed + curriculumProgress.stream3Completed + curriculumProgress.stream4Completed + curriculumProgress.stream5Completed}/39 Cr</span></div>
                      <div>Major Electives: <span className="text-zinc-200 font-semibold">{curriculumProgress.electiveCompleted}/6 Cr</span></div>
                      <div className="col-span-2">Capstone Thesis: <span className="text-zinc-200 font-semibold">{curriculumProgress.thesisCompleted}/{curriculumProgress.thesisTotal} Cr</span></div>
                      <div className="col-span-2 pt-2 border-t border-white/5 flex justify-between text-[10px] text-zinc-400">
                        <span>Semesters Planned: <strong className="text-indigo-300">{semesters.length}</strong></span>
                        <span>Completed Courses: <strong className="text-emerald-400">{semesters.reduce((acc, sem) => acc + sem.courses.filter(c => mode === 'tracker' ? c.isCompleted : (c.isCompleted && c.grade !== "" && c.grade !== "F")).length, 0) + (isCSE400Passed ? 1 : 0)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Academic Standing & CGPA Display (ONLY in Mode B) */}
                  {mode === 'gpa' && (
                    <div className="bg-slate-900/60 border border-indigo-500/20 p-4 rounded-xl flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Cumulative CGPA</span>
                        {cumulativeStats.cgpa >= 2.0 ? (
                          <span className="inline-flex items-center justify-center whitespace-nowrap text-[9px] font-extrabold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Good Standing
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center whitespace-nowrap text-[9px] font-extrabold bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Probation Range
                          </span>
                        )}
                      </div>
                      <div className="text-3xl font-extrabold text-white mt-1">
                        {cumulativeStats.cgpa.toFixed(2)} <span className="text-xs text-zinc-500 font-normal">/ 4.00 Scale</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-relaxed">
                        Evaluated across chronologically latest attempts.
                      </p>
                    </div>
                  )}
                </div>

                {/* Section 3: Completed Courses Table / Grade Sheet (Z-Index 10) */}
                <div className="relative z-10 space-y-3">
                  <h2 className="text-xs font-bold tracking-wider text-slate-300 uppercase">COMPLETED COURSEWORK</h2>
                  
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
                        <div className="p-6 text-center text-slate-500 text-xs italic border border-white/10 rounded-xl bg-slate-900/40">
                          No completed courses recorded yet.
                        </div>
                      );
                    }

                    return (
                      <div className="w-full border border-white/10 rounded-xl overflow-hidden bg-slate-900/40">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                              <th className="py-2.5 px-3">Course Code</th>
                              <th className="py-2.5 px-3">Title</th>
                              <th className="py-2.5 px-3 text-center">Credits</th>
                              {mode === 'gpa' && <th className="py-2.5 px-3 text-right">Grade</th>}
                              <th className="py-2.5 px-3 text-right">Semester</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {exportCompletedCourses.map((item, idx) => (
                              <tr key={`${item.code}_${idx}`} className="hover:bg-white/[0.02]">
                                <td className="py-2 px-3 font-bold text-indigo-300">{item.code}</td>
                                <td className="py-2 px-3 text-slate-300 font-medium">{item.title}</td>
                                <td className="py-2 px-3 text-slate-400 text-center font-semibold">{item.credits} Cr</td>
                                {mode === 'gpa' && (
                                  <td className="py-2 px-3 font-bold text-emerald-400 text-right">{item.grade}</td>
                                )}
                                <td className="py-2 px-3 text-zinc-500 text-right text-[11px]">{item.semesterName}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>

                {/* Section 4: Footer Watermark (Z-Index 10) */}
                <div className="border-t border-white/10 mt-4 pt-3 relative z-10 text-center">
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Flow136 &bull; Your curriculum, minus the complexity.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="pt-4 border-t border-white/10 flex justify-end gap-3 no-print">
              <button
                onClick={() => setShowGradeSheetModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
