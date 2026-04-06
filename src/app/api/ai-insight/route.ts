import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { SecretService } from "@/services/secret.service";
import { AIInsightRepository } from "@/repositories/ai-insight.repository";
import { JournalRepository } from "@/repositories/journal.repository";
import { WorkoutRepository } from "@/repositories/workout.repository";
import { DailyTaskService } from "@/services/task.service";
import { UserRepository } from "@/repositories/user.repository";
import crypto from "crypto";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const store = await cookies();
    const csrfHeader = req.headers.get("x-csrf-token") || "";
    const csrfCookie = store.get("df_csrf")?.value || "";
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }
    const origin = req.headers.get("origin") || "";
    const referer = req.headers.get("referer") || "";
    const allowed = (process.env.NEXT_PUBLIC_APP_URL || "").toLowerCase();
    if (allowed && origin && !origin.toLowerCase().startsWith(allowed) && referer && !referer.toLowerCase().startsWith(allowed)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rlOk = await rateLimit(`ai-insight:${ip}`, 5);
    if (!rlOk) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    let apiKey = body?.apiKey as string | undefined;
    const userData = body?.userData as { timeframe?: "today"|"7d"|"30d"|"1y"; totals?: unknown; series?: unknown } | undefined;

    const session = await auth();
    const userId = session?.user?.id;
    if (userId) {
      const rlUserOk = await rateLimit(`ai-insight:user:${userId}`, 5);
      if (!rlUserOk) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    if (!apiKey) {
      if (!userId) return NextResponse.json({ error: "No API key provided." }, { status: 401 });
      const fromDb = await SecretService.getDecrypted(userId, "groq");
      if (!fromDb) return NextResponse.json({ error: "No API key provided." }, { status: 401 });
      apiKey = fromDb;
    }

    if (!apiKey) {
       logger.error("API Key is missing even after checking DB");
       return NextResponse.json({ error: "No API key provided." }, { status: 401 });
    }

    const timeframe = userData?.timeframe ?? "7d";
    const userTz = userId ? ((await UserRepository.findById(userId))?.timezone || "UTC") : "UTC";
    const fmtTz = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: userTz });
    const addDays = (base: Date, n: number) => { const d = new Date(base); d.setUTCDate(d.getUTCDate() + n); return d; };
    const now = new Date();
    let start: Date;
    if (timeframe === "today") {
      start = now;
    } else if (timeframe === "7d") {
      start = addDays(now, -6);
    } else if (timeframe === "30d") {
      start = addDays(now, -29);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
    }
    const startKey = fmtTz.format(start);
    const endKey = fmtTz.format(now);

    // Collect ALL data server-side for maximum accuracy
    type FoodBlock = { morning?: string; lunch?: string; noon?: string; dinner?: string };
    let foodLogs: Array<{ date: string; food: FoodBlock }> = [];
    let spendingLogs: Array<{ date: string; currency?: string; spending?: Array<{ price?: number; item?: string; category?: string }> }> = [];
    let workoutLogs: Array<{ date: string; workouts: Array<{ exercise: string; sets?: number; weight?: number; history?: Array<{ completed?: boolean; actualWeight?: number; actualReps?: number }> }> }> = [];
    const taskStats = { completed: 0, missed: 0, total: 0 };
    
    if (userId) {
      const [foodsRes, spendingRes, workoutsRes, journalTasksRes, currentTasksRes] = await Promise.allSettled([
        JournalRepository.findFoodByDateRange(userId, startKey, endKey),
        JournalRepository.findSpendingByDateRange(userId, startKey, endKey),
        WorkoutRepository.findWorkoutHistory(userId, startKey, endKey),
        JournalRepository.findTasksByDateRange(userId, startKey, endKey),
        DailyTaskService.getTasks(userId),
      ]);
      const foods = foodsRes.status === "fulfilled" ? foodsRes.value : [];
      const spending = spendingRes.status === "fulfilled" ? spendingRes.value : [];
      const workouts = workoutsRes.status === "fulfilled" ? workoutsRes.value : [];
      const journalTasks = journalTasksRes.status === "fulfilled" ? journalTasksRes.value : [];
      const currentTasksRaw = currentTasksRes.status === "fulfilled" ? currentTasksRes.value : [];

      // 1. Food
      foodLogs = (foods || []).map(f => ({
        date: String(f.date),
        food: (f as unknown as { food?: FoodBlock }).food || {},
      }));

      // 2. Spending
      spendingLogs = (spending || []).map(s => ({
        date: String(s.date),
        currency: s.currency,
        spending: s.spending,
      }));

      // 3. Workouts
      workoutLogs = (workouts || []).map(w => ({
        date: String(w.date),
        workouts: w.workouts,
      }));

      // 4. Tasks (Hybrid: Journal History + Live Today)
      const currentTasks = Array.isArray(currentTasksRaw) ? currentTasksRaw : [];
      const todayKey = fmtTz.format(new Date());
      const coveredDates = new Set<string>();

      // From History
      if (Array.isArray(journalTasks)) {
        for (const doc of journalTasks as Array<{ date: string; tasks?: Array<{ done?: boolean }> }>) {
          if (doc.date === todayKey) continue; // Skip today from history
          coveredDates.add(doc.date);
          const tasks = Array.isArray(doc.tasks) ? doc.tasks : [];
          for (const t of tasks) {
            taskStats.total++;
            if (t.done) taskStats.completed++; else taskStats.missed++;
          }
        }
      }

      // From Live Today (if in range)
      if (todayKey >= startKey && todayKey <= endKey) {
        for (const t of currentTasks) {
          taskStats.total++;
          if (t.isCompleted) taskStats.completed++; else taskStats.missed++;
        }
        coveredDates.add(todayKey);
      }

      // From Live History (Last Completed Date Fallback)
      for (const t of currentTasks) {
        const key = t.lastCompletedDateKey;
        if (key && key >= startKey && key <= endKey && !coveredDates.has(key)) {
          taskStats.total++;
          taskStats.completed++;
          // Cannot count missed accurately for past days without history snapshot
        }
      }
    }

    const systemPrompt = `You are DayFrame AI, an elite performance coach. 
    Analyze the user's provided data from the last 7 days.
    
    You MUST return a strictly valid JSON object with exactly these 4 keys:
    {
      "win": "One short sentence praising their biggest achievement or consistency.",
      "trend": "One short sentence pointing out a data pattern (e.g., spending habits, macro gaps).",
      "action": "One specific, highly actionable suggestion for the upcoming week.",
      "fullReport": "A detailed, long-form markdown report analyzing the week. Use ### Wins, ### Gaps, and ### Plan."
    }
    
    IMPORTANT: Do NOT wrap the JSON in markdown code blocks. Return ONLY the raw JSON string.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a detailed and accurate insight based on the following user data for the period ${startKey} to ${endKey}:
            ${JSON.stringify({ 
            period: { start: startKey, end: endKey },
            tasks: taskStats,
            workouts: workoutLogs,
            spending: spendingLogs,
            food: foodLogs,
            context: "User is aiming for consistent productivity and healthy habits."
          }, null, 2)}` },
        ],
        temperature: 0.6,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Groq API Error (${response.status})`, errorText);
      // Attempt salvage when Groq returns json_validate_failed with failed_generation
      try {
        const err = JSON.parse(errorText) as { error?: { code?: string; failed_generation?: string } };
        const failed = err?.error?.failed_generation;
        if (err?.error?.code === "json_validate_failed" && typeof failed === "string") {
          let content = failed;
          if (content.includes("```json")) {
            content = content.replace(/```json\n?|\n?```/g, "").trim();
          } else if (content.includes("```")) {
            content = content.replace(/```\n?|\n?```/g, "").trim();
          }
          if (!content.trim().endsWith("}")) {
            const lastBrace = content.lastIndexOf("}");
            if (lastBrace !== -1) content = content.substring(0, lastBrace + 1);
          }
          let parsedInsight: { win?: string; trend?: string; action?: string; fullReport?: string } = {};
          try {
            parsedInsight = JSON.parse(content);
          } catch {
            // Heuristic extraction
            const extractQuoted = (key: string) => {
              const m = content.match(new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"`, "m"));
              return m ? m[1].trim() : undefined;
            };
            const winF = extractQuoted("win");
            const trendF = extractQuoted("trend");
            const actionF = extractQuoted("action");
            let fullReportF = extractQuoted("fullReport");
            if (!fullReportF) {
              const idx = content.indexOf('"fullReport"');
              if (idx >= 0) {
                const colon = content.indexOf(":", idx);
                const end = content.lastIndexOf("}");
                let raw = content.slice(colon + 1, end).trim();
                if (raw.endsWith(",")) raw = raw.slice(0, -1);
                raw = raw.replace(/^"+|"+$/g, "").replace(/^`+|`+$/g, "").trim();
                fullReportF = raw;
              }
            }
            if (winF || trendF || actionF || fullReportF) {
              parsedInsight = { win: winF, trend: trendF, action: actionF, fullReport: fullReportF };
            }
          }
          const { win, trend, action, fullReport } = parsedInsight;
          if (win && trend && action && fullReport) {
            if (userId && fullReport.trim().length > 0) {
              try {
                await AIInsightRepository.create(userId, {
                  timeframe,
                  startDate: startKey,
                  endDate: endKey,
                  summary: win,
                  insight: fullReport,
                  checksum: crypto.createHash("sha256").update(fullReport).digest("hex"),
                  currency: undefined,
                });
              } catch (e) {
                logger.error("Failed to save AI insight (salvage path)", e as unknown);
              }
            }
            return NextResponse.json({ win, trend, action, fullReport });
          }
        }
      } catch {
        // fall through
      }
      return NextResponse.json({ error: "Groq JSON generation failed", details: errorText }, { status: 400 });
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content ?? "";
    
    // Strip markdown code blocks if present
    if (content.includes("```json")) {
      content = content.replace(/```json\n?|\n?```/g, "").trim();
    } else if (content.includes("```")) {
      content = content.replace(/```\n?|\n?```/g, "").trim();
    }

    // Heuristic fix: if content doesn't end with }, try to find the last }
    if (!content.trim().endsWith("}")) {
       const lastBrace = content.lastIndexOf("}");
       if (lastBrace !== -1) {
          content = content.substring(0, lastBrace + 1);
       }
    }

    let parsedInsight: { win?: string; trend?: string; action?: string; fullReport?: string } = {};
    try {
       parsedInsight = JSON.parse(content);
    } catch {
       logger.error("Failed to parse AI JSON response", { content });
       // Fallback: manually extract fields even if JSON is malformed (e.g., unquoted fullReport)
       const extractQuoted = (key: string) => {
         const m = content.match(new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"`, "m"));
         return m ? m[1].trim() : undefined;
       };
       const winF = extractQuoted("win");
       const trendF = extractQuoted("trend");
       const actionF = extractQuoted("action");
       let fullReportF = extractQuoted("fullReport");
       if (!fullReportF) {
         const idx = content.indexOf('"fullReport"');
         if (idx >= 0) {
           const colon = content.indexOf(":", idx);
           const end = content.lastIndexOf("}");
           let raw = content.slice(colon + 1, end).trim();
           if (raw.endsWith(",")) raw = raw.slice(0, -1);
           raw = raw.replace(/^"+|"+$/g, "").replace(/^`+|`+$/g, "").trim();
           fullReportF = raw;
         }
       }
       if (winF || trendF || actionF || fullReportF) {
         parsedInsight = { win: winF, trend: trendF, action: actionF, fullReport: fullReportF };
       } else {
         return NextResponse.json({ error: "Invalid AI response format", raw: content }, { status: 502 });
       }
    }

    const { win, trend, action, fullReport } = parsedInsight;
    
    if (!win || !trend || !action || !fullReport) {
      logger.error("AI response missing fields", { fields: Object.keys(parsedInsight) });
      return NextResponse.json({ error: "AI response missing required fields", received: Object.keys(parsedInsight) }, { status: 502 });
    }

    if (userId && fullReport && fullReport.trim().length > 0) {
      try {
        await AIInsightRepository.create(userId, {
          timeframe,
          startDate: startKey,
          endDate: endKey,
          summary: win, // Save the win as the summary
          insight: fullReport, // Save the full markdown report as the insight
          checksum: crypto.createHash("sha256").update(fullReport).digest("hex"),
          currency: undefined,
        });
      } catch (e) {
        // best effort; do not block response
        logger.error("Failed to save AI insight", e as unknown);
      }
    }

    return NextResponse.json({ win, trend, action, fullReport });
  } catch (_err) {
    const msg = _err instanceof Error ? _err.message : "Unknown error";
    logger.error("AI Insight Route Error", { message: msg });
    return NextResponse.json({ error: "Failed to generate insight.", details: msg }, { status: 500 });
  }
}
