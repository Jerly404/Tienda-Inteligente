import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

type AuthResponse = { user: { id: string; email: string; name: string; role: string }; accessToken: string };
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<{ id: string; email: string; name: string; role: string } | null>(this.readUser());
  constructor(private http: HttpClient) {}
  login(email: string, password: string): Observable<AuthResponse> { return this.http.post<AuthResponse>('/api/auth/login', { email, password }).pipe(tap((response) => this.save(response))); }
  register(input:{name:string;email:string;password:string;role:'OWNER'|'SUPPLIER';businessName:string;legalName:string;taxId:string;phone:string;address:string;department:string;province:string;district:string;storeCategory?:string;businessDescription?:string;deliveryAvailable:boolean;deliveryZoneGeoJson?:string;minimumOrder?:number;businessHours?:string;paymentMethods?:string[]}): Observable<AuthResponse> { return this.http.post<AuthResponse>('/api/auth/register', input).pipe(tap((response) => this.save(response))); }
  updateProfile(input:{name:string;email:string;currentPassword?:string}):Observable<{user:{id:string;email:string;name:string;role:string}}>{return this.http.patch<{user:{id:string;email:string;name:string;role:string}}>('/api/auth/profile',input).pipe(tap(response=>{const updated={...this.user(),...response.user};this.user.set(updated);sessionStorage.setItem('ti_user',JSON.stringify(updated));}));}
  changePassword(input:{currentPassword:string;newPassword:string}):Observable<{message:string}>{return this.http.patch<{message:string}>('/api/auth/password',input);}
  role(){return this.user()?.role??null;}
  logout() { sessionStorage.removeItem('ti_access_token'); sessionStorage.removeItem('ti_user'); this.user.set(null); }
  hasSession() { return typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem('ti_access_token'); }
  private save(response: AuthResponse) { sessionStorage.setItem('ti_access_token', response.accessToken); sessionStorage.setItem('ti_user', JSON.stringify(response.user)); this.user.set(response.user); }
  private readUser() { try { return typeof sessionStorage === 'undefined' ? null : JSON.parse(sessionStorage.getItem('ti_user') ?? 'null'); } catch { return null; } }
}
