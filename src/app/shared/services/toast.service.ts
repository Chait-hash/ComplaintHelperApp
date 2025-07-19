import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  constructor(private readonly toastController: ToastController) { }

  async presentToast(t_message: string, t_duration?: number, t_color?: string) {
    const toast = await this.toastController.create({
      message: t_message,
      duration: t_duration ?? 3000,
      color: t_color ?? 'danger',
      position: 'bottom',
    });
    toast.present();
  }
}
