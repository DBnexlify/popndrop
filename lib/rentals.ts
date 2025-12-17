export type Rental = {
  id: string;
  name: string;
  subtitle: string;
  size: string;
  fromPrice: number;
  bestFor: string;
  features: string[];
  image: string;
};

export const rentals: Rental[] = [
  {
    id: "castle",
    name: "Castle Bounce House",
    subtitle: "Classic crowd favorite",
    size: "13x13",
    fromPrice: 150,
    bestFor: "Birthdays, ages 3 to 10",
    features: ["Cleaned before every rental", "Delivery and setup", "Great for backyards"],
    image: "/rentals/castle.jpg",
  },
  {
    id: "combo",
    name: "Combo Bounce + Slide",
    subtitle: "More action, more fun",
    size: "15x15",
    fromPrice: 225,
    bestFor: "High energy parties",
    features: ["Bounce area plus slide", "Great value", "Kids love it"],
    image: "/rentals/combo.jpg",
  },
  {
    id: "waterslide",
    name: "18ft Water Slide",
    subtitle: "Big summer energy",
    size: "18ft",
    fromPrice: 325,
    bestFor: "Hot days and big laughs",
    features: ["Tall slide", "Fast setup", "Most requested in summer"],
    image: "/rentals/waterslide.jpg",
  },
];
