import { Component, inject, signal, computed } from '@angular/core';
import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucidePackage, LucideStore, LucideArrowUpRight, LucideArrowRight, LucideChevronLeft, LucideChevronRight, LucideMapPin, LucideTags, LucideLayers, LucideTrendingDown, LucideX, LucidePhone, LucideCheck } from '@lucide/angular';
import { DashboardData, Dashboard } from '../../data-access/dashboard-data.service';
@Component({ standalone: true, imports: [RouterLink, CurrencyPipe, DatePipe, NgTemplateOutlet, FormsModule, LucideSearch, LucidePackage, LucideStore, LucideArrowUpRight, LucideArrowRight, LucideChevronLeft, LucideChevronRight, LucideMapPin, LucideTags, LucideLayers, LucideTrendingDown, LucideX, LucidePhone, LucideCheck], providers: [DashboardData], templateUrl:'./store-section.component.html' })
export class StoreSectionComponent {
  readonly dashboard = inject(DashboardData);
  private route=inject(ActivatedRoute);
  readonly section = this.route.snapshot.data['section'] as string;
  readonly title = ({productos:'Productos',proveedores:'Proveedores',ofertas:'Ofertas y oportunidades',} as Record<string,string>)[this.section];
  readonly description = ({productos:'Tu catálogo, con los precios y la disponibilidad a la vista.',proveedores:'Conoce quién puede abastecerte y encuentra tu próximo proveedor.',ofertas:'Precios vigentes y oportunidades para tu próxima compra.',} as Record<string,string>)[this.section];
  readonly query = signal(this.route.snapshot.queryParamMap.get('q') || '');
  readonly category=signal(''); readonly stock=signal(''); readonly supplier=signal(''); readonly page=signal(1); readonly selected=signal<Dashboard['suppliers'][number]|null>(null);
  readonly categories=computed(()=>{const counts=new Map<string,number>();for(const p of this.dashboard.data()?.catalog??[]){const c=p.category?.name||'Sin categoría';counts.set(c,(counts.get(c)||0)+1);}return [...counts].map(([name,count],i)=>({name,count,color:['#3478f6','#8365ce','#35a987','#e7ac4e','#e78076','#7295b9'][i%6]})).sort((a,b)=>b.count-a.count);});
  readonly products=computed(()=> (this.dashboard.data()?.catalog??[]).flatMap(p=>p.variants.map(v=>{const choices=(this.dashboard.data()?.offers??[]).filter(o=>o.variantId===v.id).sort((a,b)=>a.price-b.price);return {...v,name:p.name,imageUrl:p.imageUrl,brand:p.brand?.name||'',category:p.category?.name||'Sin categoría',best:choices[0] as Dashboard['offers'][number] | undefined,providers:new Set(choices.map(o=>o.businessId)).size};})));
  readonly filteredProducts=computed(()=>this.products().filter(p=>`${p.name} ${p.brand} ${p.label}`.toLowerCase().includes(this.query().toLowerCase().trim())&&(!this.category()||p.category===this.category())&&(!this.stock()||(this.stock()==='available'?!!p.best:!p.best))));
  readonly suppliers = computed(() => (this.dashboard.data()?.suppliers??[]).map(s=>({...s,products:new Set(this.dashboard.data()?.offers.filter(o=>o.businessId===s.id).map(o=>o.variantId)).size,categories:[...new Set(this.dashboard.data()?.offers.filter(o=>o.businessId===s.id).map(o=>o.category))]})).filter(s=>`${s.name} ${s.branches.map(b=>b.address).join(' ')} ${s.categories.join(' ')}`.toLowerCase().includes(this.query().toLowerCase().trim())&&(!this.category()||s.categories.includes(this.category()))));
  readonly offers = computed(() => (this.dashboard.data()?.offers??[]).filter(o => `${o.product} ${o.supplier}`.toLowerCase().includes(this.query().toLowerCase().trim())&&(!this.category()||o.category===this.category())&&(!this.supplier()||o.businessId===this.supplier())));
  readonly total=computed(()=>this.section==='productos'?this.filteredProducts().length:this.section==='proveedores'?this.suppliers().length:this.offers().length);
  readonly pages=computed(()=>Math.max(1,Math.ceil(this.total()/8)));
  readonly productRows=computed(()=>this.filteredProducts().slice((this.page()-1)*8,this.page()*8));
  readonly supplierRows=computed(()=>this.suppliers().slice((this.page()-1)*8,this.page()*8));
  readonly offerRows=computed(()=>this.offers().slice((this.page()-1)*8,this.page()*8));
  readonly leaders=computed(()=>[...this.suppliers()].sort((a,b)=>b.products-a.products).slice(0,5));
  readonly withOffers=computed(()=>this.products().filter(p=>p.best).length);
  readonly newSuppliers=computed(()=>{const now=new Date();return (this.dashboard.data()?.suppliers??[]).filter(s=>new Date(s.createdAt).getMonth()===now.getMonth()&&new Date(s.createdAt).getFullYear()===now.getFullYear()).length;});
  readonly located=computed(()=>(this.dashboard.data()?.suppliers??[]).filter(s=>s.branches.some(b=>b.latitude!==null&&b.longitude!==null)).length);
  readonly supplierOfferCount=computed(()=>new Set(this.dashboard.data()?.offers.map(o=>o.businessId)).size);
  readonly expiring=computed(()=>(this.dashboard.data()?.offers??[]).filter(o=>o.expiresAt&&new Date(o.expiresAt).getTime()<Date.now()+7*86400000).length);
  readonly donut=computed(()=>{const total=this.categories().reduce((n,c)=>n+c.count,0);let start=0;return 'conic-gradient('+this.categories().map(c=>{const end=start+c.count/total*100;const part=`${c.color} ${start}% ${end}%`;start=end;return part;}).join(',')+')';});
  constructor(){this.route.queryParamMap.subscribe(params=>{this.query.set(params.get('q')||'');this.page.set(1);});}
  change(){this.page.set(1);}
  reset(){this.query.set('');this.category.set('');this.stock.set('');this.supplier.set('');this.change();}

}
