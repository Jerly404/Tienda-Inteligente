import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideLocateFixed, LucideSave, LucideSearch, LucideRefreshCw } from '@lucide/angular';
import { AuthService } from '../../../../core/auth/auth.service';
import { StoreLocationService } from '../../../../core/location/store-location.service';
import { businessMapPin } from '../../../../shared/maps/business-map-pin';
import * as L from 'leaflet';

type Branch = { id: string; name: string; address: string | null; latitude: number | string | null; longitude: number | string | null };
type Business = { id: string; name: string; type: string; phone?:string|null; taxId?:string|null; status?:string; branches: Branch[] };

@Component({ standalone: true, imports: [FormsModule, DecimalPipe, LucideLocateFixed, LucideSave, LucideSearch, LucideRefreshCw], template: `
<section class="page account-location-page"><div class="eyebrow">MI TIENDA / CONFIGURACIÓN</div><h1>Configuración de la empresa</h1><p class="subhead">Los datos de tu negocio y el punto de partida de tus próximas compras.</p>
@if (notice()) {<div class="location-message" [class.success]="saved()">{{notice()}}</div>}
@if (!business()) {<div class="location-onboarding"><b>Registra tu negocio para continuar</b><p>Elige si tu cuenta representa una bodega o un proveedor y guarda el punto de su sucursal.</p><label>Nombre comercial<input [(ngModel)]="businessName" placeholder="Nombre de la bodega o distribuidora"></label><label>Tipo de negocio<select [(ngModel)]="businessType"><option value="STORE">Bodega o tienda</option><option value="SUPPLIER">Proveedor o distribuidor</option></select></label><button class="button primary" (click)="createBusiness()" [disabled]="saving() || businessName.trim().length < 2">{{saving() ? 'Creando…' : 'Crear negocio'}}</button></div>} @else {
<div class="settings-grid"><article class="studio-card"><div class="studio-card-heading"><div><h2>Perfil del negocio</h2><p>Así se identifica tu empresa en la plataforma.</p></div><span class="studio-status">{{business()!.status==='VERIFIED'?'Verificado':'Pendiente'}}</span></div><div class="settings-brand"><span>{{business()!.name.slice(0,1)}}</span><div><b>{{business()!.name}}</b><small>{{business()!.type==='STORE'?'Tienda / comercio':'Distribuidora'}}</small></div></div><form class="settings-fields" (ngSubmit)="saveProfile()"><label>Nombre comercial<input name="companyName" [(ngModel)]="profileName" minlength="2" maxlength="120" required></label><label>Teléfono de contacto<input name="companyPhone" [(ngModel)]="profilePhone" maxlength="24" placeholder="Agrega un teléfono"></label><label>RUC registrado<input [value]="business()!.taxId||'Sin RUC registrado'" readonly></label><button class="button primary" [disabled]="profileSaving() || profileName.trim().length<2"><svg lucideSave></svg>{{profileSaving()?'Guardando…':'Guardar cambios'}}</button></form></article><article class="studio-card"><div class="studio-card-heading"><div><h2>Tu cuenta</h2><p>La cuenta que administra este negocio.</p></div></div><div class="settings-fields"><label>Nombre<input [value]="auth.user()?.name||''" readonly></label><label>Correo electrónico<input [value]="auth.user()?.email||''" readonly></label></div><div class="settings-account-note"><svg lucideLocateFixed></svg><div><b>Mejores comparaciones, desde tu tienda</b><p>Guarda la ubicación de tu sucursal para consultar distancias aproximadas a tus proveedores.</p></div></div></article></div><div class="studio-card-heading settings-location-heading"><div><h2>Ubicación de la sucursal</h2><p>Marca tu dirección en el mapa o usa la ubicación de tu dispositivo.</p></div></div><div class="location-form"><div><label>Sucursal<input [(ngModel)]="branchName" placeholder="Nombre de sucursal"></label><label>Dirección o referencia<div class="address-input-wrap"><input [(ngModel)]="address" (ngModelChange)="onAddressInput($event)" (keydown.enter)="searchAddress(true); $event.preventDefault()" placeholder="Ej. Jr. Comercio 123 o marca en el mapa"><button type="button" class="address-search-btn" (click)="searchAddress(true)" [disabled]="searchingAddress() || !address.trim()" title="Buscar dirección en el mapa" aria-label="Buscar dirección en el mapa">@if (searchingAddress()) {<svg class="spin-icon" lucideRefreshCw></svg>} @else {<svg lucideSearch></svg>}</button></div></label><p class="coordinates">@if (latitude() !== null && longitude() !== null) {Ubicación seleccionada: {{latitude() | number:'1.5-5'}}, {{longitude() | number:'1.5-5'}}} @else {Haz clic en el mapa para elegir la ubicación.}</p><button class="button primary" (click)="save()" [disabled]="saving() || latitude() === null || longitude() === null"><svg lucideSave></svg>{{saving() ? 'Guardando…' : 'Guardar ubicación'}}</button></div><button class="locate-button" (click)="locate()"><svg lucideLocateFixed></svg>Usar mi ubicación actual</button></div>
<div #mapHost class="account-location-map" aria-label="Mapa interactivo; haz clic para elegir tu ubicación"></div><p class="map-attribution">Mapa de OpenStreetMap. Haz clic en el mapa para fijar el punto exacto de tu sucursal.</p>}
</section>`, styles: [`.account-location-map{height:420px;margin-top:18px;border:1px solid #dce5f0;border-radius:10px;z-index:0}.location-form{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-top:20px}.location-form>div{display:grid;grid-template-columns:1fr 1fr;gap:12px;flex:1}.location-form label,.location-onboarding label{display:grid;gap:6px;font-size:11px;font-weight:600;color:#43546b}.location-form input,.location-onboarding input,.location-onboarding select{height:39px;border:1px solid #dce5f0;border-radius:6px;padding:0 11px;font-size:12px;background:white}.location-form .coordinates{grid-column:1/-1;font-size:11px;color:#63758c;margin:0}.locate-button{height:38px;border:1px solid #dce5f0;border-radius:6px;background:white;color:#315b96;padding:0 12px;display:flex;align-items:center;gap:8px;font-size:11px;cursor:pointer}.address-input-wrap{position:relative;display:flex;align-items:center;width:100%}.address-input-wrap input{width:100%;padding-right:34px}.address-search-btn{position:absolute;right:3px;top:50%;transform:translateY(-50%);width:30px;height:30px;display:grid;place-items:center;background:transparent;border:0;border-radius:5px;color:#506d94;cursor:pointer;padding:0}.address-search-btn:hover:not(:disabled){background:#edf4fe;color:#2563eb}.address-search-btn:disabled{opacity:.4;cursor:default}.address-search-btn svg{width:14px;height:14px}.spin-icon{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.location-message,.location-onboarding{margin-top:16px;padding:14px;border:1px solid #f0d2c6;background:#fff7f3;border-radius:7px;font-size:12px;color:#875445}.location-message.success{background:#eff8f3;border-color:#cce8d7;color:#286b4e}.location-onboarding{display:grid;gap:10px;max-width:540px;color:#40546d;background:white;border-color:#dce5f0}.location-onboarding b{font-size:14px}.location-onboarding p{margin:0 0 4px;color:#718198;font-size:11px}.location-onboarding label{max-width:380px}.location-onboarding .button{width:max-content}.map-attribution{font-size:10px;color:#77879a}.map-attribution a{color:#315b96}:host-context(.dark-theme) .location-form label,:host-context(.dark-theme) .location-onboarding label{color:#9cb0c5}:host-context(.dark-theme) .location-form input,:host-context(.dark-theme) .location-onboarding input,:host-context(.dark-theme) .location-onboarding select{background:#101d2c;border-color:#34485f;color:#e0eaf5}:host-context(.dark-theme) .address-search-btn{color:#8ea3bc}:host-context(.dark-theme) .address-search-btn:hover:not(:disabled){background:#1d324b;color:#79a9ff}:host-context(.dark-theme) .location-form .coordinates{color:#a4b5c8}:host-context(.dark-theme) .locate-button{background:#192a3e;border-color:#304258;color:#bdd0e3}:host-context(.dark-theme) .locate-button:hover{background:#21354a;color:#e5f2ff}:host-context(.dark-theme) .account-location-map{border-color:#2a3b50}:host-context(.dark-theme) .map-attribution{color:#77879a}:host-context(.dark-theme) .map-attribution a{color:#72a5ff}:host-context(.dark-theme) .location-message{background:#3b2428;border-color:#603940;color:#f1b5b5}:host-context(.dark-theme) .location-message.success{background:#173b35;border-color:#255848;color:#9de1c5}:host-context(.dark-theme) .location-onboarding{background:#142235;border-color:#2a3b50;color:#dce7f4}:host-context(.dark-theme) .location-onboarding b{color:#e5effb}:host-context(.dark-theme) .location-onboarding p{color:#a4b5c8}@media(max-width:650px){.location-form{align-items:stretch;flex-direction:column}.location-form>div{grid-template-columns:1fr}.location-form .coordinates{grid-column:auto}.account-location-map{height:340px}}`] })
export class AccountLocationComponent implements AfterViewInit, OnDestroy {
  private mapHost?: ElementRef<HTMLDivElement>;
  @ViewChild('mapHost') set mapElement(host: ElementRef<HTMLDivElement> | undefined) { this.mapHost=host; if(host)queueMicrotask(()=>this.initializeMap()); }
  private http = inject(HttpClient);
  readonly auth=inject(AuthService);
  private storeLocation = inject(StoreLocationService);
  profileName='';profilePhone='';readonly profileSaving=signal(false);
  readonly business = signal<Business | null>(null);
  readonly latitude = signal<number | null>(null);
  readonly longitude = signal<number | null>(null);
  readonly notice = signal(''); readonly saved = signal(false); readonly saving = signal(false);
  readonly searchingAddress = signal(false);
  branchName = 'Sucursal principal'; address = ''; businessName=''; businessType='STORE';
  private map?: L.Map; private marker?: L.Marker;
  private addressDebounceTimer?: ReturnType<typeof setTimeout>;
  private isUpdatingAddressFromMap = false;

  constructor() {
    this.http.get<Business[]>('/api/businesses/mine').subscribe({ next: businesses => {
      let role=''; try { role=JSON.parse(sessionStorage.getItem('ti_user')??'{}').role??''; } catch { /* sesión inválida: se ofrece elegir tipo de negocio */ }
      this.businessType=role==='SUPPLIER'?'SUPPLIER':'STORE';
      const selected = businesses.find(item => role === 'SUPPLIER' ? item.type === 'SUPPLIER' : item.type === 'STORE') ?? businesses[0];
      if (!selected) return;
      this.business.set(selected);this.profileName=selected.name;this.profilePhone=selected.phone||'';
      const branch = selected.branches[0];
      if (branch) { this.branchName = branch.name; this.address = branch.address ?? ''; if (branch.latitude !== null && branch.longitude !== null) this.setPoint(Number(branch.latitude), Number(branch.longitude), false); }
      queueMicrotask(() => this.initializeMap());
    }, error: () => this.notice.set('No se pudieron cargar los negocios de esta cuenta.') });
  }
  ngAfterViewInit() { queueMicrotask(() => this.initializeMap()); }
  ngOnDestroy() { clearTimeout(this.addressDebounceTimer); this.map?.remove(); }
  private initializeMap() {
    if (!this.mapHost || this.map) return;
    const point: L.LatLngExpression = this.latitude() !== null ? [this.latitude()!, this.longitude()!] : [-7.1617, -78.5128];
    this.map = L.map(this.mapHost.nativeElement).setView(point, this.latitude() === null ? 13 : 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(this.map);
    this.map.on('click', (event: L.LeafletMouseEvent) => this.setPoint(event.latlng.lat, event.latlng.lng, true));
    if (this.latitude() !== null) this.drawPoint();
  }
  private setPoint(lat: number, lon: number, updateAddress = false) {
    this.latitude.set(lat);
    this.longitude.set(lon);
    this.drawPoint();
    if (updateAddress) {
      this.reverseGeocode(lat, lon);
    }
  }
  private drawPoint() {
    if (!this.map || this.latitude() === null || this.longitude() === null) return;
    const point: L.LatLngExpression = [this.latitude()!, this.longitude()!];
    if (this.marker) this.marker.setLatLng(point); else {
      this.marker = L.marker(point, { icon: businessMapPin(), draggable: true, title: 'Ubicación de mi tienda', keyboard: true }).addTo(this.map);
      this.marker.on('dragend', () => { const position = this.marker?.getLatLng(); if (position) { this.setPoint(position.lat, position.lng, true); } });
    }
    this.marker.setZIndexOffset(1000);
    this.map.setView(point, Math.max(this.map.getZoom(), 15));
  }
  private reverseGeocode(lat: number, lon: number) {
    clearTimeout(this.addressDebounceTimer);
    this.searchingAddress.set(true);
    this.http.get<{ address: string }>('/api/geocoding/reverse', { params: { lat: lat.toString(), lon: lon.toString() } }).subscribe({
      next: res => {
        this.searchingAddress.set(false);
        if (res && res.address) {
          this.isUpdatingAddressFromMap = true;
          this.address = res.address;
          queueMicrotask(() => this.isUpdatingAddressFromMap = false);
        }
      },
      error: () => {
        this.searchingAddress.set(false);
      }
    });
  }
  onAddressInput(val: string) {
    if (this.isUpdatingAddressFromMap) return;
    clearTimeout(this.addressDebounceTimer);
    const query = (val || '').trim();
    if (query.length >= 4) {
      this.addressDebounceTimer = setTimeout(() => {
        this.searchAddress(false);
      }, 800);
    }
  }
  searchAddress(isExplicit = true) {
    clearTimeout(this.addressDebounceTimer);
    const query = this.address.trim();
    if (!query || query.length < 3) return;
    this.searchingAddress.set(true);
    this.http.get<{ address: string; latitude: number; longitude: number }>('/api/geocoding/search', { params: { q: query } }).subscribe({
      next: res => {
        this.searchingAddress.set(false);
        if (res && res.latitude !== undefined && res.longitude !== undefined) {
          this.setPoint(Number(res.latitude), Number(res.longitude), false);
          if (this.map) {
            this.map.flyTo([Number(res.latitude), Number(res.longitude)], Math.max(this.map.getZoom(), 16));
          }
          if (isExplicit) {
            this.notice.set('Ubicación localizada en el mapa.');
            setTimeout(() => { if (this.notice() === 'Ubicación localizada en el mapa.') this.notice.set(''); }, 3500);
          }
        }
      },
      error: () => {
        this.searchingAddress.set(false);
        if (isExplicit) {
          this.notice.set('No se encontró la dirección en el mapa. Puedes marcar el punto directamente.');
        }
      }
    });
  }
  locate() {
    if (!navigator.geolocation) { this.notice.set('Este navegador no permite obtener la ubicación.'); return; }
    navigator.geolocation.getCurrentPosition(position => this.setPoint(position.coords.latitude, position.coords.longitude, true), () => this.notice.set('No se obtuvo la ubicación. Puedes marcarla directamente en el mapa.'), { enableHighAccuracy: true, timeout: 10000 });
  }
  save() {
    const business = this.business(); if (!business || this.latitude() === null || this.longitude() === null) return;
    const existing = business.branches[0]; const body = { name: this.branchName.trim() || 'Sucursal principal', address: this.address.trim() || undefined, latitude: this.latitude()!, longitude: this.longitude()! };
    this.saving.set(true); this.saved.set(false); this.notice.set('');
    const request = existing ? this.http.patch<Branch>(`/api/businesses/${business.id}/branches/${existing.id}`, body) : this.http.post<Branch>(`/api/businesses/${business.id}/branches`, body);
    request.subscribe({
      next: branch => {
        this.business.set({ ...business, branches: existing ? [branch, ...business.branches.slice(1)] : [branch] });
        this.saving.set(false);
        this.saved.set(true);
        this.notice.set('Ubicación guardada. El comparador la utilizará como origen de las distancias.');
        this.storeLocation.updateLocation(branch.name, branch.address, branch.latitude, branch.longitude);
        this.storeLocation.refresh();
      },
      error: e => {
        this.saving.set(false);
        this.notice.set(e.error?.message || 'No se pudo guardar la ubicación.');
      }
    });
  }
  saveProfile(){
    const business=this.business();if(!business||this.profileSaving())return;
    this.profileSaving.set(true);this.notice.set('');this.saved.set(false);
    this.http.patch<Business>(`/api/businesses/${business.id}`,{name:this.profileName.trim(),phone:this.profilePhone.trim()}).subscribe({next:updated=>{this.business.set(updated);this.profileSaving.set(false);this.saved.set(true);this.notice.set('Los datos de tu negocio se guardaron correctamente.');},error:()=>{this.profileSaving.set(false);this.notice.set('No se pudieron guardar los datos. Revisa el nombre y el teléfono.');}});
  }
  createBusiness() {
    if(this.businessName.trim().length<2)return;
    this.saving.set(true);this.notice.set('');
    this.http.post<Business>('/api/businesses',{name:this.businessName.trim(),type:this.businessType}).subscribe({next:business=>{this.business.set({...business,branches:[]});this.profileName=business.name;this.profilePhone='';this.branchName='Sucursal principal';this.saving.set(false);this.notice.set('Negocio creado. Ahora marca la ubicación de la sucursal en el mapa.');setTimeout(()=>this.initializeMap());},error:e=>{this.saving.set(false);this.notice.set(e.error?.message||'No se pudo crear el negocio.');}});
  }
}
