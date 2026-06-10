import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
    // 포스터 업로드(서버 액션 FormData)가 3MB까지 허용되어야 한다.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
