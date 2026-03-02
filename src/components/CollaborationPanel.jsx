/**
 * @fileoverview Share panel for canvas collaboration.
 * 
 * Shows:
 * - Public/private toggle (anyone with link vs restricted)
 * - Copy link button
 * - List of currently active users with colored indicators
 * - Owner badge
 * 
 * This is a regular React component (HTML), not Konva.
 * It renders as an overlay panel on the canvas page.
 */

'use client';

import React, { useState } from 'react';
import { X, Link2, Check, Globe, Lock, Users } from 'lucide-react';

/**
 * CollaborationPanel — share controls and active users list.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the panel is visible
 * @param {() => void} props.onClose - Close handler
 * @param {boolean} props.isShared - Whether canvas is public
 * @param {() => Promise<void>} props.onToggleShare - Toggle public/private
 * @param {Array<{uid, displayName, photoURL, color}>} props.activeUsers - Currently online users
 * @param {string} props.ownerUid - UID of the canvas owner
 * @param {string} props.currentUserUid - UID of the current logged-in user
 */
export default function CollaborationPanel({
    isOpen,
    onClose,
    isShared,
    onToggleShare,
    activeUsers,
    ownerUid,
    currentUserUid
}) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    /** Copy the current page URL to clipboard */
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
        }
    };

    /**
     * Get initials from a display name (e.g., "Alice Bob" → "AB")
     */
    const getInitials = (name) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-6">
            {/* Backdrop — click to close */}
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-right duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                    <div className="flex items-center gap-2">
                        <Users size={18} className="text-purple-600" />
                        <h3 className="font-bold text-gray-900 text-sm">Share Canvas</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/60 rounded-lg transition-colors"
                    >
                        <X size={16} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* ── Access Toggle ── */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-2.5">
                            {isShared ? (
                                <Globe size={16} className="text-green-600" />
                            ) : (
                                <Lock size={16} className="text-gray-500" />
                            )}
                            <div>
                                <p className="text-xs font-semibold text-gray-800">
                                    {isShared ? 'Anyone with link' : 'Restricted'}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                    {isShared
                                        ? 'Anyone can open and edit'
                                        : 'Only invited people can access'}
                                </p>
                            </div>
                        </div>
                        {/* Toggle switch */}
                        <button
                            onClick={onToggleShare}
                            className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${isShared ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                        >
                            <div
                                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${isShared ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* ── Copy Link ── */}
                    <button
                        onClick={handleCopyLink}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${copied
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/20'
                            }`}
                    >
                        {copied ? (
                            <>
                                <Check size={15} />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Link2 size={15} />
                                Copy Link
                            </>
                        )}
                    </button>

                    {/* ── Active Users ── */}
                    <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                            Online Now · {activeUsers.length}
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {activeUsers.map((user) => {
                                const isOwner = user.uid === ownerUid;
                                const isMe = user.uid === currentUserUid;

                                return (
                                    <div
                                        key={user.uid}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        {/* Avatar */}
                                        <div className="relative">
                                            {user.photoURL ? (
                                                <img
                                                    src={user.photoURL}
                                                    alt={user.displayName}
                                                    className="w-8 h-8 rounded-full object-cover border-2"
                                                    style={{ borderColor: user.color }}
                                                />
                                            ) : (
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                    style={{ backgroundColor: user.color }}
                                                >
                                                    {getInitials(user.displayName)}
                                                </div>
                                            )}
                                            {/* Online dot */}
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                                        </div>

                                        {/* Name + badges */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-800 truncate">
                                                {user.displayName}
                                                {isMe && (
                                                    <span className="ml-1.5 text-[10px] text-gray-400 font-normal">(You)</span>
                                                )}
                                            </p>
                                        </div>

                                        {/* Owner badge */}
                                        {isOwner && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 rounded">
                                                Owner
                                            </span>
                                        )}
                                    </div>
                                );
                            })}

                            {activeUsers.length === 0 && (
                                <p className="text-xs text-gray-400 text-center py-4">
                                    No one else is here yet
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
