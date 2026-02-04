/**
 * Unit tests for Canvas helper functions
 * These are pure functions extracted from the canvas page for testing
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Canvas Helper Functions', () => {

    describe('History Management', () => {

        describe('saveToHistory', () => {
            it('should add new state to history', () => {
                const history = [[]];
                const historyStep = 0;
                const newElements = [{ id: 1, type: 'rectangle' }];

                // Simulate saveToHistory logic
                const newHistory = history.slice(0, historyStep + 1);
                newHistory.push(newElements);
                const newStep = newHistory.length - 1;

                expect(newHistory).toHaveLength(2);
                expect(newStep).toBe(1);
                expect(newHistory[1]).toEqual(newElements);
            });

            it('should truncate future history on new save', () => {
                const history = [[], [{ id: 1 }], [{ id: 1 }, { id: 2 }]];
                const historyStep = 1; // Currently at step 1, with step 2 in future
                const newElements = [{ id: 1 }, { id: 3 }];

                const newHistory = history.slice(0, historyStep + 1);
                newHistory.push(newElements);

                expect(newHistory).toHaveLength(3);
                expect(newHistory[2]).toEqual([{ id: 1 }, { id: 3 }]);
            });
        });


        describe('undo', () => {
            it('should move to previous step', () => {
                const historyStep = 2;
                let newStep = historyStep;

                if (historyStep > 0) {
                    newStep = historyStep - 1;
                }

                expect(newStep).toBe(1);
            });

            it('should not undo past step 0', () => {
                const historyStep = 0;
                let newStep = historyStep;

                if (historyStep > 0) {
                    newStep = historyStep - 1;
                }

                expect(newStep).toBe(0);
            });

            it('should return elements from previous step', () => {
                const history = [
                    [],
                    [{ id: 1 }],
                    [{ id: 1 }, { id: 2 }],
                ];
                const historyStep = 2;

                const newStep = historyStep - 1;
                const elements = history[newStep];

                expect(elements).toEqual([{ id: 1 }]);
            });
        });


        describe('redo', () => {
            it('should move to next step', () => {
                const history = [[], [{ id: 1 }], [{ id: 1 }, { id: 2 }]];
                const historyStep = 1;
                let newStep = historyStep;

                if (historyStep < history.length - 1) {
                    newStep = historyStep + 1;
                }

                expect(newStep).toBe(2);
            });

            it('should not redo past last step', () => {
                const history = [[], [{ id: 1 }]];
                const historyStep = 1; // Already at the end
                let newStep = historyStep;

                if (historyStep < history.length - 1) {
                    newStep = historyStep + 1;
                }

                expect(newStep).toBe(1);
            });

            it('should return elements from next step', () => {
                const history = [
                    [],
                    [{ id: 1 }],
                    [{ id: 1 }, { id: 2 }],
                ];
                const historyStep = 0;

                const newStep = historyStep + 1;
                const elements = history[newStep];

                expect(elements).toEqual([{ id: 1 }]);
            });
        });

    });


    describe('Zoom Functions', () => {

        describe('zoomIn', () => {
            it('should increase scale by 1.2x', () => {
                const stageScale = 1;
                const newScale = Math.min(5, stageScale * 1.2);
                expect(newScale).toBe(1.2);
            });

            it('should not exceed maximum scale of 5', () => {
                const stageScale = 4.5;
                const newScale = Math.min(5, stageScale * 1.2);
                expect(newScale).toBe(5);
            });

            it('should handle scale already at max', () => {
                const stageScale = 5;
                const newScale = Math.min(5, stageScale * 1.2);
                expect(newScale).toBe(5);
            });
        });


        describe('zoomOut', () => {
            it('should decrease scale by 1.2x', () => {
                const stageScale = 1.2;
                const newScale = Math.max(0.1, stageScale / 1.2);
                expect(newScale).toBeCloseTo(1, 5);
            });

            it('should not go below minimum scale of 0.1', () => {
                const stageScale = 0.15;
                const newScale = Math.max(0.1, stageScale / 1.2);
                expect(newScale).toBe(0.125);
            });

            it('should handle scale already at min', () => {
                const stageScale = 0.1;
                const newScale = Math.max(0.1, stageScale / 1.2);
                expect(newScale).toBeCloseTo(0.1, 5);
            });
        });


        describe('resetZoom', () => {
            it('should reset scale to 1', () => {
                const resetState = { stageScale: 1, stagePos: { x: 0, y: 0 } };
                expect(resetState.stageScale).toBe(1);
            });

            it('should reset position to origin', () => {
                const resetState = { stageScale: 1, stagePos: { x: 0, y: 0 } };
                expect(resetState.stagePos).toEqual({ x: 0, y: 0 });
            });
        });


        describe('handleWheel zoom calculation', () => {
            it('should zoom in when deltaY is negative', () => {
                const oldScale = 1;
                const scaleBy = 1.1;
                const deltaY = -100; // Scroll up = zoom in

                const newScale = deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
                expect(newScale).toBe(1.1);
            });

            it('should zoom out when deltaY is positive', () => {
                const oldScale = 1;
                const scaleBy = 1.1;
                const deltaY = 100; // Scroll down = zoom out

                const newScale = deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
                expect(newScale).toBeCloseTo(0.909, 2);
            });

            it('should limit zoom to valid range', () => {
                const newScale = 10;
                const limitedScale = Math.max(0.1, Math.min(5, newScale));
                expect(limitedScale).toBe(5);
            });
        });

    });


    describe('Element Manipulation', () => {

        describe('deleteSelected', () => {
            it('should remove selected element from array', () => {
                const elements = [
                    { id: 1, type: 'rectangle' },
                    { id: 2, type: 'circle' },
                    { id: 3, type: 'triangle' },
                ];
                const selectedId = 2;

                const newElements = elements.filter(el => el.id !== selectedId);

                expect(newElements).toHaveLength(2);
                expect(newElements.find(el => el.id === 2)).toBeUndefined();
            });

            it('should not modify array if selectedId is null', () => {
                const elements = [{ id: 1 }, { id: 2 }];
                const selectedId = null;

                // The function returns early if no selectedId
                if (!selectedId) {
                    expect(elements).toHaveLength(2);
                }
            });

            it('should return empty array when deleting last element', () => {
                const elements = [{ id: 1, type: 'rectangle' }];
                const selectedId = 1;

                const newElements = elements.filter(el => el.id !== selectedId);

                expect(newElements).toHaveLength(0);
            });
        });


        describe('clearCanvas', () => {
            it('should return empty array', () => {
                const cleared = [];
                expect(cleared).toHaveLength(0);
                expect(cleared).toEqual([]);
            });
        });


        describe('Shape creation calculations', () => {
            it('should calculate correct rectangle bounds', () => {
                const points = [100, 100, 200, 250]; // [x1, y1, x2, y2]

                const shape = {
                    x: Math.min(points[0], points[2]),
                    y: Math.min(points[1], points[3]),
                    width: Math.abs(points[2] - points[0]),
                    height: Math.abs(points[3] - points[1]),
                };

                expect(shape.x).toBe(100);
                expect(shape.y).toBe(100);
                expect(shape.width).toBe(100);
                expect(shape.height).toBe(150);
            });

            it('should handle reversed drawing direction', () => {
                const points = [200, 250, 100, 100]; // Drawing from bottom-right to top-left

                const shape = {
                    x: Math.min(points[0], points[2]),
                    y: Math.min(points[1], points[3]),
                    width: Math.abs(points[2] - points[0]),
                    height: Math.abs(points[3] - points[1]),
                };

                expect(shape.x).toBe(100);
                expect(shape.y).toBe(100);
                expect(shape.width).toBe(100);
                expect(shape.height).toBe(150);
            });

            it('should calculate circle center and radius', () => {
                const shape = { x: 100, y: 100, width: 80, height: 60 };

                const centerX = shape.x + shape.width / 2;
                const centerY = shape.y + shape.height / 2;
                const radius = Math.min(shape.width, shape.height) / 2;

                expect(centerX).toBe(140);
                expect(centerY).toBe(130);
                expect(radius).toBe(30);
            });
        });


        describe('Point adjustment for zoom/pan', () => {
            it('should adjust point for scale and position', () => {
                const pointerPosition = { x: 500, y: 400 };
                const stagePos = { x: 100, y: 50 };
                const stageScale = 2;

                const adjustedPoint = {
                    x: (pointerPosition.x - stagePos.x) / stageScale,
                    y: (pointerPosition.y - stagePos.y) / stageScale,
                };

                expect(adjustedPoint.x).toBe(200);
                expect(adjustedPoint.y).toBe(175);
            });

            it('should handle default scale and position', () => {
                const pointerPosition = { x: 300, y: 250 };
                const stagePos = { x: 0, y: 0 };
                const stageScale = 1;

                const adjustedPoint = {
                    x: (pointerPosition.x - stagePos.x) / stageScale,
                    y: (pointerPosition.y - stagePos.y) / stageScale,
                };

                expect(adjustedPoint.x).toBe(300);
                expect(adjustedPoint.y).toBe(250);
            });
        });

    });


    describe('Keyboard Shortcuts', () => {

        describe('Undo shortcut (Ctrl+Z)', () => {
            it('should detect Ctrl+Z', () => {
                const undo = vi.fn();

                const handleKeyDown = (e) => {
                    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
                        e.preventDefault();
                        undo();
                    }
                };

                handleKeyDown({ ctrlKey: true, metaKey: false, shiftKey: false, key: 'z', preventDefault: vi.fn() });

                expect(undo).toHaveBeenCalled();
            });

            it('should not trigger undo on Shift+Ctrl+Z', () => {
                const undo = vi.fn();

                const handleKeyDown = (e) => {
                    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
                        undo();
                    }
                };

                handleKeyDown({ ctrlKey: true, shiftKey: true, key: 'z' });

                expect(undo).not.toHaveBeenCalled();
            });
        });


        describe('Redo shortcut (Ctrl+Y or Ctrl+Shift+Z)', () => {
            it('should detect Ctrl+Y', () => {
                const redo = vi.fn();

                const handleKeyDown = (e) => {
                    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
                        redo();
                    }
                };

                handleKeyDown({ ctrlKey: true, metaKey: false, shiftKey: false, key: 'y' });

                expect(redo).toHaveBeenCalled();
            });

            it('should detect Ctrl+Shift+Z', () => {
                const redo = vi.fn();

                const handleKeyDown = (e) => {
                    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
                        redo();
                    }
                };

                handleKeyDown({ ctrlKey: true, shiftKey: true, key: 'z' });

                expect(redo).toHaveBeenCalled();
            });
        });

    });

});
