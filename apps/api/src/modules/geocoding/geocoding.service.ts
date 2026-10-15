import { Injectable, Logger } from '@nestjs/common';

export interface GeocodingResult {
  address: string;
  latitude: number;
  longitude: number;
  displayName?: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private reverseCache = new Map<string, GeocodingResult>();
  private searchCache = new Map<string, GeocodingResult | null>();

  async reverse(latitude: number, longitude: number): Promise<GeocodingResult | null> {
    const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    if (this.reverseCache.has(key)) {
      return this.reverseCache.get(key)!;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TiendaInteligente/1.0 (contacto@tiendainteligente.pe)',
          'Accept-Language': 'es',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) return null;
      const data = await response.json();
      if (!data || !data.address) return null;

      const addr = data.address;
      const road = addr.road || addr.pedestrian || addr.footway || addr.path || addr.street || data.name || '';
      const houseNumber = addr.house_number || '';
      const neighbourhood = addr.neighbourhood || addr.suburb || addr.hamlet || addr.quarter || '';
      const city = addr.city || addr.town || addr.village || addr.state || 'Cajamarca';

      let formatted = '';
      if (road) {
        formatted = road;
        if (houseNumber) formatted += ` ${houseNumber}`;
        if (neighbourhood && !formatted.includes(neighbourhood)) formatted += `, ${neighbourhood}`;
        if (city && !formatted.includes(city)) formatted += `, ${city}`;
      } else {
        const parts = (data.display_name || '').split(',').map((p: string) => p.trim());
        formatted = parts.slice(0, 3).join(', ');
      }

      const result: GeocodingResult = {
        address: formatted || data.display_name || '',
        latitude: Number(data.lat),
        longitude: Number(data.lon),
        displayName: data.display_name,
      };

      if (this.reverseCache.size > 200) this.reverseCache.clear();
      this.reverseCache.set(key, result);
      return result;
    } catch (err) {
      this.logger.warn(`Error in reverse geocoding (${latitude}, ${longitude}): ${err}`);
      return null;
    }
  }

  async search(query: string): Promise<GeocodingResult | null> {
    const raw = query.trim();
    if (!raw) return null;

    const cacheKey = raw.toLowerCase();
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    try {
      // Normalize common Peruvian road abbreviations
      const normalized = raw
        .replace(/\bjr\.?\s+/gi, 'Jirón ')
        .replace(/\bav\.?\s+/gi, 'Avenida ')
        .replace(/\bpje\.?\s+/gi, 'Pasaje ')
        .replace(/\bcll\.?\s+|\bcl\.?\s+/gi, 'Calle ')
        .replace(/\bprol\.?\s+/gi, 'Prolongación ');

      const hasLocation = /cajamarca|per[uú]/i.test(normalized);
      const queryToSearch = hasLocation ? normalized : `${normalized}, Cajamarca, Perú`;

      const searchOsm = async (q: string) => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=pe&limit=3&addressdetails=1`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'TiendaInteligente/1.0 (contacto@tiendainteligente.pe)',
            'Accept-Language': 'es',
          },
          signal: AbortSignal.timeout(6000),
        });
        if (!response.ok) return [];
        return response.json();
      };

      let items = await searchOsm(queryToSearch);
      if (!items || !items.length) {
        items = await searchOsm(normalized);
      }

      if (!items || !items.length) {
        this.searchCache.set(cacheKey, null);
        return null;
      }

      const top = items[0];
      const addr = top.address || {};
      const road = addr.road || addr.pedestrian || addr.footway || top.name || '';
      const houseNumber = addr.house_number || '';
      const neighbourhood = addr.neighbourhood || addr.suburb || addr.hamlet || '';
      const city = addr.city || addr.town || addr.village || addr.state || 'Cajamarca';

      let formatted = '';
      if (road) {
        formatted = road;
        if (houseNumber) formatted += ` ${houseNumber}`;
        if (neighbourhood && !formatted.includes(neighbourhood)) formatted += `, ${neighbourhood}`;
        if (city && !formatted.includes(city)) formatted += `, ${city}`;
      } else {
        const parts = (top.display_name || '').split(',').map((p: string) => p.trim());
        formatted = parts.slice(0, 3).join(', ');
      }

      const result: GeocodingResult = {
        address: formatted || top.display_name,
        latitude: Number(top.lat),
        longitude: Number(top.lon),
        displayName: top.display_name,
      };

      if (this.searchCache.size > 200) this.searchCache.clear();
      this.searchCache.set(cacheKey, result);
      return result;
    } catch (err) {
      this.logger.warn(`Error in forward geocoding ("${query}"): ${err}`);
      return null;
    }
  }
}
