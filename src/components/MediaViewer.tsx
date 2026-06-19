// src/components/MediaViewer.tsx — full-screen image/video viewer with zoom, pan, and swipe-to-close.
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import WebView from 'react-native-webview';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PressableScale } from './ui/PressableScale';
import { mediaFull, mediaThumb } from '../lib/media';
import { downloadMedia, DOWNLOAD_ENABLED } from '../lib/download';
import type { AulaMediaItem } from '../lib/aula-types';

const { width: W, height: H } = Dimensions.get('window');
const IMG_H = H * 0.82;
const THUMB = 52;
const THUMB_GAP = 4;

function videoHtml(src: string, poster?: string): string {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"></head>
<body style="margin:0;background:#000;height:100vh;display:flex;align-items:center;justify-content:center;">
<video src="${src}" ${poster ? `poster="${poster}"` : ''} controls autoplay playsinline webkit-playsinline style="width:100%;max-height:100vh;"></video>
</body></html>`;
}

// ── ZoomablePage ──────────────────────────────────────────────────────────────

function ZoomablePage({
  item,
  isActive,
  anyZoomedSV,
  onClose,
  onZoomChange,
}: {
  item: AulaMediaItem;
  isActive: boolean;
  anyZoomedSV: Animated.SharedValue<boolean>;
  onClose: () => void;
  onZoomChange: (z: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const isZoomed = useSharedValue(false);

  // Reset zoom when page becomes inactive (user swiped away)
  useEffect(() => {
    if (!isActive) {
      scale.value = 1;
      savedScale.value = 1;
      tx.value = 0;
      ty.value = 0;
      savedTx.value = 0;
      savedTy.value = 0;
      isZoomed.value = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  function setZoom(z: boolean) {
    isZoomed.value = z;
    anyZoomedSV.value = z;
    onZoomChange(z);
  }

  const pinch = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(6, savedScale.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value < 1.15) {
        scale.value = withTiming(1, { duration: 200 });
        savedScale.value = 1;
        tx.value = withTiming(0, { duration: 200 });
        ty.value = withTiming(0, { duration: 200 });
        savedTx.value = 0;
        savedTy.value = 0;
        runOnJS(setZoom)(false);
      } else {
        savedScale.value = scale.value;
        runOnJS(setZoom)(true);
      }
    });

  // Pan while zoomed — fails immediately via onTouchesMove when not zoomed,
  // so the outer pager gesture can take over.
  const panZoom = Gesture.Pan()
    .minDistance(2)
    .onTouchesMove((_e, state) => {
      if (!isZoomed.value) state.fail();
    })
    .onStart(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((e) => {
      const s = scale.value;
      const mx = ((s - 1) * W) / 2;
      const my = ((s - 1) * IMG_H) / 2;
      tx.value = Math.max(-mx, Math.min(mx, savedTx.value + e.translationX));
      ty.value = Math.max(-my, Math.min(my, savedTy.value + e.translationY));
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      if (isZoomed.value) {
        scale.value = withTiming(1, { duration: 220 });
        savedScale.value = 1;
        tx.value = withTiming(0, { duration: 220 });
        ty.value = withTiming(0, { duration: 220 });
        savedTx.value = 0;
        savedTy.value = 0;
        runOnJS(setZoom)(false);
      } else {
        scale.value = withTiming(2.5, { duration: 250 });
        savedScale.value = 2.5;
        runOnJS(setZoom)(true);
      }
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .requireExternalGestureToFail(doubleTap)
    .onEnd(() => {
      if (!isZoomed.value) runOnJS(onClose)();
    });

  const composed = Gesture.Simultaneous(
    Gesture.Simultaneous(pinch, panZoom),
    Gesture.Exclusive(doubleTap, singleTap),
  );

  const imgStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <View style={styles.page}>
        <Animated.View style={imgStyle}>
          <Image
            source={{ uri: mediaFull(item) }}
            style={styles.image}
            contentFit="contain"
            transition={150}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

// ── MediaViewer ───────────────────────────────────────────────────────────────

interface Props {
  items: AulaMediaItem[];
  initialIndex: number;
  onClose: () => void;
  onInfo?: (item: AulaMediaItem) => void;
}

export function MediaViewer({ items, initialIndex, onClose, onInfo }: Props) {
  const start = Math.max(0, Math.min(initialIndex, items.length - 1));
  const [current, setCurrent] = useState(start);
  const [busy, setBusy] = useState(false);
  const [anyZoomed, setAnyZoomed] = useState(false);

  const anyZoomedSV = useSharedValue(false);
  const filmRef = useRef<ScrollView>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Pager offset (X) and swipe-to-close offset (Y) are separate transforms
  const pageX = useSharedValue(-start * W);
  const savedPageX = useSharedValue(-start * W);
  const curPage = useSharedValue(start);
  const closeY = useSharedValue(0);

  // Open: slide up smoothly from slight offset — no spring/bounce
  const openY = useSharedValue(H * 0.06);
  const bgOpacity = useSharedValue(0);

  useEffect(() => {
    openY.value = withTiming(0, { duration: 280 });
    bgOpacity.value = withTiming(1, { duration: 220 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll filmstrip to keep active thumb visible
  useEffect(() => {
    if (items.length > 1) {
      filmRef.current?.scrollTo({
        x: Math.max(0, current * (THUMB + THUMB_GAP) - W / 2 + THUMB / 2),
        animated: true,
      });
    }
  }, [current, items.length]);

  // Swipe down to close — activates on downward movement, fails on horizontal or 2-finger
  const closeGesture = Gesture.Pan()
    .enabled(!anyZoomed)
    .activeOffsetY([5, Infinity])
    .failOffsetX([-12, 12])
    .maxPointers(1)
    .onUpdate((e) => {
      if (anyZoomedSV.value) return;
      closeY.value = Math.max(0, e.translationY);
      bgOpacity.value = interpolate(closeY.value, [0, 300], [1, 0.15], Extrapolation.CLAMP);
    })
    .onEnd((e) => {
      if (anyZoomedSV.value) {
        closeY.value = withSpring(0, { damping: 25 });
        bgOpacity.value = withTiming(1, { duration: 150 });
        return;
      }
      if (e.translationY > 100 || e.velocityY > 700) {
        closeY.value = withTiming(H + 60, { duration: 220 }, () => runOnJS(closeRef.current)());
        bgOpacity.value = withTiming(0, { duration: 180 });
      } else {
        closeY.value = withSpring(0, { damping: 25 });
        bgOpacity.value = withTiming(1, { duration: 150 });
      }
    });

  // Horizontal page swipe — fails on vertical or 2-finger (lets pinch through)
  const pageGesture = Gesture.Pan()
    .enabled(!anyZoomed && items.length > 1)
    .activeOffsetX([-8, 8])
    .failOffsetY([-12, 12])
    .maxPointers(1)
    .onStart(() => {
      cancelAnimation(pageX);
      savedPageX.value = pageX.value;
    })
    .onUpdate((e) => {
      if (anyZoomedSV.value) return;
      pageX.value = savedPageX.value + e.translationX;
    })
    .onEnd((e) => {
      if (anyZoomedSV.value) {
        pageX.value = withSpring(-curPage.value * W, { damping: 35 });
        return;
      }
      const page = curPage.value;
      const maxPage = items.length - 1;
      const dx = e.translationX;
      const vx = e.velocityX;
      const threshold = W * 0.35;

      let next = page;
      if ((dx < -threshold || vx < -600) && page < maxPage) next = page + 1;
      else if ((dx > threshold || vx > 600) && page > 0) next = page - 1;

      pageX.value = withSpring(-next * W, { damping: 35, stiffness: 380 });
      savedPageX.value = -next * W;
      curPage.value = next;
      runOnJS(setCurrent)(next);
    });

  // Race: whichever gesture activates first (vertical=close, horizontal=page) wins
  const outerGesture = Gesture.Race(closeGesture, pageGesture);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));

  // Black base fades out as user drags down — album becomes visible beneath
  const bgFillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(closeY.value, [0, 220], [1, 0], Extrapolation.CLAMP),
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: openY.value + closeY.value }],
  }));

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pageX.value }],
  }));

  const activeItem = items[current];
  const bgThumb = mediaThumb(activeItem) ?? mediaFull(activeItem);

  async function handleDownload() {
    if (!activeItem || busy) return;
    setBusy(true);
    try {
      await downloadMedia([activeItem]);
    } catch (e) {
      Alert.alert('Kunne ikke gemme', e instanceof Error ? e.message : 'Fejl');
    } finally {
      setBusy(false);
    }
  }

  function handleZoomChange(z: boolean) {
    setAnyZoomed(z);
  }

  function jumpTo(index: number) {
    pageX.value = withSpring(-index * W, { damping: 35, stiffness: 380 });
    savedPageX.value = -index * W;
    curPage.value = index;
    setCurrent(index);
  }

  return (
    <Modal visible animationType="none" transparent presentationStyle="overFullScreen" onRequestClose={onClose}>
      <SafeAreaProvider>
      <StatusBar hidden />
      <GestureHandlerRootView style={styles.fill}>
        {/* Solid black base — fades out as viewer is dragged down */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.bgFill, bgFillStyle]} />

        {/* Blurred + dimmed backdrop — fades in with content */}
        <Animated.View style={[StyleSheet.absoluteFill, bgStyle]} pointerEvents="none">
          {bgThumb ? (
            <Image
              source={{ uri: bgThumb }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={30}
            />
          ) : null}
          <View style={[StyleSheet.absoluteFill, styles.bgDimmer]} />
        </Animated.View>

        {/* All viewer content slides together for open/close-drag */}
        <GestureDetector gesture={outerGesture}>
          <Animated.View style={[styles.fill, contentStyle]}>

            {/* Horizontal page strip */}
            <Animated.View
              style={[{ flexDirection: 'row', width: W * items.length, height: H }, stripStyle]}
            >
              {items.map((item, index) => {
                if (item.mediaType === 'video') {
                  return (
                    <View key={index} style={styles.page}>
                      {index === current ? (
                        <WebView
                          source={{ html: videoHtml(mediaFull(item) ?? '', mediaThumb(item)) }}
                          style={styles.video}
                          allowsInlineMediaPlayback
                          mediaPlaybackRequiresUserAction={false}
                          scrollEnabled={false}
                        />
                      ) : (
                        <>
                          <Image
                            source={{ uri: mediaThumb(item) }}
                            style={styles.image}
                            contentFit="contain"
                          />
                          <View style={styles.playOverlay}>
                            <SymbolView name="play.fill" size={22} tintColor="#fff" />
                          </View>
                        </>
                      )}
                    </View>
                  );
                }
                return (
                  <ZoomablePage
                    key={index}
                    item={item}
                    isActive={index === current}
                    anyZoomedSV={anyZoomedSV}
                    onClose={onClose}
                    onZoomChange={handleZoomChange}
                  />
                );
              })}
            </Animated.View>

            {/* Top bar */}
            <SafeAreaView style={styles.topBar} edges={['top']} pointerEvents="box-none">
              <View style={styles.topRow} pointerEvents="box-none">
                <PressableScale style={styles.iconBtn} onPress={onClose} hitSlop={12} scaleTo={0.92}>
                  <SymbolView name="xmark" size={17} tintColor="#fff" />
                </PressableScale>
                {items.length > 1 ? (
                  <View style={styles.counterWrap} pointerEvents="none">
                    <Text style={styles.counter}>{`${current + 1} af ${items.length}`}</Text>
                  </View>
                ) : null}
                <View style={styles.topRight}>
                  {DOWNLOAD_ENABLED ? (
                    <PressableScale
                      style={styles.iconBtn}
                      onPress={handleDownload}
                      hitSlop={12}
                      disabled={busy}
                      scaleTo={0.92}
                    >
                      {busy ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <SymbolView name="square.and.arrow.down" size={18} tintColor="#fff" />
                      )}
                    </PressableScale>
                  ) : null}
                  {onInfo && activeItem ? (
                    <PressableScale
                      style={styles.iconBtn}
                      onPress={() => onInfo(activeItem)}
                      hitSlop={12}
                      scaleTo={0.92}
                    >
                      <SymbolView name="info.circle" size={18} tintColor="#fff" />
                    </PressableScale>
                  ) : null}
                </View>
              </View>
            </SafeAreaView>

            {/* Bottom thumbnail filmstrip */}
            {items.length > 1 ? (
              <SafeAreaView style={styles.filmstrip} edges={['bottom']} pointerEvents="box-none">
                <ScrollView
                  ref={filmRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.stripContent}
                  scrollEnabled
                >
                  {items.map((item, index) => (
                    <PressableScale
                      key={index}
                      scaleTo={0.9}
                      onPress={() => jumpTo(index)}
                      style={[styles.stripWrap, index === current && styles.stripWrapActive]}
                    >
                      <Image
                        source={{ uri: mediaThumb(item) ?? mediaFull(item) }}
                        style={styles.stripThumb}
                        contentFit="cover"
                      />
                      {item.mediaType === 'video' ? (
                        <View style={styles.stripPlay}>
                          <SymbolView name="play.fill" size={7} tintColor="#fff" />
                        </View>
                      ) : null}
                    </PressableScale>
                  ))}
                </ScrollView>
              </SafeAreaView>
            ) : null}

          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bgFill: { backgroundColor: '#000' },
  bgDimmer: { backgroundColor: 'rgba(0,0,0,0.55)' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  counterWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    overflow: 'hidden',
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: { width: W, height: H, alignItems: 'center', justifyContent: 'center' },
  image: { width: W, height: IMG_H },
  video: { width: W, height: H * 0.7, backgroundColor: '#000' },
  playOverlay: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filmstrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  stripContent: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 24,
    gap: THUMB_GAP,
  },
  stripWrap: {
    width: THUMB,
    height: THUMB,
    borderRadius: 6,
    overflow: 'hidden',
    opacity: 0.55,
  },
  stripWrapActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#fff',
  },
  stripThumb: { width: THUMB, height: THUMB },
  stripPlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
