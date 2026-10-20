import type { ReactNode } from 'react';
import { MenuView } from '@expo/ui/community/menu';
import type { MenuAction, NativeActionEvent } from '@expo/ui/community/menu';

export type TranslationLanguageMenuProps = {
  actions: MenuAction[];
  onPressAction?: (event: NativeActionEvent) => void;
  isDarkMode?: boolean;
  children: ReactNode;
};

export function TranslationLanguageMenu({
  actions,
  onPressAction,
  isDarkMode,
  children,
}: TranslationLanguageMenuProps) {
  return (
    <MenuView
      actions={actions}
      onPressAction={onPressAction}
      colorScheme={isDarkMode ? 'dark' : 'light'}>
      {children}
    </MenuView>
  );
}
