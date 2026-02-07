"use client";

import React, { useState, useEffect } from "react";
import { Search, Moon, Sun, Settings, LogOut, X, Keyboard } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

/**
 * @typedef {Object} NavbarProps
 * @property {import("firebase/auth").User | null} user - The authenticated Firebase user instance.
 * @property {Array} [projects] - List of projects for search functionality.
 */

/**
 * Navbar Component (The Utility Cluster).
 * A floating, pill-shaped navigation bar that provides global utilities including 
 * search, theme toggling, and user profile management. It utilizes glassmorphism 
 * and theme-aware styling.
 * 
 * @component
 * @param {NavbarProps} props - Component properties.
 * @returns {React.JSX.Element} The rendered Navbar component.
 */
export default function Navbar({ user, projects = [] }) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize theme state from DOM on mount
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  /**
   * Toggles the 'dark' class on the document root element to switch themes.
   * Persists the user's preference in localStorage.
   * @function toggleTheme
   * @returns {void}
   */
  const toggleTheme = () => {
    const newIsDark = document.documentElement.classList.toggle("dark");
    setIsDark(newIsDark);
    localStorage.setItem("theme", newIsDark ? "dark" : "light");
  };

  /**
   * Sign out the user from Firebase Authentication.
   * Redirects the user to the landing page upon successful logout.
   * @async
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

  // Filter projects based on search query
  const filteredProjects = projects.filter(project =>
    project.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle keyboard shortcut for search and settings
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K: Open search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      // Ctrl+,: Navigate to settings
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        router.push("/settings_page");
      }
      // Escape: Close search
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <>
      <nav className="fixed top-6 left-1/2 z-50 flex w-[90%] max-w-4xl -translate-x-1/2 items-center justify-between rounded-full border border-[var(--color-border-ui)] bg-[var(--color-nav)] px-6 py-2 shadow-2xl glass-effect">
        {/* Brand Logo with Dark-Mode Glossy Effect */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex-shrink-0 text-xl font-bold tracking-tight dark:text-glossy-intellij hover:opacity-80 transition-opacity"
        >
          Prisync
        </button>

        <div className="flex-grow" />

        {/* Utility Action Cluster */}
        <div className="flex items-center gap-1 sm:gap-3">
          <button
            onClick={() => setSearchOpen(true)}
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
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button
            onClick={() => router.push("/shortcuts")}
            aria-label="Keyboard Shortcuts"
            title="Keyboard Shortcuts"
            className="rounded-full p-2 text-slate-400 hover:text-[var(--color-text-main)] transition-colors"
          >
            <Keyboard size={19} />
          </button>
          <button
            onClick={() => router.push("/settings_page")}
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
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </button>
        </div>
      </nav>

      {/* Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
          onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-[var(--color-border-ui)] bg-[var(--color-card)] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-ui)]">
              <Search size={20} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="flex-1 bg-transparent text-[var(--color-text-main)] placeholder-slate-500 outline-none text-base"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-slate-700/50 px-2 py-0.5 text-xs text-slate-400 font-mono">
                ESC
              </kbd>
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                className="text-slate-400 hover:text-[var(--color-text-main)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Results */}
            <div className="max-h-80 overflow-y-auto p-2">
              {searchQuery && filteredProjects.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500">
                  No projects found for "{searchQuery}"
                </div>
              ) : searchQuery ? (
                filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      router.push(`/canvas/${project.id}`);
                      setSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-purple-500/10 transition-colors"
                  >
                    <div className="h-8 w-8 rounded bg-purple-500/20 flex items-center justify-center text-purple-400">
                      <Search size={14} />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text-main)]">
                        {project.title || "Untitled Project"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {project.createdAt?.toDate?.()?.toLocaleDateString() || "Recently created"}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-slate-500 text-sm">
                  Start typing to search your projects...
                  <div className="mt-2 text-xs text-slate-600">
                    Tip: Press <kbd className="px-1 py-0.5 rounded bg-slate-700/50 font-mono">Ctrl+K</kbd> to open search anytime
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
