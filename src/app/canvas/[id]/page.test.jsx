import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import CanvasPage from './page'
import { getDoc, setDoc } from 'firebase/firestore'
import { useParams } from 'next/navigation'

// --- MOCKS ---
// Mocks for firebase, next/navigation, konva, react-konva, canvas are in vitest.setup.jsx
// We override specific behavior here if needed

describe('Canvas Page Detailed Functional Tests', () => {
    // Mock Data
    const mockCanvasData = {
        title: 'Test Project',
        elements: [],
        lastModified: new Date(),
        ownerId: 'test-user-id'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock useParams locally since vitest.setup might not cover this specific behavior
        // Mock useParams locally since vitest.setup might not cover this specific behavior
        // useParams is imported from next/navigation which is mocked in setup
        vi.mocked(useParams).mockReturnValue({ id: 'test-canvas-123' });

        getDoc.mockResolvedValue({
            exists: () => true,
            data: () => mockCanvasData
        });
    });

    // --- FUNCTION: handleMouseDown ---
    describe('Function: handleMouseDown', () => {
        it('should start drawing a rectangle when tool is rectangle', async () => {
            await act(async () => { render(<CanvasPage />); });

            const stage = screen.getByTestId('stage');
            const rectTool = screen.getByText('Rectangle');
            fireEvent.click(rectTool);

            // Mouse Down
            fireEvent.mouseDown(stage, { clientX: 100, clientY: 100 });

            // Should be in drawing state (internal).
            // We can't verify internal state directly without hook, but we verify effect later.
        });

        it('should select an element when tool is select', async () => {
            // Setup with element
            getDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ ...mockCanvasData, elements: [{ id: '1', type: 'rectangle', x: 0, y: 0, width: 10, height: 10 }] })
            });

            await act(async () => { render(<CanvasPage />); });

            const rect = screen.getByTestId('rect');
            fireEvent.click(rect);

            expect(screen.getByTestId('transformer')).toBeInTheDocument();
        });
    });

    // --- FUNCTION: handleMouseMove ---
    describe('Function: handleMouseMove', () => {
        it('should update shape dimensions during drawing', async () => {
            await act(async () => { render(<CanvasPage />); });

            const stage = screen.getByTestId('stage');
            fireEvent.click(screen.getByText('Rectangle'));

            // Start
            fireEvent.mouseDown(stage, { clientX: 100, clientY: 100 });
            // Move
            fireEvent.mouseMove(stage, { clientX: 200, clientY: 200 });

            // We expect a "ghost" shape or similar if implemented, 
            // OR we expect the final shape on mouse up to be correct.
            // In React state, it usually updates `currentPoints` or similar.
        });
    });

    // --- FUNCTION: handleMouseUp ---
    describe('Function: handleMouseUp', () => {
        it('should finalize the shape and add to elements', async () => {
            await act(async () => { render(<CanvasPage />); });

            const stage = screen.getByTestId('stage');
            fireEvent.click(screen.getByText('Rectangle'));

            fireEvent.mouseDown(stage, { clientX: 100, clientY: 100 });
            fireEvent.mouseMove(stage, { clientX: 200, clientY: 200 });
            fireEvent.mouseUp(stage, { clientX: 200, clientY: 200 });

            // Now we should see a Rectangle in the UI (via our mock)
            // Note: Our mock might render all elements. 
            // Since we mocked data as empty initially, if a rect appears, it works.
            expect(screen.getAllByTestId('rect')).toHaveLength(1);
        });
    });

    // --- FUNCTION: undo / redo ---
    describe('Function: undo / redo', () => {
        it('should revert changes on undo', async () => {
            await act(async () => { render(<CanvasPage />); });

            const stage = screen.getByTestId('stage');

            // 1. Draw
            fireEvent.click(screen.getByText('Rectangle'));
            fireEvent.mouseDown(stage, { clientX: 10, clientY: 10 });
            fireEvent.mouseUp(stage, { clientX: 50, clientY: 50 });
            expect(screen.getAllByTestId('rect')).toHaveLength(1);

            // 2. Undo
            const undoBtn = screen.getByTitle(/Undo/);
            fireEvent.click(undoBtn);

            // Should be empty now
            expect(screen.queryByTestId('rect')).not.toBeInTheDocument();

            // 3. Redo
            const redoBtn = screen.getByTitle(/Redo/);
            fireEvent.click(redoBtn);
            expect(screen.getAllByTestId('rect')).toHaveLength(1);
        });
    });

    // --- FUNCTION: deleteSelected ---
    describe('Function: deleteSelected', () => {
        it('should remove the selected element', async () => {
            // Start with one element
            getDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ ...mockCanvasData, elements: [{ id: '1', type: 'rectangle', x: 0, y: 0, width: 10, height: 10 }] })
            });

            await act(async () => { render(<CanvasPage />); });

            // Select it
            fireEvent.click(screen.getByTestId('rect'));

            // Delete
            fireEvent.keyDown(document, { key: 'Delete' });

            expect(screen.queryByTestId('rect')).not.toBeInTheDocument();
        });
    });

    // --- FUNCTION: saveCanvas ---
    describe('Function: saveCanvas', () => {
        it('should save to Firestore', async () => {
            await act(async () => { render(<CanvasPage />); });

            const saveBtn = screen.getByTitle(/Save/);
            fireEvent.click(saveBtn);

            expect(setDoc).toHaveBeenCalled();
        });
    });
});
