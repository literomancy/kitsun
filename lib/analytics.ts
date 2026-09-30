import { neon } from "@neondatabase/serverless";

export type VisitSource = "web" | "telegram";
export type DeviceType = "mobile" | "tablet" | "desktop";

let analyticsReady: Promise<void> | undefined;

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

async function ensureAnalytics() {
  if (!analyticsReady) analyticsReady = (async () => {
    const db = sql();
    await db`CREATE TABLE IF NOT EXISTS analytics_visitors (
      visitor_id UUID PRIMARY KEY,
      source TEXT NOT NULL CHECK (source IN ('web', 'telegram')),
      device TEXT NOT NULL CHECK (device IN ('mobile', 'tablet', 'desktop')),
      visit_count INTEGER NOT NULL DEFAULT 1,
      first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await db`CREATE TABLE IF NOT EXISTS analytics_daily_visits (
      visitor_id UUID NOT NULL,
      visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
      source TEXT NOT NULL CHECK (source IN ('web', 'telegram')),
      visit_count INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (visitor_id, visit_date)
    )`;
    await db`CREATE INDEX IF NOT EXISTS analytics_visitors_last_seen_idx ON analytics_visitors (last_seen DESC)`;
    await db`CREATE INDEX IF NOT EXISTS analytics_daily_visits_date_idx ON analytics_daily_visits (visit_date DESC)`;
  })();
  await analyticsReady;
}

export function detectDevice(userAgent: string): DeviceType {
  if (/ipad|tablet|kindle|silk|playbook/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return "mobile";
  return "desktop";
}

export async function recordVisit(visitorId: string, source: VisitSource, device: DeviceType) {
  await ensureAnalytics();
  const db = sql();
  await db`INSERT INTO analytics_visitors (visitor_id, source, device)
    VALUES (${visitorId}::uuid, ${source}, ${device})
    ON CONFLICT (visitor_id) DO UPDATE SET
      source = CASE WHEN EXCLUDED.source = 'telegram' THEN 'telegram' ELSE analytics_visitors.source END,
      device = EXCLUDED.device,
      visit_count = analytics_visitors.visit_count + 1,
      last_seen = NOW()`;
  await db`INSERT INTO analytics_daily_visits (visitor_id, visit_date, source)
    VALUES (${visitorId}::uuid, (NOW() AT TIME ZONE 'Europe/Moscow')::date, ${source})
    ON CONFLICT (visitor_id, visit_date) DO UPDATE SET
      source = CASE WHEN EXCLUDED.source = 'telegram' THEN 'telegram' ELSE analytics_daily_visits.source END,
      visit_count = analytics_daily_visits.visit_count + 1`;
}

export async function getAnalyticsDashboard() {
  await ensureAnalytics();
  const db = sql();
  const [summaryRows, dailyRows, deviceRows] = await Promise.all([
    db`SELECT
      COUNT(*)::INTEGER AS total_visitors,
      COUNT(*) FILTER (WHERE source = 'web')::INTEGER AS web_visitors,
      COUNT(*) FILTER (WHERE source = 'telegram')::INTEGER AS telegram_visitors,
      COUNT(*) FILTER (WHERE last_seen >= (DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Moscow') AT TIME ZONE 'Europe/Moscow'))::INTEGER AS active_today,
      COALESCE(SUM(visit_count), 0)::INTEGER AS total_visits
    FROM analytics_visitors`,
    db`WITH days AS (
      SELECT GENERATE_SERIES((NOW() AT TIME ZONE 'Europe/Moscow')::date - INTERVAL '13 days', (NOW() AT TIME ZONE 'Europe/Moscow')::date, INTERVAL '1 day')::date AS day
    )
    SELECT TO_CHAR(days.day, 'YYYY-MM-DD') AS day,
      COALESCE(COUNT(DISTINCT visits.visitor_id), 0)::INTEGER AS visitors,
      COALESCE(SUM(visits.visit_count), 0)::INTEGER AS visits
    FROM days
    LEFT JOIN analytics_daily_visits visits ON visits.visit_date = days.day
    GROUP BY days.day ORDER BY days.day`,
    db`SELECT device, COUNT(*)::INTEGER AS visitors FROM analytics_visitors GROUP BY device ORDER BY visitors DESC`,
  ]);

  const summary = summaryRows[0] || {};
  return {
    summary: {
      totalVisitors: Number(summary.total_visitors || 0),
      webVisitors: Number(summary.web_visitors || 0),
      telegramVisitors: Number(summary.telegram_visitors || 0),
      activeToday: Number(summary.active_today || 0),
      totalVisits: Number(summary.total_visits || 0),
    },
    daily: dailyRows.map((row) => ({
      date: String(row.day),
      visitors: Number(row.visitors),
      visits: Number(row.visits),
    })),
    devices: deviceRows.map((row) => ({ device: String(row.device), visitors: Number(row.visitors) })),
  };
}
