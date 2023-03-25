import { Core } from '../Core';
import { core } from '../proto/core';

describe('contract', () => {
  it("should return 'hello, NAME!'", () => {
    const c = new Core();

    const args = new core.hello_arguments('World');
    const res = c.hello(args);

    expect(res.value).toStrictEqual('Hello, World!');
  });
});
