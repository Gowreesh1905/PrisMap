"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }) {
    const pathname = usePathname();

    // Define paths where the sidebar should NOT appear
    const noSidebarPaths = ["/"];

    const isNoSidebarPage = noSidebarPaths.includes(pathname);

    if (isNoSidebarPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[var(--color-bg-base)]">
            <Sidebar />
            <main className="flex-1 overflow-hidden relative">
                {children}
            </main>
        </div>
    );
}
