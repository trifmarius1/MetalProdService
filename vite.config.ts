import { defineConfig, type Plugin } from "vite";

const pagesBase = process.env.GITHUB_PAGES === "true" ? "/MetalProdService/" : "/";

function prefixPublicAssets(): Plugin {
  return {
    name: "prefix-public-assets",
    transformIndexHtml(html) {
      if (pagesBase === "/") return html;
      return html
        .replaceAll('href="/favicon', `href="${pagesBase}favicon`)
        .replaceAll('href="https://metalprodservice.com/"', `href="https://trifmarius1.github.io${pagesBase}"`)
        .replaceAll('content="/images/', `content="${pagesBase}images/`)
        .replaceAll('src="/images/', `src="${pagesBase}images/`)
        .replaceAll("https://metalprodservice.com/", `https://trifmarius1.github.io${pagesBase}`);
    },
  };
}

const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), midi=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=(), browsing-topics=(), fullscreen=(self)",
  "X-DNS-Prefetch-Control": "off",
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-Permitted-Cross-Domain-Policies": "none",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.bunny.net; font-src https://fonts.bunny.net; img-src 'self' data:; frame-src https://www.openstreetmap.org; child-src https://www.openstreetmap.org; connect-src 'self' https://formsubmit.co; worker-src 'none'; manifest-src 'self'; media-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self' mailto: https://formsubmit.co; frame-ancestors 'self'; upgrade-insecure-requests",
};

export default defineConfig({
  base: pagesBase,
  plugins: [prefixPublicAssets()],
  server: {
    port: 5173,
    host: true,
    headers: securityHeaders,
  },
  preview: {
    port: 4173,
    host: true,
    headers: securityHeaders,
  },
  build: {
    target: "es2022",
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
        },
      },
    },
  },
});
