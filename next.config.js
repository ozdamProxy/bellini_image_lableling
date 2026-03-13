/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow S3 images from any region
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      // Allow presigned URLs (they have unique subdomains)
      {
        protocol: 'https',
        hostname: '**.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.s3.eu-central-1.amazonaws.com',
      },
    ],
    unoptimized: true,
  },
}

module.exports = nextConfig
