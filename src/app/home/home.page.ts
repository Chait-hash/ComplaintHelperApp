import { Component, OnInit, ViewChild, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import { IonTextarea, IonContent, MenuController } from '@ionic/angular';
import { HomeService } from '../shared/services/home.service';
import { LogoutService } from '../shared/services/logout.service';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isParaphrase?: boolean;
  paraphraseId?: string;
}

@Component({
  selector: "app-home",
  templateUrl: "./home.page.html",
  styleUrls: ["./home.page.scss"],
})
export class HomePage implements OnInit, AfterViewChecked {
  @ViewChild("complaintInput", { static: false }) complaintInput!: IonTextarea;
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  complaintText: string = "";
  isSubmitEnabled: boolean = false;
  isSubmitted: boolean = false;
  currentComplaint: string = "";
  currentComplaintId: string = "";
  isPulsing: boolean = false;
  minLength: number = 10;
  messages: ChatMessage[] = [];
  private shouldScrollToBottom = true;
  isInitialComplaint = true; // Track if it's the first complaint
  paraPhraseId! : string;

  constructor(
    private readonly menu: MenuController,
    private readonly router: Router,
    private readonly logoutService: LogoutService,
    private readonly homeService: HomeService
  ) {}

  ngOnInit() {
    this.menu.enable(true, "main-menu");
  }

  async logout() {
    await this.logoutService.logout();
  }

  onInputChange() {
    // Enable submit button only when there are at least 10 non-whitespace characters
    this.isSubmitEnabled = this.complaintText.trim().length >= this.minLength;

    // Auto-resize textarea
    if (this.complaintInput) {
      this.complaintInput
        .getInputElement()
        .then((input: HTMLTextAreaElement) => {
          input.style.height = "auto";
          input.style.height = input.scrollHeight + "px";
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
    if (this.complaintText.trim() === "") return;

    // Store the complaint text but don't add to chat yet
    this.currentComplaint = this.complaintText;
    this.isPulsing = true;

    // If there's already a complaint ID, update the existing complaint (edit mode)
    if (this.currentComplaintId) {
      this.homeService
        .editComplaint(this.complaintText, this.currentComplaintId)
        .subscribe({
          next: (response) => {
            console.log("Complaint updated successfully:", response);
            this.isSubmitted = true; // Show accept/reject buttons
          },
          error: (error) => {
            console.error("Error updating complaint:", error);
            this.addMessage(
              "Sorry, there was an error updating your complaint. Please try again.",
              false
            );
            this.resetForm(true); // Preserve complaint ID for accept/reject flow
          },
          complete: () => {
            this.isPulsing = false;
          },
        });
      return;
    }

    // For new complaints, create a new one
    this.homeService.submitComplaint(this.complaintText, "email").subscribe({
      next: (response) => {
        console.log("Complaint created successfully:", response);
        this.currentComplaintId = response.service.complaintId;
        this.isSubmitted = true; // Show accept/reject buttons
      },
      error: (error) => {
        console.error("Error creating complaint:", error);
        this.addMessage(
          "Sorry, there was an error creating your complaint. Please try again.",
          false
        );
        this.resetForm(true); // Preserve complaint ID for accept/reject flow
      },
      complete: () => {
        this.isPulsing = false;
      },
    });
  }

  onAccept() {
    console.log('onAccept called. currentComplaintId:', this.currentComplaintId, 'currentComplaint:', this.currentComplaint);
    
    if (!this.currentComplaintId || !this.currentComplaint) {
      console.error("No complaint ID or text available");
      return;
    }

    // Store the complaint ID before we potentially reset it
    const complaintId = this.currentComplaintId;
    console.log('Stored complaintId:', complaintId);
    
    // Add user's message to chat
    this.addMessage(this.currentComplaint, true);
    this.shouldScrollToBottom = true;

    // Clear the textbox and hide submit button
    this.complaintText = "";
    this.isSubmitEnabled = false;
    this.isPulsing = true;
    this.isSubmitted = false; // Reset to show green button again
    
    // Restore the complaint ID for the paraphrase generation
    this.currentComplaintId = complaintId;
    console.log('Restored currentComplaintId:', this.currentComplaintId);

    console.log(
      "Generating paraphrase for complaint ID:",
      this.currentComplaintId
    );

    // Generate the paraphrase for the accepted complaint
    this.homeService
      .generateParaphraseWithComplaintId(this.currentComplaintId)
      .subscribe({
        next: (response) => {
          console.log("Paraphrase generated successfully:", response);
          this.paraPhraseId = response.paraphraseId;
          // Add the paraphrased response to chat with isParaphrase flag and paraphraseId
          if (response.paraphrasedText) {
            this.addMessage(response.paraphrasedText, false, true, response.paraphraseId);
          } else if (response.complaint?.originalText) {
            this.addMessage(response.complaint.originalText, false, true, response.paraphraseId);
          } else {
            this.addMessage(
              "Here's a refined version of your complaint:\n\n" +
                this.currentComplaint,
              false,
              true,
              response.paraphraseId
            );
          }
          this.shouldScrollToBottom = true;

          // Reset for next complaint, but preserve complaint ID for accept/reject flow
          this.resetForm(true);
        },
        error: (error) => {
          console.error("Error generating paraphrase:", error);
          this.addMessage(
            "Sorry, there was an error generating the paraphrase. Please try again.",
            false
          );
          this.resetForm(true); // Preserve complaint ID for accept/reject flow
        },
        complete: () => {
          this.isPulsing = false;
        },
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

  private addMessage(
    text: string,
    isUser: boolean,
    isParaphrase: boolean = false,
    paraphraseId?: string
  ) {
    this.messages.push({
      id: Date.now().toString(),
      text: text.trim(),
      isUser,
      timestamp: new Date(),
      isParaphrase,
      ...(paraphraseId ? { paraphraseId } : {})
    });
    this.shouldScrollToBottom = true;
  }

  copyToClipboard(text: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Optional: Show a toast or notification that text was copied
        console.log("Text copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  }

  onAcceptResponse(messageId: string) {
    this.onRespondOfParaphraseText("accept", messageId);
  }

  onRejectResponse(messageId: string) {
    this.onRespondOfParaphraseText("reject", messageId);
  }

  onRespondOfParaphraseText(action: "accept" | "reject", messageId: string) {
    console.log('\n--- onRespondOfParaphraseText START ---');
    console.log('Action:', action, 'MessageId:', messageId);
    console.log('currentComplaintId:', this.currentComplaintId);
    console.log('All messages:', this.messages);
    
    // Find the paraphrased message in the chat
    const message = this.messages.find(
      (msg) => msg.id === messageId && msg.isParaphrase
    );
    
    console.log('Found message:', message);
    console.log('Message has paraphraseId:', message?.paraphraseId);
    
    if (!message) {
      console.error('Message not found in chat');
      return;
    }
    
    if (!message.paraphraseId) {
      console.error('No paraphraseId found on message');
      return;
    }
    
    if (!this.currentComplaintId) {
      console.error('No currentComplaintId found');
      console.log('Current component state:', {
        currentComplaintId: this.currentComplaintId,
        currentComplaint: this.currentComplaint,
        isSubmitted: this.isSubmitted,
        isPulsing: this.isPulsing
      });
      return;
    }
    
    console.log('All checks passed. Proceeding with API call...');
    console.log('--- onRespondOfParaphraseText CHECKS COMPLETE ---\n');
    this.homeService.acceptRejectComplaint(
      this.currentComplaintId,
      message.paraphraseId,
      action
    ).subscribe({
      next: (response) => {
        if (action === "accept") {
          // Optionally show a toast or update UI
          console.log("Paraphrase accepted");
        } else {
          // Remove the paraphrased message from chat
          this.messages = this.messages.filter((msg) => msg.id !== messageId);
          // Show loading message
          this.isPulsing = true;
          // Regenerate paraphrase
          this.homeService.generateParaphraseWithComplaintId(this.currentComplaintId).subscribe({
            next: (resp) => {
              this.isPulsing = false;
              // Add the new paraphrased response to chat
              const paraphrasedText = resp.paraphrasedText || resp.complaint?.originalText || "Refined complaint";
              this.addMessage(paraphrasedText, false, true, resp.paraphraseId);
            },
            error: (err) => {
              this.isPulsing = false;
              this.addMessage(
                "Sorry, there was an error generating the paraphrase. Please try again.",
                false
              );
            }
          });
        }
      },
      error: (error) => {
        this.addMessage(
          "Sorry, there was an error submitting your feedback. Please try again.",
          false
        );
      }
    });
  }

  private resetForm(preserveComplaintId = false) {
    console.log('resetForm called. currentComplaintId before reset:', this.currentComplaintId);
    this.complaintText = "";
    this.currentComplaint = "";
    
    // Only reset currentComplaintId if we're not preserving it
    if (!preserveComplaintId) {
      this.currentComplaintId = "";
    }
    
    this.isSubmitted = false;
    this.isSubmitEnabled = false;
    this.isPulsing = false;
    console.log('resetForm completed. currentComplaintId after reset:', this.currentComplaintId);
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
