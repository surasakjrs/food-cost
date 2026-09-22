"use client";

import { SyntheticEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function submit(event: SyntheticEvent, mode: "login" | "signup") {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    setBusy(false);
    if (result.error) return setMessage(result.error.message);

    if (mode === "signup" && !result.data.session) {
      return setMessage("สมัครสำเร็จ กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ");
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>FoodCost</h1>
        <p className="muted">คำนวณต้นทุนต่อเมนูแบบเข้าใจง่าย</p>
        <form className="stack">
          <div className="field"><label>อีเมล</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="field"><label>รหัสผ่าน</label><input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          {message && <div className={message.startsWith("สมัคร") ? "success" : "error"}>{message}</div>}
          <button type="button" className="btn" disabled={busy} onClick={(e) => submit(e, "login")}>{busy ? "กำลังดำเนินการ..." : "เข้าสู่ระบบ"}</button>
          <button type="button" className="btn secondary" disabled={busy} onClick={(e) => submit(e, "signup")}>สมัครบัญชีใหม่</button>
        </form>
      </div>
    </main>
  );
}
