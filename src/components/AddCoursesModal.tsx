"use client";

import React, { useState, useMemo, useEffect } from "react";
import { X, Search, Check, Layers, AlertTriangle, ArrowRight, BookOpen, Plus, Repeat, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { COURSES, Course } from "@/app/courses-data";

interface SelectedCourse {
  code: string;
  grade: string;
  isCompleted: boolean;
  isRepeat?: boolean;
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

interface AddCoursesModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesters: Semester[];
  initialSelectedCodes?: string[];
  onCommitAddCourses: (
    assignments: {
      courseCode: string;
      targetSemId: string;
      resolution?: 'move' | 'repeat';
      originalSemId?: string;
    }[]
  ) => void;
  onRemoveCourseFromSemester?: (semesterId: string, courseCode: string) => void;
  onClearSemesterCourses?: (semesterId: string) => void;
}

export default function AddCoursesModal({
  isOpen,
  onClose,
  semesters,
  initialSelectedCodes,
  onCommitAddCourses,
  onRemoveCourseFromSemester,
  onClearSemesterCourses,
}: AddCoursesModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  
  // Selected course codes
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  
  // Mapping of courseCode -> chosen semesterId
  const [targetSemesters, setTargetSemesters] = useState<Record<string, string>>({});
  
  // Mapping of courseCode -> duplicate resolution ('move' | 'repeat')
  const [duplicateResolutions, setDuplicateResolutions] = useState<Record<string, 'move' | 'repeat'>>({});

  // Active semester for capacity review & drawer
  const [activeSemId, setActiveSemId] = useState<string>("");
  const [isDrawerExpanded, setIsDrawerExpanded] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Helper to determine the best default semester to assign to
  const getDefaultSemesterId = () => {
    if (!semesters || semesters.length === 0) return "";
    const openSem = semesters.find(s => s.courses.length < 5);
    return openSem?.id || semesters[0]?.id || "";
  };

  useEffect(() => {
    if (isOpen) {
      const defaultSem = getDefaultSemesterId();
      setActiveSemId(defaultSem);
      setIsDrawerExpanded(false);
      setShowClearConfirm(false);

      if (initialSelectedCodes && initialSelectedCodes.length > 0) {
        setSelectedCodes(initialSelectedCodes);
        const initialTargets: Record<string, string> = {};
        initialSelectedCodes.forEach(code => {
          initialTargets[code] = defaultSem;
        });
        setTargetSemesters(initialTargets);
      }
    } else {
      setSelectedCodes([]);
      setTargetSemesters({});
      setDuplicateResolutions({});
      setSearchQuery("");
      setCategoryFilter("ALL");
      setShowClearConfirm(false);
    }
  }, [isOpen, initialSelectedCodes, semesters]);

  // Active target semester object
  const currentReviewSemester = useMemo(() => {
    return semesters.find(s => s.id === activeSemId) || semesters[0];
  }, [semesters, activeSemId]);

  // Current courses enrolled in the active review semester
  const enrolledCourses = currentReviewSemester?.courses || [];

  const enrolledCredits = useMemo(() => {
    return enrolledCourses.reduce((sum, c) => {
      const co = COURSES.find(item => item.code === c.code);
      return sum + (co?.credits || 3);
    }, 0);
  }, [enrolledCourses]);

  // Courses selected in modal that are assigned to this semester
  const pendingAssignedToActive = useMemo(() => {
    return selectedCodes.filter(code => (targetSemesters[code] || getDefaultSemesterId()) === currentReviewSemester?.id);
  }, [selectedCodes, targetSemesters, currentReviewSemester]);

  const pendingCreditsForActive = useMemo(() => {
    return pendingAssignedToActive.reduce((sum, code) => {
      const co = COURSES.find(item => item.code === code);
      return sum + (co?.credits || 3);
    }, 0);
  }, [pendingAssignedToActive]);

  const projectedCredits = enrolledCredits + pendingCreditsForActive;
  const isOverloaded = projectedCredits > 18;

  const handleAssignAllToActive = () => {
    if (!currentReviewSemester) return;
    setTargetSemesters(prev => {
      const next = { ...prev };
      selectedCodes.forEach(code => {
        next[code] = currentReviewSemester.id;
      });
      return next;
    });
  };

  // Filtered courses for selection
  const filteredCourses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return COURSES.filter(course => {
      const matchText =
        course.code.toLowerCase().includes(q) ||
        course.title.toLowerCase().includes(q) ||
        (course.category && course.category.toLowerCase().includes(q));

      if (!matchText) return false;

      if (categoryFilter === "CSE") return course.code.startsWith("CSE");
      if (categoryFilter === "MAT") return course.code.startsWith("MAT");
      if (categoryFilter === "ENG") return course.code.startsWith("ENG");
      if (categoryFilter === "RS") return ["EMB101", "HUM103", "BNG103"].includes(course.code);
      if (categoryFilter === "GED") return course.category?.includes("GenEd");

      return true;
    }).slice(0, 50);
  }, [searchQuery, categoryFilter]);

  if (!isOpen) return null;

  const toggleSelectCourse = (code: string) => {
    if (selectedCodes.includes(code)) {
      setSelectedCodes(prev => prev.filter(c => c !== code));
      setTargetSemesters(prev => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
      setDuplicateResolutions(prev => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
    } else {
      setSelectedCodes(prev => [...prev, code]);
      const defaultSem = getDefaultSemesterId();
      setTargetSemesters(prev => ({ ...prev, [code]: defaultSem }));
    }
  };

  // Find if a course is already in another semester
  const findExistingSemesterForCourse = (courseCode: string) => {
    return semesters.find(sem => sem.courses.some(c => c.code === courseCode));
  };

  const handleCommit = () => {
    const assignments = selectedCodes.map(code => {
      const targetSemId = targetSemesters[code] || semesters[0]?.id;
      const existingSem = findExistingSemesterForCourse(code);
      const isDuplicate = existingSem && existingSem.id !== targetSemId;
      const resolution = isDuplicate ? duplicateResolutions[code] || 'repeat' : undefined;

      return {
        courseCode: code,
        targetSemId,
        resolution,
        originalSemId: isDuplicate ? existingSem?.id : undefined,
      };
    });

    onCommitAddCourses(assignments);
    // Reset state & close
    setSelectedCodes([]);
    setTargetSemesters({});
    setDuplicateResolutions({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#070712] border border-white/[0.1] rounded-3xl shadow-[0_0_60px_rgba(59,130,246,0.18)] overflow-hidden text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-[#070712] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Add &amp; Assign Courses
                {selectedCodes.length > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {selectedCodes.length} selected
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select one or multiple courses and assign them to your target semester
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 custom-scrollbar">
          
          {/* Top Panel: Interactive Semester Review Drawer & Overload Safeguard */}
          <div className="bg-[#050714] border border-blue-500/25 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-md relative overflow-hidden">
            {/* Header row: Semester Selector + Credit Load Badges + Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Reviewing Semester:
                  </span>
                </div>
                <select
                  value={currentReviewSemester?.id || ""}
                  onChange={e => {
                    setActiveSemId(e.target.value);
                    setShowClearConfirm(false);
                  }}
                  className="bg-[#0a0d24] border border-blue-500/30 text-white font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-400 cursor-pointer shadow-sm"
                >
                  {semesters.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#070918] text-white">
                      {s.name} {s.term ? `(${s.term} ${s.year || ''})` : ''} — {s.courses.length} enrolled
                    </option>
                  ))}
                </select>
              </div>

              {/* Capacity Meter & Credit Load Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border shadow-inner ${
                  isOverloaded
                    ? "bg-rose-950/40 text-rose-300 border-rose-500/40 shadow-rose-950/50"
                    : projectedCredits > 15
                    ? "bg-amber-950/40 text-amber-300 border-amber-500/40"
                    : "bg-blue-950/40 text-blue-300 border-blue-500/40"
                }`}>
                  <span>{enrolledCredits}cr</span>
                  {pendingCreditsForActive > 0 && (
                    <span className="text-indigo-400 font-extrabold">+{pendingCreditsForActive}cr new</span>
                  )}
                  <span className="text-slate-400 font-normal">/ 18cr max</span>
                </div>

                {/* Drawer Toggle */}
                <button
                  type="button"
                  onClick={() => setIsDrawerExpanded(prev => !prev)}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.08] transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Enrolled ({enrolledCourses.length})</span>
                  {isDrawerExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {/* Clear Semester Button */}
                {enrolledCourses.length > 0 && onClearSemesterCourses && (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition flex items-center gap-1 cursor-pointer"
                    title="Clear all courses from this semester"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Term</span>
                  </button>
                )}
              </div>
            </div>

            {/* Overload Alert Warning if > 18 credits */}
            {isOverloaded && (
              <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Overload Warning:</strong> Adding these courses pushes <strong>{currentReviewSemester?.name}</strong> to <strong>{projectedCredits} credits</strong> ({enrolledCourses.length + pendingAssignedToActive.length} courses), exceeding the standard 18-credit limit.
                </span>
              </div>
            )}

            {/* Clear Confirmation Prompt */}
            {showClearConfirm && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs text-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    Remove all <strong>{enrolledCourses.length} courses</strong> from <strong>{currentReviewSemester?.name}</strong>?
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentReviewSemester && onClearSemesterCourses) {
                        onClearSemesterCourses(currentReviewSemester.id);
                      }
                      setShowClearConfirm(false);
                    }}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm cursor-pointer transition"
                  >
                    Yes, Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 font-semibold text-xs cursor-pointer transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Expandable Enrolled Courses Drawer */}
            {isDrawerExpanded && (
              <div className="pt-2.5 border-t border-white/[0.08] space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <span>Enrolled Courses in {currentReviewSemester?.name}</span>
                  <span>{enrolledCourses.length} total</span>
                </div>

                {enrolledCourses.length === 0 ? (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] text-center text-xs text-slate-400">
                    This semester is currently empty. Use the catalog below to add courses!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {enrolledCourses.map((c, cIdx) => {
                      const courseInfo = COURSES.find(item => item.code === c.code);
                      return (
                        <div
                          key={`${c.code}-${cIdx}`}
                          className="p-2.5 rounded-xl bg-[#090b1c] border border-white/[0.08] flex items-center justify-between gap-2 shadow-sm"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-blue-300">{c.code}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-300 font-semibold">
                                {courseInfo?.credits || 3}cr
                              </span>
                              {c.grade && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  {c.grade}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {courseInfo?.title || c.code}
                            </p>
                          </div>

                          {onRemoveCourseFromSemester && (
                            <button
                              type="button"
                              onClick={() => {
                                if (currentReviewSemester) {
                                  onRemoveCourseFromSemester(currentReviewSemester.id, c.code);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                              title={`Remove ${c.code} from ${currentReviewSemester?.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 1: Selected Courses & Target Semesters Dropdown */}
          {selectedCodes.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#040409] border border-white/[0.08] space-y-3 shadow-inner">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-indigo-300 flex-wrap gap-2">
                <span>Selected Courses &amp; Target Semesters ({selectedCodes.length})</span>
                <div className="flex items-center gap-2">
                  {currentReviewSemester && (
                    <button
                      type="button"
                      onClick={handleAssignAllToActive}
                      className="text-[11px] font-bold text-blue-300 hover:text-white px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 transition cursor-pointer"
                      title={`Assign all selected to ${currentReviewSemester.name}`}
                    >
                      Assign all to {currentReviewSemester.name}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCodes([]);
                      setTargetSemesters({});
                      setDuplicateResolutions({});
                    }}
                    className="text-zinc-400 hover:text-rose-400 text-[11px] underline cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {selectedCodes.map(code => {
                  const courseInfo = COURSES.find(c => c.code === code);
                  const chosenSemId = targetSemesters[code] || semesters[0]?.id;
                  const existingSem = findExistingSemesterForCourse(code);
                  const isAlreadyInSem = existingSem && existingSem.id !== chosenSemId;
                  const resolution = duplicateResolutions[code] || 'repeat';

                  return (
                    <div
                      key={code}
                      className="p-3.5 rounded-2xl bg-[#090914] border border-white/[0.08] space-y-2.5 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-indigo-300 font-mono">{code}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-300 font-medium border border-white/[0.08]">
                            {courseInfo?.credits || 3}cr
                          </span>
                          <span className="text-xs text-zinc-300 truncate max-w-[200px]">
                            {courseInfo?.title}
                          </span>
                        </div>

                        {/* Semester Select Dropdown */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-zinc-400 whitespace-nowrap">Semester:</label>
                          <select
                            value={chosenSemId}
                            onChange={e => {
                              const newSemId = e.target.value;
                              setTargetSemesters(prev => ({ ...prev, [code]: newSemId }));
                            }}
                            className="bg-[#04040a] border border-white/[0.1] rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-indigo-400"
                          >
                            {semesters.map(sem => (
                              <option key={sem.id} value={sem.id} className="bg-[#070712] text-zinc-100">
                                {sem.name} {sem.term ? `(${sem.term} ${sem.year || ''})` : ''}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => toggleSelectCourse(code)}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                            title="Remove from selection"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Duplicate prompt if already in another semester */}
                      {isAlreadyInSem && (
                        <div className="mt-2 p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <span>
                              <strong>{code}</strong> is currently in <strong>{existingSem.name}</strong>.
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setDuplicateResolutions(prev => ({ ...prev, [code]: 'move' }))
                              }
                              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                                resolution === 'move'
                                  ? 'bg-amber-500/25 border border-amber-400 text-amber-200 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                  : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.08]'
                              }`}
                            >
                              Move Course
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDuplicateResolutions(prev => ({ ...prev, [code]: 'repeat' }))
                              }
                              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                                resolution === 'repeat'
                                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 text-white font-bold shadow-[0_0_12px_rgba(99,102,241,0.35)] border border-indigo-400/40'
                                  : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.08]'
                              }`}
                            >
                              Keep Both (Retake)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Search & Filter Course Catalog */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-2">
              Browse Course Catalog
            </div>

            <div className="relative mb-2.5">
              <Search className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by code or title (e.g. CSE320, Statistics, PHY112)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-[#040409] border border-white/[0.1] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter tags */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs mb-3">
              {["ALL", "CSE", "MAT", "ENG", "RS", "GED"].map(tag => (
                <button
                  key={tag}
                  onClick={() => setCategoryFilter(tag)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    categoryFilter === tag
                      ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30 font-bold"
                      : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.08] hover:border-indigo-500/30"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Course Catalog Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {filteredCourses.map(course => {
                const isSelected = selectedCodes.includes(course.code);
                const existingSem = findExistingSemesterForCourse(course.code);

                return (
                  <div
                    key={course.code}
                    onClick={() => toggleSelectCourse(course.code)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-indigo-500/15 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)]"
                        : "bg-[#090914] border-white/[0.08] hover:border-indigo-500/35 hover:bg-[#0d0d1e]"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-indigo-300 font-mono">{course.code}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-300 font-medium">
                          {course.credits}cr
                        </span>
                        {existingSem && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {existingSem.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-300 truncate mt-0.5">{course.title}</p>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 border-indigo-400 text-white shadow-sm"
                          : "border-white/[0.15] text-transparent"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-white/[0.08] bg-[#040409] flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {selectedCodes.length === 0 ? (
              <span>Select courses above to assign</span>
            ) : (
              <span>
                Ready to assign <strong className="text-white">{selectedCodes.length}</strong> courses
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={selectedCodes.length === 0}
              onClick={handleCommit}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 hover:from-blue-500 hover:via-indigo-500 hover:to-indigo-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(99,102,241,0.35)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Add to Semesters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
