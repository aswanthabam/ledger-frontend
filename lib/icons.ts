// Curated MaterialCommunityIcons list for expense tracker categories.
// Expense-related icons are prioritized at the top.

// Quick-pick icons shown on the add category screen (expense-oriented first)
export const QUICK_PICK_ICONS = [
    'food', 'coffee', 'cart', 'gas-station', 'bus', 'car', 'home', 'lightning-bolt',
    'medical-bag', 'pill', 'school', 'dumbbell', 'movie-open', 'music', 'cellphone',
    'tshirt-crew', 'gift', 'paw', 'baby-carriage', 'credit-card',
];

// Full icon set grouped by category for the icon browser
export const ICON_SECTIONS: { title: string; icons: string[] }[] = [
    {
        title: 'Food & Drinks',
        icons: [
            'food', 'food-apple', 'food-fork-drink', 'food-variant', 'food-drumstick',
            'pizza', 'hamburger', 'coffee', 'cup', 'beer', 'glass-wine',
            'ice-cream', 'cake-variant', 'fruit-grapes', 'fruit-watermelon',
            'noodles', 'rice', 'bread-slice', 'egg-fried', 'popcorn',
        ],
    },
    {
        title: 'Shopping',
        icons: [
            'cart', 'cart-outline', 'shopping', 'shopping-outline', 'basket',
            'store', 'storefront', 'tag', 'tag-outline', 'sale',
            'cash-register', 'barcode-scan', 'hanger', 'diamond-stone',
            'ring', 'watch', 'sunglasses', 'shoe-heel', 'lipstick', 'spray',
        ],
    },
    {
        title: 'Transport',
        icons: [
            'car', 'car-side', 'bus', 'train', 'subway-variant', 'tram',
            'taxi', 'bicycle', 'motorbike', 'scooter', 'airplane',
            'ferry', 'gas-station', 'ev-station', 'parking', 'road-variant',
            'map-marker', 'navigation', 'highway', 'traffic-light',
        ],
    },
    {
        title: 'Home & Utilities',
        icons: [
            'home', 'home-outline', 'home-city', 'office-building',
            'lightning-bolt', 'water', 'fire', 'radiator', 'air-conditioner',
            'washing-machine', 'fridge', 'microwave', 'television', 'lamp',
            'sofa', 'bed', 'shower', 'toilet', 'key', 'tools',
        ],
    },
    {
        title: 'Health',
        icons: [
            'medical-bag', 'pill', 'hospital-box', 'stethoscope', 'needle',
            'thermometer', 'bandage', 'heart-pulse', 'tooth', 'eye',
            'wheelchair-accessibility', 'flask', 'microscope', 'dna',
            'brain', 'lungs', 'bone', 'blood-bag', 'test-tube', 'virus',
        ],
    },
    {
        title: 'Education',
        icons: [
            'school', 'book-open-variant', 'bookshelf', 'notebook', 'pencil',
            'pen', 'ruler', 'calculator', 'laptop', 'desktop-mac',
            'library', 'graduation-cap', 'presentation', 'abacus',
            'translate', 'atom', 'flask-outline', 'earth', 'lightbulb', 'head-cog',
        ],
    },
    {
        title: 'Entertainment',
        icons: [
            'movie-open', 'music', 'gamepad-variant', 'controller-classic',
            'theater', 'drama-masks', 'palette', 'camera', 'image',
            'headphones', 'microphone', 'guitar-electric', 'piano', 'drum',
            'spotify', 'youtube', 'netflix', 'popcorn', 'ticket', 'firework',
        ],
    },
    {
        title: 'Fitness & Sports',
        icons: [
            'dumbbell', 'run', 'walk', 'bike', 'swim', 'yoga',
            'basketball', 'soccer', 'tennis', 'golf', 'baseball-bat',
            'football', 'ski', 'snowboard', 'hiking', 'weight-lifter',
            'karate', 'meditation', 'rowing', 'trophy',
        ],
    },
    {
        title: 'Finance',
        icons: [
            'credit-card', 'credit-card-outline', 'cash', 'cash-multiple',
            'currency-usd', 'currency-eur', 'currency-gbp', 'currency-inr',
            'bank', 'bank-outline', 'chart-line', 'chart-bar', 'chart-pie',
            'trending-up', 'bitcoin', 'safe', 'piggy-bank', 'wallet',
            'receipt', 'invoice-text',
        ],
    },
    {
        title: 'Technology',
        icons: [
            'cellphone', 'tablet', 'monitor', 'printer', 'keyboard',
            'mouse', 'router-wireless', 'wifi', 'bluetooth', 'usb',
            'memory', 'cpu-64-bit', 'harddisk', 'cloud', 'server',
            'database', 'code-tags', 'bug', 'shield-lock', 'vpn',
        ],
    },
    {
        title: 'Personal & Family',
        icons: [
            'account', 'account-group', 'baby-carriage', 'human-male-female',
            'paw', 'dog', 'cat', 'hand-heart', 'gift', 'flower',
            'ring', 'cake', 'party-popper', 'balloon', 'cards-heart',
            'emoticon-happy', 'face-woman', 'teddy-bear', 'toy-brick', 'stroller',
        ],
    },
    {
        title: 'Clothing',
        icons: [
            'tshirt-crew', 'shoe-heel', 'shoe-sneaker', 'hat-fedora',
            'hanger', 'sunglasses', 'bow-tie', 'tie', 'glasses',
            'watch', 'bag-personal', 'bag-suitcase', 'umbrella', 'mitten',
            'scarf', 'coat-rack', 'iron', 'lipstick', 'spray', 'razor-double-edge',
        ],
    },
    {
        title: 'Travel',
        icons: [
            'airplane', 'airplane-takeoff', 'airplane-landing', 'earth',
            'map', 'map-marker', 'compass', 'palm-tree', 'beach',
            'mountain', 'forest', 'tent', 'campfire', 'binoculars',
            'passport', 'briefcase', 'bag-suitcase', 'camera', 'translate', 'hotel',
        ],
    },
    {
        title: 'Other',
        icons: [
            'star', 'heart', 'bookmark', 'flag', 'bell', 'alarm',
            'calendar', 'clock', 'timer', 'magnify', 'cog', 'wrench',
            'hammer', 'screwdriver', 'trash-can', 'recycle', 'leaf',
            'nature', 'weather-sunny', 'weather-rainy',
        ],
    },
];

// Flat list of all icons for search
export const ALL_ICONS: string[] = ICON_SECTIONS.flatMap((s) => s.icons);
