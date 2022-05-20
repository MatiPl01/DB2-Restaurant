import { Injectable } from '@angular/core';
import { HttpService } from "@core/services/http.service";
import { BehaviorSubject, map, Observable, tap } from "rxjs";
import { ApiPathEnum } from "@shared/enums/api-path.enum";
import Dish from '@dishes/models/dish.model';
import { DishData } from "@dishes/interfaces/dish.interface";

@Injectable({
  providedIn: 'root'
})
export class DishService {
  private _dishes = new BehaviorSubject<Partial<Dish>[]>([]);
  private dishesCount: number = 0;
  private pagesCount: number = 0;

  constructor(private httpService: HttpService) {}

  get dishes(): Observable<Partial<Dish>[]> {
    if (!this._dishes.getValue().length) {
      return this.requestDishes();
    }
    return this._dishes;
  }

  public forceReload(): void {
    this._dishes.next([]);
  }

  private requestDishes(): Observable<Array<Partial<Dish>>> {
    // TODO - add fields limiting and filtering to the query
    return this.httpService.get<Partial<Dish>[]>(ApiPathEnum.DISHES).pipe(
      tap(res => {
        // TODO - remove ignores, add response data service
        // @ts-ignore
        this.dishesCount = res.filteredCount;
        // @ts-ignore
        this.pagesCount = res.pagesCount;
        // @ts-ignore
        this._dishes.next(res.dishes);
      }),
      map(res => {
        // @ts-ignore
        return res.dishes;
      })
    );
  }

  // createDish(dishData: DishData): Observable<DishData> {
  //   return this.httpService.post<DishData>(ApiPathEnum.DISHES, dishData);
  // }

  // updateDish(id: string, updatedFields: Partial<DishData>): Observable<DishData> {
  //   return this.httpService.patch<DishData>(`${ApiPathEnum.DISHES}/${id}`, updatedFields);
  // }

  // TODO - improve
  fetchDish(id: string, currency?: string, fields?: any): Observable<Dish> {
    const query = currency ? `?currency=${currency}` : '';
    return this.httpService
      .get<Partial<DishData>>(`${ApiPathEnum.DISHES}/${id}${query}`)
      .pipe(map((data: Partial<DishData>) => new Dish(data)));
  }

  // fetchDishes(page: number, limit: number, currency?: string): Observable<DishData[]> {
  //   return this.httpService.get<DishData[]>(ApiPathEnum.DISHES+'?page='+page+'&limit='+limit+'+&currency='+currency);
  // }

  // deleteDish(id: string): void {
  //   this.httpService.delete<void>(`${ApiPathEnum.DISHES}/${id}`);
  // }
}