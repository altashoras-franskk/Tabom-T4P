import React from 'react';

type FallbackRender = (args: { error: Error; reset: () => void }) => React.ReactNode;

export class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    resetKeys?: unknown[];
    onError?: (error: Error, info: React.ErrorInfo) => void;
    fallbackRender?: FallbackRender;
  },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps: Readonly<React.ComponentProps<typeof ErrorBoundary>>) {
    if (!this.state.error) return;
    const prev = prevProps.resetKeys ?? [];
    const next = this.props.resetKeys ?? [];
    if (areResetKeysEqual(prev, next)) return;
    this.reset();
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      const fallback = this.props.fallbackRender?.({ error, reset: this.reset });
      return fallback ?? null;
    }
    return this.props.children;
  }
}

function areResetKeysEqual(a: unknown[], b: unknown[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

