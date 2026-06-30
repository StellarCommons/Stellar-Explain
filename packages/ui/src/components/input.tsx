import * as React from "react";
import { Eye, EyeOff, Check, Lock, Mail } from "lucide-react";

import { cn } from "../../lib/utils";
import { Spinner } from "./spinner";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "error" | "success";
  password?: boolean;
  loading?: boolean;
  email?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      password,
      email,
      variant = "default",
      loading,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);

    const variantStyles = {
      default: "border-border ",
      error: " border-destructive ",
      success: "border-[#55DD99]",
    };

    const inputType = password
      ? showPassword
        ? "text"
        : "password"
      : email
        ? "email"
        : type;

    return (
      <div className="relative">
        {password && (
          <Lock
            size={18}
            className="absolute bottom-1/2 left-3 translate-y-1/2 text-[#757A80]  hover:text-gray-600"
          />
        )}
        {email && (
          <Mail
            size={18}
            className="absolute bottom-1/2 left-3 translate-y-1/2 text-[#757A80] hover:text-gray-600"
          />
        )}
        <input
          type={inputType}
          className={cn(
            " placeholder:text-input border flex h-12 w-full rounded-md px-3 py-2 font-sans  focus:border-blue-500 focus:ring-blue-500 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:border-2 ",
            variantStyles[variant],
            "aria-[invalid=true]:border-destructive",
            className,
            (password || email) && "px-10",
          )}
          ref={ref}
          suppressHydrationWarning
          {...props}
        />
        {password && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-[#757A80] hover:text-gray-600"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        {loading && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2">
            <Spinner height={20} width={20} />
          </div>
        )}
        {variant === "success" && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2 text-[#55DD99]">
            <Check size={20} />
          </div>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
