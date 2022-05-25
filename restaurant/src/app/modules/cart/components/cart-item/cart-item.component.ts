import {Component, EventEmitter, Input, Output} from '@angular/core'
import DetailedCartItem from "@cart/interfaces/detailed-cart-item.interface";
import { CartService } from '@cart/services/cart.service';
import { CurrencyService } from '@core/services/currency.service';

@Component({
  selector: 'app-cart-item',
  templateUrl: './cart-item.component.html',
  styles: [
  ]
})
export class CartItemComponent{
  @Input() dish!: DetailedCartItem
  @Output() changeQuantity = new EventEmitter<{price:number,quantity:number}>()
  @Output() removeItem = new EventEmitter<string>()

  constructor(public currencyService: CurrencyService,public cartService: CartService) {
  }

  onRemoveClick() {
    this.cartService.getUserDetailedCart("USD").subscribe(cart=>{
      let newCart=cart.map(item=>{return {dish:item.dishId,quantity:item.quantity}})
      newCart=newCart.filter(item=>item.dish!=this.dish.dishId)
      this.cartService.setUserCart(newCart).subscribe()
      this.removeItem.emit(this.dish.dishId)
    })
  }
  onChangeQuantity(event:{price:number,quantity:number}){
    this.dish.quantity+=event.quantity
    this.changeQuantity.emit(event)
  }
  getPrice(){
    return Math.round(this.dish.unitPrice*this.dish.quantity*100)/100
  }
}
