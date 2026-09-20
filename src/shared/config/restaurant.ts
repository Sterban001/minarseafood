export const restaurant = {
  name: "Minar Sea Food",
  displayName: "MINAR SEA FOOD",
  logo: "/logo.png",
  tagline: "Fish and prawns, cooked to order",
  description:
    "A family-run seafood kitchen in Charminar. Fish and prawns cooked to order.",
  phone: "+91 63050 02792",
  whatsapp: "+91 63050 02792",
  address: {
    line1: "Panje Shah Road",
    line2: "Charminar",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500002",
  },
  mapsQuery: "Minar Sea Food & Restaurant, Panje Shah Road, Charminar, Hyderabad",
  hours: [{ days: "Every day", time: "1:00 PM - 12:00 AM" }],
  social: {
    instagram: "",
    facebook: "",
  },
} as const;

export const fullAddress = [
  restaurant.address.line1,
  restaurant.address.line2,
  `${restaurant.address.city}, ${restaurant.address.state} ${restaurant.address.pincode}`,
].join(", ");

/** The owner's Google Maps pin — used by "Open in Google Maps" and the footer. */
export const mapsLinkUrl = "https://maps.app.goo.gl/87xdqy1aG9HxvNs87";

export const mapsEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(
  restaurant.mapsQuery,
)}&output=embed`;

export const phoneHref = `tel:${restaurant.phone.replaceAll(" ", "")}`;

export const whatsappHref = `https://wa.me/${restaurant.whatsapp.replace(/\D/g, "")}`;
