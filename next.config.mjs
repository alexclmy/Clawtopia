/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Bundle JSON data files into serverless lambdas so they're readable
  // on read-only environments like Vercel. Writes still fall back to a
  // no-op when the FS is read-only (Supabase is the write path there).
  outputFileTracingIncludes: {
    "/**/*": ["./data/**"]
  }
};

export default nextConfig;
