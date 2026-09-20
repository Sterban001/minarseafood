"use client";

import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";

import type { MenuSection } from "../data/menu";
import { DishCard, DishRow } from "./dish-card";

export function MenuView({ sections }: { sections: MenuSection[] }) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeCategory, setActiveCategory] = useState<string | null>(
    sections.length > 0 ? sections[0].id : null,
  );

  function slug(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function handleCategoryClick(categoryId: string, sectionName: string) {
    setActiveCategory(categoryId);
    const element = document.getElementById(slug(sectionName));
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const totalDishes = sections.reduce((acc, sec) => acc + sec.items.length, 0);

  return (
    <div className="w-full">
      {/* Sticky Bar for Category Navigation & View Mode Toggle */}
      <div className="sticky top-16 z-30 border-b border-brand-950/10 bg-foam/90 backdrop-blur-xl transition-all">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Scrollable Category Pills */}
          <nav className="no-scrollbar flex flex-1 items-center gap-2 overflow-x-auto py-1">
            {sections.map((section) => {
              const isActive = activeCategory === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleCategoryClick(section.id, section.name)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-ink text-white shadow-md ring-1 ring-spice-400/40"
                      : "bg-white/80 text-brand-900 hover:bg-white hover:text-ink"
                  }`}
                >
                  <span>{section.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive ? "bg-spice-500 text-ink font-bold" : "bg-brand-950/8 text-slate-600"
                    }`}
                  >
                    {section.items.length}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Grid / List View Mode Switcher */}
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-xs font-semibold text-slate-500 md:inline">
              {totalDishes} total {totalDishes === 1 ? "dish" : "dishes"}
            </span>
            <div className="flex items-center gap-1 rounded-full bg-white/80 p-1 ring-1 ring-brand-950/10 shadow-xs">
              <button
                type="button"
                aria-label="Grid view"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "grid"
                    ? "bg-ink text-white shadow-xs"
                    : "text-slate-600 hover:text-ink"
                }`}
              >
                <LayoutGrid className="size-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                aria-label="List view"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "list"
                    ? "bg-ink text-white shadow-xs"
                    : "text-slate-600 hover:text-ink"
                }`}
              >
                <List className="size-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Sections Container */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="space-y-16">
          {sections.map((section) => (
            <section key={section.id} id={slug(section.name)} className="scroll-mt-36">
              {/* Category Header */}
              <div className="mb-8 flex items-center justify-between border-b border-brand-950/10 pb-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    {section.name}
                  </h2>
                  <span className="rounded-full bg-spice-100 px-3 py-1 font-display text-xs font-bold text-spice-800 ring-1 ring-spice-300/60">
                    {section.items.length} {section.items.length === 1 ? "dish" : "dishes"}
                  </span>
                </div>
              </div>

              {/* Items Display: Grid vs List */}
              {viewMode === "grid" ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {section.items.map((dish) => (
                    <DishCard key={dish.id} dish={dish} />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl bg-white/70 p-4 shadow-xs ring-1 ring-brand-950/8 backdrop-blur-xs sm:p-6">
                  <ul className="divide-y divide-brand-950/8">
                    {section.items.map((dish) => (
                      <DishRow key={dish.id} dish={dish} />
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
