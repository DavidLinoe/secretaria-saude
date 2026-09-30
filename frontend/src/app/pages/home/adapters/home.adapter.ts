import { BackendStatus } from '../models/home.model';

export class HomeAdapter {
  static toOnlineStatus(message: string): BackendStatus {
    return { online: true, message };
  }

  static toOfflineStatus(): BackendStatus {
    return { online: false, message: 'Backend indisponível' };
  }
}
