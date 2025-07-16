import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
  Output,
  EventEmitter,
} from '@angular/core';
// import { SavePassword } from 'capacitor-ios-autofill-save-password';
import { NavigationExtras, Router } from '@angular/router';
import axios from 'axios';
import { ModalController } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { TokenService } from '../shared/services/token.service';
import { jwtDecode } from 'jwt-decode';

import { ToastService } from '../shared/services/toast.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import pkceChallenge from 'pkce-challenge';
import { TokenRequestBody } from '../model/library.model';
import { StorageService } from '../shared/services/storage.service';

import { generateRandomState, toFormUrlEncoded } from '../shared/helper/helper';
import { LoginService } from '../shared/services/login.service';
import { ModalForgotPasswordComponent } from '../shared/components/modal-forgot-password/modal-forgot-password.component';
import { ModalResetPasswordComponent } from '../shared/components/modal-reset-password/modal-reset-password.component';
import { SwipegestureService } from '../shared/services/swipegesture.service';
import { UserVerificationPage } from '../user-verification/user-verification.page';
import { SocialService } from '../shared/services/social.service';
import { DataService } from '../shared/services/data-share.service';
import { Subscription } from 'rxjs';
import { EventService } from '../shared/services/event.service';
import { LoadingService } from '../shared/helper/loader';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';


@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit, OnDestroy {
  selectedOption: any = 'email';
  loginForm!: FormGroup;
  userNumber: string = '';
  areCredentialsWrong: boolean = false;
  code!: string | null;
  code_challenge!: any;
  code_verifier!: any;
  kc_idp_hint!: string | null;
  selectedDialCode: any = '+31';
  dataSubscription: any;
  @Output() passwordChange = new EventEmitter();
  isPasswordVisible: boolean = false;
  refreshSubscriptionEverything!: Subscription;
  refreshForLogout!: Subscription;
  sharedData: any;
  isModalOpening!: boolean;

  @ViewChild('webView', { static: true }) webView!: ElementRef;
  savePasswordFlag: boolean = false;

  constructor(
    private readonly router: Router,
    private readonly tokenService: TokenService,
    private readonly ts: ToastService,
    private readonly storageService: StorageService,
    private readonly loginService: LoginService,
    private readonly modalController: ModalController,
    private readonly swipeGestureService: SwipegestureService,
    private readonly fb: FormBuilder,
    private readonly dataService: DataService,
    private readonly eventService: EventService,
    private readonly spinner: LoadingService
  ) {
    console.log('Before generate challenge');
  }

  ngOnDestroy() {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    if (this.refreshSubscriptionEverything) {
      this.refreshSubscriptionEverything.unsubscribe();
    }
  }

  ngOnInit() {
    this.isModalOpening = false;
    this.checkForSpinner();
    this.initializeComponent();

    this.loginForm = this.fb.group({
      userEmail: ['', [Validators.required, Validators.email]],
      userPassword: [
        '',
        [
          Validators.required,
          Validators.pattern(
            /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*\\/])(?=.{8,})/
          ),
          Validators.minLength(8),
        ],
      ],
      contactMethod: ['email'],
      userNumber: [
        '',
        [
          Validators.required,
          Validators.pattern(
            /^\+?(\d{1,4})?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{6,14}$/
          ),
        ],
      ],
    });

    this.onOptionChange();
  }

  async loadCodeChallenge() {
    this.code_challenge = await this.storageService.getItem<string>(
      'code_challenge'
    );
    this.code_verifier = await this.storageService.getItem<string>(
      'code_verifier'
    );
    this.code_challenge = '47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU';
    this.code_verifier = 'ccAwRUguYiUvLdzggS9nao6XZ1AFoLFVxui-csaKV6o';
    if (!this.code_challenge || !this.code_verifier) {
      await this.generateChallenge();
    }
  }

  async checkForSpinner() {
    const isSpinnerActive: boolean = await this.spinner.isSpinnerActive();
    if (isSpinnerActive) {
      this.spinner.dismiss(); // Dismiss the spinner if active on login page
    }
  }

  async generateChallengeAndLogin() {
    try {
      await this.loadCodeChallenge();
      console.log('calling from login');
    } catch (error) {
      console.error('Error generating challenge:', error);
    }
  }

  async generateChallenge() {
    console.log('not there');
    const challenge = await pkceChallenge(128);
    this.code_challenge = challenge.code_challenge;
    this.code_verifier = challenge.code_verifier;
    await this.storageService.setItem('code_challenge', this.code_challenge);
    await this.storageService.setItem('code_verifier', this.code_verifier);
    return challenge;
  }
  ionViewWillEnter() {
    this.swipeGestureService.disableSwipeGesture();
    const button = document.querySelector('.segmentLabel');
    button?.classList.add('active');
  }

  ionViewWillLeave() {
    this.swipeGestureService.enableSwipeGesture();
    const buttons = document.querySelectorAll('.segmentLabel');
    buttons.forEach((button) => {
      const segmentButton = button as HTMLIonSegmentButtonElement;
      segmentButton.classList.remove('active');
    });
  }

  handleFieldClick(buttonValue: string) {
    console.log(`${buttonValue} clicked`);

    const buttons = document.querySelectorAll('.segmentLabel');
    buttons.forEach((button) => {
      const segmentButton = button as HTMLIonSegmentButtonElement;
      if (segmentButton.value === buttonValue) {
        segmentButton.classList.add('active');
      } else {
        segmentButton.classList.remove('active');
      }
    });
  }
  async handleSocialLogin(kcIdpHint: string) {
    const state = generateRandomState(36);
    const keycloakIdpUrl = environment.keycloakIdpUrl;
    const clientId = environment.clientId;
    const keycloakAuthUrl = `${keycloakIdpUrl}?client_id=${clientId}&redirect_uri=${environment.redirect_uri}&state=${state}&response_mode=fragment&response_type=code&scope=openid&kc_idp_hint=${kcIdpHint}&nonce=2d7a33fe-6fd3-42d7-8026-94521453f323&code_challenge=jRgLUiP8xENGkbHKMXnrtPI9hh9Pt8-6AhG1_VPubvM&code_challenge_method=S256`;
    // window.location.href = keycloakAuthUrl;
    await Browser.open({ url: keycloakAuthUrl });
    console.log("Reaching here");
    
  }

  async onSubmit() {
    if (!this.loginForm.valid || this.isModalOpening) return;

    this.isModalOpening = true;

    try {
      if (this.selectedOption === 'phone') {
        await this.handlePhoneLogin();
      } else if (this.selectedOption === 'email') {
        console.log("Also this triggered");
        await this.handleEmailLogin();
      }
    } catch (error: any) {
      this.handleError(error);
    } finally {
      this.isModalOpening = false;
    }
  }

  private async handlePhoneLogin() {
    await this.fetchAccessToken();
    this.loginForm.value.userEmail = '';
    this.loginForm.value.userPassword = '';

    const payload = {
      phoneNumber: this.selectedDialCode + this.loginForm.value.userNumber,
    };

    const responseData = await this.loginService
      .generateLoginOtp(payload)
      .toPromise();
    console.log(responseData);

    const navigationExtras = {
      email: '',
      phoneNumber: this.selectedDialCode + this.loginForm.value.userNumber,
      token: environment.token,
      flag: 'phone-login',
    };

    console.log('User Number:', this.loginForm.value.userNumber);
    console.log('Dial Code:', this.selectedDialCode);
    console.log('Phone login payload', navigationExtras);

    this.openUserVerificationModal(navigationExtras);
  }

  private async handleEmailLogin() {
    this.loginForm.value.userNumber = '';

    const keycloakCredentials = {
      client_id: environment.clientId,
      grant_type: 'password',
      username: this.loginForm.value.userEmail,
      password: this.loginForm.value.userPassword,
      client_secret: environment.clientSecretStaging,
    };

    const keycloakUrl = environment.keycloakUrlStaging;
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    console.log(keycloakCredentials, keycloakUrl, headers);

    const response = await axios.post(
      keycloakUrl,
      toFormUrlEncoded(keycloakCredentials),
      { headers }
    );

    this.saveAutofillPassword();

    // Delay navigation just slightly to let iOS show the save prompt
    setTimeout(() => {
      this.handleEmailLoginSuccess(response.data, keycloakCredentials);
    }, 100);
  }

  private async handleEmailLoginSuccess(data: any, keycloakCredentials: {}) {
    this.areCredentialsWrong = false;
    console.log('Authentication successful', data);
    console.log('Entering here');
    this.ts.presentToast('Authentication successful', 2000, 'success');

    const token = data.access_token;
    this.storageService.setItem('session_state', data.session_state);
    this.tokenService.setToken(token);
    const decodedToken = jwtDecode<{ sub: string }>(token);

    if (decodedToken.sub) {
      this.tokenService.setDecodedTokenToStorage(decodedToken.sub);
    } else {
      console.error('Decoded token sub is undefined');
    }

    await this.storageService.removeItem('user_has_logged_out');

    this.eventService.triggerRefreshSubscription();
    const navigationExtras: NavigationExtras = {
      state: {
        email: this.loginForm.value.userEmail,
        phoneNumber: '',
        token: '',
        flag: 'email-login',
      },
    };

    this.router.navigate(['/login', { skipLocationChange: true }]);
    this.router.navigate(['/everything'], navigationExtras);
  }

  async saveAutofillPassword() {
    if (Capacitor.getPlatform() === 'ios') {
      // SavePassword.promptDialog({
      //   username: this.loginForm.value.userEmail,
      //   password: this.loginForm.value.userPassword,
      // })
      //   .then(() => console.log('promptDialog success'))
      //   .catch((err: any) => console.error('promptDialog failure', err));
    }
  }

  private handleError(error: any) {
    console.error('Error', error);
    this.ts.presentToast('Authentication failed', 2000);

    if (this.selectedOption === 'phone' && error.status === 400) {
      this.ts.presentToast(error.error.message, 2000);
    }

    if (error.response && error.response.status === 401) {
      this.areCredentialsWrong = true;
    } else {
      this.areCredentialsWrong = false;
    }
  }

  goToRegisterPage() {
    this.router.navigate(['/registration']);
  }

  async goToForgotPasswordPage() {
    const modal = await this.modalController.create({
      component: ModalForgotPasswordComponent,
      cssClass: 'forgot-modal',
      handle: false,
    });
    modal.present();
  }

  async openResetPasswordModal() {
    const modal = await this.modalController.create({
      component: ModalResetPasswordComponent,
      cssClass: 'reset-modal',
      handle: false,
    });

    modal.present();
  }

  onCountrySelected(country: any) {
    console.log('Selected country:', country);
    this.selectedDialCode = country.dial_code;
  }

  onOptionChange() {
    this.selectedOption = this.loginForm.get('contactMethod')?.value;
    console.log(this.selectedOption);

    if (this.selectedOption === 'email') {
      this.loginForm
        .get('userEmail')
        ?.setValidators([Validators.required, Validators.email]);
      this.loginForm
        .get('userPassword')
        ?.setValidators([Validators.required, Validators.minLength(8)]);
      this.loginForm.get('userNumber')?.clearValidators();
    } else if (this.selectedOption === 'phone') {
      this.loginForm
        .get('userNumber')
        ?.setValidators([
          Validators.required,
          Validators.pattern(
            /^\+?(\d{1,4})?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{6,14}$/
          ),
        ]);
      this.loginForm.get('userEmail')?.clearValidators();
      this.loginForm.get('userPassword')?.clearValidators();
    }

    this.loginForm.get('userEmail')?.updateValueAndValidity();
    this.loginForm.get('userPassword')?.updateValueAndValidity();
    this.loginForm.get('userNumber')?.updateValueAndValidity();
  }

  isInvalid(controlName: string): boolean {
    const control = this.loginForm.get(controlName);
    return control
      ? control.invalid && (control.dirty || control.touched)
      : false;
  }

  isValid(controlName: string): boolean {
    const control = this.loginForm.get(controlName);
    return control
      ? control.valid && (control.dirty || control.touched)
      : false;
  }

  togglePasswordVisibility() {
    const passwordField = document.querySelector(
      '[formControlName="userPassword"]'
    ) as HTMLInputElement;
    if (passwordField) {
      passwordField.type = this.isPasswordVisible ? 'text' : 'password';
    }
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  onPasswordChange() {
    this.passwordChange.emit(this.loginForm.value.userPassword);
  }

  async openUserVerificationModal(navigationExtras: any) {
    const modal = await this.modalController.create({
      component: UserVerificationPage,
      componentProps: navigationExtras,
    });
    return await modal.present();
  }

  async fetchAccessToken(): Promise<string | null> {
    const payload = {
      client_id: environment.clientId,
      grant_type: 'client_credentials',
      client_secret: environment.clientSecretStaging,
    };
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    try {
      const response = await axios.post(
        environment.keycloakUrlStaging,
        this.toFormUrlEncoded(payload),
        { headers }
      );
      environment.token = response.data.access_token;
      console.log(environment.token);
      return environment.token;
    } catch (error) {
      console.error('Error fetching access token', error);
      return null;
    }
  }

  private toFormUrlEncoded(obj: any): string {
    const formBody: string[] = [];
    for (const property in obj) {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(obj[property]);
      formBody.push(encodedKey + '=' + encodedValue);
    }
    return formBody.join('&');
  }

  private async initializeComponent() {
    const isTokenAvailable = await this.tokenService.isTokenPresent();

    this.dataSubscription = this.dataService
    .getDataObservable()
    .subscribe((data) => {
      if (
        data?.sharedData &&
        !isTokenAvailable &&
        data.sharedData.socialLogin === true
      ) {
        this.processAuthentication(data.sharedData);
      }
      });
  }

  processAuthentication(sharedData: any) {
    this.sharedData = sharedData;
    console.log('Shared Data:', this.sharedData);

    if (this.sharedData?.code) {
      console.log('Calling with code:', this.sharedData.code);

      const requestBody: TokenRequestBody = {
        client_id: environment.clientId,
        client_secret: environment.clientSecretStaging,
        grant_type: 'authorization_code',
        redirect_uri: environment.redirect_uri,
        code: this.sharedData.code,
        code_verifier: 'ej3erSbihGTaU7LTGekmauxy1GOjPjnQHQqZlroeQ30',
      };

      const keycloakUrl = environment.keycloakUrlStaging;
      console.log(requestBody);
      console.log('Code verifier', requestBody.code_verifier);

      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      axios
        .post(keycloakUrl, requestBody, { headers })
        .then(async (response) => {
          console.log('Authentication successful', response.data);
          this.ts.presentToast('Authentication successful', 2000, 'success');

          const token = response.data.access_token;
          this.tokenService.setToken(token);
          const session_state = response.data.session_state;
          this.storageService.setItem('session_state', session_state);

          const decodedToken = jwtDecode<{ sub: string }>(
            response.data.access_token
          );
          await this.storageService.removeItem('user_has_logged_out');
          if (decodedToken?.sub) {
            this.tokenService.setDecodedTokenToStorage(decodedToken.sub);
          } else {
            console.error('Decoded token sub is undefined');
          }
          await this.storageService.removeItem('user_has_logged_out');

          this.eventService.triggerRefreshSubscription();
          this.router.navigate(['/everything']);
        })
        .catch((error) => {
          console.error('Authentication failed', error);
          this.ts.presentToast('Authentication failed', 2000);
        });
    } else {
      console.log('Code not found');
    }
  }
}
