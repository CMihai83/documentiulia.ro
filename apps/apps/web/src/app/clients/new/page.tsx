"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout, MobileNav } from "@/components/layout";
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  CreditCard,
  Save,
  Search,
  Loader2,
  CheckCircle,
} from "lucide-react";

export default function NewClientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCUI, setIsSearchingCUI] = useState(false);
  const [cuiFound, setCuiFound] = useState(false);
  const [clientType, setClientType] = useState<"company" | "individual">("company");

  const [formData, setFormData] = useState({
    name: "",
    cui: "",
    regCom: "",
    vatPayer: false,
    email: "",
    phone: "",
    address: "",
    city: "",
    county: "",
    country: "România",
    iban: "",
    bank: "",
    contactPerson: "",
    notes: "",
  });

  const handleCUISearch = async () => {
    if (!formData.cui || formData.cui.length < 2) return;

    setIsSearchingCUI(true);
    try {
      // TODO: Integrate with ANAF API for CUI lookup
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate finding company data
      if (formData.cui.startsWith("RO") || formData.cui.length >= 6) {
        setFormData({
          ...formData,
          name: "SC Exemplu SRL",
          regCom: "J40/1234/2020",
          vatPayer: formData.cui.startsWith("RO"),
          address: "Str. Exemplu nr. 10",
          city: "București",
          county: "Sector 1",
        });
        setCuiFound(true);
      }
    } catch (error) {
      console.error("Error searching CUI:", error);
    } finally {
      setIsSearchingCUI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement API call to save client
      console.log("Saving client:", formData);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push("/clients");
    } catch (error) {
      console.error("Error saving client:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const counties = [
    "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani",
    "Brașov", "Brăila", "București", "Buzău", "Caraș-Severin", "Călărași",
    "Cluj", "Constanța", "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu",
    "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș",
    "Mehedinți", "Mureș", "Neamț", "Olt", "Prahova", "Satu Mare", "Sălaj",
    "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea", "Vaslui", "Vâlcea",
    "Vrancea", "Sector 1", "Sector 2", "Sector 3", "Sector 4", "Sector 5", "Sector 6",
  ];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/clients"
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Client Nou</h1>
            <p className="text-slate-500">Adaugă un client nou în sistem</p>
          </div>
        </div>

        {/* Client Type Toggle */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Tip Client
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setClientType("company")}
              className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition ${
                clientType === "company"
                  ? "border-blue-600 bg-blue-50 text-blue-600"
                  : "border-slate-200 hover:border-slate-300 text-slate-600"
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span className="font-medium">Persoană Juridică</span>
            </button>
            <button
              type="button"
              onClick={() => setClientType("individual")}
              className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition ${
                clientType === "individual"
                  ? "border-blue-600 bg-blue-50 text-blue-600"
                  : "border-slate-200 hover:border-slate-300 text-slate-600"
              }`}
            >
              <User className="w-5 h-5" />
              <span className="font-medium">Persoană Fizică</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Company Details */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {clientType === "company" ? "Date Companie" : "Date Personale"}
            </h2>

            <div className="space-y-4">
              {clientType === "company" && (
                <>
                  {/* CUI with Search */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      CUI / CIF
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Ex: RO12345678"
                          value={formData.cui}
                          onChange={(e) => {
                            setFormData({ ...formData, cui: e.target.value });
                            setCuiFound(false);
                          }}
                          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {cuiFound && (
                          <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleCUISearch}
                        disabled={isSearchingCUI || !formData.cui}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition disabled:opacity-50"
                      >
                        {isSearchingCUI ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        Caută
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Introdu CUI-ul pentru a prelua automat datele din ANAF
                    </p>
                  </div>

                  {/* Reg Com */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nr. Reg. Com.
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: J40/1234/2020"
                      value={formData.regCom}
                      onChange={(e) =>
                        setFormData({ ...formData, regCom: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* VAT Payer */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="vatPayer"
                      checked={formData.vatPayer}
                      onChange={(e) =>
                        setFormData({ ...formData, vatPayer: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor="vatPayer"
                      className="text-sm font-medium text-slate-700"
                    >
                      Plătitor de TVA
                    </label>
                  </div>
                </>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {clientType === "company" ? "Denumire Firmă" : "Nume Complet"} *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder={
                      clientType === "company"
                        ? "Ex: SC Exemplu SRL"
                        : "Ex: Ion Popescu"
                    }
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Date de Contact
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="exemplu@firma.ro"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Telefon
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="0721 234 567"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Contact Person (for companies) */}
              {clientType === "company" && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Persoană de Contact
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Nume persoană de contact"
                      value={formData.contactPerson}
                      onChange={(e) =>
                        setFormData({ ...formData, contactPerson: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Adresă</h2>

            <div className="space-y-4">
              {/* Street Address */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Adresă
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Str. Exemplu nr. 10, Bl. A, Sc. 1, Ap. 5"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Localitate
                  </label>
                  <input
                    type="text"
                    placeholder="București"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* County */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Județ / Sector
                  </label>
                  <select
                    value={formData.county}
                    onChange={(e) =>
                      setFormData({ ...formData, county: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selectează...</option>
                    {counties.map((county) => (
                      <option key={county} value={county}>
                        {county}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Țară
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Banking Info */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Date Bancare
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              {/* IBAN */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  IBAN
                </label>
                <input
                  type="text"
                  placeholder="RO49AAAA1B31007593840000"
                  value={formData.iban}
                  onChange={(e) =>
                    setFormData({ ...formData, iban: e.target.value.toUpperCase() })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
              </div>

              {/* Bank */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bancă
                </label>
                <input
                  type="text"
                  placeholder="Ex: Banca Transilvania"
                  value={formData.bank}
                  onChange={(e) =>
                    setFormData({ ...formData, bank: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Observații
            </label>
            <textarea
              rows={3}
              placeholder="Note sau observații despre client..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4 mb-20">
            <Link
              href="/clients"
              className="px-6 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-700"
            >
              Anulează
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSubmitting ? "Se salvează..." : "Salvează Client"}
            </button>
          </div>
        </form>
      </div>
      <MobileNav />
    </AppLayout>
  );
}
