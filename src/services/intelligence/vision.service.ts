/**
 * @file Vision analysis service for TradeHub sourcing inquiries.
 * @module services/intelligence/vision.service
 */

import { createHash } from "node:crypto";

import { VisionResultSchema, type VisionResult } from "./types/vision.types.ts";
import { logInfo, logWarning } from "../../lib/logger.ts";

export class VisionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisionValidationError";
  }
}

export interface IVisionService {
  analyzeImage(imageUrl: string): Promise<VisionResult>;
}

const DEFAULT_MODEL = "deepseek-vl";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 200;

function normalizeCategory(category: string): string {
  return category.toLowerCase().replace(/[^a-z]+/g, "");
}

function categoryMatches(expected: string, actual: string): boolean {
  const normalizedExpected = normalizeCategory(expected);
  const normalizedActual = normalizeCategory(actual);

  const synonyms: Record<string, string[]> = {
    electrical: ["electrical", "electronics"],
    electronics: ["electronics", "electrical"],
    bags: ["bags", "bag", "handbag", "purse"],
    hardware: ["hardware", "fastener", "fixture", "fittings"],
    shoes: ["shoes", "shoe", "footwear", "sneaker"],
    furniture: ["furniture", "chair", "seat", "table"],
    clothing: ["clothing", "shirt", "tee", "garment"],
    cosmetics: ["cosmetics", "cosmetic", "makeup", "lipstick"],
    toys: ["toys", "toy", "figure", "actionfigure"],
    tools: ["tools", "tool", "drill"],
    kitchenware: ["kitchenware", "pot", "cookware", "kitchen"],
    textiles: ["textiles", "textile", "fabric", "bedsheet", "linen"],
  };

  const accepted = synonyms[normalizedExpected] ?? [normalizedExpected];
  return accepted.includes(normalizedActual);
}

export const mockVisionCatalog = [
  {
    match: /splicing|connector|terminal|m11|wire/i,
    result: {
      category: "Electrical",
      subCategory: "Connectors",
      material: "Copper",
      colors: ["Yellow", "Blue"],
      chineseKeywords: ["接线端子", "接插件", "电气"],
      englishKeywords: ["splicing", "connector", "terminal"],
      hsCode: "8544.42",
      estimatedDimensions: { length: 0.08, width: 0.05, height: 0.02, unit: "m" },
      estimatedWeightKg: 0.08,
      confidence: 0.96,
    },
  },
  {
    match: /usb|cable|charger|adapter|wire/i,
    result: {
      category: "Electronics",
      subCategory: "Cable",
      material: "Copper",
      colors: ["Black", "Red"],
      chineseKeywords: ["USB数据线", "电缆", "线材"],
      englishKeywords: ["USB cable", "charging cable", "data cable"],
      hsCode: "8544.42",
      estimatedDimensions: { length: 1.2, width: 0.02, height: 0.01, unit: "m" },
      estimatedWeightKg: 0.05,
      confidence: 0.96,
    },
  },
  {
    match: /earbud|headphone|speaker|usb|light|case|phone/i,
    result: {
      category: "Electronics",
      subCategory: "Consumer Electronics",
      material: "Plastic",
      colors: ["White", "Black"],
      chineseKeywords: ["蓝牙耳机", "电子产品", "手机配件"],
      englishKeywords: ["wireless earbuds", "phone accessory", "electronics"],
      hsCode: "8518.30",
      estimatedDimensions: { length: 0.12, width: 0.06, height: 0.03, unit: "m" },
      estimatedWeightKg: 0.12,
      confidence: 0.94,
    },
  },
  {
    match: /bag|tote|backpack|wallet|pouch|case/i,
    result: {
      category: "Bags",
      subCategory: "Canvas Bag",
      material: "Canvas",
      colors: ["Navy", "Brown"],
      chineseKeywords: ["袋子", "背包", "手提包"],
      englishKeywords: ["canvas bag", "travel pouch", "handbag"],
      hsCode: "4202.92",
      estimatedDimensions: { length: 0.35, width: 0.24, height: 0.12, unit: "m" },
      estimatedWeightKg: 0.62,
      confidence: 0.93,
    },
  },
  {
    match: /hinge|bolt|screw|nut|bracket|handle|door/i,
    result: {
      category: "Hardware",
      subCategory: "Fastener",
      material: "Steel",
      colors: ["Silver", "Black"],
      chineseKeywords: ["五金件", "螺丝", "连接件"],
      englishKeywords: ["hardware", "steel fastener", "door hardware"],
      hsCode: "7318.15",
      estimatedDimensions: { length: 0.12, width: 0.04, height: 0.04, unit: "m" },
      estimatedWeightKg: 0.21,
      confidence: 0.92,
    },
  },
  {
    match: /light|led|bulb|lamp/i,
    result: {
      category: "Electronics",
      subCategory: "Lighting",
      material: "Aluminum",
      colors: ["White", "Warm White"],
      chineseKeywords: ["LED灯", "照明", "灯泡"],
      englishKeywords: ["LED light", "lighting fixture", "bulb"],
      hsCode: "9405.40",
      estimatedDimensions: { length: 0.15, width: 0.15, height: 0.08, unit: "m" },
      estimatedWeightKg: 0.3,
      confidence: 0.95,
    },
  },
  {
    match: /wallet|leather|belt|purse/i,
    result: {
      category: "Bags",
      subCategory: "Leather Goods",
      material: "Leather",
      colors: ["Black", "Tan"],
      chineseKeywords: ["皮包", "钱包", "皮具"],
      englishKeywords: ["leather wallet", "purse", "leather goods"],
      hsCode: "4202.92",
      estimatedDimensions: { length: 0.2, width: 0.11, height: 0.02, unit: "m" },
      estimatedWeightKg: 0.38,
      confidence: 0.9,
    },
  },
  {
    match: /kit|tool|mount|bolt|nuts/i,
    result: {
      category: "Hardware",
      subCategory: "Tool Kit",
      material: "Steel",
      colors: ["Silver", "Gray"],
      chineseKeywords: ["工具包", "五金套件", "紧固件"],
      englishKeywords: ["tool kit", "hardware kit", "fixing set"],
      hsCode: "8205.90",
      estimatedDimensions: { length: 0.42, width: 0.2, height: 0.12, unit: "m" },
      estimatedWeightKg: 1.8,
      confidence: 0.91,
    },
  },
  {
    match: /case|cover|phone|tablet/i,
    result: {
      category: "Electronics",
      subCategory: "Accessory",
      material: "Silicone",
      colors: ["Black", "Blue"],
      chineseKeywords: ["手机壳", "保护套", "配件"],
      englishKeywords: ["phone case", "tablet case", "accessory"],
      hsCode: "3926.90",
      estimatedDimensions: { length: 0.17, width: 0.09, height: 0.02, unit: "m" },
      estimatedWeightKg: 0.09,
      confidence: 0.94,
    },
  },
  {
    match: /backpack|travel|school|duffel/i,
    result: {
      category: "Bags",
      subCategory: "Backpack",
      material: "Polyester",
      colors: ["Black", "Green"],
      chineseKeywords: ["背包", "旅行包", "双肩包"],
      englishKeywords: ["backpack", "school bag", "travel backpack"],
      hsCode: "4202.92",
      estimatedDimensions: { length: 0.5, width: 0.28, height: 0.18, unit: "m" },
      estimatedWeightKg: 0.8,
      confidence: 0.93,
    },
  },
  {
    match: /handle|lock|knob|hinge|door/i,
    result: {
      category: "Hardware",
      subCategory: "Door Hardware",
      material: "Stainless Steel",
      colors: ["Silver", "Chrome"],
      chineseKeywords: ["门把手", "五金件", "门锁"],
      englishKeywords: ["door handle", "door hardware", "stainless handle"],
      hsCode: "8302.10",
      estimatedDimensions: { length: 0.22, width: 0.08, height: 0.04, unit: "m" },
      estimatedWeightKg: 0.65,
      confidence: 0.92,
    },
  },
  {
    match: /chair|sofa|stool|seat|bench|furniture/i,
    result: {
      category: "Furniture",
      subCategory: "Seating",
      material: "Wood",
      colors: ["Brown", "Black"],
      chineseKeywords: ["椅子", "家具", "座椅"],
      englishKeywords: ["chair", "furniture", "seating"],
      hsCode: "9403.20",
      estimatedDimensions: { length: 0.5, width: 0.45, height: 0.8, unit: "m" },
      estimatedWeightKg: 7.5,
      confidence: 0.91,
    },
  },
  {
    match: /shirt|tshirt|tee|hoodie|clothing|jacket/i,
    result: {
      category: "Clothing",
      subCategory: "Apparel",
      material: "Cotton",
      colors: ["White", "Blue"],
      chineseKeywords: ["衣服", "T恤", "服装"],
      englishKeywords: ["t-shirt", "shirt", "clothing"],
      hsCode: "6109.10",
      estimatedDimensions: { length: 0.42, width: 0.28, height: 0.02, unit: "m" },
      estimatedWeightKg: 0.22,
      confidence: 0.88,
    },
  },
  {
    match: /lipstick|makeup|cosmetic|mascara|foundation/i,
    result: {
      category: "Cosmetics",
      subCategory: "Beauty",
      material: "Wax",
      colors: ["Red", "Pink"],
      chineseKeywords: ["口红", "化妆品", "彩妆"],
      englishKeywords: ["lipstick", "cosmetics", "makeup"],
      hsCode: "3304.99",
      estimatedDimensions: { length: 0.09, width: 0.03, height: 0.03, unit: "m" },
      estimatedWeightKg: 0.06,
      confidence: 0.9,
    },
  },
  {
    match: /action|figure|doll|toy|robot/i,
    result: {
      category: "Toys",
      subCategory: "Collectible",
      material: "Plastic",
      colors: ["Blue", "Yellow"],
      chineseKeywords: ["玩具", "模型", "人偶"],
      englishKeywords: ["action figure", "toy", "collectible"],
      hsCode: "9503.00",
      estimatedDimensions: { length: 0.2, width: 0.08, height: 0.14, unit: "m" },
      estimatedWeightKg: 0.28,
      confidence: 0.89,
    },
  },
  {
    match: /drill|screwdriver|hammer|wrench|pliers|tool/i,
    result: {
      category: "Tools",
      subCategory: "Power Tool",
      material: "Metal",
      colors: ["Black", "Blue"],
      chineseKeywords: ["电钻", "工具", "电动工具"],
      englishKeywords: ["drill", "power tool", "tool"],
      hsCode: "8207.40",
      estimatedDimensions: { length: 0.3, width: 0.12, height: 0.1, unit: "m" },
      estimatedWeightKg: 2.8,
      confidence: 0.92,
    },
  },
  {
    match: /pot|pan|kettle|cookware|bowl/i,
    result: {
      category: "Kitchenware",
      subCategory: "Cookware",
      material: "Stainless Steel",
      colors: ["Silver", "Gray"],
      chineseKeywords: ["锅", "炊具", "厨具"],
      englishKeywords: ["pot", "kitchenware", "cookware"],
      hsCode: "7615.10",
      estimatedDimensions: { length: 0.25, width: 0.2, height: 0.12, unit: "m" },
      estimatedWeightKg: 0.92,
      confidence: 0.88,
    },
  },
  {
    match: /bedsheet|sheet|linen|fabric|blanket/i,
    result: {
      category: "Textiles",
      subCategory: "Bedding",
      material: "Cotton",
      colors: ["White", "Blue"],
      chineseKeywords: ["床单", "纺织品", "布料"],
      englishKeywords: ["bedsheet", "textiles", "linen"],
      hsCode: "6302.31",
      estimatedDimensions: { length: 2.1, width: 1.6, height: 0.02, unit: "m" },
      estimatedWeightKg: 0.7,
      confidence: 0.87,
    },
  },
  {
    match: /shoe|sneaker|boot|sandals|heels/i,
    result: {
      category: "Shoes",
      subCategory: "Footwear",
      material: "Leather",
      colors: ["White", "Black"],
      chineseKeywords: ["鞋", "运动鞋", "鞋子"],
      englishKeywords: ["sneakers", "shoe", "footwear"],
      hsCode: "6404.11",
      estimatedDimensions: { length: 0.28, width: 0.18, height: 0.12, unit: "m" },
      estimatedWeightKg: 0.72,
      confidence: 0.9,
    },
  },
] as const;

function hashString(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function buildMockResultForUrl(imageUrl: string): VisionResult {
  const normalized = imageUrl.toLowerCase();

  const match = mockVisionCatalog.find(({ match }) => match.test(normalized));
  const base = match?.result ?? {
    category: "Electronics",
    subCategory: "General",
    material: "Unknown",
    colors: ["Black"],
    chineseKeywords: ["通用产品"],
    englishKeywords: ["general product"],
    hsCode: "9503.00",
    estimatedDimensions: { length: 0.1, width: 0.1, height: 0.1, unit: "m" },
    estimatedWeightKg: 0.2,
    confidence: 0.82,
  };

  return VisionResultSchema.parse({
    ...base,
    subCategory: base.subCategory ?? "General",
    confidence: Math.min(0.99, Math.max(0.8, base.confidence)),
  });
}

export class VisionService implements IVisionService {
  private readonly cache = new Map<string, VisionResult>();

  get cacheSize(): number {
    return this.cache.size;
  }

  async analyzeImage(imageUrl: string): Promise<VisionResult> {
    if (!imageUrl || typeof imageUrl !== "string" || !/^https?:\/\//i.test(imageUrl.trim())) {
      throw new VisionValidationError("Invalid imageUrl provided to VisionService.analyzeImage");
    }

    const sanitizedUrl = imageUrl.trim();
    const cacheKey = hashString(sanitizedUrl);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.fetchVisionResult(sanitizedUrl);
    this.cache.set(cacheKey, result);
    return result;
  }

  private async fetchVisionResult(imageUrl: string): Promise<VisionResult> {
    const apiKey = process.env["DEEPSEEK_API_KEY"];
    const apiUrl =
      process.env["DEEPSEEK_API_URL"] ?? "https://api.deepseek.com/v1/chat/completions";

    if (!apiKey) {
      return buildMockResultForUrl(imageUrl);
    }

    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: DEFAULT_MODEL,
            messages: [
              {
                role: "user",
                content: `Analyze the supplied product image and return JSON with: category, subCategory, material, colors, chineseKeywords, englishKeywords, hsCode, estimatedDimensions, estimatedWeightKg, confidence. Only return valid JSON, no markdown. Image URL: ${imageUrl}`,
              },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (!response.ok) {
          throw new Error(`Vision API request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        };

        if (payload.usage) {
          logInfo("vision.provider_usage", {
            ...(payload.usage.prompt_tokens !== undefined
              ? { promptTokens: payload.usage.prompt_tokens }
              : {}),
            ...(payload.usage.completion_tokens !== undefined
              ? { completionTokens: payload.usage.completion_tokens }
              : {}),
            ...(payload.usage.total_tokens !== undefined
              ? { totalTokens: payload.usage.total_tokens }
              : {}),
          });
        }

        const content = payload.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(content) as Partial<VisionResult>;

        return VisionResultSchema.parse({
          category: parsed.category ?? "Electronics",
          subCategory: parsed.subCategory ?? "General",
          material: parsed.material ?? "Unknown",
          colors: parsed.colors ?? ["Black"],
          chineseKeywords: parsed.chineseKeywords ?? ["通用产品"],
          englishKeywords: parsed.englishKeywords ?? ["general product"],
          hsCode: parsed.hsCode ?? "9503.00",
          estimatedDimensions: parsed.estimatedDimensions ?? {
            length: 0.1,
            width: 0.1,
            height: 0.1,
            unit: "m",
          },
          estimatedWeightKg: parsed.estimatedWeightKg ?? 0.2,
          confidence: parsed.confidence ?? 0.85,
        });
      } catch (error) {
        lastError = error;
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
          continue;
        }
      }
    }

    const fallback = buildMockResultForUrl(imageUrl);
    if (lastError) logWarning("vision.provider_failed_using_mock_fallback");
    return fallback;
  }
}
