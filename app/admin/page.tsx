"use client";

import "./admin.css";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

export default function AdminHome() {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/admin/auth").then((response) => response.json()).then((data) => setAuthorized(data.authenticated)).finally(() => setReady(true)); }, []);
  async function login(event: FormEvent) { event.preventDefault(); setMessage(""); const response = await fetch("/api/admin/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) }); if (!response.ok) return setMessage("Неверный пароль"); setPassword(""); setAuthorized(true); }
  if (!ready) return <main className="admin-shell">Загрузка…</main>;
  if (!authorized) return <main className="admin-login"><p>KITSUN NO STORE / ADMIN</p><h1>Вход</h1><form onSubmit={login}><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Пароль" autoFocus /><button>ВОЙТИ</button></form>{message && <small>{message}</small>}</main>;
  return <main className="admin-shell"><header><Link className="admin-back" href="/">← К КАТАЛОГУ</Link><p>KITSUN NO STORE / ADMIN</p></header><h1>Админка</h1><p className="admin-intro">Выберите раздел.</p><nav className="admin-menu"><Link href="/admin/products#products"><b>Товары / редактирование</b><i>→</i></Link><Link href="/admin/users"><b>Пользователи</b><i>→</i></Link></nav></main>;
}
