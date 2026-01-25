"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore"; 
import { auth, db } from "@/lib/firebase";
import { Plus, Layout, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

/**
 * Dashboard Component.
 * * The primary protected view for authenticated users. It manages authentication 
 * lifecycle, real-time Firestore subscriptions for canvas projects, and 
 * handles canvas creation routing.
 * * @component
 * @returns {React.JSX.Element} The rendered Dashboard page.
 */
export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const router = useRouter();

  useEffect(() => {
    /**
     * Authentication Listener.
     * Redirects to the root login page if the user session is invalid.
     * @listens onAuthStateChanged
     */
    const unsubscribeAuth = onAuthStateChanged(auth, (curr) => {
      if (!curr) {
        router.push("/");
      } else {
        setUser(curr);
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    /**
     * Real-time Firestore project listener.
     * Queries the 'canvases' collection filtered by the current user's UID.
     * * @param {string} user.uid - The current user's identifier.
     * @returns {import("firebase/firestore").Unsubscribe} Cleanup function.
     */
    const q = query(
      collection(db, "canvases"), 
      where("ownerId", "==", user.uid), 
      orderBy("createdAt", "desc")
    );

    const unsubscribeProjects = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribeProjects();
  }, [user]);

  /**
   * Generates a unique UUID and navigates the user to the canvas workspace.
   * @function handleCreateCanvas
   */
  const handleCreateCanvas = () => {
    const newId = crypto.randomUUID();
    router.push(`/canvas/${newId}`);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--color-bg-base)]">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[var(--color-bg-base)]">
      {/* Decorative Gradient Background Elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <Navbar user={user} />

      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-32 pb-20">
        <header className="mb-10 flex justify-between items-end">
          <h1 className="text-3xl font-bold text-[var(--color-text-main)]">My Canvases</h1>
          <p className="text-sm font-medium text-slate-500">{projects.length} Total Projects</p>
        </header>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {/* Create New Canvas Action Card */}
          <button 
            onClick={handleCreateCanvas} 
            className="group aspect-[4/5] flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-purple-300/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all duration-300"
          >
            <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/10">
              <Plus />
            </div>
            <span className="mt-4 text-sm font-semibold text-purple-300">New Project</span>
          </button>

          {/* Project Mapping Area */}
          {projects.map((project) => (
            <ProjectCard 
              key={project.id} 
              title={project.title} 
              date={project.createdAt?.toDate()} 
              id={project.id} 
            />
          ))}
        </section>

        {/* Empty State: Only visible if projects array is empty */}
        {projects.length === 0 && (
          <div className="mt-24 flex flex-col items-center justify-center text-center opacity-60">
            <Layout size={48} className="mb-4 text-slate-600" />
            <p className="text-lg font-medium text-[var(--color-text-main)]">Your workspace is empty</p>
            <p className="text-sm text-slate-500">Create your first infinite canvas to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * @typedef {Object} ProjectCardProps
 * @property {string} [title] - The display title of the project.
 * @property {Date} [date] - The JavaScript Date object representing the last edit.
 * @property {string} id - The unique Firestore document ID.
 */

/**
 * ProjectCard Component.
 * * Displays a visual preview and metadata for a specific canvas.
 * Implements Obsidian Dark Mode with glossy IntelliJ-style typography.
 * * @component
 * @param {ProjectCardProps} props - Component properties.
 * @returns {React.JSX.Element} The rendered project card.
 */
function ProjectCard({ title, date, id }) {
  const router = useRouter();
  
  return (
    <div 
      onClick={() => router.push(`/canvas/${id}`)}
      className="group aspect-[4/5] cursor-pointer flex flex-col rounded-3xl bg-[var(--color-card)] ring-1 ring-[var(--color-border-ui)] hover:-translate-y-1 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/15"
    >
      {/* 75% Preview Section with Abstract Grid Background */}
      <div className="h-[75%] bg-slate-900/40 rounded-t-3xl flex items-center justify-center p-4">
        <div className="h-full w-full rounded-xl border border-[var(--color-border-ui)] flex items-center justify-center bg-[radial-gradient(var(--color-border-ui)_1px,transparent_1px)] [background-size:14px_14px]">
          <Layout className="text-slate-700 group-hover:text-purple-400 transition-colors" size={32} />
        </div>
      </div>

      {/* 25% Information Section */}
      <div className="h-[25%] px-6 flex flex-col justify-center">
        <h3 className="text-sm font-bold truncate dark:text-glossy-intellij leading-tight">
          {title || "Untitled Project"}
        </h3>
        <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">
          {date ? `Edited ${date.toLocaleDateString()}` : "Modified recently"}
        </p>
      </div>
    </div>
  );
}