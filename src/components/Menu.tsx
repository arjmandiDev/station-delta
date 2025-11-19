/**
 * Website menu component with social links and contact.
 * 
 * Purpose: Provides navigation menu for website features.
 * Responsibilities: Display menu, handle navigation, show social links.
 * Inputs: Menu configuration, social links.
 * Outputs: Rendered menu UI.
 * Side effects: None (UI only).
 */

import { useState } from 'react';

interface SocialLink {
  name: string;
  url: string;
  icon?: string;
}

interface MenuProps {
  socialLinks?: SocialLink[];
  contactUrl?: string;
}

export function Menu({ socialLinks = [], contactUrl = '/contact' }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const defaultSocialLinks: SocialLink[] = [
    { name: 'Twitter', url: 'https://twitter.com', icon: '🐦' },
    { name: 'GitHub', url: 'https://github.com', icon: '💻' },
    { name: 'LinkedIn', url: 'https://linkedin.com', icon: '💼' },
  ];

  const links = socialLinks.length > 0 ? socialLinks : defaultSocialLinks;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          backdropFilter: 'blur(4px)',
        }}
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: '60px',
            right: '20px',
            zIndex: 999,
            background: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            padding: '20px',
            minWidth: '200px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <nav>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
              }}
            >
              {links.map((link) => (
                <li key={link.name} style={{ marginBottom: '10px' }}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'white',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {link.icon && <span>{link.icon}</span>}
                    <span>{link.name}</span>
                  </a>
                </li>
              ))}
              <li style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <a
                  href={contactUrl}
                  style={{
                    color: 'white',
                    textDecoration: 'none',
                  }}
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}

