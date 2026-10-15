import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideExternalLink, LucideLocateFixed, LucideMapPin, LucideRefreshCw, LucideStore, LucideSearch, LucideArrowRight } from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import { StoreLocationService } from '../../core/location/store-location.service';
import { businessMapPin } from './business-map-pin';
import * as L from 'leaflet';

type SupplierLocation = { supplierId: string; supplier: string; branchId: string; branch: string; address: string | null; latitude: number | null; longitude: number | null; distanceKm: number | null; distanceType: 'STRAIGHT_LINE' | null; status: 'UBICADA' | 'SIN_UBICACION' };
type MapOffer={branchId:string;variantId:string;price:string;stockPackages:number|null;availability:string;branch:{deliveryAvailable:boolean};promotions:Array<{id:string}>;variant:{label:string;product:{name:string;category:{name:string}|null}}};
type BusinessWithBranches = { type: string; branches: Array<{ name?: string; address?: string | null; latitude: string | number | null; longitude: string | number | null }> };

@Component({ standalone: true, imports: [FormsModule, RouterLink, LucideArrowLeft, LucideExternalLink, LucideLocateFixed, LucideMapPin, LucideRefreshCw, LucideStore, LucideSearch, LucideArrowRight], template: `
<section class="page supplier-map-page">
  <a class="map-back" [routerLink]="auth.hasSession() ? '/panel' : '/'"><svg lucideArrowLeft></svg> {{auth.hasSession() ? 'Volver al resumen' : 'Volver al inicio'}}</a>
  <div class="page-heading map-heading"><div><div class="eyebrow">MI TIENDA / MAPA</div><h1>Mapa de proveedores</h1><p class="subhead">Encuentra distribuidoras, consulta sus sucursales y prepara tu recorrido.</p></div>@if (auth.hasSession()) {<button class="button primary" (click)="locate()" [disabled]="locating()"><svg lucideLocateFixed></svg>{{locating() ? 'Buscando…' : 'Usar mi ubicación'}}</button>}</div>
  @if (notice()) {<div class="map-notice">{{notice()}}</div>}
  <div class="map-summary"><span class="map-summary-icon"><svg lucideMapPin></svg></span><span><b>{{auth.hasSession() ? originLabel() : 'Distribuidoras registradas'}}</b><small>{{origin() ? 'Distancias aproximadas en línea recta; no representan recorrido vial.' : 'Los marcadores muestran sucursales con coordenadas registradas.'}}</small></span>@if (auth.hasSession()) {<a class="map-refresh" routerLink="/app/configuracion">Editar ubicación</a>}<button class="map-refresh" (click)="reload()"><svg lucideRefreshCw></svg> Actualizar</button></div>
  <div class="supplier-map-stats"><article><span class="map-stat-icon"><svg lucideStore></svg></span><span><b>{{distributorCount()}}</b><small>Distribuidoras registradas</small></span></article><article><span class="map-stat-icon located"><svg lucideMapPin></svg></span><span><b>{{locatedCount()}}</b><small>Con sucursales ubicadas</small></span></article><article><span class="map-stat-icon pending"><svg lucideLocateFixed></svg></span><span><b>{{pendingCount()}}</b><small>Por ubicar en el mapa</small></span></article></div>
  <div class="compare-controls"><label>Producto<select [(ngModel)]="variantFilter" (change)="refreshMarkers()"><option value="">Todos</option>@for(p of products();track p.id){<option [value]="p.id">{{p.name}}</option>}</select></label><label>Categoría<select [(ngModel)]="categoryFilter" (change)="refreshMarkers()"><option value="">Todas</option>@for(c of categories();track c){<option>{{c}}</option>}</select></label><label>Radio en línea recta<select [(ngModel)]="radius" (change)="refreshMarkers()"><option [ngValue]="0">Sin límite</option><option [ngValue]="2">2 km</option><option [ngValue]="5">5 km</option><option [ngValue]="20">20 km</option></select></label><label><input type="checkbox" [(ngModel)]="stockOnly" (change)="refreshMarkers()"> Stock informado</label><label><input type="checkbox" [(ngModel)]="deliveryOnly" (change)="refreshMarkers()"> Con entrega</label><label><input type="checkbox" [(ngModel)]="promoOnly" (change)="refreshMarkers()"> Promociones</label><button class="button" (click)="clearFilters()">Limpiar</button></div><p>{{visibleSuppliers().length}} sucursales cumplen los filtros. @if(radius && !origin()){Configura tu ubicación para calcular el radio.}</p>
<div class="supplier-map-layout"><div class="map-canvas-shell"><div #mapHost class="supplier-google-map" aria-label="Mapa interactivo de las distribuidoras con ubicación registrada"></div><div class="map-caption"><i></i> Mapa © OpenStreetMap · Marcadores con sucursal ubicada</div></div>
  <aside class="supplier-map-list"><div class="supplier-list-head"><div><span class="eyebrow">DIRECTORIO DE LA PLATAFORMA</span><h2>{{distributorCount()}} distribuidoras</h2></div></div>
    <label class="supplier-search"><svg lucideSearch></svg><input type="search" aria-label="Buscar distribuidora o dirección" placeholder="Buscar distribuidora o dirección" (input)="setSearch($event)"></label>
    <div class="supplier-filter" role="group" aria-label="Filtrar distribuidoras"><button type="button" [class.active]="filter() === 'ALL'" (click)="filter.set('ALL');refreshMarkers()">Todas <span>{{distributorCount()}}</span></button><button type="button" [class.active]="filter() === 'LOCATED'" (click)="filter.set('LOCATED');refreshMarkers()">Ubicadas <span>{{locatedCount()}}</span></button><button type="button" [class.active]="filter() === 'PENDING'" (click)="filter.set('PENDING');refreshMarkers()">Pendientes <span>{{pendingCount()}}</span></button></div>
    @if (loading()) {<div class="map-loading" role="status">Cargando proveedores…</div>}
    @else if (notice() && !suppliers().length) {<div class="map-empty" role="status"><b>El directorio no está disponible ahora</b><p>Intenta cargar las distribuidoras nuevamente.</p><button class="map-refresh" (click)="reload()">Reintentar</button></div>}
    @else if (!suppliers().length) {<div class="map-empty"><svg lucideStore></svg><b>Aún no hay distribuidoras registradas</b><p>Cuando se registren, aparecerán aquí.</p></div>}
    @else if (!visibleSuppliers().length) {<div class="map-empty"><svg lucideSearch></svg><b>No hay resultados</b><p>Prueba con otro nombre o cambia el filtro.</p></div>}
    @else {<div class="supplier-location-items">@for (supplier of visibleSuppliers(); track supplier.branchId; let i = $index) {<article class="supplier-location-card" [class.selected]="selectedId() === supplier.branchId" [class.unlocated]="!hasCoordinates(supplier)" (click)="select(supplier)" (keydown.enter)="select(supplier)" tabindex="0"><span class="supplier-number">{{i + 1}}</span><div class="supplier-location-copy"><b>{{supplier.supplier}}</b><small>{{supplier.branch}} · {{supplier.address || 'Dirección pendiente'}}</small><small>@if(productPrice(supplier)!==null){Precio del producto: S/ {{productPrice(supplier)!.toFixed(2)}}}</small><a routerLink="/app/proveedores" [queryParams]="{q:supplier.supplier}">Ver proveedor</a><button class="button" (click)="$event.stopPropagation();toggleStop(supplier)">{{hasStop(supplier)?'Quitar de ruta':'Añadir a ruta'}}</button><small class="supplier-state">{{supplier.status === 'UBICADA' ? 'Con ubicación' : 'Ubicación pendiente'}}</small></div><div class="supplier-distance">@if (supplier.distanceKm !== null) {<b>{{supplier.distanceKm}} km</b><small>línea recta</small>} @else {<b>—</b><small>{{hasCoordinates(supplier) ? 'distancia' : 'sin ubicación'}}</small>}</div>@if (hasCoordinates(supplier)) {<a class="map-open" [href]="mapsUrl(supplier)" target="_blank" rel="noopener" aria-label="Abrir recorrido de la distribuidora en Google Maps" (click)="$event.stopPropagation()"><svg lucideExternalLink></svg></a>}</article>}</div>}
    <div class="map-list-foot">Se incluyen todas las distribuidoras registradas. Las que aún no han guardado coordenadas figuran en el directorio y no tienen marcador.</div>
  </aside></div>
  @if(stops().length){<article class="studio-card" style="padding:20px;margin-top:20px"><h2>Ruta de compra</h2><p>Paradas en el orden seleccionado. Google Maps calcula la ruta vial y sus tiempos al abrir las indicaciones.</p><ol>@for(s of stops();track s.branchId){<li>{{s.supplier}} · {{s.address}} <button (click)="toggleStop(s)">Quitar</button></li>}</ol><a class="button primary" [href]="routeUrl()" target="_blank" rel="noopener">Abrir indicaciones</a></article>}
<section class="map-join"><span class="map-join-icon"><svg lucideStore></svg></span><div><b>¿Eres una distribuidora?</b><p>Registra tu negocio y agrega las coordenadas de tus sucursales para que los comercios puedan encontrarte.</p></div><a routerLink="/login" [queryParams]="{mode:'register'}">Crear cuenta <svg lucideArrowRight></svg></a></section>
</section>`, })
export class SupplierMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapHost') private mapHost?: ElementRef<HTMLDivElement>;
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthService);
  readonly storeLocation = inject(StoreLocationService);
  readonly suppliers = signal<SupplierLocation[]>([]); readonly selectedId = signal<string | null>(null);
  readonly searchTerm = signal(''); readonly filter = signal<'ALL' | 'LOCATED' | 'PENDING'>('ALL');
  readonly origin = signal<{ latitude: number; longitude: number } | null>(null);
  readonly originLabel = signal('Ubicación de la tienda sin configurar'); readonly notice = signal(''); readonly loading = signal(false); readonly locating = signal(false);
  offers=signal<MapOffer[]>([]);stops=signal<SupplierLocation[]>([]);variantFilter='';categoryFilter='';radius=0;stockOnly=false;deliveryOnly=false;promoOnly=false;
  products(){return [...new Map(this.offers().map(o=>[o.variantId,{id:o.variantId,name:o.variant.product.name+' · '+o.variant.label}])).values()];}
  categories(){return [...new Set(this.offers().flatMap(o=>o.variant.product.category?[o.variant.product.category.name]:[]))];}
  productPrice(s:SupplierLocation){const offers=this.offers().filter(o=>o.branchId===s.branchId&&o.variantId===this.variantFilter&&o.availability!=='UNAVAILABLE');return this.variantFilter&&offers.length?Math.min(...offers.map(o=>Number(o.price))):null;}
  refreshMarkers(){this.drawMap();}clearFilters(){this.variantFilter='';this.categoryFilter='';this.radius=0;this.stockOnly=false;this.deliveryOnly=false;this.promoOnly=false;this.refreshMarkers();}
  hasStop(s:SupplierLocation){return this.stops().some(x=>x.branchId===s.branchId);}toggleStop(s:SupplierLocation){if(!this.hasCoordinates(s)){this.notice.set('Esta sucursal no tiene coordenadas.');return;}if(this.hasStop(s))this.stops.update(a=>a.filter(x=>x.branchId!==s.branchId));else if(this.stops().length<9)this.stops.update(a=>[...a,s]);else this.notice.set('La ruta admite hasta nueve paradas.');}
  routeUrl(){const stops=this.stops();const origin=this.origin();const coord=(s:SupplierLocation)=>s.latitude+','+s.longitude;return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(coord(stops[stops.length-1]))+(origin?'&origin='+encodeURIComponent(origin.latitude+','+origin.longitude):'')+(stops.length>1?'&waypoints='+encodeURIComponent(stops.slice(0,-1).map(coord).join('|')):'');}
  private map?: L.Map; private markers: L.Layer[] = [];

  constructor() {
    const curLoc = this.storeLocation.location();
    if (curLoc) {
      this.origin.set({ latitude: curLoc.latitude, longitude: curLoc.longitude });
      this.originLabel.set(this.storeLocation.label());
    }
    this.http.get<MapOffer[]>('/api/comparison/map-data').subscribe({next:rows=>{this.offers.set(rows);this.drawMap();}});
    this.http.get<BusinessWithBranches[]>('/api/businesses/mine').subscribe({ next: businesses => {
      const store = businesses.find(item => item.type === 'STORE') ?? businesses[0];
      const branch = store?.branches.find(item => item.latitude !== null && item.longitude !== null) ?? store?.branches[0];
      if (branch) {
        if (branch.latitude !== null && branch.longitude !== null) {
          this.origin.set({ latitude: Number(branch.latitude), longitude: Number(branch.longitude) });
        }
        const display = branch.address?.trim() || branch.name?.trim() || 'Ubicación sin configurar';
        this.originLabel.set(display);
        this.storeLocation.updateLocation(branch.name || 'Sucursal principal', branch.address, branch.latitude, branch.longitude);
      }
      this.reload();
    }, error: () => this.reload() });
  }
  distributorCount() { return new Set(this.suppliers().map((supplier) => supplier.supplierId)).size; }
  locatedCount() { return new Set(this.suppliers().filter((supplier) => this.hasCoordinates(supplier)).map((supplier) => supplier.supplierId)).size; }
  pendingCount() { return Math.max(0, this.distributorCount() - this.locatedCount()); }
  setSearch(event: Event) { this.searchTerm.set((event.target as HTMLInputElement).value.trim().toLocaleLowerCase()); this.drawMap(); }
  visibleSuppliers() {
    const term = this.searchTerm(); const filter = this.filter();
    return this.suppliers().filter((supplier) => {
      const matchesFilter = filter === 'ALL' || (filter === 'LOCATED' ? this.hasCoordinates(supplier) : !this.hasCoordinates(supplier));
      const matchesTerm = !term || `${supplier.supplier} ${supplier.branch} ${supplier.address ?? ''}`.toLocaleLowerCase().includes(term);
      const filteredOffers=this.offers().filter(o=>o.branchId===supplier.branchId&&(!this.variantFilter||o.variantId===this.variantFilter)&&(!this.categoryFilter||o.variant.product.category?.name===this.categoryFilter)&&(!this.stockOnly||(o.stockPackages!==null&&o.stockPackages>0&&['AVAILABLE','LIMITED'].includes(o.availability)))&&(!this.deliveryOnly||o.branch.deliveryAvailable)&&(!this.promoOnly||o.promotions.length>0));
      const matchesOffers=!(this.variantFilter||this.categoryFilter||this.stockOnly||this.deliveryOnly||this.promoOnly)||filteredOffers.length>0;
      return matchesFilter && matchesTerm && matchesOffers && (!this.radius || (supplier.distanceKm!==null&&supplier.distanceKm<=this.radius));
    });
  }
  ngAfterViewInit() { queueMicrotask(() => this.drawMap()); }
  ngOnDestroy() { this.map?.remove(); }
  reload() {
    this.loading.set(true); this.notice.set(''); const origin = this.origin();
    const params: Record<string,string> = origin ? { latitude: String(origin.latitude), longitude: String(origin.longitude) } : {};
    this.http.get<SupplierLocation[]>('/api/catalog/suppliers/map', { params }).subscribe({ next: locations => { this.suppliers.set(locations); this.loading.set(false); if (locations.length && !this.selectedId()) this.selectedId.set(locations[0].branchId); queueMicrotask(() => this.drawMap()); }, error: () => { this.loading.set(false); this.notice.set('No se pudieron cargar proveedores. Comprueba que la API esté disponible.'); } });
  }
  locate() {
    if (!navigator.geolocation) { this.notice.set('Este navegador no permite obtener la ubicación.'); return; }
    this.locating.set(true); navigator.geolocation.getCurrentPosition(position => { this.origin.set({ latitude: position.coords.latitude, longitude: position.coords.longitude }); this.originLabel.set('Ubicación actual autorizada por ti'); this.locating.set(false); this.reload(); }, () => { this.locating.set(false); this.notice.set('No se obtuvo la ubicación. Puedes guardar el punto desde Ubicación del negocio.'); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }
  hasCoordinates(supplier: SupplierLocation): supplier is SupplierLocation & { latitude: number; longitude: number } { return supplier.latitude !== null && supplier.longitude !== null; }
  select(supplier: SupplierLocation) { this.selectedId.set(supplier.branchId); if (!this.hasCoordinates(supplier)) return; this.map?.panTo([supplier.latitude,supplier.longitude]); this.map?.setZoom(15); this.drawMap(false); }
  mapsUrl(supplier: SupplierLocation) { if (!this.hasCoordinates(supplier)) return 'https://www.google.com/maps'; const destination = `${supplier.latitude},${supplier.longitude}`; const origin = this.origin(); return origin ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${origin.latitude},${origin.longitude}`)}&destination=${encodeURIComponent(destination)}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`; }
  private drawMap(fit = true) {
    if (!this.mapHost) return;
    if (!this.map) { const origin = this.origin(); this.map = L.map(this.mapHost.nativeElement).setView(origin ? [origin.latitude,origin.longitude] : [-7.1617,-78.5128], 13); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(this.map); }
    this.markers.forEach(marker => marker.remove()); this.markers = [];
    const bounds = L.latLngBounds([]); const origin = this.origin();
    if (origin) { const marker = L.marker([origin.latitude,origin.longitude], { icon: businessMapPin(), riseOnHover: true, zIndexOffset: 1000 }).bindTooltip('Tu negocio').addTo(this.map); this.markers.push(marker); bounds.extend([origin.latitude,origin.longitude]); }
    this.visibleSuppliers().filter((supplier) => this.hasCoordinates(supplier)).forEach((supplier,index) => {
      const selected = this.selectedId() === supplier.branchId;
      const prices=this.visibleSuppliers().flatMap(s=>this.productPrice(s)===null?[]:[this.productPrice(s)!]);
      const cheapest=this.variantFilter&&this.productPrice(supplier)!==null&&this.productPrice(supplier)===Math.min(...prices);
      const promoted=this.offers().some(o=>o.branchId===supplier.branchId&&o.promotions.length&&(!this.variantFilter||o.variantId===this.variantFilter));
      const color=cheapest?'#10b981':promoted?'#f59e0b':'#2563eb';
      const icon = L.divIcon({ className: selected ? 'supplier-pin supplier-pin-selected' : 'supplier-pin', html: '<span style="background:'+color+'"></span>', iconSize: [28,28], iconAnchor: [14,14] });
      const tooltip = document.createElement('span'); tooltip.textContent = `${index + 1}. ${supplier.supplier} · ${supplier.branch}`;
      const marker = L.marker([supplier.latitude,supplier.longitude], { icon, riseOnHover: true }).bindTooltip(tooltip, { direction: 'top', offset: [0,-12] }).addTo(this.map!);
      const popup=document.createElement('div'); const title=document.createElement('strong');title.textContent=supplier.supplier;popup.append(title);const info=document.createElement('p');info.textContent=(supplier.address??'Dirección pendiente')+(supplier.distanceKm!==null?' · '+supplier.distanceKm+' km en línea recta':'');popup.append(info);const profile=document.createElement('a');profile.href='/app/proveedores?q='+encodeURIComponent(supplier.supplier);profile.textContent='Ver proveedor';popup.append(profile);const directions=document.createElement('a');directions.href=this.mapsUrl(supplier);directions.textContent=' · Cómo llegar';directions.target='_blank';directions.rel='noopener';popup.append(directions);marker.bindPopup(popup);
      marker.on('click',()=>{this.selectedId.set(supplier.branchId);}); this.markers.push(marker); bounds.extend([supplier.latitude,supplier.longitude]);
    });
    if (fit && bounds.isValid()) this.map.fitBounds(bounds.pad(.16), { maxZoom: 14 });
  }
}
