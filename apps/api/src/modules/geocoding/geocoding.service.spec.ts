import { GeocodingService } from './geocoding.service';

describe('GeocodingService', () => {
  let service: GeocodingService;

  beforeEach(() => {
    service = new GeocodingService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return null for empty query', async () => {
    const res = await service.search('   ');
    expect(res).toBeNull();
  });

  it('should format reverse geocoding address cleanly', async () => {
    const mockData = {
      lat: '-7.1636',
      lon: '-78.5057',
      display_name: 'Avenida Mario Urteaga, Cajamarca, Perú',
      address: {
        road: 'Avenida Mario Urteaga',
        house_number: '123',
        neighbourhood: 'Urbanización Cajamarca',
        city: 'Cajamarca',
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockData),
    } as any);

    const res = await service.reverse(-7.1636, -78.5057);
    expect(res).toBeDefined();
    expect(res?.address).toBe('Avenida Mario Urteaga 123, Urbanización Cajamarca');
    expect(res?.latitude).toBeCloseTo(-7.1636);
    expect(res?.longitude).toBeCloseTo(-78.5057);
  });

  it('should search with normalized Peruvian street names', async () => {
    const mockData = [
      {
        lat: '-7.1551',
        lon: '-78.5132',
        display_name: 'Jirón Comercio, Cajamarca, Perú',
        address: {
          road: 'Jirón Comercio',
          city: 'Cajamarca',
        },
      },
    ];

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockData),
    } as any);

    const res = await service.search('Jr. Comercio');
    expect(res).toBeDefined();
    expect(res?.address).toContain('Jirón Comercio');
    expect(res?.latitude).toBeCloseTo(-7.1551);
  });
});
