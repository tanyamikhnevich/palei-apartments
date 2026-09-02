# Why there is no `loading.tsx` here

A `loading.tsx` wraps the route in a streaming Suspense boundary. Next then
sends the shell — and with it the `200` — before the page body has run, so the
`notFound()` below can render the not-found screen but can no longer change the
status code. Every missing or unpublished apartment answered `200 Apartment not
found`: a soft 404, which search engines treat as a broken page and which kept
unpublished flats indexable.

The skeleton it showed (`ApartmentDetailSkeleton`, still in
`src/components/ApartmentDetail/`) only covered a single database read. Correct
status codes were worth more than that; during client-side navigation Next keeps
the previous page on screen anyway.

If the skeleton is ever wanted back, the 404 has to be decided before the
stream opens — e.g. a cheap `id + status` query outside the Suspense boundary,
with the full detail streamed inside it.
