import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import LoginPage from './page'
import { signInWithPopup } from 'firebase/auth'
import { useRouter } from 'next/navigation'

// Mocks are hoisted, but we can access them inside tests
// firebase and next/navigation are already mocked in vitest.setup.jsx
// We just need to ensure we can spy on them or they behave as expected

describe('LoginPage', () => {
    const mockPush = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup router mock
        useRouter.mockReturnValue({
            push: mockPush,
        });
    });

    it('renders the PrisMap title and slogan', () => {
        render(<LoginPage />);
        expect(screen.getByText('PrisMap')).toBeInTheDocument();
        expect(screen.getByText('Your infinite collaborative space')).toBeInTheDocument();
    });

    it('renders the Sign in with Google button', () => {
        render(<LoginPage />);
        expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });

    it('calls signInWithPopup and redirects to dashboard on click', async () => {
        render(<LoginPage />);
        const loginBtn = screen.getByRole('button');

        fireEvent.click(loginBtn);

        // Verify loading state (text changes)
        expect(screen.getByText('Connecting...')).toBeInTheDocument();

        // Verify Firebase auth call
        expect(signInWithPopup).toHaveBeenCalled();

        // Verify redirect
        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/dashboard');
        });
    });
});
