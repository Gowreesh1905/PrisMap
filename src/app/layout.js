import "./globals.css";

export const metadata = {
  title: "Prisync",
  description: "Collaborative Whiteboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}