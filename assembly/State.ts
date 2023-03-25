import { chain, System } from "@koinos/sdk-as";
import { core } from "./proto/core";

// space
const BASE_SPACE_ID = 1;
const BALANCE_SPACE_ID = 2;

// keys
const SUPPLY_KEY = new Uint8Array(0);
const CONFIG_KEY = new Uint8Array(1);

export class State {
  contractId: Uint8Array;
  baseSpace: chain.object_space;
  balanceSpace: chain.object_space;

  constructor(contractId: Uint8Array) {
    this.contractId = contractId;

    this.baseSpace = new chain.object_space(false, contractId, BASE_SPACE_ID);
    this.balanceSpace = new chain.object_space(false, contractId, BALANCE_SPACE_ID);
  }
  // supply
  getConfig(): core.config_object {
    const config = System.getObject<Uint8Array, core.config_object>(this.baseSpace, CONFIG_KEY, core.config_object.decode);
    if (config) {
      return config;
    }
    return new core.config_object();
  }
  setConfig(config: core.config_object): void {
    System.putObject(this.baseSpace, CONFIG_KEY, config, core.config_object.encode);
  }
  // supply
  getSupply(): core.balance_object {
    const supply = System.getObject<Uint8Array, core.balance_object>(this.baseSpace, SUPPLY_KEY, core.balance_object.decode);
    if (supply) {
      return supply;
    }
    return new core.balance_object();
  }
  setSupply(supply: core.balance_object): void {
    System.putObject(this.baseSpace, SUPPLY_KEY, supply, core.balance_object.encode);
  }
  // balances
  getBalance(owner: Uint8Array): core.balance_object {
    const balance = System.getObject<Uint8Array, core.balance_object>(this.balanceSpace, owner, core.balance_object.decode);
    if (balance) {
      return balance;
    }
    return new core.balance_object();
  }
  setBalance(owner: Uint8Array, balance: core.balance_object): void {
    System.putObject(this.balanceSpace, owner, balance, core.balance_object.encode);
  }
}