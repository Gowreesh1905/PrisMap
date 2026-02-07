"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  ArrowLeft,
  User,
  Camera,
  Briefcase,
  FileText,
  Save,
  Loader2,
  AlertTriangle,
  Trash2,
  X,
  Edit2, // Added Edit2 icon
} from "lucide-react";
import { useSearchParams } from "next/navigation"; // Import useSearchParams
import Navbar from "@/components/Navbar";

/**
 * Settings Page Component.
 * 
 * @description
 * Allows users to manage their profile data and account settings.
 * This component provides a comprehensive interface for:
 * - Updating extended profile information (avatar, bio, job title, phone).
 * - Toggling between "View" and "Edit" modes for profile details.
 * - Permanently deleting the user account and all associated data (projects, canvases).
 * 
 * @remarks
 * Uses glassmorphism design principles to match the dashboard aesthetic.
 * All data persistence is handled via Firebase Firestore.
 * 
 * @component
 * @returns {React.JSX.Element} The rendered Settings page.
 */
export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // -- State: UI & Loading --
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} Loading state for initial data fetch */
  const [loading, setLoading] = useState(true);
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} Loading state for save operations */
  const [saving, setSaving] = useState(false);
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} Toggles view/edit mode for profile fields */
  const [isEditing, setIsEditing] = useState(false);
  /** @type {[import("firebase/auth").User | null, React.Dispatch<React.SetStateAction<import("firebase/auth").User | null>>]} Current authenticated user */
  const [user, setUser] = useState(null);

  // -- State: Profile Data --
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} Custom avatar URL string */
  const [customAvatar, setCustomAvatar] = useState("");
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} User biography text */
  const [bio, setBio] = useState("");
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} User job title/role */
  const [jobTitle, setJobTitle] = useState("");
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} User phone number */
  const [phoneNumber, setPhoneNumber] = useState("");
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} Feedback message for save operations */
  const [saveMessage, setSaveMessage] = useState("");

  // -- State: Account Deletion --
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} Controls visibility of delete confirmation modal */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} Input value for deletion confirmation text */
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  /** @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]} Loading state during deletion process */
  const [deleting, setDeleting] = useState(false);

  /**
   * Effect: Monitors authentication state.
   * Redirects to home if no user is found.
   * Checks URL search params to potentially enable edit mode automatically.
   */
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (curr) => {
      if (!curr) {
        router.push("/");
      } else {
        setUser(curr);
        // Check for edit mode param
        if (searchParams.get("edit") === "true") {
          setIsEditing(true);
        }
      }
    });
    return () => unsubscribeAuth();
  }, [router, searchParams]);

  /**
   * Effect: Fetches user profile data from Firestore.
   * Runs when the `user` object is updated.
   * Populates local state with existing Firestore data (avatar, bio, etc.).
   */
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setCustomAvatar(data.customAvatar || "");
          setBio(data.bio || "");
          setJobTitle(data.jobTitle || "");
          setPhoneNumber(data.phoneNumber || "");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  /**
   * Saves the updated profile data to the Firestore `users` collection.
   * 
   * @async
   * @function handleSaveProfile
   * @description
   * 1. Validates current user existence.
   * 2. Sets saving state.
   * 3. Writes (merges) fields: avatar, bio, job, phone, timestamp.
   * 4. Handles success/error feedback.
   * 5. Exits edit mode on success.
   */
  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    setSaveMessage("");

    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          customAvatar: customAvatar.trim(),
          bio: bio.trim(),
          jobTitle: jobTitle.trim(),
          phoneNumber: phoneNumber.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSaveMessage("Profile saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveMessage("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
      if (!saveMessage.includes("Failed")) {
        setIsEditing(false); // Exit edit mode on success
      }
    }
  };



  /**
   * Permanently deletes the user's account and all related data.
   * 
   * @async
   * @function handleDeleteAccount
   * @description
   * Performs the following destructive actions in a batch:
   * 1. Queries and deletes all projects (`canvases`) owned by the user.
   * 2. Deletes the `users` document itself.
   * 3. Signs out the user.
   * 4. Redirects to the landing page.
   * 
   * Requires `deleteConfirmText` to match "DELETE".
   */
  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== "DELETE") return;

    setDeleting(true);

    try {
      // Step 1: Delete all user's projects (canvases)
      const canvasesRef = collection(db, "canvases");
      const q = query(canvasesRef, where("ownerId", "==", user.uid));
      const querySnapshot = await getDocs(q);

      // Use batch delete for efficiency
      const batch = writeBatch(db);
      querySnapshot.docs.forEach((docSnapshot) => {
        batch.delete(docSnapshot.ref);
      });

      // Step 2: Delete user profile document
      const userDocRef = doc(db, "users", user.uid);
      batch.delete(userDocRef);

      // Commit the batch
      await batch.commit();

      // Step 3: Sign out
      await signOut(auth);

      // Step 4: Redirect to landing page
      router.push("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      setDeleting(false);
      alert("Failed to delete account. Please try again.");
    }
  };

  /**
   * Derived display avatar logic.
   * Priority: Custom Avatar URL > Google Photo URL > DiceBear Generated Initials
   * @type {string}
   */
  const displayAvatar =
    customAvatar.trim() ||
    user?.photoURL ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`;

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
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute top-[-15%] left-[-10%] h-[600px] w-[600px] rounded-full bg-purple-600/15 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] h-[600px] w-[600px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute top-[50%] left-[50%] h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[100px]" />
      </div>

      <Navbar user={user} />

      <main className="relative z-10 mx-auto max-w-3xl px-6 pt-32 pb-20">
        {/* Header */}
        <header className="mb-10">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-4 flex items-center gap-2 text-sm text-slate-400 hover:text-[var(--color-text-main)] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-[var(--color-text-main)]">
            Settings
          </h1>
          <p className="mt-2 text-slate-500">
            Manage your profile and account preferences
          </p>
        </header>

        {/* Profile Section - Glassmorphism Card */}
        <section className="mb-8 rounded-3xl border border-[var(--color-border-ui)] bg-[var(--color-card)]/70 backdrop-blur-xl p-8 shadow-xl shadow-purple-500/5">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text-main)]">
                Profile
              </h2>
              <p className="text-sm text-slate-500">
                Customize how others see you
              </p>
            </div>

            {/* Edit Toggle Button */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${isEditing
                ? "bg-purple-500/10 border-purple-500/50 text-purple-400"
                : "bg-[var(--color-bg-base)] border-[var(--color-border-ui)] text-slate-400 hover:text-[var(--color-text-main)]"
                }`}
            >
              <Edit2 size={16} />
              <span className="text-sm font-medium">{isEditing ? "Editing" : "Edit Profile"}</span>
            </button>
          </div>

          {/* Avatar Section - Read Only */}
          <div className="mb-8">
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-main)] mb-4">
              <Camera size={16} className="text-purple-400" />
              Profile Photo
            </label>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <img
                  src={displayAvatar}
                  alt="Profile Avatar"
                  referrerPolicy="no-referrer"
                  className="h-24 w-24 rounded-2xl object-cover border-2 border-purple-500/30 shadow-lg shadow-purple-500/20"
                />
              </div>
              <div className="text-sm text-slate-400 italic">
                Managed via Google Account
              </div>
            </div>
          </div>

          {/* Personal Details Section */}
          <div className="mb-8 p-6 rounded-2xl bg-[var(--color-bg-base)]/50 border border-[var(--color-border-ui)]">
            <h3 className="text-sm font-semibold text-[var(--color-text-main)] mb-4 flex items-center gap-2">
              <User size={16} className="text-purple-400" />
              Personal Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Display Name (Read-only from Google) */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Name</label>
                <div className="px-4 py-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border-ui)] text-[var(--color-text-main)] text-sm">
                  {user?.displayName || "Not available"}
                </div>
              </div>
              {/* Email (Read-only from Google) */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Email</label>
                <div className="px-4 py-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border-ui)] text-[var(--color-text-main)] text-sm truncate">
                  {user?.email || "Not available"}
                </div>
              </div>
              {/* Phone Number (Editable) */}
              <div className="md:col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 9876543210"
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-ui)] text-[var(--color-text-main)] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm ${!isEditing && "opacity-60 cursor-not-allowed"}`}
                />
              </div>
            </div>
          </div>

          {/* Job Title */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-main)] mb-3">
              <Briefcase size={16} className="text-purple-400" />
              Job Title
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Software Engineer, Product Designer"
              maxLength={100}
              disabled={!isEditing}
              className={`w-full px-4 py-3 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-ui)] text-[var(--color-text-main)] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm ${!isEditing && "opacity-60 cursor-not-allowed"}`}
            />
          </div>

          {/* Bio */}
          <div className="mb-8">
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-main)] mb-3">
              <FileText size={16} className="text-purple-400" />
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a bit about yourself..."
              maxLength={250}
              rows={4}
              disabled={!isEditing}
              className={`w-full px-4 py-3 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-ui)] text-[var(--color-text-main)] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm resize-none ${!isEditing && "opacity-60 cursor-not-allowed"}`}
            />
            <p className="mt-1 text-xs text-slate-500 text-right">
              {bio.length}/250 characters
            </p>
          </div>

          {/* Save Button - Only show when editing */}
          {isEditing && (
            <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  // Reset fields to original val logic could be added here if needed
                }}
                disabled={saving}
                className="px-4 py-3 rounded-xl border border-[var(--color-border-ui)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-base)] transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {saveMessage && (
            <div className={`mt-4 text-sm font-medium ${saveMessage.includes("success") || saveMessage.includes("Successfully") ? "text-green-400" : "text-red-400"}`}>
              {saveMessage}
            </div>
          )}
        </section>

        {/* Danger Zone - Account Deletion */}
        <section className="rounded-3xl border border-red-500/30 bg-red-500/5 backdrop-blur-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <AlertTriangle size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-400">Danger Zone</h2>
              <p className="text-sm text-slate-500">
                Irreversible account actions
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20">
            <h3 className="text-base font-bold text-[var(--color-text-main)] mb-2">
              Delete Account
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Permanently delete your account and all associated data. This will
              remove your profile and{" "}
              <strong>all your projects</strong>. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-semibold hover:bg-red-500/30 hover:border-red-500/60 transition-all"
            >
              <Trash2 size={16} />
              Delete Account
            </button>
          </div>
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[var(--color-card)] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-ui)] bg-red-500/10">
              <div className="flex items-center gap-3">
                <AlertTriangle size={24} className="text-red-400" />
                <h3 className="text-lg font-bold text-[var(--color-text-main)]">
                  Delete Account
                </h3>
              </div>
              {!deleting && (
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-slate-400 hover:text-[var(--color-text-main)] transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-sm text-slate-400 mb-4">
                This action is <strong className="text-red-400">permanent</strong> and{" "}
                <strong className="text-red-400">cannot be undone</strong>. The
                following will be deleted:
              </p>

              <ul className="mb-6 space-y-2 text-sm">
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  Your profile information
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  All your projects and canvases
                </li>
              </ul>

              <p className="text-sm text-slate-400 mb-3">
                Type <strong className="text-red-400 font-mono">DELETE</strong>{" "}
                to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                placeholder="Type DELETE"
                disabled={deleting}
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-base)] border border-red-500/30 text-[var(--color-text-main)] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all text-sm font-mono disabled:opacity-50"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-[var(--color-border-ui)] bg-[var(--color-bg-base)]/50">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border-ui)] text-[var(--color-text-main)] font-medium hover:bg-[var(--color-border-ui)] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Forever
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
