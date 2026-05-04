// app/layout.js
import "./globals.css";

export const metadata = {
  title: "Life Growth — Dashboard",
  description: "Discipline tracker — sync your scores, track your growth.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
