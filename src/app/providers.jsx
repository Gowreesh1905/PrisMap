"use client";

import { ShortcutProvider } from "@/contexts/ShortcutContext";

/**
 * Client-side providers wrapper.
 * Wraps the app with all client-side context providers.
 */
export default function Providers({ children }) {
    return (
        <ShortcutProvider>
            {children}
        </ShortcutProvider>
    );
}
