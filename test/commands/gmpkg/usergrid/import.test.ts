import { expect, test } from '@oclif/test';

describe('gmpkg usergrid import', () => {
  test
    .stdout()
    .command(['gmpkg usergrid import'])
    .it('runs gmpkg usergrid import', (ctx) => {
      expect(ctx.stdout).to.contain('hi');
    });

  test
    .stdout()
    .command(['gmpkg usergrid import', '--name', 'Astro'])
    .it('runs gmpkg usergrid import', (ctx) => {
      expect(ctx.stdout).to.contain('hi');
    });
});
