import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SettingsPage from '../settings_page/page';
import ShortcutsPage from '../shortcuts/page';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';

// Mock Dependencies
vi.mock('next/navigation');
vi.mock('firebase/auth');
vi.mock('firebase/firestore');
vi.mock('@/lib/firebase', () => ({
    auth: {},
    db: {},
}));

// Mock Navbar
vi.mock('@/components/Navbar', () => ({
    default: () => <div data-testid="navbar">Navbar</div>,
}));

describe('Settings Page', () => {
    const mockRouter = { push: vi.fn() };
    const mockUser = { uid: 'u1', email: 'test@test.com', displayName: 'Test User' };

    beforeEach(() => {
        vi.clearAllMocks();
        useRouter.mockReturnValue(mockRouter);
        useSearchParams.mockReturnValue(new URLSearchParams());
    });

    it('redirects to home if unauthenticated', () => {
        onAuthStateChanged.mockImplementation((auth, cb) => cb(null));
        render(<SettingsPage />);
        expect(mockRouter.push).toHaveBeenCalledWith('/');
    });

    it('renders user profile data', async () => {
        onAuthStateChanged.mockImplementation((auth, cb) => cb(mockUser));
        getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ jobTitle: 'Wizard', bio: 'Magic' })
        });

        render(<SettingsPage />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('Wizard')).toBeInTheDocument();
            expect(screen.getByText('Magic')).toBeInTheDocument();
        });
    });

    it('shows danger zone', async () => {
        onAuthStateChanged.mockImplementation((auth, cb) => cb(mockUser));
        getDoc.mockResolvedValue({ exists: () => false });

        render(<SettingsPage />);

        await waitFor(() => {
            expect(screen.getByText('Danger Zone')).toBeInTheDocument();
            expect(screen.getByText('Delete Account')).toBeInTheDocument();
        });
    });
});

describe('Shortcuts Page', () => {
    const mockRouter = { back: vi.fn() };

    beforeEach(() => {
        useRouter.mockReturnValue(mockRouter);
    });

    it('renders shortcuts list', () => {
        render(<ShortcutsPage />);
        expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
        expect(screen.getByText('Global')).toBeInTheDocument();
        expect(screen.getByText('Ctrl')).toBeInTheDocument();
    });
});
