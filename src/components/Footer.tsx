import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "#f68f1d" }}>
      <div className="max-w-[1440px] mx-auto px-4 md:px-margin-desktop">
        <div className="flex flex-col items-center py-8 md:py-10">
          <Link href="/">
            <Image
              src="/sellrilogo.png"
              alt="Sellri"
              width={120}
              height={40}
              className="object-contain"
              priority
            />
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-x-4 md:gap-x-8 gap-y-2 mt-4 md:mt-6">
            <Link
              href="#features"
              className="text-xs sm:text-sm text-white/75 hover:text-white transition-colors duration-200"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-xs sm:text-sm text-white/75 hover:text-white transition-colors duration-200"
            >
              Pricing
            </Link>
            <Link
              href="/signin"
              className="text-xs sm:text-sm text-white/75 hover:text-white transition-colors duration-200"
            >
              Sign In
            </Link>
            <Link
              href="/policies/privacy"
              className="text-xs sm:text-sm text-white/75 hover:text-white transition-colors duration-200"
            >
              Privacy Policy
            </Link>
            <Link
              href="/policies/terms"
              className="text-xs sm:text-sm text-white/75 hover:text-white transition-colors duration-200"
            >
              Terms of Service
            </Link>
            <Link
              href="/policies/refund"
              className="text-xs sm:text-sm text-white/75 hover:text-white transition-colors duration-200"
            >
              Refund Policy
            </Link>
            <Link
              href="/policies/acceptable-use"
              className="text-xs sm:text-sm text-white/75 hover:text-white transition-colors duration-200"
            >
              Acceptable Use
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}