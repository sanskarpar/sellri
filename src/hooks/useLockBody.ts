"use client";

import { useEffect } from "react";

let lockCount = 0;

export function useLockBody(locked: boolean) {
  useEffect(() => {
    if (locked) {
      if (lockCount === 0) {
        document.body.style.overflow = "hidden";
      }
      lockCount++;
      return () => {
        lockCount--;
        if (lockCount <= 0) {
          lockCount = 0;
          document.body.style.overflow = "";
        }
      };
    }
  }, [locked]);
}
