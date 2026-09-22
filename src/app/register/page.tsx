"use client";

import Link from "next/link";
import { SyntheticEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: SyntheticEvent) {
    event.preventDefault();
    setMessage("");
    if (password !== rePassword) return setMessage("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
    setBusy(true);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password, rePassword }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error || "สมัครบัญชีไม่สำเร็จ");
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>สมัคร FoodCost</h1>
        <p className="muted">ไม่ใช้อีเมล ไม่ใช้ OTP และไม่ต้องยืนยันบัญชี</p>
        <form className="stack" onSubmit={submit}>
          <div className="field"><label>Username</label><input autoComplete="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9._-]+" value={username} onChange={(e) => setUsername(e.target.value)} required /></div>
          <div className="field"><label>รหัสผ่าน</label><input type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <div className="field"><label>ยืนยันรหัสผ่าน</label><input type="password" autoComplete="new-password" minLength={6} value={rePassword} onChange={(e) => setRePassword(e.target.value)} required /></div>
          {message && <div className="error">{message}</div>}
          <button className="btn" disabled={busy}>{busy ? "กำลังสร้างบัญชี..." : "สมัครบัญชี"}</button>
          <Link className="btn secondary" href="/login">กลับไปเข้าสู่ระบบ</Link>
        </form>
      </div>
    </main>
  );
}
