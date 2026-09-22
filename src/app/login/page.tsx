"use client";

import Link from "next/link";
import { SyntheticEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: SyntheticEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error || "เข้าสู่ระบบไม่สำเร็จ");
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>FoodCost</h1>
        <p className="muted">เข้าสู่ระบบด้วย Username และรหัสผ่าน</p>
        <form className="stack" onSubmit={submit}>
          <div className="field"><label>Username</label><input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required /></div>
          <div className="field"><label>รหัสผ่าน</label><input type="password" autoComplete="current-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          {message && <div className="error">{message}</div>}
          <button className="btn" disabled={busy}>{busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
          <Link className="btn secondary" href="/register">สมัครบัญชีใหม่</Link>
        </form>
      </div>
    </main>
  );
}
