/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['uuid', '@supabase/supabase-js'],
  },
}

module.exports = nextConfig