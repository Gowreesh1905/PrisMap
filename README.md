<p align="center">
  <h1 align="center">🎨 PrisMap</h1>
  <p align="center">
    <strong>Your Infinite Collaborative Canvas</strong>
  </p>
  <p align="center">
    A modern, feature-rich drawing application with an infinite canvas, real-time collaboration capabilities, and beautiful glassmorphism UI design.
  </p>
</p>

---

## ✨ Features

### 🖌️ Drawing Tools
- **Select Tool** - Select, move, and resize elements
- **Pen Tool** - Freehand drawing with customizable colors
- **Eraser Tool** - Remove unwanted strokes
- **Text Tool** - Add text annotations anywhere on canvas
- **Shape Tools** - Rectangle, Circle, Triangle, Star, Arrow

### 🎯 Canvas Capabilities
- **Infinite Canvas** - Pan and zoom with no boundaries
- **Zoom Controls** - Scroll to zoom or use dedicated zoom buttons
- **Undo/Redo** - Full history management with `Ctrl+Z` / `Ctrl+Y`
- **Layer Management** - Organize your drawings with layers panel

### 🎨 User Experience
- **Glassmorphism Design** - Modern, translucent UI with blur effects
- **Dark/Light Theme** - Toggle between themes with a single click
- **Keyboard Shortcuts** - Quick access to all tools and features
- **Responsive Layout** - Works seamlessly across different screen sizes

### 🔐 Authentication
- **Google Sign-In** - Secure authentication via Firebase
- **User Dashboard** - Personal workspace for your projects

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn** or **pnpm**
- **Firebase Project** with Google Authentication enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Gowreesh1905/PrisMap.git
   cd PrisMap
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory with your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

---

## ⌨️ Keyboard Shortcuts

### Global
| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Open search |
| `Ctrl + ,` | Open settings |
| `Escape` | Close dialogs / Cancel |

### Canvas
| Shortcut | Action |
|----------|--------|
| `Ctrl + Z` | Undo action |
| `Ctrl + Y` | Redo action |
| `Ctrl + S` | Save canvas |
| `Delete` | Delete selected element |
| `Escape` | Deselect / Cancel drawing |

### Tool Selection
| Key | Tool |
|-----|------|
| `1` | Select tool |
| `2` | Pen tool |
| `3` | Eraser tool |
| `4` | Text tool |
| `5` | Rectangle shape |
| `6` | Circle shape |
| `7` | Triangle shape |
| `8` | Star shape |
| `9` | Arrow tool |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router |
| **React 19** | UI component library |
| **Tailwind CSS 4** | Utility-first CSS framework |
| **Konva.js** | 2D canvas library for drawings |
| **React Konva** | React bindings for Konva |
| **Firebase** | Authentication & backend services |
| **Lucide React** | Beautiful icon library |

---

## 📁 Project Structure

```
PrisMap/
├── public/              # Static assets
├── src/
│   ├── app/             # Next.js App Router pages
│   │   ├── canvas/      # Main drawing canvas
│   │   ├── dashboard/   # User dashboard
│   │   ├── settings_page/  # Application settings
│   │   ├── shortcuts/   # Keyboard shortcuts reference
│   │   ├── page.jsx     # Login page
│   │   └── layout.js    # Root layout
│   ├── components/      # Reusable UI components
│   │   ├── Navbar.jsx   # Navigation bar
│   │   └── LayersPanel.jsx # Canvas layers panel
│   ├── hooks/           # Custom React hooks
│   │   └── useKeyboardShortcuts.js
│   └── lib/             # Utility functions & configs
│       └── firebase.js  # Firebase configuration
├── .env                 # Environment variables
├── tailwind.config.js   # Tailwind configuration
└── package.json         # Dependencies & scripts
```

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is private and proprietary.

---

## 👏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Canvas powered by [Konva.js](https://konvajs.org/)
- Icons by [Lucide](https://lucide.dev/)
- Authentication by [Firebase](https://firebase.google.com/)

---

<p align="center">
  <strong>Made with ❤️ for Sprint 1</strong>
</p>
