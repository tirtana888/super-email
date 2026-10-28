/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
  output: process.env.DOCKER_OUTPUT ? "standalone" : undefined,
  serverExternalPackages: ["bullmq"],
  transpilePackages: ["@usesend/ui", "@usesend/email-editor"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.gravatar.com",
      },
    ],
  },
  // The app is a logged-in dashboard, so none of it belongs in search results.
  // This is a header rather than a robots.txt rule so crawlers can still fetch
  // the pages and see the noindex, which is what removes ones already indexed.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default config;
