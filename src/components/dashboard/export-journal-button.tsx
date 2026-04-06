"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getJournalHistoryForExport, getWorkoutHistoryForExport, getConsistencyHeatmap } from "@/app/user/profile/actions";
import { getWorkoutConfig } from "@/actions/workout";
import type { IWorkoutEntry } from "@/models/JournalWorkouts";
import { logger } from "@/lib/logger";

interface ProfileStats {
  workoutsLogged: number;
  totalVolume: number;
  taskCompletionPercent: number;
  journalStreak: number;
  totalJournalEntries: number;
}
interface ProfileData {
  name: string;
  joined: string;
  bio: string;
  goals: string[];
  stats: ProfileStats;
}

type ExportImgRef = string | { url: string };

/** Blob/HTML print preview resolves relative URLs against blob: origin — break images without this. */
function toAbsoluteAssetUrl(href: string): string {
  const u = href.trim();
  if (!u) return u;
  if (u.startsWith("data:")) return u;
  try {
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    return new URL(u, window.location.origin).href;
  } catch {
    return u;
  }
}

/** Embed as data URL so images render in the print iframe without cookie/CORS surprises. */
async function inlineImageForPrint(href: string): Promise<string> {
  const abs = toAbsoluteAssetUrl(href);
  if (!href.trim() || abs.startsWith("data:")) return abs;
  try {
    const res = await fetch(abs, { credentials: "include", mode: "cors" });
    if (!res.ok) return abs;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === "string" ? r.result : abs);
      r.onerror = () => resolve(abs);
      r.readAsDataURL(blob);
    });
  } catch {
    return abs;
  }
}

async function mapExportImages(refs: ExportImgRef[] | undefined): Promise<ExportImgRef[]> {
  if (!refs?.length) return [];
  return Promise.all(
    refs.map(async (img) => {
      const url = typeof img === "string" ? img : img.url;
      if (!url) return img;
      const inlined = await inlineImageForPrint(url);
      return typeof img === "string" ? inlined : { ...img, url: inlined };
    })
  );
}

export function ExportJournalButton({ profileData }: { profileData: ProfileData }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      type JournalExportEntry = {
        date: string;
        mainTask: string;
        notes: string;
        isBookmarked: boolean;
        images: Array<string | { url: string }>;
        foodImages: Array<string | { url: string }>;
        macros: { calories?: number; protein?: number; carbs?: number; fats?: number } | null;
        foodText?: string | null;
        todaySpent?: number;
      };
      type WorkoutExportDoc = { date: string; workouts: IWorkoutEntry[] };
      type HeatmapItem = { date: string; level: number };
      type WorkoutConfig = {
        routines: Array<{ routineId: string; name: string }>;
        schedule: { sunday?: string; monday?: string; tuesday?: string; wednesday?: string; thursday?: string; friday?: string; saturday?: string } | null;
        title?: string;
      };

      const [journalsRaw, workoutsRaw, heatmapRaw, configRaw] = await Promise.all([
        getJournalHistoryForExport(),
        getWorkoutHistoryForExport(),
        getConsistencyHeatmap(),
        getWorkoutConfig()
      ]);
      let journals = Array.isArray(journalsRaw) ? (journalsRaw as JournalExportEntry[]) : [];
      const workouts = Array.isArray(workoutsRaw) ? (workoutsRaw as WorkoutExportDoc[]) : [];
      const heatmap = Array.isArray(heatmapRaw) ? (heatmapRaw as HeatmapItem[]) : [];
      const config = (configRaw || null) as WorkoutConfig | null;

      if (!journals || journals.length === 0) {
        toast.error("No journal entries found to export");
        return;
      }

      journals = await Promise.all(
        journals.map(async (e) => ({
          ...e,
          images: await mapExportImages(e.images as ExportImgRef[]),
          foodImages: await mapExportImages(e.foodImages as ExportImgRef[]),
        }))
      );

      // Generate HTML for printing
      const todayStr = format(new Date(), "MMMM d, yyyy");
      const fileDateStr = format(new Date(), "yyyy-MM-dd");
      let docTitle = `Dayframe Journal - ${profileData.name} - ${fileDateStr}`;

      const styles = `
        :root{
          --accent:#10b981;
          --text:#111827;
          --muted:#6b7280;
          --border:#e5e7eb;
          --bg:#ffffff;
          --surface:#ffffff;
          --star-color: #f59e0b;
        }
        *{box-sizing:border-box}
        html,body{height:100%}
        body{
          font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,'Helvetica Neue',sans-serif;
          color:var(--text);
          background:var(--bg);
          margin:24px;
          -webkit-print-color-adjust:exact;
          print-color-adjust:exact;
        }
        .container{max-width:940px;margin:0 auto}
        header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;border-bottom:none;padding-bottom:0;}
        .cover-section {
          background: #ffffff;
          border-radius: 16px;
          padding: 28px;
          margin-bottom: 48px;
          border: 1px solid var(--border);
          page-break-after: always;
          display: flex;
          flex-direction: column;
        }
        .cover-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .cover-title {
          font-size: 40px;
          font-weight: 800;
          color: var(--text);
          letter-spacing: -0.02em;
          margin: 0 0 16px 0;
        }
        .cover-subtitle {
          font-size: 20px;
          color: var(--muted);
          margin: 0;
        }
        .cover-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-top: 16px;
        }
        .stat-box {
          background: white;
          padding: 24px;
          border-radius: 12px;
          border: 1px solid var(--border);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .stat-label {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted);
          font-weight: 600;
          margin-bottom: 8px;
        }
        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: var(--accent);
        }
        
        .entry-card{
          border:none;
          border-left:4px solid var(--accent);
          border-radius:0 12px 12px 0;
          padding:24px 32px;
          margin-bottom:40px;
          background:var(--surface);
          page-break-inside: avoid;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .entry-head{
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          border-bottom:1px solid var(--border);
          padding-bottom:16px;
          margin-bottom:16px;
        }
        .entry-date{
          font-size:20px;
          font-weight:700;
          display:flex;
          align-items:center;
          gap:8px;
        }
        .star-icon {
          color: var(--star-color);
          font-size: 20px;
        }
        
        .section-title {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted);
          font-weight: 600;
          margin-bottom: 8px;
          margin-top: 16px;
        }
        
        .main-task {
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 16px;
        }
        
        .notes-content {
          white-space: pre-wrap;
          line-height: 1.6;
          color: var(--text);
        }
        
        footer{
          margin-top:48px;
          padding-top:24px;
          border-top:1px solid var(--border);
          text-align:center;
          color:var(--muted);
          font-size:12px;
        }
        
        .image-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
          gap: 12px;
          margin-top: 12px;
          margin-bottom: 16px;
        }
        .image-cell {
          aspect-ratio: 1;
          width: 100%;
          max-width: 200px;
          margin: 0 auto;
          border-radius: 10px;
          border: 1px solid var(--border);
          overflow: hidden;
          background: #f4f4f5;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .image-item {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          display: block;
        }
        .profile-box {
          background: white;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          margin-top: 24px;
        }
        .profile-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .profile-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted);
          font-weight: 600;
        }
        .profile-value {
          font-size: 14px;
          color: var(--text);
        }
        .goal-pill {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          margin-right: 8px;
          margin-top: 6px;
          font-size: 12px;
          background: #fff;
        }
        .workout-section {
          margin: 24px 0 40px 0;
          page-break-inside: avoid;
        }
        .workout-day {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          background: #fff;
        }
        .workout-day-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .workout-entry {
          font-size: 13px;
          margin: 4px 0;
        }
        .heatmap {
          display: grid;
          grid-template-columns: repeat(24, 1fr);
          gap: 3px;
          margin-top: 8px;
          margin-bottom: 24px;
        }
        .heat-cell {
          width: 10px;
          height: 10px;
          border-radius: 2px;
          display: inline-block;
        }
        .heat-l0 { background: #edf2f7; }
        .heat-l1 { background: #a7f3d0; }
        .heat-l2 { background: #6ee7b7; }
        .heat-l3 { background: #34d399; }
        
        .macro-row {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .macro-pill {
          background: var(--bg);
          border: 1px solid var(--border);
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
        }
        .spent-pill {
          background: #ecfdf5;
          border: 1px solid #10b981;
          color: #047857;
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 600;
          display: inline-block;
          margin-top: 8px;
          margin-bottom: 16px;
        }
        .day-page {
          page-break-after: always;
          padding-bottom: 12px;
        }
        .chip{
          display:inline-flex;align-items:center;gap:6px;
          padding:4px 8px;border-radius:999px;font-size:11px;font-weight:600;
          border:1px solid rgba(16,185,129,.30);background:rgba(16,185,129,.08);color:#065f46;
        }
        .day-header {
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }
        .day-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
        }
        .day-subtitle {
          font-size: 12px;
          color: var(--muted);
        }
        .workout-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-top: 8px;
        }
        .workout-table th, .workout-table td {
          padding: 8px;
          border-bottom: 1px solid var(--border);
          text-align: left;
        }
        .workout-table thead th {
          font-weight: 600;
          color: var(--text);
          background: #f1f5f9;
        }
        .exercise-block {
          margin-top: 8px;
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        .exercise-header {
          display:flex;justify-content:space-between;align-items:center;
          padding: 8px 12px; background: #f8fafc; border-bottom:1px solid var(--border);
        }
        .exercise-name { font-weight:600; }
        .best-pill { font-size: 11px; color: #047857; }
        .heatmap-legend { margin-top: 8px; font-size: 12px; color: var(--muted); }
        .units-note { margin-top: 8px; font-size: 12px; color: var(--muted); }
        
        @media print {
          body { background: white; margin: 0; }
          .container { max-width: 100%; padding: 20px; }
          .entry-card { box-shadow: none; border: 1px solid #eee; border-left: 4px solid var(--accent); }
          .cover-section { background: #ffffff; border: none; }
          .stat-box { box-shadow: none; border: 1px solid #ddd; }
          button, .no-print { display: none !important; }
        }
      `;

      const journalByDate = new Map<string, JournalExportEntry>();
      journals.forEach((e) => { journalByDate.set(e.date, e); });
      const workoutByDate = new Map<string, WorkoutExportDoc>();
      workouts.forEach((w) => { workoutByDate.set(w.date, w); });
      const allDates = Array.from(new Set<string>([
        ...journals.map(j => j.date),
        ...workouts.map(w => w.date),
      ])).sort((a, b) => b.localeCompare(a));
      const rangeStart = allDates.length ? allDates[allDates.length - 1] : undefined;
      const rangeEnd = allDates.length ? allDates[0] : undefined;
      if (rangeStart && rangeEnd) {
        const rangeStr = `${rangeStart}_to_${rangeEnd}`;
        docTitle = `Dayframe Journal - ${profileData.name} - ${rangeStr}`;
      }

      const routineNameForDate = (dateStr: string): string => {
        if (!config?.schedule) return "REST";
        const d = new Date(dateStr);
        const dow = d.getDay(); // 0=Sun
        const key = dow === 0 ? "sunday" : dow === 1 ? "monday" : dow === 2 ? "tuesday" : dow === 3 ? "wednesday" : dow === 4 ? "thursday" : dow === 5 ? "friday" : "saturday";
        const routineId = (config.schedule as Record<string, string | undefined>)[key];
        if (!routineId || routineId === "REST") return "REST";
        const found = config.routines?.find(r => r.routineId === routineId);
        return found?.name || routineId;
      };

      const dayPagesHtml = allDates.map((dateStr) => {
        const entry = journalByDate.get(dateStr);
        const workoutDoc = workoutByDate.get(dateStr);
        const entryDatePretty = format(new Date(dateStr), "EEEE, MMMM d, yyyy");
        const routineLabel = routineNameForDate(dateStr);
        // Compute summary
        let completedSets = 0;
        let totalSets = 0;
        let volume = 0;
        if (workoutDoc && Array.isArray(workoutDoc.workouts)) {
          workoutDoc.workouts.forEach((w) => {
            const history = Array.isArray(w.history) ? w.history : [];
            totalSets += history.length || (typeof (w as { sets?: number }).sets === "number" ? (w as { sets?: number }).sets || 0 : 0);
            history.forEach(h => {
              const didComplete = !!h?.completed || h?.actualWeight != null || h?.actualReps != null;
              if (didComplete) {
                completedSets += 1;
                const weight = typeof h?.actualWeight === "number" ? h.actualWeight : (typeof h?.targetWeight === "number" ? h.targetWeight : 0);
                const reps = typeof h?.actualReps === "number" ? h.actualReps : (typeof h?.targetReps === "number" ? h.targetReps : 0);
                volume += weight * reps;
              }
            });
          });
        }
        const exercisesCount = workoutDoc?.workouts?.length ?? 0;
        let entryContent = "";
        if (entry) {
          if (entry.mainTask) {
            entryContent += `<div class="section-title">Title</div><div class="main-task">🎯 ${entry.mainTask}</div>`;
          }
          if (entry.notes) {
            entryContent += `<div class="section-title">Notes</div><div class="notes-content" style="margin-bottom: 16px;">${entry.notes.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
          }
          if (entry.images && entry.images.length > 0) {
            entryContent += `<div class="section-title">Images</div><div class="image-grid">`;
            entry.images.forEach((img: string | { url: string }) => {
              const url = typeof img === "string" ? img : img.url;
              if (url) {
                entryContent += `<div class="image-cell"><img src="${url}" class="image-item" alt="Journal image" /></div>`;
              }
            });
            entryContent += `</div>`;
          }
          if (entry.macros && (entry.macros.protein || entry.macros.carbs || entry.macros.fats || entry.macros.calories)) {
            entryContent += `<div class="section-title">Food Track</div>`;
            if (entry.foodText) {
              entryContent += `<div class="notes-content" style="margin-bottom: 8px;">${entry.foodText.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\\n/g, "<br/>")}</div>`;
            }
            if (entry.foodImages && entry.foodImages.length > 0) {
              entryContent += `<div class="image-grid">`;
              entry.foodImages.forEach((img: string | { url: string }) => {
                const url = typeof img === "string" ? img : img.url;
                if (url) {
                  entryContent += `<div class="image-cell"><img src="${url}" class="image-item" alt="Food image" /></div>`;
                }
              });
              entryContent += `</div>`;
            }
            entryContent += `<div class="macro-row">`;
            if (entry.macros.calories) entryContent += `<div class="macro-pill">🔥 ${Math.round(entry.macros.calories)} kcal</div>`;
            if (entry.macros.protein) entryContent += `<div class="macro-pill">🥩 ${Math.round(entry.macros.protein)}g Protein</div>`;
            if (entry.macros.carbs) entryContent += `<div class="macro-pill">🍚 ${Math.round(entry.macros.carbs)}g Carbs</div>`;
            if (entry.macros.fats) entryContent += `<div class="macro-pill">🥑 ${Math.round(entry.macros.fats)}g Fat</div>`;
            entryContent += `</div>`;
          } else if (entry.foodText || (entry.foodImages && entry.foodImages.length > 0)) {
            entryContent += `<div class="section-title">Food Track</div>`;
            if (entry.foodText) {
              entryContent += `<div class="notes-content" style="margin-bottom: 16px;">${entry.foodText.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\\n/g, "<br/>")}</div>`;
            }
            if (entry.foodImages && entry.foodImages.length > 0) {
              entryContent += `<div class="image-grid">`;
              entry.foodImages.forEach((img: string | { url: string }) => {
                const url = typeof img === "string" ? img : img.url;
                if (url) {
                  entryContent += `<div class="image-cell"><img src="${url}" class="image-item" alt="Food image" /></div>`;
                }
              });
              entryContent += `</div>`;
            }
          }
          if (entry.todaySpent && Number(entry.todaySpent) > 0) {
            entryContent += `<div class="section-title">Today's Spent</div><div class="spent-pill">💰 $${Number(entry.todaySpent).toFixed(2)}</div>`;
          }
          if (!entry.mainTask && !entry.notes && (!entry.images || entry.images.length === 0) && (!entry.foodImages || entry.foodImages.length === 0) && !entry.foodText && (!entry.todaySpent || Number(entry.todaySpent) === 0)) {
            entryContent += `<div class="notes-content" style="font-style: italic; color: var(--muted);">No content recorded for this day.</div>`;
          }
          entryContent = `<div class="entry-content">${entryContent}</div>`;
        }
        let workoutContent = "";
        if (workoutDoc) {
          const entries = Array.isArray(workoutDoc.workouts) ? workoutDoc.workouts : [];
          const blocks = entries.map((w: IWorkoutEntry) => {
            const name = String(w.exercise || "");
            const hist = Array.isArray(w.history) ? w.history : [];
            const best = hist.reduce<{ weight: number; reps: number } | null>((acc, h) => {
              const weight = typeof h?.actualWeight === "number" ? h.actualWeight : (typeof h?.targetWeight === "number" ? h.targetWeight : 0);
              const reps = typeof h?.actualReps === "number" ? h.actualReps : (typeof h?.targetReps === "number" ? h.targetReps : 0);
              const vol = weight * reps;
              if (!acc) return { weight, reps };
              const accVol = acc.weight * acc.reps;
              return vol > accVol ? { weight, reps } : acc;
            }, null);
            const tableRows = hist.length > 0
              ? hist.map((h, idx) => {
                  const weight = typeof h?.actualWeight === "number" ? h.actualWeight : (typeof h?.targetWeight === "number" ? h.targetWeight : 0);
                  const reps = typeof h?.actualReps === "number" ? h.actualReps : (typeof h?.targetReps === "number" ? h.targetReps : 0);
                  const done = h?.completed ? "✓" : "";
                  return `<tr><td>${idx + 1}</td><td>${weight}</td><td>${reps}</td><td>${done}</td></tr>`;
                }).join("")
              : `<tr><td colspan="4" style="text-align:center;color:var(--muted)">No sets recorded</td></tr>`;
            const bestHtml = best && (best.weight > 0 || best.reps > 0) ? `<span class="best-pill">🏆 Best: ${best.weight} × ${best.reps}</span>` : "";
            return `
              <div class="exercise-block">
                <div class="exercise-header">
                  <span class="exercise-name">${name}</span>
                  ${bestHtml}
                </div>
                <table class="workout-table">
                  <thead><tr><th style="width:10%">Set</th><th style="width:20%">Weight (kg)</th><th style="width:20%">Reps</th><th style="width:10%">Done</th></tr></thead>
                  <tbody>${tableRows}</tbody>
                </table>
              </div>
            `;
          }).join("");
          workoutContent = `<div class="workout-day"><div class="workout-day-title">Workout</div>${blocks || '<div class="workout-entry">No workouts recorded.</div>'}</div>`;
        }
        return `
          <section class="day-page">
            <div class="entry-card">
              <div class="entry-head">
                <div class="entry-date">${entryDatePretty}</div>
                <div class="day-subtitle">Routine: ${routineLabel}</div>
              </div>
              <div class="day-subtitle" style="margin:8px 0;">
                <span class="chip">Volume: ${Math.round(volume).toLocaleString()} kg</span>
                <span class="chip">Sets: ${completedSets} / ${totalSets}</span>
                <span class="chip">Exercises: ${exercisesCount}</span>
                ${entry?.isBookmarked ? '<span class="chip">★ Bookmarked</span>' : ''}
              </div>
              ${entryContent}
              ${workoutContent}
            </div>
          </section>
        `;
      }).join("");

      const heatmapHtml = Array.isArray(heatmap) ? `
        <div class="section-title">Consistency</div>
        <div class="heatmap">
          ${heatmap.map((d: HeatmapItem) => {
            const cls = d.level === 0 ? "heat-l0" : d.level === 1 ? "heat-l1" : d.level === 2 ? "heat-l2" : "heat-l3";
            return `<span class="heat-cell ${cls}" title="${d.date} • ${d.level}"></span>`;
          }).join("")}
        </div>
        <div class="heatmap-legend">Legend: L0 none • L1 light • L2 medium • L3 high • Timeframe: Past 365 days (journal + tasks + workouts)</div>
      ` : "";


      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${docTitle}</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>${styles}</style>
          </head>
          <body>
            <div class="container">
              <div class="cover-section">
                <div class="cover-header">
                  <div class="cover-title">Dayframe Journal</div>
                </div>
                <div>
                  <p class="cover-subtitle">Generated for <strong>${profileData.name}</strong></p>
                  <p style="color: var(--muted); margin-top: 8px;">Date: ${todayStr}</p>
                </div>
                
                <div class="cover-stats">
                  <div class="stat-box">
                    <div class="stat-label">Total Entries</div>
                    <div class="stat-value">${journals.length}</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-label">Journal Streak</div>
                    <div class="stat-value">${profileData.stats.journalStreak} Days</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-label">Workouts Logged</div>
                    <div class="stat-value">${profileData.stats.workoutsLogged}</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-label">Task Completion</div>
                    <div class="stat-value">${profileData.stats.taskCompletionPercent}%</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-label">Total Volume</div>
                    <div class="stat-value">${Number(profileData.stats.totalVolume || 0).toLocaleString()} kg</div>
                  </div>
                </div>
                ${heatmapHtml}
              </div>
              
              ${dayPagesHtml}
              
              <footer>
                Dayframe Journal Export • ${journals.length} Entries
                <br />
                Tip: Use "Save as PDF" in your browser's print dialog.
              </footer>
            </div>
            
            <script>
              // Auto-trigger print dialog when loaded
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                }, 500);
              };
            </script>
          </body>
        </html>
      `;

      // Create a blob and download it directly using a hidden iframe to print
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = url;
      
      document.body.appendChild(iframe);
      iframe.onload = () => {
        try {
          if (iframe.contentDocument) {
            iframe.contentDocument.title = docTitle;
          }
          const prevTitle = document.title;
          document.title = docTitle;
          setTimeout(() => {
            document.title = prevTitle;
          }, 3000);
        } catch {}
      };
      
      // Cleanup iframe after print dialog is closed (or after a reasonable timeout)
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        URL.revokeObjectURL(url);
      }, 60000);

      toast.success("Preparing journal export...");

    } catch (error) {
      logger.error("Journal Export Error", error as unknown);
      toast.error("Failed to export journal");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleExport} 
      disabled={isExporting}
      className="flex items-center gap-2"
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      Export PDF
    </Button>
  );
}
