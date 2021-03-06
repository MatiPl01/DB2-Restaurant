import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FilterAttr } from '@dishes/enums/filter-attr.enum';
import { MultiSelectDropdownSettings } from '@shared/types/multi-select-dropdown-settings.type';
import { MultipleSelectEvent } from '@shared/types/multiple-select-event.type';
import { SingleSelectEvent } from '@shared/types/single-select-event.type';
import { ListItem } from 'ng-multiselect-dropdown/multiselect.model';

@Component({
  selector: 'shared-multi-select-dropdown',
  templateUrl: './multi-select-dropdown.component.html',
  styleUrls: ['./multi-select-dropdown.component.scss']
})
export class MultiSelectDropdownComponent {
  @Output() selectedItemsChange = new EventEmitter<string[]>();
  @Output() itemSelectedEvent = new EventEmitter<SingleSelectEvent>();
  @Output() selectedAllEvent = new EventEmitter<MultipleSelectEvent>();
  @Output() itemDeSelectedEvent = new EventEmitter<SingleSelectEvent>();
  @Output() deSelectedAllEvent = new EventEmitter<MultipleSelectEvent>();
  @Input() placeholder = '';
  @Input() settings!: MultiSelectDropdownSettings;
  @Input() allItems: string[] | number[] = [];
  @Input() selectedItems: string[] | number[] = [];
  @Input() filterAttr!: FilterAttr;

  onItemSelect(item: ListItem) {
    this.itemSelectedEvent.emit(this.createSingleSelectEventObj(item));
  }

  onSelectAll(items: ListItem[]) {
    this.selectedAllEvent.emit(this.createMultipleSelectEventObj(items));
  }

  onItemDeSelect(item: ListItem) {
    this.itemDeSelectedEvent.emit(this.createSingleSelectEventObj(item));
  }

  onDeSelectAll(items: ListItem[]) {
    this.deSelectedAllEvent.emit(this.createMultipleSelectEventObj(items));
  }

  private createSingleSelectEventObj(item: ListItem): SingleSelectEvent {
    return {
      filterAttr: this.filterAttr,
      item: (item as unknown) as string | number
    };
  }

  private createMultipleSelectEventObj(items: ListItem[]): MultipleSelectEvent {
    return {
      filterAttr: this.filterAttr,
      items: (items as unknown) as string[] | number[]
    };
  }
}
