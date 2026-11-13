"use client";

import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight, Award, Check, Sparkles, BookOpen } from "lucide-react";
import { COURSES } from "@/app/courses-data";

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
  "F": 0.0,
};

const GRADE_OPTIONS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];

interface QuickGradeCarouselModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesters: Semester[];
  initialSemesterIdx?: number;
  onUpdateGrade: (semId: string, courseCode: string, newGrade: string) => void;
}

export default function QuickGradeCarouselModal({
  isOpen,
  onClose,
  semesters,
  initialSemesterIdx = 0,
  onUpdateGrade,
}: QuickGradeCarouselModalProps) {
  const [activeIdx, setActiveIdx] = useState<number>(initialSemesterIdx);

  if (!isOpen || semesters.length === 0) return null;

  // Bound index safely
  const currentIdx = Math.max(0, Math.min(semesters.length - 1, activeIdx));
  const currentSem = semesters[currentIdx];

  // Calculate SGPA for current semester
  let totalGradePoints = 0;
  let totalGradedCredits = 0;
  let totalSemesterCredits = 0;

  currentSem.courses.forEach(c => {
    const courseInfo = COURSES.find(item => item.code === c.code);
    const cr = courseInfo?.credits || 3;
    totalSemesterCredits += cr;

    if (c.grade && GRADING_SCALE[c.grade] !== undefined) {
      totalGradePoints += GRADING_SCALE[c.grade] * cr;
      totalGradedCredits += cr;
    }
  });

  const sgpa = totalGradedCredits > 0 ? (totalGradePoints / totalGradedCredits).toFixed(2) : "0.00";
  const hasGrades = totalGradedCredits > 0;

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
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                Quick Grade Entry
              </h3>
              <p className="text-xs text-slate-400">
                Slide across semesters and tap grades for instant SGPA updates
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

        {/* Semester Tabs Carousel Navigation */}
        <div className="bg-[#040409] border-b border-white/[0.06] px-3 py-2.5 flex items-center justify-between gap-2">
          <button
            onClick={() => setActiveIdx(prev => Math.max(0, prev - 1))}
            disabled={currentIdx === 0}
            className="p-1.5 rounded-lg text-indigo-400 hover:text-white hover:bg-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            title="Previous Semester"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Scrollable Semester Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1">
            {semesters.map((sem, idx) => {
              const isActive = idx === currentIdx;
              return (
                <button
                  key={sem.id}
                  onClick={() => setActiveIdx(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.35)] scale-105"
                      : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.08] hover:border-indigo-500/40"
                  }`}
                >
                  <span>{sem.name}</span>
                  {sem.courses.length > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isActive ? "bg-black/30 text-white font-extrabold" : "bg-indigo-500/15 text-indigo-300"
                      }`}
                    >
                      {sem.courses.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setActiveIdx(prev => Math.min(semesters.length - 1, prev + 1))}
            disabled={currentIdx === semesters.length - 1}
            className="p-1.5 rounded-lg text-indigo-400 hover:text-white hover:bg-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            title="Next Semester"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Current Semester Summary Card */}
        <div className="px-4 py-3 bg-[#080814] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-extrabold text-white text-base">{currentSem.name}</span>
            {currentSem.term && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-300 border border-white/[0.08]">
                {currentSem.term} {currentSem.year || ''}
              </span>
            )}
            {currentSem.isRS && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                Residential Semester
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#04040a] border border-white/[0.08]">
              <span className="text-[11px] text-slate-400 font-medium">Credits:</span>
              <span className="text-xs font-bold text-slate-200">{totalSemesterCredits}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
              <span className="text-[11px] text-indigo-300 font-medium">SGPA:</span>
              <span className={`text-sm font-extrabold ${hasGrades ? "text-indigo-200" : "text-zinc-500"}`}>
                {sgpa}
              </span>
            </div>
          </div>
        </div>

        {/* Courses List & Interactive Grade Chips */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
          {currentSem.courses.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02]">
              <BookOpen className="w-8 h-8 mx-auto text-slate-500 mb-2" />
              <p className="text-sm font-medium text-slate-300">No courses in {currentSem.name}</p>
              <p className="text-xs text-slate-500 mt-1">Use &ldquo;Add Courses&rdquo; to populate this semester first</p>
            </div>
          ) : (
            currentSem.courses.map(c => {
              const courseInfo = COURSES.find(item => item.code === c.code);
              const cr = courseInfo?.credits || 3;
              const currentGrade = c.grade || "";

              return (
                <div
                  key={c.code}
                  className="p-3.5 rounded-2xl bg-[#090914] border border-white/[0.08] hover:border-indigo-500/35 transition-all space-y-2.5 shadow-sm"
                >
                  {/* Course Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-indigo-300 tracking-wide font-mono">
                        {c.code}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-300 font-semibold border border-white/[0.08]">
                        {cr} cr
                      </span>
                      {c.isRepeat && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                          Retake
                        </span>
                      )}
                      <span className="text-xs text-zinc-300 truncate max-w-[240px] hidden sm:inline">
                        {courseInfo?.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">Grade:</span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-lg font-bold ${
                          currentGrade
                            ? "bg-indigo-500/25 text-indigo-300 border border-indigo-400/40"
                            : "bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        {currentGrade || "Not Set"}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Grade Selector Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {/* Clear / Unset Chip */}
                    <button
                      onClick={() => onUpdateGrade(currentSem.id, c.code, "")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                        currentGrade === ""
                          ? "bg-zinc-700 text-white border border-zinc-500"
                          : "bg-[#04040a] text-zinc-400 hover:text-zinc-200 border border-white/[0.08]"
                      }`}
                      title="Clear grade"
                    >
                      —
                    </button>

                    {GRADE_OPTIONS.map(g => {
                      const isSelected = currentGrade === g;
                      const isPassing = g !== "F";

                      return (
                        <button
                          key={g}
                          onClick={() => onUpdateGrade(currentSem.id, c.code, g)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                            isSelected
                              ? isPassing
                                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)] scale-105 border border-indigo-400/40 font-black"
                                : "bg-rose-600 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)] scale-105 border border-rose-400/40 font-black"
                              : "bg-[#04040a] text-slate-300 hover:bg-indigo-500/15 hover:text-white border border-white/[0.08] hover:border-indigo-500/30"
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-white/[0.08] bg-[#040409] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white border border-white/[0.1] hover:border-indigo-500/40 hover:bg-indigo-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev Sem
            </button>
            <button
              onClick={() => setActiveIdx(prev => Math.min(semesters.length - 1, prev + 1))}
              disabled={currentIdx === semesters.length - 1}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white border border-white/[0.1] hover:border-indigo-500/40 hover:bg-indigo-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next Sem →
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 hover:from-blue-500 hover:via-indigo-500 hover:to-indigo-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(99,102,241,0.35)] active:scale-95 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
