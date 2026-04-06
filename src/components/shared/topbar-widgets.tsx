"use client";

import { useState, useEffect } from "react";
import { 
  Calendar,
  Cloud, 
  CloudDrizzle, 
  CloudFog, 
  CloudLightning, 
  CloudRain, 
  CloudSnow, 
  CloudSun,
  Sun,
} from "lucide-react";

interface WeatherData {
  temperature: number;
  weatherCode: number;
}

interface TopBarWidgetsProps {
  systemTimezone?: string;
  dateFormat?: string;
}

export function TopBarWidgets({ systemTimezone }: TopBarWidgetsProps) {
  const [time, setTime] = useState<Date | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tempUnit, setTempUnit] = useState<"celsius" | "fahrenheit">("celsius");

  const getCsrf = () => {
    if (typeof document === "undefined") return ""
    const m = document.cookie.match(/(?:^|;\s*)df_csrf=([^;]+)/)
    return m ? decodeURIComponent(m[1]) : ""
  }

  // Read preference on mount and listen to changes
  useEffect(() => {
    const updateUnit = () => {
      const unit = localStorage.getItem("df_temperature_unit");
      if (unit === "fahrenheit") setTempUnit("fahrenheit");
      else setTempUnit("celsius");
    };
    updateUnit();
    window.addEventListener("storage", updateUnit);
    return () => window.removeEventListener("storage", updateUnit);
  }, []);

  // Time update effect
  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Weather fetch effect
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          try {
            const response = await fetch("/api/v1/weather", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-csrf-token": getCsrf()
              },
              body: JSON.stringify({ lat: latitude, lon: longitude })
            });
            if (!response.ok) {
              setError("Weather unavailable");
              return;
            }
            const data = await response.json();
            setWeather({
              temperature: data?.current?.temperature_2m,
              weatherCode: data?.current?.weather_code,
            });
          } catch {
            setError("Weather unavailable");
          }
        } catch {
          setError("Failed to load weather");
        } finally {
          setLoading(false);
        }
      },
      () => {
        // Permission denied or position unavailable - fail silently
        setError("Location access denied");
        setLoading(false);
      }
    );
  }, []);

  const getWeatherIcon = (code: number) => {
    // WMO Weather interpretation codes (WW)
    // 0: Clear sky
    if (code === 0) return <Sun className="h-4 w-4 text-yellow-500" />;
    
    // 1, 2, 3: Mainly clear, partly cloudy, and overcast
    if (code >= 1 && code <= 3) return <CloudSun className="h-4 w-4 text-muted-foreground" />;
    
    // 45, 48: Fog
    if (code === 45 || code === 48) return <CloudFog className="h-4 w-4 text-muted-foreground" />;
    
    // 51, 53, 55, 56, 57: Drizzle
    if (code >= 51 && code <= 57) return <CloudDrizzle className="h-4 w-4 text-blue-400" />;
    
    // 61, 63, 65, 66, 67, 80, 81, 82: Rain
    if (code >= 61 && code <= 82) return <CloudRain className="h-4 w-4 text-blue-500" />;
    
    // 71, 73, 75, 77, 85, 86: Snow
    if (code >= 71 && code <= 86) return <CloudSnow className="h-4 w-4 text-cyan-200" />;
    
    // 95, 96, 99: Thunderstorm
    if (code >= 95 && code <= 99) return <CloudLightning className="h-4 w-4 text-yellow-600" />;
    
    return <Cloud className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
        <div className="h-4 w-20 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 md:gap-4 text-sm font-medium">
      {/* Date Widget */}
      <div className="hidden lg:flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-border/50 shadow-sm shrink-0">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="tabular-nums tracking-wide text-foreground whitespace-nowrap">
          {time?.toLocaleDateString("en-US", { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })}
        </span>
      </div>

      {/* Time Widget */}
      <div className="hidden md:flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-border/50 shadow-sm shrink-0">
        <span className="tabular-nums tracking-wide text-foreground whitespace-nowrap">
          {time?.toLocaleTimeString("en-US", { 
            hour: "2-digit", 
            minute: "2-digit",
            timeZone: systemTimezone
          })}
        </span>
        <span className="text-xs text-muted-foreground font-normal uppercase tracking-wider hidden sm:inline-block">
          {systemTimezone ? systemTimezone.split("/").pop()?.replace("_", " ") : "LOCAL"}
        </span>
      </div>

      {/* Weather Widget (Only show if no error) */}
      {!error && weather && (
        <div className="hidden md:flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-border/50 shadow-sm shrink-0">
          {getWeatherIcon(weather.weatherCode)}
          <span className="tabular-nums text-foreground whitespace-nowrap">
            {tempUnit === "fahrenheit" 
              ? `${Math.round((weather.temperature * 9/5) + 32)}°F` 
              : `${Math.round(weather.temperature)}°C`}
          </span>
        </div>
      )}
    </div>
  );
}
