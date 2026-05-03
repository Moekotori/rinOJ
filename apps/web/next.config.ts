import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@rin-oj/rin-ui"],
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
