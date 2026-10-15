import { Component, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

type Request = { id: string; supplierBusinessId: string; status: string; createdAt: string; items: { variant: { product: { name: string } } }[] };
type Promotion = { id: string; offerId: string; active: boolean; startAt: string; endAt: string };
type Offer = { id: string; active: boolean; stockPackages?: number | null; availability: string; variant: { product: { name: string } }; promotions: Promotion[] };

@Component({
  selector: 'app-supplier-analysis', standalone: true, imports: [DatePipe],
  templateUrl: './supplier-analysis.component.html', styleUrl: './supplier-analysis.component.css',
})
export class SupplierAnalysisComponent {
  readonly requests = input.required<Request[]>();
  readonly offers = input.required<Offer[]>();
  readonly companyId = input.required<string>();
  readonly navigate = output<string>();
  readonly period = signal(30);
  readonly today = new Date();
  readonly filtered = computed(() => {
    const start = new Date(this.today); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - this.period() + 1);
    return this.requests().filter(q => q.supplierBusinessId === this.companyId() && new Date(q.createdAt) >= start && new Date(q.createdAt) <= this.today);
  });
  readonly pending = computed(() => this.filtered().filter(q => q.status === 'SENT').length);
  readonly responded = computed(() => this.filtered().filter(q => q.status === 'RESPONDED').length);
  readonly responseRate = computed(() => this.filtered().length ? Math.round(this.responded() / this.filtered().length * 100) : 0);
  readonly ranking = computed(() => {
    const counts = new Map<string, number>();
    for (const q of this.filtered()) for (const name of new Set(q.items.map(item => item.variant.product.name))) counts.set(name, (counts.get(name) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  });
  readonly chart = computed(() => {
    const days = Array.from({ length: this.period() }, (_, i) => {
      const date = new Date(this.today); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - this.period() + 1 + i);
      const next = new Date(date); next.setDate(next.getDate() + 1);
      return { date, count: this.filtered().filter(q => new Date(q.createdAt) >= date && new Date(q.createdAt) < next).length };
    });
    const max = Math.max(1, ...days.map(d => d.count));
    return days.map(d => ({ ...d, height: d.count / max * 100 }));
  });
  readonly published = computed(() => this.offers().filter(o => o.active));
  readonly outOfStock = computed(() => this.published().filter(o => o.availability === 'OUT_OF_STOCK' || o.stockPackages === 0).length);
  readonly promotions = computed(() => this.published().flatMap(o => o.promotions.map(p => ({ ...p, name: o.variant.product.name }))).filter(p => p.active && new Date(p.startAt) <= this.today && new Date(p.endAt) > this.today));
  readonly expiring = computed(() => this.promotions().filter(p => new Date(p.endAt).getTime() - this.today.getTime() <= 7 * 86400000).sort((a, b) => +new Date(a.endAt) - +new Date(b.endAt)));
}
