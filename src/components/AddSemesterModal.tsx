"use client";

import React, { useState, useMemo } from "react";
import { X, Search, Plus, Trash2, BookOpen, Check, Layers, Sparkles, AlertCircle } from "lucide-react";
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

interface AddSemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  semester: Semester | null;
  onAddCourseToSemester: (semId: string, courseCode: string) => void;
  onRemoveCourseFromSemester: (semId: string, courseCode: string) => void;
  allSemesters?: Semester[];
}

export default function AddSemesterModal({
  isOpen,
  onClose,
  semester,
  onAddCourseToSemester,
  onRemoveCourseFromSemester,
  allSemesters = [],
}: AddSemesterModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");

  // Filter available courses
  const filteredCourses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return COURSES.filter(course => {
      const matchesSearch =
        course.code.toLowerCase().includes(q) ||
        course.title.toLowerCase().includes(q) ||
        (course.category && course.category.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (selectedFilter === "CSE") return course.code.startsWith("CSE");
      if (selectedFilter === "MAT") return course.code.startsWith("MAT");
      if (selectedFilter === "ENG") return course.code.startsWith("ENG");
      if (selectedFilter === "RS") return ["EMB101", "HUM103", "BNG103"].includes(course.code);
      if (selectedFilter === "GED") return course.category?.includes("GenEd");

      return true;
    }).slice(0, 40); // limit to 40 for optimal performance
  }, [searchQuery, selectedFilter]);

  if (!isOpen || !semester) return null;

  // Calculate current credits in this semester
  const currentCredits = semester.courses.reduce((sum, c) => {
    const found = COURSES.find(item => item.code === c.code);
    return sum + (found?.credits || 3);
  }, 0);

  // Set of courses currently in this semester
  const semesterCourseCodes = new Set(semester.courses.map(c => c.code));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#070712] border border-white/[0.1] rounded-3xl shadow-[0_0_60px_rgba(59,130,246,0.18)] overflow-hidden transition-all text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-[#070712] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">{semester.name}</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {semester.courses.length} courses • {currentCredits} cr
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {semester.term ? `${semester.term} ${semester.year || ''}` : "Newly Added Semester"} — Add courses below
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

        {/* Content Body: Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          
          {/* Currently Added Courses in this Semester */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-2 flex items-center justify-between">
              <span>Courses in this semester ({semester.courses.length})</span>
              <span className="text-[11px] text-zinc-400 font-normal">Max recommended: 15-18 credits</span>
            </div>
            
            {semester.courses.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] text-center">
                <BookOpen className="w-6 h-6 mx-auto text-slate-500 mb-1" />
                <p className="text-xs text-slate-300 font-medium">No courses added yet</p>
                <p className="text-[11px] text-zinc-500">Search and tap &ldquo;+ Add&rdquo; below to enroll courses</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {semester.courses.map(c => {
                  const courseInfo = COURSES.find(item => item.code === c.code);
                  return (
                    <div
                      key={c.code}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#090914] border border-white/[0.08] hover:border-indigo-500/35 transition-all shadow-sm"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-indigo-300 font-mono">{c.code}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.05] text-slate-300 border border-white/[0.08]">
                            {courseInfo?.credits || 3}cr
                          </span>
                          {c.isRepeat && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                              Retake
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-300 truncate mt-0.5">
                          {courseInfo?.title || c.code}
                        </p>
                      </div>
                      <button
                        onClick={() => onRemoveCourseFromSemester(semester.id, c.code)}
                        className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0"
                        title="Remove Course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search & Filter Header */}
          <div className="pt-2 border-t border-white/[0.08]">
            <div className="relative mb-2.5">
              <Search className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search courses (e.g. CSE220, Data Structures, PHY111)..."
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
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {["ALL", "CSE", "MAT", "ENG", "RS", "GED"].map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedFilter(tag)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    selectedFilter === tag
                      ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30 font-bold"
                      : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.08] hover:border-indigo-500/30"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Search Results List */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {filteredCourses.length === 0 ? (
              <p className="text-center py-6 text-xs text-zinc-500">No matching courses found</p>
            ) : (
              filteredCourses.map(course => {
                const isAdded = semesterCourseCodes.has(course.code);
                // Check if in another semester
                const alreadyInOtherSem = allSemesters.find(
                  s => s.id !== semester.id && s.courses.some(c => c.code === course.code)
                );

                return (
                  <div
                    key={course.code}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isAdded
                        ? "bg-indigo-500/10 border-indigo-500/40"
                        : "bg-[#090914] hover:bg-[#0d0d1e] border-white/[0.08] hover:border-indigo-500/35"
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-indigo-300 font-mono">{course.code}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-300 font-medium">
                          {course.credits} cr
                        </span>
                        {course.category && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400">
                            {course.category}
                          </span>
                        )}
                        {alreadyInOtherSem && !isAdded && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            In {alreadyInOtherSem.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-300 truncate mt-0.5">{course.title}</p>
                    </div>

                    <button
                      onClick={() => {
                        if (isAdded) {
                          onRemoveCourseFromSemester(semester.id, course.code);
                        } else {
                          onAddCourseToSemester(semester.id, course.code);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm flex-shrink-0 cursor-pointer ${
                        isAdded
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-400/40"
                          : "bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 hover:from-blue-500 hover:via-indigo-500 hover:to-indigo-400 text-white shadow-md shadow-indigo-600/25 active:scale-95"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Added
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" /> Add
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-white/[0.08] bg-[#040409] flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Total: <span className="font-bold text-white">{semester.courses.length}</span> courses (
            <span className="font-bold text-white">{currentCredits}</span> credits)
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 hover:from-blue-500 hover:via-indigo-500 hover:to-indigo-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(99,102,241,0.35)] active:scale-95 transition-all cursor-pointer"
          >
            Done & Save
          </button>
        </div>
      </div>
    </div>
  );
}
