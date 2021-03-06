import { ActivatedRoute, Router } from "@angular/router";
import { Component, OnDestroy } from '@angular/core';
import { AuthHelperService } from "@auth/services/auth-helper.service";
import { Subscription } from "rxjs";
import { AuthResponse } from "@auth/types/auth-response.type";

@Component({
  selector: 'auth-view',
  templateUrl: './auth-view.component.html'
})
export class AuthViewComponent implements OnDestroy {
  private readonly subscription: Subscription;
  public errorMsg: string = '';
  public isLoading: boolean = false;

  constructor(private authHelperService: AuthHelperService,
              private route: ActivatedRoute,
              private router: Router) {
    this.subscription = this.authHelperService.authEvent.subscribe(this.handleAuthEvent.bind(this));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // private redirect(target: string): void {
  //   this.router.navigate(
  //     [target],
  //     { relativeTo: this.route }
  //   );
  // }

  private handleAuthEvent() { // TODO
    // // No response - user started logging in
    // if (!res) {
    //   this.isLoading = res === null;
    //   return;
    // }
    //
    // if (res.status === ResponseStatus.SUCCESS) {
    //   // TODO - redirect to the previous page instead of the home page
    //
    // } else {
    //   this.errorMsg = res.message!.replace(/\n/, '<br>') || '';
    // }
  }
}
