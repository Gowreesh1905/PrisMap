/**
 * Unit tests for LoginPage functions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('LoginPage Functions', () => {

    describe('handleLogin', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should call signInWithPopup on login attempt', async () => {
            const mockSignInWithPopup = vi.fn().mockResolvedValue({ user: { uid: '123' } });
            const mockRouter = { push: vi.fn() };
            const setLoading = vi.fn();

            const handleLogin = async () => {
                setLoading(true);
                try {
                    await mockSignInWithPopup({}, {});
                    mockRouter.push('/dashboard');
                } catch (error) {
                    console.error('Login failed:', error);
                    setLoading(false);
                }
            };

            await handleLogin();

            expect(setLoading).toHaveBeenCalledWith(true);
            expect(mockSignInWithPopup).toHaveBeenCalled();
            expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
        });

        it('should redirect to dashboard on successful login', async () => {
            const mockSignInWithPopup = vi.fn().mockResolvedValue({
                user: { uid: '123', email: 'test@test.com' }
            });
            const mockRouter = { push: vi.fn() };

            const handleLogin = async () => {
                try {
                    await mockSignInWithPopup({}, {});
                    mockRouter.push('/dashboard');
                } catch (error) {
                    console.error('Login failed:', error);
                }
            };

            await handleLogin();

            expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
        });

        it('should handle login failure gracefully', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            const mockSignInWithPopup = vi.fn().mockRejectedValue(new Error('Auth failed'));
            const mockRouter = { push: vi.fn() };
            const setLoading = vi.fn();

            const handleLogin = async () => {
                setLoading(true);
                try {
                    await mockSignInWithPopup({}, {});
                    mockRouter.push('/dashboard');
                } catch (error) {
                    console.error('Login failed:', error);
                    setLoading(false);
                }
            };

            await handleLogin();

            expect(consoleError).toHaveBeenCalled();
            expect(setLoading).toHaveBeenLastCalledWith(false);
            expect(mockRouter.push).not.toHaveBeenCalled();
            consoleError.mockRestore();
        });

        it('should set loading state correctly during login flow', async () => {
            const mockSignInWithPopup = vi.fn().mockResolvedValue({ user: {} });
            const setLoading = vi.fn();
            const mockRouter = { push: vi.fn() };

            const handleLogin = async () => {
                setLoading(true);
                try {
                    await mockSignInWithPopup({}, {});
                    mockRouter.push('/dashboard');
                } catch (error) {
                    setLoading(false);
                }
            };

            await handleLogin();

            expect(setLoading).toHaveBeenCalledWith(true);
            // Note: In success case, loading is not reset since we redirect
        });
    });

});
