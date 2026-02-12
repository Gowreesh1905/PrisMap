import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import CanvasPage from './page'

describe('Canvas Standalone Page Integration Tests', () => {
    const mockPush = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useRouter.mockReturnValue({ push: mockPush });

        onAuthStateChanged.mockImplementation((auth, callback) => {
            callback({ uid: 'test-user-id', email: 'test@test.com', photoURL: null });
            return () => { };
        });
    });

    it('redirects to login if user is not authenticated', () => {
        onAuthStateChanged.mockImplementation((auth, callback) => {
            callback(null);
            return () => { };
        });
        render(<CanvasPage />);
        expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('renders the Infinite Canvas header text', () => {
        render(<CanvasPage />);
        expect(screen.getAllByText('Infinite Canvas')[0]).toBeInTheDocument();
    });

    it('renders the PrisMap brand text', () => {
        render(<CanvasPage />);
        expect(screen.getByText('Map')).toBeInTheDocument();
    });

    it('renders the tool palette with core tools (Select, Pen, Eraser, Text)', () => {
        render(<CanvasPage />);
        expect(screen.getByText('Select')).toBeInTheDocument();
        expect(screen.getByText('Pen')).toBeInTheDocument();
        expect(screen.getByText('Eraser')).toBeInTheDocument();
        expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('renders shape tools (Rectangle, Circle, Triangle, Star, Arrow, Line, Hexagon, Pentagon)', () => {
        render(<CanvasPage />);
        expect(screen.getByText('Rectangle')).toBeInTheDocument();
        expect(screen.getByText('Circle')).toBeInTheDocument();
        expect(screen.getByText('Triangle')).toBeInTheDocument();
        expect(screen.getByText('Star')).toBeInTheDocument();
        expect(screen.getByText('Arrow')).toBeInTheDocument();
        expect(screen.getByText('Line')).toBeInTheDocument();
        expect(screen.getByText('Hexagon')).toBeInTheDocument();
        expect(screen.getByText('Pentagon')).toBeInTheDocument();
    });

    it('renders undo and redo buttons', () => {
        render(<CanvasPage />);
        expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeInTheDocument();
        expect(screen.getByTitle('Redo (Ctrl+Y)')).toBeInTheDocument();
    });

    it('undo is disabled initially (no history)', () => {
        render(<CanvasPage />);
        const undoBtn = screen.getByTitle('Undo (Ctrl+Z)');
        expect(undoBtn).toBeDisabled();
    });

    it('renders zoom controls (Zoom In, Zoom Out, Reset)', () => {
        render(<CanvasPage />);
        expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
        expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
        expect(screen.getByTitle('Reset Zoom')).toBeInTheDocument();
    });

    it('renders zoom percentage display at 100%', () => {
        render(<CanvasPage />);
        expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('selects a shape tool when clicked', () => {
        render(<CanvasPage />);
        const rectBtn = screen.getByText('Rectangle').closest('button');
        fireEvent.click(rectBtn);
        // After clicking, the button should have the active gradient class
        expect(rectBtn.className).toContain('from-purple-600');
    });

    it('renders the Konva stage (mocked)', () => {
        render(<CanvasPage />);
        expect(screen.getByTestId('stage')).toBeInTheDocument();
    });

    it('renders the Clear Canvas button', () => {
        render(<CanvasPage />);
        expect(screen.getByText('Clear Canvas')).toBeInTheDocument();
    });

    it('renders the Settings button', () => {
        render(<CanvasPage />);
        expect(screen.getByTitle('Settings')).toBeInTheDocument();
    });

    it('renders the Log Out button', () => {
        render(<CanvasPage />);
        expect(screen.getByTitle('Log Out')).toBeInTheDocument();
    });

    it('renders Tools and Shapes section headers', () => {
        render(<CanvasPage />);
        expect(screen.getByText('Tools')).toBeInTheDocument();
        expect(screen.getByText('Shapes')).toBeInTheDocument();
    });
});
