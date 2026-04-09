'use server';

import { auth } from "@/auth";
import { SecretService } from "@/services/secret.service";
import { estimateNutrition as localEstimate } from "@/lib/nutrition";
import { logger } from "@/lib/logger";

let geminiModelCache: { base: string; model: string } | null = null;

export type NutritionResult = {
  protein: number;
  carbs: number;
  fats: number;
  calories: number;
  source: 'local' | 'ai';
};

export async function estimateNutritionAI(text: string): Promise<NutritionResult> {
  // Always get local estimate first as baseline/fallback
  const local = localEstimate(text);
  
  if (!text.trim()) {
    return { ...local, source: 'local' };
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ...local, source: 'local' };

  // Check if user has Groq key
  const apiKey = await SecretService.getDecrypted(userId, "groq");
  if (!apiKey) return { ...local, source: 'local' };

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { 
            role: "system", 
            content: `You are a nutrition analyzer API. Analyze the user's food log and return a JSON object with total nutritional values: p (protein in g), c (carbs in g), f (fats in g), k (calories).
            - Estimate portions reasonably if not specified.
            - Return ONLY valid JSON.
            - Do not include markdown formatting.
            
            Example:
            User: "2 eggs and 1 slice toast"
            Output: { "p": 16, "c": 15, "f": 11, "k": 220 }` 
          },
          { role: "user", content: text },
        ],
        temperature: 0.1,
        max_tokens: 100,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) return { ...local, source: 'local' };
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) return { ...local, source: 'local' };

    const json = JSON.parse(content);
    
    // LLaMA sometimes uses full names instead of shorthand p/c/f/k depending on its mood despite instructions
    const p = Math.round(Number(json.p ?? json.protein ?? 0));
    const c = Math.round(Number(json.c ?? json.carbs ?? json.carbohydrates ?? 0));
    const f = Math.round(Number(json.f ?? json.fat ?? json.fats ?? 0));
    const k = Math.round(Number(json.k ?? json.calories ?? json.kcal ?? 0));

    // If AI returns all zeros but local has data, prefer local (AI might have refused/failed)
    if (p === 0 && c === 0 && f === 0 && k === 0 && local.calories > 0) {
      return { ...local, source: 'local' };
    }

    return {
      protein: p,
      carbs: c,
      fats: f,
      calories: k,
      source: 'ai'
    };
  } catch (err) {
    logger.error("AI Nutrition Error", err as unknown);
    return { ...local, source: 'local' };
  }
}

export async function analyzeFoodImageAI(base64ImageOrUrl: string): Promise<{ success: true; data: { description: string; protein: number; carbs: number; fats: number; calories: number } } | { success: false; error: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: "Unauthorized" };
  try {
    let imageUrl = base64ImageOrUrl;
    let base64Data = "";
    let mime = "image/jpeg";

    if (imageUrl.startsWith("/api/images/")) {
      // It's a database-stored image
      const filename = imageUrl.split("/").pop();
      if (filename) {
        const { Image } = await import("@/models/Image");
        const connectDB = (await import("@/lib/mongodb")).default;
        await connectDB();
        const imgDoc = await Image.findOne({ filename });
        if (imgDoc) {
          mime = imgDoc.contentType || "image/jpeg";
          base64Data = (imgDoc.data as Buffer).toString("base64");
          imageUrl = `data:${mime};base64,${base64Data}`;
        }
      }
    } else if (imageUrl.startsWith("/uploads/")) {
      // It's a local filesystem URL
      const { readFile } = await import("fs/promises");
      const { join } = await import("path");
      const filePath = join(process.cwd(), "public", imageUrl);
      const buffer = await readFile(filePath);
      base64Data = buffer.toString("base64");
      const ext = imageUrl.split(".").pop()?.toLowerCase();
      if (ext === "png") mime = "image/png";
      else if (ext === "gif") mime = "image/gif";
      else if (ext === "webp") mime = "image/webp";
      else mime = "image/jpeg";
      imageUrl = `data:${mime};base64,${base64Data}`;
    } else {
      // It's already base64 or a raw data string
      imageUrl = base64ImageOrUrl.startsWith("data:image") ? base64ImageOrUrl : `data:image/jpeg;base64,${base64ImageOrUrl}`;
      const idx = imageUrl.indexOf("base64,");
      if (idx !== -1) base64Data = imageUrl.slice(idx + 7);
      mime = imageUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/)?.[1] || "image/jpeg";
    }

    const geminiKey = (await SecretService.getDecrypted(userId, "gemini")) || process.env.GEMINI_API_KEY || "";
    if (!geminiKey) return { success: false, error: "Missing Gemini API key. Add it in Settings." };

    let parsed: Record<string, unknown> | null = null;
    const listEndpoints = [
      "https://generativelanguage.googleapis.com/v1/models",
      "https://generativelanguage.googleapis.com/v1beta/models",
    ];
    
    let chosenBase = "";
    let jModels: Array<{ name: string; supportedGenerationMethods?: string[] }> = [];

    // 1. Adaptive Discovery
    for (const listUrl of listEndpoints) {
      if (jModels.length > 0) break;
      try {
        const r = await fetch(`${listUrl}?key=${encodeURIComponent(geminiKey)}`);
        if (!r.ok) continue;
        const j = await r.json() as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> };
        jModels = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent"));
        if (jModels.length > 0) {
          chosenBase = listUrl.replace(/\/models$/, "");
        }
      } catch {
        continue;
      }
    }

    if (jModels.length === 0) {
      return { success: false, error: "No compatible Gemini models found for your API key. Check AI Studio permissions." };
    }

    const gPayload = {
      contents: [
        {
          parts: [
            { text: "Analyze this food image. Output ONLY valid JSON with a 'description' string (semicolon-separated items with grams) and exact integers for 'protein', 'carbs', 'fats', and 'calories'. Example: {\"description\":\"rice 240g; pork 150g; sauce 30g\", \"protein\": 35, \"carbs\": 70, \"fats\": 20, \"calories\": 600}." },
            { inlineData: { mimeType: mime, data: base64Data } },
          ],
        },
      ],
    };

    // 2. Adaptive Execution with Fallback
    const viableModels = jModels.map(m => m.name);
    const preference = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro-vision"];
    const sortedModels: Array<{name: string, base: string}> = [];
    
    for (const p of preference) {
      const idx = viableModels.findIndex(m => m.toLowerCase().includes(p));
      if (idx !== -1) {
        sortedModels.push({ name: viableModels[idx], base: chosenBase });
        viableModels.splice(idx, 1);
      }
    }
    viableModels.forEach(m => sortedModels.push({ name: m, base: chosenBase }));

    let lastModelError = "";
    for (const modelInfo of sortedModels) {
      if (parsed) break;
      try {
        const url = `${modelInfo.base}/${modelInfo.name}:generateContent?key=${encodeURIComponent(geminiKey)}`;
        const resp = await fetch(url, { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify(gPayload) 
        });

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          lastModelError = data?.error?.message || `Gemini API error (${resp.status})`;
          if (resp.status === 503 || resp.status === 429) continue;
          return { success: false, error: lastModelError };
        }

        const firstPart = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (firstPart) {
          try {
            parsed = JSON.parse(firstPart);
          } catch {
            let txt = firstPart.replace(/```json\s*/g, "").replace(/```/g, "").trim();
            const lb = txt.lastIndexOf("}");
            if (lb !== -1) txt = txt.slice(0, lb + 1);
            parsed = JSON.parse(txt);
          }
        }
      } catch (e) {
        lastModelError = "Network error";
      }
    }

    if (!parsed) {
      return { success: false, error: lastModelError || "Gemini is currently overloaded. Please try again in 30 seconds." };
    }
    return {
      success: true,
      data: {
        description: String((parsed as Record<string, unknown>).description || "Unknown food item"),
        protein: Number((parsed as Record<string, unknown>).protein || 0),
        carbs: Number((parsed as Record<string, unknown>).carbs || 0),
        fats: Number((parsed as Record<string, unknown>).fats || 0),
        calories: Number((parsed as Record<string, unknown>).calories || 0),
      }
    };
  } catch (error) {
    logger.error("Vision AI Error", error as unknown);
    return { success: false, error: "Failed to analyze image." };
  }
}
