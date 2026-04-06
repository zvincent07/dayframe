"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LineChart, Line } from "recharts";

type AnalyticsData = {
  date: string;
  displayDate: string;
  activeUsers: number;
  journals: number;
  conversion: number;
};

export function AnalyticsCharts({ data }: { data: AnalyticsData[] }) {
  // If no data, provide a fallback to avoid crashing Recharts
  const safeData = data?.length > 0 ? data : [];

  return (
    <div className="grid gap-6">
      
      {/* 1. Daily Active Users (DAU) */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Active Users</CardTitle>
          <CardDescription>Number of unique users logging into the system over the last 14 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={safeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                <XAxis 
                  dataKey="displayDate" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12 }} 
                  dy={10} 
                  stroke="#888888" 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12 }} 
                  stroke="#888888" 
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                  itemStyle={{ color: "#10b981" }}
                  labelStyle={{ color: "#a1a1aa", marginBottom: "4px" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="activeUsers" 
                  name="Active Users"
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorUsers)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 2. Journal Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Journal Entries</CardTitle>
            <CardDescription>Total journals logged by users.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={safeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                  <XAxis 
                    dataKey="displayDate" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12 }} 
                    dy={10} 
                    stroke="#888888" 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12 }} 
                    stroke="#888888" 
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#3f3f46', opacity: 0.1 }}
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                    itemStyle={{ color: "#3b82f6" }}
                    labelStyle={{ color: "#a1a1aa", marginBottom: "4px" }}
                  />
                  <Bar 
                    dataKey="journals" 
                    name="Journal Entries"
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 3. Conversion Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Journal Conversion Rate (%)</CardTitle>
            <CardDescription>Percentage of DAUs who wrote a journal.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={safeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                  <XAxis 
                    dataKey="displayDate" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12 }} 
                    dy={10} 
                    stroke="#888888" 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12 }} 
                    stroke="#888888" 
                    domain={[0, 100]}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                    itemStyle={{ color: "#f59e0b" }}
                    labelStyle={{ color: "#a1a1aa", marginBottom: "4px" }}
                    formatter={(value: number) => [`${value}%`, "Conversion Rate"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="conversion" 
                    name="Conversion Rate"
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={{ fill: "#f59e0b", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
