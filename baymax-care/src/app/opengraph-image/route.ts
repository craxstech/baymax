import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Baymax Care — Family health, thoughtfully connected",
  description: "Understand medical reports, manage medications, keep family health records organised, and connect with healthcare professionals when you need them.",
  openGraph: {
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Baymax Care — Your family's health, in one caring place",
      },
    ],
  },
};

export const dynamic = "force-dynamic";

export async function GET() {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <style>
      .bg { fill: #FFFFFF; }
      .accent { fill: #087F83; }
      .text { fill: #172B35; font-family: sans-serif; font-weight: 600; }
      .muted { fill: #60727A; font-family: sans-serif; }
    </style>
  </defs>
  <rect class="bg" width="1200" height="630" />
  <circle cx="1080" cy="180" r="120" fill="#E8F8F6" />
  <rect x="60" y="60" width="400" height="400" rx="24" fill="#F5FBFA" stroke="#DCE8E8" strokeWidth="2" />
  <circle cx="260" cy="160" r="56" fill="#FFFFFF" stroke="#087F83" strokeWidth="4" />
  <path d="M130 130c-2.55 1.75-2.55 5.6 0 7.35M390 130c2.55 1.75-2.55 5.6 0 7.35" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
  <path d="M260 201.6v-10.3m-5.1 5.16h10.2" fill="none" stroke="#8FE3DE" strokeWidth="4" strokeLinecap="round" />
  <circle cx="260" cy="260" r="13.2" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeOpacity="0.36" />
  <text x="60" y="340" class="text" font-size="40">Baymax Care</text>
  <text x="60" y="385" class="muted" font-size="24">Your family's health, in one caring place.</text>
  <text x="60" y="440" class="muted" font-size="20">Private health records · Medication reminders · Report explanations · Emergency contacts</text>
  <rect x="60" y="480" width="200" height="52" rx="10" fill="#087F83" />
  <text x="160" y="515" class="bg" font-size="22" text-anchor="middle">Create your account</text>
</svg>
`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
