import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { LucideArrowRight, LucideCheck, LucideListChecks, LucidePlus, LucideSearch, LucideTrash2 } from '@lucide/angular';
import { AuthService } from '../../../../core/auth/auth.service';

type ListRow = { id: string; name: string; updatedAt: string; items: Array<{ id:string; quantity:string; unit:string; variant:{label:string;product:{name:string;brand?:{name:string}|null}} }> };
type Variant = { id:string; label:string; baseUnit:string; product:{name:string;brand?:{name:string}|null} };
type ProductHit = { name:string; brand?:{name:string}|null; variants:Array<Omit<Variant,'product'>> };
type SourcingPlan = { method:string; optimal:boolean; total:number; productSubtotal:number; deliveryCost:number; providers:Array<{supplier:string;branch:string}>; assignments:Array<{product:string;presentation:string;supplier:string;branch:string;packages:number;requestedQuantity:number;acquiredQuantity:number;surplus:number;productCost:number}> };
type ListComparison = { status:string; missing?:Array<{product:string;presentation:string;quantity:number;unit:string}>; singleSupplier?:SourcingPlan|null; splitPurchase?:SourcingPlan|null; comparison?:{splitCanReduceTotal:boolean;singleSupplierCount:number;splitSearch:string}; methodology?:string };

@Component({standalone:true,imports:[FormsModule,DatePipe,LucideArrowRight,LucideCheck,LucideListChecks,LucidePlus,LucideSearch,LucideTrash2],template:`
<section class="page lists-page"><div class="page-heading"><div><div class="eyebrow">MI TIENDA / PRODUCTOS</div><h1>Mis listas de compra</h1><p class="subhead">Organiza tus productos en listas para monitorear precios y planificar tus compras.</p></div><button class="button primary" (click)="create()"><svg lucidePlus></svg> Nueva lista</button></div>
@if(error()){<div class="error-banner">{{error()}}</div>}
<div class="lists-layout"><aside class="lists-sidebar"><form class="new-list-form" (ngSubmit)="create()"><input [(ngModel)]="newName" name="newListName" placeholder="Nombre de la lista" maxlength="100" required><button class="icon-action" aria-label="Crear lista"><svg lucidePlus></svg></button></form>
@if(lists().length===0){<div class="list-empty">Todavía no tienes listas.</div>}@for(list of lists();track list.id){<button class="list-nav" [class.active]="active()?.id===list.id" (click)="open(list.id)"><span><b>{{list.name}}</b><small>{{list.items.length}} productos · {{list.updatedAt|date:'d MMM'}}</small></span><svg lucideArrowRight></svg></button>}</aside>
<div class="list-content">@if(active();as list){<div class="list-title-row"><div><div class="eyebrow">LISTA DE COMPRA</div><h2>{{list.name}}</h2><p>{{list.items.length}} productos guardados</p></div><label class="rename-control"><span>Nombre</span><input [(ngModel)]="rename" (keyup.enter)="saveName()"><button (click)="saveName()" aria-label="Guardar nombre"><svg lucideCheck></svg></button></label></div>
<div class="list-search"><svg lucideSearch></svg><input [(ngModel)]="query" (ngModelChange)="search()" placeholder="Busca en el catálogo para añadir productos"></div>
@if(hits().length){<div class="list-hits">@for(v of hits();track v.id){<button (click)="choose(v)"><span><b>{{v.product.name}}</b><small>{{v.label}} · {{v.baseUnit}}</small></span><svg lucidePlus></svg></button>}</div>}
@if(selected()){<div class="add-item-form"><span><b>{{selected()!.product.name}}</b><small>{{selected()!.label}} · {{selected()!.baseUnit}}</small></span><label>Cantidad<input type="number" min="0.001" step="0.001" [(ngModel)]="quantity"></label><button class="button primary" (click)="saveItem()">Añadir</button></div>}
@if(list.items.length){<div class="list-items">@for(item of list.items;track item.id){<article><span class="item-icon"><svg lucideListChecks></svg></span><span class="item-name"><b>{{item.variant.product.name}}</b><small>{{item.variant.label}} · {{item.variant.product.brand?.name||'Marca no especificada'}}</small></span><span class="item-quantity">{{item.quantity}} {{item.unit}}</span><button class="icon-action danger" (click)="remove(item.id)" aria-label="Quitar producto"><svg lucideTrash2></svg></button></article>}</div>}@else{<div class="list-empty large"><div class="empty-art"><svg lucideListChecks></svg></div><h3>Esta lista está vacía</h3><p>Busca productos arriba para empezar a armar tu compra.</p></div>}
<div class="list-note"><b>Compara abastecimiento</b><span>Revisa opciones para cubrir todos los productos. Las tarifas de entrega se cobran una vez por sucursal seleccionada.</span><label><input type="checkbox" [(ngModel)]="delivery"> Incluir entrega</label><button class="button primary" (click)="compare()" [disabled]="comparing||!list.items.length">{{comparing?'Calculando…':'Comparar lista'}}</button></div>
@if(comparison(); as result){
<div class="list-comparison">
  @if(result.status==='INCOMPLETE'){
    <h3>Faltan ofertas compatibles</h3><p>No hay alternativas válidas para todos los productos de la lista.</p>
    @for(missing of result.missing;track missing.product){<span class="missing-chip">{{missing.product}} · {{missing.presentation}} ({{missing.quantity}} {{missing.unit}})</span>}
  }
  @if(result.status==='COMPLETE'){
    <div class="plan-grid">
      <article><div class="eyebrow">UN SOLO PROVEEDOR</div>
        @if(result.singleSupplier){<h3>{{result.singleSupplier.providers[0]?.supplier}}</h3><strong>S/ {{result.singleSupplier.total.toFixed(2)}}</strong><small>Productos S/ {{result.singleSupplier.productSubtotal.toFixed(2)}} · Entrega S/ {{result.singleSupplier.deliveryCost.toFixed(2)}}</small>
          @for(line of result.singleSupplier.assignments;track line.product){<p>{{line.product}}: {{line.packages}} paquete(s) · {{line.supplier}}</p>}
        }@else{<h3>Ningún proveedor cubre toda la lista</h3>}
      </article>
      <article class="recommended-plan"><div class="eyebrow">{{result.splitPurchase?.optimal?'MEJOR COSTO · BÚSQUEDA EXACTA':'ASIGNACIÓN APROXIMADA'}}</div>
        @if(result.splitPurchase){<h3>{{result.splitPurchase.providers.length}} proveedores</h3><strong>S/ {{result.splitPurchase.total.toFixed(2)}}</strong><small>Productos S/ {{result.splitPurchase.productSubtotal.toFixed(2)}} · Entrega S/ {{result.splitPurchase.deliveryCost.toFixed(2)}}</small>
          @for(line of result.splitPurchase.assignments;track line.product){<p>{{line.product}}: {{line.packages}} paquete(s) · {{line.supplier}} @if(line.surplus>0){<span> · excedente {{line.surplus}}</span>}</p>}
        }@else{<h3>No hay una asignación completa</h3>}
      </article>
    </div>
    <p class="plan-explanation">{{result.methodology}} @if(result.comparison?.splitCanReduceTotal){<b> Dividir la lista reduce el total frente al mejor proveedor único.</b>}</p>
  }
</div>
}
}@else{<div class="list-empty large"><div class="empty-art"><svg lucideListChecks></svg></div><h2>Organiza tu próximo abastecimiento</h2><p>Crea una lista y añade productos del catálogo.</p></div>}</div></div></section>`})
export class ShoppingListsComponent {
  private http=inject(HttpClient);private auth=inject(AuthService);private router=inject(Router);
  readonly lists=signal<ListRow[]>([]);readonly active=signal<ListRow|null>(null);readonly hits=signal<Variant[]>([]);readonly selected=signal<Variant|null>(null);readonly error=signal('');readonly comparison=signal<ListComparison|null>(null);
  newName='';rename='';query='';quantity=1;delivery=false;comparing=false;private timer?:ReturnType<typeof setTimeout>;
  constructor(){this.load();}
  load(){this.http.get<ListRow[]>('/api/shopping-lists').subscribe({next:rows=>{this.lists.set(rows);if(this.active()){const updated=rows.find(x=>x.id===this.active()!.id);this.active.set(updated??null);}},error:e=>{if(e.status===401){this.auth.logout();void this.router.navigateByUrl('/login');}else this.error.set('No se pudieron cargar tus listas. Comprueba que la API y la base de datos estén disponibles.');}});}
  create(){const name=this.newName.trim()||`Lista ${new Date().toLocaleDateString('es-PE')}`;this.http.post<ListRow>('/api/shopping-lists',{name}).subscribe({next:list=>{this.newName='';this.load();this.open(list.id);},error:e=>this.error.set(e.error?.message||'No se pudo crear la lista.')});}
  open(id:string){this.selected.set(null);this.http.get<ListRow>(`/api/shopping-lists/${id}`).subscribe({next:list=>{this.active.set(list);this.rename=list.name;},error:e=>this.error.set(e.error?.message||'No se pudo abrir esta lista.')});}
  saveName(){const list=this.active();if(!list||!this.rename.trim())return;this.http.patch<ListRow>(`/api/shopping-lists/${list.id}`,{name:this.rename.trim()}).subscribe({next:updated=>{this.active.set(updated);this.load();},error:e=>this.error.set(e.error?.message||'No se pudo renombrar la lista.')});}
  search(){clearTimeout(this.timer);this.timer=setTimeout(()=>{if(this.query.trim().length<2){this.hits.set([]);return;}this.http.get<ProductHit[]>('/api/catalog/products',{params:{q:this.query}}).subscribe({next:products=>this.hits.set(products.flatMap(p=>p.variants.map(v=>({...v,product:{name:p.name,brand:p.brand}})))),error:()=>this.error.set('No se pudo buscar en el catálogo.')});},250);}
  choose(variant:Variant){this.selected.set(variant);this.quantity=1;this.hits.set([]);}
  saveItem(){const list=this.active(),variant=this.selected();if(!list||!variant)return;this.http.put<ListRow>(`/api/shopping-lists/${list.id}/items/${variant.id}`,{quantity:Number(this.quantity),unit:variant.baseUnit}).subscribe({next:updated=>{this.active.set(updated);this.selected.set(null);this.query='';this.load();},error:e=>this.error.set(e.error?.message||'No se pudo añadir el producto.')});}
  remove(itemId:string){const list=this.active();if(!list)return;this.http.delete<ListRow>(`/api/shopping-lists/${list.id}/items/${itemId}`).subscribe({next:updated=>{this.active.set(updated);this.load();},error:e=>this.error.set(e.error?.message||'No se pudo quitar el producto.')});}
  compare(){const list=this.active();if(!list)return;this.comparing=true;this.error.set('');this.comparison.set(null);this.http.post<ListComparison>(`/api/shopping-lists/${list.id}/compare`,{delivery:this.delivery}).subscribe({next:result=>{this.comparison.set(result);this.comparing=false;},error:e=>{this.error.set(e.error?.message||'No se pudo comparar esta lista.');this.comparing=false;}});}
}
