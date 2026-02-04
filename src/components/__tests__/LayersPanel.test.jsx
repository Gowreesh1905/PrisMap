/**
 * Unit tests for LayersPanel helper functions
 */
import { describe, it, expect } from 'vitest';

// Extract the helper functions for testing
// These are the pure functions used in LayersPanel

/**
 * getElementLabel - Returns a display label for an element
 */
const getElementLabel = (el) => {
    if (el.type === 'text') return el.text?.substring(0, 15) || 'Text';
    if (el.type === 'pen') return 'Stroke';
    if (el.type === 'image') return 'Image';
    return el.type.charAt(0).toUpperCase() + el.type.slice(1);
};

/**
 * getElementIcon - Returns an emoji icon for an element type
 */
const getElementIcon = (type) => {
    const icons = {
        rectangle: '⬜', circle: '⭕', triangle: '🔺', star: '⭐',
        pentagon: '⬠', hexagon: '⬡', text: '📝', pen: '✏️',
        arrow: '➡️', line: '➖', image: '🖼️'
    };
    return icons[type] || '📦';
};


describe('LayersPanel Helper Functions', () => {

    describe('getElementLabel', () => {

        it('should truncate text elements to 15 characters', () => {
            const element = { type: 'text', text: 'This is a very long text that should be truncated' };
            expect(getElementLabel(element)).toBe('This is a very ');
        });

        it('should return "Text" for text elements with no text', () => {
            const element = { type: 'text', text: '' };
            expect(getElementLabel(element)).toBe('Text');
        });

        it('should return "Text" for text elements with undefined text', () => {
            const element = { type: 'text' };
            expect(getElementLabel(element)).toBe('Text');
        });

        it('should return "Stroke" for pen elements', () => {
            const element = { type: 'pen', points: [0, 0, 100, 100] };
            expect(getElementLabel(element)).toBe('Stroke');
        });

        it('should return "Image" for image elements', () => {
            const element = { type: 'image', src: 'test.png' };
            expect(getElementLabel(element)).toBe('Image');
        });

        it('should capitalize first letter for shape types', () => {
            expect(getElementLabel({ type: 'rectangle' })).toBe('Rectangle');
            expect(getElementLabel({ type: 'circle' })).toBe('Circle');
            expect(getElementLabel({ type: 'triangle' })).toBe('Triangle');
            expect(getElementLabel({ type: 'star' })).toBe('Star');
            expect(getElementLabel({ type: 'hexagon' })).toBe('Hexagon');
            expect(getElementLabel({ type: 'pentagon' })).toBe('Pentagon');
        });

        it('should handle short text without truncation', () => {
            const element = { type: 'text', text: 'Hello' };
            expect(getElementLabel(element)).toBe('Hello');
        });

    });


    describe('getElementIcon', () => {

        it('should return correct icon for rectangle', () => {
            expect(getElementIcon('rectangle')).toBe('⬜');
        });

        it('should return correct icon for circle', () => {
            expect(getElementIcon('circle')).toBe('⭕');
        });

        it('should return correct icon for triangle', () => {
            expect(getElementIcon('triangle')).toBe('🔺');
        });

        it('should return correct icon for star', () => {
            expect(getElementIcon('star')).toBe('⭐');
        });

        it('should return correct icon for pentagon', () => {
            expect(getElementIcon('pentagon')).toBe('⬠');
        });

        it('should return correct icon for hexagon', () => {
            expect(getElementIcon('hexagon')).toBe('⬡');
        });

        it('should return correct icon for text', () => {
            expect(getElementIcon('text')).toBe('📝');
        });

        it('should return correct icon for pen', () => {
            expect(getElementIcon('pen')).toBe('✏️');
        });

        it('should return correct icon for arrow', () => {
            expect(getElementIcon('arrow')).toBe('➡️');
        });

        it('should return correct icon for line', () => {
            expect(getElementIcon('line')).toBe('➖');
        });

        it('should return correct icon for image', () => {
            expect(getElementIcon('image')).toBe('🖼️');
        });

        it('should return default icon for unknown types', () => {
            expect(getElementIcon('unknown')).toBe('📦');
            expect(getElementIcon('custom')).toBe('📦');
            expect(getElementIcon('')).toBe('📦');
        });

    });

});
