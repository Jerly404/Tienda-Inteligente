import { Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucidePackage, LucideStore, LucideTrendingDown, LucideTags, LucideBell, LucideSparkles, LucideArrowUpDown } from '@lucide/angular';
import { DashboardData } from '../../data-access/dashboard-data.service';
@Component({ standalone: true, providers: [DashboardData], imports: [RouterLink, CurrencyPipe, DatePipe, LucideArrowRight, LucidePackage, LucideStore, LucideTrendingDown, LucideTags, LucideBell, LucideSparkles, LucideArrowUpDown], templateUrl: './home.component.html' })
export class HomeComponent { readonly dashboard = inject(DashboardData); }
