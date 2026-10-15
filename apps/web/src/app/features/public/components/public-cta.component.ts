import { Component, input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight } from '@lucide/angular';
import { AuthService } from '../../../core/auth/auth.service';

@Component({ selector: 'app-public-cta', standalone: true, imports: [RouterLink, LucideArrowRight], template: `
<section class="site-cta site-wrap"><div><span class="site-label">TU NEGOCIO, TUS DECISIONES</span><h2>{{title()}}</h2><p>{{description()}}</p></div><a class="site-button" [routerLink]="auth.hasSession() ? '/panel/comparar' : '/login'" [queryParams]="auth.hasSession() ? {} : {mode:'register'}">{{auth.hasSession() ? 'Ir al comparador' : 'Crear mi cuenta'}} <svg lucideArrowRight></svg></a></section>` })
export class PublicCtaComponent {
  readonly auth = inject(AuthService);
  readonly title = input('Tu próxima compra empieza con mejor información.');
  readonly description = input('Organiza tus productos, conoce proveedores y compara a tu ritmo.');
}
