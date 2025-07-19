import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class TokenService {

  private readonly TOKEN_KEY = 'auth_token';
  private readonly USERID_KEY = 'loggedInUserId';

  constructor(private readonly storageService: StorageService) { }

  async setToken(token: string): Promise<void> {
    await this.storageService.setItem(this.TOKEN_KEY, token);
  }

  async getToken(): Promise<string | null> {
    return await this.storageService.getItem<string>(this.TOKEN_KEY);
  }

  async getUserID(): Promise<string | null> {
    return await this.storageService.getItem<string>(this.USERID_KEY);
  }

  async clearToken(): Promise<void> {
    await this.storageService.removeItem(this.TOKEN_KEY);
  }

  async setDecodedTokenToStorage(decToken: string): Promise<void> {
    await this.storageService.setItem(this.USERID_KEY, decToken);
  }

  async isTokenPresent(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null && token.trim() !== '';
  }

  async checkTokenExpiry() {
    const token = await this.getToken();
    
    if (token) {
      const decodedToken = jwtDecode(token);
  
      // Check if `exp` exists and compare with current time
      if (decodedToken.exp) {
        const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
        if (decodedToken.exp < currentTime) {
          return { expired: true, message: 'Token has expired' };
        } else {
          return { expired: false, message: 'Token is still valid' };
        }
      } else {
        return { expired: true, message: 'Token has no expiration claim' };
      }
    } else {
      return { expired: true, message: 'No token found' };
    }
  }

  async tryRefreshToken(): Promise<boolean>{
    console.log("No token refresh logic present as of now");
    return false;
  }
}
