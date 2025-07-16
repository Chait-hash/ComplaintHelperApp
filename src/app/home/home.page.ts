import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { NgForm } from '@angular/forms';

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
      // Here you can add your API call or other logic to handle the complaint
      // For now, we'll just clear the input
      this.complaintText = '';
      this.isSubmitEnabled = false;
    }
  }
}
