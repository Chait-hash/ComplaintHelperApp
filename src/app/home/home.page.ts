import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonTextarea, IonContent, MenuController } from '@ionic/angular';
import { HomeService } from '../shared/services/home.service';
import { LogoutService } from '../shared/services/logout.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  @ViewChild('complaintInput', { static: false }) complaintInput!: IonTextarea;
  @ViewChild(IonContent, { static: false }) content!: IonContent;
  
  complaintText: string = '';
  isSubmitEnabled: boolean = false;
  isSubmitted: boolean = false;
  currentComplaint: string = '';
  currentComplaintId: string = '';
  isPulsing: boolean = false;
  minLength: number = 10;

  constructor(
    private readonly menu: MenuController,
    private readonly router: Router,
    private readonly logoutService: LogoutService,
    private readonly homeService: HomeService
  ) { }

  ngOnInit() {
    this.menu.enable(true, 'main-menu');
  }

  async logout() {
    await this.logoutService.logout();
  }

  onInputChange() {
    // Enable submit button only when there are at least 10 non-whitespace characters
    this.isSubmitEnabled = this.complaintText.trim().length >= this.minLength;
    
    // Auto-resize textarea
    if (this.complaintInput) {
      this.complaintInput.getInputElement().then((input: HTMLTextAreaElement) => {
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
      });
    }
  }
  
  onTextareaFocus() {
    // Handle focus event if needed
    // The green line is already removed via CSS
  }
  
  onTextareaBlur() {
    // Handle blur event if needed
  }

  submitComplaint() {
    if (this.complaintText.trim() === '') return;
    
    // Add pulse animation
    this.isPulsing = true;
    
    this.homeService.submitComplaint(this.complaintText, "email").subscribe({
      next: (response) => {
        console.log('Complaint submitted successfully:', response);
        this.isSubmitted = true;
        this.currentComplaint = this.complaintText;
        this.currentComplaintId = response.service.complaintId; // Store the complaint ID from the service object
        this.scrollToBottom();
      },
      error: (error) => {
        console.error('Error submitting complaint:', error);
        // Handle error (e.g., show error message)
      },
      complete: () => {
        this.isPulsing = false;
      }
    });
  }
  
  onAccept() {
    if (!this.currentComplaintId) {
      console.error('No complaint ID available');
      return;
    }

    console.log('Generating paraphrase for complaint ID:', this.currentComplaintId);
    this.homeService.generateParaphraseWithComplaintId(this.currentComplaintId).subscribe({
      next: (response) => {
        console.log('Paraphrase generated successfully:', response);
        // Reset the form after successful paraphrase generation
        this.resetForm();
      },
      error: (error) => {
        console.error('Error generating paraphrase:', error);
      }
    });
  }
  
  onContinueEditing() {
    if (!this.currentComplaintId) {
      console.error('No complaint ID available');
      return;
    }

    console.log('Editing complaint with ID:', this.currentComplaintId);
    this.homeService.editComplaint(this.currentComplaint, this.currentComplaintId).subscribe({
      next: (response) => {
        console.log('Complaint updated successfully:', response);
        this.isSubmitted = false;
        this.complaintText = this.currentComplaint;
        this.isSubmitEnabled = true;
        
        // Focus the input field after a short delay
        setTimeout(() => {
          if (this.complaintInput) {
            this.complaintInput.setFocus();
          }
        }, 100);
      },
      error: (error) => {
        console.error('Error updating complaint:', error);
      }
    });
  }
  
  private resetForm() {
    this.complaintText = '';
    this.currentComplaint = '';
    this.isSubmitted = false;
    this.isSubmitEnabled = false;
    this.isPulsing = false;
  }

  private scrollToBottom() {
    if (this.content) {
      this.content.scrollToBottom(300);
    }
  }
}
