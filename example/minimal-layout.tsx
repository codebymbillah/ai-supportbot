// app/layout.tsx: the whole setup on the page. One component, one name.
import { DotbyteChat } from "dotbyte-chat"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Names, greeting, suggestion chips, photos and the on/off switch come from the backend's own chat settings. */}
        <DotbyteChat config={{ brandName: "Acme Books" }} />
      </body>
    </html>
  )
}
