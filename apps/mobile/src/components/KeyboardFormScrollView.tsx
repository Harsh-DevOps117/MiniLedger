import { createContext, useCallback, useEffect, useRef } from 'react';
import { Keyboard, Platform, ScrollView, TextInput, type ScrollViewProps } from 'react-native';

export const RevealFocusedFieldContext = createContext<(() => void) | undefined>(undefined);

/** Keeps Field inputs visible after the native keyboard and form finish laying out. */
export function KeyboardFormScrollView({
  onScroll,
  onLayout,
  onContentSizeChange,
  ...props
}: ScrollViewProps) {
  const scroll = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const frame = useRef<number | null>(null);

  const revealFocusedField = useCallback(() => {
    if (Platform.OS === 'web') return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const input = TextInput.State.currentlyFocusedInput();
      if (!input || !Keyboard.isVisible()) return;
      input.measureInWindow((_x, inputY, _width, inputHeight) => {
        scroll.current
          ?.getNativeScrollRef()
          ?.measureInWindow((_scrollX, viewportY, _viewportWidth, viewportHeight) => {
            if (!Keyboard.isVisible() || TextInput.State.currentlyFocusedInput() !== input) return;
            const viewportBottom = viewportY + viewportHeight;
            const visibleBottom =
              Math.min(viewportBottom, Keyboard.metrics()?.screenY ?? viewportBottom) - 20;
            const overlap = inputY + inputHeight - visibleBottom;
            if (overlap > 0) {
              scroll.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
            } else if (inputY < viewportY + 20) {
              scroll.current?.scrollTo({
                y: Math.max(0, scrollY.current + inputY - viewportY - 20),
                animated: true,
              });
            }
          });
      });
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener('keyboardDidShow', revealFocusedField);
    const change = Keyboard.addListener('keyboardDidChangeFrame', revealFocusedField);
    return () => {
      show.remove();
      change.remove();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [revealFocusedField]);

  return (
    <RevealFocusedFieldContext.Provider value={revealFocusedField}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        scrollEventThrottle={16}
        {...props}
        ref={scroll}
        onScroll={(event) => {
          scrollY.current = event.nativeEvent.contentOffset.y;
          onScroll?.(event);
        }}
        onLayout={(event) => {
          onLayout?.(event);
          revealFocusedField();
        }}
        onContentSizeChange={(width, height) => {
          onContentSizeChange?.(width, height);
          revealFocusedField();
        }}
      />
    </RevealFocusedFieldContext.Provider>
  );
}
