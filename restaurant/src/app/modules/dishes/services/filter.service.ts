import { Injectable, EventEmitter, OnDestroy } from "@angular/core";
import { CurrencyService } from "@core/services/currency.service";
import { HttpService } from "@core/services/http.service";
import { FilterAttr } from "@dishes/enums/filter-attr.enum";
import { DishFilters } from "@dishes/interfaces/dish-filters.interface";
import { DishFiltersResponse } from "@dishes/types/dish-filters-response.type";
import { ApiPathEnum } from "@shared/enums/api-path.enum";
import { BehaviorSubject, filter, map, Observable, Subscription, timer } from "rxjs";
import setUtils from "@shared/utils/set-utils";
import * as queryString from "query-string";
import { NavigationEnd, NavigationStart, Router } from "@angular/router";

// TODO - maybe move this somewhere else
class FiltersObject implements DishFilters {
  public readonly category = new Set<string>();
  public readonly cuisine = new Set<string>();

  public readonly unitPrice = {
    min: 0,
    max: Infinity
  };

  public readonly ratingsAverage = {
    min: 0,
    max: Infinity
  };

  constructor(data?: DishFiltersResponse | DishFilters) {
    if (!data) return;
    this.category = new Set(data.category);
    this.cuisine = new Set(data.cuisine);
    this.unitPrice = { ...data.unitPrice };
    this.ratingsAverage = { ...data.ratingsAverage };
  }

  get queryObj(): { [key: string]: string | number } {
    const obj: { [key: string]: string | number } = {};
    Object.values(FilterAttr).forEach(filterAttr => this.addQuery(filterAttr, obj));
    return obj;
  }

  private addQuery(filterAttr: FilterAttr, obj: { [key: string]: string | number }): void {
    if (this[filterAttr] instanceof Set) {
      const set = this[filterAttr] as Set<string>;
      if (set.size) {
        obj[filterAttr] = [...set].join(',');
      }
    } else {
      const range = this[filterAttr] as { min: number, max: number };
      if (range.min > 0) obj[`${filterAttr}[gte]`] = range.min;
      if (range.max < Infinity) obj[`${filterAttr}[lte]`] = range.max;
    }
  }

  public clone(): FiltersObject {
    return new FiltersObject(this);
  }
}


@Injectable()
export class FilterService implements OnDestroy {
  private static readonly RESET_WHEN_LEAVING_URL = '/dishes';

  private static readonly APPLY_FILTERS_TIMEOUT = 500; // 500ms
  private static readonly AVAILABLE_FILTERS_REFRESH_INTERVAL = 30000; // 30s
  public filtersChangedEvent = new EventEmitter<DishFilters>();

  // Selected filters will be used to update filters without notifying changes
  // (the behavior subject will be updated, only after the notifyChanges attribute is set to true)
  private selectedFilters = new FiltersObject();
  private appliedFilters$ = new BehaviorSubject<DishFilters>(new FiltersObject());
  private availableFilters$ = new BehaviorSubject<DishFilters>(new FiltersObject());
  private refreshTimer$!: Observable<number>;
  private applyFiltersTimeout: any;

  private refreshTimerSubscription!: Subscription;
  private readonly subscriptions: Subscription[] = [];

  constructor(private httpService: HttpService,
              private currencyService: CurrencyService,
              private router: Router) {
    this.setupRefreshTimer();

    this.subscriptions.push(
      // Reset filters when user leaves /dishes route
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        // @ts-ignore
        .subscribe((event: NavigationStart) => {
          if (!event.url.startsWith(FilterService.RESET_WHEN_LEAVING_URL)) {
            this.resetFilters();
          }
        })
    );
  }

  ngOnDestroy(): void {
    this.refreshTimerSubscription.unsubscribe();
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  get availableFiltersSubject(): BehaviorSubject<DishFilters> {
    return this.availableFilters$;
  }

  get availableFilters(): DishFilters {
    return this.availableFilters$.getValue();
  }

  get appliedFiltersSubject(): BehaviorSubject<DishFilters> {
    return this.appliedFilters$;
  }

  get appliedFilters(): DishFilters {
    return this.appliedFilters$.getValue();
  }

  public addFilter(filterAttr: FilterAttr, filterValue: string): void {
    (this.selectedFilters[filterAttr] as Set<string>).add(filterValue);
    this.setApplyFiltersTimeout();
  }

  public setAllFilters(filterAttr: FilterAttr, filterValues: string[]): void {
    (this.selectedFilters[filterAttr] as Set<string>) = new Set(filterValues);
    this.setApplyFiltersTimeout();
  }

  public removeFilter(filterAttr: FilterAttr, filterValue: string): void {
    (this.selectedFilters[filterAttr] as Set<string>).delete(filterValue);
    this.setApplyFiltersTimeout();
  }

  public removeAllFilters(filterAttr: FilterAttr): void {
    (this.selectedFilters[filterAttr] as Set<string>).clear();
    this.setApplyFiltersTimeout();
  }

  public setRangeFilter(filterAttr: FilterAttr, minValue: number, maxValue: number): void {
    (this.selectedFilters[filterAttr] as { min: number, max: number }) = {
      min: minValue,
      max: maxValue
    };
    this.setApplyFiltersTimeout();
  }

  public applyFilters(): void {
    this.clearApplyFiltersTimeout();
    this.appliedFilters$.next(this.selectedFilters.clone());
  }

  public resetFilters(): void {
    this.clearApplyFiltersTimeout();
    const emptyFiltersObj = new FiltersObject();
    if (this.areFiltersDifferent(this.appliedFilters, emptyFiltersObj)) {
      this.appliedFilters$.next(new FiltersObject());
    }
  }

  private setupRefreshTimer(): void {
    this.refreshTimer$ = timer(0, FilterService.AVAILABLE_FILTERS_REFRESH_INTERVAL);

    this.refreshTimerSubscription = this.refreshTimer$.subscribe(_ => {
      this.fetchAvailableFilters();
    })
  }

  private fetchAvailableFilters() {
    if (!this.currencyService.currency) {
      throw new Error('Cannot get the current currency');
    }

    const url = queryString.stringifyUrl({
      url: `${ApiPathEnum.DISHES}/filters`,
      query: {
        fields: Object.values(FilterAttr),
        currency: this.currencyService.currency.code
      }
    }, {
      arrayFormat: 'comma'
    })

    return this.httpService
      .get<DishFilters>(url)
      .pipe(map((data: DishFilters) => new FiltersObject(data)))
      .subscribe({
        next: filtersObj => {
          // Check if filters have changes since the last update
          if (!this.haveAvailableFiltersChanged(filtersObj)) return;
          this.availableFilters$.next(filtersObj);
        },
        error: _ => {
          // Unsubscribe on error
          this.refreshTimerSubscription.unsubscribe();
        }
      });
  }

  private haveAvailableFiltersChanged(newAvailableFilters: DishFilters): boolean {
    return this.areFiltersDifferent(this.availableFilters, newAvailableFilters);
  }

  private areFiltersDifferent(filterObj1: DishFilters, filterObj2: DishFilters): boolean {
    return setUtils.areDifferent(filterObj1.category, filterObj2.category)
        || setUtils.areDifferent(filterObj1.cuisine, filterObj2.cuisine)
        || filterObj1.ratingsAverage.min !== filterObj2.ratingsAverage.min
        || filterObj1.ratingsAverage.max !== filterObj2.ratingsAverage.max
        || filterObj1.unitPrice.min !== filterObj2.unitPrice.min
        || filterObj1.unitPrice.max !== filterObj2.unitPrice.max;
  }

  private setApplyFiltersTimeout(): void {
    this.clearApplyFiltersTimeout();

    this.applyFiltersTimeout = setTimeout(
      this.applyFilters.bind(this), 
      FilterService.APPLY_FILTERS_TIMEOUT
    );
  }

  private clearApplyFiltersTimeout(): void {
    if (this.applyFiltersTimeout) {
      clearTimeout(this.applyFiltersTimeout);
    }

    this.applyFiltersTimeout = null;
  }
}
