"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { User } from "lucide-react";

export default function NavbarProfile() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const { firstName, lastName, phone, profileImg, companyId } =
    session.user as any;

  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "User";

  const imageSrc = profileImg || null;

  return (
    <div className="flex ml-6 mb-3 items-center gap-3 cursor-pointer select-none">
      {/* Avatar */}
      <div className="relative w-9 h-9 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt="Profile"
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <User className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {/* Name + Phone */}
      <div className="hidden sm:flex flex-col leading-tight">
        <span className="text-sm font-medium text-gray-900">{fullName}</span>
        {phone && <span className="text-xs text-gray-500">{phone}</span>}
      </div>
    </div>
  );
}
