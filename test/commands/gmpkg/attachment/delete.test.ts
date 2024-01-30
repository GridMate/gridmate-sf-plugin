import { expect, test } from '@oclif/test';

describe('gmpkg attachment delete', () => {
  test
    .stdout()
    .command(['gmpkg attachment delete'])
    .it('runs hello', (ctx) => {
      expect(ctx.stdout).to.contain('hello world');
    });

  test
    .stdout()
    .command(['gmpkg attachment delete', '--name', 'Astro'])
    .it('runs hello --name Astro', (ctx) => {
      expect(ctx.stdout).to.contain('hello Astro');
    });
});
