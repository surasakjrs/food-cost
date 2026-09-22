import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
          <Link href="/menus">เมนู</Link>
          <span className="muted hide-mobile" style={{ fontSize: 12 }}>{user?.email}</span>
          <form action={signOut}><button type="submit">ออกจากระบบ</button></form>
        </nav>
      </header>
      <main className="container">{children}</main>
    </div>
  );
}
