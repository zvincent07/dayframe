"use client"

import { useEffect, useMemo, useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Sparkles, Star, TrendingUp, Target, Dumbbell, CheckCircle, Book } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { ChartContainer } from "@/components/ui/chart"
import { Modal } from "@/components/ui/modal"
import { InsightHistoryFeed } from "@/components/dashboard/insight-history-feed"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getVolumeTrend, getTaskCompletion, getTaskBreakdown, getSpendingBreakdown, getInsightHistory, getUpNext, getPreviousTotals } from "@/actions/overview"
import { getProviderKey, saveProviderKey, removeProviderKey } from "@/actions/ai-keys"
import { getTaskStreak } from "@/actions/tasks"
import { formatCurrency } from "@/lib/journal-utils"
import { queueEmbeddedBrowserUrl } from "@/lib/browser-open"
import { isDesktop } from "@/lib/desktop"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"

const taskColors = ["#10b981", "#3f3f46"]

const GROQ_KEYS_URL = "https://console.groq.com/keys"
const GEMINI_KEYS_URL = "https://ai.google.dev/gemini-api/docs/api-key"

export function UserOverview({
  initialGroqKey,
  initialGeminiKey
}: {
  initialGroqKey?: { exists: boolean; masked: string | null };
  initialGeminiKey?: { exists: boolean; masked: string | null };
}) {
  const router = useRouter()
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "1y" | "all">("7d")
  const [apiKey] = useState("")
  const [insight, setInsight] = useState("")
  const [insightData, setInsightData] = useState<{ win?: string; trend?: string; action?: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false)

  const [keyInput, setKeyInput] = useState("")
  const [serverMasked, setServerMasked] = useState<string | null>(initialGroqKey?.masked ?? null)
  const [serverExists, setServerExists] = useState(Boolean(initialGroqKey?.exists))
  const [savingServer, setSavingServer] = useState(false)
  const [deletingServer, setDeletingServer] = useState(false)
  const [geminiInput, setGeminiInput] = useState("")
  const [geminiMasked, setGeminiMasked] = useState<string | null>(initialGeminiKey?.masked ?? null)
  const [geminiExists, setGeminiExists] = useState(Boolean(initialGeminiKey?.exists))
  const [savingGemini, setSavingGemini] = useState(false)
  const [deletingGemini, setDeletingGemini] = useState(false)
  const [areaData, setAreaData] = useState<{ day: string; volume: number }[]>([])
  const [spendingData, setSpendingData] = useState<{ day: string; amount: number }[]>([])
  const [currencyCode, setCurrencyCode] = useState<string>("USD")
  const [taskWeek, setTaskWeek] = useState<{ name: string; value: number }[]>([])
  const [taskBreakdown, setTaskBreakdown] = useState<Array<{ title: string; completed: number; missed: number; total: number; duration: string }>>([])
  const [loadingSeries, setLoadingSeries] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyItems, setHistoryItems] = useState<Array<{ _id: string; createdAt: string; insight: string; timeframe: string }>>([])
  const [streak, setStreak] = useState<number>(0)
  const [upNext, setUpNext] = useState<Array<{ kind: "workout" | "task" | "journal"; label: string; tag?: string; badge?: string }>>([])
  const [prevTotals, setPrevTotals] = useState<{ volume: number; spending: number; completed: number }>({ volume: 0, spending: 0, completed: 0 })

  const xKey = timeframe === "1y" ? "day" : "day"

  const totals = useMemo(() => {
    const totalVolume = areaData.reduce((sum, d) => sum + (Number(d.volume) || 0), 0)
    const completed = taskWeek.find(t => t.name === "Completed")?.value ?? 0
    const missed = taskWeek.find(t => t.name === "Missed")?.value ?? 0
    const totalSpending = spendingData.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
    return { totalVolume, completed, missed, totalSpending }
  }, [areaData, taskWeek, spendingData]);

  useEffect(() => { }, [])

  const getCsrf = () => {
    if (typeof document === "undefined") return ""
    const m = document.cookie.match(/(?:^|;\s*)df_csrf=([^;]+)/)
    return m ? decodeURIComponent(m[1]) : ""
  }

  useEffect(() => {
    let active = true
    setLoadingSeries(true)
      ; (async () => {
        try {
          const [vol, tasks, tb, spend, jStats, agenda, prev] = await Promise.all([
            getVolumeTrend(timeframe),
            getTaskCompletion(timeframe),
            getTaskBreakdown(timeframe),
            getSpendingBreakdown(timeframe),
            import("@/actions/journal").then(m => m.getJournalStats()),
            getUpNext(),
            getPreviousTotals(timeframe)
          ])
          if (!active) return
          setAreaData(Array.isArray(vol) ? vol : [])
          setTaskWeek(Array.isArray(tasks) ? tasks : [])
          setTaskBreakdown(Array.isArray(tb) ? tb : [])
          const spendRes = spend as { series: { day: string; amount: number }[]; currency: string }
          setSpendingData(Array.isArray(spendRes?.series) ? spendRes.series : [])
          setCurrencyCode(spendRes?.currency && typeof spendRes.currency === "string" ? spendRes.currency : "USD")
          setStreak(typeof jStats?.streak === "number" ? jStats.streak : 0)
          setUpNext(Array.isArray(agenda) ? agenda.slice(0, 4) : [])
          setPrevTotals(prev || { volume: 0, spending: 0, completed: 0 })
        } finally {
          if (active) setLoadingSeries(false)
        }
      })()
    return () => {
      active = false
    }
  }, [timeframe])

  useEffect(() => {
    if (!isKeyModalOpen) return
      ; (async () => {
        try {
          const meta = await getProviderKey("groq")
          setServerExists(Boolean(meta?.exists))
          setServerMasked(meta?.masked ?? null)
        } catch { }
        try {
          const metaG = await getProviderKey("gemini")
          setGeminiExists(Boolean(metaG?.exists))
          setGeminiMasked(metaG?.masked ?? null)
        } catch { }
      })()
  }, [isKeyModalOpen])

  async function generateInsight() {
    setIsLoading(true)
    setInsight("")
    setInsightData(null)
    try {
      const todayLabel = new Date().toLocaleDateString(undefined, { day: "numeric" })
      const todayWeekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()]
      const areaToday = areaData.filter(d => d.day === todayWeekday || d.day === todayLabel)
      const spendToday = spendingData.filter(d => d.day === todayWeekday || d.day === todayLabel)
      const userData = {
        timeframe: "7d" as const,
        totals,
        series: {
          workout: areaToday,
          spending: spendToday,
          tasks: taskWeek,
        },
      }
      const res = await fetch("/api/ai-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrf() },
        body: JSON.stringify({
          apiKey: apiKey || undefined,
          userData,
          useServerKey: serverExists && !apiKey
        }),
      })
      const data = await res.json()
      // If we get the new structured format
      if (data?.win && data?.trend && data?.action) {
        setInsightData({ win: data.win, trend: data.trend, action: data.action })
      }
      // If we get a summary (legacy or fallback), display it on the dashboard
      else if (data?.summary) setInsight(data.summary as string)
      // Fallback for backward compatibility
      else if (data?.insight) setInsight(data.insight as string)
    } catch {
      setInsight("")
      setInsightData(null)
    } finally {
      // The saving to history happens on the server (data.report), so we just clear loading state
      setTimeout(() => setIsLoading(false), 300)
    }
  }

  const formatNumber = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString() : "0")

  const openKeyDocs = (url: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    if (isDesktop()) {
      queueEmbeddedBrowserUrl(url)
      router.push(`/user/browser?b=${Date.now()}`)
    } else {
      window.open(url, "_blank")
    }
  }

  const renderChange = (current: number, previous: number) => {
    const prevLabel = timeframe === "7d" ? "last week" : timeframe === "30d" ? "last month" : "last year"
    if (previous === 0) {
      if (current === 0) return <span className="text-xs text-muted-foreground opacity-70">steady this {timeframe === "7d" ? "week" : timeframe === "30d" ? "month" : "year"}</span>
      return <span className="text-xs text-emerald-400">+100% from {prevLabel}</span>
    }
    const diff = current - previous
    const percent = Math.round((diff / previous) * 100)
    if (percent > 0) return <span className="text-xs text-emerald-400">+{percent}% from {prevLabel}</span>
    if (percent < 0) return <span className="text-xs text-red-500">{percent}% from {prevLabel}</span>
    return <span className="text-xs text-muted-foreground opacity-70">steady this {timeframe === "7d" ? "week" : timeframe === "30d" ? "month" : "year"}</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">High-level insights and AI analysis.</p>
        </div>
        <Select value={timeframe} onValueChange={(v) => setTimeframe(v as typeof timeframe)}>
          <SelectTrigger className="h-11 w-full min-w-0 sm:h-10 sm:w-[200px]">
            <SelectValue placeholder="Timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="1y">This Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-emerald-900/50 bg-card">
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <CardTitle className="text-lg sm:text-xl">DayFrame AI Insight</CardTitle>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground sm:h-9 sm:w-9"
                onClick={() => setIsKeyModalOpen(true)}
                title="Configure AI Key"
                aria-label="Configure AI API keys"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-11 w-full min-w-0 sm:h-9 sm:w-auto"
                onClick={async () => {
                  setIsHistoryOpen(true)
                  setHistoryLoading(true)
                  try {
                    const items = await getInsightHistory(1, 40)
                    setHistoryItems(Array.isArray(items) ? (items as Array<{ _id: string; createdAt: string; insight: string; timeframe: string }>) : [])
                  } finally {
                    setHistoryLoading(false)
                  }
                }}
              >
                View History
              </Button>
              <Button
                size="sm"
                className="h-11 w-full min-w-0 bg-emerald-600 text-white hover:bg-emerald-700 sm:h-9 sm:w-auto"
                onClick={generateInsight}
                disabled={(!apiKey && !serverExists) || isLoading}
              >
                Generate Insight
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4 bg-muted" />
              <Skeleton className="h-4 w-5/6 bg-muted" />
              <Skeleton className="h-4 w-2/3 bg-muted" />
            </div>
          ) : insightData ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="flex flex-col gap-2 p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/30">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <Star className="w-4 h-4" /> Weekly Win
                </div>
                <p className="text-sm leading-relaxed text-foreground">{insightData.win}</p>
              </div>
              <div className="flex flex-col gap-2 p-4 rounded-lg bg-blue-950/20 border border-blue-900/30">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-400">
                  <TrendingUp className="w-4 h-4" /> The Trend
                </div>
                <p className="text-sm leading-relaxed text-foreground">{insightData.trend}</p>
              </div>
              <div className="flex flex-col gap-2 p-4 rounded-lg bg-amber-950/20 border border-amber-900/30">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                  <Target className="w-4 h-4" /> Action Plan
                </div>
                <p className="text-sm leading-relaxed text-foreground">{insightData.action}</p>
              </div>
            </div>
          ) : insight ? (
            <ReactMarkdown className="prose prose-sm max-w-none text-muted-foreground leading-relaxed line-clamp-3 dark:prose-invert">
              {insight}
            </ReactMarkdown>
          ) : (
            <p className="text-sm text-muted-foreground">
              Analyze your last 7 days of habits, macros, and tasks to generate a personalized action plan.
            </p>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isKeyModalOpen}
        onClose={setIsKeyModalOpen}
        title="Enter AI API Keys"
        description="Configure provider keys used for AI features."
        size="md"
      >
        <div className="mt-2 space-y-6 pr-1">
          <div className="mb-6 border-b border-border/50 pb-6 last:mb-0 last:border-0 last:pb-0">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground">Groq API Key</span>
                <a
                  href="#"
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline-offset-4 hover:underline"
                  onClick={openKeyDocs(GROQ_KEYS_URL)}
                >
                  Get key
                </a>
              </div>
              {serverExists && <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-md bg-emerald-100 dark:bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>}
            </div>
            <Input
              type="text"
              placeholder={serverExists ? (serverMasked || "••••••••••••") : "Paste your API key here..."}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
            />
            <p className="mt-2 text-xs text-muted-foreground">Used for DayFrame AI Insight.</p>
            <div className="flex items-center justify-end gap-3 mt-4">
              {serverExists && (
                <Button
                  variant="ghost"
                  className="h-9 px-4 text-sm font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                  disabled={deletingServer}
                  onClick={async () => {
                    setDeletingServer(true)
                    try {
                      await removeProviderKey("groq")
                      setServerExists(false)
                      setServerMasked(null)
                      setKeyInput("")
                    } finally {
                      setDeletingServer(false)
                    }
                  }}
                >
                  Remove
                </Button>
              )}
              <Button
                className="bg-emerald-600 hover:bg-emerald-500 text-white h-9 px-4 text-sm font-medium"
                disabled={!keyInput || savingServer}
                onClick={async () => {
                  const k = keyInput.trim()
                  if (!k) return
                  setSavingServer(true)
                  try {
                    const res = await saveProviderKey("groq", k)
                    if (!res?.success) return
                    setServerExists(true)
                    setServerMasked(k.length <= 6 ? "*".repeat(k.length) : "*".repeat(k.length - 4) + k.slice(-4))
                    setKeyInput("")
                  } finally {
                    setSavingServer(false)
                  }
                }}
              >
                Save Key
              </Button>
            </div>
          </div>

          <div className="mb-6 border-b border-border/50 pb-6 last:mb-0 last:border-0 last:pb-0">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground">Gemini API Key</span>
                <a
                  href="#"
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline-offset-4 hover:underline"
                  onClick={openKeyDocs(GEMINI_KEYS_URL)}
                >
                  Get key
                </a>
              </div>
              {geminiExists && <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-md bg-emerald-100 dark:bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>}
            </div>
            <Input
              type="text"
              placeholder={geminiExists ? (geminiMasked || "••••••••••••") : "Paste your API key here..."}
              value={geminiInput}
              onChange={(e) => setGeminiInput(e.target.value)}
            />
            <p className="mt-2 text-xs text-muted-foreground">Used for Food track image analysis.</p>
            <div className="flex items-center justify-end gap-3 mt-4">
              {geminiExists && (
                <Button
                  variant="ghost"
                  className="h-9 px-4 text-sm font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                  disabled={deletingGemini}
                  onClick={async () => {
                    setDeletingGemini(true)
                    try {
                      await removeProviderKey("gemini")
                      setGeminiExists(false)
                      setGeminiMasked(null)
                      setGeminiInput("")
                    } finally {
                      setDeletingGemini(false)
                    }
                  }}
                >
                  Remove
                </Button>
              )}
              <Button
                className="bg-emerald-600 hover:bg-emerald-500 text-white h-9 px-4 text-sm font-medium"
                disabled={!geminiInput || savingGemini}
                onClick={async () => {
                  const k = geminiInput.trim()
                  if (!k) return
                  setSavingGemini(true)
                  try {
                    const res = await saveProviderKey("gemini", k)
                    if (!res?.success) return
                    setGeminiExists(true)
                    setGeminiMasked(k.length <= 6 ? "*".repeat(k.length) : "*".repeat(k.length - 4) + k.slice(-4))
                    setGeminiInput("")
                  } finally {
                    setSavingGemini(false)
                  }
                }}
              >
                Save Key
              </Button>
            </div>
          </div>


        </div>
      </Modal>

      <Modal
        isOpen={isHistoryOpen}
        onClose={setIsHistoryOpen}
        size="responsive"
        className="max-w-4xl w-[95vw] h-[80vh] flex flex-col p-0 overflow-hidden"
      >
        <InsightHistoryFeed initialItems={historyItems} isLoading={historyLoading} />
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <div className="text-2xl font-semibold">{formatNumber(totals.totalVolume)} kg</div>
                {renderChange(totals.totalVolume, prevTotals.volume)}
              </div>
              <div className="text-muted-foreground">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Spend</p>
                <div className="text-2xl font-semibold">{formatCurrency(totals.totalSpending, currencyCode)}</div>
                {renderChange(totals.totalSpending, prevTotals.spending)}
              </div>
              <div className="text-muted-foreground">
                <Star className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tasks Completed</p>
                <div className="text-2xl font-semibold">{formatNumber(totals.completed)}</div>
                {renderChange(totals.completed, prevTotals.completed)}
              </div>
              <div className="text-muted-foreground">
                <Target className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Day Streak</p>
                <div className="text-2xl font-semibold">{formatNumber(streak)} days</div>
                {streak > 0 ? (
                  <span className="text-xs text-emerald-400">active streak</span>
                ) : (
                  <span className="text-xs text-muted-foreground opacity-70">no active streak</span>
                )}
              </div>
              <div className="text-muted-foreground">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2 flex flex-col h-full">
          <CardHeader>
            <CardTitle>Volume Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-[240px] sm:h-[300px] md:h-[360px] pt-4 pl-2 pr-6 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey={xKey} minTickGap={30} tick={{ fill: "rgba(255,255,255,0.6)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.6)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "rgba(17,17,17,0.95)", border: "1px solid #3f3f46", borderRadius: 8 }}
                    labelStyle={{ color: "#e5e7eb" }}
                    itemStyle={{ color: "#e5e7eb" }}
                    cursor={{ stroke: "rgba(16,185,129,0.35)", strokeWidth: 1 }}
                    formatter={(value: number) => [`${formatNumber(Number(value))} kg`, "Volume"]}
                    labelFormatter={(label: string) => `Day: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorVolume)"
                    dot={false}
                    activeDot={{ r: 5, stroke: "#10b981", strokeWidth: 2, fill: "#10b981" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle>Task Completion</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSeries ? (
              <Skeleton className="h-[300px] w-full bg-muted" />
            ) : (
              <ChartContainer className="h-[300px] pt-4 pl-2 pr-6 pb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip contentStyle={{ background: "rgba(17,17,17,0.95)", border: "1px solid #3f3f46", borderRadius: 8 }} labelStyle={{ color: "#e5e7eb" }} itemStyle={{ color: "#e5e7eb" }} />
                    <Pie
                      data={taskWeek}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                    >
                      {taskWeek.map((_, i) => (
                        <Cell key={i} fill={taskColors[i % taskColors.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: taskColors[0] }} />
                <span className="text-muted-foreground">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: taskColors[1] }} />
                <span className="text-muted-foreground">Missed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2 flex flex-col h-full">
          <CardHeader>
            <CardTitle>Habit Consistency</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSeries ? (
              <div className="space-y-4 pt-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-32 bg-muted/60" />
                    <Skeleton className="h-2 flex-1 rounded-full bg-muted/60" />
                    <Skeleton className="h-4 w-12 bg-muted/60" />
                  </div>
                ))}
              </div>
            ) : taskBreakdown.length > 0 ? (
              <div className="flex flex-col gap-5 mt-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                {taskBreakdown.map((t, idx) => {
                  const pct = Math.round((t.completed / t.total) * 100) || 0;
                  return (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-1/3 truncate text-sm font-medium text-foreground">{t.title}</div>
                      <div className="flex-1 relative h-2 bg-muted/40 rounded-full overflow-hidden">
                        <div className="absolute top-0 left-0 bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-24 text-right text-xs text-muted-foreground flex flex-col items-end shrink-0">
                        <span className="font-semibold text-emerald-400">{t.completed}x done</span>
                        <div className="flex flex-col items-end opacity-70">
                          {t.missed > 0 && <span>{t.missed}x missed</span>}
                          {t.duration && <span className="font-mono text-[10px] mt-0.5">{t.duration}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground opacity-80">
                No tasks recorded in this timeframe
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle>Up Next</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 mt-4">
              {upNext.length > 0 ? (
                upNext.map((item, idx) => (
                  <div key={idx} className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/60">
                    <div className="flex items-center gap-2">
                      {item.kind === "workout" ? (
                        <Dumbbell className="w-4 h-4 text-emerald-500" />
                      ) : item.kind === "journal" ? (
                        <Book className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                    </div>
                    {item.badge ? (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">{item.badge}</Badge>
                    ) : (
                      item.tag ? <span className="text-xs text-muted-foreground">{item.tag}</span> : null
                    )}
                  </div>
                ))
              ) : (
                <div className="px-1 text-xs text-muted-foreground opacity-80">All caught up for today</div>
              )}
              <Link href="/user/today" className="mt-2 w-full text-left text-xs text-muted-foreground transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
                View all today&apos;s tasks →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle>Spending Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSeries ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-full bg-muted" />
                <Skeleton className="h-6 w-5/6 bg-muted" />
                <Skeleton className="h-6 w-2/3 bg-muted" />
              </div>
            ) : (
              <ChartContainer className="h-[240px] sm:h-[300px] md:h-[360px] pt-4 pl-2 pr-6 pb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={spendingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="day" minTickGap={20} tick={{ fill: "rgba(255,255,255,0.6)" }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.6)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value: number | string) => {
                        const val = typeof value === "number" ? value : 0
                        return formatCurrency(val, currencyCode)
                      }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{ background: "rgba(17,17,17,0.95)", border: "1px solid #3f3f46", borderRadius: 8 }}
                      labelStyle={{ color: "#e5e7eb" }}
                      itemStyle={{ color: "#e5e7eb" }}
                      cursor={{ fill: "rgba(16,185,129,0.08)" }}
                      formatter={(value: number) => [formatCurrency(Number(value), currencyCode), "Amount"]}
                      labelFormatter={(label: string) => `Day: ${label}`}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={40} fill="rgba(16,185,129,0.85)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
