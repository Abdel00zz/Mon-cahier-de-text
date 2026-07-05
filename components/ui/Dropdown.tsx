import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './button';

interface DropdownProps {
  buttonContent: React.ReactNode;
  children: React.ReactNode;
  buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

export const Dropdown: React.FC<DropdownProps> = ({ buttonContent, children, buttonProps = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({ 
    position: 'fixed',
    top: -9999, 
    left: -9999, 
    opacity: 0,
    visibility: 'hidden',
    transform: 'scale(0.95)',
    transformOrigin: 'top right'
  });
  const positionTimeoutRef = useRef<number>();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target) &&
          menuRef.current && !menuRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset positioning state when menu closes
  useEffect(() => {
    if (!isOpen) {
      if (positionTimeoutRef.current) {
        clearTimeout(positionTimeoutRef.current);
      }
      setMenuStyle(prev => ({ 
        ...prev,
        opacity: 0,
        visibility: 'hidden',
        transform: 'scale(0.95)'
      }));
    }
  }, [isOpen]);

  // Intelligent positioning system
  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) {
      return;
    }
    
    const calculatePosition = () => {
      if (!buttonRef.current || !menuRef.current) return null;
      
      const gap = 8;
      const rect = buttonRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      // Force layout calculation
      menuRef.current.style.visibility = 'hidden';
      menuRef.current.style.opacity = '1';
      menuRef.current.style.transform = 'none';
      
      const mw = menuRef.current.offsetWidth || 256;
      const mh = menuRef.current.offsetHeight || 200;
      
      // Smart positioning logic
      let top = rect.bottom + gap;
      let left = rect.right - mw;
      let transformOrigin = 'top right';
      
      // Horizontal adjustments
      if (left < gap) {
        left = rect.left;
        transformOrigin = 'top left';
      }
      if (left + mw > vw - gap) {
        left = Math.max(gap, vw - mw - gap);
        transformOrigin = 'top right';
      }
      
      // Vertical adjustments
      if (top + mh > vh - gap) {
        top = Math.max(gap, rect.top - mh - gap);
        transformOrigin = transformOrigin.replace('top', 'bottom');
      }
      
      return { top, left, transformOrigin, mw, mh };
    };
    
    const positionMenu = () => {
      const position = calculatePosition();
      if (!position) return;
      
      const { top, left, transformOrigin } = position;
      
      setMenuStyle({
        position: 'fixed',
        top,
        left,
        opacity: 1,
        visibility: 'visible',
        transform: 'scale(1)',
        transformOrigin,
        transition: 'opacity 150ms ease-out, transform 150ms ease-out'
      });
    };
    
    // Multi-stage positioning for maximum reliability
    if (menuRef.current) {
      // Stage 1: Immediate positioning if dimensions available
      if (menuRef.current.offsetWidth > 0) {
        positionMenu();
      } else {
        // Stage 2: Wait for next frame
        positionTimeoutRef.current = window.requestAnimationFrame(() => {
          if (menuRef.current?.offsetWidth > 0) {
            positionMenu();
          } else {
            // Stage 3: Fallback with small delay
            positionTimeoutRef.current = window.setTimeout(positionMenu, 10);
          }
        });
      }
    }
    
    return () => {
      if (positionTimeoutRef.current) {
        clearTimeout(positionTimeoutRef.current);
        cancelAnimationFrame(positionTimeoutRef.current);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onScrollOrResize = () => setIsOpen(false);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [isOpen]);

  const defaultButtonProps: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant: 'icon'; 'data-tippy-content': string } = {
    variant: 'icon',
    'data-tippy-content': "Plus d'actions"
  };

  const finalButtonProps = { ...defaultButtonProps, ...buttonProps };

  const enhanceItems = (nodes: React.ReactNode): React.ReactNode => React.Children.map(nodes, (child) => {
    if (!React.isValidElement(child)) return child;
    if (child.type === DropdownItem) {
      return React.cloneElement(child as React.ReactElement<any>, {
        onDropdownClose: () => setIsOpen(false),
      });
    }
    if ((child as React.ReactElement<any>).props?.children) {
      return React.cloneElement(child as React.ReactElement<any>, {
        children: enhanceItems((child as React.ReactElement<any>).props.children),
      });
    }
    return child;
  });

  return (
    <div className="relative z-[60]" ref={dropdownRef}>
        <Button 
          ref={buttonRef as any} 
          onClick={() => setIsOpen(!isOpen)} 
          className="h-10 w-10 rounded-full border border-[#B7D7A8] bg-[#E9F7E4] text-[#24533A] shadow-sm hover:bg-[#DDF0D5] active:bg-[#CBE7C0]"
          {...finalButtonProps}
        >
            {buttonContent}
        </Button>
      
      {isOpen && createPortal(
        <>
          {/* Backdrop pour fermer sur mobile */}
          <div 
            className="fixed inset-0 bg-black/5 z-[65] md:hidden" 
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={menuRef}
            className="z-[70] max-h-[80vh] min-w-64 overflow-y-auto overscroll-contain rounded-2xl border border-[#B7D7A8] bg-[#F4FAF2] p-1.5 text-[#1F3A2D] shadow-2xl shadow-emerald-950/15 ring-1 ring-white/70"
            style={menuStyle}
            role="menu"
          >
            {enhanceItems(children)}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export const DropdownItem: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { onDropdownClose?: () => void; inset?: boolean }> = ({ children, className = '', onClick, onDropdownClose, inset = false, ...props }) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (onClick) {
            onClick(e);
        }
        // Close dropdown after a small delay to allow the action to complete
        setTimeout(() => {
            if (onDropdownClose) {
                onDropdownClose();
            }
        }, 50);
    };
    
    return (
        <button 
            {...props} 
            onClick={handleClick} 
            className={`flex w-full min-h-11 items-center gap-3 rounded-md ${inset ? 'pl-8 pr-3' : 'px-3'} py-2.5 text-left text-sm font-medium text-[#1F3A2D] outline-none transition-colors duration-150 hover:bg-[#DFF1D8] hover:text-[#123222] focus:bg-[#DFF1D8] focus:text-[#123222] active:bg-[#CBE7C0] disabled:pointer-events-none disabled:opacity-50 ${className}`}
        >
            {children}
        </button>
    );
};

export const DropdownDivider: React.FC = () => <hr className="my-1 border-[#B7D7A8]/70" />;

export const DropdownLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#53755D]">
    {children}
  </div>
);