import { BadRequestException } from '@nestjs/common';
import { parseDeliveryPolygon } from './delivery-zone';

describe('supplier delivery coverage', () => {
  it('accepts a closed polygon with three distinct points', () => {
    expect(parseDeliveryPolygon(JSON.stringify({
      type: 'Polygon',
      coordinates: [[[-78.52, -7.16], [-78.50, -7.16], [-78.51, -7.14], [-78.52, -7.16]]],
    }))).toEqual({
      type: 'Polygon',
      coordinates: [[[-78.52, -7.16], [-78.50, -7.16], [-78.51, -7.14], [-78.52, -7.16]]],
    });
  });

  it.each([
    undefined,
    '{bad json',
    JSON.stringify({ type: 'Point', coordinates: [-78.5, -7.1] }),
    JSON.stringify({ type: 'Polygon', coordinates: [[[-78.5, -7.1], [-78.4, -7.1], [-78.3, -7.1]]] }),
    JSON.stringify({ type: 'Polygon', coordinates: [[[-181, -7.1], [-78.4, -7.1], [-78.3, -7.1], [-181, -7.1]]] }),
  ])('rejects invalid or incomplete map selection: %s', (value) => {
    expect(() => parseDeliveryPolygon(value)).toThrow(BadRequestException);
  });
});
