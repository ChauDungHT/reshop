import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResolutionForm from '../pages/admin/disputes/ResolutionForm';

describe('ResolutionForm React Component', () => {
  it('should render judgment options and form controls correctly', () => {
    render(
      <ResolutionForm
        refundAmount={150000}
        customerName="Jane Doe"
        vendorName="Smart Store"
        isSubmitting={false}
        onSubmit={vi.fn()}
      />
    );

    // Verify headers and labels
    expect(screen.getByText('⚖️ Quyết định Phân xử của Admin')).toBeInTheDocument();
    expect(screen.getByText('Bên Thắng Cuộc')).toBeInTheDocument();
    expect(screen.getByText('Khách hàng thắng')).toBeInTheDocument();
    expect(screen.getByText('Người bán thắng')).toBeInTheDocument();
    expect(screen.getByText('Ghi chú Phân xử (Bắt buộc)')).toBeInTheDocument();
    
    // Verify inputs
    expect(screen.getByPlaceholderText('Nhập lý do phân xử và các bằng chứng đối chiếu...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đóng Tranh Chấp & Ban Hành Quyết Định' })).toBeInTheDocument();
  });

  it('should display error message when trying to submit without admin notes', () => {
    render(
      <ResolutionForm
        refundAmount={150000}
        customerName="Jane Doe"
        vendorName="Smart Store"
        isSubmitting={false}
        onSubmit={vi.fn()}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Đóng Tranh Chấp & Ban Hành Quyết Định' });
    fireEvent.click(submitBtn);

    // Validate notes warning
    expect(screen.getByText('Vui lòng nhập ghi chú phân xử của Admin.')).toBeInTheDocument();
  });

  it('should show double confirmation dialog when form is valid', () => {
    render(
      <ResolutionForm
        refundAmount={150000}
        customerName="Jane Doe"
        vendorName="Smart Store"
        isSubmitting={false}
        onSubmit={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText('Nhập lý do phân xử và các bằng chứng đối chiếu...');
    fireEvent.change(textarea, { target: { value: 'Evidence matches customer claim.' } });

    const submitBtn = screen.getByRole('button', { name: 'Đóng Tranh Chấp & Ban Hành Quyết Định' });
    fireEvent.click(submitBtn);

    // Double confirmation modal should open
    expect(screen.getByText('Xác Nhận Quyết Định Phân Xử')).toBeInTheDocument();
    expect(screen.getByText(/sẽ được hoàn lại số tiền/)).toBeInTheDocument();
    expect(screen.getAllByText(/Jane Doe/)[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đồng ý, Thực thi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeInTheDocument();
  });

  it('should close double confirmation dialog when clicking Cancel', () => {
    render(
      <ResolutionForm
        refundAmount={150000}
        customerName="Jane Doe"
        vendorName="Smart Store"
        isSubmitting={false}
        onSubmit={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText('Nhập lý do phân xử và các bằng chứng đối chiếu...');
    fireEvent.change(textarea, { target: { value: 'Evidence matches customer claim.' } });

    const submitBtn = screen.getByRole('button', { name: 'Đóng Tranh Chấp & Ban Hành Quyết Định' });
    fireEvent.click(submitBtn);

    const cancelBtn = screen.getByRole('button', { name: 'Hủy' });
    fireEvent.click(cancelBtn);

    // Double confirmation modal should close
    expect(screen.queryByText('Xác Nhận Quyết Định Phân Xử')).not.toBeInTheDocument();
  });

  it('should trigger onSubmit callback with proper parameters when clicking Confirm', () => {
    const mockSubmit = vi.fn();
    render(
      <ResolutionForm
        refundAmount={150000}
        customerName="Jane Doe"
        vendorName="Smart Store"
        isSubmitting={false}
        onSubmit={mockSubmit}
      />
    );

    const textarea = screen.getByPlaceholderText('Nhập lý do phân xử và các bằng chứng đối chiếu...');
    fireEvent.change(textarea, { target: { value: 'Evidence matches customer claim.' } });

    // Choose Vendor as winner
    const vendorRadio = screen.getByLabelText(/Người bán thắng/);
    fireEvent.click(vendorRadio);

    const submitBtn = screen.getByRole('button', { name: 'Đóng Tranh Chấp & Ban Hành Quyết Định' });
    fireEvent.click(submitBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Đồng ý, Thực thi' });
    fireEvent.click(confirmBtn);

    // Verify onSubmit parameters
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith('vendor', 'Evidence matches customer claim.');
  });
});
