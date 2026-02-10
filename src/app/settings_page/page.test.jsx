import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import SettingsPage from './page'
import { useRouter, useSearchParams } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, getDocs, writeBatch } from 'firebase/firestore'

// Override firebase/firestore mock for this file
vi.mock('firebase/firestore', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        getFirestore: vi.fn(),
        doc: vi.fn(),
        getDoc: vi.fn(),
        setDoc: vi.fn(),
        collection: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        getDocs: vi.fn(),
        deleteDoc: vi.fn(),
        writeBatch: vi.fn(() => ({
            delete: vi.fn(),
            commit: vi.fn().mockResolvedValue(undefined),
        })),
        serverTimestamp: vi.fn(),
    };
});

// Mock the Navbar component to avoid interference
vi.mock('@/components/Navbar', () => ({
    default: () => <div data-testid="navbar-mock">Navbar</div>,
}));

describe('Settings Page Integration Tests', () => {
    const mockPush = vi.fn();
    const mockBack = vi.fn();

    const mockUser = {
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'http://example.com/photo.jpg',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useRouter.mockReturnValue({ push: mockPush, back: mockBack });
        useSearchParams.mockReturnValue({ get: vi.fn(() => null) });

        // Default: authenticated user
        onAuthStateChanged.mockImplementation((auth, callback) => {
            callback(mockUser);
            return () => { };
        });

        // Default: existing profile data
        getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({
                bio: 'Test bio',
                jobTitle: 'Engineer',
                phoneNumber: '1234567890',
                customAvatar: '',
                countryCode: '+91',
                countryName: 'India',
            }),
        });
    });

    // --- AUTH TESTS ---
    it('redirects to login if user is not authenticated', () => {
        onAuthStateChanged.mockImplementation((auth, callback) => {
            callback(null);
            return () => { };
        });

        render(<SettingsPage />);
        expect(mockPush).toHaveBeenCalledWith('/');
    });

    // --- RENDERING TESTS ---
    it('renders settings page header', async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders Profile section heading', async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('renders Danger Zone section heading', async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    });

    it('displays user name from Google account', async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('displays user email from Google account', async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('renders profile avatar image', async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        const avatar = screen.getByAltText('Profile Avatar');
        expect(avatar).toBeInTheDocument();
    });

    // --- EDIT MODE TESTS ---
    it('shows Edit Profile button by default', async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });

    it('fields are disabled in view mode by default', async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        const jobInput = screen.getByPlaceholderText('e.g. Software Engineer, Product Designer');
        expect(jobInput).toBeDisabled();
    });

    it('toggles to editing mode when Edit Profile is clicked', async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        const editBtn = screen.getByText('Edit Profile');
        fireEvent.click(editBtn.closest('button'));

        expect(screen.getByText('Editing')).toBeInTheDocument();
    });

    it('enables job title input after entering edit mode', async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        fireEvent.click(screen.getByText('Edit Profile').closest('button'));

        const jobInput = screen.getByPlaceholderText('e.g. Software Engineer, Product Designer');
        expect(jobInput).not.toBeDisabled();
    });

    it('enables edit mode via URL search param ?edit=true', async () => {
        useSearchParams.mockReturnValue({ get: vi.fn((key) => key === 'edit' ? 'true' : null) });

        await act(async () => {
            render(<SettingsPage />);
        });

        expect(screen.getByText('Editing')).toBeInTheDocument();
    });

    // --- BIO CHARACTER COUNTER ---
    it('shows bio character counter', async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        // Bio loaded from mock is 'Test bio' = 8 chars
        expect(screen.getByText('8/250 characters')).toBeInTheDocument();
    });

    // --- SAVE PROFILE ---
    it('shows Save Changes button in edit mode', async () => {
        setDoc.mockResolvedValue(undefined);

        await act(async () => {
            render(<SettingsPage />);
        });

        // Enter edit mode
        fireEvent.click(screen.getByText('Edit Profile').closest('button'));

        expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('calls Firestore setDoc when saving profile', async () => {
        setDoc.mockResolvedValue(undefined);

        await act(async () => {
            render(<SettingsPage />);
        });

        fireEvent.click(screen.getByText('Edit Profile').closest('button'));

        await act(async () => {
            fireEvent.click(screen.getByText('Save Changes').closest('button'));
        });

        expect(setDoc).toHaveBeenCalled();
    });

    // --- DELETE ACCOUNT MODAL ---
    it('opens delete confirmation modal when Delete Account is clicked', async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        // Click the "Delete Account" button in the Danger Zone section
        // There are multiple elements with "Delete Account" text (h3 heading + button)
        // Use getAllByRole to find only the buttons
        const deleteButtons = screen.getAllByRole('button', { name: /Delete Account/i });
        fireEvent.click(deleteButtons[0]);

        // Modal should now be visible with the confirmation input
        expect(screen.getByPlaceholderText('Type DELETE')).toBeInTheDocument();
        expect(screen.getByText('Delete Forever')).toBeInTheDocument();
    });

    it('Delete Forever button is disabled until DELETE is typed', async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        // Open modal
        const deleteButtons = screen.getAllByRole('button', { name: /Delete Account/i });
        fireEvent.click(deleteButtons[0]);

        const confirmBtn = screen.getByRole('button', { name: /Delete Forever/i });
        expect(confirmBtn).toBeDisabled();

        // Type DELETE
        const input = screen.getByPlaceholderText('Type DELETE');
        fireEvent.change(input, { target: { value: 'DELETE' } });

        expect(confirmBtn).not.toBeDisabled();
    });

    it('Cancel button closes delete modal', async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        // Open modal
        const deleteButtons = screen.getAllByRole('button', { name: /Delete Account/i });
        fireEvent.click(deleteButtons[0]);
        expect(screen.getByPlaceholderText('Type DELETE')).toBeInTheDocument();

        // Find the Cancel button inside the modal footer
        const cancelButtons = screen.getAllByRole('button', { name: /^Cancel$/i });
        // The last Cancel is the modal footer cancel
        fireEvent.click(cancelButtons[cancelButtons.length - 1]);

        expect(screen.queryByPlaceholderText('Type DELETE')).not.toBeInTheDocument();
    });

    // --- BACK TO DASHBOARD ---
    it('renders Back to Dashboard button', async () => {
        await act(async () => {
            render(<SettingsPage />);
        });

        expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
    });
});
