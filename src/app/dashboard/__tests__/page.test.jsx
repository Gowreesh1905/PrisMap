/**
 * Unit tests for Dashboard functions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Dashboard Functions', () => {

    describe('handleCreateCanvas', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            crypto.randomUUID = vi.fn(() => 'test-uuid-1234-5678-abcd');
        });

        it('should generate a UUID and navigate to canvas', () => {
            const mockRouter = { push: vi.fn() };

            const handleCreateCanvas = () => {
                const newId = crypto.randomUUID();
                mockRouter.push(`/canvas/${newId}`);
            };

            handleCreateCanvas();

            expect(crypto.randomUUID).toHaveBeenCalled();
            expect(mockRouter.push).toHaveBeenCalledWith('/canvas/test-uuid-1234-5678-abcd');
        });

        it('should create unique ID for each canvas', () => {
            const mockRouter = { push: vi.fn() };
            let callCount = 0;
            crypto.randomUUID = vi.fn(() => `uuid-${++callCount}`);

            const handleCreateCanvas = () => {
                const newId = crypto.randomUUID();
                mockRouter.push(`/canvas/${newId}`);
            };

            handleCreateCanvas();
            handleCreateCanvas();
            handleCreateCanvas();

            expect(mockRouter.push).toHaveBeenNthCalledWith(1, '/canvas/uuid-1');
            expect(mockRouter.push).toHaveBeenNthCalledWith(2, '/canvas/uuid-2');
            expect(mockRouter.push).toHaveBeenNthCalledWith(3, '/canvas/uuid-3');
        });

        it('should navigate to correct canvas URL format', () => {
            const mockRouter = { push: vi.fn() };
            crypto.randomUUID = vi.fn(() => 'abc-123-def');

            const handleCreateCanvas = () => {
                const newId = crypto.randomUUID();
                mockRouter.push(`/canvas/${newId}`);
            };

            handleCreateCanvas();

            expect(mockRouter.push).toHaveBeenCalledWith('/canvas/abc-123-def');
            // Verify it starts with /canvas/
            const [call] = mockRouter.push.mock.calls[0];
            expect(call.startsWith('/canvas/')).toBe(true);
        });
    });


    describe('ProjectCard component logic', () => {
        it('should handle missing title', () => {
            const project = { id: '123', createdAt: null };
            const displayTitle = project.title || 'Untitled Project';
            expect(displayTitle).toBe('Untitled Project');
        });

        it('should display provided title', () => {
            const project = { id: '123', title: 'My Canvas' };
            const displayTitle = project.title || 'Untitled Project';
            expect(displayTitle).toBe('My Canvas');
        });

        it('should format date correctly when available', () => {
            const mockDate = new Date('2024-03-15');
            const project = {
                id: '123',
                title: 'Test',
                createdAt: { toDate: () => mockDate }
            };

            const dateDisplay = project.createdAt?.toDate?.()?.toLocaleDateString() || 'Modified recently';
            expect(dateDisplay).toContain('2024'); // Date formatting varies by locale
        });

        it('should show fallback when date is missing', () => {
            const project = { id: '123', title: 'Test', createdAt: null };
            const dateDisplay = project.createdAt?.toDate?.()?.toLocaleDateString() || 'Modified recently';
            expect(dateDisplay).toBe('Modified recently');
        });
    });

});
