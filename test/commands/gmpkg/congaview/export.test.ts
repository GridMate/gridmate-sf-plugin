import { expect, test } from '@oclif/test';

describe('gmpkg congaview export', () => {
  test
    .stdout()
    .command(['gmpkg congaview export'])
    .it('runs hello', (ctx) => {
      expect(ctx.stdout).to.contain('hello world');
    });

  test
    .stdout()
    .command(['gmpkg congaview export', '--name', 'Astro'])
    .it('runs hello --name Astro', (ctx) => {
      expect(ctx.stdout).to.contain('hello Astro');
    });
});
