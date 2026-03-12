import type { ChainConfig } from "@mde/domain"

export const CHAINS: ChainConfig[] = [
  {
    "chainKey": "apechain",
    "chainId": 33139,
    "name": "ApeChain",
    "rpcUrls": [
      "${APECHAIN_RPC_URL}"
    ],
    "nativeGasToken": "APE",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "sushiswap"
    ]
  },
  {
    "chainKey": "aptos",
    "chainId": undefined,
    "name": "Aptos",
    "rpcUrls": [
      "${APTOS_RPC_URL}"
    ],
    "nativeGasToken": "APT",
    "isEvm": false,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "pancakeswap",
      "sushiswap"
    ]
  },
  {
    "chainKey": "arbitrum",
    "chainId": 42161,
    "name": "Arbitrum One",
    "rpcUrls": [
      "${ARBITRUM_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "aave_v3",
      "curve",
      "pancakeswap",
      "sushiswap",
      "uniswap_v3"
    ]
  },
  {
    "chainKey": "arbitrum_nova",
    "chainId": 42170,
    "name": "Arbitrum Nova",
    "rpcUrls": [
      "${ARBITRUM_NOVA_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "sushiswap"
    ]
  },
  {
    "chainKey": "aurora",
    "chainId": 1313161554,
    "name": "Aurora",
    "rpcUrls": [
      "${AURORA_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "curve"
    ]
  },
  {
    "chainKey": "avalanche",
    "chainId": 43114,
    "name": "Avalanche C-Chain",
    "rpcUrls": [
      "${AVALANCHE_RPC_URL}"
    ],
    "nativeGasToken": "AVAX",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "aave_v3",
      "curve",
      "sushiswap",
      "uniswap_v3"
    ]
  },
  {
    "chainKey": "base",
    "chainId": 8453,
    "name": "Base",
    "rpcUrls": [
      "${BASE_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "aave_v3",
      "curve",
      "pancakeswap",
      "sushiswap",
      "uniswap_v3"
    ]
  },
  {
    "chainKey": "blast",
    "chainId": 81457,
    "name": "Blast",
    "rpcUrls": [
      "${BLAST_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "curve",
      "sushiswap",
      "uniswap_v3"
    ]
  },
  {
    "chainKey": "bnb_chain",
    "chainId": 56,
    "name": "BNB Chain",
    "rpcUrls": [
      "${BNB_CHAIN_RPC_URL}"
    ],
    "nativeGasToken": "BNB",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "aave_v3",
      "curve",
      "pancakeswap",
      "sushiswap",
      "uniswap_v3"
    ]
  },
  {
    "chainKey": "boba_bnb",
    "chainId": 56288,
    "name": "Boba BNB",
    "rpcUrls": [
      "${BOBA_BNB_RPC_URL}"
    ],
    "nativeGasToken": "BOBA",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "sushiswap"
    ]
  },
  {
    "chainKey": "boba_eth",
    "chainId": 288,
    "name": "Boba Ethereum",
    "rpcUrls": [
      "${BOBA_ETH_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "sushiswap"
    ]
  },
  {
    "chainKey": "celo",
    "chainId": 42220,
    "name": "Celo",
    "rpcUrls": [
      "${CELO_RPC_URL}"
    ],
    "nativeGasToken": "CELO",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "curve",
      "sushiswap",
      "uniswap_v3"
    ]
  },
  {
    "chainKey": "core",
    "chainId": 1116,
    "name": "Core Blockchain",
    "rpcUrls": [
      "${CORE_RPC_URL}"
    ],
    "nativeGasToken": "CORE",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "sushiswap"
    ]
  },
  {
    "chainKey": "corn",
    "chainId": 21000000,
    "name": "Corn",
    "rpcUrls": [
      "${CORN_RPC_URL}"
    ],
    "nativeGasToken": "BTCN",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "curve"
    ]
  },
  {
    "chainKey": "cronos",
    "chainId": 25,
    "name": "Cronos",
    "rpcUrls": [
      "${CRONOS_RPC_URL}"
    ],
    "nativeGasToken": "CRO",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "sushiswap"
    ]
  },
  {
    "chainKey": "crossfi",
    "chainId": 4158,
    "name": "CrossFi",
    "rpcUrls": [
      "${CROSSFI_RPC_URL}"
    ],
    "nativeGasToken": "XFI",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "curve"
    ]
  },
  {
    "chainKey": "dydx_chain",
    "chainId": undefined,
    "name": "dYdX Chain",
    "rpcUrls": [
      "${DYDX_CHAIN_RPC_URL}"
    ],
    "nativeGasToken": "DYDX",
    "isEvm": false,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "dydx"
    ]
  },
  {
    "chainKey": "ethereum",
    "chainId": 1,
    "name": "Ethereum",
    "rpcUrls": [
      "${ETHEREUM_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "aave_v3",
      "curve",
      "dydx",
      "pancakeswap",
      "sushiswap",
      "uniswap_v3"
    ]
  },
  {
    "chainKey": "etherlink",
    "chainId": 42793,
    "name": "Etherlink",
    "rpcUrls": [
      "${ETHERLINK_RPC_URL}"
    ],
    "nativeGasToken": "XTZ",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "curve"
    ]
  },
  {
    "chainKey": "fantom",
    "chainId": 250,
    "name": "Fantom",
    "rpcUrls": [
      "${FANTOM_RPC_URL}"
    ],
    "nativeGasToken": "FTM",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "aave_v3",
      "curve",
      "sushiswap"
    ]
  },
  {
    "chainKey": "filecoin",
    "chainId": 314,
    "name": "Filecoin",
    "rpcUrls": [
      "${FILECOIN_RPC_URL}"
    ],
    "nativeGasToken": "FIL",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "sushiswap"
    ]
  },
  {
    "chainKey": "fraxtal",
    "chainId": 252,
    "name": "Fraxtal",
    "rpcUrls": [
      "${FRAXTAL_RPC_URL}"
    ],
    "nativeGasToken": "frxETH",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "curve"
    ]
  },
  {
    "chainKey": "gnosis",
    "chainId": 100,
    "name": "Gnosis Chain",
    "rpcUrls": [
      "${GNOSIS_RPC_URL}"
    ],
    "nativeGasToken": "xDAI",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "aave_v3",
      "curve",
      "sushiswap"
    ]
  },
  {
    "chainKey": "haqq",
    "chainId": 11235,
    "name": "Haqq Network",
    "rpcUrls": [
      "${HAQQ_RPC_URL}"
    ],
    "nativeGasToken": "ISLM",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "sushiswap"
    ]
  },
  {
    "chainKey": "harmony",
    "chainId": 1666600000,
    "name": "Harmony",
    "rpcUrls": [
      "${HARMONY_RPC_URL}"
    ],
    "nativeGasToken": "ONE",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "curve"
    ]
  },
  {
    "chainKey": "hemi",
    "chainId": 43111,
    "name": "Hemi",
    "rpcUrls": [
      "${HEMI_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "sushiswap"
    ]
  },
  {
    "chainKey": "hyperliquid_l1",
    "chainId": undefined,
    "name": "Hyperliquid L1",
    "rpcUrls": [
      "${HYPERLIQUID_L1_RPC_URL}"
    ],
    "nativeGasToken": "HYPE",
    "isEvm": false,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "curve"
    ]
  },
  {
    "chainKey": "ink",
    "chainId": 57073,
    "name": "Ink",
    "rpcUrls": [
      "${INK_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "curve"
    ]
  },
  {
    "chainKey": "katana",
    "chainId": undefined,
    "name": "Katana",
    "rpcUrls": [
      "${KATANA_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "sushiswap"
    ]
  },
  {
    "chainKey": "kava",
    "chainId": 2222,
    "name": "Kava",
    "rpcUrls": [
      "${KAVA_RPC_URL}"
    ],
    "nativeGasToken": "KAVA",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "curve",
      "sushiswap"
    ]
  },
  {
    "chainKey": "linea",
    "chainId": 59144,
    "name": "Linea",
    "rpcUrls": [
      "${LINEA_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "curve",
      "pancakeswap",
      "sushiswap"
    ]
  },
  {
    "chainKey": "manta_pacific",
    "chainId": 169,
    "name": "Manta Pacific",
    "rpcUrls": [
      "${MANTA_PACIFIC_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "curve",
      "sushiswap"
    ]
  },
  {
    "chainKey": "mantle",
    "chainId": 5000,
    "name": "Mantle",
    "rpcUrls": [
      "${MANTLE_RPC_URL}"
    ],
    "nativeGasToken": "MNT",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "curve",
      "sushiswap"
    ]
  },
  {
    "chainKey": "metis",
    "chainId": 1088,
    "name": "Metis Andromeda",
    "rpcUrls": [
      "${METIS_RPC_URL}"
    ],
    "nativeGasToken": "METIS",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "aave_v3",
      "curve",
      "sushiswap"
    ]
  },
  {
    "chainKey": "mode",
    "chainId": 34443,
    "name": "Mode",
    "rpcUrls": [
      "${MODE_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "curve",
      "sushiswap"
    ]
  },
  {
    "chainKey": "monad",
    "chainId": undefined,
    "name": "Monad",
    "rpcUrls": [
      "${MONAD_RPC_URL}"
    ],
    "nativeGasToken": "MON",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "curve",
      "pancakeswap"
    ]
  },
  {
    "chainKey": "moonbeam",
    "chainId": 1284,
    "name": "Moonbeam",
    "rpcUrls": [
      "${MOONBEAM_RPC_URL}"
    ],
    "nativeGasToken": "GLMR",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "curve"
    ]
  },
  {
    "chainKey": "noble",
    "chainId": undefined,
    "name": "Noble",
    "rpcUrls": [
      "${NOBLE_RPC_URL}"
    ],
    "nativeGasToken": "USDC",
    "isEvm": false,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "dydx"
    ]
  },
  {
    "chainKey": "opbnb",
    "chainId": 204,
    "name": "opBNB",
    "rpcUrls": [
      "${OPBNB_RPC_URL}"
    ],
    "nativeGasToken": "BNB",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "pancakeswap"
    ]
  },
  {
    "chainKey": "optimism",
    "chainId": 10,
    "name": "Optimism",
    "rpcUrls": [
      "${OPTIMISM_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "aave_v3",
      "curve",
      "sushiswap",
      "uniswap_v3"
    ]
  },
  {
    "chainKey": "plume_mainnet",
    "chainId": 98866,
    "name": "Plume Mainnet",
    "rpcUrls": [
      "${PLUME_MAINNET_RPC_URL}"
    ],
    "nativeGasToken": "PLUME",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "curve"
    ]
  },
  {
    "chainKey": "polygon",
    "chainId": 137,
    "name": "Polygon PoS",
    "rpcUrls": [
      "${POLYGON_RPC_URL}"
    ],
    "nativeGasToken": "POL",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "aave_v3",
      "curve",
      "sushiswap",
      "uniswap_v3"
    ]
  },
  {
    "chainKey": "polygon_zkevm",
    "chainId": 1101,
    "name": "Polygon zkEVM",
    "rpcUrls": [
      "${POLYGON_ZKEVM_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "curve",
      "pancakeswap"
    ]
  },
  {
    "chainKey": "rootstock",
    "chainId": 30,
    "name": "Rootstock",
    "rpcUrls": [
      "${ROOTSTOCK_RPC_URL}"
    ],
    "nativeGasToken": "RBTC",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "sushiswap"
    ]
  },
  {
    "chainKey": "scroll",
    "chainId": 534352,
    "name": "Scroll",
    "rpcUrls": [
      "${SCROLL_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "aave_v3",
      "sushiswap"
    ]
  },
  {
    "chainKey": "sepolia",
    "chainId": 11155111,
    "name": "Sepolia",
    "rpcUrls": [
      "${SEPOLIA_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "uniswap_v3"
    ]
  },
  {
    "chainKey": "skale_europa",
    "chainId": undefined,
    "name": "SKALE Europa",
    "rpcUrls": [
      "${SKALE_EUROPA_RPC_URL}"
    ],
    "nativeGasToken": "sFUEL",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "sushiswap"
    ]
  },
  {
    "chainKey": "solana",
    "chainId": undefined,
    "name": "Solana",
    "rpcUrls": [
      "${SOLANA_RPC_URL}"
    ],
    "nativeGasToken": "SOL",
    "isEvm": false,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "pancakeswap"
    ]
  },
  {
    "chainKey": "sonic",
    "chainId": 146,
    "name": "Sonic",
    "rpcUrls": [
      "${SONIC_RPC_URL}"
    ],
    "nativeGasToken": "S",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "curve",
      "sushiswap"
    ]
  },
  {
    "chainKey": "tac",
    "chainId": 239,
    "name": "TAC",
    "rpcUrls": [
      "${TAC_RPC_URL}"
    ],
    "nativeGasToken": "TAC",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "curve"
    ]
  },
  {
    "chainKey": "taiko",
    "chainId": 167000,
    "name": "Taiko Alethia",
    "rpcUrls": [
      "${TAIKO_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "curve",
      "sushiswap"
    ]
  },
  {
    "chainKey": "thundercore",
    "chainId": 108,
    "name": "ThunderCore",
    "rpcUrls": [
      "${THUNDERCORE_RPC_URL}"
    ],
    "nativeGasToken": "TT",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "sushiswap"
    ]
  },
  {
    "chainKey": "tron",
    "chainId": undefined,
    "name": "Tron",
    "rpcUrls": [
      "${TRON_RPC_URL}"
    ],
    "nativeGasToken": "TRX",
    "isEvm": false,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "sushiswap"
    ]
  },
  {
    "chainKey": "unichain",
    "chainId": 130,
    "name": "Unichain",
    "rpcUrls": [
      "${UNICHAIN_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "curve",
      "uniswap_v3"
    ]
  },
  {
    "chainKey": "unit_zero",
    "chainId": 88811,
    "name": "Unit Zero",
    "rpcUrls": [
      "${UNIT_ZERO_RPC_URL}"
    ],
    "nativeGasToken": "ZERO",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "curve"
    ]
  },
  {
    "chainKey": "world_chain",
    "chainId": 480,
    "name": "World Chain",
    "rpcUrls": [
      "${WORLD_CHAIN_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "uniswap_v3"
    ]
  },
  {
    "chainKey": "x_layer",
    "chainId": 196,
    "name": "X Layer",
    "rpcUrls": [
      "${X_LAYER_RPC_URL}"
    ],
    "nativeGasToken": "OKB",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "curve"
    ]
  },
  {
    "chainKey": "xdc",
    "chainId": 50,
    "name": "XDC",
    "rpcUrls": [
      "${XDC_RPC_URL}"
    ],
    "nativeGasToken": "XDC",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "curve"
    ]
  },
  {
    "chainKey": "zetachain",
    "chainId": 7000,
    "name": "ZetaChain",
    "rpcUrls": [
      "${ZETACHAIN_RPC_URL}"
    ],
    "nativeGasToken": "ZETA",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "sushiswap"
    ]
  },
  {
    "chainKey": "zklink_nova",
    "chainId": 810180,
    "name": "zkLink Nova",
    "rpcUrls": [
      "${ZKLINK_NOVA_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "sushiswap"
    ]
  },
  {
    "chainKey": "zksync_era",
    "chainId": 324,
    "name": "zkSync Era",
    "rpcUrls": [
      "${ZKSYNC_ERA_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": true,
    "bridgeProviders": [
      "across",
      "stargate",
      "layerzero",
      "wormhole",
      "cbridge",
      "debridge",
      "meson"
    ],
    "protocolKeys": [
      "aave_v3",
      "pancakeswap",
      "sushiswap",
      "uniswap_v3"
    ]
  },
  {
    "chainKey": "zora",
    "chainId": 7777777,
    "name": "Zora",
    "rpcUrls": [
      "${ZORA_RPC_URL}"
    ],
    "nativeGasToken": "ETH",
    "isEvm": true,
    "supportsBridges": false,
    "bridgeProviders": [],
    "protocolKeys": [
      "uniswap_v3"
    ]
  }
]
