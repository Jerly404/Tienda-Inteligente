import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface StoreLocationData {
  latitude: number;
  longitude: number;
  address: string | null;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class StoreLocationService {
  private http = inject(HttpClient);
  readonly label = signal<string>('Ubicación sin configurar');
  readonly location = signal<StoreLocationData | null>(null);

  constructor() {
    this.refresh();
  }

  refresh() {
    this.http.get<Array<{ type: string; branches: Array<{ name: string; address: string | null; latitude: string | number | null; longitude: string | number | null }> }>>('/api/businesses/mine').subscribe({
      next: businesses => {
        const store = businesses.find(item => item.type === 'STORE') ?? businesses[0];
        const branch = store?.branches.find(item => item.latitude !== null && item.longitude !== null)
          ?? store?.branches[0];
        if (branch) {
          const display = branch.address?.trim() || branch.name?.trim() || 'Ubicación sin configurar';
          this.label.set(display);
          if (branch.latitude !== null && branch.longitude !== null) {
            this.location.set({
              latitude: Number(branch.latitude),
              longitude: Number(branch.longitude),
              address: branch.address,
              name: branch.name,
            });
          }
        }
      },
      error: () => {}
    });
  }

  updateLocation(name: string, address: string | null | undefined, lat?: number | string | null, lon?: number | string | null) {
    const display = (address && address.trim()) || (name && name.trim()) || 'Ubicación sin configurar';
    this.label.set(display);
    if (lat !== null && lon !== null && lat !== undefined && lon !== undefined) {
      this.location.set({
        latitude: Number(lat),
        longitude: Number(lon),
        address: address?.trim() || null,
        name: name?.trim() || 'Sucursal principal',
      });
    }
  }
}
