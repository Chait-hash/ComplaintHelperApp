import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {

  constructor(
    private router: Router,
    private menu: MenuController
  ) { }

  ngOnInit() {
    this.menu.enable(true, 'main-menu');
  }

  async logout() {
    // Clear any stored authentication data
    // await this.storage.remove('auth_token');
    
    // Navigate to login page and clear navigation history
    this.router.navigate(['/login'], { 
      replaceUrl: true 
    });
  }
}
