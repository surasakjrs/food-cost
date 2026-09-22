import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeUsername, validateUsername } from "@/lib/auth";
import { randomUUID } from "node:crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const rePassword = String(body.rePassword || "");
    const usernameError = validateUsername(username);

    if (usernameError) return NextResponse.json({ error: usernameError }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
    if (password !== rePassword) return NextResponse.json({ error: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" }, { status: 400 });

    const normalized = normalizeUsername(username);
    const authEmail = `${randomUUID()}@foodcost.invalid`;
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("profiles")
      .select("user_id")
      .eq("username_normalized", normalized)
      .maybeSingle();
    if (existing) return NextResponse.json({ error: "Username นี้ถูกใช้งานแล้ว" }, { status: 409 });

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message || "สร้างบัญชีไม่สำเร็จ" }, { status: 400 });
    }

    const { error: profileError } = await admin.from("profiles").insert({
      user_id: created.user.id,
      username,
      username_normalized: normalized,
      auth_email: authEmail,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: profileError.code === "23505" ? "Username นี้ถูกใช้งานแล้ว" : profileError.message }, { status: 400 });
    }

    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: authEmail, password });
    if (signInError) return NextResponse.json({ error: signInError.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
