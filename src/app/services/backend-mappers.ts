import { CartItem, MenuItem, Order, PaymentMethod, Restaurant } from '../core/app.models';

export interface BackendRestaurantResponse {
  id: number;
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
  cuisineType: string;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  rating: number;
  ownerId?: number | null;
  ownerEmail?: string | null;
  ownerName?: string | null;
  menuItems?: BackendMenuItemResponse[];
}

export interface BackendMenuItemResponse {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  availability?: 'AVAILABLE' | 'UNAVAILABLE';
  category?: string | null;
  isVeg?: boolean | null;
  imageUrl?: string | null;
}

export interface BackendOrderResponse {
  id: number;
  customerId: number;
  restaurantId: number;
  customerEmail: string;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  note?: string | null;
  deliveryAgentId?: number | null;
  deliveryAgentName?: string | null;
  deliveryAgentEmail?: string | null;
  deliveryAgentPhone?: string | null;
  deliveryAgentStatus?: string | null;
  totalAmount: number;
  orderStatus: 'CREATED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'SUCCESS' | 'PAID' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  paymentId?: string | null;
  razorpayOrderId?: string | null;
  razorpaySignature?: string | null;
  paymentMethod?: string | null;
  items: Array<{
    id: number;
    menuItemId: number;
    itemName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface BackendCartItemResponse {
  id: number;
  customerId: number;
  restaurantId: number;
  restaurantName: string;
  menuItemId: number;
  itemName: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string | null;
  category?: string | null;
  createdAt: string;
}

export interface BackendCartSummaryResponse {
  items: BackendCartItemResponse[];
  subtotal: number;
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function titleize(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function restaurantStatusFromBackend(status?: string): 'OPEN' | 'CLOSED' {
  return status === 'CLOSED' ? 'CLOSED' : 'OPEN';
}

export function restaurantStatusToBackend(status: 'OPEN' | 'CLOSED'): 'ACTIVE' | 'CLOSED' {
  return status === 'OPEN' ? 'ACTIVE' : 'CLOSED';
}

export function orderStatusFromBackend(
  status?: BackendOrderResponse['orderStatus'],
): Order['status'] {
  switch (status) {
    case 'CREATED':
      return 'PLACED';
    case 'CONFIRMED':
      return 'CONFIRMED';
    case 'PREPARING':
      return 'PREPARING';
    case 'READY':
      return 'READY';
    case 'OUT_FOR_DELIVERY':
      return 'ON_THE_WAY';
    case 'DELIVERED':
      return 'DELIVERED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return 'PLACED';
  }
}

export function orderStatusToBackend(status: Order['status']): BackendOrderResponse['orderStatus'] {
  switch (status) {
    case 'PLACED':
      return 'CREATED';
    case 'CONFIRMED':
      return 'CONFIRMED';
    case 'PREPARING':
      return 'PREPARING';
    case 'READY':
      return 'READY';
    case 'ON_THE_WAY':
      return 'OUT_FOR_DELIVERY';
    case 'DELIVERED':
      return 'DELIVERED';
    case 'CANCELLED':
    default:
      return 'CANCELLED';
  }
}


export function paymentMethodToBackend(
  method: PaymentMethod,
): 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'CASH_ON_DELIVERY' {
  switch (method) {
    case 'COD':
      return 'CASH_ON_DELIVERY';
    case 'UPI':
    case 'CARD':
    case 'NETBANKING':
    case 'WALLET':
    default:
      return method;
  }
}

export function cuisineTypeFromText(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.includes('indian')) return 'INDIAN';
  if (normalized.includes('chinese') || normalized.includes('noodle')) return 'CHINESE';
  if (normalized.includes('pizza') || normalized.includes('italian')) return 'ITALIAN';
  if (normalized.includes('burger') || normalized.includes('american') || normalized.includes('fast')) return 'AMERICAN';
  if (normalized.includes('taco') || normalized.includes('mexican')) return 'CONTINENTAL';
  return 'OTHER';
}

export function restaurantImageForSlug(slug: string): string | undefined {
  const map: Record<string, string> = {
    'urban-bites': '/assets/images/restaurants/burger-palace.jpg',
    'crust-and-co': '/assets/images/restaurants/pizza-hut.jpg',
    'royal-tadka': '/assets/images/restaurants/spice-kitchen.jpg',
    'wok-and-bowl': '/assets/images/restaurants/dragon-wok.jpg',
    'green-spoon': '/assets/images/restaurants/green-bowl.jpg',
    'the-food-yard': '/assets/images/restaurants/street-flavors.jpg',
    'burger-palace': '/assets/images/restaurants/burger-palace.jpg',
    'pizza-hut-express': '/assets/images/restaurants/pizza-hut.jpg',
    'sushi-zen': '/assets/images/restaurants/dragon-wok.jpg',
    'spice-garden': '/assets/images/restaurants/spice-kitchen.jpg',
    'sweet-heaven': '/assets/images/restaurants/green-bowl.jpg',
  };
  return map[slug] ?? '/assets/images/restaurants/street-flavors.jpg';
}

export function menuImageForSlug(slug: string): string | undefined {
  const map: Record<string, string> = {
    'acai-bowl': '/assets/images/food-items/Acai Bowl.jpg',
    'apple-mojito': '/assets/images/food-items/Apple Mojito.jpg',
    'arrabbiata-pasta': '/assets/images/food-items/Arrabbiata Pasta.jpg',
    'avocado-salad': '/assets/images/food-items/Avocado Salad.jpg',
    'avocado-toast': '/assets/images/food-items/Avocado Toast.jpg',
    'avocado-veg-roll': '/assets/images/food-items/Avocado Veg Roll.png',
    'avocado-veg-sandwich': '/assets/images/food-items/Avocado Veg Sandwich.jpg',
    'avocado-veggie-wrap': '/assets/images/food-items/Avocado Veggie Wrap.jpg',
    'baked-cheese-pasta': '/assets/images/food-items/Baked Cheese Pasta.jpg',
    'bbq-bacon-burger': '/assets/images/food-items/bbq-bacon-burger.png',
    'bbq-chicken-burger': '/assets/images/food-items/BBQ Chicken Burger.jpg',
    'belgian-chocolate-pastry': '/assets/images/food-items/belgian-chocolate-pastry.jpg',
    'biscoff-cheesecake': '/assets/images/food-items/Biscoff Cheesecake.jpg',
    'blue-lagoon-drink': '/assets/images/food-items/Blue Lagoon Drink.jpg',
    'broccoli-alfredo-pasta': '/assets/images/food-items/Broccoli Alfredo Pasta.jpg',
    'brownie-overdose': '/assets/images/food-items/brownie overdose.jpg',
    'brownie-with-ice-cream': '/assets/images/food-items/Brownie with ice cream.jpg',
    'buddha-bowl': '/assets/images/food-items/Buddha Bowl.jpg',
    'burger-special': '/assets/images/food-items/burger-special.jpg',
    'butter-chicken': '/assets/images/food-items/Butter Chicken.jpg',
    'butter-tandoori-roti': '/assets/images/food-items/Butter Tandoori Roti.jpg',
    'california-roll': '/assets/images/food-items/California Roll.jpg',
    'caramel-cold-coffee': '/assets/images/food-items/Caramel Cold Coffee.jpg',
    'cheese-garlic-bread': '/assets/images/food-items/Cheese Garlic Bread.jpg',
    'cheese-momos': '/assets/images/food-items/Cheese Momos.jpg',
    'cheese-uttapam': '/assets/images/food-items/Cheese Uttapam.jpg',
    'cheesecake': '/assets/images/food-items/Cheesecake.jpg',
    'cheesy-garlic-bread': '/assets/images/food-items/Cheesy Garlic Bread.jpg',
    'cheesy-mozzarella-sticks': '/assets/images/food-items/Cheesy Mozzarella Sticks.jpg',
    'cheesy-white-sauce-pasta': '/assets/images/food-items/Cheesy White Sauce Pasta.jpg',
    'chicken-alfredo-pasta': '/assets/images/food-items/Chicken Alfredo Pasta.jpg',
    'chicken-arrabbiata': '/assets/images/food-items/Chicken Arrabbiata.jpg',
    'chicken-avocado-wrap': '/assets/images/food-items/Chicken Avocado Wrap.jpg',
    'chicken-baked-pasta': '/assets/images/food-items/Chicken Baked Pasta.jpg',
    'chicken-biryani': '/assets/images/food-items/Chicken Biryani.jpg',
    'chicken-cheese-sandwich': '/assets/images/food-items/Chicken Cheese Sandwich.jpg',
    'chicken-chow-mein': '/assets/images/food-items/Chicken Chow Mein.jpg',
    'chicken-fried-rice': '/assets/images/food-items/Chicken Fried Rice.jpg',
    'chicken-hakka-noodles': '/assets/images/food-items/Chicken Hakka Noodles.jpg',
    'chicken-momos': '/assets/images/food-items/Chicken Momos.jpg',
    'chicken-protein': '/assets/images/food-items/Chicken Protein Bowl.jpg',
    'chicken-sausage': '/assets/images/food-items/Chicken Sausage Pizza.jpg',
    'chicken-singapore': '/assets/images/food-items/Chicken Singapore Noodles.jpg',
    'chicken-tikka-pizza': '/assets/images/food-items/Chicken Tikka Pizza.jpg',
    'chilli-momos': '/assets/images/food-items/Chilli Momos.jpg',
    'chilli-paneer': '/assets/images/food-items/Chilli Paneer.jpg',
    'choco-lava-cake': '/assets/images/food-items/choco-lava-cake.jpg',
    'chocolate-brownie-sundae': '/assets/images/food-items/Chocolate Brownie Sundae.jpg',
    'chocolate-crime': '/assets/images/food-items/Chocolate Crime Scene.jpg',
    'chocolate-donut': '/assets/images/food-items/chocolate-donut.jpg',
    'chocolate-mousse-cake': '/assets/images/food-items/chocolate-mousse-cake.jpg',
    'chocolate-shake': '/assets/images/food-items/chocolate-shake.png',
    'chole-bhature': '/assets/images/food-items/Chole Bhature.jpg',
    'classic-cheese-fries': '/assets/images/food-items/Classic Cheese Fries.jpg',
    'classic-cheeseburger': '/assets/images/food-items/classic-cheeseburger.jpg',
    'classic-chocolate-brownie': '/assets/images/food-items/Classic Chocolate Brownie.jpg',
    'classic-cold-coffee': '/assets/images/food-items/Classic Cold Coffee.jpg',
    'classic-mozzarella-sticks': '/assets/images/food-items/Classic Mozzarella Sticks.jpg',
    'classic-orange-juice': '/assets/images/food-items/Classic Orange Juice.jpg',
    'classic-tiramisu': '/assets/images/food-items/Classic Tiramisu.jpg',
    'club-triple-decker-sandwiches': '/assets/images/food-items/Club & Triple-Decker Sandwiches.jpg',
    'corn-biryani': '/assets/images/food-items/Corn Biryani.jpg',
    'creamy-cold-coffee': '/assets/images/food-items/Creamy Cold Coffee.jpg',
    'creamy-mushroom-pasta': '/assets/images/food-items/Creamy Mushroom Pasta.jpg',
    'crispy-chicken-burger': '/assets/images/food-items/Crispy Chicken Burger.jpg',
    'crispy-fried-momos': '/assets/images/food-items/crispy-fried-momos.jpg',
    'crispy-golden-fries': '/assets/images/food-items/crispy-golden-fries.jpg',
    'crispy-veg-burger': '/assets/images/food-items/Crispy Veg Burger.jpg',
    'dal-makhani': '/assets/images/food-items/daal-makhani.jpg',
    'double-chicken-burger': '/assets/images/food-items/Double Chicken Burger.jpg',
    'dragon-fire-noodles': '/assets/images/food-items/dragon-fire noodles.jpg',
    'egg-dum-biryani': '/assets/images/food-items/Egg Dum Biryani.jpg',
    'fresh-lime-soda': '/assets/images/food-items/Fresh Lime Soda.jpg',
    'fresh-orange-juice': '/assets/images/food-items/Fresh Orange Juice.jpg',
    'fried-crispy-momos': '/assets/images/food-items/Fried & Crispy Momos.jpg',
    'fruit-smoothie-bowl': '/assets/images/food-items/Fruit Smoothie Bowl.jpg',
    'garlic-bread': '/assets/images/food-items/garlic-bread.jpg',
    'garlic-cheese-fries': '/assets/images/food-items/Garlic Cheese Fries.jpg',
    'ghee-roast-dosa': '/assets/images/food-items/Ghee Roast Dosa.jpg',
    'greek-yogurt-bowl': '/assets/images/food-items/Greek Yogurt Bowl.jpg',
    'grilled-cheese-sandwich': '/assets/images/food-items/Grilled Cheese sandwich.jpg',
    'grilled-chicken-cheese-sandwich': '/assets/images/food-items/Grilled Chicken Cheese Sandwich.jpg',
    'grilled-chicken-salad': '/assets/images/food-items/Grilled Chicken Salad.jpg',
    'grilled-chicken-wrap': '/assets/images/food-items/Grilled Chicken Wrap.jpg',
    'grilled-paneer-bowl': '/assets/images/food-items/Grilled Paneer Bowl.jpg',
    'gulab-jamun': '/assets/images/food-items/gulab-jamun.jpg',
    'honey-chilli-paneer': '/assets/images/food-items/Honey Chilli Paneer.jpg',
    'hot-brownie-with-ice-cream': '/assets/images/food-items/Hot Brownie with Ice Cream.jpg',
    'iced-mocha': '/assets/images/food-items/Iced Mocha.jpg',
    'idli-sambar': '/assets/images/food-items/Idli Sambar.jpg',
    'idli-vada-combo': '/assets/images/food-items/Idli Vada Combo.jpg',
    'jalebi': '/assets/images/food-items/jalebi.jpg',
    'jeera-chaas': '/assets/images/food-items/Jeera Chaas.jpg',
    'jeera-rice': '/assets/images/food-items/Jeera Rice with Raita.jpg',
    'jeera-rice-with-raita': '/assets/images/food-items/Jeera Rice with Raita.jpg',
    'kaju-katli': '/assets/images/food-items/kaju-katli.jpg',
    'loaded-cheesy-sandwiches': '/assets/images/food-items/Loaded & Cheesy Sandwiches.jpg',
    'loaded-chicken-pizza': '/assets/images/food-items/Loaded Chicken Pizza.jpg',
    'loaded-fries': '/assets/images/food-items/loaded-fries.png',
    'mango-lassi': '/assets/images/food-items/mango-lassi.jpg',
    'mango-mojito-drink': '/assets/images/food-items/Mango Mojito Drink.jpg',
    'margherita-pizza': '/assets/images/food-items/margherita-pizza.jpg',
    'masala-chaas': '/assets/images/food-items/Masala Chaas.jpg',
    'masala-dosa': '/assets/images/food-items/Masala Dosa.jpg',
    'mascarpone-tiramisu': '/assets/images/food-items/Mascarpone Tiramisu.jpg',
    'medu-vada': '/assets/images/food-items/Medu Vada.jpg',
    'mint-lime-soda': '/assets/images/food-items/Mint Lime Soda.jpg',
    'mocha-cold-coffee': '/assets/images/food-items/Mocha Cold Coffee.jpg',
    'motichoor-laddu': '/assets/images/food-items/motichoor-laddu.jpg',
    'mughlai-chicken': '/assets/images/food-items/Mughlai Chicken.jpg',
    'mushroom-biryani': '/assets/images/food-items/Mushroom Biryani.jpg',
    'mutton-biryani': '/assets/images/food-items/Mutton Biryani.jpg',
    'mutton-curry': '/assets/images/food-items/Mutton curry.jpg',
    'mutton-masala': '/assets/images/food-items/Mutton Masala.jpg',
    'mutton-rogan-josh': '/assets/images/food-items/Mutton Rogan Josh.jpg',
    'mutton-seekh-kebab': '/assets/images/food-items/Mutton Seekh Kebab.jpg',
    'mysore-masala-dosa': '/assets/images/food-items/Mysore Masala Dosa.jpg',
    'naan-basket': '/assets/images/food-items/naan-basket.jpg',
    'nacho-cheese-melt': '/assets/images/food-items/nacho-cheese-melt.jpg',
    'nutella-dream-stack': '/assets/images/food-items/Nutella Dream Stack.jpg',
    'oats-fruit-bowl': '/assets/images/food-items/Oats & Fruit Bowl.jpg',
    'onion-ring-crunch': '/assets/images/food-items/onion-ring-crunch.png',
    'onion-uttapam': '/assets/images/food-items/Onion uttpam.jpg',
    'overnight-oats': '/assets/images/food-items/Overnight Oats.jpg',
    'paneer-flame-fusion-pizza': '/assets/images/food-items/paneer-flame-fusion pizza.png',
    'paneer-lababdar': '/assets/images/food-items/paneer-lababdar.jpg',
    'paneer-tikka': '/assets/images/food-items/paneer-tikka.jpg',
    'paneer-veg-sandwiches': '/assets/images/food-items/Paneer & Veg Sandwiches.jpg',
    'paneer-wrap': '/assets/images/food-items/Paneer Wrap.jpg',
    'penne-alfredo': '/assets/images/food-items/Penne alfredo.jpg',
    'pepperoni-feast': '/assets/images/food-items/pepperoni-feast.jpg',
    'peri-peri-chicken-wrap': '/assets/images/food-items/Peri Peri Chicken Wrap.jpg',
    'peri-peri-fries-with-garlic-mayo': '/assets/images/food-items/Peri Peri Fries with Garlic Mayo.jpg',
    'pesto-pasta': '/assets/images/food-items/Pesto Pasta.jpg',
    'prawn-tempura': '/assets/images/food-items/Prawn Tempura.jpg',
    'protein-bowl': '/assets/images/food-items/Protein Bowl.jpg',
    'rainbow-veggie-salad': '/assets/images/food-items/Rainbow Veggie Salad.jpg',
    'rasmalai': '/assets/images/food-items/rasmalai.jpg',
    'restaurant-style-jeera-rice': '/assets/images/food-items/Restaurant Style Jeera Rice.jpg',
    'roti-with-butter': '/assets/images/food-items/Roti with Butter.jpg',
    'salmon-nigiri': '/assets/images/food-items/Salmon Nigiri.png',
    'soya-chaap-biryani': '/assets/images/food-items/Soya Chaap Biryani.jpg',
    'sparkling-lime-soda': '/assets/images/food-items/Apple Mojito.jpg',
    'spicy-peri-peri-fries': '/assets/images/food-items/Spicy Peri Peri Fries.jpg',
    'strawberry-cheesecake': '/assets/images/food-items/Strawberry Cheesecake.jpg',
    'strawberry-lemonade': '/assets/images/food-items/Strawberry Lemonade.jpg',
    'strawberry-mojito-drink': '/assets/images/food-items/Strawberry Mojito Drink.jpg',
    'stuffed-cheese-garlic-bread': '/assets/images/food-items/Stuffed Cheese Garlic Bread.jpg',
    'sushi-platter': '/assets/images/food-items/sushi platter.jpg',
    'szechuan-spice-fusion-noodles': '/assets/images/food-items/szechuan-spice-fusion noodles.png',
    'tandoori-momos': '/assets/images/food-items/Tandoori Momos.jpg',
    'tandoori-roti': '/assets/images/food-items/Tandoori Roti.jpg',
    'tempura-shrimp-roll': '/assets/images/food-items/Tempura Shrimp Rol.jpg',
    'tonki-hakka-noodles': '/assets/images/food-items/tonki-hakka noodles.png',
    'veg-club-sandwich': '/assets/images/food-items/Veg club sandwich.jpg',
    'veg-fried-rice': '/assets/images/food-items/Veg Fried Rice.jpg',
    'veg-hukka-noodles': '/assets/images/food-items/veg-hukka-noodles.png',
    'veg-paneer-biryani': '/assets/images/food-items/Veg & Paneer Biryani.jpg',
    'veg-paneer-momos': '/assets/images/food-items/Veg & Paneer Momos.jpg',
    'veg-spring-rolls': '/assets/images/food-items/Veg Spring Rolls.jpg',
    'vegetable-dum-biryani': '/assets/images/food-items/Vegetable Dum Biryani.jpg',
    'vegetable-uttapam': '/assets/images/food-items/Vegetable Uttapam.jpg',
    'veggie-burger': '/assets/images/food-items/veggie-burger.png',
    'veggie-loaded-pizza': '/assets/images/food-items/Veggie Loaded Pizza.jpg',
    'walnut-brownie': '/assets/images/food-items/Walnut Brownie.jpg',
    'watermelon-mojito-drink': '/assets/images/food-items/Watermelon Mojito Drink.jpg',
    'wok-toss-noodles': '/assets/images/food-items/wok-toss-noodles.png',
    'zinger-chicken-burger': '/assets/images/food-items/Zinger Chicken Burger.jpg',
  };
  return map[slug];
}

export function restaurantToFrontend(response: BackendRestaurantResponse): Restaurant {
  const slug = slugify(response.name);
  const isUrbanBites = slug.includes('urban') || slug.includes('burger');
  const isCrust = slug.includes('crust') || slug.includes('pizza');
  const isRoyal = slug.includes('royal') || slug.includes('spice') || slug.includes('tadka');
  const isWok = slug.includes('wok') || slug.includes('sushi') || slug.includes('bowl');
  const isGreen = slug.includes('green') || slug.includes('sweet') || slug.includes('spoon');

  const category = isUrbanBites
    ? 'quick-bites'
    : isCrust
      ? 'pizza-pasta'
      : isRoyal
        ? 'indian'
        : isWok
          ? 'asian'
          : isGreen
            ? 'healthy'
            : 'quick-bites';

  const heroEmoji = isUrbanBites
    ? '🍔'
    : isCrust
      ? '🍕'
      : isRoyal
        ? '🍛'
        : isWok
          ? '🥡'
          : isGreen
            ? '🥗'
            : '🍽️';

  const cleanSlug = isUrbanBites
    ? 'urban-bites'
    : isCrust
      ? 'crust-and-co'
      : isRoyal
        ? 'royal-tadka'
        : isWok
          ? 'wok-and-bowl'
          : isGreen
            ? 'green-spoon'
            : 'the-food-yard';

  return {
    id: cleanSlug,
    backendId: response.id,
    name: response.name,
    cuisine: `${response.cuisineType.charAt(0)}${response.cuisineType.slice(1).toLowerCase()}`,
    category,
    rating: response.rating ?? 4.8,
    deliveryMinutes: '20–35',
    minOrder: 150,
    status: restaurantStatusFromBackend(response.status),
    heroEmoji,
    description: response.address || `${response.name} on QuickBite`,
    imageUrl: restaurantImageForSlug(cleanSlug),
  };
}


export function menuToFrontend(
  restaurantId: string,
  restaurantName: string,
  restaurantBackendId: number | undefined,
  item: BackendMenuItemResponse,
): MenuItem {
  const slug = slugify(item.name);
  const resolvedCategory = item.category || (
    restaurantId === 'crust-and-co'
      ? 'Pizza & Pasta'
      : restaurantId === 'royal-tadka'
        ? 'Indian'
        : restaurantId === 'wok-and-bowl'
          ? 'Asian'
          : restaurantId === 'green-spoon'
            ? 'Healthy'
            : 'Quick Bites'
  );

  return {
    id: slug,
    backendId: item.id,
    restaurantId,
    restaurantBackendId,
    name: item.name,
    description: item.description ?? '',
    price: item.price,
    rating: 4.8,
    icon: resolvedCategory === 'Pizza & Pasta' ? '🍕' : resolvedCategory === 'Indian' ? '🍛' : resolvedCategory === 'Asian' ? '🥡' : resolvedCategory === 'Healthy' ? '🥗' : resolvedCategory === 'Desserts' ? '🍰' : resolvedCategory === 'Drinks' ? '🥤' : resolvedCategory === 'Sides' ? '🍟' : '🍔',
    category: resolvedCategory,
    isVeg: item.isVeg !== null && item.isVeg !== undefined ? Boolean(item.isVeg) : !item.name.toLowerCase().includes('chicken') && !item.name.toLowerCase().includes('mutton') && !item.name.toLowerCase().includes('bacon') && !item.name.toLowerCase().includes('egg') && !item.name.toLowerCase().includes('salmon') && !item.name.toLowerCase().includes('prawn') && !item.name.toLowerCase().includes('shrimp'),
    available: item.availability !== 'UNAVAILABLE',
    imageUrl: item.imageUrl || menuImageForSlug(slug),
  };
}

export function cartToFrontend(item: BackendCartItemResponse): CartItem {
  return {
    id: `cart-${item.id}`,
    backendId: item.id,
    backendRestaurantId: item.restaurantId,
    backendMenuItemId: item.menuItemId,
    restaurantId: slugify(item.restaurantName),
    restaurantName: item.restaurantName,
    name: item.itemName,
    description: item.category ?? '',
    price: item.unitPrice,
    quantity: item.quantity,
    imageUrl: item.imageUrl ?? undefined,
  };
}
