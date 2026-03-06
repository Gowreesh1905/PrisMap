import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Ensure DOM is cleaned up between tests (critical with isolate: false)
afterEach(() => {
    cleanup();
});

// Mock Konva/Canvas environment interactions if necessary
// (e.g., resizing, specialized browser APIs)

// Ensure Request/Response are available in jsdom (often needed for Next.js app router mocks)
if (typeof Request === 'undefined') {
    global.Request = class Request { };
}
if (typeof Response === 'undefined') {
    global.Response = class Response { };
}

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useParams: vi.fn(),
    useRouter: vi.fn(() => ({
        push: vi.fn(),
        replace: vi.fn(),
        back: vi.fn(),
    })),
    usePathname: vi.fn(),
    useSearchParams: vi.fn(() => ({
        get: vi.fn(),
    })),
}));

// Mock Next.js Image
vi.mock('next/image', () => ({
    default: (props) => <img {...props} />,
}));

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
    auth: {
        currentUser: { uid: 'test-user-id' },
        onAuthStateChanged: vi.fn((callback) => {
            callback({ uid: 'test-user-id' });
            return () => { };
        }),
    },
    db: {
        collection: vi.fn(),
        doc: vi.fn(),
    },
    googleProvider: {},
    storage: {},
}));

// Mock Firebase SDKs
vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn().mockResolvedValue(),
    getDoc: vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
            title: 'Test Canvas',
            elements: [],
            lastModified: new Date(),
            ownerId: 'test-user-id'
        })
    }),
    collection: vi.fn(),
    serverTimestamp: vi.fn(),
    onSnapshot: vi.fn(() => vi.fn()),
    deleteDoc: vi.fn().mockResolvedValue(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    updateDoc: vi.fn().mockResolvedValue(),
    addDoc: vi.fn().mockResolvedValue({ id: 'mock-doc-id' }),
    deleteField: vi.fn(),
    arrayUnion: vi.fn(),
    arrayRemove: vi.fn(),
    writeBatch: vi.fn(() => ({ delete: vi.fn(), commit: vi.fn().mockResolvedValue() })),
    getDocs: vi.fn().mockResolvedValue({ docs: [], forEach: vi.fn() }),
}));

vi.mock('firebase/storage', () => ({
    getStorage: vi.fn(),
    ref: vi.fn(),
    uploadBytes: vi.fn(),
    getDownloadURL: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(),
    onAuthStateChanged: vi.fn((auth, callback) => {
        callback({ uid: 'test-user-id' });
        return () => { };
    }),
    GoogleAuthProvider: vi.fn(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
}));

// Mock Konva and react-konva to avoid canvas issues in jsdom/happy-dom
vi.mock('konva', () => ({
    default: {
        Stage: () => { },
        Layer: () => { },
        Group: () => { },
    }
}));

vi.mock('react-konva', () => {
    return {
        Stage: ({ children }) => <div data-testid="stage">{children}</div>,
        Layer: ({ children }) => <div data-testid="layer">{children}</div>,
        Rect: ({ onClick, ...props }) => <div data-testid="rect" onClick={onClick} {...props} />,
        Circle: ({ onClick, ...props }) => <div data-testid="circle" onClick={onClick} {...props} />,
        Text: ({ onClick, text, ...props }) => <div data-testid="text" onClick={onClick} {...props}>{text}</div>,
        Line: ({ ...props }) => <div data-testid="line" {...props} />,
        Image: ({ ...props }) => <div data-testid="image" {...props} />,
        Transformer: () => <div data-testid="transformer" />,
        Group: ({ children }) => <div data-testid="group">{children}</div>,
        Star: () => <div data-testid="star" />,
        RegularPolygon: () => <div data-testid="shape" />,
        Arrow: () => <div data-testid="arrow" />,
    }
});

vi.mock('use-image', () => ({
    default: () => [null, 'loading'],
}));

vi.mock('canvas', () => ({
    default: {
        createCanvas: () => ({
            getContext: () => ({
                fillRect: () => { },
                drawImage: () => { },
            }),
            toDataURL: () => '',
        }),
        loadImage: () => Promise.resolve({}),
    }
}));

// Mock ShortcutContext with default shortcuts data
vi.mock('@/contexts/ShortcutContext', () => ({
    ShortcutProvider: ({ children }) => children,
    useShortcuts: () => ({
        shortcuts: {
            undo: { combo: "ctrl+z", description: "Undo action", category: "canvas" },
            redo: { combo: "ctrl+y", description: "Redo action", category: "canvas" },
            save: { combo: "ctrl+s", description: "Save canvas", category: "canvas" },
            copy: { combo: "ctrl+c", description: "Copy selected", category: "canvas" },
            paste: { combo: "ctrl+v", description: "Paste clipboard", category: "canvas" },
            duplicate: { combo: "ctrl+d", description: "Duplicate selected", category: "canvas" },
            delete: { combo: "delete", description: "Delete selected element", category: "canvas" },
            escape: { combo: "escape", description: "Deselect / Cancel drawing", category: "canvas" },
            selectTool: { combo: "1", description: "Select tool", category: "tools" },
            penTool: { combo: "2", description: "Pen tool", category: "tools" },
            eraserTool: { combo: "3", description: "Eraser tool", category: "tools" },
            textTool: { combo: "4", description: "Text tool", category: "tools" },
            rectangleTool: { combo: "5", description: "Rectangle shape", category: "tools" },
            circleTool: { combo: "6", description: "Circle shape", category: "tools" },
            triangleTool: { combo: "7", description: "Triangle shape", category: "tools" },
            starTool: { combo: "8", description: "Star shape", category: "tools" },
            arrowTool: { combo: "9", description: "Arrow tool", category: "tools" },
            lineTool: { combo: "l", description: "Line tool", category: "tools" },
            hexagonTool: { combo: "h", description: "Hexagon shape", category: "tools" },
            pentagonTool: { combo: "j", description: "Pentagon shape", category: "tools" },
        },
        updateShortcut: vi.fn(() => ({ success: true })),
        resetToDefaults: vi.fn(),
        getComboToActionMap: vi.fn(() => ({})),
    }),
}));

