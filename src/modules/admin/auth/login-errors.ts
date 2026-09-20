/**
 * The OAuth callback can only fail back to the login screen through a redirect,
 * and anything in a URL is attacker-controlled. So it passes a code from this
 * list rather than a sentence: nobody gets to put their own words, or a phone
 * number to call, on our sign-in page.
 */
export type LoginErrorCode =
  | "denied"
  | "unknown-account"
  | "provider"
  | "no-code"
  | "exchange"
  | "no-profile"
  | "inactive";

const messages: Record<LoginErrorCode, string> = {
  denied: "Google sign-in was cancelled.",
  "unknown-account":
    "That Google account has no staff login here. It has to be created for you first.",
  provider: "Google sign-in failed. Try again, or use your email and password.",
  "no-code": "That sign-in link was incomplete. Start again.",
  exchange: "Google sign-in could not be completed. Try again.",
  "no-profile": "This login has no staff profile yet. Ask your manager to set it up.",
  inactive: "This account has been switched off. Speak to your manager.",
};

export function loginErrorMessage(code: string | undefined): string | null {
  return code && code in messages ? messages[code as LoginErrorCode] : null;
}
