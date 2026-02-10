import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import LayersPanel from './LayersPanel'

describe('LayersPanel', () => {
    const mockElements = [
        { id: '1', type: 'rectangle', visible: true, locked: false },
        { id: '2', type: 'text', text: 'Sample Text', visible: false, locked: true }
    ];

    const mockHandlers = {
        onSelectElement: vi.fn(),
        onToggleVisibility: vi.fn(),
        onToggleLock: vi.fn(),
        onDelete: vi.fn(),
        onMoveUp: vi.fn(),
        onMoveDown: vi.fn(),
        onOpacityChange: vi.fn()
    };

    it('renders list of layers', () => {
        render(<LayersPanel elements={mockElements} selectedIds={[]} {...mockHandlers} />);

        expect(screen.getByText('Rectangle')).toBeInTheDocument();
        expect(screen.getByText('Sample Text')).toBeInTheDocument();
    });

    it('handles visibility toggle', () => {
        render(<LayersPanel elements={mockElements} selectedIds={[]} {...mockHandlers} />);

        // Find visibility button for first element (rectangle)
        // Rectangle is index 0 in data, but rendered list might be reversed or not?
        // Layers usually execute rendering in order (bottom to top), but UI shows top to bottom?
        // Component slices and reverses: {elements.slice().reverse().map...}
        // So 'Sample Text' (id: 2) is top, 'Rectangle' (id: 1) is bottom.

        const visibilityBtns = screen.getAllByTitle(/Hide|Show/);
        // First one should correspond to Sample Text (index 0 in rendered list)

        fireEvent.click(visibilityBtns[0]);
        // Sample Text (id 2) is visible=false -> Title should be 'Show'
        // Clicking it should call toggle(2)
        expect(mockHandlers.onToggleVisibility).toHaveBeenCalledWith('2');
    });

    it('handles locking toggle', () => {
        render(<LayersPanel elements={mockElements} selectedIds={[]} {...mockHandlers} />);

        const lockBtns = screen.getAllByTitle(/Lock|Unlock/);
        fireEvent.click(lockBtns[0]);
        expect(mockHandlers.onToggleLock).toHaveBeenCalledWith('2');
    });

    it('handles layer reordering', () => {
        render(<LayersPanel elements={mockElements} selectedIds={[]} {...mockHandlers} />);

        const moveUpBtns = screen.getAllByTitle('Move Up');
        fireEvent.click(moveUpBtns[0]);
        expect(mockHandlers.onMoveUp).toHaveBeenCalledWith('2');
    });
});
