var _interopRequireWildcard=require("@babel/runtime/helpers/interopRequireWildcard").default;
var _interopRequireDefault=require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports,"__esModule",{
value:true
}
);
exports.default=Share2;
var _asyncToGenerator2=_interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _slicedToArray2=_interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _react=require("react");
var _expoRouter=require("expo-router");
var _reactNative=require("react-native");
var _reactNativeSafeAreaContext=require("react-native-safe-area-context");
var _expoLinearGradient=require("expo-linear-gradient");
var _expoStatusBar=require("expo-status-bar");
var _vectorIcons=require("@expo/vector-icons");
var _FontAwesome=_interopRequireDefault(require("@expo/vector-icons/FontAwesome5"));
var _Ionicons=_interopRequireDefault(require("@expo/vector-icons/Ionicons"));
var _store=require("../lib/store");
var _haptics=require("../lib/haptics");
var _reactNativeViewShot=_interopRequireWildcard(require("react-native-view-shot"));
var Sharing=_interopRequireWildcard(require("expo-sharing"));
var MediaLibrary=_interopRequireWildcard(require("expo-media-library"));
var _appToast=require("../lib/appToast");
var _shloka=require("../lib/shloka");
var _slider=require("../components/ui/slider");
var _shareBackgrounds=require("../lib/shareBackgrounds");
var _jsxRuntime=require("react-native-css-interop/jsx-runtime");
var _Dimensions$get=_reactNative.Dimensions.get('window'),SCREEN_WIDTH=_Dimensions$get.width;
var FORMATS=[{
id:'story',label:'Story',aspectRatio:9/16,width:1152,height:2048
}
,{
id:'post',label:'Post',aspectRatio:1,width:2048,height:2048
}
];
var SLIDER_MIN=0;
var SLIDER_MAX=1;
var _worklet_15496740788220_init_data={
code:"function share2Tsx1(value,min,max){
return Math.min(Math.max(value,min),max);

}
",location:"/Users/saaketsurya/Desktop/kriya1/app/share2.tsx",sourceMap:"{
\"version\":3,\"names\":[\"share2Tsx1\",\"min\",\"value\",\"max\",\"Math\"],\"sources\":[\"/Users/saaketsurya/Desktop/kriya1/app/share2.tsx\"],\"mappings\":\"AAoDc,QAAC,CAAAA,UAAeC,CAAAC,KAAa,CAAWD,GAAK,CAAAE,GAAA,EAEzD,MAAO,CAAAC,IAAI,CAACH,GAAG,CAACG,IAAI,CAACD,GAAG,CAACD,KAAK,CAAED,GAAG,CAAC,CAAEE,GAAG,CAAC,CAC5C\",\"ignoreList\":[]
}
"
}
;
var clamp=function share2Tsx1Factory(_ref){
var _worklet_15496740788220_init_data=_ref._worklet_15496740788220_init_data;
var _e=[new global.Error(),1,-27];
var share2Tsx1=function(value,min,max){
return Math.min(Math.max(value,min),max);

}
;
share2Tsx1.__closure={

}
;
share2Tsx1.__workletHash=15496740788220;
share2Tsx1.__pluginVersion="0.8.3";
share2Tsx1.__initData=_worklet_15496740788220_init_data;
share2Tsx1.__stackDetails=_e;
return share2Tsx1;

}
({
_worklet_15496740788220_init_data
}
);
var parseRgba=color=>{
var match=color.match(/rgba?\(([^)]+)\)/i);
if(!match){
return{
red:20,green:10,blue:30,alpha:0.15
}
;

}
var _match$1$split$map=match[1].split(',').map(part=>part.trim()),_match$1$split$map2=(0,_slicedToArray2.default)(_match$1$split$map,4),_match$1$split$map2$=_match$1$split$map2[0],red=_match$1$split$map2$===void 0?'20':_match$1$split$map2$,_match$1$split$map2$2=_match$1$split$map2[1],green=_match$1$split$map2$2===void 0?'10':_match$1$split$map2$2,_match$1$split$map2$3=_match$1$split$map2[2],blue=_match$1$split$map2$3===void 0?'30':_match$1$split$map2$3,_match$1$split$map2$4=_match$1$split$map2[3],alpha=_match$1$split$map2$4===void 0?'1':_match$1$split$map2$4;
return{
red:Number(red),green:Number(green),blue:Number(blue),alpha:clamp(Number(alpha),SLIDER_MIN,SLIDER_MAX)
}
;

}
;
var formatRgba=(_ref2,alpha)=>{
var red=_ref2.red,green=_ref2.green,blue=_ref2.blue;
return`rgba(${
red
}
, ${
green
}
, ${
blue
}
, ${
clamp(alpha,SLIDER_MIN,SLIDER_MAX).toFixed(2)
}
)`;

}
;
var getOverlayJustify=textBoxPosition=>{
if(textBoxPosition==='top')return'flex-start';
if(textBoxPosition==='bottom')return'flex-end';
return'center';

}
;
var ShareCard=(0,_react.memo)(function ShareCard(_ref3){
var previewWidth=_ref3.previewWidth,previewHeight=_ref3.previewHeight,selectedFormat=_ref3.selectedFormat,currentBackground=_ref3.currentBackground,currentBackgroundSource=_ref3.currentBackgroundSource,backgroundOpacity=_ref3.backgroundOpacity,onBackgroundError=_ref3.onBackgroundError,resolvedTextBoxBg=_ref3.resolvedTextBoxBg,chapter=_ref3.chapter,verse=_ref3.verse,text=_ref3.text,translation=_ref3.translation;
return(0,_jsxRuntime.jsxs)(_reactNative.View,{
style:[styles.cardContainer,{
width:previewWidth,height:previewHeight
}
],children:[currentBackground.type==='image'&&currentBackgroundSource?(0,_jsxRuntime.jsxs)(_reactNative.View,{
style:styles.backgroundLayer,children:[(0,_jsxRuntime.jsx)(_reactNative.Image,{
source:currentBackgroundSource,style:[styles.backgroundImage,{
opacity:backgroundOpacity
}
],resizeMode:"cover",onError:event=>onBackgroundError?.(event.nativeEvent.error)
}
),(0,_jsxRuntime.jsx)(_expoLinearGradient.LinearGradient,{
colors:['rgba(15, 12, 41, 0.08)','rgba(22, 33, 62, 0.08)'],style:styles.backgroundTint,start:{
x:0,y:0
}
,end:{
x:1,y:1
}

}
)]
}
):(0,_jsxRuntime.jsx)(_expoLinearGradient.LinearGradient,{
colors:currentBackground.colors,style:styles.backgroundLayer,start:{
x:0,y:0
}
,end:{
x:1,y:1
}

}
),(0,_jsxRuntime.jsxs)(_reactNative.View,{
style:[styles.cardOverlay,{
justifyContent:getOverlayJustify(currentBackground.textBoxPosition)
}
],children:[(0,_jsxRuntime.jsxs)(_reactNative.View,{
style:[styles.textBox,{
backgroundColor:resolvedTextBoxBg
}
],children:[(0,_jsxRuntime.jsx)(_reactNative.Text,{
style:[styles.sanskritText,{
color:currentBackground.textColor
}
],children:text||'धृतराष्ट्र उवाच |\nधर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः |'
}
),(0,_jsxRuntime.jsx)(_reactNative.Text,{
style:[styles.translationText,{
color:currentBackground.translationColor
}
],children:translation||'Dhritarashtra said: O Sanjay, after gathering on the holy field of Kurukshetra...'
}
),(0,_jsxRuntime.jsxs)(_reactNative.Text,{
style:[styles.referenceBottom,{
color:currentBackground.refColor
}
],children:["Bhagavad Gita - Chapter ",chapter,", Verse ",verse]
}
)]
}
),(0,_jsxRuntime.jsxs)(_reactNative.View,{
style:selectedFormat==='story'?styles.brandingWrap:styles.brandingWrapPost,children:[(0,_jsxRuntime.jsx)(_reactNative.Text,{
style:[styles.brandingBottom,{
color:currentBackground.brandingColor
}
],children:"kriya"
}
),(0,_jsxRuntime.jsxs)(_reactNative.View,{
style:styles.platformRow,children:[(0,_jsxRuntime.jsx)(_reactNative.Text,{
style:[styles.platformText,{
color:currentBackground.brandingColor
}
],children:"available on"
}
),(0,_jsxRuntime.jsx)(_Ionicons.default,{
name:"logo-google-playstore",size:8,color:currentBackground.brandingColor
}
),(0,_jsxRuntime.jsx)(_FontAwesome.default,{
name:"app-store-ios",size:8,color:currentBackground.brandingColor
}
)]
}
)]
}
)]
}
)]
}
);

}
);
function Share2(){
var params=(0,_expoRouter.useLocalSearchParams)();
var isDarkMode=(0,_store.useKriya)(s=>s.isDarkMode);
var isReady=(0,_store.useKriya)(s=>s.ready);
var firstParam=value=>Array.isArray(value)?value[0]:value;
var routeId=firstParam(params.id);
var routeChapter=firstParam(params.chapter);
var routeVerse=firstParam(params.verse);
var routeText=firstParam(params.text);
var routeTranslation=firstParam(params.translation);
var _useState=(0,_react.useState)(null),_useState2=(0,_slicedToArray2.default)(_useState,2),loadedShloka=_useState2[0],setLoadedShloka=_useState2[1];
var _useState3=(0,_react.useState)(()=>new Set()),_useState4=(0,_slicedToArray2.default)(_useState3,2),failedBackgroundIds=_useState4[0],setFailedBackgroundIds=_useState4[1];
(0,_react.useEffect)(()=>{
if(!isReady)return;
var index=Number(routeId);
if(!Number.isInteger(index)||index<0)return;
try{
setLoadedShloka((0,_shloka.getShlokaAt)(index));

}
catch(error){
console.warn('[Share] Could not load shloka from local database:',error);

}

}
,[isReady,routeId]);
var shareChapter=loadedShloka?.chapter_number?.toString()??routeChapter;
var shareVerse=loadedShloka?.verse_number?.toString()??routeVerse;
var shareText=loadedShloka?.text??routeText;
var shareTranslation=loadedShloka?.translation_2??loadedShloka?.description??routeTranslation??'';
var _useState5=(0,_react.useState)('story'),_useState6=(0,_slicedToArray2.default)(_useState5,2),selectedFormat=_useState6[0],setSelectedFormat=_useState6[1];
var _useState7=(0,_react.useState)('ocean'),_useState8=(0,_slicedToArray2.default)(_useState7,2),selectedBackground=_useState8[0],setSelectedBackground=_useState8[1];
var _useState9=(0,_react.useState)(false),_useState0=(0,_slicedToArray2.default)(_useState9,2),isSharing=_useState0[0],setIsSharing=_useState0[1];
var _useState1=(0,_react.useState)(false),_useState10=(0,_slicedToArray2.default)(_useState1,2),isSaving=_useState10[0],setIsSaving=_useState10[1];
var _useState11=(0,_react.useState)(parseRgba(_shareBackgrounds.SHARE_BACKGROUNDS[0].textBoxBg).alpha),_useState12=(0,_slicedToArray2.default)(_useState11,2),textboxOpacity=_useState12[0],setTextboxOpacity=_useState12[1];
var _useState13=(0,_react.useState)(_shareBackgrounds.SHARE_BACKGROUNDS[0].defaultBgOpacity),_useState14=(0,_slicedToArray2.default)(_useState13,2),backgroundOpacity=_useState14[0],setBackgroundOpacity=_useState14[1];
var viewShotRef=(0,_react.useRef)(null);
var captureTargetRef=(0,_react.useRef)(null);
(0,_react.useEffect)(()=>{
console.log('[Share2] mounted, refs attached:',{
shot:viewShotRef.current!=null,target:captureTargetRef.current!=null
}
);
var t=setTimeout(()=>{
console.log('[Share2] after 1000ms, refs:',{
shot:viewShotRef.current!=null,target:captureTargetRef.current!=null
}
);

}
,1000);
return()=>{
clearTimeout(t);
console.log('[Share2] unmounted');

}
;

}
,[]);
var currentFormat=FORMATS.find(f=>f.id===selectedFormat);
var currentBackground=(0,_shareBackgrounds.getShareBackground)(selectedBackground);
var currentTextBoxColor=parseRgba(currentBackground.textBoxBg);
var resolvedTextBoxBg=formatRgba(currentTextBoxColor,textboxOpacity);
var currentBackgroundSource=(0,_react.useMemo)(()=>currentBackground.type==='image'&&!failedBackgroundIds.has(currentBackground.id)?(0,_shareBackgrounds.getShareBackgroundImageSource)(currentBackground):null,[currentBackground,failedBackgroundIds]);
var handleBackgroundError=error=>{
if(currentBackground.type!=='image')return;
console.warn('[Share] Background image failed:',{
backgroundId:currentBackground.id,url:currentBackground.imageUrl,error
}
);
setFailedBackgroundIds(previous=>{
var next=new Set(previous);
next.add(currentBackground.id);
return next;

}
);

}
;
(0,_react.useEffect)(()=>{
setTextboxOpacity(parseRgba(currentBackground.textBoxBg).alpha);
setBackgroundOpacity(currentBackground.defaultBgOpacity);

}
,[currentBackground]);
var updateTextboxOpacity=nextOpacity=>{
setTextboxOpacity(Math.round(clamp(nextOpacity,SLIDER_MIN,SLIDER_MAX)*100)/100);

}
;
var updateBackgroundOpacity=nextOpacity=>{
setBackgroundOpacity(Math.round(clamp(nextOpacity,SLIDER_MIN,SLIDER_MAX)*100)/100);

}
;
var PREVIEW_PADDING=40;
var maxWidth=SCREEN_WIDTH-PREVIEW_PADDING*2;
var previewWidth=Math.min(maxWidth,350);
var previewHeight=previewWidth/currentFormat.aspectRatio;
var handleShare=function(){
var _ref4=(0,_asyncToGenerator2.default)(function*(){
setIsSharing(true);
(0,_haptics.buttonPressHaptic)();
try{
var uri=yield captureCardUri();
if(yield Sharing.isAvailableAsync()){
yield Sharing.shareAsync(uri,{
mimeType:'image/jpeg',dialogTitle:'Share Shloka'
}
);
(0,_haptics.taskCompleteHaptic)();

}
else{
(0,_appToast.showAppToast)({
type:'error',text1:'Sharing is unavailable',text2:'Please save the card and share it from your gallery.',duration:2200,position:'top',topOffset:64
}
);

}

}
catch(error){
console.error('Share failed:',error);
(0,_appToast.showAppToast)({
type:'error',text1:'Share failed',text2:'Please try again.',duration:1800,position:'top',topOffset:64
}
);

}
finally{
setIsSharing(false);

}

}
);
return function handleShare(){
return _ref4.apply(this,arguments);

}
;

}
();
var handleSave=function(){
var _ref5=(0,_asyncToGenerator2.default)(function*(){
setIsSaving(true);
(0,_haptics.buttonPressHaptic)();
try{
console.log('[Save] Requesting permissions...');
var _yield$MediaLibrary$r=yield MediaLibrary.requestPermissionsAsync(),status=_yield$MediaLibrary$r.status;
if(status!=='granted'){
(0,_appToast.showAppToast)({
type:'error',text1:'Permission denied',text2:'Please allow photo access to save this image.',duration:2000,position:'top',topOffset:64
}
);
return;

}
console.log('[Save] Permission granted, capturing...');
var uri=yield captureCardUri();
console.log('[Save] Captured URI:',uri);
yield MediaLibrary.saveToLibraryAsync(uri);
console.log('[Save] Saved successfully');
(0,_haptics.taskCompleteHaptic)();
(0,_appToast.showAppToast)({
type:'success',text1:'Saved to gallery',text2:'Your shloka card is ready to share.',duration:2000,position:'top',topOffset:64
}
);

}
catch(error){
console.error('[Save] Failed:',error);
(0,_appToast.showAppToast)({
type:'error',text1:'Save failed',text2:'Please try again.',duration:1800,position:'top',topOffset:64
}
);

}
finally{
setIsSaving(false);

}

}
);
return function handleSave(){
return _ref5.apply(this,arguments);

}
;

}
();
var captureCardUri=function(){
var _ref6=(0,_asyncToGenerator2.default)(function*(){
var options={
format:'jpg',quality:1,width:currentFormat.width,height:currentFormat.height,result:'tmpfile'
}
;
var captureTimeoutMs=15000;
var withTimeout=function(){
var _ref7=(0,_asyncToGenerator2.default)(function*(promise,label){
var timeoutId;
var timeoutPromise=new Promise((_,reject)=>{
timeoutId=setTimeout(()=>{
reject(new Error(`${
label
}
 timed out after ${
captureTimeoutMs
}
ms`));

}
,captureTimeoutMs);

}
);
try{
return yield Promise.race([promise,timeoutPromise]);

}
finally{
clearTimeout(timeoutId);

}

}
);
return function withTimeout(_x,_x2){
return _ref7.apply(this,arguments);

}
;

}
();
yield new Promise(resolve=>requestAnimationFrame(()=>resolve()));
yield new Promise(resolve=>requestAnimationFrame(()=>resolve()));
var captureTarget=captureTargetRef.current;
var fallbackTarget=viewShotRef.current;
console.log('[Capture] ref state at capture:',{
target:captureTarget!=null,targetType:typeof captureTarget,fallback:fallbackTarget!=null,fallbackType:typeof fallbackTarget
}
);
if(captureTarget){
try{
return yield withTimeout((0,_reactNativeViewShot.captureRef)(captureTarget,options),'captureRef(card)');

}
catch(error){
console.warn('[Capture] Card target failed;
 trying ViewShot fallback:',error);

}

}
if(fallbackTarget){
return withTimeout((0,_reactNativeViewShot.captureRef)(fallbackTarget,options),'captureRef(ViewShot)');

}
throw new Error('Capture target is unavailable.');

}
);
return function captureCardUri(){
return _ref6.apply(this,arguments);

}
;

}
();
return(0,_jsxRuntime.jsxs)(_expoLinearGradient.LinearGradient,{
colors:isDarkMode?['#1a2634','#0a0f14']:['#f8fafc','#e2e8f0'],style:styles.container,children:[(0,_jsxRuntime.jsx)(_expoStatusBar.StatusBar,{
style:isDarkMode?"light":"dark"
}
),(0,_jsxRuntime.jsxs)(_reactNativeSafeAreaContext.SafeAreaView,{
style:styles.safeArea,children:[(0,_jsxRuntime.jsxs)(_reactNative.View,{
style:styles.header,children:[(0,_jsxRuntime.jsx)(_reactNative.Pressable,{
onPress:()=>{
(0,_haptics.buttonPressHaptic)();
_expoRouter.router.back();

}
,hitSlop:16,children:(0,_jsxRuntime.jsx)(_vectorIcons.Feather,{
name:"x",size:24,color:isDarkMode?"#fff":"#000"
}
)
}
),(0,_jsxRuntime.jsx)(_reactNative.Text,{
style:[styles.headerTitle,{
color:isDarkMode?'#fff':'#000'
}
],children:"Share Shloka"
}
),(0,_jsxRuntime.jsx)(_reactNative.View,{
style:{
width:24
}

}
)]
}
),(0,_jsxRuntime.jsx)(_reactNative.ScrollView,{
contentContainerStyle:styles.previewContainer,showsVerticalScrollIndicator:false,children:(0,_jsxRuntime.jsx)(_reactNativeViewShot.default,{
ref:viewShotRef,options:{
format:'jpg',quality:1,width:currentFormat.width,height:currentFormat.height,result:'tmpfile'
}
,children:(0,_jsxRuntime.jsx)(_reactNative.View,{
ref:captureTargetRef,collapsable:false,children:(0,_jsxRuntime.jsx)(ShareCard,{
previewWidth:previewWidth,previewHeight:previewHeight,selectedFormat:selectedFormat,currentBackground:currentBackground,currentBackgroundSource:currentBackgroundSource,backgroundOpacity:backgroundOpacity,resolvedTextBoxBg:resolvedTextBoxBg,chapter:shareChapter,verse:shareVerse,text:shareText,translation:shareTranslation,onBackgroundError:handleBackgroundError
}
)
}
)
}
)
}
),(0,_jsxRuntime.jsxs)(_reactNative.View,{
style:[styles.bottomPanel,{
backgroundColor:isDarkMode?'#00151a':'#ffffff'
}
],children:[(0,_jsxRuntime.jsx)(_reactNative.View,{
style:styles.formatSelector,children:FORMATS.map(format=>(0,_jsxRuntime.jsx)(_reactNative.Pressable,{
onPress:()=>{
(0,_haptics.selectionHaptic)();
setSelectedFormat(format.id);

}
,style:[styles.formatTab,selectedFormat===format.id&&styles.formatTabActive,{
backgroundColor:selectedFormat===format.id?isDarkMode?'#013540':'#2563eb':isDarkMode?'#293a3d':'#e5e7eb'
}
],children:(0,_jsxRuntime.jsx)(_reactNative.Text,{
style:[styles.formatTabText,{
color:selectedFormat===format.id?'#fff':isDarkMode?'#9ca3af':'#6b7280'
}
],children:format.label
}
)
}
,format.id))
}
),(0,_jsxRuntime.jsx)(_reactNative.ScrollView,{
horizontal:true,showsHorizontalScrollIndicator:false,contentContainerStyle:styles.backgroundSelector,children:_shareBackgrounds.SHARE_BACKGROUNDS.map(bg=>(0,_jsxRuntime.jsx)(_reactNative.Pressable,{
onPress:()=>{
(0,_haptics.selectionHaptic)();
setSelectedBackground(bg.id);

}
,style:[styles.backgroundSwatch,selectedBackground===bg.id&&styles.backgroundSwatchActive],children:bg.type==='image'?(0,_jsxRuntime.jsxs)(_reactNative.View,{
style:styles.backgroundSwatchImageContainer,children:[(0,_jsxRuntime.jsx)(_expoLinearGradient.LinearGradient,{
colors:bg.colors,style:styles.backgroundSwatchGradient,start:{
x:0,y:0
}
,end:{
x:1,y:1
}

}
),!failedBackgroundIds.has(bg.id)&&(0,_jsxRuntime.jsx)(_reactNative.Image,{
source:(0,_shareBackgrounds.getShareBackgroundImageSource)(bg),style:styles.backgroundSwatchImage,resizeMode:"cover",onError:event=>{
console.warn('[Share] Background swatch failed:',{
backgroundId:bg.id,url:bg.imageUrl,error:event.nativeEvent.error
}
);
setFailedBackgroundIds(previous=>{
var next=new Set(previous);
next.add(bg.id);
return next;

}
);

}

}
)]
}
):(0,_jsxRuntime.jsx)(_expoLinearGradient.LinearGradient,{
colors:bg.colors,style:styles.backgroundSwatchGradient,start:{
x:0,y:0
}
,end:{
x:1,y:1
}

}
)
}
,bg.id))
}
),(0,_jsxRuntime.jsxs)(_reactNative.View,{
style:styles.opacitySection,children:[(0,_jsxRuntime.jsx)(_reactNative.View,{
style:styles.opacityHeader,children:(0,_jsxRuntime.jsx)(_reactNative.Text,{
style:[styles.opacityLabel,{
color:isDarkMode?'#fff':'#111827'
}
],children:"Background opacity"
}
)
}
),(0,_jsxRuntime.jsx)(_reactNative.View,{
style:styles.opacityControlRow,children:(0,_jsxRuntime.jsxs)(_slider.Slider,{
value:Math.round(backgroundOpacity*100),minValue:0,maxValue:100,step:1,size:"md",orientation:"horizontal",isDisabled:false,isReversed:false,onChange:value=>{
if(typeof value==='number'){
updateBackgroundOpacity(value/100);

}

}
,className:"w-full",children:[(0,_jsxRuntime.jsx)(_slider.SliderTrack,{
className:isDarkMode?'bg-gray-700':'bg-gray-200',children:(0,_jsxRuntime.jsx)(_slider.SliderFilledTrack,{
className:isDarkMode?'bg-teal-700':'bg-blue-600'
}
)
}
),(0,_jsxRuntime.jsx)(_slider.SliderThumb,{
className:isDarkMode?'bg-white border border-gray-900':'bg-slate-50 border border-slate-300'
}
)]
}
)
}
)]
}
),(0,_jsxRuntime.jsxs)(_reactNative.View,{
style:styles.opacitySection,children:[(0,_jsxRuntime.jsx)(_reactNative.View,{
style:styles.opacityHeader,children:(0,_jsxRuntime.jsx)(_reactNative.Text,{
style:[styles.opacityLabel,{
color:isDarkMode?'#fff':'#111827'
}
],children:"Text box opacity"
}
)
}
),(0,_jsxRuntime.jsx)(_reactNative.View,{
style:styles.opacityControlRow,children:(0,_jsxRuntime.jsxs)(_slider.Slider,{
value:Math.round(textboxOpacity*100),minValue:0,maxValue:100,step:1,size:"md",orientation:"horizontal",isDisabled:false,isReversed:false,onChange:value=>{
if(typeof value==='number'){
updateTextboxOpacity(value/100);

}

}
,className:"w-full",children:[(0,_jsxRuntime.jsx)(_slider.SliderTrack,{
className:isDarkMode?'bg-gray-700':'bg-gray-200',children:(0,_jsxRuntime.jsx)(_slider.SliderFilledTrack,{
className:isDarkMode?'bg-teal-700':'bg-blue-600'
}
)
}
),(0,_jsxRuntime.jsx)(_slider.SliderThumb,{
className:isDarkMode?'bg-white border border-gray-900':'bg-slate-50 border border-slate-300'
}
)]
}
)
}
)]
}
),(0,_jsxRuntime.jsxs)(_reactNative.View,{
style:styles.actionButtons,children:[(0,_jsxRuntime.jsx)(_reactNative.Pressable,{
onPress:handleSave,disabled:isSaving,style:[styles.actionButton,styles.saveButton,{
backgroundColor:isDarkMode?'#293a3d':'#e5e7eb'
}
],children:isSaving?(0,_jsxRuntime.jsx)(_reactNative.ActivityIndicator,{
size:"small",color:isDarkMode?'#fff':'#000'
}
):(0,_jsxRuntime.jsxs)(_jsxRuntime.Fragment,{
children:[(0,_jsxRuntime.jsx)(_vectorIcons.Feather,{
name:"download",size:20,color:isDarkMode?'#fff':'#000'
}
),(0,_jsxRuntime.jsx)(_reactNative.Text,{
style:[styles.actionButtonText,{
color:isDarkMode?'#fff':'#000'
}
],children:"Save"
}
)]
}
)
}
),(0,_jsxRuntime.jsx)(_reactNative.Pressable,{
onPress:handleShare,disabled:isSharing,style:[styles.actionButton,styles.shareButton,{
backgroundColor:isDarkMode?'#013540':'#2563eb'
}
],children:isSharing?(0,_jsxRuntime.jsx)(_reactNative.ActivityIndicator,{
size:"small",color:"#fff"
}
):(0,_jsxRuntime.jsxs)(_jsxRuntime.Fragment,{
children:[(0,_jsxRuntime.jsx)(_vectorIcons.Feather,{
name:"share",size:20,color:"#fff"
}
),(0,_jsxRuntime.jsx)(_reactNative.Text,{
style:[styles.actionButtonText,{
color:'#fff'
}
],children:"Share"
}
)]
}
)
}
)]
}
)]
}
)]
}
)]
}
);

}
var styles=_reactNative.StyleSheet.create({
container:{
flex:1
}
,safeArea:{
flex:1
}
,header:{
flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingVertical:16
}
,headerTitle:{
fontSize:18,fontWeight:'600'
}
,formatSelector:{
flexDirection:'row',paddingHorizontal:20,gap:8,marginBottom:20,marginTop:10
}
,formatTab:{
flex:1,paddingVertical:10,borderRadius:10,alignItems:'center'
}
,formatTabActive:{

}
,formatTabText:{
fontSize:14,fontWeight:'600'
}
,previewContainer:{
flexGrow:1,alignItems:'center',paddingVertical:20
}
,cardContainer:{
backgroundColor:'#10121f',overflow:'hidden',position:'relative'
}
,backgroundLayer:{
position:'absolute',top:0,right:0,bottom:0,left:0
}
,backgroundImage:{
width:'100%',height:'100%'
}
,backgroundTint:{
position:'absolute',top:0,right:0,bottom:0,left:0
}
,cardOverlay:{
flex:1,justifyContent:'center',alignItems:'center'
}
,textBox:{
padding:16,width:'100%',alignItems:'center'
}
,sanskritText:{
fontFamily:'Kalam',fontSize:15,lineHeight:24,marginTop:12,paddingTop:12,marginBottom:12,textAlign:'center'
}
,translationText:{
fontFamily:'Dancing Script',fontSize:12,lineHeight:20,textAlign:'center',marginTop:8
}
,referenceBottom:{
fontFamily:'Cedarville Cursive',fontSize:8,color:'#b0b0b0',marginTop:22
}
,brandingWrap:{
position:'absolute',bottom:10,alignSelf:'center',alignItems:'center',gap:4
}
,brandingWrapPost:{
position:'absolute',top:10,right:16,alignItems:'flex-end',gap:4
}
,brandingBottom:{
fontFamily:'Instrument Serif',fontSize:15,color:'#ffffff',fontStyle:'italic'
}
,platformRow:{
flexDirection:'row',alignItems:'center',gap:6
}
,platformText:{
fontFamily:'Space Mono',fontSize:6,letterSpacing:0.3,textTransform:'lowercase'
}
,bottomPanel:{
paddingTop:16,paddingBottom:8,borderTopLeftRadius:20,borderTopRightRadius:20,shadowColor:'#000',shadowOffset:{
width:0,height:-2
}
,shadowOpacity:0.1,shadowRadius:8,elevation:10
}
,opacitySection:{
paddingHorizontal:20,paddingBottom:14
}
,opacityHeader:{
marginBottom:10
}
,opacityLabel:{
fontSize:14,fontWeight:'600'
}
,opacityControlRow:{
width:'100%'
}
,actionButtons:{
flexDirection:'row',paddingHorizontal:20,paddingBottom:16,gap:12
}
,actionButton:{
flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:14,borderRadius:12,gap:8
}
,saveButton:{

}
,shareButton:{

}
,actionButtonText:{
fontSize:16,fontWeight:'600'
}
,backgroundSelector:{
paddingHorizontal:20,paddingBottom:16,gap:10
}
,backgroundSwatch:{
width:48,height:48,borderRadius:12,overflow:'hidden',borderWidth:2,borderColor:'transparent'
}
,backgroundSwatchActive:{
borderColor:'#3b82f6',borderWidth:3
}
,backgroundSwatchImage:{
position:'absolute',top:0,right:0,bottom:0,left:0
}
,backgroundSwatchImageContainer:{
width:'100%',height:'100%',position:'relative'
}
,backgroundSwatchGradient:{
width:'100%',height:'100%'
}

}
);
