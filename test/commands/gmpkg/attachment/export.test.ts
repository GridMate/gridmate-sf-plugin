import { expect, test } from '@oclif/test';

describe('gmpkg attachment export', () => {
  test
    .stdout()
    .command(['gmpkg attachment export'])
    .it('runs hello', (ctx) => {
      expect(ctx.stdout).to.contain('hello world');
    });

  test
    .stdout()
    .command(['gmpkg attachment export', '--name', 'Astro'])
    .it('runs hello --name Astro', (ctx) => {
      expect(ctx.stdout).to.contain('hello Astro');
    });
});
