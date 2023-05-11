import { Base58 } from "@koinos/sdk-as";

export namespace Constants {
  export const name: string = "KOINDX LIQUIDITY POOL";
  export const symbol: string = "KOINDX-LP";
  export const decimals: u32 = 8;

  // address
  export const periphery: Uint8Array = Base58.decode('122MpHXb8aFF4xHZk6ESeHjRM5sBGLYxTc')
}