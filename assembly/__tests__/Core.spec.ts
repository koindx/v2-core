import { Base58, MockVM, chain, system_calls, Protobuf, token, protocol } from "@koinos/sdk-as";
import { Constants } from "../Constants";
import { BlockConfig, TxConfig } from "./utils";
import { Core } from '../Core';
import { core } from '../proto/core';

// contract
const CONTRACT_ID = Base58.decode("17TAwcuJ4tHc9TmCbZ24nSMvY9bPxwQq5s");

// address
const MOCKADRESS = Base58.decode("13nxuEi19W8sfjQiaPLSv2ht2WVp6dNyhn");

// tokens
const MOCKTOKENA = Base58.decode("1M6NjRHh5x926wZUXYUz86x6j5MBqQJAvQ");
const MOCKTOKENB = Base58.decode("1H88naibGSwCbxnXB3MpYSdiEChKducag3");
const MOCKTOKENC = Base58.decode("1BrPkP7JhBwT4MuRDMWiiysGEu4XkyXuCH");

describe('contract', () => {
  beforeEach(() => {
    MockVM.reset();
    MockVM.setContractId(CONTRACT_ID);
  });

  it("should get the name", () => {
    const _core = new Core();
    const args = new core.name_arguments();
    const res = _core.name(args);
    expect(res.value).toBe(Constants.name);
  });

  it("should get the symbol", () => {
    const _core = new Core();
    const args = new core.symbol_arguments();
    const res = _core.symbol(args);
    expect(res.value).toBe(Constants.symbol);
  });

  it("should get the decimals", () => {
    const _core = new Core();
    const args = new core.decimals_arguments();
    const res = _core.decimals(args);
    expect(res.value).toBe(Constants.decimals);
  });


  it("should get the reserves of the pair", () => {
    let _core = new Core();
    let args = new core.get_reserves_arguments();
    let res = _core.get_reserves(args);
    expect(res.reserve_a).toBe(0);
    expect(res.reserve_b).toBe(0);
  });


  it("should mint liquidity", () => {
    // set caller and block
    let caller = new chain.caller_data(Constants.periphery)
    MockVM.setCaller(caller)
    MockVM.setBlock(BlockConfig(10))
    // call results
    let results: system_calls.exit_arguments[] = [
      new system_calls.exit_arguments(0, new chain.result( Protobuf.encode(new token.balance_of_result(100000), token.balance_of_result.encode) )),
      new system_calls.exit_arguments(0, new chain.result( Protobuf.encode(new token.balance_of_result(100000), token.balance_of_result.encode) ))
    ];
    MockVM.setCallContractResults(results);

    // mint liquidity initial
    let _core = new Core();
    let args = new core.mint_arguments(MOCKADRESS, Base58.decode(""));
    let res = _core.mint(args);
    expect(res.value).toBe(90000);
  });

  it("should burn liquidity", () => {
    // set caller and block
    let caller = new chain.caller_data(Constants.periphery)
    MockVM.setCaller(caller)
    MockVM.setBlock(BlockConfig(10))
    // call results
    let results: system_calls.exit_arguments[] = [
      // mint liquidity
      new system_calls.exit_arguments(0, new chain.result( Protobuf.encode(new token.balance_of_result(100000), token.balance_of_result.encode) )),
      new system_calls.exit_arguments(0, new chain.result( Protobuf.encode(new token.balance_of_result(100000), token.balance_of_result.encode) )),
      // transfer liquidity
      new system_calls.exit_arguments(0, new chain.result( Protobuf.encode(new token.transfer_result(), token.transfer_result.encode) )),
      // burn liquidity
      new system_calls.exit_arguments(0, new chain.result( Protobuf.encode(new token.balance_of_result(100000), token.balance_of_result.encode) )),
      new system_calls.exit_arguments(0, new chain.result( Protobuf.encode(new token.balance_of_result(100000), token.balance_of_result.encode) )),
      new system_calls.exit_arguments(0, new chain.result( Protobuf.encode(new token.transfer_result(), token.transfer_result.encode) )),
      new system_calls.exit_arguments(0, new chain.result( Protobuf.encode(new token.transfer_result(), token.transfer_result.encode) ))
    ];
    MockVM.setCallContractResults(results);

    // process
    let _core = new Core();

    // mint liquidity initial and transfer liquidity
    _core.mint(new core.mint_arguments(MOCKADRESS, Base58.decode("")));
    _core.transfer(new core.transfer_arguments(MOCKADRESS, CONTRACT_ID, 90000));

    // burn tokens
    // let args = new core.burn_arguments();
    // let res = _core.burn(args);
    // expect(res.amount_a).toBe(90000);
    // expect(res.amount_b).toBe(90000);
  });
});
