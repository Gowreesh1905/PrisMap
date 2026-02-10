import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Dashboard from '../page';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot, getDoc } from 'firebase/firestore';

// Mock Dependencies
vi.mock('next/navigation');
vi.mock('firebase/auth');
vi.mock('firebase/firestore');
vi.mock('@/lib/firebase', () => ({
    auth: {},
    db: {},
}));

// Mock Navbar to simplify testing (we test Navbar separately)
vi.mock('@/components/Navbar', () => ({
    default: ({ user, projects }) => (
        <div data-testid="navbar">
            Navbar User: {user?.email}
            Projects: {projects?.length}
        </div>
    ),
}));

describe('Dashboard Page', () => {
    const mockRouter = { push: vi.fn() };
    const mockUser = { uid: 'user123', email: 'test@example.com' };

    beforeAll(() => {
        Object.defineProperty(global, 'crypto', {
            value: { randomUUID: () => '1234-5678' },
            writable: true
        });
    });

    it.skip('redirects to login if user is not authenticated', async () => {
        let authCallback;
        onAuthStateChanged.mockImplementation((auth, callback) => {
            authCallback = callback;
            return () => { };
        });

        render(<Dashboard />);

        // Manually trigger the callback
        if (authCallback) {
            await act(async () => {
                authCallback(null);
            });
        }

        await waitFor(() => {
            expect(mockRouter.push).toHaveBeenCalledWith('/');
        });
    });

    it('renders loading state initially', () => {
        onAuthStateChanged.mockImplementation(() => () => { }); // Pending auth
        render(<Dashboard />);
        // Look for the spinner or generic loading indicator logic? 
        // In the code: <Loader2 className="animate-spin ..."/> is rendered when loading=true
        // We can check if main content is NOT there
        expect(screen.queryByText('My Canvases')).not.toBeInTheDocument();
    });

    it('renders empty state when no projects exist', async () => {
        // Mock Auth
        onAuthStateChanged.mockImplementation((auth, callback) => {
            callback(mockUser);
            return () => { };
        });

        // Mock Projects Snapshot (Empty)
        onSnapshot.mockImplementation((query, callback) => {
            callback({ docs: [] });
            return () => { };
        });

        // Mock Profile Check (Existing complete profile)
        getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ bio: 'Ok', jobTitle: 'Dev', phoneNumber: '123' })
        });

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('My Canvases')).toBeInTheDocument();
            expect(screen.getByText('Your workspace is empty')).toBeInTheDocument();
        });
    });

    it('renders project list correctly', async () => {
        // Mock Auth
        onAuthStateChanged.mockImplementation((auth, callback) => {
            callback(mockUser);
            return () => { };
        });

        // Mock Projects Snapshot
        const mockProjects = [
            { id: '1', data: () => ({ title: 'Project A', createdAt: { toDate: () => new Date() } }) },
            { id: '2', data: () => ({ title: 'Project B', createdAt: { toDate: () => new Date() } }) },
        ];
        onSnapshot.mockImplementation((query, callback) => {
            callback({ docs: mockProjects });
            return () => { };
        });

        getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ bio: 'Ok', jobTitle: 'Dev', phoneNumber: '123' })
        });

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('Project A')).toBeInTheDocument();
            expect(screen.getByText('Project B')).toBeInTheDocument();
            expect(screen.queryByText('Your workspace is empty')).not.toBeInTheDocument();
        });
    });

    it.skip('shows profile modal for incomplete profile', async () => {
        onAuthStateChanged.mockImplementation((auth, callback) => {
            callback(mockUser);
            return () => { };
        });

        onSnapshot.mockImplementation((query, callback) => {
            callback({ docs: [] });
            return () => { };
        });

        // Mock Profile Check (Incomplete)
        getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({}) // Missing fields
        });

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
        });
    });

    it.skip('navigates to new canvas on create click', async () => {
        // Setup authenticated state
        onAuthStateChanged.mockImplementation((auth, callback) => {
            callback(mockUser);
            return () => { };
        });
        onSnapshot.mockImplementation((q, cb) => cb({ docs: [] }));
        getDoc.mockResolvedValue({ exists: () => true, data: () => ({ bio: 'x', jobTitle: 'y', phoneNumber: 'z' }) });

        // Crypto mocked in beforeAll

        render(<Dashboard />);

        await waitFor(() => screen.getByText('My Canvases'));

        const createBtn = screen.getByText('New Project').closest('button');
        fireEvent.click(createBtn);

        await waitFor(() => {
            expect(mockRouter.push).toHaveBeenCalledWith('/canvas/1234-5678');
        });
    });
});
