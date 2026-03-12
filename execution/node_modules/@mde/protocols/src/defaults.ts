import type { ProtocolAdapter } from './adapter.js'
import { AaveV3Adapter } from './adapters/aave-v3.adapter.js'
import { CurveAdapter } from './adapters/curve.adapter.js'
import { DydxAdapter } from './adapters/dydx.adapter.js'
import { PancakeSwapAdapter } from './adapters/pancake.adapter.js'
import { SushiSwapAdapter } from './adapters/sushi.adapter.js'
import { UniswapV3Adapter } from './adapters/uniswap-v3.adapter.js'

const DEFAULT_ROUTE_EXECUTOR = process.env.ROUTE_EXECUTOR_ADDRESS ?? '{{ROUTE_EXECUTOR}}'
const DEFAULT_AAVE_RECEIVER = process.env.AAVE_RECEIVER_ADDRESS ?? '{{AAVE_RECEIVER}}'
const DEFAULT_DYDX_SOLO_MARGIN = process.env.DYDX_SOLO_MARGIN_ETHEREUM ?? '0x1E0447b19BB6EcFdae1e4Ae1694b0C3659614e4e'

export function createDefaultAdapters(): Record<string, ProtocolAdapter> {
  return {
    aave_v3: new AaveV3Adapter({
      receiverAddress: DEFAULT_AAVE_RECEIVER,
      routeExecutorAddress: DEFAULT_ROUTE_EXECUTOR,
    }),
    uniswap_v3: new UniswapV3Adapter({ routeExecutorAddress: DEFAULT_ROUTE_EXECUTOR }),
    pancakeswap: new PancakeSwapAdapter({ routeExecutorAddress: DEFAULT_ROUTE_EXECUTOR }),
    sushiswap: new SushiSwapAdapter({ routeExecutorAddress: DEFAULT_ROUTE_EXECUTOR }),
    curve: new CurveAdapter({ routeExecutorAddress: DEFAULT_ROUTE_EXECUTOR }),
    dydx: new DydxAdapter({
      routeExecutorAddress: DEFAULT_ROUTE_EXECUTOR,
      soloMarginAddress: DEFAULT_DYDX_SOLO_MARGIN,
    }),
  }
}
