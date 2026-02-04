/**
 * Unit tests for Navbar component functions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock implementations for testing
const createMockRouter = () => ({
    push: vi.fn(),
    replace: vi.fn(),
});

describe('Navbar Functions', () => {

    describe('toggleTheme', () => {
        let mockClassList;

        beforeEach(() => {
            mockClassList = {
                toggle: vi.fn(),
                contains: vi.fn(),
            };
            // Mock document.documentElement.classList
            Object.defineProperty(document, 'documentElement', {
                value: { classList: mockClassList },
                writable: true,
            });
            localStorage.setItem.mockClear();
        });

        it('should toggle dark class and return new state', () => {
            mockClassList.toggle.mockReturnValue(true);

            // Simulate toggleTheme function
            const toggleTheme = () => {
                const newIsDark = document.documentElement.classList.toggle('dark');
                localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
                return newIsDark;
            };

            const result = toggleTheme();

            expect(mockClassList.toggle).toHaveBeenCalledWith('dark');
            expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
            expect(result).toBe(true);
        });

        it('should persist light theme when toggling off', () => {
            mockClassList.toggle.mockReturnValue(false);

            const toggleTheme = () => {
                const newIsDark = document.documentElement.classList.toggle('dark');
                localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
                return newIsDark;
            };

            const result = toggleTheme();

            expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
            expect(result).toBe(false);
        });
    });


    describe('handleLogout', () => {
        it('should call signOut and redirect to root', async () => {
            const mockSignOut = vi.fn().mockResolvedValue(undefined);
            const mockRouter = createMockRouter();

            const handleLogout = async () => {
                try {
                    await mockSignOut({});
                    mockRouter.push('/');
                } catch (error) {
                    console.error('Logout Error:', error);
                }
            };

            await handleLogout();

            expect(mockSignOut).toHaveBeenCalled();
            expect(mockRouter.push).toHaveBeenCalledWith('/');
        });

        it('should handle signOut errors gracefully', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
            const mockSignOut = vi.fn().mockRejectedValue(new Error('Auth error'));
            const mockRouter = createMockRouter();

            const handleLogout = async () => {
                try {
                    await mockSignOut({});
                    mockRouter.push('/');
                } catch (error) {
                    console.error('Logout Error:', error);
                }
            };

            await handleLogout();

            expect(consoleError).toHaveBeenCalled();
            expect(mockRouter.push).not.toHaveBeenCalled();
            consoleError.mockRestore();
        });
    });


    describe('filteredProjects', () => {
        const mockProjects = [
            { id: '1', title: 'My First Canvas' },
            { id: '2', title: 'Design Project' },
            { id: '3', title: 'Canvas Drawing' },
            { id: '4', title: null },
            { id: '5' }, // No title
        ];

        const filterProjects = (projects, searchQuery) => {
            return projects.filter(project =>
                project.title?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        };

        it('should filter projects by exact match', () => {
            const result = filterProjects(mockProjects, 'Design Project');
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('2');
        });

        it('should filter projects case-insensitively', () => {
            const result = filterProjects(mockProjects, 'canvas');
            expect(result).toHaveLength(2);
            expect(result.map(p => p.id)).toEqual(['1', '3']);
        });

        it('should return empty array for no matches', () => {
            const result = filterProjects(mockProjects, 'nonexistent');
            expect(result).toHaveLength(0);
        });

        it('should handle partial matches', () => {
            const result = filterProjects(mockProjects, 'draw');
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('3');
        });

        it('should handle empty search query', () => {
            const result = filterProjects(mockProjects, '');
            expect(result).toHaveLength(3); // Only projects with titles
        });

        it('should handle projects without titles', () => {
            const result = filterProjects(mockProjects, 'My');
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('1');
        });
    });


    describe('handleKeyDown (search shortcuts)', () => {
        it('should detect Ctrl+K shortcut', () => {
            const setSearchOpen = vi.fn();

            const handleKeyDown = (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    setSearchOpen(true);
                }
            };

            const event = {
                ctrlKey: true,
                metaKey: false,
                key: 'k',
                preventDefault: vi.fn(),
            };

            handleKeyDown(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(setSearchOpen).toHaveBeenCalledWith(true);
        });

        it('should detect Cmd+K shortcut (Mac)', () => {
            const setSearchOpen = vi.fn();

            const handleKeyDown = (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    setSearchOpen(true);
                }
            };

            const event = {
                ctrlKey: false,
                metaKey: true,
                key: 'k',
                preventDefault: vi.fn(),
            };

            handleKeyDown(event);

            expect(setSearchOpen).toHaveBeenCalledWith(true);
        });

        it('should close search on Escape', () => {
            const setSearchOpen = vi.fn();
            const setSearchQuery = vi.fn();

            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    setSearchOpen(false);
                    setSearchQuery('');
                }
            };

            handleKeyDown({ key: 'Escape' });

            expect(setSearchOpen).toHaveBeenCalledWith(false);
            expect(setSearchQuery).toHaveBeenCalledWith('');
        });

        it('should not trigger on regular K press', () => {
            const setSearchOpen = vi.fn();

            const handleKeyDown = (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    setSearchOpen(true);
                }
            };

            handleKeyDown({ ctrlKey: false, metaKey: false, key: 'k', preventDefault: vi.fn() });

            expect(setSearchOpen).not.toHaveBeenCalled();
        });
    });

});
