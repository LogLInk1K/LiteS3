import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/hooks/use-translation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LiteS3",
  description: "Personal file management system for S3-compatible storage",
};

export const viewport: Viewport = {
  width: "device-width",
  // Tells the browser (from the HTML itself, before any stylesheet is fetched) that the
  // document can be painted dark, so an OS-dark session does not get a white canvas on
  // the very first frame. The .dark/.light rules below then pin the real choice.
  colorScheme: "light dark",
};

const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('theme') || 'system';
    var isDark = theme === 'dark' || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.add(isDark ? 'dark' : 'light');
  } catch (e) {}
})();
`;

const viewTransitionErrorScript = `
window.addEventListener('error', function(e) {
  if (e.message && e.message.indexOf('Transition was aborted') !== -1) return true;
});
window.addEventListener('unhandledrejection', function(e) {
  if (e.reason && e.reason.name === 'InvalidStateError' && e.reason.message && e.reason.message.indexOf('Transition was aborted') !== -1) {
    e.preventDefault();
  }
});
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const languageCookie = cookieStore.get("language");
  const initialLanguage = languageCookie?.value === "en" ? "en" : "zh";

  return (
    <html lang={initialLanguage === "en" ? "en" : "zh-CN"} suppressHydrationWarning>
      <head>
        {/* Chrome 115+: let the on-screen keyboard overlay the page instead of resizing the layout viewport or scrolling the document to reveal the focused field. Other engines ignore the tag. */}
        <meta name="interactive-widget" content="overlays-content" />
        {/* Plain inline scripts, not next/script: beforeInteractive registers inline children
            in __next_s and replays them after hydration, so the theme class would land
            well after the browser's first (white) paint. These run during head parsing. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: viewTransitionErrorScript }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <LanguageProvider initialLanguage={initialLanguage}>
            <Providers>
              {children}
            </Providers>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
