import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HomeApiService } from '../apis/home.api';
import { HomeAdapter } from '../adapters/home.adapter';
import { BackendStatus } from '../models/home.model';

@Injectable({ providedIn: 'root' })
export class HomeFacade {
  private readonly _status$ = new BehaviorSubject<BackendStatus | null>(null);
  private readonly _loading$ = new BehaviorSubject<boolean>(false);

  readonly status$ = this._status$.asObservable();
  readonly loading$ = this._loading$.asObservable();

  constructor(private api: HomeApiService) {}

  async load(): Promise<void> {
    this._loading$.next(true);
    try {
      const message = await this.api.getStatus();
      this._status$.next(HomeAdapter.toOnlineStatus(message));
    } catch (err) {
      console.error('[HomeFacade] status check failed:', err);
      this._status$.next(HomeAdapter.toOfflineStatus());
    } finally {
      this._loading$.next(false);
    }
  }
}
