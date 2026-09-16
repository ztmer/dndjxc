import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "电脑店系统",
    short_name: "电脑店",
    description: "客户时间线 · 工单 · 串号保修",
    start_url: "/m",
    display: "fullscreen",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#000000",
    lang: "zh-CN",
  };
}
