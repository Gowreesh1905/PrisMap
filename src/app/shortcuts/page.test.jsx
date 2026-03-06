import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ShortcutsPage from './page'
import { useRouter } from 'next/navigation'
import { ShortcutProvider } from '@/contexts/ShortcutContext'

const renderWithProvider = (ui) => render(<ShortcutProvider>{ui}</ShortcutProvider>);

describe('Shortcuts Page Integration Tests', () => {
    const mockPush = vi.fn();
    const mockBack = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useRouter.mockReturnValue({ push: mockPush, back: mockBack });
    });

    it('renders the page title "Keyboard Shortcuts"', () => {
        renderWithProvider(<ShortcutsPage />);
        expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('renders subtitle text', () => {
        renderWithProvider(<ShortcutsPage />);
        expect(screen.getByText('Click the pencil icon to customize any shortcut')).toBeInTheDocument();
    });

    it('renders shortcut sections', () => {
        renderWithProvider(<ShortcutsPage />);
        expect(screen.getByText('Canvas')).toBeInTheDocument();
        expect(screen.getByText('Tool Selection')).toBeInTheDocument();
    });

    it('renders correct Canvas shortcuts', () => {
        renderWithProvider(<ShortcutsPage />);
        expect(screen.getByText('Undo action')).toBeInTheDocument();
        expect(screen.getByText('Redo action')).toBeInTheDocument();
        expect(screen.getByText('Save canvas')).toBeInTheDocument();
    });

    it('renders correct Canvas shortcuts (5 items)', () => {
        renderWithProvider(<ShortcutsPage />);
        expect(screen.getByText('Undo action')).toBeInTheDocument();
        expect(screen.getByText('Redo action')).toBeInTheDocument();
        expect(screen.getByText('Save canvas')).toBeInTheDocument();
        expect(screen.getByText('Delete selected element')).toBeInTheDocument();
        expect(screen.getByText('Deselect / Cancel drawing')).toBeInTheDocument();
    });

    it('renders correct Tool Selection shortcuts (9 items)', () => {
        renderWithProvider(<ShortcutsPage />);
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
        renderWithProvider(<ShortcutsPage />);
        // Ctrl key should appear multiple times
        const ctrlBadges = screen.getAllByText('Ctrl');
        expect(ctrlBadges.length).toBeGreaterThanOrEqual(3); // Ctrl+K, Ctrl+,, Ctrl+Z, Ctrl+Y, Ctrl+S
    });

    it('renders the Tip section', () => {
        renderWithProvider(<ShortcutsPage />);
        expect(screen.getByText(/Tip:/)).toBeInTheDocument();
    });

    it('renders the back button with aria-label', () => {
        renderWithProvider(<ShortcutsPage />);
        const backBtn = screen.getByLabelText('Go back');
        expect(backBtn).toBeInTheDocument();
    });

    it('calls router.back() when back button is clicked', () => {
        renderWithProvider(<ShortcutsPage />);
        const backBtn = screen.getByLabelText('Go back');
        fireEvent.click(backBtn);
        expect(mockBack).toHaveBeenCalled();
    });

    it('renders the footer text', () => {
        renderWithProvider(<ShortcutsPage />);
        expect(screen.getByText('PRISMAP KEYBOARD SHORTCUTS')).toBeInTheDocument();
    });
});
