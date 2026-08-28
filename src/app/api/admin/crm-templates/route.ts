import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import CrmTemplate, { DEFAULT_CRM_TEMPLATES, CrmTemplateKey } from "@/lib/db/models/CrmTemplate";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const dbTemplates = await CrmTemplate.find().lean();
    const templateMap = new Map(dbTemplates.map((t) => [t.key, t]));

    const templates = (Object.keys(DEFAULT_CRM_TEMPLATES) as CrmTemplateKey[]).map((key) => {
      const def = DEFAULT_CRM_TEMPLATES[key];
      const saved = templateMap.get(key);
      return {
        key,
        title: saved?.title || def.title,
        description: saved?.description || def.description,
        templateText: saved?.templateText || def.templateText,
        updatedAt: saved?.updatedAt || null,
        isCustomized: Boolean(saved),
      };
    });

    return NextResponse.json({ templates }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch CRM templates" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { key, title, templateText, description } = await req.json();

    if (!key || !templateText) {
      return NextResponse.json(
        { error: "Key and template text are required" },
        { status: 400 },
      );
    }

    const updated = await CrmTemplate.findOneAndUpdate(
      { key },
      {
        key,
        title: title || DEFAULT_CRM_TEMPLATES[key as CrmTemplateKey]?.title || key,
        description: description || DEFAULT_CRM_TEMPLATES[key as CrmTemplateKey]?.description,
        templateText,
      },
      { upsert: true, new: true },
    );

    return NextResponse.json({ template: updated }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save template" },
      { status: 500 },
    );
  }
}
