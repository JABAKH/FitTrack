import React, { useEffect } from "react";
import { Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  ReduceMotion,
} from "react-native-reanimated";
type Props = {
  size: number;
  stroke: number;
  radius: number;
  color: string;
  progress: number;
};
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
export default function ProgressArc({
  size,
  stroke,
  radius,
  color,
  progress,
}: Props) {
  const value = useSharedValue(0),
    length = 2 * Math.PI * radius;
  useEffect(() => {
    value.set(
      withTiming(progress, {
        duration: 650,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [progress, value]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - value.value),
  }));
  return (
    <AnimatedCircle
      animatedProps={animatedProps}
      cx={size / 2}
      cy={size / 2}
      r={radius}
      stroke={color}
      strokeWidth={stroke}
      fill="none"
      strokeLinecap="round"
      strokeDasharray={[length, length]}
      transform={"rotate(-90 " + size / 2 + " " + size / 2 + ")"}
    />
  );
}
