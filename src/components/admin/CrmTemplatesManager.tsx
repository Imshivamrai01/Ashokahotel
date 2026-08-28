"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  Save,
  RotateCcw,
  Sparkles,
  Cake,
  Heart,
  Award,
  Tag,
  Copy,
  Check,
  Smartphone,
  Eye,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface TemplateItem {
  key: "greeting" | "birthday" | "anniversary" | "vip" | "voucher";
  title: string;
  description: string;
  templateText: string;
  updatedAt?: string | null;
  isCustomized?: boolean;
}

const TEMPLATE_ICONS = {
  greeting: <MessageCircle className="w-4 h-4 text-emerald-400" />,
  birthday: <Cake className="w-4 h-4 text-amber-400" />,
  anniversary: <Heart className="w-4 h-4 text-rose-400" />,
  vip: <Award className="w-4 h-4 text-cyan-400" />,
  voucher: <Tag className="w-4 h-4 text-sky-400" />,
};

const AVAILABLE_VARIABLES = [
  { tag: "{name}", label: "Customer Name", example: "Rahul Verma" },
  { tag: "{hotel_name}", label: "Hotel Name", example: "Ashoka Hotel" },
  { tag: "{code}", label: "Voucher Code", example: "ASHOKA100" },
  { tag: "{discount}", label: "Discount Detail", example: "₹100 FLAT OFF" },
  { tag: "{min_bill}", label: "Min Bill Amount", example: "500" },
  { tag: "{valid_till}", label: "Expiry Date", example: "30 Sep 2026" },
  { tag: "{voucher_block}", label: "Voucher Box", example: "🎁 Exclusive Coupon: ASHOKA100" },
];

export default function CrmTemplatesManager() {
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<TemplateItem["key"]>("birthday");
  const [editText, setEditText] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<{ templates: TemplateItem[] }>({
    queryKey: ["admin-crm-templates"],
    queryFn: async () => {
      const res = await fetch("/api/admin/crm-templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const templates = data?.templates || [];
  const currentTemplate = templates.find((t) => t.key === selectedKey);

  // Sync state when template selection changes
  const activeText = editText !== "" ? editText : currentTemplate?.templateText || "";

  const handleSelect = (key: TemplateItem["key"]) => {
    setSelectedKey(key);
    const found = templates.find((t) => t.key === key);
    if (found) setEditText(found.templateText);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: { key: string; templateText: string; title: string }) => {
      const res = await fetch("/api/admin/crm-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-crm-templates"] });
      toast.success("WhatsApp Message Template Saved!");
    },
    onError: () => {
      toast.error("Failed to save template");
    },
  });

  const handleSave = () => {
    if (!currentTemplate) return;
    saveMutation.mutate({
      key: selectedKey,
      title: currentTemplate.title,
      templateText: activeText,
    });
  };

  const insertVariable = (tag: string) => {
    setEditText((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  // Generate Simulated Preview
  const previewText = (activeText || "")
    .replace(/{name}/g, "Rahul Verma")
    .replace(/{hotel_name}/g, "Ashoka Hotel")
    .replace(/{code}/g, "ASHOKA100")
    .replace(/{discount}/g, "₹100 FLAT OFF")
    .replace(/{min_bill}/g, "500")
    .replace(/{valid_till}/g, "30 Sep 2026")
    .replace(/{voucher_block}/g, "🎁 Exclusive Coupon: *ASHOKA100* (₹100 FLAT OFF)\n📌 Valid till: 30 Sep 2026");

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewText);
    setCopied(true);
    toast.success("Preview copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 font-playfair flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            WhatsApp Message Templates
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Customize automated WhatsApp greetings, birthday wishes, and promotional offer messages
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Template Selector List */}
        <div className="lg:col-span-4 space-y-2">
          <p className="text-xs font-black text-slate-700 uppercase tracking-wider px-1">
            Available Templates ({templates.length})
          </p>

          <div className="space-y-1.5">
            {isLoading && (
              <div className="p-8 text-center text-xs text-slate-500">
                <span className="loading loading-spinner loading-sm text-emerald-600 mr-2" />
                Loading templates...
              </div>
            )}

            {templates.map((t) => {
              const isSelected = t.key === selectedKey;
              return (
                <button
                  key={t.key}
                  onClick={() => handleSelect(t.key)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? "bg-emerald-50 border-emerald-400 shadow-sm"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    {TEMPLATE_ICONS[t.key]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold text-xs text-slate-900 block truncate">
                        {t.title}
                      </span>
                      {t.isCustomized && (
                        <span className="badge badge-xs bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold shrink-0">
                          Custom
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-tight font-medium">
                      {t.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle: Editor Box */}
        <div className="lg:col-span-4 space-y-3 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <span className="font-extrabold text-sm text-slate-900 block">
                  {currentTemplate?.title || "Message Editor"}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Type your custom message below. Use *text* for bold in WhatsApp.
                </span>
              </div>
            </div>

            {/* Quick Variable Injector Pills */}
            <div>
              <span className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                Click to Insert Variables:
              </span>
              <div className="flex flex-wrap gap-1">
                {AVAILABLE_VARIABLES.map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => insertVariable(v.tag)}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-emerald-800 font-mono text-[11px] font-bold cursor-pointer transition-colors"
                    title={`Insert ${v.label} (e.g. ${v.example})`}
                  >
                    + {v.tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor Textarea */}
            <div>
              <textarea
                value={activeText}
                onChange={(e) => setEditText(e.target.value)}
                rows={10}
                placeholder="Enter WhatsApp template message..."
                className="textarea textarea-bordered bg-slate-50 border-slate-300 text-slate-900 font-mono text-xs w-full rounded-xl focus:bg-white focus:border-emerald-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs px-4 gap-1.5 border-none shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              {saveMutation.isPending ? "Saving..." : "Save Template"}
            </button>
          </div>
        </div>

        {/* Right: Live WhatsApp Chat Simulation Preview */}
        <div className="lg:col-span-4 bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                Live WhatsApp Preview
              </span>
              <button
                onClick={handleCopyPreview}
                className="btn btn-xs btn-ghost text-slate-600 hover:bg-slate-100 gap-1 text-[10px]"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            {/* Chat Bubble Container in WhatsApp Light Canvas */}
            <div className="bg-[#ECE5DD] rounded-2xl p-3.5 border border-slate-300 shadow-inner flex flex-col gap-2 min-h-[220px]">
              <div className="text-center">
                <span className="bg-white/90 text-[10px] text-slate-600 px-2 py-0.5 rounded-md font-mono shadow-xs border border-slate-200">
                  TODAY
                </span>
              </div>

              {/* Light Green WhatsApp Speech Bubble */}
              <div className="self-start max-w-[95%] bg-[#D9FDD3] text-slate-900 rounded-2xl rounded-tl-none p-3 shadow-sm text-xs leading-relaxed font-sans relative border border-emerald-200">
                <div className="whitespace-pre-wrap font-medium">
                  {previewText}
                </div>
                <span className="text-[9px] text-slate-500 block text-right mt-1 font-mono">
                  12:45 PM ✓✓
                </span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2 mt-3 font-medium">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span>When cashier or admin clicks WhatsApp, this custom template will be sent automatically.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
