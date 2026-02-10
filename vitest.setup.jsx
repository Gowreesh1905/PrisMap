import '@testing-library/jest-dom'
import { vi } from 'vitest'

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
    setDoc: vi.fn(),
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
    onSnapshot: vi.fn(),
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
