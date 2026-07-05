import './globals.css';

export const metadata = {
  title: 'Side-by-Side Companion',
  description: 'Your AI Writing Companion',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
