import { Arrays, System, Storage, Token, SafeMath, u128, Base58, Protobuf } from "@koinos/sdk-as";
import { core } from "./proto/core";
import { Spaces, SpacesList } from "./Spaces";
import { Constants } from "./Constants";
import { Token as Base } from "./Token";
import { MathUni } from "./Utils";

const MINIMUM_LIQUIDITY = 10000;

export class Core extends Base  {
  _contractId: Uint8Array;
  
  // spaces
  config: Storage.Obj<core.config_object>;

  constructor() {
    let contractId = System.getContractId();
    super(contractId)
    this._contractId = contractId;

    // config spaces
    this.config = new Storage.Obj(
      this.contractId,
      Spaces.CONFIG_SPACE_ID,
      core.config_object.decode,
      core.config_object.encode,
      () => new core.config_object()
    );
  }
  initialize(args: core.initialize_arguments): core.empty_object {
    let caller = System.getCaller();
    System.require(Arrays.equal(caller.caller, Constants.periphery), 'KOINDX: FORBIDDEN', 1);
    System.require(this._verifySpaces(), 'KOINDX: ERROR_IN_VERIFICATION_OF_SPACES', 1)
    let configs = new core.config_object(args.token_a, args.token_b);
    this.config.put(configs);
    // event
    const impacted = [this._contractId];
    let initializeEvent = new core.initialize_event(this._contractId, args.token_a, args.token_b);
    System.event(
      "core.initialize_event",
      Protobuf.encode(initializeEvent, core.initialize_event.encode),
      impacted
    );
    return new core.empty_object();
  }
  get_reserves(args: core.get_reserves_arguments): core.get_reserves_result {
    let configs = this.config.get()!;
    return new core.get_reserves_result(
      configs.k_last,
      configs.reserve_a,
      configs.reserve_b,
      configs.block_time
    );
  }
  mint(args: core.mint_arguments): core.uint64 {
    let caller = System.getCaller();
    System.require(Arrays.equal(caller.caller, Constants.periphery), 'KOINDX: FORBIDDEN', 1);
    // get configs
    let configs = this.config.get()!;
    // instance tokens
    let token_a = new Token(configs.token_a);
    let token_b = new Token(configs.token_b);
    // get balance
    let balance_a = token_a.balanceOf(this._contractId);
    let balance_b = token_b.balanceOf(this._contractId);
    let amount_a = SafeMath.sub(balance_a, configs.reserve_a);
    let amount_b = SafeMath.sub(balance_b, configs.reserve_b);

    // mint fee and update configs
    configs = this._mintFee(configs, args.fee);

    // mint liquidity
    let newShares: u64;
    let supply = this.total_supply(new core.total_supply_arguments()).value;
    if(supply == 0) {
      let amountA = u128.fromU64(amount_a);
      let amountB = u128.fromU64(amount_b);
      newShares = SafeMath.sub(MathUni.sqrt( SafeMath.mul(amountA, amountB) ), MINIMUM_LIQUIDITY);
      // automatically mints the minimum liquidity for null
      this._mint(Base58.decode(""), MINIMUM_LIQUIDITY);
    } else {      
      let _position1 = SafeMath.mul(u128.fromU64(amount_a),  u128.fromU64(supply));
      let _position2 = SafeMath.mul(u128.fromU64(amount_b), u128.fromU64(supply));
      let _reservea = u128.fromU64(configs.reserve_a);
      let _reserveb = u128.fromU64(configs.reserve_b);
      newShares = MathUni.min(
        SafeMath.div(_position1, _reservea).toU64(),
        SafeMath.div(_position2, _reserveb).toU64()
      );
    }
    System.require(newShares > 0, 'KOINDX: INSUFFICIENT_LIQUIDITY_MINTED', 1);
    // mint new liquidity
    this._mint(args.to, newShares);

    // update configs before save
    configs = this._update(configs, balance_a, balance_b);
    if(args.fee.length) {
      let reserve_a = u128.fromU64(configs.reserve_a);
      let reserve_b = u128.fromU64(configs.reserve_b);
      configs.k_last = SafeMath.mul(reserve_a, reserve_b).toString();
    }
    // save configs
    this.config.put(configs);

    // event
    const impacted = [args.to];
    let mintEvent = new core.mint_event(args.to, amount_a, amount_b);
    System.event(
      "core.mint_event",
      Protobuf.encode(mintEvent, core.mint_event.encode),
      impacted
    );
    return new core.uint64(newShares);
  }
  burn(args: core.burn_arguments): core.burn_result {
    let caller = System.getCaller();
    System.require(Arrays.equal(caller.caller, Constants.periphery), 'KOINDX: FORBIDDEN', 1);
    // get configs
    let configs = this.config.get()!;
    // instance tokens
    let token_a = new Token(configs.token_a);
    let token_b = new Token(configs.token_b);

    // get balance and supply
    let balance_a = token_a.balanceOf(this._contractId);
    let balance_b = token_b.balanceOf(this._contractId);
    let liquidity = this.balance_of(new core.balance_of_arguments(this._contractId)).value;
    let supply = this.total_supply(new core.total_supply_arguments()).value;

    // mint fee and update configs
    configs = this._mintFee(configs, args.fee);

    // data in u128
    let _liquidity = u128.fromU64(liquidity);
    let _reserveA = u128.fromU64(balance_a);
    let _reserveB = u128.fromU64(balance_b);
    let _totalShares = u128.fromU64(supply);

    // amount to out for x token
    let token0Out = SafeMath.div(SafeMath.mul(_liquidity, _reserveA), _totalShares).toU64();
    let token1Out = SafeMath.div(SafeMath.mul(_liquidity, _reserveB), _totalShares).toU64();
    System.require((token0Out > 0 && token1Out > 0), 'KOINDX: INSUFFICIENT_LIQUIDITY_BURNED', 1)

    // burn liquidity and trasfer tokens
    this._burn(this._contractId, liquidity);    
    System.require(token_a.transfer(this._contractId, args.to, token0Out), "KOINDX: FAIL_TRANSFER_TOKEN_A", 1);
    System.require(token_b.transfer(this._contractId, args.to, token1Out), "KOINDX: FAIL_TRANSFER_TOKEN_B", 1);

    // update balance after send tokens
    balance_a = token_a.balanceOf(this._contractId);
    balance_b = token_b.balanceOf(this._contractId);

    // update configs before save
    configs = this._update(configs, balance_a, balance_b);
    if(args.fee.length) {
      let reserve_a = u128.fromU64(configs.reserve_a);
      let reserve_b = u128.fromU64(configs.reserve_b);
      configs.k_last = SafeMath.mul(reserve_a, reserve_b).toString();
    }

    // save configs
    this.config.put(configs);

    // event
    const impacted = [args.to];
    let burnEvent = new core.burn_event(args.to, caller.caller, token0Out, token1Out);
    System.event(
      "core.burn_event",
      Protobuf.encode(burnEvent, core.burn_event.encode),
      impacted
    );
    return new core.burn_result(token0Out, token1Out);
  }
  swap(args: core.swap_arguments): core.empty_object {
    let caller = System.getCaller();
    System.require(Arrays.equal(caller.caller, Constants.periphery), 'KOINDX: FORBIDDEN', 1);
    System.require(args.amount_a > 0 || args.amount_b > 0, 'KOINDX: INSUFFICIENT_OUTPUT_AMOUNT', 1);
    // get configs
    let configs = this.config.get()!;
    System.require(args.amount_a < configs.reserve_a && args.amount_b < configs.reserve_b, 'KOINDX: INSUFFICIENT_LIQUIDITY', 1);
    System.require(!Arrays.equal(configs.token_a, args.to) && !Arrays.equal(configs.token_b, args.to), 'KOINDX: INVALID_TO', 1);

    // instance tokens
    let token_a = new Token(configs.token_a);
    let token_b = new Token(configs.token_b);
    if(args.amount_a) {
      System.require(token_a.transfer(this._contractId, args.to, args.amount_a), "KOINDX: FAIL_TRANSFER_TOKEN_A", 1);
    }
    if(args.amount_b) {
      System.require(token_b.transfer(this._contractId, args.to, args.amount_b), "KOINDX: FAIL_TRANSFER_TOKEN_B", 1);
    }
    let balance_a = token_a.balanceOf(this.contractId);
    let balance_b = token_b.balanceOf(this.contractId);

    // amounts
    let amount0In = balance_a > SafeMath.sub(configs.reserve_a, args.amount_a) ? SafeMath.sub(balance_a, SafeMath.sub(configs.reserve_a, args.amount_a)) : 0;
    let amount1In = balance_b > SafeMath.sub(configs.reserve_b, args.amount_b) ? SafeMath.sub(balance_b, SafeMath.sub(configs.reserve_b, args.amount_b)) : 0;
    System.require(amount0In > 0 || amount1In > 0, 'KOINDX: INSUFFICIENT_INPUT_AMOUNT', 1);

    // update configs before save
    configs = this._update(configs, balance_a, balance_b);

    // save configs
    this.config.put(configs);

    // event
    const impacted = [args.to];
    let swapEvent = new core.swap_event(args.to, caller.caller, amount0In, amount1In, args.amount_a, args.amount_b);
    System.event(
      "core.swap_event",
      Protobuf.encode(swapEvent, core.swap_event.encode),
      impacted
    );
    return new core.empty_object();
  }
  skim(args: core.skim_arguments): core.empty_object {
    let configs = this.config.get()!;
    let token_a = new Token(configs.token_a);
    let token_b = new Token(configs.token_b);
    let balance_a = token_a.balanceOf(this._contractId);
    let balance_b = token_b.balanceOf(this._contractId);
    System.require(token_a.transfer(this._contractId, args.to, SafeMath.sub(balance_a, configs.reserve_a)), "KOINDX: FAIL_TRANSFER_TOKEN_A", 1);
    System.require(token_b.transfer(this._contractId, args.to, SafeMath.sub(balance_b, configs.reserve_b)), "KOINDX: FAIL_TRANSFER_TOKEN_B", 1);
    return  new core.empty_object();
  }
  sync(args: core.sync_arguments): core.empty_object {
    let configs = this.config.get()!;
    let token_a = new Token(configs.token_a);
    let token_b = new Token(configs.token_b);
    let balance_a = token_a.balanceOf(this._contractId);
    let balance_b = token_b.balanceOf(this._contractId);
    configs = this._update(configs, balance_a, balance_b);
    this.config.put(configs);
    return new core.empty_object();
  }

  private _mintFee(config: core.config_object, fee: Uint8Array): core.config_object {
    let klast = u128.from(config.k_last);
    if(fee.length) {
      if(klast != u128.from(0)) {
        let reserve_a = u128.fromU64(config.reserve_a);
        let reserve_b = u128.fromU64(config.reserve_b);
        // load supply
        let supply = this.total_supply(new core.total_supply_arguments()).value;
        let total_shares = u128.fromU64(supply);
        // process
        let rootK = u128.fromU64(MathUni.sqrt(SafeMath.mul(reserve_b, reserve_a)));      
        let rootKLast = u128.fromU64(MathUni.sqrt(klast));
        if(rootK > rootKLast) {
          let numerator = SafeMath.mul(SafeMath.mul(total_shares, SafeMath.sub(rootK, rootKLast)), u128.from(8));
          let denominator = SafeMath.add(SafeMath.mul(rootK, u128.from(17)), SafeMath.mul(rootKLast, u128.from(8)));
          let liquidity = SafeMath.div(numerator, denominator).toU64();
          if(liquidity > 0) {
            this._mint(fee, liquidity);
          }
        }
      }
    } else if(klast != u128.from(0)) {
      config.k_last = "0";
    }
    return config;
  }
  private _update(config: core.config_object, balance_a: u64, balance_b: u64): core.config_object {
    let blockTimestampField = System.getBlockField("header.timestamp");
    System.require(blockTimestampField != null, 'block height cannot be null');
    let currentDate = blockTimestampField!.uint64_value as u64;
    config.reserve_a = balance_a;
    config.reserve_b = balance_b;
    config.block_time = currentDate;

    const impacted = [this._contractId];
    let mintSync = new core.sync_event(balance_a, balance_b);
    System.event(
      "core.sync_event",
      Protobuf.encode(mintSync, core.sync_event.encode),
      impacted
    );
    return config;
  }
  private _verifySpaces(): bool {
    let res = true;
    for (let index = 0; index < SpacesList.length; index++) {
      let spaceId = SpacesList[index];
      let _space: Storage.Map<Uint8Array, core.empty_object> = new Storage.Map(
        this.contractId,
        spaceId,
        core.empty_object.decode,
        core.empty_object.encode,
        null
      );
      let key = new Uint8Array(0);
      let object = _space.getManyKeys(key, 3, Storage.Direction.Ascending);
      if(object.length != 0) {
        res = false
      }
    }
    return res;
  }
}
