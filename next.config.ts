import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // swaps in react-dom/profiling for the production build so React DevTools'
  // Profiler tab works on the deployed instance -- issue #1 only reproduces
  // deployed, and the stock production build strips profiling hooks entirely.
  // Revert once that issue is settled; it's overhead this app doesn't need
  // otherwise.
  reactProductionProfiling: true,
  // testing on the phone means loading the dev server over the LAN, and Next
  // refuses cross-origin dev-asset requests by default — without this the page
  // renders but never hydrates, so nothing is clickable
  allowedDevOrigins: ["10.0.0.23", "10.0.0.*"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
