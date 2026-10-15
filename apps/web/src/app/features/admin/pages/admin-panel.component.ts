import {Component,computed,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HttpClient,HttpErrorResponse} from '@angular/common/http';
import {Router} from '@angular/router';
import {AuthService} from '../../../core/auth/auth.service';
import {LucideArrowUpRight,LucideChevronLeft,LucideChevronRight,LucideLayoutDashboard,LucideListChecks,LucideLogOut,LucideMegaphone,LucidePackage,LucideRefreshCw,LucideSearch,LucideShieldCheck,LucideStore,LucideTags,LucideUsers} from '@lucide/angular';
type AdminData={users:{id:string;name:string;email:string;role:string;active:boolean}[];businesses:{id:string;name:string;type:string;status:string}[];categories:{id:string;name:string;description?:string;active:boolean}[];requests:{id:string;name:string;description?:string;status:string;adminNote?:string;user:{name:string}}[];offers:{id:string;active:boolean;price:string;business:{name:string};variant:{label:string;product:{name:string}}}[];products:{id:string;name:string;imageUrl:string|null;active:boolean;variants:{label:string}[]}[]};
@Component({standalone:true,imports:[FormsModule,LucideArrowUpRight,LucideChevronLeft,LucideChevronRight,LucideLayoutDashboard,LucideListChecks,LucideLogOut,LucideMegaphone,LucidePackage,LucideRefreshCw,LucideSearch,LucideShieldCheck,LucideStore,LucideTags,LucideUsers],templateUrl:'./admin-panel.component.html',styleUrls:['../../../shared/styles/management-base.css','./admin-panel.css']})
export class AdminPanelComponent{
 private http=inject(HttpClient);auth=inject(AuthService);private router=inject(Router);data=signal<AdminData|null>(null);tab=signal('Resumen');error=signal('');message=signal('');busy=signal(false);currentPage=signal(1);readonly pageSize=10;query='';category={name:'',description:'',active:true};product={name:'',category:'',brand:'',variantLabel:'',baseQuantity:1,baseUnit:'unidad',unitsPerPackage:1,imageUrl:''};
 readonly navGroups=[{title:'GENERAL',items:[{label:'Resumen',icon:'overview'}]},{title:'PLATAFORMA',items:[{label:'Negocios',icon:'businesses'},{label:'Usuarios',icon:'users'},{label:'Publicaciones',icon:'offers'}]},{title:'CATÁLOGO',items:[{label:'Catálogo',icon:'catalog'},{label:'Categorías',icon:'categories'},{label:'Solicitudes',icon:'requests'}]}];
 pendingBusinesses=computed(()=>this.data()?.businesses.filter(b=>b.status==='PENDING').length??0);
 constructor(){this.load();}load(){this.error.set('');this.http.get<AdminData>('/api/management-admin').subscribe({next:d=>{this.data.set(d);this.currentPage.set(1);},error:e=>this.fail(e)});}
 selectTab(label:string){this.tab.set(label);this.query='';this.currentPage.set(1);this.error.set('');this.message.set('');}
 pageTitle(){return this.tab()==='Resumen'?'Resumen de la plataforma':this.tab();}
 pageDescription(){return ({'Resumen':'Supervisa los negocios, las cuentas y el catálogo desde un solo lugar.','Negocios':'Revisa los registros y valida quién puede operar en la plataforma.','Usuarios':'Administra las cuentas y sus permisos de acceso.','Catálogo':'Mantén el catálogo maestro que comparten las distribuidoras.','Categorías':'Organiza los productos para facilitar su búsqueda.','Solicitudes':'Revisa propuestas para incorporar productos al catálogo.','Publicaciones':'Supervisa los precios y las ofertas de las distribuidoras.'} as Record<string,string>)[this.tab()]??'';}
 statusLabel(status:string){return ({PENDING:'Pendiente',VERIFIED:'Verificado',REJECTED:'Rechazado',SUSPENDED:'Suspendido',APPROVED:'Aprobada',ACTIVE:'Activa'} as Record<string,string>)[status]??status;}
 roleLabel(role:string){return ({ADMIN:'Administrador',OWNER:'Tienda',SUPPLIER:'Distribuidora'} as Record<string,string>)[role]??role;}
 filtered<T>(rows:T[]):T[]{return rows.filter(r=>JSON.stringify(r).toLowerCase().includes(this.query.toLowerCase()));}
 pageRows<T>(rows:T[]):T[]{const results=this.filtered(rows),last=Math.max(1,Math.ceil(results.length/this.pageSize)),page=Math.min(this.currentPage(),last);return results.slice((page-1)*this.pageSize,page*this.pageSize);}
 totalRows(){const d=this.data();if(!d)return 0;const rows:Record<string,unknown[]>={Negocios:d.businesses,Usuarios:d.users,Categorías:d.categories,Solicitudes:d.requests,Publicaciones:d.offers,Catálogo:d.products};return this.filtered((rows[this.tab()]??[]) as object[]).length;}
 pageCount(){return Math.max(1,Math.ceil(this.totalRows()/this.pageSize));}
 pageStart(){return this.totalRows()?((Math.min(this.currentPage(),this.pageCount())-1)*this.pageSize)+1:0;}
 pageEnd(){return Math.min(this.currentPage()*this.pageSize,this.totalRows());}
 changePage(delta:number){this.currentPage.set(Math.max(1,Math.min(this.pageCount(),this.currentPage()+delta)));}
 save(path:string,body:unknown,method='patch'){if(this.busy())return;this.busy.set(true);this.error.set('');this.http.request(method,'/api/'+path,{body}).subscribe({next:()=>{this.busy.set(false);this.message.set('Cambios guardados.');this.load();},error:e=>{this.busy.set(false);this.fail(e);}});}
 status(id:string,status:string){this.save(`admin/businesses/${id}/status`,{status});}
 review(id:string,status:string,note?:string){this.save(`management-admin/requests/${id}`,{status,adminNote:note??''});}
 createProduct(){const body={...this.product};if(!body.brand)delete (body as Partial<typeof body>).brand;if(!body.category)delete (body as Partial<typeof body>).category;this.save('admin/catalog/products',body,'post');}
 saveProductImage(product:AdminData['products'][number]){this.save(`admin/catalog/products/${product.id}/image`,{imageUrl:product.imageUrl||null});}
 logout(){this.auth.logout();this.router.navigateByUrl('/login');}
 private fail(e:HttpErrorResponse){this.error.set(Array.isArray(e.error?.message)?e.error.message.join(' · '):e.error?.message??'No pudimos completar la operación.');}
}
