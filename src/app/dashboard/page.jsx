"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Plus, Layout, Loader2, UserCheck, ArrowRight, Key, LogIn, X } from "lucide-react";
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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinKey, setJoinKey] = useState("");
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
     * Two queries: (1) canvases owned by user, (2) canvases shared with user.
     * Results are merged and deduplicated.
     */
    const ownedQuery = query(
      collection(db, "canvases"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const sharedQuery = query(
      collection(db, "canvases"),
      where("collaborators", "array-contains", user.uid)
    );

    let ownedProjects = [];
    let sharedProjects = [];

    const mergeProjects = () => {
      // Merge and deduplicate (a canvas could match both queries)
      const allProjects = [...ownedProjects];
      const ownedIds = new Set(ownedProjects.map(p => p.id));
      sharedProjects.forEach(p => {
        if (!ownedIds.has(p.id)) {
          allProjects.push({ ...p, _isShared: true });
        }
      });
      setProjects(allProjects);
      setLoading(false);
    };

    const unsubOwned = onSnapshot(ownedQuery, (snap) => {
      ownedProjects = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      mergeProjects();
    }, (error) => {
      if (error.code !== "permission-denied") {
        console.error("Error fetching owned projects:", error);
      }
    });

    const unsubShared = onSnapshot(sharedQuery, (snap) => {
      sharedProjects = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), _isShared: true }));
      mergeProjects();
    }, (error) => {
      if (error.code !== "permission-denied") {
        console.error("Error fetching shared projects:", error);
      }
    });

    return () => {
      unsubOwned();
      unsubShared();
    };
  }, [user]);

  // Check Profile Completion Status
  useEffect(() => {
    if (!user) return;

    const checkProfile = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          // Check if essential fields are missing
          if (!data.bio || !data.jobTitle || !data.phoneNumber) {
            setShowProfileModal(true);
          }
        } else {
          // User doc doesn't exist yet, definitely new
          setShowProfileModal(true);
        }
      } catch (error) {
        console.error("Error checking profile:", error);
      }
    };

    checkProfile();
  }, [user]);

  /**
   * Generates a unique UUID and navigates the user to the canvas workspace.
   * @function handleCreateCanvas
   */
  const handleCreateCanvas = () => {
    const newId = crypto.randomUUID();
    router.push(`/canvas/${newId}`);
  };

  /**
   * Generates a 6-digit key and navigates the user to the canvas workspace with that ID.
   * @function handleCreateWithKey
   */
  const handleCreateWithKey = () => {
    const newId = Math.floor(100000 + Math.random() * 900000).toString();
    router.push(`/canvas/${newId}`);
  };

  /**
   * Joins a canvas by a 6-digit key.
   * @function handleJoinCanvas
   */
  const handleJoinCanvas = (e) => {
    e.preventDefault();
    if (joinKey.trim().length === 6) {
      router.push(`/canvas/${joinKey.trim()}`);
      setShowJoinModal(false);
      setJoinKey("");
    } else {
      alert("Please enter a valid 6-digit key.");
    }
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

      <Navbar user={user} projects={projects} />

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

          {/* Create with 6-digit Key Action Card */}
          <button
            onClick={handleCreateWithKey}
            className="group aspect-[4/5] flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-indigo-300/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all duration-300"
          >
            <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/10">
              <Key />
            </div>
            <span className="mt-4 text-sm font-semibold text-indigo-300">Create Key</span>
          </button>

          {/* Join with Key Action Card */}
          <button
            onClick={() => setShowJoinModal(true)}
            className="group aspect-[4/5] flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-blue-300/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all duration-300"
          >
            <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/10">
              <LogIn />
            </div>
            <span className="mt-4 text-sm font-semibold text-blue-300">Join by Key</span>
          </button>

          {/* Project Mapping Area */}
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              title={project.title}
              date={project.createdAt?.toDate()}
              id={project.id}
              isShared={project._isShared}
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

      {/* Join via Key Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-3xl border border-blue-500/30 bg-[var(--color-card)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <button
              onClick={() => setShowJoinModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-[var(--color-text-main)] transition-colors"
            >
              <X size={24} />
            </button>
            <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 p-6 flex flex-col items-center">
              <div className="h-16 w-16 mb-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <LogIn size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--color-text-main)]">Join with Key</h2>
            </div>
            <div className="p-8 text-center">
              <p className="text-slate-400 mb-6">Enter the 6-digit canvas key provided by your collaborator.</p>
              <form onSubmit={handleJoinCanvas} className="flex flex-col gap-4">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 123456"
                  value={joinKey}
                  onChange={(e) => setJoinKey(e.target.value)}
                  className="w-full text-center tracking-widest text-2xl px-4 py-3 bg-[var(--color-bg-base)] border border-[var(--color-border-ui)] rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-[var(--color-text-main)]"
                />
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all"
                >
                  Join Canvas
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Complete Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-purple-500/30 bg-[var(--color-card)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 p-6 flex flex-col items-center">
              <div className="h-16 w-16 mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <UserCheck size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--color-text-main)]">Complete Your Profile</h2>
            </div>

            {/* Content */}
            <div className="p-8 text-center">
              <p className="text-slate-400 mb-6">
                Welcome to PrisMap! Take a moment to set up your professional profile to help others recognize you.
              </p>

              <ul className="text-left space-y-3 mb-8 bg-[var(--color-bg-base)]/50 p-4 rounded-xl border border-[var(--color-border-ui)]">
                <li className="flex items-center gap-3 text-sm text-[var(--color-text-main)]">
                  <div className="h-2 w-2 rounded-full bg-purple-400" />
                  Add a professional bio
                </li>
                <li className="flex items-center gap-3 text-sm text-[var(--color-text-main)]">
                  <div className="h-2 w-2 rounded-full bg-indigo-400" />
                  Set your job title
                </li>
                <li className="flex items-center gap-3 text-sm text-[var(--color-text-main)]">
                  <div className="h-2 w-2 rounded-full bg-blue-400" />
                  Verify contact details
                </li>
              </ul>

              <button
                onClick={() => router.push("/settings_page?edit=true")}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all"
              >
                Setup Profile Now
                <ArrowRight size={18} />
              </button>

              <button
                onClick={() => setShowProfileModal(false)}
                className="mt-4 text-sm text-slate-500 hover:text-slate-400 transition-colors"
              >
                I'll do this later
              </button>
            </div>
          </div>
        </div>
      )}
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
function ProjectCard({ title, date, id, isShared }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/canvas/${id}`)}
      className="group aspect-[4/5] cursor-pointer flex flex-col rounded-3xl bg-[var(--color-card)] ring-1 ring-[var(--color-border-ui)] hover:-translate-y-1 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/15"
    >
      {/* 75% Preview Section with Abstract Grid Background */}
      <div className="h-[75%] bg-slate-900/40 rounded-t-3xl flex items-center justify-center p-4 relative">
        <div className="h-full w-full rounded-xl border border-[var(--color-border-ui)] flex items-center justify-center bg-[radial-gradient(var(--color-border-ui)_1px,transparent_1px)] [background-size:14px_14px]">
          <Layout className="text-slate-700 group-hover:text-purple-400 transition-colors" size={32} />
        </div>
        {/* Shared badge */}
        {isShared && (
          <span className="absolute top-3 right-3 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-sm border border-blue-500/20">
            Shared
          </span>
        )}
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