import { expect, test } from '@oclif/test';

describe('gmpkg congaview migrate', () => {
  test
    .stdout()
    .command(['gmpkg congaview migrate'])
    .it('runs hello', (ctx) => {
      expect(ctx.stdout).to.contain('hello world');
    });

  test
    .stdout()
    .command(['gmpkg congaview migrate', '--name', 'Astro'])
    .it('runs hello --name Astro', (ctx) => {
      expect(ctx.stdout).to.contain('hello Astro');
    });
});
