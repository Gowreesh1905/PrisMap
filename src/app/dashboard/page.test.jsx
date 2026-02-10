import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Dashboard from './page'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { onSnapshot, getDoc } from 'firebase/firestore'

// Mocks are hoisted. We rely on vitest.setup.jsx for base mocks.
// We'll override specific behaviors in tests.
vi.mock('firebase/firestore', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        getFirestore: vi.fn(),
        collection: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        onSnapshot: vi.fn(),
        doc: vi.fn(),
        getDoc: vi.fn(),
    };
});

describe('Dashboard', () => {
    const mockPush = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useRouter.mockReturnValue({ push: mockPush });

        // Default to authenticated user
        onAuthStateChanged.mockImplementation((auth, callback) => {
            callback({ uid: 'test-user-id' });
            return () => { };
        });

        // Default to existing profile (no modal)
        getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ bio: 'Test Bio', jobTitle: 'Tester', phoneNumber: '123' })
        });
    });

    it('redirects to login if user is not authenticated', () => {
        onAuthStateChanged.mockImplementation((auth, callback) => {
            callback(null); // No user
            return () => { };
        });

        // Need to wrap in act because of useEffect state updates
        render(<Dashboard />);

        expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('renders the dashboard with projects', async () => {
        const mockProjects = [
            { id: 'proj-1', title: 'Project 1', createdAt: { toDate: () => new Date() } },
            { id: 'proj-2', title: 'Project 2', createdAt: { toDate: () => new Date() } }
        ];

        // Mock onSnapshot to return projects
        onSnapshot.mockImplementation((query, callback) => {
            callback({
                docs: mockProjects.map(p => ({
                    id: p.id,
                    data: () => p
                }))
            });
            return () => { }; // unsubscribe
        });

        await act(async () => {
            render(<Dashboard />);
        });

        expect(screen.getByText('My Canvases')).toBeInTheDocument();
        expect(screen.getByText('Project 1')).toBeInTheDocument();
        expect(screen.getByText('Project 2')).toBeInTheDocument();
        expect(screen.getByText('2 Total Projects')).toBeInTheDocument();
    });

    it('shows empty state when no projects exist', async () => {
        onSnapshot.mockImplementation((query, callback) => {
            callback({ docs: [] });
            return () => { };
        });

        await act(async () => {
            render(<Dashboard />);
        });

        expect(screen.getByText('Your workspace is empty')).toBeInTheDocument();
    });

    it('navigates to new canvas on "New Project" click', async () => {
        onSnapshot.mockImplementation((query, callback) => {
            callback({ docs: [] });
            return () => { };
        });

        await act(async () => {
            render(<Dashboard />);
        });

        const newProjectBtn = screen.getByText('New Project');
        fireEvent.click(newProjectBtn);

        // Crypto.randomUUID is mocked or available in happy-dom/node 
        // We expect push to be called with /canvas/some-uuid
        expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/canvas\/.+/));
    });
});
