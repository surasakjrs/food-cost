import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("username").eq("user_id", user.id).maybeSingle()
    : { data: null };

  async function signOut() {
    "use server";
    const { createClient } = await import("@/lib/supabase/server");
    const { redirect } = await import("next/navigation");
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="brand">FoodCost</Link>
        <nav className="nav">
          <Link href="/">ภาพรวม</Link>
          <Link href="/ingredients">วัตถุดิบ</Link>
          <Link href="/recipes">สูตรย่อย</Link>
          <Link href="/menus">เมนู</Link>
          <Link href="/stock">สต็อก</Link>
          <Link href="/purchases">สั่งซื้อ</Link>
          <Link href="/suppliers">Supplier</Link>
          <Link href="/prices">ราคา</Link>
          <span className="muted hide-mobile user-chip">{profile?.username || "user"}</span>
          <form action={signOut}><button type="submit">ออก</button></form>
        </nav>
      </header>
      <main className="container">{children}</main>
    </div>
  );
}
