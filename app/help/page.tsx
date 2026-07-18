"use client";

import { 
  X, 
  HelpCircle, 
  Coins, 
  CreditCard, 
  Crown, 
  AlertTriangle, 
  MessageCircle, 
  ChevronDown
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HelpPage() {
  const router = useRouter();

  // 🟩 ШИНЭЧЛЭВ: Эможинуудыг устгаж, кодын түвшинд Icon-той холбох бүтэц орууллаа
  const faq = [
    {
      id: "chapter",
      icon: <HelpCircle size={14} className="text-green-500" />,
      question: "Шинэ бүлэг хэзээ нэмэгдэх вэ?",
      answer: "Шинэ бүлгүүд тогтмол нэмэгддэг ба админы ажлын явцаас шалтгаалан харьцангуй хугацаагаар өөрчлөгддөг.",
    },
    {
      id: "coin_use",
      icon: <Coins size={14} className="text-green-500" />,
      question: "Coin юунд ашиглагддаг вэ?",
      answer: "Coin ашиглан хаалттай ямар ч бүлгүүдийг шууд нээж унших боломжтой.",
    },
    {
      id: "coin_buy",
      icon: <CreditCard size={14} className="text-green-500" />,
      question: "Эрх хэрхэн худалдаж авах вэ?",
      answer: "Эрх авах хэсэгт орж өөрт тохирох багцыг сонгон, зааврын дагуу дансаар шилжүүлэг хийнэ үү.",
    },
    {
      id: "premium",
      icon: <Crown size={14} className="text-green-500" />,
      question: "Premium эрх ямар давуу талтай вэ?",
      answer: "Premium хэрэглэгч болсноор сайтад тавигдсан бүх манга, манхваг ямар нэгэн хязгаарлалтгүйгээр шууд унших боломжтой.",
    },
    {
      id: "issue",
      icon: <AlertTriangle size={14} className="text-red-500" />,
      question: "Төлбөр хийсэн ч Coin нэмэгдэхгүй, эрх идэвхжихгүй бол яах вэ?",
      answer: "Шилжүүлэг хийсний дараа баримтаа манай Fb хуудас руу илгээнэ үү. Админ таны асуудлыг шийдвэрлэж өгөх болно.",
    },
  ];

  // Асуултуудыг нээж хаадаг (Accordion) болгох төлөв
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenId(openId === id ? null : id);
  };
  return (
    <main className="min-h-screen bg-[#0B0F14] text-white px-4 py-6 md:px-8 relative">
      <div className="mx-auto max-w-2xl">

        {/* ================= HEADER (Үзэмжтэй, тод том голлуулсан дизайн) ================= */}
        <div className="relative mb-8 flex items-center justify-between border-b border-[#232A35]/40 pb-5">
          {/* Баруун талын X товчтой тэнцэх хоосон зай үүсгэж гарчгийг яг төвд нь голлуулна */}
          <div className="w-10 h-10 flex-shrink-0" />

          <div className="text-center flex-1">
            <h1 className="text-xl font-black tracking-wide text-gray-100 uppercase">
              Тусламж
            </h1>
            <p className="mt-1 text-xs text-gray-400 font-medium">
              Түгээмэл асуулт, хариултууд.
            </p>
          </div>

          <button
            onClick={() => router.push("/")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#232A35] bg-[#141922] text-gray-400 transition-all hover:border-gray-500 hover:text-white active:scale-95 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ================= FAQ ACCORDION LIST (Эможигүй, цэвэр хавтгай Dark дизайн) ================= */}
        <div className="space-y-2">
          {faq.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isOpen 
                    ? "border-green-500/50 bg-[#141922]/80" 
                    : "border-[#232A35] bg-[#141922]/30 hover:border-gray-700"
                }`}
              >
                {/* Асуултын товчлуур */}
                <button
                  type="button"
                  onClick={() => toggleFaq(item.id)}
                  className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex-shrink-0">{item.icon}</div>
                    <span className="text-xs font-bold text-gray-300 leading-tight">
                      {item.question}
                    </span>
                  </div>
                  <ChevronDown 
                    size={14} 
                    className={`text-gray-500 transition-transform duration-200 flex-shrink-0 ${
                      isOpen ? "rotate-180 text-green-500" : ""
                    }`}
                  />
                </button>

                {/* Хариултын хэсэг (Нээгдэж хаагддаг) */}
                <div 
                  className={`transition-all duration-200 border-t border-[#232A35]/30 bg-[#0B0F14]/20 ${
                    isOpen ? "max-h-40 p-4 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
                  }`}
                >
                  <p className="text-xs leading-relaxed text-gray-400 font-medium">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {/* ================= 📞 ХОЛБОО БАРИХ (Roselle стилийн хавтгай Dark баннер) ================= */}
        <div className="mt-6 rounded-xl border border-[#232A35] bg-[#141922]/50 p-4 relative overflow-hidden">
          
          <div className="flex items-center gap-2 text-green-500 font-bold text-xs uppercase tracking-wide">
            <MessageCircle size={14} />
            <span>Холбоо барих</span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-gray-400 font-medium">
            Хэрэв танд өөр асуулт, санал хүсэлт эсвэл төлбөртэй холбоотой асуудал гарвал манай Facebook Page-ээр бидэнтэй холбогдоорой.
          </p>

          <a
            href="https://www.facebook.com/share/1DyCfjBhY3/?mibextid=wwXIfr"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-xs font-bold text-black transition-all active:scale-[0.98] hover:bg-green-400 w-full sm:w-auto"
          >
            {/* 🟩 ЗАСВАР: Блю фэйсбүүк биш, цэвэрхэн Lucide-ийн MessageCircle эсвэл Facebook icon ашиглав */}
            <MessageCircle size={14} className="fill-current" />
            <span>Хуудас харах</span>
          </a>

        </div>

      </div>
    </main>
  );
}
