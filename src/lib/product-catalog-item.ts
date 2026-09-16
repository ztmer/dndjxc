/** 产品目录条目。inShop=false 只进目录，不自动开本店经营档。 */
export type CatalogProduct = {
  code: string;
  name: string;
  brand: string;
  spec: string;
  unit: string;
  cat: string;
  sale: number;
  cost: number;
  stock?: number;
  warranty?: number;
  trackSerial?: boolean;
  isStocked?: boolean;
  canBeBuildPart?: boolean;
  remark?: string;
  params?: string;
  inShop?: boolean;
  images: string[];
};

export function item(
  code: string,
  brand: string,
  name: string,
  spec: string,
  cat: string,
  sale: number,
  cost: number,
  opts: Partial<Omit<CatalogProduct, "code" | "brand" | "name" | "spec" | "cat" | "sale" | "cost">> = {},
): CatalogProduct {
  return {
    code,
    brand,
    name,
    spec,
    cat,
    sale,
    cost,
    unit: "件",
    images: [],
    inShop: false,
    canBeBuildPart: true,
    ...opts,
  };
}
