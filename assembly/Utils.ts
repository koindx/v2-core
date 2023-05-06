import { u128, SafeMath } from '@koinos/sdk-as';

const ZERO = u128.from(0);
const ONE = u128.from(1);
const TWO = u128.from(2);
const TREE = u128.from(3);

export class MathUni {
  static sqrt(y: u128): u64 {
    let z: u128 = ZERO;
    if (y > TREE) {
      z = y;
      let x = SafeMath.add(SafeMath.div(y, TWO), ONE);
      while (x < z) {
        z = x;
        x = SafeMath.div(SafeMath.add(SafeMath.div(y, x), x), TWO);
      }
    } else if (y != ZERO) {
      z = ONE;
    }
    return z.toU64();
  }
  static min(x: u64, y: u64): u64 {
    return x < y ? x : y;
  }
}