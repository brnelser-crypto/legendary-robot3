import type { ProtocolDeployment } from "@mde/domain"

export const PROTOCOL_DEPLOYMENTS: ProtocolDeployment[] = [
  {
    "protocolKey": "aave_v3",
    "chainKey": "ethereum",
    "routerType": "flash-loan",
    "contracts": {
      "pool": "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"
    },
    "feeModel": {
      "type": "fixed_bps",
      "value": 5
    },
    "callbackType": "executeOperation",
    "notes": [
      "Supports flashLoan and flashLoanSimple",
      "Reserve must have borrow enabled"
    ]
  },
  {
    "protocolKey": "aave_v3",
    "chainKey": "arbitrum",
    "routerType": "flash-loan",
    "contracts": {
      "pool": "0x794a61358D6845594F94dc1DB02A252b5b4814aD"
    },
    "feeModel": {
      "type": "fixed_bps",
      "value": 5
    },
    "callbackType": "executeOperation",
    "notes": [
      "Supports flashLoan and flashLoanSimple",
      "Reserve must have borrow enabled"
    ]
  },
  {
    "protocolKey": "aave_v3",
    "chainKey": "optimism",
    "routerType": "flash-loan",
    "contracts": {
      "pool": "0x794a61358D6845594F94dc1DB02A252b5b4814aD"
    },
    "feeModel": {
      "type": "fixed_bps",
      "value": 5
    },
    "callbackType": "executeOperation",
    "notes": [
      "Supports flashLoan and flashLoanSimple",
      "Reserve must have borrow enabled"
    ]
  },
  {
    "protocolKey": "aave_v3",
    "chainKey": "polygon",
    "routerType": "flash-loan",
    "contracts": {
      "pool": "0x794a61358D6845594F94dc1DB02A252b5b4814aD"
    },
    "feeModel": {
      "type": "fixed_bps",
      "value": 5
    },
    "callbackType": "executeOperation",
    "notes": [
      "Supports flashLoan and flashLoanSimple",
      "Reserve must have borrow enabled"
    ]
  },
  {
    "protocolKey": "aave_v3",
    "chainKey": "avalanche",
    "routerType": "flash-loan",
    "contracts": {
      "pool": "0x794a61358D6845594F94dc1DB02A252b5b4814aD"
    },
    "feeModel": {
      "type": "fixed_bps",
      "value": 5
    },
    "callbackType": "executeOperation",
    "notes": [
      "Supports flashLoan and flashLoanSimple",
      "Reserve must have borrow enabled"
    ]
  },
  {
    "protocolKey": "aave_v3",
    "chainKey": "base",
    "routerType": "flash-loan",
    "contracts": {
      "pool": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5"
    },
    "feeModel": {
      "type": "fixed_bps",
      "value": 5
    },
    "callbackType": "executeOperation",
    "notes": [
      "Supports flashLoan and flashLoanSimple",
      "Reserve must have borrow enabled"
    ]
  },
  {
    "protocolKey": "aave_v3",
    "chainKey": "bnb_chain",
    "routerType": "flash-loan",
    "contracts": {
      "pool": "DISCOVER_FROM_AAVE_ADDRESSES_PROVIDER"
    },
    "feeModel": {
      "type": "fixed_bps",
      "value": 5
    },
    "callbackType": "executeOperation",
    "notes": [
      "Supports flashLoan and flashLoanSimple",
      "Reserve must have borrow enabled"
    ]
  },
  {
    "protocolKey": "aave_v3",
    "chainKey": "gnosis",
    "routerType": "flash-loan",
    "contracts": {
      "pool": "DISCOVER_FROM_AAVE_ADDRESSES_PROVIDER"
    },
    "feeModel": {
      "type": "fixed_bps",
      "value": 5
    },
    "callbackType": "executeOperation",
    "notes": [
      "Supports flashLoan and flashLoanSimple",
      "Reserve must have borrow enabled"
    ]
  },
  {
    "protocolKey": "aave_v3",
    "chainKey": "metis",
    "routerType": "flash-loan",
    "contracts": {
      "pool": "DISCOVER_FROM_AAVE_ADDRESSES_PROVIDER"
    },
    "feeModel": {
      "type": "fixed_bps",
      "value": 5
    },
    "callbackType": "executeOperation",
    "notes": [
      "Supports flashLoan and flashLoanSimple",
      "Reserve must have borrow enabled"
    ]
  },
  {
    "protocolKey": "aave_v3",
    "chainKey": "scroll",
    "routerType": "flash-loan",
    "contracts": {
      "pool": "DISCOVER_FROM_AAVE_ADDRESSES_PROVIDER"
    },
    "feeModel": {
      "type": "fixed_bps",
      "value": 5
    },
    "callbackType": "executeOperation",
    "notes": [
      "Supports flashLoan and flashLoanSimple",
      "Reserve must have borrow enabled"
    ]
  },
  {
    "protocolKey": "aave_v3",
    "chainKey": "zksync_era",
    "routerType": "flash-loan",
    "contracts": {
      "pool": "DISCOVER_FROM_AAVE_ADDRESSES_PROVIDER"
    },
    "feeModel": {
      "type": "fixed_bps",
      "value": 5
    },
    "callbackType": "executeOperation",
    "notes": [
      "Supports flashLoan and flashLoanSimple",
      "Reserve must have borrow enabled"
    ]
  },
  {
    "protocolKey": "aave_v3",
    "chainKey": "fantom",
    "routerType": "flash-loan",
    "contracts": {
      "pool": "DISCOVER_FROM_AAVE_ADDRESSES_PROVIDER"
    },
    "feeModel": {
      "type": "fixed_bps",
      "value": 5
    },
    "callbackType": "executeOperation",
    "notes": [
      "Supports flashLoan and flashLoanSimple",
      "Reserve must have borrow enabled"
    ]
  },
  {
    "protocolKey": "uniswap_v3",
    "chainKey": "ethereum",
    "routerType": "flash-swap",
    "contracts": {
      "factory": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      "router": "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      "quoterV2": "0x61fFE014bA17989E743c5F6cB21bF9697530B21e"
    },
    "feeModel": {
      "type": "tiered_pool",
      "tiers": [
        5,
        30,
        100
      ]
    },
    "callbackType": "uniswapV3FlashCallback",
    "notes": [
      "Use UniswapV3Pool directly as flash liquidity source",
      "Prefer deeper pools for large notionals"
    ]
  },
  {
    "protocolKey": "uniswap_v3",
    "chainKey": "sepolia",
    "routerType": "flash-swap",
    "contracts": {
      "factory": "DISCOVER_FROM_UNISWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "tiered_pool",
      "tiers": [
        5,
        30,
        100
      ]
    },
    "callbackType": "uniswapV3FlashCallback",
    "notes": [
      "Use UniswapV3Pool directly as flash liquidity source",
      "Prefer deeper pools for large notionals"
    ]
  },
  {
    "protocolKey": "uniswap_v3",
    "chainKey": "arbitrum",
    "routerType": "flash-swap",
    "contracts": {
      "factory": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      "router": "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      "quoterV2": "0x61fFE014bA17989E743c5F6cB21bF9697530B21e"
    },
    "feeModel": {
      "type": "tiered_pool",
      "tiers": [
        5,
        30,
        100
      ]
    },
    "callbackType": "uniswapV3FlashCallback",
    "notes": [
      "Use UniswapV3Pool directly as flash liquidity source",
      "Prefer deeper pools for large notionals"
    ]
  },
  {
    "protocolKey": "uniswap_v3",
    "chainKey": "optimism",
    "routerType": "flash-swap",
    "contracts": {
      "factory": "DISCOVER_FROM_UNISWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "tiered_pool",
      "tiers": [
        5,
        30,
        100
      ]
    },
    "callbackType": "uniswapV3FlashCallback",
    "notes": [
      "Use UniswapV3Pool directly as flash liquidity source",
      "Prefer deeper pools for large notionals"
    ]
  },
  {
    "protocolKey": "uniswap_v3",
    "chainKey": "polygon",
    "routerType": "flash-swap",
    "contracts": {
      "factory": "DISCOVER_FROM_UNISWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "tiered_pool",
      "tiers": [
        5,
        30,
        100
      ]
    },
    "callbackType": "uniswapV3FlashCallback",
    "notes": [
      "Use UniswapV3Pool directly as flash liquidity source",
      "Prefer deeper pools for large notionals"
    ]
  },
  {
    "protocolKey": "uniswap_v3",
    "chainKey": "bnb_chain",
    "routerType": "flash-swap",
    "contracts": {
      "factory": "DISCOVER_FROM_UNISWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "tiered_pool",
      "tiers": [
        5,
        30,
        100
      ]
    },
    "callbackType": "uniswapV3FlashCallback",
    "notes": [
      "Use UniswapV3Pool directly as flash liquidity source",
      "Prefer deeper pools for large notionals"
    ]
  },
  {
    "protocolKey": "uniswap_v3",
    "chainKey": "avalanche",
    "routerType": "flash-swap",
    "contracts": {
      "factory": "DISCOVER_FROM_UNISWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "tiered_pool",
      "tiers": [
        5,
        30,
        100
      ]
    },
    "callbackType": "uniswapV3FlashCallback",
    "notes": [
      "Use UniswapV3Pool directly as flash liquidity source",
      "Prefer deeper pools for large notionals"
    ]
  },
  {
    "protocolKey": "uniswap_v3",
    "chainKey": "celo",
    "routerType": "flash-swap",
    "contracts": {
      "factory": "DISCOVER_FROM_UNISWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "tiered_pool",
      "tiers": [
        5,
        30,
        100
      ]
    },
    "callbackType": "uniswapV3FlashCallback",
    "notes": [
      "Use UniswapV3Pool directly as flash liquidity source",
      "Prefer deeper pools for large notionals"
    ]
  },
  {
    "protocolKey": "uniswap_v3",
    "chainKey": "base",
    "routerType": "flash-swap",
    "contracts": {
      "factory": "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
      "router": "0x2626664c2603336E57B271c5C0b26F421741e481",
      "quoterV2": "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a"
    },
    "feeModel": {
      "type": "tiered_pool",
      "tiers": [
        5,
        30,
        100
      ]
    },
    "callbackType": "uniswapV3FlashCallback",
    "notes": [
      "Use UniswapV3Pool directly as flash liquidity source",
      "Prefer deeper pools for large notionals"
    ]
  },
  {
    "protocolKey": "uniswap_v3",
    "chainKey": "blast",
    "routerType": "flash-swap",
    "contracts": {
      "factory": "DISCOVER_FROM_UNISWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "tiered_pool",
      "tiers": [
        5,
        30,
        100
      ]
    },
    "callbackType": "uniswapV3FlashCallback",
    "notes": [
      "Use UniswapV3Pool directly as flash liquidity source",
      "Prefer deeper pools for large notionals"
    ]
  },
  {
    "protocolKey": "uniswap_v3",
    "chainKey": "zksync_era",
    "routerType": "flash-swap",
    "contracts": {
      "factory": "DISCOVER_FROM_UNISWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "tiered_pool",
      "tiers": [
        5,
        30,
        100
      ]
    },
    "callbackType": "uniswapV3FlashCallback",
    "notes": [
      "Use UniswapV3Pool directly as flash liquidity source",
      "Prefer deeper pools for large notionals"
    ]
  },
  {
    "protocolKey": "uniswap_v3",
    "chainKey": "zora",
    "routerType": "flash-swap",
    "contracts": {
      "factory": "DISCOVER_FROM_UNISWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "tiered_pool",
      "tiers": [
        5,
        30,
        100
      ]
    },
    "callbackType": "uniswapV3FlashCallback",
    "notes": [
      "Use UniswapV3Pool directly as flash liquidity source",
      "Prefer deeper pools for large notionals"
    ]
  },
  {
    "protocolKey": "uniswap_v3",
    "chainKey": "world_chain",
    "routerType": "flash-swap",
    "contracts": {
      "factory": "DISCOVER_FROM_UNISWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "tiered_pool",
      "tiers": [
        5,
        30,
        100
      ]
    },
    "callbackType": "uniswapV3FlashCallback",
    "notes": [
      "Use UniswapV3Pool directly as flash liquidity source",
      "Prefer deeper pools for large notionals"
    ]
  },
  {
    "protocolKey": "uniswap_v3",
    "chainKey": "unichain",
    "routerType": "flash-swap",
    "contracts": {
      "factory": "DISCOVER_FROM_UNISWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "tiered_pool",
      "tiers": [
        5,
        30,
        100
      ]
    },
    "callbackType": "uniswapV3FlashCallback",
    "notes": [
      "Use UniswapV3Pool directly as flash liquidity source",
      "Prefer deeper pools for large notionals"
    ]
  },
  {
    "protocolKey": "pancakeswap",
    "chainKey": "bnb_chain",
    "routerType": "flash-swap",
    "contracts": {
      "router": "DISCOVER_FROM_PANCAKESWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic",
      "tiers": [
        1,
        5,
        30
      ]
    },
    "callbackType": "pancakeCall",
    "notes": [
      "Across / bridge providers handled by bridge router",
      "Infinity flash accounting supported through compatibility layer"
    ]
  },
  {
    "protocolKey": "pancakeswap",
    "chainKey": "ethereum",
    "routerType": "flash-swap",
    "contracts": {
      "router": "DISCOVER_FROM_PANCAKESWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic",
      "tiers": [
        1,
        5,
        30
      ]
    },
    "callbackType": "pancakeCall",
    "notes": [
      "Across / bridge providers handled by bridge router",
      "Infinity flash accounting supported through compatibility layer"
    ]
  },
  {
    "protocolKey": "pancakeswap",
    "chainKey": "arbitrum",
    "routerType": "flash-swap",
    "contracts": {
      "router": "DISCOVER_FROM_PANCAKESWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic",
      "tiers": [
        1,
        5,
        30
      ]
    },
    "callbackType": "pancakeCall",
    "notes": [
      "Across / bridge providers handled by bridge router",
      "Infinity flash accounting supported through compatibility layer"
    ]
  },
  {
    "protocolKey": "pancakeswap",
    "chainKey": "base",
    "routerType": "flash-swap",
    "contracts": {
      "router": "DISCOVER_FROM_PANCAKESWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic",
      "tiers": [
        1,
        5,
        30
      ]
    },
    "callbackType": "pancakeCall",
    "notes": [
      "Across / bridge providers handled by bridge router",
      "Infinity flash accounting supported through compatibility layer"
    ]
  },
  {
    "protocolKey": "pancakeswap",
    "chainKey": "solana",
    "routerType": "dex",
    "contracts": {
      "router": "DISCOVER_FROM_PANCAKESWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic",
      "tiers": [
        1,
        5,
        30
      ]
    },
    "callbackType": undefined,
    "notes": [
      "Across / bridge providers handled by bridge router",
      "Infinity flash accounting supported through compatibility layer"
    ]
  },
  {
    "protocolKey": "pancakeswap",
    "chainKey": "zksync_era",
    "routerType": "flash-swap",
    "contracts": {
      "router": "DISCOVER_FROM_PANCAKESWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic",
      "tiers": [
        1,
        5,
        30
      ]
    },
    "callbackType": "pancakeCall",
    "notes": [
      "Across / bridge providers handled by bridge router",
      "Infinity flash accounting supported through compatibility layer"
    ]
  },
  {
    "protocolKey": "pancakeswap",
    "chainKey": "linea",
    "routerType": "flash-swap",
    "contracts": {
      "router": "DISCOVER_FROM_PANCAKESWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic",
      "tiers": [
        1,
        5,
        30
      ]
    },
    "callbackType": "pancakeCall",
    "notes": [
      "Across / bridge providers handled by bridge router",
      "Infinity flash accounting supported through compatibility layer"
    ]
  },
  {
    "protocolKey": "pancakeswap",
    "chainKey": "opbnb",
    "routerType": "flash-swap",
    "contracts": {
      "router": "DISCOVER_FROM_PANCAKESWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic",
      "tiers": [
        1,
        5,
        30
      ]
    },
    "callbackType": "pancakeCall",
    "notes": [
      "Across / bridge providers handled by bridge router",
      "Infinity flash accounting supported through compatibility layer"
    ]
  },
  {
    "protocolKey": "pancakeswap",
    "chainKey": "aptos",
    "routerType": "dex",
    "contracts": {
      "router": "DISCOVER_FROM_PANCAKESWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic",
      "tiers": [
        1,
        5,
        30
      ]
    },
    "callbackType": undefined,
    "notes": [
      "Across / bridge providers handled by bridge router",
      "Infinity flash accounting supported through compatibility layer"
    ]
  },
  {
    "protocolKey": "pancakeswap",
    "chainKey": "polygon_zkevm",
    "routerType": "dex",
    "contracts": {
      "router": "DISCOVER_FROM_PANCAKESWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic",
      "tiers": [
        1,
        5,
        30
      ]
    },
    "callbackType": undefined,
    "notes": [
      "Across / bridge providers handled by bridge router",
      "Infinity flash accounting supported through compatibility layer"
    ]
  },
  {
    "protocolKey": "pancakeswap",
    "chainKey": "monad",
    "routerType": "dex",
    "contracts": {
      "router": "DISCOVER_FROM_PANCAKESWAP_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic",
      "tiers": [
        1,
        5,
        30
      ]
    },
    "callbackType": undefined,
    "notes": [
      "Across / bridge providers handled by bridge router",
      "Infinity flash accounting supported through compatibility layer"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "apechain",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "arbitrum",
    "routerType": "flash-loan",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "fixed_bps",
      "value": 5
    },
    "callbackType": "onBentoBoxFlashLoan",
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "arbitrum_nova",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "avalanche",
    "routerType": "flash-loan",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "fixed_bps",
      "value": 5
    },
    "callbackType": "onBentoBoxFlashLoan",
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "aptos",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "base",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "blast",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "bnb_chain",
    "routerType": "flash-loan",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "fixed_bps",
      "value": 5
    },
    "callbackType": "onBentoBoxFlashLoan",
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "boba_bnb",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "boba_eth",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "celo",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "core",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "cronos",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "ethereum",
    "routerType": "flash-loan",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "fixed_bps",
      "value": 5
    },
    "callbackType": "onBentoBoxFlashLoan",
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "fantom",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "filecoin",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "gnosis",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "haqq",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "hemi",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "katana",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "kava",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "linea",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "manta_pacific",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "mantle",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "metis",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "mode",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "optimism",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "polygon",
    "routerType": "flash-loan",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "fixed_bps",
      "value": 5
    },
    "callbackType": "onBentoBoxFlashLoan",
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "rootstock",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "scroll",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "skale_europa",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "sonic",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "taiko",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "thundercore",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "tron",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "zetachain",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "zklink_nova",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "sushiswap",
    "chainKey": "zksync_era",
    "routerType": "dex",
    "contracts": {
      "bentoBox": "DISCOVER_FROM_SUSHI_DEPLOYMENTS"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Use BentoBox as shared liquidity source where applicable",
      "Kashi isolated pairs may expose extra lending paths"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "ethereum",
    "routerType": "flash-loan",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "0xa7a4bb50af91f90b6feb3388e7f8286af45b299b"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "avalanche",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "bnb_chain",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "fantom",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "celo",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "xdc",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "gnosis",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "moonbeam",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "harmony",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "aurora",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "kava",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "arbitrum",
    "routerType": "flash-loan",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "optimism",
    "routerType": "flash-loan",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "polygon",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "polygon_zkevm",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "base",
    "routerType": "flash-loan",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "linea",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "metis",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "mantle",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "manta_pacific",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "fraxtal",
    "routerType": "flash-loan",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "blast",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "taiko",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "mode",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "ink",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "unichain",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "monad",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "etherlink",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "x_layer",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "tac",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "hyperliquid_l1",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "sonic",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "plume_mainnet",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "corn",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "unit_zero",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "curve",
    "chainKey": "crossfi",
    "routerType": "dex",
    "contracts": {
      "registry": "DISCOVER_FROM_CURVE_REGISTRY",
      "crvUsdFlashLender": "CHAIN_SPECIFIC_OR_NONE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": "curveFlashCallback",
    "notes": [
      "Support crvUSD controllers, Stableswap-NG pools, and lending infrastructure",
      "Governance and native crvUSD minting remain Ethereum-localized"
    ]
  },
  {
    "protocolKey": "dydx",
    "chainKey": "ethereum",
    "routerType": "flash-loan",
    "contracts": {
      "soloMargin": "0x1E0447b19BB6EcFdae1e4Ae1694b0C3659614e4e"
    },
    "feeModel": {
      "type": "zero_fee"
    },
    "callbackType": "callFunction",
    "notes": [
      "Solo Margin Withdraw-Call-Deposit flow on Ethereum only"
    ]
  },
  {
    "protocolKey": "dydx",
    "chainKey": "dydx_chain",
    "routerType": "bridge",
    "contracts": {
      "soloMargin": "NOT_APPLICABLE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Metadata-only environment for routing and ecosystem connectivity"
    ]
  },
  {
    "protocolKey": "dydx",
    "chainKey": "noble",
    "routerType": "bridge",
    "contracts": {
      "soloMargin": "NOT_APPLICABLE"
    },
    "feeModel": {
      "type": "dynamic"
    },
    "callbackType": undefined,
    "notes": [
      "Metadata-only environment for routing and ecosystem connectivity"
    ]
  }
]
