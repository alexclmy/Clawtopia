type CnArg = string | false | null | undefined;

export function cn(...args: CnArg[]) {
  return args.filter(Boolean).join(" ");
}

