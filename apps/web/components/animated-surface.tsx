"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

type AnimatedSurfaceProps = HTMLMotionProps<"div"> & {
  delay?: number;
};

export function AnimatedSurface({ delay = 0, children, ...props }: AnimatedSurfaceProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.36, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
