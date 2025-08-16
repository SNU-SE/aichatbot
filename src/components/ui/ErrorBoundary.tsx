import { Component, ReactNode } from 'react';
import Button from './Button';
import Card, { CardHeader, CardTitle, CardContent } from './Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-red-600">오류가 발생했습니다</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
              </p>
              {this.state.error && (
                <details className="mb-4">
                  <summary className="text-sm text-gray-500 cursor-pointer">
                    기술적 세부사항
                  </summary>
                  <pre className="text-xs text-gray-400 mt-2 p-2 bg-gray-100 rounded overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <div className="flex space-x-2">
                <Button
                  onClick={() => window.location.reload()}
                  variant="primary"
                >
                  페이지 새로고침
                </Button>
                <Button
                  onClick={() => this.setState({ hasError: false, error: undefined })}
                  variant="outline"
                >
                  다시 시도
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}