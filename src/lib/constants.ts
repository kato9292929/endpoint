// Maximum endpoint cards rendered on a single listing page.
//
// Prerendered (ISR) pages have a hard size limit on Vercel (~19 MB of RSC
// payload). With tens of thousands of endpoints, an unbounded listing (e.g.
// /category/other, /network/base, the home grid) blows past it. We cap the
// rendered cards and point overflow at search / source directories. Search and
// filtering still operate over the full dataset client-side.
export const MAX_LISTING_ITEMS = 200;
