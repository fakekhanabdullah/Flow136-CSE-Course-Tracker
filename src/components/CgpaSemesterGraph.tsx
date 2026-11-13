"use client";

import React, { useState, useRef, useEffect } from "react";
import { TrendingUp, Target, Award, ArrowUpRight, Zap, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

interface SemesterStat {
  id: string;
  credits: number;
  gpa: number | null;
  hasGrades: boolean;
}

interface CgpaSemesterGraphProps {
  semesters: { id: string; name: string; isRS?: boolean; courses: any[] }[];
  semesterStats: SemesterStat[];
  cumulativeStats: {
    completedCredits: number;
    cgpa: number;
    standing: string;
  };
  targetCgpa: string;
  onOpenQuickGrades?: () => void;
  onSelectSemester?: (semId: string) => void;
}

export default function CgpaSemesterGraph({
  semesters,
  semesterStats,
  cumulativeStats,
  targetCgpa,
  onOpenQuickGrades,
  onSelectSemester,
}: CgpaSemesterGraphProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const targetNum = parseFloat(targetCgpa) || 3.0;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [semesters]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Compute best semester
  const gradedSemesters = semesterStats
    .map((s, idx) => ({ ...s, name: semesters[idx]?.name || `Sem ${idx + 1}`, idx }))
    .filter(s => s.gpa !== null && s.gpa > 0);

  const bestSem = gradedSemesters.length > 0
    ? gradedSemesters.reduce((prev, curr) => ((curr.gpa || 0) > (prev.gpa || 0) ? curr : prev), gradedSemesters[0])
    : null;

  // Running cumulative CGPA up to each semester for the trendline
  let runningPoints = 0;
  let runningCredits = 0;
  const cumulativeTrend = semesterStats.map(s => {
    if (s.gpa !== null && s.gpa > 0 && s.credits > 0) {
      runningPoints += s.gpa * s.credits;
      runningCredits += s.credits;
      return runningCredits > 0 ? runningPoints / runningCredits : null;
    }
    return null;
  });

  const maxGpa = 4.0;
  const targetYPct = Math.max(0, Math.min(100, 100 - (targetNum / maxGpa) * 100));

  return (
    <div className="w-full bg-[#070913]/90 border border-blue-500/25 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all duration-300 hover:border-blue-500/40">
      {/* Background ambient aura */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-[0_0_18px_rgba(99,102,241,0.35)] shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
              Semester CGPA Performance
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Visual SGPA bars vs. graduation target benchmark
            </p>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Current CGPA Badge */}
          <div className="h-10 bg-[#05060f]/90 border border-blue-500/30 px-3.5 rounded-xl flex items-center gap-2 shadow-inner">
            <span className="text-[10px] uppercase font-bold text-blue-300">CGPA</span>
            <span className="text-lg font-black font-mono text-white">
              {cumulativeStats.cgpa > 0 ? cumulativeStats.cgpa.toFixed(2) : "0.00"}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">/ 4.00</span>
          </div>

          {/* Target Delta */}
          <div className="h-10 bg-[#05060f]/90 border border-blue-500/25 px-3.5 rounded-xl flex items-center gap-1.5 shadow-inner">
            <Target className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-bold text-slate-300">
              Goal: <strong className="text-amber-300 font-mono">{targetNum.toFixed(2)}</strong>
            </span>
          </div>

          {/* Quick Grade action button */}
          {onOpenQuickGrades && (
            <button
              type="button"
              onClick={onOpenQuickGrades}
              className="h-10 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-500 hover:from-blue-500 hover:via-indigo-500 hover:to-indigo-400 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
            >
              <Zap className="h-3.5 w-3.5 fill-current text-white" />
              <span>Quick Grades</span>
            </button>
          )}

          {/* Scroll navigation arrows for horizontal slider */}
          <div className="h-10 bg-[#05060f]/90 border border-blue-500/25 px-1 rounded-xl flex items-center gap-0.5 shadow-inner">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="pt-6 relative z-10 w-full">
        {/* Mobile Swipe Hint */}
        <div className="sm:hidden flex items-center justify-between pb-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Swipe horizontally to view all terms
          </span>
          <span className="font-mono text-blue-300/80">{semesters.length} terms</span>
        </div>

        {/* Chart Grid & Bars Row */}
        <div className="flex items-start w-full relative">
          
          {/* 1. Left Y-Axis Labels Gutter (Completely outside bars) */}
          <div className="w-8 sm:w-10 shrink-0 pt-6 select-none border-r border-white/[0.06]">
            <div className="h-44 sm:h-52 relative flex flex-col justify-between items-end pr-2 font-mono text-[10px]">
              {/* 4.00 */}
              <span className="text-blue-400/90 font-bold -translate-y-1/2">
                4.00
              </span>
              {/* 3.00 */}
              <span className="text-blue-400/60 font-medium -translate-y-1/2">
                3.00
              </span>
              {/* 2.00 Pass Threshold */}
              <span className="text-rose-400 font-black -translate-y-1/2">
                2.00
              </span>
              {/* 0.00 Base */}
              <span className="text-slate-500 font-medium translate-y-1/2">
                0.00
              </span>
            </div>
          </div>

          {/* 2. Center Plot Canvas: Grid Lines + Uniform Width Scrollable Bars */}
          <div className="relative flex-1 min-w-0">
            
            {/* Horizontal Background Grid Lines */}
            <div className="absolute inset-x-0 top-6 h-44 sm:h-52 pointer-events-none z-0">
              {/* 4.00 Line */}
              <div className="absolute inset-x-0 top-0 border-b border-dashed border-blue-500/25" />
              {/* 3.00 Line */}
              <div className="absolute inset-x-0 top-1/4 border-b border-dashed border-blue-500/15" />
              {/* 2.00 Pass Threshold Line */}
              <div className="absolute inset-x-0 top-1/2 border-b-2 border-dashed border-rose-500/30" />
              {/* 0.00 Baseline */}
              <div className="absolute inset-x-0 bottom-0 border-b border-blue-500/30" />

              {/* Target CGPA Reference Line (Extends smoothly across the bars canvas) */}
              {targetNum > 0 && targetNum <= 4.0 && (
                <div
                  style={{ top: `${targetYPct}%` }}
                  className="absolute inset-x-0 border-b-2 border-dashed border-amber-400/80 z-10 pointer-events-none transition-all duration-500"
                />
              )}
            </div>

            {/* Scrollable Bars Track: Identical column width for every semester */}
            <div
              ref={scrollContainerRef}
              onScroll={checkScroll}
              className="relative flex items-end gap-2 sm:gap-2.5 px-2 sm:px-3 w-full z-10 overflow-x-auto overflow-y-visible custom-scrollbar select-none scroll-smooth"
            >
              <div className="flex items-end gap-2 sm:gap-2.5 min-w-full justify-between sm:justify-start">
                {semesters.map((sem, idx) => {
                  const stat = semesterStats[idx] || { credits: 0, gpa: null, hasGrades: false };
                  const gpa = stat.gpa;
                  const hasGpa = gpa !== null && gpa > 0;
                  // Exact linear mathematical height percentage (0 to 100% strictly aligned with 0 to 4.00)
                  const barHeightPct = hasGpa ? Math.min(100, Math.max(0, (gpa / maxGpa) * 100)) : 0;
                  const isHovered = hoveredIdx === idx;
                  const isTargetMet = hasGpa && gpa >= targetNum;

                  // Short label
                  const shortName = sem.isRS
                    ? "RS"
                    : sem.name.replace("Semester", "Sem").replace("residential semester", "RS").trim();

                  return (
                    <div
                      key={sem.id}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      onClick={() => onSelectSemester?.(sem.id)}
                      className="w-12 sm:w-14 shrink-0 flex flex-col items-center group cursor-pointer relative"
                    >
                      {/* Hover Tooltip Popup */}
                      {isHovered && (
                        <div className="absolute -top-14 bg-[#05060f]/95 border border-blue-400/50 rounded-2xl p-2.5 shadow-2xl text-center pointer-events-none z-50 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                          <p className="text-[10px] font-black text-white">{sem.name}</p>
                          <div className="flex items-center gap-2 mt-1 font-mono text-xs">
                            <span className="text-blue-300 font-extrabold">
                              SGPA: {hasGpa ? gpa.toFixed(2) : "Not Graded"}
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              ({stat.credits} credits)
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Top Value Label (Exactly h-6 / 24px) */}
                      <div className="h-6 flex items-center justify-center transition-transform duration-200 group-hover:-translate-y-0.5">
                        <span
                          className={`font-mono text-[10px] sm:text-[11px] font-bold ${
                            hasGpa
                              ? isTargetMet
                                ? "text-blue-300 font-black"
                                : "text-slate-300"
                              : "text-slate-600"
                          }`}
                        >
                          {hasGpa ? gpa.toFixed(2) : "—"}
                        </span>
                      </div>

                      {/* The Bar Track: Exactly h-44 / sm:h-52, uniform width, overflow-hidden with zero padding */}
                      <div className="w-9 sm:w-11 h-44 sm:h-52 bg-[#04050d]/80 border border-blue-500/20 rounded-2xl overflow-hidden flex flex-col justify-end transition-all duration-300 group-hover:border-blue-400/40 group-hover:bg-[#070a18] relative shadow-inner">
                        {/* Empty track baseline indicator */}
                        {!hasGpa && (
                          <div className="absolute inset-x-2 bottom-1.5 h-1 rounded-full bg-blue-900/30 border border-dashed border-blue-800/40" />
                        )}

                        {/* The Animated Fill Pill (Pure 0..100% height without padding shift) */}
                        {hasGpa && (
                          <div
                            style={{ height: `${barHeightPct}%` }}
                            className={`w-full rounded-t-xl transition-all duration-700 ease-out relative ${
                              isTargetMet
                                ? "bg-gradient-to-t from-blue-600 via-indigo-500 to-sky-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                                : "bg-gradient-to-t from-indigo-700 via-blue-600 to-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.25)]"
                            }`}
                          >
                            {/* Inner glossy highlight inside the top cap */}
                            <div className="w-full h-1.5 rounded-t-xl bg-white/30 blur-[0.5px]" />
                          </div>
                        )}
                      </div>

                      {/* Bottom Semester Label & Credit Load (h-9) */}
                      <div className="mt-2 text-center h-9 w-full px-0.5">
                        <p
                          className={`text-[10px] sm:text-[11px] font-bold truncate transition-colors ${
                            isHovered
                              ? "text-blue-300"
                              : sem.isRS
                              ? "text-indigo-400 font-black"
                              : "text-slate-400"
                          }`}
                        >
                          {shortName}
                        </p>
                        <p className="text-[9px] font-mono text-blue-400/60 -mt-0.5">
                          {stat.credits}cr
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Right Target Badge Gutter (Completely Outside the Bars Canvas) */}
          <div className="w-16 sm:w-20 shrink-0 pt-6 select-none pl-1.5 sm:pl-2 relative border-l border-white/[0.06]">
            <div className="h-44 sm:h-52 relative">
              {targetNum > 0 && targetNum <= 4.0 && (
                <div
                  style={{ top: `${targetYPct}%` }}
                  className="absolute left-0 -translate-y-1/2 flex items-center transition-all duration-500 z-20"
                >
                  {/* Connector dash connecting to the target line */}
                  <div className="w-1.5 sm:w-2 border-b-2 border-dashed border-amber-400/80 -ml-1.5 sm:-ml-2" />
                  <span className="text-[9px] sm:text-[10px] font-mono font-black text-amber-300 bg-[#070913] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.25)] whitespace-nowrap">
                    Target {targetNum.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Legend & Best Semester Info */}
        <div className="mt-4 pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center gap-4 text-slate-400 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-500" />
              <span>Semester SGPA</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 border-t-2 border-dashed border-amber-400" />
              <span className="text-amber-300">Target Goal</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 border-t-2 border-dashed border-rose-500" />
              <span className="text-rose-400">Pass Threshold (2.00)</span>
            </span>
          </div>

          {bestSem && (
            <div className="flex items-center gap-1.5 text-blue-300 bg-blue-500/10 border border-blue-500/25 px-2.5 py-1 rounded-xl font-medium">
              <Award className="h-3.5 w-3.5 text-indigo-400" />
              <span>
                Peak Term: <strong>{bestSem.name}</strong> ({bestSem.gpa?.toFixed(2)})
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
