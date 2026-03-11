'use no memo';

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function QuickAddWidget() {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'acme:///add' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0d1d2d',
        borderRadius: 16,
        borderColor: '#1f2d3d',
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      accessibilityLabel="Quick add task widget"
    >
      <FlexWidget style={{ width: 'wrap_content' }}>
        <TextWidget
          text="Quick Add"
          style={{
            color: '#f8fafc',
            fontSize: 17,
          }}
        />
        <TextWidget
          text="Tap to open add task"
          style={{
            color: '#8ea6bd',
            fontSize: 12,
          }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          height: 36,
          width: 36,
          borderRadius: 10,
          backgroundColor: '#65a25c',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget
          text="+"
          style={{
            color: '#ffffff',
            fontSize: 20,
            textAlign: 'center',
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
