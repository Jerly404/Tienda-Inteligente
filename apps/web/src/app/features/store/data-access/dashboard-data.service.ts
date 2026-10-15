import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
export type Dashboard = {
  monitoredProducts: number; activeSuppliers: number; currentOffers: number;
  estimatedSavings: number | null; comparableItems: number; plannedItems: number; savingsBasis: string;
  catalog: Array<{id:string;name:string;imageUrl?:string|null;category:{name:string}|null;brand:{name:string}|null;variants:Array<{id:string;label:string}>}>;
  suppliers: Array<{id: string; name: string; createdAt:string; phone:string|null; branches: Array<{name: string; address: string | null;latitude:string|null;longitude:string|null}>}>;
  comparisons: Array<{variantId: string; product: string; presentation: string; supplier: string; lowest: number; highest: number; suppliers: number; monitored: boolean}>;
  alerts: Array<{id: string; product: string; presentation: string; supplier: string; direction: string; previous: number; current: number; date: string}>;
  offers: Array<{id: string; businessId:string;category:string;imageUrl?:string|null;stock:number|null;availability:string;expiresAt:string|null; variantId: string; product: string; presentation: string; supplier: string; price: number; minimumPackages: number; updatedAt: string}>;
};
@Injectable()
export class DashboardData {
  private http = inject(HttpClient);
  readonly data = signal<Dashboard | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  constructor() { this.load(); }
  load() {
    this.loading.set(true); this.error.set('');
    this.http.get<Dashboard>('/api/dashboard').subscribe({
      next: data => { this.data.set(data); this.loading.set(false); },
      error: () => { this.error.set('No pudimos cargar los datos de tu tienda. Intenta nuevamente.'); this.loading.set(false); },
    });
  }
}
