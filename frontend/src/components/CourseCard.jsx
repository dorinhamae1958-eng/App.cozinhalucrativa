import React from "react";
import { Link } from "react-router-dom";
import { Clock, BookOpen, ArrowUpRight, TrendingUp, Wallet } from "lucide-react";
import { BRL } from "@/lib/api";

/**
 * CourseCard — premium card with business-oriented badges.
 * Props:
 *  - course: full course object (or partial when used from enrollments)
 *  - index: for stagger animation
 *  - progress: 0..100 or null (catalog mode)
 *  - to: override link target
 */
export default function CourseCard({ course, index = 0, progress = null, to = null }) {
  const href = to || `/curso/${course.slug}`;
  const tags = (course.tags || []).slice(0, 3);
  const modulesCount = course.modules?.length ?? course.modules_count ?? 0;

  return (
    <Link
      to={href}
      data-testid={`course-card-${course.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-800 bg-stone-900 transition-all duration-300 hover:-translate-y-1 hover:border-stone-700 hover:shadow-2xl hover:shadow-amber-900/20 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Cover */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={course.cover_image}
          alt={course.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        {/* Softer overlay so food photos pop */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />

        {course.level && (
          <div className="absolute right-4 top-4 rounded-full bg-stone-950/80 px-3 py-1 backdrop-blur-md">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-stone-200">
              {course.level}
            </span>
          </div>
        )}

        {progress !== null && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-stone-200">Progresso</span>
              <span className="text-xs font-bold text-amber-400">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-800/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-xl font-bold leading-tight text-stone-50 transition-colors group-hover:text-amber-100">
            {course.title}
          </h3>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-stone-500 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-amber-400" />
        </div>

        {course.tagline && (
          <p className="line-clamp-2 text-sm text-stone-400">{course.tagline}</p>
        )}

        {/* Business tags */}
        {tags.length > 0 && progress === null && (
          <div className="flex flex-wrap gap-1.5 pt-1" data-testid={`tags-${course.slug}`}>
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-0.5 text-[10px] font-medium text-amber-300"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Meta line */}
        <div className="mt-1 flex items-center gap-4 text-xs text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {course.duration}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> {modulesCount} módulos
          </span>
        </div>

        {/* Business metrics (only in catalog mode) */}
        {progress === null && (course.initial_investment || course.sales_potential) && (
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-stone-800 pt-3 text-xs">
            {course.initial_investment && (
              <div>
                <p className="mb-0.5 flex items-center gap-1 text-[9px] uppercase tracking-wider text-stone-500">
                  <Wallet className="h-3 w-3" /> investimento
                </p>
                <p className="text-stone-200 font-medium">{course.initial_investment}</p>
              </div>
            )}
            {course.sales_potential && (
              <div>
                <p className="mb-0.5 flex items-center gap-1 text-[9px] uppercase tracking-wider text-stone-500">
                  <TrendingUp className="h-3 w-3" /> potencial
                </p>
                <p className="text-emerald-400 font-medium">{course.sales_potential}</p>
              </div>
            )}
          </div>
        )}

        {progress === null && (
          <div className="mt-3 flex items-center justify-between border-t border-stone-800 pt-4">
            <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
              investimento no curso
            </span>
            <span className="font-display text-2xl font-black text-amber-400">
              {BRL(course.price)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
