import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from '../page';
import { useRouter } from 'next/navigation';
import { signInWithPopup } from 'firebase/auth';

// Mock dependencies
vi.mock('next/navigation');
vi.mock('firebase/auth');
vi.mock('@/lib/firebase', () => ({
    auth: {},
    googleProvider: {},
}));

describe('Login Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders login content correctly', () => {
        render(<LoginPage />);

        expect(screen.getByText('PrisMap')).toBeInTheDocument();
        expect(screen.getByText('Your infinite collaborative space')).toBeInTheDocument();
        expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });

    it('handles google login success', async () => {
        const pushMock = vi.fn();
        useRouter.mockReturnValue({ push: pushMock });
        signInWithPopup.mockResolvedValue({ user: { email: 'test@example.com' } });

        render(<LoginPage />);

        const loginBtn = screen.getByRole('button', { name: /sign in with google/i });
        fireEvent.click(loginBtn);

        // Button should show loading state
        expect(screen.getByText('Connecting...')).toBeInTheDocument();

        // Wait for async operation
        // We can use a small delay or rely on the mock resolving immediately in the microtask queue
        await vi.waitFor(() => {
            expect(signInWithPopup).toHaveBeenCalled();
            expect(pushMock).toHaveBeenCalledWith('/dashboard');
        });
    });

    it('handles login failure gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        signInWithPopup.mockRejectedValue(new Error('Popup closed'));

        render(<LoginPage />);

        const loginBtn = screen.getByRole('button', { name: /sign in with google/i });
        fireEvent.click(loginBtn);

        expect(screen.getByText('Connecting...')).toBeInTheDocument();

        await vi.waitFor(() => {
            // Loading state should remain false/removed after error or we check specific UI behavior
            // In the component: setLoading(false) is called in catch block
            expect(screen.queryByText('Connecting...')).not.toBeInTheDocument();
        });

        expect(consoleSpy).toHaveBeenCalledWith('Login failed:', expect.any(Error));
        consoleSpy.mockRestore();
    });
});
