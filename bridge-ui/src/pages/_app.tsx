import type { AppProps } from "next/app";
import "@styles/globals.css";
import "react-toastify/dist/ReactToastify.css";
import "@rainbow-me/rainbowkit/styles.css";
import { WagmiProvider, http } from "wagmi";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, arbitrum, optimism } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || "demo";

const wagmiConfig = getDefaultConfig({
  appName: "HyperPay Bridge",
  projectId,
  chains: [mainnet, arbitrum, optimism],
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http()
  },
  ssr: true
});

const queryClient = new QueryClient();

import Header from "@components/Header";
import dynamic from "next/dynamic";
import { SkateboardProvider } from "@lib/skateboard";

const SkateboardAnimation = dynamic(() => import("@components/SkateboardAnimation"), { ssr: false });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <SkateboardProvider>
            <Header />
            <Component {...pageProps} />
            <ToastContainer position="top-right" />
            <SkateboardAnimation />
          </SkateboardProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
