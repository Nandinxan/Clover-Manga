"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

import {
  X,
  Crown,
  Coins,
  Copy,
  Check,
  ChevronLeft,
  CreditCard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

// Багцын бүтцийг тодорхойлох интерфэйс
interface Plan {
  id: string;
  title: string;
  price: string;
  badge?: string;
  features: string[];
}

export default function GetAccessPage() {
  const router = useRouter();

  // Төлөвүүд (States)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [purchaseType, setPurchaseType] = useState<"premium" | "coin" | "">("");
  const [showPopup, setShowPopup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [alertPopup, setAlertPopup] = useState({ show: false, message: "" });

  // Ногоон дизайны зураг дээрх шиг шинэчилсэн багцууд (6 сар орсон)
  const premiumPlans: Plan[] = [
    {
      id: "30_days",
      title: "1 САР",
      price: "5,000₮",
      features: ["Бүх манхва унших","Чанартай зураглал","Туршиж үзэх"],
    },
    {
      id: "90_days",
      title: "3 САР",
      price: "13,500₮",
      badge: "САНАЛ БОЛГОХ",
      features: ["Бүх манхва унших", "Чанартай зураглал", "10% хэмнэлт"],
    },
    {
      id: "180_days",
      title: "6 САР",
      price: "25,500₮",
      features: ["Бүх манхва унших", "Чанартай зураглал", "15% хэмнэлт"],
    },
  ];

  // Койн авах багцууд
  const coinPlans: Plan[] = [
    {
      id: "100_coin",
      title: "100 COIN",
      price: "3,000₮",
      features: ["100 Coin","Дурын 10 бүлэг нээж унших" ],
    },
    {
      id: "500_coin",
      title: "500 COIN",
      price: "15,000₮",
      badge: "САНАЛ БОЛГОХ",
      features: ["500 Coin","Дурын 50 бүлэг нээж унших" ],
    },
    {
      id: "1000_coin",
      title: "1000 COIN",
      price: "30,000₮",
      features: ["1000 Coin","Дурын 100 бүлэг нээж унших" ],
    },
  ];
// Дансны дугаар хуулах функц
  const handleCopyAccount = () => {
    navigator.clipboard.writeText("740005005692259277");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Firestore руу худалдан авалтын хүсэлт хадгалах функц
  const handlePurchase = async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("Эхлээд нэвтэрнэ үү.");
      return;
    }

    if (!selectedPlan) {
      alert("Багц сонгоно уу.");
      return;
    }

    try {
      await addDoc(collection(db, "users", user.uid, "purchases"), {
        planId: selectedPlan.id,
        planTitle: selectedPlan.title,
        price: selectedPlan.price,
        type: purchaseType,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      setShowPopup(true);
    } catch (error) {
      console.error("Purchase error:", error);
      alert("Хүсэлт илгээхэд алдаа гарлаа. Дахин оролдоно уу.");
    }
  };    
  return (
    <main className="min-h-screen bg-[#090909] text-white px-5 py-6">
      <div className="mx-auto max-w-6xl">
        
               {/* ================= HEADER (Үзэмжтэй, тод том голлуулсан дизайн) ================= */}
        <div className="relative mb-8 flex items-center justify-between border-b border-[#232A35]/40 pb-5">
          {/* Баруун талын X товчтой тэнцэх хоосон зай үүсгэж гарчгийг яг төвд нь голлуулна */}
          <div className="w-10 h-10 flex-shrink-0" />

          <div className="text-center flex-1">
            {/* 🟩 ШИНЭЧЛЭВ: Үсгийн хэмжээг text-base-ээс text-xl болгож томруулав */}
            <h1 className="text-xl font-black tracking-wide text-gray-100 uppercase">
              Эрх авах
            </h1>
            {/* 🟩 ШИНЭЧЛЭВ: Дэд текстийг илүү уншигдахуйц text-xs болгов */}
            <p className="mt-1 text-xs text-gray-400 font-medium">
              Өөрт тохирох эрхээ сонгоно уу.
            </p>
          </div>

          {/* 🟩 ШИНЭЧЛЭВ: Товчлуурын хэмжээ болон Icon-ийг илүү үзэмжтэй том болгов */}
          <button
            onClick={() => router.push("/")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#232A35] bg-[#141922] text-gray-400 transition-all hover:border-gray-500 hover:text-white active:scale-95 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>


        {/* ================= PREMIUM PLANS ================= */}
        <div className="mb-8 flex items-center gap-2">
          <Crown className="text-emerald-500" size={18} />
          <span className="text-sm font-bold tracking-wider text-emerald-500">PREMIUM ЭРХ</span>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {premiumPlans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => {
                setSelectedPlan(plan);
                setPurchaseType("premium");
              }}
              className={`relative overflow-hidden rounded-3xl border-2 bg-[#111111] p-7 text-left transition-all duration-300 cursor-pointer ${
                selectedPlan?.id === plan.id
                  ? "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,.30)]"
                  : "border-emerald-500/20 hover:border-emerald-500"
              }`}
            >
              {plan.badge && (
                <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-xl bg-emerald-500 px-4 py-1 text-[11px] font-bold text-white">
                  {plan.badge}
                </div>
              )}

              <div className="mt-5 flex justify-center">
                <div className="rounded-full bg-emerald-500/10 p-3">
                  <Crown size={28} className="text-emerald-500" />
                </div>
              </div>

              <h2 className="mt-6 text-center text-3xl font-black">{plan.title}</h2>
              <p className="mt-3 text-center text-5xl font-black text-white">{plan.price}</p>

              <div className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <ShieldCheck size={18} className="text-emerald-500" />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className={`mt-8 h-12 w-full rounded-xl font-bold transition ${
                  selectedPlan?.id === plan.id
                    ? "bg-emerald-500 text-white"
                    : "bg-[#202020] text-gray-300 hover:bg-emerald-500 hover:text-white"
                }`}
              >
                {selectedPlan?.id === plan.id ? "СОНГОГДСОН" : "СОНГОХ"}
              </button>
            </div>
          ))}
        </div>

        {/* ================= COIN PLANS ================= */}
        <div className="mt-12 mb-8 flex items-center gap-2">
          <Coins size={18} className="text-emerald-500" />
          <span className="text-sm font-bold tracking-wider text-emerald-500">COIN АВАХ</span>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {coinPlans.map((coin) => (
            <div
              key={coin.id}
              onClick={() => {
                setSelectedPlan(coin);
                setPurchaseType("coin");
              }}
              className={`relative overflow-hidden rounded-3xl border-2 bg-[#111111] p-7 text-left transition-all duration-300 cursor-pointer ${
                selectedPlan?.id === coin.id
                  ? "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,.30)]"
                  : "border-emerald-500/20 hover:border-emerald-500"
              }`}
            >
              {coin.badge && (
                <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-xl bg-emerald-500 px-4 py-1 text-[11px] font-bold text-white">
                  {coin.badge}
                </div>
              )}

              <div className="mt-5 flex justify-center">
                <div className="rounded-full bg-emerald-500/10 p-3">
                  <Coins size={28} className="text-emerald-500" />
                </div>
              </div>

              <h2 className="mt-6 text-center text-3xl font-black">{coin.title}</h2>
              <p className="mt-3 text-center text-5xl font-black text-white">{coin.price}</p>

              <div className="mt-8 space-y-4">
                {coin.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <ShieldCheck size={18} className="text-emerald-500" />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className={`mt-8 h-12 w-full rounded-xl font-bold transition ${
                  selectedPlan?.id === coin.id
                    ? "bg-emerald-500 text-white"
                    : "bg-[#202020] text-gray-300 hover:bg-emerald-500 hover:text-white"
                }`}
              >
                {selectedPlan?.id === coin.id ? "СОНГОГДСОН" : "СОНГОХ"}
              </button>
            </div>
          ))}
        </div>
               {/* ================= НЭГДСЭН ХУДАЛДАН АВАХ ТОВЧ (Хавтгай минималист ногоон товч) ================= */}
        <button
          onClick={handlePurchase}
          disabled={!selectedPlan}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-green-500 text-xs font-bold text-black transition active:scale-[0.99] disabled:opacity-20 hover:bg-green-400"
        >
          <CreditCard size={14} />
          ХУДАЛДАЖ АВАХ
        </button>

        {/* ================= ТӨЛБӨРИЙН МЭДЭЭЛЛИЙН ПОПАП ЦОНХ ================= */}
        {showPopup && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
            <div className="relative w-full max-w-sm rounded-2xl border border-[#232A35] bg-[#141922] p-5 text-center shadow-xl text-xs flex flex-col max-h-[85vh] overflow-y-auto style-scrollbar">

              {/* 🟩 ШИНЭЧЛЭВ: Зүүн талын сумыг устгаж, Мэдээлэл гарчгийг яг голд нь голлуулав */}
              <div className="flex items-center justify-between mb-2">
                {/* Баруун талын X товчтой тэнцэх хоосон зайг үүсгэж голлуулж байна */}
                <div className="w-7 h-7" />
                
                <h2 className="text-lg font-black tracking-wide text-gray-200 uppercase flex-1 text-center">
                  Мэдээлэл
                </h2>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowPopup(false);
                    setSelectedPlan(null);
                  }}
                  className="p-1.5 rounded-full bg-[#0B0F14]/60 border border-[#232A35] text-gray-400 hover:text-white transition active:scale-95 flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Сонгосон багцын тод ногоон үнийн дүн */}
              <div className="text-center font-black text-green-500 text-sm tracking-wide mt-2 uppercase">
                {selectedPlan.id.includes("30") && `1 САР — ${selectedPlan.price}`}
                {selectedPlan.id.includes("90") && `3 САР — ${selectedPlan.price}`}
                {selectedPlan.id.includes("180") && `6 САР — ${selectedPlan.price}`}
                {!selectedPlan.id.includes("days") && `${selectedPlan.title} — ${selectedPlan.price}`}
              </div>

              <p className="mt-4 text-[9px] text-gray-500 font-bold uppercase tracking-wider text-center">
                Дараах дансанд шилжүүлнэ үү
              </p>

              {/* Дансны мэдээлэл харуулах хэсэг */}
              <div className="mt-3 space-y-3 bg-[#0B0F14]/60 p-4 rounded-xl border border-[#232A35]/60 text-left">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-500 font-medium">Банкны нэр</span>
                  <span className="text-gray-200 font-bold">Хаан bank</span>
                </div>

                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-500 font-medium">Дансны дугаар</span>
                  <div className="flex items-center gap-1.5 bg-[#141922] px-2 py-0.5 rounded border border-[#232A35]/60">
                    <span className="text-gray-200 font-bold font-mono tracking-wide">740005005692259277</span>
                    
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      className={`transition-all active:scale-95 p-0.5 rounded ${
                        copied ? "text-green-400" : "text-green-500 hover:text-green-400"
                      }`}
                      title="Данс хуулах"
                    >
                      {copied ? <Check size={12} /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-500 font-medium">Хүлээн авагч</span>
                  <span className="text-gray-200 font-bold">Цогоо Нандин-Эрдэнэ</span>
                </div>
              </div>

              {/* Санамж хайрцаг */}
              <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-left border-dashed">
                <div className="flex items-center gap-1.5 text-red-500 font-bold text-[10px] uppercase tracking-wider">
                  <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Санамж</span>
                </div>
                
                <p className="mt-2 text-[11px] text-gray-300 leading-relaxed pl-0.5">
                  Гүйлгээний утга дээрээ gmail хаяг, сар эсвэл coin тоогоо бичээрэй. 
                  Жишээ нь: <span className="inline-block bg-green-500/10 border border-green-500/20 rounded px-1.5 py-0.5 text-green-400 font-mono text-[10px] ml-0.5">{auth.currentUser?.email || "example"} {selectedPlan.title.replace(" ", "")}</span>. 
                  Баримтаа манай page рүү явуулж эрхээ идэвхжүүлнэ үү.
                </p>
              </div>

              {/* Төлбөр төлсөн товч */}
              <button
                type="button"
                onClick={() => {
                  setShowPopup(false);
                  setShowSuccessToast(true);
                }}
                className="mt-4 w-full rounded-xl bg-green-500 py-3 text-xs font-bold text-black transition-all active:scale-[0.99] hover:bg-green-400 tracking-wide font-black uppercase flex-shrink-0"
              >
                болсон
              </button>

            </div>
          </div>
        )}

        {/* ================= CUSTOM DARK ALERT ПОПАП ================= */}
        {alertPopup.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 animate-fade-in">
            <div className="w-full max-w-xs rounded-xl border border-[#232A35] bg-[#141922] p-5 text-center shadow-2xl text-xs">
              <p className="text-gray-300 font-medium leading-relaxed">{alertPopup.message}</p>
              <button
                type="button"
                onClick={() => setAlertPopup({ show: false, message: "" })}
                className="mt-4 w-full rounded-xl bg-green-500 py-2.5 text-xs font-bold text-black transition active:scale-[0.98] tracking-wide"
              >
                ОЙЛГОЛОО
              </button>
            </div>
          </div>
        )}

        {/* ================= АМЖИЛТТАЙ БОЛСНЫГ МЭДЭГДЭХ ДАРК ПОПАП ================= */}
        {showSuccessToast && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 animate-fade-in">
            <div className="w-full max-w-sm rounded-2xl border border-[#232A35] bg-[#141922] p-5 text-center shadow-2xl text-xs">
              
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20 text-green-400 mb-3">
                <Check size={16} />
              </div>

              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wide">Хүсэлт илгээгдлээ!</h3>
              <p className="mt-2 text-gray-400 leading-relaxed px-1">
                Төлбөрийн баримтаа манай Facebook Page рүү илгээнэ үү. Админ шалгаад таны эрхийг 1-3 минутанд баталгаажуулж идэвхжүүлэх болно.
              </p>
              
              <button
                type="button"
                onClick={() => {
                  setShowSuccessToast(false);
                  setSelectedPlan(null);
                  router.push("/");
                }}
                className="mt-4 w-full rounded-xl bg-[#232A35] border border-[#232A35]/60 py-2.5 text-xs font-bold text-gray-300 hover:text-white transition active:scale-[0.98] tracking-wide uppercase"
              >
                хаах
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Босоо цагаан гүйлгэх зурвасны CSS загвар */}
      <style jsx global>{`
        .style-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .style-scrollbar::-webkit-scrollbar-track {
          background: #0B0F14;
          border-radius: 10px;
        }
        .style-scrollbar::-webkit-scrollbar-thumb {
          background: #ffffff;
          border-radius: 10px;
        }
      `}</style>
    </main>
  );
}
