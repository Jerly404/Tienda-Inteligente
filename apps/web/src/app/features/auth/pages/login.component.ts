import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideEye, LucideEyeOff, LucideStore, LucideShieldCheck, LucideMapPin, LucideChartNoAxesCombined } from '@lucide/angular';
import { AuthService } from '../../../core/auth/auth.service';
import { businessMapPin } from '../../../shared/maps/business-map-pin';
import * as L from 'leaflet';

@Component({ standalone: true, imports: [FormsModule, RouterLink, LucideArrowLeft, LucideStore, LucideEye, LucideEyeOff, LucideShieldCheck, LucideMapPin, LucideChartNoAxesCombined], template: `
<main class="auth-page">
  <a routerLink="/" class="auth-back"><svg lucideArrowLeft></svg><span>Volver al inicio</span></a>
  <div class="auth-layout">
    <aside class="auth-story" aria-label="Información de Tienda Inteligente">
      <a routerLink="/" class="auth-brand"><span class="auth-brand-icon"><svg lucideStore></svg></span><span>Tienda <b>Inteligente</b><small>ABASTECIMIENTO CLARO</small></span></a>
      <div class="auth-story-copy">
        <div class="auth-kicker"><span></span> PLATAFORMA PARA NEGOCIOS</div>
        <h2>{{registering ? 'Tu negocio merece mejores decisiones de compra.' : 'Abastece tu negocio con más claridad.'}}</h2>
        <p>Compara ofertas, consulta proveedores y organiza tus compras con información clara y útil para tu operación.</p>
        <div class="auth-benefits">
          <div><span><svg lucideChartNoAxesCombined></svg></span><p><b>Precios comparables</b><small>Evalúa cantidades, stock y costos conocidos.</small></p></div>
          <div><span><svg lucideMapPin></svg></span><p><b>Proveedores cerca de ti</b><small>Consulta su ubicación y condiciones comerciales.</small></p></div>
          <div><span><svg lucideShieldCheck></svg></span><p><b>Un espacio para tu empresa</b><small>Datos comerciales asociados a tu cuenta.</small></p></div>
        </div>
      </div>
      <div class="auth-story-foot"><span>Diseñado para comercios y distribuidores del Perú</span><span>© 2026 Tienda Inteligente</span></div>
      <div class="auth-orb auth-orb-one"></div><div class="auth-orb auth-orb-two"></div>
    </aside>
    <section class="auth-panel">
      <div class="auth-form-wrap" [class.auth-register-wrap]="registering">
        <div class="auth-mobile-brand"><span class="auth-brand-icon"><svg lucideStore></svg></span><span>Tienda <b>Inteligente</b></span></div>
        <div class="auth-form-heading"><div class="auth-form-eyebrow">{{registering ? (role==='OWNER'?'ALTA DE TIENDA':'ALTA DE DISTRIBUIDORA') : 'PORTAL EMPRESARIAL'}}</div><h1>{{registering ? (role==='OWNER'?'Registra tu tienda':'Registra tu distribuidora') : 'Qué gusto verte de nuevo'}}</h1><p>{{registering ? (role==='OWNER'?'Crea el perfil de tu negocio y encuentra proveedores en tu zona.':'Crea el perfil comercial para publicar tu catálogo y cobertura.') : 'Ingresa para continuar con la gestión de tu negocio.'}}</p></div>

        @if(registering){
          <form class="auth-form" (ngSubmit)="submit()" autocomplete="on">
            <fieldset class="auth-role-picker"><legend>Tipo de cuenta</legend><div>
              <button type="button" [class.selected]="role==='OWNER'" [attr.aria-pressed]="role==='OWNER'" (click)="selectRole('OWNER')"><svg lucideStore></svg><span><b>Tienda o bodega</b><small>Abastecimiento para mi negocio</small></span><i></i></button>
              <button type="button" [class.selected]="role==='SUPPLIER'" [attr.aria-pressed]="role==='SUPPLIER'" (click)="selectRole('SUPPLIER')"><svg lucideChartNoAxesCombined></svg><span><b>Distribuidora</b><small>Venta mayorista y reparto</small></span><i></i></button>
            </div></fieldset>

            <div class="auth-section-label"><span>01</span><div><b>{{role==='OWNER'?'Datos de la tienda':'Datos de la distribuidora'}}</b><small>{{role==='OWNER'?'Identifica tu negocio y el giro comercial.':'Identifica tu empresa y lo que ofrece a los comercios.'}}</small></div></div>
            <div class="auth-fields-grid">
              <label class="auth-field"><span>RUC <em>Obligatorio</em></span><input [(ngModel)]="taxId" name="taxId" inputmode="numeric" autocomplete="off" maxlength="11" placeholder="20123456789" required><small class="field-help">11 dígitos. Validamos el formato y dígito verificador.</small>@if(taxId.length===11&&!rucValid()){<small class="field-error">Revisa el número y su dígito verificador.</small>}</label>
              <label class="auth-field"><span>Razón social</span><input [(ngModel)]="legalName" name="legalName" autocomplete="organization" maxlength="160" placeholder="Como figura en tu RUC" required></label>
              <label class="auth-field"><span>Nombre comercial</span><input [(ngModel)]="businessName" name="businessName" maxlength="120" placeholder="Nombre de tu tienda o distribuidora" required></label>
              <label class="auth-field"><span>Teléfono de contacto</span><input [(ngModel)]="phone" name="phone" type="tel" autocomplete="tel" maxlength="24" placeholder="+51 999 000 000" required></label>
              @if(role==='OWNER'){
                <label class="auth-field auth-field-wide"><span>Giro de la tienda</span><select [(ngModel)]="storeCategory" name="storeCategory" required><option value="">Selecciona el tipo de negocio</option><option>Bodega</option><option>Minimarket</option><option>Abarrotes</option><option>Mercado o puesto</option><option>Otro comercio minorista</option></select></label>
              } @else {
                <label class="auth-field auth-field-wide"><span>Rubros que distribuye</span><input [(ngModel)]="businessDescription" name="businessDescription" maxlength="500" placeholder="Ej.: abarrotes, bebidas, limpieza" required></label>
                <label class="auth-field"><span>Pedido mínimo <small>Opcional · S/</small></span><input [(ngModel)]="minimumOrder" name="minimumOrder" type="number" min="0" step="0.01" placeholder="0.00"></label>
                <label class="auth-field"><span>Horario comercial <small>Opcional</small></span><input [(ngModel)]="businessHours" name="businessHours" maxlength="120" placeholder="Lun–Sáb, 8:00 a 18:00"></label>
                <fieldset class="auth-payment-picker auth-field-wide"><legend>Medios de pago <small>Marca todos los que aceptan</small></legend><div>@for(method of paymentOptions;track method){<label><input type="checkbox" [checked]="paymentMethods.includes(method)" (change)="togglePayment(method,$any($event.target).checked)"><span>{{method}}</span></label>}</div></fieldset>
                <label class="auth-toggle-field auth-field-wide"><input [(ngModel)]="deliveryAvailable" name="deliveryAvailable" type="checkbox" (ngModelChange)="toggleDelivery($event)"><span><b>Ofrecemos entrega a domicilio</b><small>Selecciona el centro y el radio de cobertura en el mapa.</small></span></label>
                @if(deliveryAvailable){<div class="auth-zone-picker auth-field-wide"><div class="auth-zone-heading"><span><b>Zona de reparto</b><small>Haz clic en el mapa para elegir el centro. También puedes arrastrar el marcador.</small></span><button type="button" (click)="clearCoverage()" [disabled]="!coverageCenter">Limpiar selección</button></div><div #deliveryMap class="auth-zone-map" aria-label="Mapa para seleccionar el centro del área circular de reparto"></div><label class="auth-radius-control"><span><b>Radio de reparto</b><strong>{{coverageRadiusKm}} km</strong></span><input type="range" name="coverageRadiusKm" min="0.5" max="20" step="0.5" [(ngModel)]="coverageRadiusKm" (ngModelChange)="updateCoverageRadius($event)" [disabled]="!coverageCenter"><small>Arrastra el control para ampliar o reducir el área.</small></label><div class="auth-zone-footer"><span>@if(coverageCenter){Cobertura seleccionada: {{coverageRadiusKm}} km alrededor del punto del mapa.}@else{Haz clic en el mapa para indicar desde dónde repartes.}</span>@if(zoneError){<small class="field-error">{{zoneError}}</small>}</div></div>}
              }
            </div>

            <div class="auth-section-label"><span>02</span><div><b>{{role==='OWNER'?'Ubicación de la tienda':'Dirección de la distribuidora'}}</b><small>{{role==='OWNER'?'La usaremos para encontrar proveedores cercanos.':'Registra el local principal de tu empresa.'}}</small></div></div>
            <div class="auth-fields-grid auth-location-grid">
              <label class="auth-field"><span>Departamento</span><input [(ngModel)]="department" name="department" autocomplete="address-level1" placeholder="Cajamarca" required></label>
              <label class="auth-field"><span>Provincia</span><input [(ngModel)]="province" name="province" autocomplete="address-level2" placeholder="Cajamarca" required></label>
              <label class="auth-field"><span>Distrito</span><input [(ngModel)]="district" name="district" autocomplete="address-level3" placeholder="Distrito" required></label>
              <label class="auth-field auth-field-wide"><span>Dirección</span><input [(ngModel)]="address" name="address" autocomplete="street-address" maxlength="120" placeholder="Av., calle, número o referencia" required></label>
            </div>

            <div class="auth-section-label"><span>03</span><div><b>Acceso de administrador</b><small>Esta será la persona responsable de la cuenta.</small></div></div>
            <div class="auth-fields-grid">
              <label class="auth-field"><span>Nombre del responsable</span><input [(ngModel)]="name" name="name" autocomplete="name" maxlength="100" placeholder="Nombre y apellidos" required></label>
              <label class="auth-field"><span>Correo de acceso</span><input [(ngModel)]="email" name="email" type="email" autocomplete="email" maxlength="254" placeholder="nombre@negocio.pe" required></label>
              <label class="auth-field auth-field-wide"><span>Contraseña <small>10 caracteres como mínimo</small></span><div class="auth-password"><input [(ngModel)]="password" name="password" [type]="showPassword?'text':'password'" autocomplete="new-password" minlength="10" placeholder="Crea una contraseña segura" required><button type="button" (click)="showPassword=!showPassword" [attr.aria-label]="showPassword?'Ocultar contraseña':'Mostrar contraseña'">@if(showPassword){<svg lucideEyeOff></svg>}@else{<svg lucideEye></svg>}</button></div></label>
            </div>
            <p class="auth-legal-note"><svg lucideShieldCheck></svg> Tu negocio se creará como <b>pendiente de verificación</b>. El RUC se valida por formato, pero no se consulta SUNAT.</p>
            @if(error){<div class="auth-error" role="alert">{{error}}</div>}
            <button class="auth-submit" type="submit" [disabled]="loading || !valid()">{{loading ? 'Registrando negocio…' : 'Crear cuenta empresarial'}}<span>→</span></button>
            <div class="auth-switch">¿Ya tienes una cuenta? <button type="button" (click)="toggle()">Iniciar sesión</button></div>
          </form>
        } @else {
          <form class="auth-form auth-login-form" (ngSubmit)="submit()" autocomplete="on">
            <label class="auth-field"><span>Correo electrónico</span><input [(ngModel)]="email" name="email" type="email" autocomplete="username" placeholder="nombre@negocio.pe" required></label>
            <label class="auth-field"><span>Contraseña</span><div class="auth-password"><input [(ngModel)]="password" name="password" [type]="showPassword?'text':'password'" autocomplete="current-password" placeholder="Ingresa tu contraseña" required><button type="button" (click)="showPassword=!showPassword" [attr.aria-label]="showPassword?'Ocultar contraseña':'Mostrar contraseña'">@if(showPassword){<svg lucideEyeOff></svg>}@else{<svg lucideEye></svg>}</button></div></label>
            <button class="auth-forgot" type="button" (click)="forgot()">¿Olvidaste tu contraseña?</button>
            @if(error){<div class="auth-error" role="alert">{{error}}</div>}
            @if(notice){<div class="auth-notice" role="status">{{notice}}</div>}
            <button class="auth-submit" type="submit" [disabled]="loading || !valid()">{{loading ? 'Validando acceso…' : 'Ingresar a mi cuenta'}}<span>→</span></button>
            <div class="auth-divider"><span>¿Aún no tienes cuenta?</span></div>
            <button class="auth-create-account" type="button" (click)="toggle()">Registra tu negocio</button>
            <p class="auth-login-foot"><svg lucideShieldCheck></svg> Acceso privado para propietarios y proveedores.</p>
          </form>
        }
      </div>
    </section>
  </div>
</main>` })
export class LoginComponent implements AfterViewInit,OnDestroy {
  private auth=inject(AuthService); private router=inject(Router); private route=inject(ActivatedRoute);
  registering=this.route.snapshot.queryParamMap.get('mode')==='register';
  name='';businessName='';legalName='';taxId='';phone='';address='';department='Cajamarca';province='Cajamarca';district='';storeCategory='';businessDescription='';minimumOrder:number|null=null;businessHours='';paymentMethods:string[]=[];readonly paymentOptions=['Efectivo','Transferencia bancaria','Yape','Plin','Tarjeta','Depósito'];deliveryAvailable=false;role:'OWNER'|'SUPPLIER'='OWNER';email='';password='';error='';notice='';loading=false;showPassword=false;
  private deliveryMapHost?:ElementRef<HTMLDivElement>;private deliveryMap?:L.Map;private deliveryCircle?:L.Circle;private deliveryCenterMarker?:L.Marker;private deliveryMarkers?:L.LayerGroup;coverageCenter?:L.LatLng;coverageRadiusKm=3;zoneClosed=false;zoneError='';
  @ViewChild('deliveryMap') set mapElement(host:ElementRef<HTMLDivElement>|undefined){this.deliveryMapHost=host;if(host)queueMicrotask(()=>this.initializeDeliveryMap());else this.disposeDeliveryMap();}
  valid(){const contact=this.email.includes('@')&&this.password.length>=(this.registering?10:1);const common=contact&&this.rucValid()&&this.name.trim().length>=2&&this.businessName.trim().length>=2&&this.legalName.trim().length>=2&&this.phone.trim().length>=9&&this.address.trim().length>=5&&this.department.trim().length>=2&&this.province.trim().length>=2&&this.district.trim().length>=2;const roleData=this.role==='OWNER'?this.storeCategory.length>0:this.businessDescription.trim().length>=2&&this.paymentMethods.length>0&&(!this.deliveryAvailable||this.zoneClosed&&!!this.coverageCenter)&&(this.minimumOrder===null||this.minimumOrder>=0);return this.registering?common&&roleData:contact;}
  rucValid(){if(!/^\d{11}$/.test(this.taxId))return false;const weights=[5,4,3,2,7,6,5,4,3,2];const sum=weights.reduce((total,weight,index)=>total+Number(this.taxId[index])*weight,0);const check=11-(sum%11);const digit=check===10?0:check===11?1:check;return digit===Number(this.taxId[10]);}
  toggle(){this.registering=!this.registering;this.error='';this.notice='';}
  selectRole(role:'OWNER'|'SUPPLIER'){this.role=role;this.error='';}
  ngAfterViewInit(){queueMicrotask(()=>this.initializeDeliveryMap());}
  ngOnDestroy(){this.disposeDeliveryMap();}
  togglePayment(method:string,checked:boolean){this.paymentMethods=checked?[...this.paymentMethods,method]:this.paymentMethods.filter(item=>item!==method);}
  toggleDelivery(available:boolean){this.deliveryAvailable=available;this.zoneError='';if(!available)this.clearCoverage();else if(!this.coverageCenter){this.coverageCenter=L.latLng(-7.1617,-78.5128);this.zoneClosed=true;this.drawCoverage();}}
  private initializeDeliveryMap(){if(!this.deliveryMapHost||this.deliveryMap)return;this.deliveryMap=L.map(this.deliveryMapHost.nativeElement).setView([-7.1617,-78.5128],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(this.deliveryMap);this.deliveryMarkers=L.layerGroup().addTo(this.deliveryMap);this.deliveryMap.on('click',event=>this.addCoveragePoint(event.latlng));this.drawCoverage();setTimeout(()=>this.deliveryMap?.invalidateSize(),0);}
  private disposeDeliveryMap(){if(this.deliveryMap){this.deliveryMap.off();this.deliveryMap.remove();this.deliveryMap=undefined;this.deliveryCircle=undefined;this.deliveryCenterMarker=undefined;this.deliveryMarkers=undefined;}}
  private addCoveragePoint(point:L.LatLng){this.coverageCenter=point;this.zoneClosed=true;this.zoneError='';this.drawCoverage();}
  updateCoverageRadius(radius:number){this.coverageRadiusKm=Number(radius);this.drawCoverage();}
  private drawCoverage(){if(!this.deliveryMap||!this.deliveryMarkers)return;this.deliveryCircle?.remove();this.deliveryMarkers.clearLayers();if(!this.coverageCenter)return;this.deliveryCircle=L.circle(this.coverageCenter,{pane:'overlayPane',radius:this.coverageRadiusKm*1000,color:'#0066ff',weight:4,fillColor:'#2563eb',fillOpacity:.34,interactive:false}).addTo(this.deliveryMap);const metersPerPixel=40075016.686*Math.cos(this.coverageCenter.lat*Math.PI/180)/(256*2**this.deliveryMap.getZoom());const diameter=Math.max(24,this.coverageRadiusKm*2000/metersPerPixel);this.deliveryMarkers.addLayer(L.marker(this.coverageCenter,{icon:L.divIcon({className:'auth-zone-radius-marker',html:'',iconSize:[diameter,diameter],iconAnchor:[diameter/2,diameter/2]}),interactive:false,keyboard:false}));this.deliveryCenterMarker=L.marker(this.coverageCenter,{icon:businessMapPin(),draggable:true,title:'Arrastra para mover el centro de reparto'}).addTo(this.deliveryMarkers);this.deliveryCenterMarker.on('dragend',()=>{const position=this.deliveryCenterMarker?.getLatLng();if(position){this.coverageCenter=position;this.zoneClosed=true;this.deliveryCircle?.setLatLng(position);this.drawCoverage();}});}
  clearCoverage(){this.coverageCenter=undefined;this.zoneClosed=false;this.zoneError='';this.drawCoverage();}
  private deliveryGeoJson(){if(!this.zoneClosed||!this.coverageCenter)return undefined;const lat=this.coverageCenter.lat*Math.PI/180;const lng=this.coverageCenter.lng*Math.PI/180;const angular=this.coverageRadiusKm/6371;const ring:[number,number][]=[];for(let index=0;index<48;index++){const bearing=2*Math.PI*index/48;const pointLat=Math.asin(Math.sin(lat)*Math.cos(angular)+Math.cos(lat)*Math.sin(angular)*Math.cos(bearing));const pointLng=lng+Math.atan2(Math.sin(bearing)*Math.sin(angular)*Math.cos(lat),Math.cos(angular)-Math.sin(lat)*Math.sin(pointLat));ring.push([pointLng*180/Math.PI,pointLat*180/Math.PI]);}ring.push([...ring[0]]);return JSON.stringify({type:'Polygon',coordinates:[ring]});}
  forgot(){this.notice='La recuperación por correo requiere configurar el servicio de correo del negocio. Contacta al administrador por ahora.';}
  submit(){if(this.loading||!this.valid())return;this.error='';this.notice='';this.loading=true;const request=this.registering?this.auth.register({name:this.name.trim(),email:this.email.trim(),password:this.password,role:this.role,businessName:this.businessName.trim(),legalName:this.legalName.trim(),taxId:this.taxId.trim(),phone:this.phone.trim(),address:this.address.trim(),department:this.department.trim(),province:this.province.trim(),district:this.district.trim(),storeCategory:this.role==='OWNER'?this.storeCategory:undefined,businessDescription:this.role==='SUPPLIER'?this.businessDescription.trim():undefined,deliveryAvailable:this.role==='SUPPLIER'&&this.deliveryAvailable,deliveryZoneGeoJson:this.role==='SUPPLIER'&&this.deliveryAvailable?this.deliveryGeoJson():undefined,minimumOrder:this.role==='SUPPLIER'?this.minimumOrder??undefined:undefined,businessHours:this.role==='SUPPLIER'?this.businessHours.trim()||undefined:undefined,paymentMethods:this.role==='SUPPLIER'?this.paymentMethods:undefined}):this.auth.login(this.email.trim(),this.password);request.subscribe({next:response=>{this.loading=false;const route=response.user.role==='ADMIN'?'/admin':response.user.role==='SUPPLIER'?'/proveedor':'/app';void this.router.navigateByUrl(route);},error:e=>{this.loading=false;this.error=Array.isArray(e.error?.message)?e.error.message.join(' '):e.error?.message||'No se pudo completar el acceso. Verifica los datos e inténtalo nuevamente.';}});}
}
