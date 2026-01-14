'use client';

import Link from 'next/link';
import { Github, Twitter, Linkedin } from 'lucide-react';

const footerLinks = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#' },
      { label: 'Documentation', href: '#' },
      { label: 'API Reference', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Cookie Policy', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-gray-800 bg-gray-950">
      <div className="container mx-auto px-6 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <img
                src="/blockmind_logo_noBackGround.png"
                alt="BlockMind Logo"
                className="w-10 h-10"
              />
              <span className="text-xl text-white font-sora">
                <span className="font-bold">Block</span>
                <span className="font-normal">Mind</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm mb-4 max-w-xs">
              AI의 맥락을 블록으로 조립하여 완벽한 대화를 설계하는 차세대 플랫폼
            </p>

            {/* Social Links */}
            <div className="flex gap-3">
              <Link
                href="#"
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <Github className="w-5 h-5" />
              </Link>
              <Link
                href="#"
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </Link>
              <Link
                href="#"
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Link Columns */}
          {footerLinks.map((column, index) => (
            <div key={index}>
              <h3 className="text-white font-semibold mb-4">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} BlockMind. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="text-gray-500 hover:text-gray-400 text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="text-gray-500 hover:text-gray-400 text-sm transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
