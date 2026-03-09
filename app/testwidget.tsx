import { StyleSheet, View } from 'react-native'
import React from 'react'
import { WidgetPreview } from 'react-native-android-widget';
import { HelloWidget } from '@/widgets/HelloWidget';


export default function testwidget() {
  return (
    <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
 <WidgetPreview
        renderWidget={() => <HelloWidget />}
        width={320}
        height={200}
      />
      </View>
  )
}

const styles = StyleSheet.create({

})