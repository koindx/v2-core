import { protocol, StringBytes, } from "@koinos/sdk-as";

export function BlockConfig(_block: u64): protocol.block {
  let block = new protocol.block();
  let block_header = new protocol.block_header();

  // config header
  block_header.height = _block;
  block_header.timestamp = Date.now();

  // config block
  block.id = StringBytes.stringToBytes("0x1220124a0aaa9e80d21703f89d68786401c51e71d014d8a353898107588eaf8fc199");
  block.header = block_header;
  return block;
}

export function TxConfig(MOCKADRESS: Uint8Array, TxId: string): protocol.transaction {
  let _transaction = new protocol.transaction();
  let header = new protocol.transaction_header();
  header.payer = MOCKADRESS;
  _transaction.id = StringBytes.stringToBytes(TxId);
  _transaction.header = header;
  return _transaction
}