import { Injectable } from '@angular/core';
import { HttpService } from '../../../shared/http.service';

@Injectable({ providedIn: 'root' })
export class HomeApiService {
  constructor(private http: HttpService) {}

  async getStatus(): Promise<string> {
    return this.http.get<string>('status');
  }
}
