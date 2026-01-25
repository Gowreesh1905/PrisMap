import "./globals.css";

export const metadata = {
  title: "PrisMap",
  description: "Collaborative Whiteboard",
};

export default function RootLayout({ children }) {
  // Inline script to prevent flash of wrong theme
  const themeInitScript = `
    (function() {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

