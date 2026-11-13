"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, X, Layers, BookPlus, Award, Sparkles, ChevronUp } from "lucide-react";

interface SpeedDialMenuProps {
  onAddSemester: () => void;
  onAddCourses: () => void;
  onQuickGrades: () => void;
  isCgpaMode?: boolean;
  isOpenControlled?: boolean;
  onCloseControlled?: () => void;
  isMobileSheet?: boolean;
}

export default function SpeedDialMenu({
  onAddSemester,
  onAddCourses,
  onQuickGrades,
  isCgpaMode = false,
  isOpenControlled,
  onCloseControlled,
  isMobileSheet = false,
}: SpeedDialMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = isOpenControlled !== undefined;
  const isOpen = isControlled ? isOpenControlled : internalOpen;

  const handleToggle = () => {
    if (isControlled) {
      if (isOpen && onCloseControlled) onCloseControlled();
    } else {
      setInternalOpen(prev => !prev);
    }
  };

  const handleClose = () => {
    if (isControlled && onCloseControlled) {
      onCloseControlled();
    } else {
      setInternalOpen(false);
    }
  };

  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // If this is rendered as a standalone mobile modal/sheet
  if (isMobileSheet) {
    if (!isOpen) return null;
    return (
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      >
        <div 
          className="w-full max-w-sm bg-[#070712] border border-white/[0.1] rounded-3xl p-5 shadow-[0_0_50px_rgba(59,130,246,0.25)] space-y-4 animate-in slide-in-from-bottom duration-300"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-white text-base">Quick Action</h3>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Action 1: Add Semester */}
            <button
              onClick={() => {
                handleClose();
                onAddSemester();
              }}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#090914] hover:bg-[#0d0d1e] border border-white/[0.08] hover:border-indigo-500/35 text-left transition-all active:scale-98 shadow-sm group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-white group-hover:text-blue-300 transition-colors">
                  Add Semester
                </div>
                <div className="text-xs text-slate-400">
                  Create new semester &amp; search courses
                </div>
              </div>
            </button>

            {/* Action 2: Add Courses */}
            <button
              onClick={() => {
                handleClose();
                onAddCourses();
              }}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#090914] hover:bg-[#0d0d1e] border border-white/[0.08] hover:border-indigo-500/35 text-left transition-all active:scale-98 shadow-sm group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform">
                <BookPlus className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-white group-hover:text-blue-300 transition-colors">
                  Add Courses
                </div>
                <div className="text-xs text-slate-400">
                  Pick courses &amp; assign to semesters
                </div>
              </div>
            </button>

            {/* Action 3: Quick Grades */}
            <button
              onClick={() => {
                handleClose();
                onQuickGrades();
              }}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#090914] hover:bg-[#0d0d1e] border border-white/[0.08] hover:border-indigo-500/35 text-left transition-all active:scale-98 shadow-sm group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white group-hover:text-blue-300 transition-colors">
                    Quick Grade Entry
                  </span>
                  {isCgpaMode && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/25 text-indigo-300 border border-indigo-400/40">
                      CGPA
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  Slide across semesters to assign grades
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Floating Action Button (bottom right)
  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-40 hidden md:block">
      {/* Expanded Speed Dial Menu */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 mb-2 w-64 p-2.5 rounded-2xl bg-[#070712]/95 backdrop-blur-xl border border-white/[0.1] shadow-[0_0_35px_rgba(59,130,246,0.25)] space-y-1.5 animate-in slide-in-from-bottom-4 duration-200">
          <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-300/80 border-b border-white/[0.08] mb-1">
            Actions
          </div>

          <button
            onClick={() => {
              handleClose();
              onAddSemester();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-500/15 text-left text-zinc-200 hover:text-white transition-all group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold">Add Semester</div>
              <div className="text-[10px] text-zinc-400">Add term &amp; open course search</div>
            </div>
          </button>

          <button
            onClick={() => {
              handleClose();
              onAddCourses();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-500/15 text-left text-zinc-200 hover:text-white transition-all group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookPlus className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold">Add Courses</div>
              <div className="text-[10px] text-zinc-400">Pick courses &amp; assign to semester</div>
            </div>
          </button>

          <button
            onClick={() => {
              handleClose();
              onQuickGrades();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-500/15 text-left text-zinc-200 hover:text-white transition-all group cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold">Quick Grades</span>
                {isCgpaMode && (
                  <span className="text-[9px] px-1 rounded bg-indigo-500/25 text-indigo-300">
                    CGPA
                  </span>
                )}
              </div>
              <div className="text-[10px] text-zinc-400">Slide carousel &amp; tap grades</div>
            </div>
          </button>
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        onClick={handleToggle}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all duration-300 cursor-pointer ${
          isOpen
            ? "bg-zinc-800 text-white rotate-45 border border-zinc-600 scale-95"
            : "bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-500 text-white hover:scale-105 active:scale-95 border border-indigo-400/30"
        }`}
        title="Add Semester, Courses, or Grades"
        aria-label="Add Semester, Courses, or Grades"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>
    </div>
  );
}
