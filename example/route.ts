// app/api/chat/[...path]/route.ts: the safe door between the browser and the backend. The browser never calls the backend itself.
import { cookies } from "next/headers"
import { createChatProxy } from "@techabyte/support-chat/server"

export const { GET, POST } = createChatProxy({
  apiUrl: process.env.API_URL!, // e.g. https://admin.example.com/api/v1
  // The signed-in customer's token, if the project has accounts. Visitors have none.
  authToken: async () => (await cookies()).get("session")?.value,
  // guard: defaultGuard is used when this is left out (an Origin check, per-visitor limits kept in memory).
  // images: { maxFiles: 3, maxBytes: 5 * 1024 * 1024 }, // the defaults; `false` refuses photos
})
