"use client";

import { useEffect, useState } from "react";

type User = { telegram_id: number; first_name: string; last_name?: string; username?: string; language_code?: string; first_seen: string; last_seen: string };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/admin/users").then((response) => response.ok ? response.json() : Promise.reject()).then((data) => setUsers(data.users)).catch(() => setUsers([])).finally(() => setLoading(false)); }, []);
  return <main className="admin-shell"><header><a className="admin-back" href="/admin">← К АДМИНКЕ</a><p>KITSUN NO STORE / ADMIN</p></header><h1>Пользователи</h1><p className="admin-intro">Пользователи, которые открывали приложение через Telegram.</p>{loading ? <p>Загрузка…</p> : <section className="admin-users"><p>Всего / {users.length}</p>{users.length ? users.map((user) => <article key={user.telegram_id}><div><b>{[user.first_name, user.last_name].filter(Boolean).join(" ")}</b><small>{user.username ? `@${user.username}` : `ID ${user.telegram_id}`}</small></div><time>Последний вход<br />{new Date(user.last_seen).toLocaleString("ru-RU")}</time></article>) : <p>Пока нет авторизованных пользователей.</p>}</section>}</main>;
}
