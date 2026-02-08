import { useEffect, useCallback } from 'react';

/**
 * A reusable hook for registering keyboard shortcuts
 * @param {Object} shortcuts - Object mapping key combinations to callback functions
 * @example
 * useKeyboardShortcuts({
 *   'ctrl+s': () => handleSave(),
 *   'delete': () => handleDelete(),
 *   '1': () => setTool('select'),
 * });
 */
export function useKeyboardShortcuts(shortcuts, deps = []) {
    const handleKeyDown = useCallback((event) => {
        // Don't trigger shortcuts when typing in inputs
        const target = event.target;
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        ) {
            return;
        }

        // Build key combination string
        const keys = [];
        if (event.ctrlKey || event.metaKey) keys.push('ctrl');
        if (event.shiftKey) keys.push('shift');
        if (event.altKey) keys.push('alt');

        // Normalize key name
        let key = event.key.toLowerCase();
        if (key === ' ') key = 'space';
        if (key === 'escape') key = 'esc';

        keys.push(key);
        const combo = keys.join('+');

        // Check for matching shortcut
        const callback = shortcuts[combo] || shortcuts[key];
        if (callback) {
            event.preventDefault();
            callback(event);
        }
    }, [shortcuts, ...deps]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
