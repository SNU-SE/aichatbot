import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from '../Modal';

describe('Modal Component', () => {
  it('renders modal when open is true', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('does not render modal when open is false', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });

  it('calls onClose when overlay is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose}>
        <div>Modal Content</div>
      </Modal>
    );
    
    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose}>
        <div>Modal Content</div>
      </Modal>
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside modal content', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose}>
        <div data-testid="modal-content">Modal Content</div>
      </Modal>
    );
    
    const content = screen.getByTestId('modal-content');
    fireEvent.click(content);
    
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('renders modal with title', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Test Modal">
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
  });

  it('renders close button when showCloseButton is true', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose} showCloseButton={true}>
        <div>Modal Content</div>
      </Modal>
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
    
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('applies custom size classes', () => {
    const { rerender } = render(
      <Modal open={true} onClose={() => {}} size="sm">
        <div>Small Modal</div>
      </Modal>
    );
    
    expect(screen.getByRole('dialog')).toHaveClass('max-w-sm');
    
    rerender(
      <Modal open={true} onClose={() => {}} size="lg">
        <div>Large Modal</div>
      </Modal>
    );
    
    expect(screen.getByRole('dialog')).toHaveClass('max-w-4xl');
  });

  it('prevents body scroll when modal is open', () => {
    const { rerender } = render(
      <Modal open={true} onClose={() => {}}>
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(document.body).toHaveClass('overflow-hidden');
    
    rerender(
      <Modal open={false} onClose={() => {}}>
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(document.body).not.toHaveClass('overflow-hidden');
  });

  it('focuses modal when opened', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('traps focus within modal', () => {
    render(
      <Modal open={true} onClose={() => {}}>
        <div>
          <button>First Button</button>
          <button>Second Button</button>
        </div>
      </Modal>
    );
    
    const firstButton = screen.getByText('First Button');
    const secondButton = screen.getByText('Second Button');
    
    // Tab should cycle through focusable elements
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(firstButton).toHaveFocus();
    
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(secondButton).toHaveFocus();
    
    // Shift+Tab should go backwards
    fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true });
    expect(firstButton).toHaveFocus();
  });

  it('restores focus to trigger element when closed', () => {
    const triggerButton = document.createElement('button');
    triggerButton.textContent = 'Open Modal';
    document.body.appendChild(triggerButton);
    triggerButton.focus();
    
    const { rerender } = render(
      <Modal open={true} onClose={() => {}}>
        <div>Modal Content</div>
      </Modal>
    );
    
    rerender(
      <Modal open={false} onClose={() => {}}>
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(triggerButton).toHaveFocus();
    
    document.body.removeChild(triggerButton);
  });

  it('supports custom className', () => {
    render(
      <Modal open={true} onClose={() => {}} className="custom-modal">
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(screen.getByRole('dialog')).toHaveClass('custom-modal');
  });

  it('supports portal rendering', () => {
    render(
      <Modal open={true} onClose={() => {}} portal={true}>
        <div>Portal Modal</div>
      </Modal>
    );
    
    // Modal should be rendered in a portal (outside the normal DOM tree)
    expect(screen.getByText('Portal Modal')).toBeInTheDocument();
  });
});