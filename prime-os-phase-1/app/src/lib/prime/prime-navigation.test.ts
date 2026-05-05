import { describe, expect, it } from 'vitest';
import { getPrimeNavPath } from './prime-navigation';

describe('prime navigation utility routes', () => {
  it('provides breadcrumb metadata for the account center without sidebar placement', () => {
    expect(getPrimeNavPath('/account').map((item) => item.label)).toEqual(['Platform Admin']);
  });
});
