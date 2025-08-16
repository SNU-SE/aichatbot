import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../utils/cn';

interface SidebarItem {
  label: string;
  href: string;
  icon?: ReactNode;
  badge?: string | number;
}

interface SidebarProps {
  items: SidebarItem[];
  className?: string;
}

export default function Sidebar({ items, className }: SidebarProps) {
  return (
    <aside className={cn('w-64 bg-white border-r border-gray-200', className)}>
      <nav className="p-4 space-y-2">
        {items.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )
            }
          >
            <div className="flex items-center space-x-3">
              {item.icon}
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}