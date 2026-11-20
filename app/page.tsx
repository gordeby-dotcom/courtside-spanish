import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "./chatgpt-auth";
import { Tutor } from "./tutor";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getChatGPTUser();
  return <Tutor signIn={user ? null : chatGPTSignInPath("/")} signOut={chatGPTSignOutPath("/")} />;
}
