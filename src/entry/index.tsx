/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WagmiConfig, createClient, goerli, mainnet, configureChains, useQuery, useContractRead } from 'wagmi';
import style from './index.module.less';
import { routeConfigs } from './routeConfigs';
import { NavLine } from './NavLine';
import '../theme.less';
import { infuraProvider } from 'wagmi/providers/infura';
import { publicProvider } from 'wagmi/providers/public';

import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { InjectedConnector } from 'wagmi/dist/connectors/injected';
import { GlobalStatsContext } from '../contexts/globalStatsContext';
import axios from 'axios';
import useTVL from '../hooks/useTVL';
import { formatEther, parseEther } from 'ethers/lib/utils.js';
import { getContracts } from '../page/Farm/tokenConfigs';
import { type BigNumber } from 'ethers';

// Configure chains & providers with the Alchemy provider.
// Two popular providers are Alchemy (alchemy.com) and Infura (infura.io)
const { chains, provider, webSocketProvider } = configureChains(
  [mainnet, goerli],
  [infuraProvider({ apiKey: '984b463612ff47fc93c9607b89e96ee8' }), publicProvider()],
);

const client = createClient({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: '3d8d3a0c9a64a94b80febc07f5ae4c9e',
      },
    }),
    // new InjectedConnector({
    //   chains,
    //   options: {
    //     name: 'Injected',
    //     shimDisconnect: true,
    //   },
    // }),
  ],
  provider,
  webSocketProvider,
});

const { list, home } = routeConfigs;

const Layout = ({ children }: any) => {
  const { data, isFetching } = useQuery(
    ['ethPrice'],
    async () => {
      return await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    },
    {
      refetchInterval: 10000,
      keepPreviousData: true,
    },
  );

  const TVL = useTVL();

  const {
    data: AGITotalSupplyData,
    isError,
    isLoading,
  } = useContractRead({
    address: getContracts().AGI.address,
    abi: getContracts().AGI.abi,
    functionName: 'totalSupply',
  });

  return (
    <GlobalStatsContext.Provider
      value={{
        ethPrice: data?.data.ethereum.usd || 0,
        TVL: Number(formatEther(TVL.toString()).toString()),
        AGIPrice: 0,
        AGITotalSupply: Number(formatEther(AGITotalSupplyData as unknown as BigNumber)),
      }}
    >
      <div className={style.container_body}>
        <NavLine />
        <div className={style.main_content_wrapper}>
          <Routes>
            <Route path="/" element={home} />
            {list.map(route => (
              <Route path={route.path} element={route.component} key={route.path} />
            ))}
            <Route path="*" element={home} />
          </Routes>
        </div>
      </div>
    </GlobalStatsContext.Provider>
  );
};

export default function App() {
  return (
    <WagmiConfig client={client}>
      <Layout></Layout>
    </WagmiConfig>
  );
}

let container: HTMLElement | null = null;
document.addEventListener('DOMContentLoaded', function (event) {
  if (container == null) {
    container = document.getElementById('root') as HTMLElement;
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>,
    );
  }
});
