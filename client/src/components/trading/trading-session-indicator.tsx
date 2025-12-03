import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// Trading session times in UTC (24-hour format)
const SESSIONS = {
  asian: {
    name: "ASIA",
    // Asian session spans midnight: 22:00 - 09:00 UTC
    startHour: 22,
    endHour: 9,
    spansMiddnight: true,
    color: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  },
  london: {
    name: "LONDON",
    startHour: 7,
    endHour: 16,
    spansMiddnight: false,
    color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  newYork: {
    name: "NEW YORK",
    startHour: 12,
    endHour: 21,
    spansMiddnight: false,
    color: "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
} as const;

// Killzones - high volatility periods
const KILLZONES = {
  londonOpen: { startHour: 7, endHour: 9, name: "London Killzone" },
  nyOpen: { startHour: 12, endHour: 14, name: "NY Killzone" },
} as const;

type SessionKey = keyof typeof SESSIONS;

interface ActiveSession {
  key: SessionKey;
  name: string;
  color: string;
  endsInMinutes: number;
}

interface SessionInfo {
  activeSessions: ActiveSession[];
  isOverlap: boolean;
  overlapType: "london_asia" | "london_ny" | null;
  killzone: string | null;
  nextSession: { name: string; startsInMinutes: number } | null;
  isWeekend: boolean;
}

function isSessionActive(
  session: typeof SESSIONS[SessionKey],
  utcHour: number
): boolean {
  if (session.spansMiddnight) {
    // Session spans midnight (e.g., 22:00 - 09:00)
    return utcHour >= session.startHour || utcHour < session.endHour;
  }
  return utcHour >= session.startHour && utcHour < session.endHour;
}

function getMinutesUntilEnd(
  session: typeof SESSIONS[SessionKey],
  utcHour: number,
  utcMinutes: number
): number {
  let endHour = session.endHour;

  if (session.spansMiddnight && utcHour >= session.startHour) {
    // We're in the evening portion, end is next day
    endHour = session.endHour + 24;
  }

  const currentMinutes = utcHour * 60 + utcMinutes;
  const endMinutes = endHour * 60;

  return endMinutes - currentMinutes;
}

function getMinutesUntilStart(
  session: typeof SESSIONS[SessionKey],
  utcHour: number,
  utcMinutes: number
): number {
  const currentMinutes = utcHour * 60 + utcMinutes;
  let startMinutes = session.startHour * 60;

  // If start time has passed today, it's tomorrow
  if (startMinutes <= currentMinutes) {
    startMinutes += 24 * 60;
  }

  return startMinutes - currentMinutes;
}

function getCurrentKillzone(utcHour: number): string | null {
  if (utcHour >= KILLZONES.londonOpen.startHour && utcHour < KILLZONES.londonOpen.endHour) {
    return KILLZONES.londonOpen.name;
  }
  if (utcHour >= KILLZONES.nyOpen.startHour && utcHour < KILLZONES.nyOpen.endHour) {
    return KILLZONES.nyOpen.name;
  }
  return null;
}

function isWeekend(date: Date): boolean {
  const utcDay = date.getUTCDay();
  const utcHour = date.getUTCHours();

  // Forex market closes Friday 21:00 UTC and opens Sunday 22:00 UTC
  // Saturday is always closed
  if (utcDay === 6) return true; // Saturday

  // Friday after 21:00 UTC
  if (utcDay === 5 && utcHour >= 21) return true;

  // Sunday before 22:00 UTC
  if (utcDay === 0 && utcHour < 22) return true;

  return false;
}

function getSessionInfo(date: Date): SessionInfo {
  const utcHour = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();

  // Check if market is closed (weekend)
  if (isWeekend(date)) {
    return {
      activeSessions: [],
      isOverlap: false,
      overlapType: null,
      killzone: null,
      nextSession: { name: "ASIA", startsInMinutes: getMinutesUntilSundayOpen(date) },
      isWeekend: true,
    };
  }

  const activeSessions: ActiveSession[] = [];

  // Check each session
  (Object.entries(SESSIONS) as [SessionKey, typeof SESSIONS[SessionKey]][]).forEach(
    ([key, session]) => {
      if (isSessionActive(session, utcHour)) {
        activeSessions.push({
          key,
          name: session.name,
          color: session.color,
          endsInMinutes: getMinutesUntilEnd(session, utcHour, utcMinutes),
        });
      }
    }
  );

  // Determine overlap type
  let overlapType: "london_asia" | "london_ny" | null = null;
  const sessionKeys = activeSessions.map((s) => s.key);

  if (sessionKeys.includes("london") && sessionKeys.includes("asian")) {
    overlapType = "london_asia";
  } else if (sessionKeys.includes("london") && sessionKeys.includes("newYork")) {
    overlapType = "london_ny";
  }

  // Get current killzone
  const killzone = getCurrentKillzone(utcHour);

  // Find next session if none active
  let nextSession: { name: string; startsInMinutes: number } | null = null;
  if (activeSessions.length === 0) {
    // Find the session that starts soonest
    let soonest: { name: string; startsInMinutes: number } | null = null;

    (Object.entries(SESSIONS) as [SessionKey, typeof SESSIONS[SessionKey]][]).forEach(
      ([_, session]) => {
        const minutes = getMinutesUntilStart(session, utcHour, utcMinutes);
        if (!soonest || minutes < soonest.startsInMinutes) {
          soonest = { name: session.name, startsInMinutes: minutes };
        }
      }
    );

    nextSession = soonest;
  }

  return {
    activeSessions,
    isOverlap: activeSessions.length > 1,
    overlapType,
    killzone,
    nextSession,
    isWeekend: false,
  };
}

function getMinutesUntilSundayOpen(date: Date): number {
  const now = date.getTime();
  const nextSunday = new Date(date);

  // Find next Sunday 22:00 UTC
  const daysUntilSunday = (7 - date.getUTCDay()) % 7;
  nextSunday.setUTCDate(date.getUTCDate() + daysUntilSunday);
  nextSunday.setUTCHours(22, 0, 0, 0);

  // If we're already past Sunday 22:00, it's next week
  if (nextSunday.getTime() <= now) {
    nextSunday.setUTCDate(nextSunday.getUTCDate() + 7);
  }

  return Math.floor((nextSunday.getTime() - now) / (1000 * 60));
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

// Session times reference component
function SessionTimesReference({ activeSessionKeys }: { activeSessionKeys: SessionKey[] }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className={cn(
        "flex items-center gap-1",
        activeSessionKeys.includes("asian") ? "text-blue-600 dark:text-blue-400 font-medium" : "text-muted-foreground"
      )}>
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        <span>ASIA 22-09</span>
      </div>
      <div className={cn(
        "flex items-center gap-1",
        activeSessionKeys.includes("london") ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"
      )}>
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span>LON 07-16</span>
      </div>
      <div className={cn(
        "flex items-center gap-1",
        activeSessionKeys.includes("newYork") ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"
      )}>
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span>NY 12-21</span>
      </div>
      <span className="text-muted-foreground/60">UTC</span>
    </div>
  );
}

export default function TradingSessionIndicator() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>(() =>
    getSessionInfo(new Date())
  );

  useEffect(() => {
    // Update every minute
    const interval = setInterval(() => {
      setSessionInfo(getSessionInfo(new Date()));
    }, 60000);

    // Also update immediately
    setSessionInfo(getSessionInfo(new Date()));

    return () => clearInterval(interval);
  }, []);

  const { activeSessions, isOverlap, overlapType, killzone, nextSession, isWeekend } =
    sessionInfo;

  const activeSessionKeys = activeSessions.map((s) => s.key);

  // Weekend - market closed
  if (isWeekend) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-gray-500/20 text-gray-600 dark:text-gray-400">
            MARKET CLOSED
          </Badge>
          {nextSession && (
            <span className="text-xs text-muted-foreground">
              Opens in {formatMinutes(nextSession.startsInMinutes)}
            </span>
          )}
        </div>
        <SessionTimesReference activeSessionKeys={[]} />
      </div>
    );
  }

  // No active sessions (rare, but possible in gaps)
  if (activeSessions.length === 0) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            Between Sessions
          </Badge>
          {nextSession && (
            <span className="text-xs text-muted-foreground">
              {nextSession.name} in {formatMinutes(nextSession.startsInMinutes)}
            </span>
          )}
        </div>
        <SessionTimesReference activeSessionKeys={[]} />
      </div>
    );
  }

  // London + NY overlap (most important)
  if (overlapType === "london_ny") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              "bg-gradient-to-r from-emerald-500/20 to-amber-500/20",
              "text-amber-700 dark:text-amber-400",
              "border border-amber-500/40",
              killzone && "ring-2 ring-amber-500/50 ring-offset-1 ring-offset-background"
            )}
          >
            {killzone && <Zap className="h-3 w-3 mr-1" />}
            LONDON + NY
          </Badge>
          {killzone ? (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {killzone}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Overlap ends in {formatMinutes(Math.min(...activeSessions.map((s) => s.endsInMinutes)))}
            </span>
          )}
        </div>
        <SessionTimesReference activeSessionKeys={activeSessionKeys} />
      </div>
    );
  }

  // London + Asia overlap
  if (overlapType === "london_asia") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              "bg-gradient-to-r from-blue-500/20 to-emerald-500/20",
              "text-emerald-700 dark:text-emerald-400",
              "border border-emerald-500/40",
              killzone && "ring-2 ring-emerald-500/50 ring-offset-1 ring-offset-background"
            )}
          >
            {killzone && <Zap className="h-3 w-3 mr-1" />}
            LONDON + ASIA
          </Badge>
          {killzone ? (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {killzone}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Asia closes in {formatMinutes(activeSessions.find((s) => s.key === "asian")?.endsInMinutes || 0)}
            </span>
          )}
        </div>
        <SessionTimesReference activeSessionKeys={activeSessionKeys} />
      </div>
    );
  }

  // Single session active
  const session = activeSessions[0];
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Badge
          className={cn(
            session.color,
            "border",
            killzone && "ring-2 ring-offset-1 ring-offset-background",
            killzone && session.key === "london" && "ring-emerald-500/50",
            killzone && session.key === "newYork" && "ring-amber-500/50"
          )}
        >
          {killzone && <Zap className="h-3 w-3 mr-1" />}
          {session.name}
        </Badge>
        {killzone ? (
          <span
            className={cn(
              "text-xs font-medium",
              session.key === "london" && "text-emerald-600 dark:text-emerald-400",
              session.key === "newYork" && "text-amber-600 dark:text-amber-400"
            )}
          >
            {killzone}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Ends in {formatMinutes(session.endsInMinutes)}
          </span>
        )}
      </div>
      <SessionTimesReference activeSessionKeys={activeSessionKeys} />
    </div>
  );
}
