import type { NextConfig } from "next";
import configureBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.ctfassets.net",
      },
      {
        protocol: "https",
        hostname: "loremflickr.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ]
  }
};

const withBundleAnalyzer = configureBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(
  nextConfig
);

export default withBundleAnalyzer;
