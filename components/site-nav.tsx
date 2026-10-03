import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export async function SiteNav() {
  const session = await auth();

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
        <Logo />
        <nav className="flex items-center gap-3 text-sm font-medium">
          <ThemeToggle />
          {session?.user?.role === "admin" && (
            <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
              Admin
            </Link>
          )}
          {session?.user?.role === "learner" && (
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
          )}
          {session?.user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          ) : (
            <>
              <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                Log in
              </Link>
              <Link
                href="/signup"
                className={cn(buttonVariants({ size: "sm" }), "bg-accent text-accent-foreground hover:bg-accent/90")}
              >
                Start learning
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
