import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { NgForm } from '@angular/forms';
import { LogoutService } from '../shared/services/logout.service';
import { HomeService } from '../shared/services/home.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  @ViewChild('complaintInput') complaintInput!: ElementRef;
  
  complaintText: string = '';
  isSubmitEnabled: boolean = false;
  minLength: number = 10;

  constructor(
    private readonly router: Router,
    private readonly menu: MenuController,
    private readonly logoutService : LogoutService,
    private readonly homeService : HomeService
  ) { }

  ngOnInit() {
    this.menu.enable(true, 'main-menu');
  }

  async logout() {
    await this.logoutService.logout();
  }

  onInputChange() {
    this.isSubmitEnabled = this.complaintText.length >= this.minLength;
  }

  onEnterPressed() {
    if (this.isSubmitEnabled) {
      this.submitComplaint();
    }
  }

  submitComplaint() {
    if (this.isSubmitEnabled) {
      console.log('Submitting complaint:', this.complaintText);
      this.complaintText = '';
      this.isSubmitEnabled = false;
    }
  }
}
