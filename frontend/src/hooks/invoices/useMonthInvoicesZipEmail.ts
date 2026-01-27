import { emailMonthInvoicesZip } from "@/api/invoicesZip";

export function useMonthInvoicesZipEmail(setGlobalError?: (msg: string) => void) {
  return async function sendZip(monthKey: string, email: string) {
    try {
      setGlobalError?.("");
      await emailMonthInvoicesZip(monthKey, email);
    } catch (e: any) {
      setGlobalError?.(e?.message ?? "Erreur envoi email");
      throw e;
    }
  };
}
