import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ShortcutsPage from './page'
import { useRouter } from 'next/navigation'

describe('Shortcuts Page Integration Tests', () => {
    const mockPush = vi.fn();
    const mockBack = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useRouter.mockReturnValue({ push: mockPush, back: mockBack });
    });

    it('renders the page title "Keyboard Shortcuts"', () => {
        render(<ShortcutsPage />);
        expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('renders subtitle text', () => {
        render(<ShortcutsPage />);
        expect(screen.getByText('Quick access to all features')).toBeInTheDocument();
    });

    it('renders all three shortcut sections', () => {
        render(<ShortcutsPage />);
        expect(screen.getByText('Global')).toBeInTheDocument();
        expect(screen.getByText('Canvas')).toBeInTheDocument();
        expect(screen.getByText('Tool Selection')).toBeInTheDocument();
    });

    it('renders correct Global shortcuts (3 items)', () => {
        render(<ShortcutsPage />);
        expect(screen.getByText('Open search')).toBeInTheDocument();
        expect(screen.getByText('Open settings')).toBeInTheDocument();
        expect(screen.getByText('Close dialogs / Cancel')).toBeInTheDocument();
    });

    it('renders correct Canvas shortcuts (5 items)', () => {
        render(<ShortcutsPage />);
        expect(screen.getByText('Undo action')).toBeInTheDocument();
        expect(screen.getByText('Redo action')).toBeInTheDocument();
        expect(screen.getByText('Save canvas')).toBeInTheDocument();
        expect(screen.getByText('Delete selected element')).toBeInTheDocument();
        expect(screen.getByText('Deselect / Cancel drawing')).toBeInTheDocument();
    });

    it('renders correct Tool Selection shortcuts (9 items)', () => {
        render(<ShortcutsPage />);
        expect(screen.getByText('Select tool')).toBeInTheDocument();
        expect(screen.getByText('Pen tool')).toBeInTheDocument();
        expect(screen.getByText('Eraser tool')).toBeInTheDocument();
        expect(screen.getByText('Text tool')).toBeInTheDocument();
        expect(screen.getByText('Rectangle shape')).toBeInTheDocument();
        expect(screen.getByText('Circle shape')).toBeInTheDocument();
        expect(screen.getByText('Triangle shape')).toBeInTheDocument();
        expect(screen.getByText('Star shape')).toBeInTheDocument();
        expect(screen.getByText('Arrow tool')).toBeInTheDocument();
    });

    it('renders KeyBadge elements for key combinations', () => {
        render(<ShortcutsPage />);
        // Ctrl key should appear multiple times
        const ctrlBadges = screen.getAllByText('Ctrl');
        expect(ctrlBadges.length).toBeGreaterThanOrEqual(3); // Ctrl+K, Ctrl+,, Ctrl+Z, Ctrl+Y, Ctrl+S
    });

    it('renders the Pro Tip section', () => {
        render(<ShortcutsPage />);
        expect(screen.getByText(/Pro Tip:/)).toBeInTheDocument();
    });

    it('renders the back button with aria-label', () => {
        render(<ShortcutsPage />);
        const backBtn = screen.getByLabelText('Go back');
        expect(backBtn).toBeInTheDocument();
    });

    it('calls router.back() when back button is clicked', () => {
        render(<ShortcutsPage />);
        const backBtn = screen.getByLabelText('Go back');
        fireEvent.click(backBtn);
        expect(mockBack).toHaveBeenCalled();
    });

    it('renders the footer text', () => {
        render(<ShortcutsPage />);
        expect(screen.getByText('PRISMAP KEYBOARD SHORTCUTS')).toBeInTheDocument();
    });
});
