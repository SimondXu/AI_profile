/**
 * Re-mounted on every navigation inside the public shell, which gives each
 * route a short CSS-only enter animation (`.route-enter` in globals.css)
 * without touching the layout, hydration, or the server-rendered markup.
 */
export default function PublicTemplate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="route-enter flex flex-1 flex-col">{children}</div>;
}
