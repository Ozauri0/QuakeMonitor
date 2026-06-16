import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const CONFIG_PATH = join(process.cwd(), "data", "providers.json");

interface ProviderConfig {
  selectedStationIds: string[];
  boundingBox: {
    enabled: boolean;
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  providerFilter: {
    enabled: boolean;
    allowedProviders: string[];
  };
}

function loadConfig(): ProviderConfig {
  if (!existsSync(CONFIG_PATH)) {
    return {
      selectedStationIds: [],
      boundingBox: {
        enabled: false,
        minLat: -55.0,
        maxLat: -17.5,
        minLon: -75.5,
        maxLon: -66.5,
      },
      providerFilter: {
        enabled: false,
        allowedProviders: [],
      },
    };
  }
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {
      selectedStationIds: [],
      boundingBox: {
        enabled: false,
        minLat: -55.0,
        maxLat: -17.5,
        minLon: -75.5,
        maxLon: -66.5,
      },
      providerFilter: {
        enabled: false,
        allowedProviders: [],
      },
    };
  }
}

function saveConfig(config: ProviderConfig) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export async function GET() {
  const config = loadConfig();
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[providers] POST body:", JSON.stringify(body).slice(0, 200));
    const config = loadConfig();

    if (body.selectedStationIds !== undefined) {
      config.selectedStationIds = Array.from(new Set(body.selectedStationIds as string[]));
    }

    if (body.boundingBox !== undefined) {
      config.boundingBox = { ...config.boundingBox, ...body.boundingBox };
    }

    if (body.providerFilter !== undefined) {
      config.providerFilter = { ...config.providerFilter, ...body.providerFilter };
    }

    saveConfig(config);
    return NextResponse.json({ success: true, config });
  } catch (e: any) {
    console.error("[providers] POST error:", e);
    return NextResponse.json({ error: "Invalid payload", detail: e?.message }, { status: 400 });
  }
}
