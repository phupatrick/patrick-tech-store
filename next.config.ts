import type { NextConfig } from "next";

const imageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "f1-zpprd.zdn.vn,wsrv.nl")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: imageHosts.map((hostname) => ({
      protocol: "https",
      hostname
    }))
  }
};

export default nextConfig;
