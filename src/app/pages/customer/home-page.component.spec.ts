import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HomePageComponent } from './home-page.component';

describe('HomePageComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('filters restaurants by cuisine search', async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(HomePageComponent);
    const component = fixture.componentInstance as HomePageComponent & {
      query: { set(value: string): void };
      filteredRestaurants(): Array<{ name: string; cuisine: string }>;
    };

    component.query.set('sushi');

    const restaurants = component.filteredRestaurants();
    expect(restaurants.map((restaurant) => restaurant.name)).toContain('Sushi Zen');
    expect(
      restaurants.every(
        (restaurant) =>
          restaurant.cuisine.toLowerCase().includes('sushi') || restaurant.name === 'Sushi Zen',
      ),
    ).toBe(true);
  });
});
