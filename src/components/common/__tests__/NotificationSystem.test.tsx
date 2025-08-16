import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationSystem } from '../NotificationSystem';

// Mock timers for testing auto-dismiss functionality
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('NotificationSystem Component', () => {
  it('renders without crashing', () => {
    render(<NotificationSystem />);
    expect(screen.getByTestId('notification-container')).toBeInTheDocument();
  });

  it('displays success notification', () => {
    render(<NotificationSystem />);
    
    // Trigger a success notification
    act(() => {
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          type: 'success',
          message: 'Operation successful!',
          title: 'Success'
        }
      }));
    });
    
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Operation successful!')).toBeInTheDocument();
    expect(screen.getByTestId('success-notification')).toBeInTheDocument();
  });

  it('displays error notification', () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          type: 'error',
          message: 'Something went wrong!',
          title: 'Error'
        }
      }));
    });
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong!')).toBeInTheDocument();
    expect(screen.getByTestId('error-notification')).toBeInTheDocument();
  });

  it('displays warning notification', () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          type: 'warning',
          message: 'Please be careful!',
          title: 'Warning'
        }
      }));
    });
    
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Please be careful!')).toBeInTheDocument();
    expect(screen.getByTestId('warning-notification')).toBeInTheDocument();
  });

  it('displays info notification', () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          type: 'info',
          message: 'Here is some information.',
          title: 'Info'
        }
      }));
    });
    
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Here is some information.')).toBeInTheDocument();
    expect(screen.getByTestId('info-notification')).toBeInTheDocument();
  });

  it('auto-dismisses notifications after timeout', () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          type: 'success',
          message: 'Auto dismiss test',
          duration: 3000
        }
      }));
    });
    
    expect(screen.getByText('Auto dismiss test')).toBeInTheDocument();
    
    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    expect(screen.queryByText('Auto dismiss test')).not.toBeInTheDocument();
  });

  it('does not auto-dismiss when duration is 0', () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          type: 'error',
          message: 'Persistent notification',
          duration: 0
        }
      }));
    });
    
    expect(screen.getByText('Persistent notification')).toBeInTheDocument();
    
    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    
    expect(screen.getByText('Persistent notification')).toBeInTheDocument();
  });

  it('manually dismisses notification when close button is clicked', () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          type: 'info',
          message: 'Manual dismiss test',
          dismissible: true
        }
      }));
    });
    
    expect(screen.getByText('Manual dismiss test')).toBeInTheDocument();
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    act(() => {
      closeButton.click();
    });
    
    expect(screen.queryByText('Manual dismiss test')).not.toBeInTheDocument();
  });

  it('displays multiple notifications', () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          type: 'success',
          message: 'First notification'
        }
      }));
      
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          type: 'error',
          message: 'Second notification'
        }
      }));
    });
    
    expect(screen.getByText('First notification')).toBeInTheDocument();
    expect(screen.getByText('Second notification')).toBeInTheDocument();
  });

  it('limits the number of notifications displayed', () => {
    render(<NotificationSystem maxNotifications={2} />);
    
    act(() => {
      // Add 3 notifications
      for (let i = 1; i <= 3; i++) {
        window.dispatchEvent(new CustomEvent('notification', {
          detail: {
            type: 'info',
            message: `Notification ${i}`
          }
        }));
      }
    });
    
    // Only the last 2 should be visible
    expect(screen.queryByText('Notification 1')).not.toBeInTheDocument();
    expect(screen.getByText('Notification 2')).toBeInTheDocument();
    expect(screen.getByText('Notification 3')).toBeInTheDocument();
  });

  it('applies correct positioning classes', () => {
    const { rerender } = render(<NotificationSystem position="top-right" />);
    expect(screen.getByTestId('notification-container')).toHaveClass('top-4', 'right-4');
    
    rerender(<NotificationSystem position="bottom-left" />);
    expect(screen.getByTestId('notification-container')).toHaveClass('bottom-4', 'left-4');
    
    rerender(<NotificationSystem position="top-center" />);
    expect(screen.getByTestId('notification-container')).toHaveClass('top-4', 'left-1/2', 'transform', '-translate-x-1/2');
  });

  it('handles notification with action button', () => {
    const actionHandler = vi.fn();
    
    render(<NotificationSystem />);
    
    act(() => {
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          type: 'info',
          message: 'Notification with action',
          action: {
            label: 'Undo',
            handler: actionHandler
          }
        }
      }));
    });
    
    const actionButton = screen.getByRole('button', { name: 'Undo' });
    expect(actionButton).toBeInTheDocument();
    
    act(() => {
      actionButton.click();
    });
    
    expect(actionHandler).toHaveBeenCalledTimes(1);
  });

  it('applies custom className to notifications', () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          type: 'success',
          message: 'Custom class test',
          className: 'custom-notification'
        }
      }));
    });
    
    expect(screen.getByTestId('success-notification')).toHaveClass('custom-notification');
  });

  it('handles notification with HTML content', () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          type: 'info',
          message: 'Visit <a href="/help">help page</a>',
          allowHTML: true
        }
      }));
    });
    
    expect(screen.getByRole('link', { name: 'help page' })).toBeInTheDocument();
  });

  it('sanitizes HTML content when allowHTML is false', () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          type: 'info',
          message: 'Visit <a href="/help">help page</a>',
          allowHTML: false
        }
      }));
    });
    
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Visit <a href="/help">help page</a>')).toBeInTheDocument();
  });
});