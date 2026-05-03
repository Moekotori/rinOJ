export { rinTokens } from "./tokens";
export type { RinTokens } from "./tokens";
export { RinMascot } from "./rin-mascot";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
