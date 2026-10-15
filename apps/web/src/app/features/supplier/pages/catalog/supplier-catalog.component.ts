import { Component, computed, input, output, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

export type CatalogOffer = { id:string; variantId:string; branchId:string; price:number; minimumPackages:number; stockPackages?:number; stockMinimumPackages?:number; availability:string; active:boolean; variant:{label:string;product:{name:string;imageUrl?:string|null;category?:{name:string}|null}}; promotions:{id:string;offerId:string;referencePrice:number;promotionalPrice:number;minimumPackages:number;startAt:string;endAt:string;active:boolean;conditions?:string}[] };
@Component({selector:'app-supplier-catalog',standalone:true,imports:[CurrencyPipe],templateUrl:'./supplier-catalog.component.html',styleUrl:'./supplier-catalog.component.css'})
export class SupplierCatalogComponent {
 readonly offers=input.required<CatalogOffer[]>();
 readonly edit=output<CatalogOffer>();readonly remove=output<CatalogOffer>();readonly create=output<void>();
 readonly query=signal('');readonly category=signal('');readonly status=signal('');readonly size=signal(8);readonly page=signal(1);
 readonly active=computed(()=>this.offers().filter(o=>o.active).length);
 readonly categories=computed(()=>[...new Set(this.offers().map(o=>o.variant.product.category?.name).filter((c):c is string=>!!c))].sort());
 readonly filtered=computed(()=>{const q=this.query().trim().toLocaleLowerCase();return this.offers().filter(o=>(!q||`${o.variant.product.name} ${o.variant.label} ${o.variant.product.category?.name??''}`.toLocaleLowerCase().includes(q))&&(!this.category()||o.variant.product.category?.name===this.category())&&(!this.status()||o.active===(this.status()==='active')));});
 readonly pages=computed(()=>Math.max(1,Math.ceil(this.filtered().length/this.size())));
 readonly current=computed(()=>Math.min(this.page(),this.pages()));
 readonly start=computed(()=>(this.current()-1)*this.size());
 readonly visible=computed(()=>this.filtered().slice(this.start(),this.start()+this.size()));
 readonly end=computed(()=>this.start()+this.visible().length);
 readonly pageNumbers=computed(()=>{const start=Math.max(1,Math.min(this.current()-2,this.pages()-4));return Array.from({length:Math.min(5,this.pages())},(_,i)=>start+i);});
 setFilter(kind:'query'|'category'|'status',value:string){this[kind].set(value);this.page.set(1);}
 setSize(value:string){this.size.set(Number(value));this.page.set(1);}
 go(page:number){this.page.set(Math.max(1,Math.min(page,this.pages())));}
 clear(){this.query.set('');this.category.set('');this.status.set('');this.page.set(1);}
}
