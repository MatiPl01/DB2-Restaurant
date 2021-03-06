import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from "@angular/router";
import { AuthService } from "@auth/services/auth.service";
import { map, Observable } from "rxjs";
import { Injectable } from "@angular/core";
import { first } from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class AuthenticationGuard implements CanActivate {
  constructor(private authService: AuthService,
              private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.authService.userSubject.pipe(
      first(),
      map(user => {
        // Return true if the user is currently logged in
        if (user) return true;
        // Otherwise, if there is no user, redirect tp the authentication page
        return this.router.createUrlTree(['/auth']);
      }
    ));
  }
}
