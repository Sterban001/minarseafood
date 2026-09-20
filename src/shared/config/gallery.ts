export type GalleryPhoto = {
  caption: string;
  /**
   * Drop the file into `public/gallery/` and point at it, e.g.
   * "/gallery/fry.jpg". Leave it out and the tile renders as a designed
   * placeholder instead of a broken image.
   */
  src?: string;
  alt?: string;
  /** `true` gives the tile double width on desktop. */
  wide?: boolean;
};

export const galleryPhotos: GalleryPhoto[] = [
  { caption: "Fish fry, made to order", wide: true },
  { caption: "Prawn masala" },
  { caption: "A thali from the kitchen" },
  { caption: "Rumali roti, folded warm" },
  { caption: "Inside the kitchen", wide: true },
  { caption: "Plates coming out" },
];
