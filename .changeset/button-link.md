---
'@williamphelps13/ui': minor
---

Button renders as a link: `href` switches it to an `<a>`, and `component` accepts a router link

- `<Button href="/events" component={Link}>Events</Button>` keeps Next.js client-side navigation and prefetching; without `component` it renders a plain `<a>`
- The link form's props exclude `type`, `disabled` and `loading`, which an `<a>` cannot honor, so passing them is a type error
- New exported types: `ButtonAsButtonProps`, `ButtonAsLinkProps`, `ButtonLinkComponentProps`; `ButtonProps` is now their union
