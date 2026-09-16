"use client";

import { useEffect, useState } from "react";
import { loadShopBiz } from "@/actions/settings";

export function useShopBiz() {
  const [cfg, setCfg] = useState({ forceOutboundSn: false, openingMode: false });
  useEffect(() => {
    void loadShopBiz().then(setCfg);
  }, []);
  return cfg;
}

export function useForceOutboundSn() {
  return useShopBiz().forceOutboundSn;
}
