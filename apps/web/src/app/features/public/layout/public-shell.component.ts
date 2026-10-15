import { Component, inject } from '@angular/core';
import { signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideStore, LucideArrowRight, LucideMenu, LucideX } from '@lucide/angular';
import { AuthService } from '../../../core/auth/auth.service';

@Component({ standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideStore, LucideArrowRight, LucideMenu, LucideX], template: `
<div class="public-site">
<a class="skip-link" href="#public-content">Saltar al contenido</a>
<header class="public-nav"><div class="public-nav-inner"><a class="landing-brand" routerLink="/" (click)="navOpen.set(false)"><span class="landing-mark"><svg lucideStore></svg></span><span>Tienda <b>Inteligente</b><small>ABASTECIMIENTO CLARO</small></span></a>
<button type="button" class="menu-toggle" #menuToggle aria-controls="public-navigation" [attr.aria-expanded]="navOpen()" [attr.aria-label]="navOpen() ? 'Cerrar menú' : 'Abrir menú'" (click)="navOpen.set(!navOpen())">@if(navOpen()){<svg lucideX></svg>}@else{<svg lucideMenu></svg>}</button>
<nav id="public-navigation" [class.is-open]="navOpen()" aria-label="Navegación principal" (click)="navOpen.set(false)" (keydown.escape)="navOpen.set(false); menuToggle.focus()"><a routerLink="/como-funciona" routerLinkActive="public-active" ariaCurrentWhenActive="page">Cómo funciona</a><a routerLink="/beneficios" routerLinkActive="public-active" ariaCurrentWhenActive="page">Beneficios</a><a routerLink="/maps" routerLinkActive="public-active" ariaCurrentWhenActive="page">Maps</a><a routerLink="/sobre-nosotros" routerLinkActive="public-active" ariaCurrentWhenActive="page">Sobre nosotros</a><div class="public-nav-actions"><a class="public-login" [routerLink]="auth.hasSession() ? '/panel' : '/login'">{{auth.hasSession() ? 'Mi panel' : 'Iniciar sesión'}}</a>@if(!auth.hasSession()){<a class="site-button" routerLink="/login" [queryParams]="{mode:'register'}">Crear cuenta <svg lucideArrowRight></svg></a>}</div></nav></div></header>
<main class="public-main" id="public-content" tabindex="-1"><router-outlet /></main>
<footer class="public-footer site-wrap"><div><a class="landing-brand" routerLink="/"><span class="landing-mark"><svg lucideStore></svg></span><span>Tienda <b>Inteligente</b></span></a><p>Mejor información para el comercio local.</p></div><nav aria-label="Enlaces del pie de página"><a routerLink="/sobre-nosotros">Sobre nosotros</a><a routerLink="/maps">Distribuidoras</a></nav><small>© 2026 Tienda Inteligente</small></footer></div>` })
export class PublicSiteShellComponent { readonly auth = inject(AuthService); readonly navOpen = signal(false); }
