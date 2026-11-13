"use client";

import React from "react";
import { Calendar, TrendingUp, Plus, Layers, Menu } from "lucide-react";

export type MobileTab = "planner" | "cgpa" | "categories" | "tools" | "semesters" | "curriculum" | "profile";

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  onOpenSpeedDial?: () => void;
  onOpenAddCourses?: () => void;
  onOpenTools?: () => void;
  isCgpaMode?: boolean;
}

export default function MobileBottomNav({
  activeTab,
  onTabChange,
  onOpenSpeedDial,
  onOpenAddCourses,
  onOpenTools,
  isCgpaMode = false,
}: MobileBottomNavProps) {
  const isPlannerActive = activeTab === "planner" || activeTab === "semesters";
  const isCgpaActive = activeTab === "cgpa" || isCgpaMode;
  const isCategoriesActive = activeTab === "categories" || activeTab === "curriculum";
  const isToolsActive = activeTab === "tools";

  const handleCenterAddClick = () => {
    if (onOpenSpeedDial) {
      onOpenSpeedDial();
    } else if (onOpenAddCourses) {
      onOpenAddCourses();
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#060814]/95 backdrop-blur-xl border-t border-white/[0.08] px-3 py-1.5 safe-area-pb shadow-[0_-8px_30px_rgba(0,0,0,0.7)]">
      <div className="flex items-center justify-between max-w-md mx-auto">
        
        {/* Tab 1: Extra Tools (Menu Hamburger) */}
        <button
          type="button"
          onClick={() => {
            if (onOpenTools) onOpenTools();
            onTabChange("tools");
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            isToolsActive
              ? "text-blue-400 scale-105"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
          title="Extra Tools"
        >
          <div className="relative">
            <Menu className="w-5 h-5 stroke-[2.2]" />
            {isToolsActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            )}
          </div>
          <span className="text-[10px] font-semibold mt-1">Tools</span>
        </button>

        {/* Tab 2: CGPA (TrendingUp) */}
        <button
          type="button"
          onClick={() => onTabChange("cgpa")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            isCgpaActive
              ? "text-blue-400 scale-105"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
          title="CGPA & Trajectory"
        >
          <div className="relative">
            <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            {isCgpaActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            )}
          </div>
          <span className="text-[10px] font-semibold mt-1">CGPA</span>
        </button>

        {/* Center Floating Plus: Quick Actions (3 Options Speed Dial) */}
        <div className="flex flex-col items-center justify-center flex-1">
          <button
            type="button"
            onClick={handleCenterAddClick}
            className="-mt-5 w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] border-2 border-[#060814] active:scale-95 transition-all cursor-pointer"
            aria-label="Quick Actions"
            title="Quick Actions"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
          <span className="text-[10px] font-bold text-blue-400 mt-1">Add</span>
        </div>

        {/* Tab 4: Categories / Curriculum (Layers) */}
        <button
          type="button"
          onClick={() => onTabChange("categories")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            isCategoriesActive
              ? "text-blue-400 scale-105"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
          title="Category Requirements"
        >
          <div className="relative">
            <Layers className="w-5 h-5 stroke-[2.2]" />
            {isCategoriesActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            )}
          </div>
          <span className="text-[10px] font-semibold mt-1">Categories</span>
        </button>

        {/* Tab 5: Planner (Calendar) */}
        <button
          type="button"
          onClick={() => onTabChange("planner")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            isPlannerActive
              ? "text-blue-400 scale-105"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
          title="Semester Planner"
        >
          <div className="relative">
            <Calendar className="w-5 h-5 stroke-[2.2]" />
            {isPlannerActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            )}
          </div>
          <span className="text-[10px] font-semibold mt-1">Planner</span>
        </button>
      </div>
    </nav>
  );
}
