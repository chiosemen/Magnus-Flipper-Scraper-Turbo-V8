# Vinted Scraper Notes

## Selectors
- `article[data-testid="listing-card"]` is the primary listing container; fallback to `.vintage-listing-card`.
- Title: `[data-testid="listing-card-title"]`, fallback `h3` or `.title`.
- Price: `[data-testid="listing-card-price"]` or `.price`.
- Listing URLs: first anchor under the card pointing to `vinted.com`.
- Location: `[data-testid="listing-card-location"]` or `.location`.
- Pagination: `[data-testid="search-pagination-next"]` or `.next-page`.

## Bot Signals
- `login` when page contains “please login” or “sign-in”.
- `blocked` when page mentions “access denied” or “blocked by anti-bot”.
- `consent` when user is asked to confirm they are human.
- `rate_limited` when “too many requests” or “rate limit exceeded” appears.

## Pagination
- We parse `pageHtmls` sequentially and detect `NEXT_PAGE_SELECTOR`.
- Each call returns `hasNextPage` if pagination link still present.

## Fragility
- Vinted frequently reshuffles CSS; rely on data attributes first.
- Listings nested in JS state may require JSON parsing if `LISTING_SELECTOR` fails.
- Rate limits and login walls are fatal states; fail closed and surface classification.

## Safe Expansion
- Keep new selectors behind `classifyVintedHtml` reason strings.
- Add fixtures for every new marketplace region or ad layout.
- Avoid extracting additional metadata (e.g., seller ids) until stable.
