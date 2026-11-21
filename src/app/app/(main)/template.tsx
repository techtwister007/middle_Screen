/** Re-mounts on every navigation inside the app, so each screen gently fades up into place. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
