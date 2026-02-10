import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Navbar from './Navbar'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'

// Mock next/navigation
// Already in vitest.setup.jsx, but we can spy on push
// signOut is mocked in setup, but we want to verify it's called.

describe('Navbar Interaction Tests', () => {
    const mockUser = {
        uid: 'user-123',
        photoURL: 'http://example.com/photo.jpg',
        displayName: 'Test User',
        email: 'test@example.com'
    };

    const mockProjects = [
        { id: 'p1', title: 'Alpha Project', createdAt: { toDate: () => new Date() } },
        { id: 'p2', title: 'Beta Project', createdAt: { toDate: () => new Date() } }
    ];

    const mockPush = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useRouter.mockReturnValue({ push: mockPush });

        // Ensure document.documentElement classes are clean
        document.documentElement.classList.remove('dark');
    });

    it('renders user profile image', () => {
        render(<Navbar user={mockUser} projects={mockProjects} />);
        const avatar = screen.getByAltText('User Profile');
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveAttribute('src', mockUser.photoURL);
    });

    it('toggles theme between light and dark', () => {
        render(<Navbar user={mockUser} projects={mockProjects} />);

        const themeBtn = screen.getByLabelText('Toggle Dark Mode');

        // Initial state: light (default in component unless system pref)
        expect(document.documentElement.classList.contains('dark')).toBe(false);

        // Click to toggle
        fireEvent.click(themeBtn);
        expect(document.documentElement.classList.contains('dark')).toBe(true);

        // Click again
        fireEvent.click(themeBtn);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('opens search modal on button click', () => {
        render(<Navbar user={mockUser} projects={mockProjects} />);

        const searchBtn = screen.getByLabelText('Search');
        fireEvent.click(searchBtn);

        expect(screen.getByPlaceholderText('Search projects...')).toBeInTheDocument();
    });

    it('filters projects in search', () => {
        render(<Navbar user={mockUser} projects={mockProjects} />);

        // Open search first
        const searchBtn = screen.getByLabelText('Search');
        fireEvent.click(searchBtn);

        const input = screen.getByPlaceholderText('Search projects...');

        // Type 'Alpha'
        fireEvent.change(input, { target: { value: 'Alpha' } });

        expect(screen.getByText('Alpha Project')).toBeInTheDocument();
        expect(screen.queryByText('Beta Project')).not.toBeInTheDocument();
    });

    it('calls signOut and redirects on logout click', async () => {
        render(<Navbar user={mockUser} projects={mockProjects} />);

        const logoutBtn = screen.getByTitle('Log Out');
        fireEvent.click(logoutBtn);

        await waitFor(() => {
            expect(signOut).toHaveBeenCalled();
            expect(mockPush).toHaveBeenCalledWith('/');
        });
    });
});
