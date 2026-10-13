/** @type {import("next").NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // No other site may frame a paper, guess at a file's type, or learn which piece a reader came from.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
