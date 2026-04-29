import { OrderService } from './order.service';

describe('OrderService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('rejects empty or zero-total orders', () => {
    const service = new OrderService();

    expect(() =>
      service.placeOrder({
        restaurantName: 'Burger Palace',
        items: '   ',
        total: 250,
      }),
    ).toThrow('Cannot place an empty order');

    expect(() =>
      service.placeOrder({
        restaurantName: 'Burger Palace',
        items: 'Classic Cheeseburger',
        total: 0,
      }),
    ).toThrow('Order total must be greater than zero');
  });

  it('deletes an order from the saved list', () => {
    const service = new OrderService();
    const created = service.placeOrder({
      restaurantName: 'Burger Palace',
      items: 'Classic Cheeseburger',
      total: 249,
    });

    expect(service.orders().some((order) => order.id === created.id)).toBe(true);

    service.deleteOrder(created.id);

    expect(service.orders().some((order) => order.id === created.id)).toBe(false);
  });
});
