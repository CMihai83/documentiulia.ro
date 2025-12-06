"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout, MobileNav } from "@/components/layout";
import {
  ArrowLeft,
  Send,
  Image,
  Link as LinkIcon,
  Bold,
  Italic,
  List,
  Code,
  HelpCircle,
} from "lucide-react";

const categories = [
  { id: "contabilitate", name: "Contabilitate Generală" },
  { id: "fiscalitate", name: "Fiscalitate și Taxe" },
  { id: "efactura", name: "E-Factura" },
  { id: "saft", name: "SAF-T" },
  { id: "ajutor", name: "Ajutor și Suport" },
];

export default function NewTopicPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category || !content.trim()) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    router.push("/forum");
  };

  const insertFormatting = (type: string) => {
    const textarea = document.querySelector("textarea");
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    let newText = "";
    switch (type) {
      case "bold":
        newText = `**${selectedText || "text"}**`;
        break;
      case "italic":
        newText = `*${selectedText || "text"}*`;
        break;
      case "list":
        newText = `\n- ${selectedText || "element"}`;
        break;
      case "code":
        newText = `\`${selectedText || "cod"}\``;
        break;
      case "link":
        newText = `[${selectedText || "text"}](url)`;
        break;
      default:
        return;
    }

    setContent(content.substring(0, start) + newText + content.substring(end));
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/forum"
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Subiect Nou</h1>
            <p className="text-slate-500">Începe o nouă discuție în comunitate</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Categorie *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selectează categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Titlu *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={150}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Descrie pe scurt problema sau întrebarea ta"
            />
            <p className="text-xs text-slate-400 mt-2 text-right">
              {title.length}/150 caractere
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Conținut *
            </label>

            {/* Formatting toolbar */}
            <div className="flex items-center gap-1 mb-2 pb-2 border-b border-slate-200">
              <button
                type="button"
                onClick={() => insertFormatting("bold")}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
                title="Bold"
              >
                <Bold className="w-4 h-4 text-slate-600" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("italic")}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
                title="Italic"
              >
                <Italic className="w-4 h-4 text-slate-600" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("list")}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
                title="Listă"
              >
                <List className="w-4 h-4 text-slate-600" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("code")}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
                title="Cod"
              >
                <Code className="w-4 h-4 text-slate-600" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("link")}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
                title="Link"
              >
                <LinkIcon className="w-4 h-4 text-slate-600" />
              </button>
              <div className="flex-1" />
              <button
                type="button"
                className="p-2 hover:bg-slate-100 rounded-lg transition"
                title="Adaugă imagine"
              >
                <Image className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={10}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
              placeholder="Descrie detaliat problema ta. Include:
- Contextul situației
- Ce ai încercat deja
- Mesajele de eroare (dacă există)
- Legislația sau articolele relevante"
            />
            <p className="text-xs text-slate-400 mt-2">
              Suportă formatare Markdown. Minim 50 de caractere.
            </p>
          </div>

          {/* Guidelines */}
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-900 mb-1">
                  Sfaturi pentru o întrebare bună
                </h3>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Fii specific și oferă context</li>
                  <li>• Include detalii relevante (tip firmă, regim TVA, etc.)</li>
                  <li>• Verifică dacă întrebarea nu a mai fost pusă</li>
                  <li>• Evită informații personale sau confidențiale</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link
              href="/forum"
              className="px-6 py-3 text-slate-600 hover:text-slate-900 font-medium transition"
            >
              Anulează
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !category || content.length < 50}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Se trimite...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Publică
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <MobileNav />
    </AppLayout>
  );
}
