import type { ReactNode } from "react";


type HomeHeaderActionsProps = {
  queueControl: ReactNode;
};

export function HomeHeaderActions({ queueControl }: HomeHeaderActionsProps) {
  return (
    <>
      {queueControl}
    </>
  );
}
