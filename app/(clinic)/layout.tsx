import type { ReactNode } from "react";

import { SidebarDrawer } from "@/components/clinic/sidebar-drawer";

export default function ClinicLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-transparent">
      <SidebarDrawer>{children}</SidebarDrawer>
    </main>
  );
}
