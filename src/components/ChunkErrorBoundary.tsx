import React from 'react';

interface ChunkErrorBoundaryProps {
  children: React.ReactNode;
}

interface ChunkErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ChunkErrorBoundary extends React.Component<
  ChunkErrorBoundaryProps,
  ChunkErrorBoundaryState
> {
  constructor(props: ChunkErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ChunkErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Lỗi tải phân hệ động (Chunk Load Error)',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div
            className="max-w-md w-full rounded-xl border p-5 text-center space-y-3"
            style={{
              backgroundColor: 'var(--panel)',
              borderColor: 'var(--line-d)',
              color: 'var(--chu)',
            }}
          >
            <div className="text-sm font-bold" style={{ color: 'var(--son)' }}>
              ⚠️ Không thể tải phân hệ vừa chọn
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--chu-m)' }}>
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white cursor-pointer"
              style={{ backgroundColor: 'var(--navy)' }}
            >
              🔄 Tải lại ứng dụng
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
