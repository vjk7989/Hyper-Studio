import Lottie from "react-lottie";

import { Flex } from "@ds/layout/Flex/Flex";
import HyperStudioMark from "@/assets/brand/HyperStudioMark.svg?react";
import animationData from "@/ltx-io/assets/lottie/infinite-progress.json";

import styles from "./PageLoader.module.scss";

export function PageLoader() {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap="lg"
      height="100%"
      width="100%"
    >
      <Flex
        direction="column"
        align="center"
        justify="center"
        gap="lg"
        height="48px"
        width="120px"
      >
        <div className={styles.logo}>
          <HyperStudioMark aria-label="Hyper-Studio" />
        </div>
        <div className={styles.animation}>
          <Lottie
            options={{
              loop: true,
              autoplay: true,
              animationData,
              rendererSettings: {
                preserveAspectRatio: "xMidYMid slice",
              },
            }}
          />
        </div>
      </Flex>
    </Flex>
  );
}
