"use client";

import { useEffect, useMemo, useState } from "react";

type User = { telegram_id: number; first_name: string; last_name?: string; username?: string; language_code?: string; first_seen: string; last_seen: string };
type Analytics = {
  summary: { totalVisitors: number; webVisitors: number; telegramVisitors: number; activeToday: number; totalVisits: number };
  daily: { date: string; visitors: number; visits: number }[];
  devices: { device: string; visitors: number }[];
};

const emptyAnalytics: Analytics = {
  summary: { totalVisitors: 0, webVisitors: 0, telegramVisitors: 0, activeToday: 0, totalVisits: 0 },
  daily: [],
  devices: [],
};

const deviceLabels: Record<string, string> = { mobile: "Телефоны", tablet: "Планшеты", desktop: "Компьютеры" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>(emptyAnalytics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { users: User[]; analytics: Analytics }) => {
        setUsers(data.users);
        setAnalytics(data.analytics);
      })
      .catch(() => setError("Не удалось загрузить статистику."))
      .finally(() => setLoading(false));
  }, []);

  const maxDailyVisitors = useMemo(() => Math.max(1, ...analytics.daily.map((item) => item.visitors)), [analytics.daily]);
  const summaryCards = [
    ["Уникальные посетители", analytics.summary.totalVisitors],
    ["Обычный сайт", analytics.summary.webVisitors],
    ["Через Telegram", analytics.summary.telegramVisitors],
    ["Активны сегодня", analytics.summary.activeToday],
    ["Всего визитов", analytics.summary.totalVisits],
  ] as const;

  return <main className="admin-shell">
    <header><a className="admin-back" href="/admin">← К АДМИНКЕ</a><p>KITSUN NO STORE / ADMIN</p></header>
    <h1>Пользователи</h1>
    <p className="admin-intro">Анонимная статистика всех посетителей сайта и пользователи, вошедшие через Telegram.</p>
    {loading ? <p>Загрузка…</p> : error ? <p className="admin-error">{error}</p> : <>
      <section className="analytics-cards" aria-label="Сводная статистика">
        {summaryCards.map(([label, value]) => <article key={label}><strong>{value.toLocaleString("ru-RU")}</strong><span>{label}</span></article>)}
      </section>

      <section className="analytics-panel">
        <div className="analytics-heading"><div><p>АКТИВНОСТЬ</p><h2>Последние 14 дней</h2></div><small>Уникальные посетители за день</small></div>
        <div className="analytics-chart">
          {analytics.daily.map((item) => <div className="analytics-day" key={item.date} title={`${item.visitors} посетителей · ${item.visits} визитов`}>
            <b>{item.visitors || ""}</b>
            <i style={{ height: `${Math.max(item.visitors ? 8 : 2, item.visitors / maxDailyVisitors * 100)}%` }} />
            <span>{new Date(`${item.date}T00:00:00`).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}</span>
          </div>)}
        </div>
      </section>

      <section className="analytics-devices">
        <p>УСТРОЙСТВА</p>
        {analytics.devices.length ? analytics.devices.map((item) => <div key={item.device}><span>{deviceLabels[item.device] || item.device}</span><b>{item.visitors.toLocaleString("ru-RU")}</b></div>) : <small>Данные появятся после первых визитов.</small>}
      </section>

      <section className="admin-users">
        <div className="analytics-heading"><div><p>TELEGRAM</p><h2>Авторизованные пользователи</h2></div><small>Всего / {users.length}</small></div>
        {users.length ? users.map((user) => <article key={user.telegram_id}><div><b>{[user.first_name, user.last_name].filter(Boolean).join(" ")}</b><small>{user.username ? `@${user.username}` : `ID ${user.telegram_id}`}</small></div><time>Последний вход<br />{new Date(user.last_seen).toLocaleString("ru-RU")}</time></article>) : <p>Пока нет авторизованных пользователей.</p>}
      </section>
    </>}
  </main>;
}
