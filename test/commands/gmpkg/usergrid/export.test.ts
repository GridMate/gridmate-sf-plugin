import { expect, test } from '@oclif/test';

describe('gmpkg usergrid export', () => {
  test
    .stdout()
    .command(['gmpkg usergrid export'])
    .it('runs gmpkg usergrid export', (ctx) => {
      expect(ctx.stdout).to.contain('hi');
    });

  test
    .stdout()
    .command(['gmpkg usergrid export', '--name', 'Astro'])
    .it('runs gmpkg usergrid export', (ctx) => {
      expect(ctx.stdout).to.contain('hi');
    });
});
