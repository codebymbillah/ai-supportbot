// app/api/chat/[...path]/route.ts: the safe door between the browser and the backend. The whole file:
import { createChatProxy } from "@techabyte/support-chat/server"

export const { GET, POST } = createChatProxy() // reads API_URL from the environment

// Everything can be set when needed (an account system, your own request limits, photo size):
// createChatProxy({ apiUrl, authToken: async () => (await cookies()).get("session")?.value, guard, images, limits })
