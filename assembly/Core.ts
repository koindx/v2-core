import { Arrays, System, Token } from "@koinos/sdk-as";
import { core } from "./proto/core";
import { State } from "./State";
import { Constants } from "./Constants";

export class Core {
  _contractId: Uint8Array;
  _state: State;
  constructor() {
    this._contractId = System.getContractId();
    this._state = new State(this._contractId);
  }
  name(args: core.name_arguments): core.name_result {
    return new core.name_result(Constants.name);
  }
  symbol(args: core.symbol_arguments): core.symbol_result {
    return new core.symbol_result(Constants.symbol);
  }
  decimals(args: core.decimals_arguments): core.decimals_result {
    return new core.decimals_result(Constants.decimals);
  }
  total_supply(args: core.total_supply_arguments): core.total_supply_result {
    const supply = this._state.getSupply();
    const res = new core.total_supply_result();
    res.value = supply.value;
    return res;
  }
  balance_of(args: core.balance_of_arguments): core.balance_of_result {
    let res = new core.balance_of_result();
    let bal = this._state.getBalance(args.owner);
    res.value = bal.value;
    return res;
  }

  initialize(args: core.initialize_arguments): core.initialize_result {
    let res = new core.initialize_result();
    let caller = System.getCaller();
    System.require(Arrays.equal(caller.caller, Constants.periphery), 'KOINDX: FORBIDDEN');
    let configs = this._state.getConfig();
    configs.token_a = args.token_a;
    configs.token_b = args.token_b;
    this._state.setConfig(configs);
    return res;
  }
  get_reserves(args: core.get_reserves_arguments): core.get_reserves_result {
    let res = new core.get_reserves_result();
    let configs = this._state.getConfig();
    res.reserve_a = configs.reserve_a;
    res.reserve_b = configs.reserve_b;
    res.block_time = configs.block_time;
    return res;
  }
  mint(args: core.mint_arguments): core.mint_result {
    let res = new core.mint_result();
    // check caller
    let caller = System.getCaller();
    System.require(Arrays.equal(caller.caller, Constants.periphery), 'KOINDX: FORBIDDEN');
    // get configs
    let configs = this._state.getConfig();
    // instantiate tokens
    let token_a = new Token(configs.token_a);
    let token_b = new Token(configs.token_b);
    // get balance
    let balance_a = token_a.balanceOf(this._contractId);
    let balance_b = token_b.balanceOf(this._contractId);

    // mint liquidity
    configs = this.mintFee(configs, args.fee);


    return res;
  }
  burn(args: core.burn_arguments): core.burn_result {
    let res = new core.burn_result();
    return res;
  }
  swap(args: core.swap_arguments): core.swap_result {
    let res = new core.swap_result();
    return res;
  }
  skim(args: core.skim_arguments): core.skim_result {
    let res = new core.skim_result();
    return res;
  }
  sync(args: core.sync_arguments): core.sync_result {
    let res = new core.sync_result();
    return res;
  }

  private update(balance_a: u64, balance_b: u64, reserve_a: u64, reserve_b: u64): void {
  }
  private mintFee(config: core.config_object, fee: Uint8Array): core.config_object {
    if(fee.length) {

    } else if(config.k_last != 0) {
      config.k_last = 0;
    }
    return config;
  }
}
