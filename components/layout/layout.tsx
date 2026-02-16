import { Nav } from "@/components/layout/nav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-4 p-4 lg:flex-row">
      <Nav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
