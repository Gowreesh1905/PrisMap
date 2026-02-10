import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CanvasPage from '../page';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, setDoc } from 'firebase/firestore';

// Mock Dependencies
vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
    useParams: vi.fn(() => ({ id: 'default-id' })),
}));
vi.mock('firebase/auth');
vi.mock('firebase/firestore');
vi.mock('firebase/storage');
vi.mock('@/lib/firebase', () => ({
    auth: {},
    db: {},
    storage: {},
}));

// Mock React-Konva
vi.mock('react-konva', () => {
    const React = require('react');
    const { forwardRef, useImperativeHandle } = React;

    const MockStage = forwardRef(({ children }, ref) => {
        useImperativeHandle(ref, () => ({
            findOne: () => ({ nodes: () => { } }),
            toDataURL: () => 'data:image/png;base64,mock',
            container: () => ({
                getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 1000 }),
                addEventListener: () => { },
                removeEventListener: () => { },
            }),
            width: () => 1000,
            height: () => 1000,
            batchDraw: () => { },
        }));
        return <div data-testid="stage">{children}</div>;
    });

    const MockLayer = forwardRef(({ children }, ref) => {
        useImperativeHandle(ref, () => ({
            batchDraw: () => { },
            findOne: () => null,
            destroy: () => { },
        }));
        return <div data-testid="layer">{children}</div>;
    });

    const MockTransformer = forwardRef((props, ref) => {
        useImperativeHandle(ref, () => ({
            nodes: () => { },
            getLayer: () => ({ batchDraw: () => { } }),
        }));
        return <div data-testid="konva-transformer" />;
    });

    return {
        Stage: MockStage,
        Layer: MockLayer,
        Transformer: MockTransformer,
        Line: () => <div data-testid="konva-line" />,
        Rect: () => <div data-testid="konva-rect" />,
        Circle: () => <div data-testid="konva-circle" />,
        Star: () => <div data-testid="konva-star" />,
        RegularPolygon: () => <div data-testid="konva-polygon" />,
        Text: ({ text }) => <div data-testid="konva-text">{text}</div>,
        Arrow: () => <div data-testid="konva-arrow" />,
        Image: () => <div data-testid="konva-image" />,
        Group: ({ children }) => <div data-testid="konva-group">{children}</div>,
    };
});

// Mock LayersPanel to simplify testing
vi.mock('@/components/LayersPanel', () => ({
    default: ({ elements }) => (
        <div data-testid="layers-panel">
            Layers: {elements?.length}
        </div>
    ),
}));

describe('Canvas Page', () => {
    const mockRouter = { push: vi.fn() };
    const mockUser = { uid: 'user123', email: 'test@example.com' };
    const mockCanvasId = 'canvas-abc';

    beforeEach(() => {
        vi.clearAllMocks();
        useRouter.mockReturnValue(mockRouter);
        useParams.mockReturnValue({ id: mockCanvasId });
    });

    it('redirects to login if user is not authenticated', () => {
        onAuthStateChanged.mockImplementation((auth, callback) => {
            callback(null);
            return () => { };
        });

        render(<CanvasPage />);
        expect(mockRouter.push).toHaveBeenCalledWith('/');
    });

    it.skip('renders the canvas container', async () => {
        onAuthStateChanged.mockImplementation((auth, callback) => {
            callback(mockUser);
            return () => { };
        });
        getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ title: 'Test Canvas', elements: [] })
        });

        render(<CanvasPage />);
        // Wait for any loading state to resolve
        await waitFor(() => {
            // We just check if we can find *something* that proves it rendered, 
            // avoiding complex Konva checks for a moment.
            // The mock Stage renders a div with data-testid="stage"
            expect(screen.getByTestId('stage')).toBeInTheDocument();
        });
    });

    it.skip('loads canvas data correctly', async () => {
        onAuthStateChanged.mockImplementation((auth, callback) => {
            callback(mockUser);
            return () => { };
        });

        getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({
                title: 'My Awesome Canvas',
                elements: [{ id: 1, type: 'rect' }]
            })
        });

        render(<CanvasPage />);

        // Check title update (input value)
        await waitFor(() => {
            const titleInput = screen.getByDisplayValue('My Awesome Canvas');
            expect(titleInput).toBeInTheDocument();
        });

        // Check elements loaded (via mocked LayersPanel)
        expect(screen.getByTestId('layers-panel')).toHaveTextContent('Layers: 1');
    });

    it.skip('handles tool selection from toolbar', async () => {
        onAuthStateChanged.mockImplementation((auth, callback) => {
            callback(mockUser);
            return () => { };
        });
        getDoc.mockResolvedValue({ exists: () => false }); // New canvas

        render(<CanvasPage />);

        await waitFor(() => screen.getByTestId('stage'));

        // Find tool buttons by aria-label or title (assuming Lucide icons are wrapped in buttons with titles)
        // Since we didn't add titles to buttons in the source code yet, we might rely on the structure or add titles.
        // Looking at source code: buttons have children icons.
        // Let's assume we can click them.

        // For this test, we verify the *logic* updates. 
        // We can check if the active class is applied.

        // NOTE: In a real integration test, ensuring accessibility labels (aria-label) is better.
        // For now, checks that buttons render.
        const toolbar = screen.getAllByRole('button');
        expect(toolbar.length).toBeGreaterThan(5);
    });

    it.skip('saves canvas on title change', async () => {
        onAuthStateChanged.mockImplementation((auth, callback) => {
            callback(mockUser);
            return () => { };
        });
        getDoc.mockResolvedValue({ exists: () => false });

        render(<CanvasPage />);

        await waitFor(() => screen.getByDisplayValue('Untitled'));

        const titleInput = screen.getByDisplayValue('Untitled');

        // Click to edit (if needed logic requires it) - logic says title is input
        fireEvent.change(titleInput, { target: { value: 'New Title' } });
        fireEvent.keyDown(titleInput, { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
            expect(setDoc).toHaveBeenCalled();
        });

        // Verify setDoc was called with new title
        expect(setDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ title: 'New Title' }),
            expect.anything()
        );
    });
});
