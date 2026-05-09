"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const links = [
  { href: "#servicos", label: "Serviços" },
  { href: "#como-funciona", label: "Como Funciona" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-expert.png"
            alt="Expert Soluções Financeiras"
            width={160}
            height={52}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-gray-600 hover:text-navy-800 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/admin"
            className="text-sm text-navy-600 hover:text-navy-800 transition-colors"
          >
            Área Admin
          </Link>
          <Link
            href="#servicos"
            className="bg-navy-800 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-navy-700 transition-colors"
          >
            Solicitar Agora
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 text-navy-800"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-3">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-sm text-gray-700 hover:text-navy-800 py-1"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="#servicos"
            onClick={() => setOpen(false)}
            className="mt-2 bg-navy-800 text-white text-sm font-medium px-4 py-2 rounded-lg text-center"
          >
            Solicitar Agora
          </Link>
        </div>
      )}
    </header>
  );
}
