import { Component, OnInit, ViewChild, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import { IonTextarea, IonContent, MenuController } from '@ionic/angular';
import { HomeService } from '../shared/services/home.service';
import { LogoutService } from '../shared/services/logout.service';

interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, AfterViewChecked {
  @ViewChild('complaintInput', { static: false }) complaintInput!: IonTextarea;
  @ViewChild(IonContent, { static: false }) content!: IonContent;
  
  complaintText: string = '';
  isSubmitEnabled: boolean = false;
  isSubmitted: boolean = false;
  currentComplaint: string = '';
  currentComplaintId: string = '';
  isPulsing: boolean = false;
  minLength: number = 10;
  messages: ChatMessage[] = [];
  private shouldScrollToBottom = true;
  isInitialComplaint = true; // Track if it's the first complaint

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

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  submitComplaint() {
    if (this.complaintText.trim() === '') return;

    // Store the complaint text but don't add to chat yet
    this.currentComplaint = this.complaintText;
    this.isPulsing = true;

    // If there's already a complaint ID, update the existing complaint (edit mode)
    if (this.currentComplaintId) {
      this.homeService.editComplaint(this.complaintText, this.currentComplaintId).subscribe({
        next: (response) => {
          console.log('Complaint updated successfully:', response);
          this.isSubmitted = true; // Show accept/reject buttons
        },
        error: (error) => {
          console.error('Error updating complaint:', error);
          this.addMessage('Sorry, there was an error updating your complaint. Please try again.', false);
          this.resetForm();
        },
        complete: () => {
          this.isPulsing = false;
        }
      });
      return;
    }

    // For new complaints, create a new one
    this.homeService.submitComplaint(this.complaintText, "email").subscribe({
      next: (response) => {
        console.log('Complaint created successfully:', response);
        this.currentComplaintId = response.service.complaintId;
        this.isSubmitted = true; // Show accept/reject buttons
      },
      error: (error) => {
        console.error('Error creating complaint:', error);
        this.addMessage('Sorry, there was an error creating your complaint. Please try again.', false);
        this.resetForm();
      },
      complete: () => {
        this.isPulsing = false;
      }
    });
  }
  
  onAccept() {
    if (!this.currentComplaintId || !this.currentComplaint) {
      console.error('No complaint ID or text available');
      return;
    }
    
    // Add user's message to chat
    this.addMessage(this.currentComplaint, true);
    this.shouldScrollToBottom = true;
    
    // Clear the textbox and hide submit button
    this.complaintText = '';
    this.isSubmitEnabled = false;
    this.isPulsing = true;
    this.isSubmitted = false; // Reset to show green button again
    
    console.log('Generating paraphrase for complaint ID:', this.currentComplaintId);
    
    // Generate the paraphrase for the accepted complaint
    this.homeService.generateParaphraseWithComplaintId(this.currentComplaintId).subscribe({
      next: (response) => {
        console.log('Paraphrase generated successfully:', response);
        // Add the paraphrased response to chat
        if (response.paraphrasedText) {
          this.addMessage(response.paraphrasedText, false);
        } else if (response.complaint?.originalText) {
          this.addMessage(response.complaint.originalText, false);
        } else {
          this.addMessage('Here\'s a refined version of your complaint:\n\n' + this.currentComplaint, false);
        }
        this.shouldScrollToBottom = true;
        
        // Reset for next complaint
        this.resetForm();
      },
      error: (error) => {
        console.error('Error generating paraphrase:', error);
        this.addMessage('Sorry, there was an error generating the paraphrase. Please try again.', false);
        this.resetForm();
      },
      complete: () => {
        this.isPulsing = false;
      }
    });
  }
  
  onContinueEditing() {
    // Just hide the accept/reject buttons and keep the text in the input
    this.isSubmitted = false;
    
    // Focus the input field after a short delay
    setTimeout(() => {
      if (this.complaintInput) {
        this.complaintInput.setFocus();
      }
    }, 100);
  }
  
  private addMessage(text: string, isUser: boolean) {
    this.messages.push({
      text: text.trim(),
      isUser,
      timestamp: new Date()
    });
    this.shouldScrollToBottom = true;
  }

  private resetForm() {
    this.complaintText = '';
    this.currentComplaint = '';
    this.currentComplaintId = '';
    this.isSubmitted = false;
    this.isSubmitEnabled = false;
    this.isPulsing = false;
  }
  
  get hasMessages(): boolean {
    return this.messages.length > 0;
  }

  private scrollToBottom() {
    if (this.content) {
      this.content.scrollToBottom(300).then(() => {
        this.shouldScrollToBottom = false;
      });
    }
  }
}
