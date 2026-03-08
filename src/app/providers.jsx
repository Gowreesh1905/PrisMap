"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { ShortcutProvider } from "@/contexts/ShortcutContext";
import AppLayout from "@/components/AppLayout";

export default function Providers({ children }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <ShortcutProvider>
                {children}
            </ShortcutProvider>
        </ThemeProvider>
    );
}
