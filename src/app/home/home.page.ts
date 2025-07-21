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

    // Add user message to chat
    this.addMessage(this.complaintText, true);
    this.currentComplaint = this.complaintText;
    this.shouldScrollToBottom = true;

    // If there's already a complaint ID, update the existing complaint (edit mode)
    if (this.currentComplaintId) {
      this.isPulsing = true;
      this.homeService.editComplaint(this.complaintText, this.currentComplaintId).subscribe({
        next: (response) => {
          console.log('Complaint updated successfully:', response);
          this.isSubmitted = true;
          this.shouldScrollToBottom = true;
        },
        error: (error) => {
          console.error('Error updating complaint:', error);
          this.addMessage('Sorry, there was an error processing your request. Please try again.', false);
        },
        complete: () => {
          this.isPulsing = false;
        }
      });
      return;
    }

    // Set loading state
    this.isPulsing = true;
    const isInitial = this.isInitialComplaint;
    
    // If this is the initial complaint, show the loading message
    if (isInitial) {
      this.addMessage('Generating your complaint...', false);
      this.shouldScrollToBottom = true;
    }

    this.homeService.submitComplaint(this.complaintText, "email").subscribe({
      next: (response) => {
        console.log('Complaint submitted successfully:', response);
        this.isSubmitted = true;
        this.currentComplaintId = response.service.complaintId;
        this.shouldScrollToBottom = true;
        
        // Remove the loading message and add the actual response
        if (isInitial) {
          this.messages = this.messages.filter(m => m.text !== 'Generating your complaint...');
          this.addMessage(response.service.complaint, false);
          this.isInitialComplaint = false; // Mark as not initial anymore
        } else {
          this.addMessage(response.service.complaint, false);
        }
      },
      error: (error) => {
        console.error('Error submitting complaint:', error);
        // Remove the loading message if it exists
        if (isInitial) {
          this.messages = this.messages.filter(m => m.text !== 'Generating your complaint...');
        }
        this.addMessage('Sorry, there was an error submitting your complaint. Please try again.', false);
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
    this.isPulsing = true;
    
    this.homeService.generateParaphraseWithComplaintId(this.currentComplaintId).subscribe({
      next: (response) => {
        console.log('Paraphrase generated successfully:', response);
        // Add the paraphrased response to the chat
        if (response.paraphrasedText) {
          this.addMessage(response.paraphrasedText, false);
        } else {
          this.addMessage('Here\'s a refined version of your complaint:\n\n' + this.currentComplaint, false);
        }
        this.shouldScrollToBottom = true;
        this.resetForm();
      },
      error: (error) => {
        console.error('Error generating paraphrase:', error);
        this.addMessage('Sorry, there was an error generating a paraphrase. Please try again.', false);
        this.shouldScrollToBottom = true;
      },
      complete: () => {
        this.isPulsing = false;
      }
    });
  }
  
  onContinueEditing() {
    if (!this.currentComplaintId) {
      console.error('No complaint ID available');
      return;
    }

    console.log('Editing complaint with ID:', this.currentComplaintId);
    this.homeService.editComplaint(this.complaintText, this.currentComplaintId).subscribe({
      next: (response) => {
        console.log('Complaint updated successfully:', response);
        // Switch back to edit mode, keep the same complaint ID
        this.isSubmitted = false;
        this.isSubmitEnabled = true;
        
        // Update the last user message with the edited text
        if (this.messages.length > 0) {
          const lastUserMessageIndex = this.messages.slice().reverse().findIndex(msg => msg.isUser);
          const adjustedIndex = lastUserMessageIndex === -1 ? -1 : this.messages.length - 1 - lastUserMessageIndex;
          if (adjustedIndex !== -1) {
            this.messages[adjustedIndex].text = this.complaintText;
          }
        }
        
        // Focus the input field after a short delay
        setTimeout(() => {
          if (this.complaintInput) {
            this.complaintInput.setFocus();
          }
        }, 100);
      },
      error: (error) => {
        console.error('Error updating complaint:', error);
        this.addMessage('Sorry, there was an error updating your complaint. Please try again.', false);
      }
    });
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
