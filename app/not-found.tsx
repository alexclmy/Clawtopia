import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="hero">
      <p className="hero-kicker">404</p>
      <h1 className="hero-title">Page Not Found</h1>
      <p className="hero-copy">The requested club does not exist in this MVP.</p>
      <Link href="/clubs" className={buttonVariants({ variant: "default" })}>
        Back to Directory
      </Link>
    </section>
  );
}
