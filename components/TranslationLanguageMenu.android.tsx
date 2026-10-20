import { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  DropdownMenu,
  DropdownMenuItem,
  Host,
  RNHostView,
  Text,
} from '@expo/ui/jetpack-compose';

import type { TranslationLanguageMenuProps } from './TranslationLanguageMenu';

const LIGHT_MENU_BACKGROUND = '#18464a';
const DARK_MENU_BACKGROUND = '#1c3d4d';
const MENU_FOREGROUND = '#ffffff';

export function TranslationLanguageMenu({
  actions,
  onPressAction,
  isDarkMode,
  children,
}: TranslationLanguageMenuProps) {
  const [expanded, setExpanded] = useState(false);
  const background = isDarkMode ? DARK_MENU_BACKGROUND : LIGHT_MENU_BACKGROUND;

  return (
    <View>
      <Host colorScheme={isDarkMode ? 'dark' : 'light'} matchContents>
        <DropdownMenu
          expanded={expanded}
          onDismissRequest={() => setExpanded(false)}
          color={background}
          cornerRadius={16}>
          <DropdownMenu.Trigger>
            <RNHostView matchContents>
              <Pressable
                onPress={() => setExpanded(true)}
                android_disableSound
                focusable={false}
                accessible={false}>
                {children}
              </Pressable>
            </RNHostView>
          </DropdownMenu.Trigger>
          <DropdownMenu.Items>
            {actions.map((action) => {
              const id = action.id ?? action.title;
              return (
                <DropdownMenuItem
                  key={id}
                  enabled={action.attributes?.disabled !== true}
                  elementColors={{
                    textColor: MENU_FOREGROUND,
                    disabledTextColor: MENU_FOREGROUND,
                    trailingIconColor: MENU_FOREGROUND,
                  }}
                  onClick={() => {
                    setExpanded(false);
                    onPressAction?.({ nativeEvent: { event: id } });
                  }}>
                  <DropdownMenuItem.Text>
                    <Text color={MENU_FOREGROUND}>{action.title}</Text>
                  </DropdownMenuItem.Text>
                  {action.state === 'on' && (
                    <DropdownMenuItem.TrailingIcon>
                      <Text color={MENU_FOREGROUND}>✓</Text>
                    </DropdownMenuItem.TrailingIcon>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenu.Items>
        </DropdownMenu>
      </Host>
    </View>
  );
}
