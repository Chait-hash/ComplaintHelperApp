import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import * as cordovaSQLiteDriver from 'localforage-cordovasqlitedriver';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  static StorageInit: boolean = false;
  constructor(private storage: Storage) {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // You can perform additional initialization here if needed
      // if (Capacitor.isNativePlatform()) {
      await this.storage.create()

      console.log(this.storage.driver);
      console.log(this.storage);
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  async  ready(): Promise<Storage> {
    if (!StorageService.StorageInit) {
      if (Capacitor.isNativePlatform()) {

        await this.storage.defineDriver(cordovaSQLiteDriver);

      }
      this.storage = await this.storage.create();
      StorageService.StorageInit = true;
    }

    return this.storage;
  }

  async setItem(key: string, value: any): Promise<void> {
    await this.ready();
    try {
      await this.storage.set(key, value);
    } catch (error) {
      console.error(`Error setting item "${key}" in storage:`, error);
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    await this.ready();
    try {
      const item = await this.storage.get(key);
      return item !== null ? (item as T) : null;
    } catch (error) {
      console.error(`Error getting item "${key}" from storage:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    await this.ready();
    try {
      await this.storage.remove(key);
      console.log("removed from cache");
    } catch (error) {
      console.error(`Error removing item "${key}" from storage:`, error);
    }
  }

  async clearStorage() {
    try {
      await this.storage.clear();
      console.log('Storage cleared successfully');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
}
