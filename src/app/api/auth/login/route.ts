import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeUsername } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = normalizeUsername(String(body.username || ""));
    const password = String(body.password || "");
    if (!username || !password) return NextResponse.json({ error: "กรอก Username และรหัสผ่าน" }, { status: 400 });

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("auth_email")
      .eq("username_normalized", username)
      .maybeSingle();

    if (!profile) return NextResponse.json({ error: "Username หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: profile.auth_email,
      password,
    });
    if (error) return NextResponse.json({ error: "Username หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
