import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ImageZoomModalProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
  visible,
  images,
  initialIndex = 0,
  onClose,
  title,
}) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomedState, setIsZoomedState] = useState(false);

  // Animated values for GPU-accelerated transforms
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Mutable gesture tracking references
  const currentScale = useRef(1);
  const lastScale = useRef(1);
  const initialDistance = useRef<number | null>(null);

  const currentTranslate = useRef({ x: 0, y: 0 });
  const lastTranslate = useRef({ x: 0, y: 0 });
  const initialTouchCenter = useRef<{ x: number; y: number } | null>(null);
  const lastTouchPos = useRef<{ x: number; y: number } | null>(null);

  const resetZoom = (animated = true) => {
    currentScale.current = 1;
    lastScale.current = 1;
    currentTranslate.current = { x: 0, y: 0 };
    lastTranslate.current = { x: 0, y: 0 };
    initialDistance.current = null;
    initialTouchCenter.current = null;
    lastTouchPos.current = null;
    setIsZoomedState(false);

    if (animated) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }),
        Animated.spring(translateX, { toValue: 0, friction: 7, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 7, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(1);
      translateX.setValue(0);
      translateY.setValue(0);
    }
  };

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      resetZoom(false);
    }
  }, [visible, initialIndex]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,

      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) {
          const t1 = touches[0];
          const t2 = touches[1];
          initialDistance.current = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
          lastScale.current = currentScale.current;
          lastTranslate.current = { ...currentTranslate.current };
          initialTouchCenter.current = {
            x: (t1.pageX + t2.pageX) / 2,
            y: (t1.pageY + t2.pageY) / 2,
          };
        } else if (touches && touches.length === 1) {
          lastTouchPos.current = { x: touches[0].pageX, y: touches[0].pageY };
          initialDistance.current = null;
        }
      },

      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (!touches) return;

        // Two-finger pinch to zoom & move
        if (touches.length >= 2) {
          const t1 = touches[0];
          const t2 = touches[1];
          const dist = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
          const midX = (t1.pageX + t2.pageX) / 2;
          const midY = (t1.pageY + t2.pageY) / 2;

          // If second finger just touched down, anchor the initial distance
          if (!initialDistance.current || initialDistance.current === 0) {
            initialDistance.current = dist;
            lastScale.current = currentScale.current;
            lastTranslate.current = { ...currentTranslate.current };
            initialTouchCenter.current = { x: midX, y: midY };
            return;
          }

          // Calculate pinch scale
          const factor = dist / initialDistance.current;
          const newScale = Math.min(Math.max(lastScale.current * factor, 0.85), 5.5);
          currentScale.current = newScale;
          scale.setValue(newScale);

          if (newScale > 1.05 && !isZoomedState) {
            setIsZoomedState(true);
          }

          // Simultaneously pan with the center of the pinch
          if (initialTouchCenter.current) {
            const dx = midX - initialTouchCenter.current.x;
            const dy = midY - initialTouchCenter.current.y;
            const newX = lastTranslate.current.x + dx;
            const newY = lastTranslate.current.y + dy;
            currentTranslate.current = { x: newX, y: newY };
            translateX.setValue(newX);
            translateY.setValue(newY);
          }
        }
        // One-finger pan when zoomed in
        else if (touches.length === 1) {
          // If transitioning from 2 fingers to 1 finger
          if (initialDistance.current) {
            initialDistance.current = null;
            initialTouchCenter.current = null;
            lastScale.current = currentScale.current;
            lastTranslate.current = { ...currentTranslate.current };
            lastTouchPos.current = { x: touches[0].pageX, y: touches[0].pageY };
            return;
          }

          if (currentScale.current > 1.05) {
            const touch = touches[0];
            if (lastTouchPos.current) {
              const dx = touch.pageX - lastTouchPos.current.x;
              const dy = touch.pageY - lastTouchPos.current.y;
              lastTouchPos.current = { x: touch.pageX, y: touch.pageY };

              const newX = currentTranslate.current.x + dx;
              const newY = currentTranslate.current.y + dy;
              currentTranslate.current = { x: newX, y: newY };
              translateX.setValue(newX);
              translateY.setValue(newY);
            } else {
              lastTouchPos.current = { x: touch.pageX, y: touch.pageY };
            }
          } else {
            lastTouchPos.current = { x: touches[0].pageX, y: touches[0].pageY };
          }
        }
      },

      onPanResponderRelease: () => {
        initialDistance.current = null;
        initialTouchCenter.current = null;
        lastTouchPos.current = null;

        if (currentScale.current <= 1.05) {
          // Snap back smoothly to 1x centered
          resetZoom(true);
        } else {
          // Keep zoomed and smoothly clamp translation within image boundaries
          lastScale.current = currentScale.current;
          setIsZoomedState(true);

          const maxTranslateX = (SCREEN_WIDTH * (currentScale.current - 1)) / 2;
          const maxTranslateY = (SCREEN_HEIGHT * 0.75 * (currentScale.current - 1)) / 2;

          const clampedX = Math.min(Math.max(currentTranslate.current.x, -maxTranslateX), maxTranslateX);
          const clampedY = Math.min(Math.max(currentTranslate.current.y, -maxTranslateY), maxTranslateY);

          currentTranslate.current = { x: clampedX, y: clampedY };
          lastTranslate.current = { x: clampedX, y: clampedY };

          Animated.parallel([
            Animated.spring(translateX, { toValue: clampedX, friction: 7, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: clampedY, friction: 7, useNativeDriver: true }),
          ]).start();
        }
      },

      onPanResponderTerminate: () => {
        initialDistance.current = null;
        initialTouchCenter.current = null;
        lastTouchPos.current = null;
      },
    })
  ).current;

  if (!visible || !images || images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex] || images[0];

  const handlePrev = () => {
    if (currentIndex > 0) {
      resetZoom(false);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      resetZoom(false);
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Top Header Bar */}
        <View
          style={[
            styles.headerBar,
            { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 44) + 8 },
          ]}
        >
          <View style={styles.headerSpacer} />

          <View style={styles.headerCenter}>
            {images.length > 1 ? (
              <Text style={styles.counterText}>
                {currentIndex + 1} / {images.length}
              </Text>
            ) : title ? (
              <Text style={styles.titleText} numberOfLines={1}>
                {title}
              </Text>
            ) : (
              <Text style={styles.counterText}>Image Viewer</Text>
            )}
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Close image viewer"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pinch & Pan Zoomable Canvas */}
        <View
          style={styles.canvasContainer}
          collapsable={false}
          {...panResponder.panHandlers}
        >
          <Animated.View
            style={[
              styles.imageWrapper,
              {
                transform: [
                  { translateX },
                  { translateY },
                  { scale },
                ],
              },
            ]}
          >
            <Image
              source={{ uri: currentImage }}
              style={styles.mainImage}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Bottom Helper Bar & Slider Controls */}
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
        >
          {images.length > 1 && !isZoomedState && (
            <View style={styles.sliderControlsRow}>
              {/* Previous Button (Left of slider indicator) */}
              <TouchableOpacity
                style={[
                  styles.sliderArrowBtn,
                  currentIndex === 0 && styles.sliderArrowBtnDisabled,
                ]}
                onPress={handlePrev}
                disabled={currentIndex === 0}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Previous image"
                accessibilityRole="button"
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={
                    currentIndex === 0
                      ? 'rgba(255, 255, 255, 0.25)'
                      : '#FFFFFF'
                  }
                />
              </TouchableOpacity>

              {/* Slider Indicator (Pagination dots / pill) */}
              <View style={styles.paginationDotsContainer}>
                {images.length <= 8 ? (
                  images.map((_, idx) => (
                    <TouchableOpacity
                      key={`zoom-dot-${idx}`}
                      onPress={() => {
                        resetZoom(false);
                        setCurrentIndex(idx);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                      style={[
                        styles.paginationDot,
                        idx === currentIndex
                          ? styles.paginationDotActive
                          : styles.paginationDotInactive,
                      ]}
                      accessibilityLabel={`Go to image ${idx + 1}`}
                      accessibilityRole="button"
                    />
                  ))
                ) : (
                  <View style={styles.sliderCounterPill}>
                    <Text style={styles.sliderCounterPillText}>
                      {currentIndex + 1} / {images.length}
                    </Text>
                  </View>
                )}
              </View>

              {/* Next Button (Right of slider indicator) */}
              <TouchableOpacity
                style={[
                  styles.sliderArrowBtn,
                  currentIndex === images.length - 1 && styles.sliderArrowBtnDisabled,
                ]}
                onPress={handleNext}
                disabled={currentIndex === images.length - 1}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Next image"
                accessibilityRole="button"
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={
                    currentIndex === images.length - 1
                      ? 'rgba(255, 255, 255, 0.25)'
                      : '#FFFFFF'
                  }
                />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomHelperRow}>
            <Text style={styles.helperText}>
              Pinch with two fingers to zoom & move
            </Text>
            {isZoomedState && (
              <TouchableOpacity
                style={styles.resetPill}
                onPress={() => resetZoom(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={13} color="#FFFFFF" />
                <Text style={styles.resetPillText}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  canvasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.78,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  bottomBar: {
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  sliderControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  sliderArrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderArrowBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  paginationDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sliderCounterPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  sliderCounterPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  paginationDot: {
    height: 6,
    borderRadius: 3,
  },
  paginationDotActive: {
    width: 22,
    backgroundColor: '#FFFFFF',
  },
  paginationDotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  bottomHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  helperText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    textAlign: 'center',
  },
  resetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  resetPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
