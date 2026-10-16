import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // The calendar briefly had its own page; it now sits at the top of /milestones.
    return [{ source: "/milestones/calendar", destination: "/milestones", permanent: false }];
  },
};

export default nextConfig;
