/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The catalog is rebuilt at most once per day; pages use
  // `export const revalidate = 86400` for ISR.
  //
  // /api/stats reads data/stats/*.json at request time (force-dynamic); bundle
  // those snapshots into the serverless function so they're readable on Vercel.
  outputFileTracingIncludes: {
    "/api/stats": ["./data/stats/**/*"],
  },
};

module.exports = nextConfig;
