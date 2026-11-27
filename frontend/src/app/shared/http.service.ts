import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { API_BASE_URL } from './api-base-url.token';

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Versão enxuta do `HttpService` do monorepo original: sem cache, sem
 * `Authorization`/sessão (backend deste MVP não tem autenticação ainda) —
 * só o essencial pra `get`/`post`/`delete` com timeout, que é o que as
 * `apis/` deste app usam.
 */
@Injectable({ providedIn: 'root' })
export class HttpService {
  constructor(
    private httpClient: HttpClient,
    @Inject(API_BASE_URL) private baseUrl: string,
  ) {}

  get<T>(url: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T> {
    return firstValueFrom(this.httpClient.get<T>(this.baseUrl + url).pipe(timeout(timeoutMs)));
  }

  /** Para rotas que respondem texto puro (ex.: GET / do backend) — o parse JSON padrão falharia. */
  getText(url: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<string> {
    return firstValueFrom(this.httpClient.get(this.baseUrl + url, { responseType: 'text' }).pipe(timeout(timeoutMs)));
  }

  post<T>(url: string, body: unknown, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T> {
    return firstValueFrom(this.httpClient.post<T>(this.baseUrl + url, body).pipe(timeout(timeoutMs)));
  }

  put<T>(url: string, body: unknown, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T> {
    return firstValueFrom(this.httpClient.put<T>(this.baseUrl + url, body).pipe(timeout(timeoutMs)));
  }

  patch<T>(url: string, body: unknown, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T> {
    return firstValueFrom(this.httpClient.patch<T>(this.baseUrl + url, body).pipe(timeout(timeoutMs)));
  }

  delete<T>(url: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T> {
    return firstValueFrom(this.httpClient.delete<T>(this.baseUrl + url).pipe(timeout(timeoutMs)));
  }
}
