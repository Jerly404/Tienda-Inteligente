import { isValidPeruvianRuc } from './auth.service';

describe('Peruvian RUC validation', () => {
  it('accepts a valid eleven digit RUC checksum', () => {
    expect(isValidPeruvianRuc('20100070970')).toBe(true);
    expect(isValidPeruvianRuc('20440374248')).toBe(true);
  });

  it('rejects malformed or altered values', () => {
    expect(isValidPeruvianRuc('20100070971')).toBe(false);
    expect(isValidPeruvianRuc('2010007097')).toBe(false);
    expect(isValidPeruvianRuc('20A00070970')).toBe(false);
  });
});
