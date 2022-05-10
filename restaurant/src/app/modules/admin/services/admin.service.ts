import { HttpService } from "@core/services/http.service";
import { ApiPathEnum } from "@shared/enums/api-path.enum";
import { Injectable } from '@angular/core'
import { Observable } from "rxjs";
import { Config } from "@shared/interfaces/config.interface";
import UserData from "@auth/interfaces/user.interface";

@Injectable()
export class AdminService {
  constructor(private httpService: HttpService) {}

  updateConfig(updatedFields: Partial<Config>): Observable<Config> {
    return this.httpService.patch<Config>(ApiPathEnum.CONFIG, updatedFields);
  }

  updateUser(updatedFields: Partial<UserData>,id:String): Observable<UserData> {
    return this.httpService.patch<UserData>(ApiPathEnum.USERS+'/'+id+'/',updatedFields);
  }

  getAllUsers(page:number,limit:number):Observable<UserData[]>{
    return this.httpService.get<UserData[]>(ApiPathEnum.ALLUSERS+'?fields=nickName,banned,roles&page='+page+'&limit='+limit)
  }
}
