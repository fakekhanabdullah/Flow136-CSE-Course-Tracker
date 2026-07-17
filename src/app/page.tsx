"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  HelpCircle
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
}

interface OnboardingData {
  pathway: 'foundation' | 'credit' | null;
  foundationOption: 'opt1' | 'opt2' | 'opt3' | null; // opt1 = Only ENG091, opt2 = ENG091+MAT091, opt3 = ENG091+MAT092
  creditOption: 'opt1' | 'opt2' | null; // opt1 = Started with ENG101, opt2 = Started with ENG102
  rsTerm: '3rd Semester' | '4th Semester' | '5th Semester';
  engStatusPriorToRS: 'caseA' | 'caseB' | 'caseC' | 'caseD' | null;
}

const GRADING_SCALE: Record<string, number> = {
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

  // App settings/modes
  const [mode, setMode] = useState<'tracker' | 'gpa'>('tracker');
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  
  // Onboarding Wizard state
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    pathway: null,
    foundationOption: null,
    creditOption: null,
    rsTerm: "3rd Semester",
    engStatusPriorToRS: null
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
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [courseSearchFilter, setCourseSearchFilter] = useState("All");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [backupFileError, setBackupFileError] = useState<string | null>(null);

  // Hydration fix & LocalStorage Loader
  useEffect(() => {
    setIsMounted(true);
    try {
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
    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
    }
  }, []);

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
      if (onboardingData.foundationOption === 'opt1') {
        initialSemesters[0].courses.push({ code: "ENG091", grade: "A", isCompleted: true });
        addedCourses.add("ENG091");
      } else if (onboardingData.foundationOption === 'opt2') {
        initialSemesters[0].courses.push({ code: "ENG091", grade: "A", isCompleted: true });
        initialSemesters[0].courses.push({ code: "MAT091", grade: "A", isCompleted: true });
        addedCourses.add("ENG091");
        addedCourses.add("MAT091");
        // Option 2: Auto-add MAT092 in Semester 2 (index 1)
        initialSemesters[1].courses.push({ code: "MAT092", grade: "A", isCompleted: true });
        addedCourses.add("MAT092");
      } else if (onboardingData.foundationOption === 'opt3') {
        initialSemesters[0].courses.push({ code: "ENG091", grade: "A", isCompleted: true });
        initialSemesters[0].courses.push({ code: "MAT092", grade: "A", isCompleted: true });
        addedCourses.add("ENG091");
        addedCourses.add("MAT092");
      }
    } else if (onboardingData.pathway === 'credit') {
      if (onboardingData.creditOption === 'opt1') {
        initialSemesters[0].courses.push({ code: "ENG101", grade: "A", isCompleted: true });
        addedCourses.add("ENG101");
      } else if (onboardingData.creditOption === 'opt2') {
        initialSemesters[0].courses.push({ code: "ENG102", grade: "A", isCompleted: true });
        addedCourses.add("ENG102");
      }
    }

    // Pre-populate preceding English courses if they passed them
    if (onboardingData.engStatusPriorToRS === 'caseA') {
      if (!addedCourses.has("ENG101")) {
        const targetSemIdx = onboardingData.pathway === 'foundation' ? 1 : 0;
        initialSemesters[targetSemIdx].courses.push({ code: "ENG101", grade: "A", isCompleted: true });
        addedCourses.add("ENG101");
      }
    } else if (onboardingData.engStatusPriorToRS === 'caseB') {
      if (!addedCourses.has("ENG101")) {
        initialSemesters[0].courses.push({ code: "ENG101", grade: "A", isCompleted: true });
        addedCourses.add("ENG101");
      }
      if (!addedCourses.has("ENG102")) {
        const targetSemIdx = onboardingData.pathway === 'foundation' ? 1 : 1;
        initialSemesters[targetSemIdx].courses.push({ code: "ENG102", grade: "A", isCompleted: true });
        addedCourses.add("ENG102");
      }
    } else if (onboardingData.engStatusPriorToRS === 'caseC') {
      if (!addedCourses.has("ENG101")) {
        initialSemesters[0].courses.push({ code: "ENG101", grade: "F", isCompleted: false });
        addedCourses.add("ENG101");
      }
    } else if (onboardingData.engStatusPriorToRS === 'caseD') {
      if (!addedCourses.has("ENG102")) {
        initialSemesters[0].courses.push({ code: "ENG102", grade: "A", isCompleted: true });
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

    // Part 2: English / BU201 Conditional Rule
    if (onboardingData.engStatusPriorToRS === 'caseA') {
      initialSemesters[rsIndex].courses.push({ code: "ENG102", grade: "", isCompleted: false });
      addedCourses.add("ENG102");
    } else {
      initialSemesters[rsIndex].courses.push({ code: "BU201", grade: "", isCompleted: false });
      addedCourses.add("BU201");
    }

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
    setOnboardingData({
      pathway: null,
      foundationOption: null,
      creditOption: null,
      rsTerm: "3rd Semester",
      engStatusPriorToRS: null
    });
    setSemesters([]);
    setThesisTrack('thesis');
    setThesisSteps({ step1: false, step2: false, step3: false });
    setProjectCompleted(false);
    setInternshipCompleted(false);
    setIsOnboarded(false);
    setWizardStep(1);
    setShowResetConfirm(false);
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
    downloadAnchor.setAttribute("download", "BRACU_CSE_Course_Tracker_Backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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

  // Capstone completion logic based on selected Track
  const isCSE400Passed = useMemo(() => {
    if (thesisTrack === 'thesis') {
      return thesisSteps.step3; // Step 3 checks Step 1 & 2 too in master rules
    } else if (thesisTrack === 'project') {
      return projectCompleted;
    } else {
      return internshipCompleted;
    }
  }, [thesisTrack, thesisSteps, projectCompleted, internshipCompleted]);

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

  // Semester GPA calculations (all courses taken in that semester count)
  const semesterStats = useMemo(() => {
    return semesters.map(sem => {
      let totalLoad = 0;
      let gradableCredits = 0;
      let totalPoints = 0;
      let hasGrades = false;

      sem.courses.forEach(c => {
        const courseData = COURSES.find(co => co.code === c.code);
        const credits = c.code === "CSE400" ? 4 : (courseData?.credits ?? 3);
        
        // Non-credit courses carry 0 credits
        if (courseData?.category === "Non-Credit") return;

        totalLoad += credits;

        if (mode === 'gpa' && c.isCompleted && c.grade && GRADING_SCALE[c.grade] !== undefined) {
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
        if (courseData?.category === "Non-Credit") return;

        let isComp = mode === 'tracker' 
          ? c.isCompleted 
          : (c.grade !== "" && c.grade !== "F");
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

      if (mode === 'gpa' && course.isCompleted && course.grade && GRADING_SCALE[course.grade] !== undefined) {
        totalCgpaCredits += credits;
        totalCgpaPoints += GRADING_SCALE[course.grade] * credits;
      }
    });

    return {
      completedCredits: totalCompletedCredits,
      cgpa: totalCgpaCredits > 0 ? (totalCgpaPoints / totalCgpaCredits) : 0.00
    };
  }, [semesters, newestCourseAttempts, mode, isCSE400Passed]);

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
    // 1. Mandatory Core: 115 Credits required
    // 2. Major Electives: 9 Credits required
    // 3. GenEd Streams (Electives only): Stream 3 (3cr), Stream 4 (3cr), Stream 5 (3cr)
    // 4. GenEd Free Electives: 9 Credits
    let coreCompleted = 0;
    let electiveCompleted = 0;
    
    // GenEd streams audit
    let hasStream3Elective = false;
    let hasStream4Elective = false;
    let hasStream5Elective = false;
    
    // Track free GenEd electives taken (up to 3 courses, 9 credits)
    let freeGenEdCredits = 0;
    
    // Set of course codes completed
    const completedCodes = new Set<string>();

    semesters.forEach(sem => {
      sem.courses.forEach(c => {
        let isComp = mode === 'tracker'
          ? c.isCompleted
          : (c.grade !== "" && c.grade !== "F");
        if (c.code === "CSE400") {
          isComp = isCSE400Passed;
        }
        if (isComp) {
          completedCodes.add(c.code);
        }
      });
    });

    // Check mandatory cores
    COURSES.forEach(c => {
      if (c.mandatory) {
        let isComp = completedCodes.has(c.code);
        if (c.code === "CSE400") {
          isComp = isCSE400Passed;
        }
        if (isComp) {
          coreCompleted += (c.code === "CSE400" ? 4 : c.credits);
        }
      }
    });

    // Check CSE major electives
    COURSES.forEach(c => {
      if (c.category === "CSE Major Elective" && completedCodes.has(c.code)) {
        electiveCompleted += c.credits;
      }
    });

    // Audit Stream electives (excluding core BNG103, HUM103, EMB101)
    const activeStream3Electives: string[] = [];
    const activeStream4Electives: string[] = [];
    const activeStream5Electives: string[] = [];
    const activeStream2Electives: string[] = []; // for free electives fallback

    completedCodes.forEach(code => {
      const c = COURSES.find(co => co.code === code);
      if (!c || c.mandatory) return; // ignore cores/mandatory

      if (c.category === "GenEd Stream 3") {
        activeStream3Electives.push(code);
      } else if (c.category === "GenEd Stream 4") {
        activeStream4Electives.push(code);
      } else if (c.category === "GenEd Stream 5") {
        activeStream5Electives.push(code);
      } else if (c.category === "GenEd Stream 2" || c.category === "GenEd Stream 1") {
        activeStream2Electives.push(code);
      }
    });

    // 1 elective required for Stream 3
    if (activeStream3Electives.length > 0) {
      hasStream3Elective = true;
      activeStream3Electives.shift(); // consume 1 elective
    }

    // 1 elective required for Stream 4
    if (activeStream4Electives.length > 0) {
      hasStream4Elective = true;
      activeStream4Electives.shift(); // consume 1 elective
    }

    // 1 elective required for Stream 5
    if (activeStream5Electives.length > 0) {
      hasStream5Elective = true;
      activeStream5Electives.shift(); // consume 1 elective
    }

    // Remaining unused GenEd electives can fall back into the 3 Free Electives (9 credits)
    const unusedGenEd = [
      ...activeStream2Electives,
      ...activeStream3Electives,
      ...activeStream4Electives,
      ...activeStream5Electives
    ];

    freeGenEdCredits = Math.min(9, unusedGenEd.length * 3);

    return {
      coreCompleted,
      coreTotal: 115,
      electiveCompleted,
      electiveTotal: 9,
      stream3Progress: hasStream3Elective ? 3 : 0,
      stream4Progress: hasStream4Elective ? 3 : 0,
      stream5Progress: hasStream5Elective ? 3 : 0,
      freeGenEdCredits,
      freeGenEdTotal: 9
    };
  }, [newestCourseAttempts, isCSE400Passed, mode]);

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
        // Prevent duplicate in the SAME semester
        if (sem.courses.some(c => c.code === courseCode)) return sem;
        return {
          ...sem,
          courses: [...sem.courses, { code: courseCode, grade: "", isCompleted: false }]
        };
      }
      return sem;
    });
    updateSemesters(updated);
    setActiveCourseSelectorSemesterId(null);
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
                isCompleted: grade !== "" && grade !== "F"
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
        if (courseSearchFilter === "Math/Science") return c.category === "Math & Science Core";
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

    return list.slice(0, 30); // cap size for clean rendering
  }, [courseSearchQuery, courseSearchFilter]);

  if (!isMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08080a] text-zinc-100 font-sans">
        <div className="flex flex-col items-center gap-4 text-center">
          <GraduationCap className="h-16 w-16 text-indigo-500 animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight">Loading BRACU Course Tracker...</h1>
          <p className="text-zinc-500 text-sm">Organizing your degree curriculum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-100 font-sans antialiased flex flex-col">
      {/* 1. Header Navigation */}
      <header className="border-b border-zinc-800 bg-[#0f0f13]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              BRACU CSE Course Tracker
            </h1>
            <p className="text-xs text-indigo-400 font-medium">Static Planner & Advisor</p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => mode !== 'tracker' && handleModeToggle()}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'tracker' 
                  ? 'bg-zinc-800 text-indigo-400 shadow-md border border-zinc-700' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Course Tracker Only
            </button>
            <button
              onClick={() => mode !== 'gpa' && handleModeToggle()}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'gpa' 
                  ? 'bg-zinc-800 text-indigo-400 shadow-md border border-zinc-700' 
                  : 'text-zinc-400 hover:text-zinc-200'
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
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs px-3 py-2 rounded-xl transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Backup</span>
            </button>
            
            <label className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs px-3 py-2 rounded-xl cursor-pointer transition">
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
              onClick={() => setShowResetConfirm(true)}
              title="Reset tracker to onboarding defaults"
              className="bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-400 p-2 rounded-xl transition"
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
        <div className="flex-1 flex items-center justify-center p-6 bg-[#08080a]">
          <div className="w-full max-w-xl bg-[#0f0f13] border border-zinc-800 rounded-2xl shadow-2xl p-8 transition-all">
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
                      className={`p-4 rounded-xl border text-left transition flex flex-col justify-between h-28 ${
                        onboardingData.pathway === 'foundation'
                          ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 font-semibold'
                          : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:border-zinc-800'
                      }`}
                    >
                      <BookOpen className="h-5 w-5" />
                      <div>
                        <p className="text-xs text-white font-bold">Pathway A</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Non-Credit Foundation</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setOnboardingData({
                        ...onboardingData,
                        pathway: 'credit',
                        creditOption: onboardingData.creditOption || 'opt1',
                        foundationOption: null
                      })}
                      className={`p-4 rounded-xl border text-left transition flex flex-col justify-between h-28 ${
                        onboardingData.pathway === 'credit'
                          ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 font-semibold'
                          : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:border-zinc-800'
                      }`}
                    >
                      <Award className="h-5 w-5" />
                      <div>
                        <p className="text-xs text-white font-bold">Pathway B</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Direct Credit Courses</p>
                      </div>
                    </button>
                  </div>

                  {/* Sub-options for Pathway A */}
                  {onboardingData.pathway === 'foundation' && (
                    <div className="space-y-2 pt-2">
                      <label className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">Select Foundation combination:</label>
                      
                      <button
                        onClick={() => setOnboardingData({ ...onboardingData, foundationOption: 'opt1' })}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                          onboardingData.foundationOption === 'opt1'
                            ? 'bg-zinc-850 border-zinc-700 text-white font-semibold'
                            : 'bg-zinc-900 border-zinc-850 text-zinc-500 hover:border-zinc-800'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-white">Option 1: Only English Foundation</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Auto-assigns ENG091 to Semester 1</p>
                        </div>
                        {onboardingData.foundationOption === 'opt1' && <Check className="h-4 w-4 text-indigo-400" />}
                      </button>

                      <button
                        onClick={() => setOnboardingData({ ...onboardingData, foundationOption: 'opt2' })}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                          onboardingData.foundationOption === 'opt2'
                            ? 'bg-zinc-850 border-zinc-700 text-white font-semibold'
                            : 'bg-zinc-900 border-zinc-850 text-zinc-500 hover:border-zinc-800'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-white">Option 2: English & Math I</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">ENG091 + MAT091 (MAT092 added to Semester 2)</p>
                        </div>
                        {onboardingData.foundationOption === 'opt2' && <Check className="h-4 w-4 text-indigo-400" />}
                      </button>

                      <button
                        onClick={() => setOnboardingData({ ...onboardingData, foundationOption: 'opt3' })}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                          onboardingData.foundationOption === 'opt3'
                            ? 'bg-zinc-850 border-zinc-700 text-white font-semibold'
                            : 'bg-zinc-900 border-zinc-850 text-zinc-500 hover:border-zinc-800'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-white">Option 3: English & Math II</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Auto-assigns ENG091 + MAT092 to Semester 1</p>
                        </div>
                        {onboardingData.foundationOption === 'opt3' && <Check className="h-4 w-4 text-indigo-400" />}
                      </button>
                    </div>
                  )}

                  {/* Sub-options for Pathway B */}
                  {onboardingData.pathway === 'credit' && (
                    <div className="space-y-2 pt-2">
                      <label className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">Select Starting English course:</label>
                      
                      <button
                        onClick={() => setOnboardingData({ ...onboardingData, creditOption: 'opt1' })}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                          onboardingData.creditOption === 'opt1'
                            ? 'bg-zinc-850 border-zinc-700 text-white font-semibold'
                            : 'bg-zinc-900 border-zinc-850 text-zinc-500 hover:border-zinc-800'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-white">Option 1: Started with ENG101</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Assigns ENG101 (English Fundamentals) to Semester 1</p>
                        </div>
                        {onboardingData.creditOption === 'opt1' && <Check className="h-4 w-4 text-indigo-400" />}
                      </button>

                      <button
                        onClick={() => setOnboardingData({ ...onboardingData, creditOption: 'opt2' })}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                          onboardingData.creditOption === 'opt2'
                            ? 'bg-zinc-850 border-zinc-700 text-white font-semibold'
                            : 'bg-zinc-900 border-zinc-850 text-zinc-500 hover:border-zinc-800'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-white">Option 2: Started with ENG102</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Assigns ENG102 (Composition I) to Semester 1</p>
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
                          className={`p-3 rounded-xl border text-xs font-semibold text-center transition ${
                            onboardingData.rsTerm === term
                              ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 font-bold'
                              : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:border-zinc-800'
                          }`}
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Select English Prior Status */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">English course status PRIOR to attending RS</label>
                    <div className="space-y-2">
                      
                      <button
                        onClick={() => setOnboardingData({ ...onboardingData, engStatusPriorToRS: 'caseA' })}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                          onboardingData.engStatusPriorToRS === 'caseA'
                            ? 'bg-zinc-850 border-zinc-700 text-white font-semibold'
                            : 'bg-zinc-900 border-zinc-850 text-zinc-550 hover:border-zinc-800'
                        }`}
                      >
                        <div>
                          <p className="text-zinc-200 font-semibold text-xs">Passed ENG101, but NOT ENG102 before RS</p>
                          <p className="text-[9px] text-indigo-400 mt-0.5">RS card will auto-assign: EMB101 + ENG102</p>
                        </div>
                        {onboardingData.engStatusPriorToRS === 'caseA' && <Check className="h-4 w-4 text-indigo-400" />}
                      </button>

                      <button
                        onClick={() => setOnboardingData({ ...onboardingData, engStatusPriorToRS: 'caseB' })}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                          onboardingData.engStatusPriorToRS === 'caseB'
                            ? 'bg-zinc-850 border-zinc-700 text-white font-semibold'
                            : 'bg-zinc-900 border-zinc-850 text-zinc-550 hover:border-zinc-800'
                        }`}
                      >
                        <div>
                          <p className="text-zinc-200 font-semibold text-xs">Passed BOTH ENG101 and ENG102 before RS</p>
                          <p className="text-[9px] text-emerald-400 mt-0.5">RS card will auto-assign: EMB101 + BU201</p>
                        </div>
                        {onboardingData.engStatusPriorToRS === 'caseB' && <Check className="h-4 w-4 text-indigo-400" />}
                      </button>

                      <button
                        onClick={() => setOnboardingData({ ...onboardingData, engStatusPriorToRS: 'caseC' })}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                          onboardingData.engStatusPriorToRS === 'caseC'
                            ? 'bg-zinc-850 border-zinc-700 text-white font-semibold'
                            : 'bg-zinc-900 border-zinc-850 text-zinc-550 hover:border-zinc-800'
                        }`}
                      >
                        <div>
                          <p className="text-zinc-200 font-semibold text-xs">Failed or Incomplete ENG101 before RS</p>
                          <p className="text-[9px] text-emerald-400 mt-0.5">RS card will auto-assign: EMB101 + BU201</p>
                        </div>
                        {onboardingData.engStatusPriorToRS === 'caseC' && <Check className="h-4 w-4 text-indigo-400" />}
                      </button>

                      <button
                        onClick={() => setOnboardingData({ ...onboardingData, engStatusPriorToRS: 'caseD' })}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                          onboardingData.engStatusPriorToRS === 'caseD'
                            ? 'bg-zinc-850 border-zinc-700 text-white font-semibold'
                            : 'bg-zinc-900 border-zinc-850 text-zinc-550 hover:border-zinc-800'
                        }`}
                      >
                        <div>
                          <p className="text-zinc-200 font-semibold text-xs">Started with ENG102 & completed before RS</p>
                          <p className="text-[9px] text-emerald-400 mt-0.5">RS card will auto-assign: EMB101 + BU201</p>
                        </div>
                        {onboardingData.engStatusPriorToRS === 'caseD' && <Check className="h-4 w-4 text-indigo-400" />}
                      </button>

                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold rounded-xl transition"
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

                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-4 text-xs">
                  <div className="flex justify-between border-b border-zinc-800 pb-2.5">
                    <span className="text-zinc-500">Starting Pathway:</span>
                    <span className="text-white font-semibold capitalize">
                      {onboardingData.pathway === 'foundation' ? "Non-Credit Foundation" : "Direct Credit Course"}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-zinc-800 pb-2.5">
                    <span className="text-zinc-500">1st Semester Course:</span>
                    <span className="text-indigo-400 font-semibold">
                      {onboardingData.pathway === 'foundation' 
                        ? (onboardingData.foundationOption === 'opt1' ? "ENG091" 
                          : onboardingData.foundationOption === 'opt2' ? "ENG091 + MAT091 (MAT092 in Sem 2)" 
                          : "ENG091 + MAT092")
                        : (onboardingData.creditOption === 'opt1' ? "ENG101" : "ENG102")
                      }
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-zinc-800 pb-2.5">
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
                    className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold rounded-xl transition"
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
      ) : (
        /* Actual App Dashboard */
        <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6">
          
          {/* A. LEFT SIDEBAR: Degree Progress & Statistics */}
          <aside className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
            
            {/* Degree Progress Stats */}
            <div className="bg-[#0f0f13] border border-zinc-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 rounded-full blur-2xl" />
              
              <h2 className="text-xs font-semibold text-indigo-400 tracking-wider uppercase flex items-center gap-2">
                <GraduationCap className="h-4.5 w-4.5" />
                Degree Standing
              </h2>
              
              <div className="mt-4 space-y-4">
                {/* Credit Progress */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400 font-medium">Completed Credits</span>
                    <span className="text-white font-bold">{cumulativeStats.completedCredits} / 136 Cr</span>
                  </div>
                  <div className="h-3 w-full bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden p-0.5">
                    <div 
                      style={{ width: `${Math.min(100, (cumulativeStats.completedCredits / 136) * 100)}%` }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>

                {/* CGPA display in Mode B */}
                {mode === 'gpa' && (
                  <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Cumulative CGPA</p>
                      <p className="text-2xl font-black text-white mt-0.5 tracking-tight">
                        {cumulativeStats.cgpa.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      {cumulativeStats.cgpa >= 2.0 ? (
                        <span className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full uppercase">
                          Good Standing
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-1 rounded-full uppercase">
                          Probation Range
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Curriculum Progress (Detailed breakdown bars) */}
            <div className="bg-[#0f0f13] border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-5">
              <h2 className="text-xs font-semibold text-indigo-400 tracking-wider uppercase flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5" />
                Category Requirements
              </h2>

              <div className="space-y-4">
                {/* 1. Mandatory Core */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-300 font-semibold">Program Core (Mandatory)</span>
                    <span className="text-zinc-500">{curriculumProgress.coreCompleted} / {curriculumProgress.coreTotal} Cr</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${(curriculumProgress.coreCompleted / curriculumProgress.coreTotal) * 100}%` }}
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    />
                  </div>
                </div>

                {/* 2. CSE Major Electives */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-300 font-semibold">CSE Major Electives</span>
                    <span className="text-zinc-500">{curriculumProgress.electiveCompleted} / {curriculumProgress.electiveTotal} Cr</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${(curriculumProgress.electiveCompleted / curriculumProgress.electiveTotal) * 100}%` }}
                      className="h-full bg-indigo-400 rounded-full transition-all duration-300"
                    />
                  </div>
                </div>

                {/* 3. GenEd Streams */}
                <div className="pt-2 border-t border-zinc-800/50 space-y-3">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">GenEd Streams Progress</p>
                  
                  {/* Stream 3: Arts */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-400">Stream 3 (Arts & Humanities)</span>
                      <span className="text-zinc-500">{(curriculumProgress.stream3Progress + 6)} / 9 Cr</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${((curriculumProgress.stream3Progress + 6) / 9) * 100}%` }}
                        className="h-full bg-indigo-500/70 rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Stream 4: Social */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-400">Stream 4 (Social Sciences)</span>
                      <span className="text-zinc-500">{(curriculumProgress.stream4Progress + 3)} / 6 Cr</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${((curriculumProgress.stream4Progress + 3) / 6) * 100}%` }}
                        className="h-full bg-indigo-500/70 rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Stream 5: CST */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-400">Stream 5 (Communities / CST)</span>
                      <span className="text-zinc-500">{curriculumProgress.stream5Progress} / 3 Cr</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${(curriculumProgress.stream5Progress / 3) * 100}%` }}
                        className="h-full bg-indigo-500/70 rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* Free GenEd Choice */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-400">GenEd Electives (Free Choice)</span>
                      <span className="text-zinc-500">{curriculumProgress.freeGenEdCredits} / {curriculumProgress.freeGenEdTotal} Cr</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${(curriculumProgress.freeGenEdCredits / curriculumProgress.freeGenEdTotal) * 100}%` }}
                        className="h-full bg-indigo-500/70 rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
          </aside>

          {/* B. RIGHT PANEL: Semester Timeline Card Schedule */}
          <main className="flex-1 space-y-6">
            
            {/* Semester timelines header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-400" />
                <h2 className="text-base font-bold tracking-tight text-white">Curriculum Plan Semester Cards</h2>
              </div>
              <button
                onClick={handleAddSemester}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md transition"
              >
                <Plus className="h-4 w-4" />
                <span>Add Semester</span>
              </button>
            </div>

            {/* List of Semester Cards */}
            <div className="space-y-6">
              {semesters.map((sem, semIdx) => {
                const stats = semesterStats.find(s => s.id === sem.id);
                const hasCSE400 = sem.courses.some(c => c.code === "CSE400");
                const isSemester9Plus = semIdx >= 8; // index 8 is the 9th semester card

                return (
                  <div 
                    key={sem.id}
                    className="bg-[#0f0f13] border border-zinc-850 rounded-2xl overflow-hidden shadow-lg transition-all"
                  >
                    
                    {/* Semester Card Header */}
                    <div className="bg-zinc-900/60 px-5 py-4 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        <h3 className="font-bold text-sm text-white tracking-tight">{sem.name}</h3>
                        {sem.isRS && (
                          <span className="text-[9px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-md tracking-wider uppercase">
                            RS Campus
                          </span>
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
                            onClick={() => handleDeleteSemester(sem.id)}
                            className="text-zinc-600 hover:text-rose-400 p-1.5 rounded-lg transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Course list grid in Semester Card */}
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
                        
                        // If it's CSE400 and we are in Semester 9+, render the specialized capstone thesis component instead
                        if (isCSE400Row && isSemester9Plus) {
                          return (
                            <div key={c.code} className="py-4 space-y-4">
                              <div className="flex items-center justify-between bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/80">
                                <div>
                                  <h4 className="font-extrabold text-sm text-indigo-400">Final Thesis & Capstone (CSE400)</h4>
                                  <p className="text-xs text-zinc-400 mt-0.5">4 Credits • Segmented Track Selection</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {mode === 'gpa' && (
                                    <select
                                      value={c.grade}
                                      onChange={(e) => handleGradeChange(sem.id, c.code, e.target.value)}
                                      className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 outline-none"
                                    >
                                      <option value="">Select Grade</option>
                                      {Object.keys(GRADING_SCALE).map(g => (
                                        <option key={g} value={g}>{g} ({GRADING_SCALE[g].toFixed(1)})</option>
                                      ))}
                                    </select>
                                  )}
                                  <button
                                    onClick={() => handleRemoveCourse(sem.id, c.code)}
                                    className="text-zinc-500 hover:text-rose-400 p-1.5 transition"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Specialized track view */}
                              <div className="bg-zinc-900/60 border border-zinc-800/60 p-4 rounded-xl space-y-4">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Select Thesis Track Path</label>
                                  <div className="grid grid-cols-3 gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                                    {(['thesis', 'project', 'internship'] as const).map(track => (
                                      <button
                                        key={track}
                                        onClick={() => {
                                          setThesisTrack(track);
                                          // Update overall state config
                                          saveStateToLocalStorage(mode, isOnboarded, semesters, track, thesisSteps, projectCompleted, internshipCompleted, onboardingData);
                                        }}
                                        className={`py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                                          thesisTrack === track 
                                            ? 'bg-zinc-800 text-indigo-400 border border-zinc-700' 
                                            : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                      >
                                        {track}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Step checklist */}
                                <div className="space-y-2 pt-2 border-t border-zinc-850">
                                  {thesisTrack === 'thesis' && (
                                    <div className="space-y-2.5">
                                      <p className="text-xs font-medium text-zinc-400">Research Stepper Checklist:</p>
                                      
                                      <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={thesisSteps.step1}
                                          onChange={(e) => {
                                            const updatedSteps = { ...thesisSteps, step1: e.target.checked };
                                            setThesisSteps(updatedSteps);
                                            saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, updatedSteps, projectCompleted, internshipCompleted, onboardingData);
                                          }}
                                          className="h-4 w-4 accent-indigo-500"
                                        />
                                        <span>Step 1: Proposal submitted & supervisor assigned</span>
                                      </label>

                                      <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={thesisSteps.step2}
                                          onChange={(e) => {
                                            const updatedSteps = { ...thesisSteps, step2: e.target.checked };
                                            setThesisSteps(updatedSteps);
                                            saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, updatedSteps, projectCompleted, internshipCompleted, onboardingData);
                                          }}
                                          className="h-4 w-4 accent-indigo-500"
                                        />
                                        <span>Step 2: Mid-term defense / progress report cleared</span>
                                      </label>

                                      <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={thesisSteps.step3}
                                          onChange={(e) => handleThesisStep3Toggle(e.target.checked)}
                                          className="h-4 w-4 accent-indigo-500"
                                        />
                                        <span className="font-semibold text-white">Step 3: Final thesis defended & approved</span>
                                      </label>
                                    </div>
                                  )}

                                  {thesisTrack === 'project' && (
                                    <div className="space-y-2">
                                      <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={projectCompleted}
                                          onChange={(e) => {
                                            setProjectCompleted(e.target.checked);
                                            handleCompletionToggle(sem.id, c.code, e.target.checked);
                                            saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, thesisSteps, e.target.checked, internshipCompleted, onboardingData);
                                          }}
                                          className="h-4.5 w-4.5 accent-indigo-500"
                                        />
                                        <div>
                                          <p className="font-semibold text-white">Final Project Built & Defended</p>
                                          <p className="text-[10px] text-zinc-500">Marks course completed and awards 4 degree credits</p>
                                        </div>
                                      </label>
                                    </div>
                                  )}

                                  {thesisTrack === 'internship' && (
                                    <div className="space-y-2">
                                      <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={internshipCompleted}
                                          onChange={(e) => {
                                            setInternshipCompleted(e.target.checked);
                                            handleCompletionToggle(sem.id, c.code, e.target.checked);
                                            saveStateToLocalStorage(mode, isOnboarded, semesters, thesisTrack, thesisSteps, projectCompleted, e.target.checked, onboardingData);
                                          }}
                                          className="h-4.5 w-4.5 accent-indigo-500"
                                        />
                                        <div>
                                          <p className="font-semibold text-white">Internship Completed & Report Submitted</p>
                                          <p className="text-[10px] text-zinc-500">Marks course completed and awards 4 degree credits</p>
                                        </div>
                                      </label>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const isCreditCourse = courseDetails?.category !== "Non-Credit" && (courseDetails?.credits ?? 3) > 0;

                        return (
                          <div 
                            key={c.code}
                            className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs group"
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
                                      <option key={g} value={g}>{g}</option>
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

                  </div>
                );
              })}
            </div>
            
          </main>

        </div>
      )}

      {/* 4. Search and Add Course Combobox Overlay */}
      {activeCourseSelectorSemesterId !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f13] border border-zinc-850 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Combobox Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Add Course to Semester</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Select a course to add to your semester timeline plan</p>
              </div>
              <button 
                onClick={() => {
                  setActiveCourseSelectorSemesterId(null);
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
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-sm tracking-tight group-hover:text-indigo-400 transition">{course.code}</span>
                          <span className="text-[9px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded font-mono text-zinc-400">
                            {course.credits} Credits
                          </span>
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

      {/* Footer disclaimer */}
      <footer className="mt-auto py-6 border-t border-zinc-900 bg-zinc-950/20 text-center text-[10px] text-zinc-600">
        <p>© {new Date().getFullYear()} BRACU CSE Course Tracker. Purely static, built client-side. Local data is stored in browser cache storage.</p>
      </footer>
    </div>
  );
}
