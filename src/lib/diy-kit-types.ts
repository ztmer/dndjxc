import type { BuildPresetPart } from "@/lib/build-presets";

export type ShopDiyKit = {
  id: string;
  code: string;
  name: string;
  scene: string;
  hint: string;
  laborFee: string;
  sale: number;
  cost: number;
  cpu: string;
  gpu: string;
  mb: string;
  ram: string;
  remark: string;
  parts: BuildPresetPart[];
};
