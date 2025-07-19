import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { ToastService } from './toast.service';
import { TokenService } from './token.service';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class LogoutService {

  constructor(
    private readonly tokenService : TokenService,
    private readonly storageService : StorageService,
    private readonly toastService : ToastService,
  ) { }

  async logout() {
    console.log('Called Logout....');
    this.tokenService.clearToken();
    setTimeout((
    ) => {
      this.storageService.clearStorage().then(async () => {
        console.log('capacitor', Capacitor.getPlatform());
        await this.storageService.setItem('user_has_logged_out', true);
        window.location.reload();
      });
    },200);
  }
}
