import { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  sidebarItems?: Array<{
    label: string;
    href: string;
    icon?: ReactNode;
    badge?: string | number;
  }>;
  showSidebar?: boolean;
}

export default function Layout({
  children,
  title,
  subtitle,
  headerActions,
  sidebarItems = [],
  showSidebar = false,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title={title} 
        subtitle={subtitle} 
        actions={headerActions} 
      />
      
      <div className="flex">
        {showSidebar && sidebarItems.length > 0 && (
          <Sidebar items={sidebarItems} />
        )}
        
        <main className="flex-1">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}