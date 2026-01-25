"use client";

import React from "react";
import { Search, Moon, Settings, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

/**
 * @typedef {Object} NavbarProps
 * @property {import("firebase/auth").User | null} user - The authenticated Firebase user instance.
 */

/**
 * Navbar Component (The Utility Cluster).
 * * A floating, pill-shaped navigation bar that provides global utilities including 
 * search, theme toggling, and user profile management. It utilizes glassmorphism 
 * and theme-aware styling.
 * * @component
 * @param {NavbarProps} props - Component properties.
 * @returns {React.JSX.Element} The rendered Navbar component.
 */
export default function Navbar({ user }) {
  const router = useRouter();

  /**
   * Toggles the 'dark' class on the document root element to switch themes.
   * Persists the user's preference in localStorage.
   * * @function toggleTheme
   * @returns {void}
   */
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  /**
   * Sign out the user from Firebase Authentication.
   * Redirects the user to the landing page upon successful logout.
   * * @async
   * @function handleLogout
   * @returns {Promise<void>}
   */
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <nav className="fixed top-6 left-1/2 z-50 flex w-[90%] max-w-4xl -translate-x-1/2 items-center justify-between rounded-full border border-[var(--color-border-ui)] bg-[var(--color-nav)] px-6 py-2 shadow-2xl glass-effect">
      {/* Brand Logo with Dark-Mode Glossy Effect */}
      <div className="flex-shrink-0 text-xl font-bold tracking-tight dark:text-glossy-intellij">
        Prisync
      </div>

      <div className="flex-grow" />

      {/* Utility Action Cluster */}
      <div className="flex items-center gap-1 sm:gap-3">
        <button 
          aria-label="Search"
          className="rounded-full p-2 text-slate-400 hover:text-[var(--color-text-main)] transition-colors"
        >
          <Search size={19} />
        </button>
        <button 
          onClick={toggleTheme}
          aria-label="Toggle Dark Mode"
          className="rounded-full p-2 text-slate-400 hover:text-[var(--color-text-main)] transition-colors"
        >
          <Moon size={19} />
        </button>
        <button 
          aria-label="Settings"
          className="rounded-full p-2 text-slate-400 hover:text-[var(--color-text-main)] transition-colors"
        >
          <Settings size={19} />
        </button>
        
        {/* User Profile / Logout Trigger */}
        <button 
          onClick={handleLogout}
          className="ml-2 h-9 w-9 overflow-hidden rounded-full border-2 border-white/20 shadow-sm active:scale-90 transition-transform"
          title="Log Out"
        >
          <img 
            src={user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`} 
            alt="User Profile" 
            className="h-full w-full object-cover"
          />
        </button>
      </div>
    </nav>
  );
}