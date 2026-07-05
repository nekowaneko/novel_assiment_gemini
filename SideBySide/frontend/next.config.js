/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Required for Static Export to work with Electron
  images: {
    unoptimized: true, // Required for static export
  },
};

module.exports = nextConfig;
