import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    serverExternalPackages: [
        '@tetherto/wdk-wallet-evm-erc-4337'
    ],
};

export default nextConfig;
