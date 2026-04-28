import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface BaseButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

type ButtonLinkProps = BaseButtonProps & {
  href: string;
  target?: string;
  rel?: string;
};

type ButtonNativeProps = BaseButtonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type ButtonProps = ButtonLinkProps | ButtonNativeProps;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-command/80 bg-[linear-gradient(135deg,#1d4ed8,#0891b2)] text-white shadow-[0_14px_30px_rgba(29,78,216,0.22)] hover:-translate-y-0.5 hover:border-command hover:shadow-[0_20px_40px_rgba(29,78,216,0.28)]",
  secondary:
    "border border-border bg-white/90 text-command shadow-[0_10px_24px_rgba(23,32,51,0.06)] hover:-translate-y-0.5 hover:border-command/30 hover:bg-command/8 hover:shadow-[0_18px_30px_rgba(23,32,51,0.1)]",
  ghost:
    "border border-white/20 bg-white/10 text-white shadow-[0_10px_20px_rgba(15,23,42,0.14)] hover:-translate-y-0.5 hover:bg-white/18",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2.5 text-sm",
  md: "px-5 py-3 text-sm",
  lg: "px-6 py-3.5 text-sm",
};

const baseClasses =
  "inline-flex items-center justify-center rounded-full font-semibold transition duration-200 focus:outline-none focus:ring-4 focus:ring-command/15 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60";

export function Button(props: ButtonProps) {
  const variant = props.variant ?? "primary";
  const size = props.size ?? "md";
  const className = cn(baseClasses, variantClasses[variant], sizeClasses[size], props.className);

  if ("href" in props && props.href) {
    const { href, target, rel, children } = props;

    return (
      <Link href={href} target={target} rel={rel} className={className}>
        {children}
      </Link>
    );
  }

  const { children, type, ...buttonProps } = props as ButtonNativeProps;

  return (
    <button type={type ?? "button"} className={className} {...buttonProps}>
      {children}
    </button>
  );
}
