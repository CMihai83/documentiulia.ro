import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { roRO } from "@clerk/localizations";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DocumentIulia - Platformă Contabilitate România",
  description: "Platformă completă de contabilitate pentru companii din România cu integrare e-Factura, SAF-T, și funcții de comunitate",
  keywords: ["contabilitate", "e-factura", "SAF-T", "TVA", "România", "facturi", "cheltuieli"],
  authors: [{ name: "DocumentIulia" }],
  openGraph: {
    title: "DocumentIulia - Platformă Contabilitate România",
    description: "Platformă completă de contabilitate pentru companii din România",
    url: "https://documentiulia.ro",
    siteName: "DocumentIulia",
    locale: "ro_RO",
    type: "website",
  },
};

// Check if Clerk is properly configured
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isClerkConfigured = clerkPublishableKey && !clerkPublishableKey.includes('your_clerk');

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html lang="ro">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );

  // Only wrap with ClerkProvider if properly configured
  if (isClerkConfigured) {
    return (
      <ClerkProvider localization={roRO}>
        {content}
      </ClerkProvider>
    );
  }

  return content;
}
