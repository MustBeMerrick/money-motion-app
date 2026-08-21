import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // testing on the phone means loading the dev server over the LAN, and Next
  // refuses cross-origin dev-asset requests by default — without this the page
  // renders but never hydrates, so nothing is clickable
  allowedDevOrigins: ["10.0.0.23", "10.0.0.*"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
