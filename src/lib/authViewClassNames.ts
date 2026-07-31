/**
 * Strips @neondatabase/auth-ui's own Card chrome (border/shadow/background)
 * so AuthView renders as bare content inside our own .kal-card wrapper
 * instead of a card nested inside a card, and maps its form elements onto
 * the existing kal-* utility classes so they match the rest of the app.
 */
export const authViewClassNames = {
  base: "!max-w-none !border-0 !bg-transparent !shadow-none !p-0",
  header: "!px-0 !pt-0 items-start text-left",
  content: "!px-0",
  footer: "!px-0 !pb-0",
  title: "text-lg font-extrabold text-ink",
  description: "text-sm text-ink/60",
  separator: "bg-ink/15",
  continueWith: "text-ink/40",
  form: {
    label: "kal-label",
    input: "kal-input",
    primaryButton: "kal-btn-primary w-full justify-center",
    secondaryButton: "kal-btn-secondary w-full justify-center",
    outlineButton: "kal-btn-secondary w-full justify-center",
    providerButton: "kal-btn-ghost w-full justify-center",
    forgotPasswordLink: "text-purple hover:underline",
    error: "text-sm text-red-600",
  },
};
