"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { deleteUser } from "firebase/auth";
import { ArrowLeft, Eye, EyeOff, Image, Check, X, Trash2, ShieldAlert } from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Тохиргооны дотоод State хувьсагчууд
  const [is18, setIs18] = useState(false);
  const [imageQuality, setImageQuality] = useState("hd"); 

  // Ерийн мэдэгдлийн попап төлөв
  const [alertPopup, setAlertPopup] = useState<{ show: boolean; message: string }>({ show: false, message: "" });

  // 🚀 ЗАСВАР: АКАУНТ УСТГАХ СҮРЛЭГ ТОМ DARK БАННЕРУУДЫН ТӨЛӨВ
  const [deleteStep, setDeleteStep] = useState<number>(0); // 0: Хаалттай, 1: Итгэлтэй байна уу, 2: Эцсийн анхааруулга, 3: Амжилттай устлаа

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data();
            setIs18(data.is18 || false);
            setImageQuality(data.imageQuality || "hd");
          }
        } catch (error) {
          console.error("Тохиргоо уншихад алдаа гарлаа:", error);
        }
      } else {
        router.push("/login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Firestore дээр тохиргоо хадгалах нэгдсэн функц
  const updateSetting = async (key: string, value: any) => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { [key]: value });
    } catch (error) {
      console.error("Тохиргоо хадгалахад алдаа гарлаа:", error);
    }
  };

  // 🚀 ЗАСВАР: БҮРЭН АВТОМАТ ДАРК БАННЕРУУДТАЙ ХОЛБОГДСОН УСТГАХ ЛОГИК
  const executeDeleteAccount = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userRef = doc(db, "users", user.uid);
      
      // 1. Firestore-оос устгах
      await deleteDoc(userRef);
      
      // 2. Auth-оос устгах
      await deleteUser(user);
      
      setLoading(false);
      setDeleteStep(3); // 🎉 Амжилттай устсан баннерыг нээнэ
    } catch (error: any) {
      console.error("Алдаа:", error);
      setLoading(false);
      setDeleteStep(0);
      if (error.code === "auth/requires-recent-login") {
        alert("Аюулгүй байдлын үүднээс та системээс гараад дахин нэг удаа нэвтэрч орж ирээд акаунтоо устгана уу.");
      } else {
        alert("Алдаа гарлаа. Дараа дахин оролдоно уу.");
      }
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0B0F14] text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-[#0B0F14] px-6 py-10 text-white">
      <div className="mx-auto max-w-md">
        
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Тохиргоо</h1>
          <button
            onClick={() => router.back()}
            className="rounded-full border border-[#232A35] p-2 hover:border-green-500 text-gray-400 hover:text-white transition active:scale-95"
          >
            <ArrowLeft size={22} />
          </button>
        </div>

        {/* ҮНДСЭН ТОХИРГООНЫ ХАЙРЦАГ */}
        <div className="rounded-3xl border border-[#232A35] bg-[#141922] p-6 space-y-6 shadow-xl">
          
          {/* 1. 18+ Төхөрлөл */}
          <div className="flex items-center justify-between py-2 border-b border-[#232A35]/30 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="text-red-400 flex-shrink-0">
                {is18 ? <Eye size={20} /> : <EyeOff size={20} />}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-gray-200 truncate">18+ Насанд хүрэгчдийн манга</h3>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5 whitespace-normal leading-relaxed">Цэсэнд насанд хүрэгчдийн бүтээлийг ил гаргах</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer select-none flex-shrink-0 ml-2">
              <input
                type="checkbox"
                checked={is18}
                onChange={(e) => {
                  const val = e.target.checked;
                  setIs18(val);
                  updateSetting("is18", val);
                  setAlertPopup({ show: true, message: val ? "18+ контент харах тохиргоо идэвхжлээ." : "18+ контент хаалттай боллоо." });
                }}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-[#0B0F14] border border-[#232A35] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-gray-400 peer-checked:after:bg-green-500 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500/10 peer-checked:border-green-500/40"></div>
            </label>
          </div>

          {/* 2. Зургийн чанар сонгох Радио товчлуур */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-gray-400">
              <Image size={18} className="text-green-400" />
              <h3 className="text-sm font-bold text-gray-200">Манга унших зургийн чанар</h3>
            </div>
            <p className="text-[11px] text-gray-500 font-medium leading-relaxed">Гар утасны дата урсгал болон интернет хурдандаа тохируулан сонгоно уу.</p>
            
            <div className="grid grid-cols-2 gap-3 mt-2">
              {/* HD Горим */}
              <button
                type="button"
                onClick={() => {
                  setImageQuality("hd");
                  updateSetting("imageQuality", "hd");
                  setAlertPopup({ show: true, message: "Зургийн чанарыг өндөр (HD) горимд шилжүүллээ." });
                }}
                className={`rounded-2xl border p-4 text-left transition-all duration-200 relative flex flex-col justify-between h-24 ${
                  imageQuality === "hd" 
                    ? "border-green-500/40 bg-green-500/5 text-white" 
                    : "border-[#232A35] bg-[#0B0F14]/40 text-gray-400 hover:border-gray-700"
                }`}
              >
                <span className="text-xs font-black uppercase tracking-wider block">Өндөр чанар (HD)</span>
                <span className="text-[10px] text-gray-500 font-medium leading-tight mt-1">Зургийг анхны чанараар нь тод уншина.</span>
                {imageQuality === "hd" && <div className="absolute top-3 right-3 text-green-400"><Check size={14} /></div>}
              </button>

              {/* Data Saver Горим */}
              <button
                type="button"
                onClick={() => {
                  setImageQuality("saver");
                  updateSetting("imageQuality", "saver");
                  setAlertPopup({ show: true, message: "Зургийн чанарыг дата хэмнэгч (Data Saver) горимд шилжүүллээ." });
                }}
                className={`rounded-2xl border p-4 text-left transition-all duration-200 relative flex flex-col justify-between h-24 ${
                  imageQuality === "saver" 
                    ? "border-green-500/40 bg-green-500/5 text-white" 
                    : "border-[#232A35] bg-[#0B0F14]/40 text-gray-400 hover:border-gray-700"
                }`}
              >
                <span className="text-xs font-black uppercase tracking-wider block">Дата Хэмнэгч</span>
                <span className="text-[10px] text-gray-500 font-medium leading-tight mt-1">Зургийг шахаж, интернетийн дата хэмнэнэ.</span>
                {imageQuality === "saver" && <div className="absolute top-3 right-3 text-green-400"><Check size={14} /></div>}
              </button>
            </div>
          </div>

        </div>

        {/* 🚀 ЗАСВАР: АКАУНТ УСТГАХ ТОМ УЛААН ТОВЧЛУУР (Дарж байж ухаалаг баннерууд нээгдэнэ) */}
        <button
          type="button"
          onClick={() => setDeleteStep(1)}
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-3xl border border-red-500/30 bg-red-500/5 py-4 font-semibold text-red-400 transition hover:bg-red-500 hover:text-white active:scale-[0.99] shadow-xl"
        >
          <Trash2 size={20}/>
          Бүртгэлээ бүр мөсөн устгах
        </button>
        {/* 🚀 1-Р АЛХАМ: УСТГАХДАА ИТГЭЛТЭЙ БАЙНА ҮҮ БАННЕР */}
        {deleteStep === 1 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
            <div className="w-full max-w-sm rounded-3xl border border-[#232A35] bg-[#141922] p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/20 mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-black text-gray-200 uppercase tracking-wider">Бүртгэлээ устгах уу?</h3>
              <p className="mt-2 text-xs text-gray-400 leading-relaxed font-medium">
                Та өөрийн бүртгэлийг бүрмөсөн устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
              </p>
              <div className="mt-6 flex items-center gap-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDeleteStep(0)}
                  className="w-1/2 rounded-xl border border-[#232A35] bg-[#0B0F14] py-3 text-gray-400 hover:text-white transition active:scale-95"
                >
                  ҮГҮЙ, БУЦАХ
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteStep(2)}
                  className="w-1/2 rounded-xl bg-red-500 py-3 text-white hover:bg-red-600 transition active:scale-95"
                >
                  ТИЙМ, ҮРГЭЛЖЛҮҮЛЭХ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🚀 2-Р АЛХАМ: ЭЦСИЙН АНХААРУУЛГА (КОЙН, ЭРХ УСТГАХЫГ САНУУЛАХ) БАННЕР */}
        {deleteStep === 2 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
            <div className="w-full max-w-sm rounded-3xl border border-[#232A35] bg-[#141922] p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 mb-4">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-base font-black text-yellow-500 uppercase tracking-wider">ЭЦСИЙН АНХААРУУЛГА!</h3>
              <p className="mt-2 text-xs text-gray-300 leading-relaxed font-semibold">
                Таны хэтэвчинд байгаа бүх <span className="text-yellow-500 font-bold">Койн</span>, идэвхтэй <span className="text-green-400 font-bold">VIP Эрх</span> болон нээсэн бүлгүүд, уншсан түүх бүгд ор мөргүй устах болно!
              </p>
              <div className="mt-6 flex items-center gap-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDeleteStep(0)}
                  className="w-1/3 rounded-xl border border-[#232A35] bg-[#0B0F14] py-3 text-gray-400 hover:text-white transition active:scale-95"
                >
                  ЦУЦЛАХ
                </button>
                <button
                  type="button"
                  onClick={executeDeleteAccount}
                  className="w-2/3 rounded-xl bg-red-600 py-3 text-white font-black hover:bg-red-700 transition active:scale-95 uppercase tracking-wider"
                >
                  БҮРМӨСӨН УСТГАХ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🚀 3-Р АЛХАМ: АМЖИЛТТАЙ УСТЛАА ГЭСЭН СҮҮЛЧИЙН БАННЕР */}
        {deleteStep === 3 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg px-4">
            <div className="w-full max-w-xs rounded-3xl border border-[#232A35] bg-[#141922] p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-400 border border-green-500/20 mb-4">
                <Check size={22} />
              </div>
              <h3 className="text-sm font-black text-gray-200 uppercase tracking-wider">Акаунт устгагдлаа</h3>
              <p className="mt-2 text-[11px] text-gray-400 leading-relaxed font-medium">
                Таны акаунт системээс амжилттай устлаа. Clover Manga-тай хамт байсанд баярлалаа!
              </p>
              <button
                type="button"
                onClick={() => {
                  setDeleteStep(0);
                  router.push("/");
                }}
                className="mt-6 w-full rounded-xl bg-green-500 py-3 text-xs font-black text-black transition active:scale-[0.98] uppercase tracking-widest"
              >
                ОЙЛГОЛОО
              </button>
            </div>
          </div>
        )}

        {/* ЕРИЙН ТОХИРГООНЫ ALERT ПОПАП */}
        {alertPopup.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
            <div className="w-full max-w-xs rounded-3xl border border-[#232A35] bg-[#141922] p-6 text-center shadow-xl text-xs">
              <p className="text-gray-300 font-bold leading-relaxed">{alertPopup.message}</p>
              <button
                type="button"
                onClick={() => setAlertPopup({ show: false, message: "" })}
                className="mt-5 w-full rounded-xl bg-green-500 py-2.5 text-xs font-bold text-black transition active:scale-[0.98]"
              >
                ОЙЛГОЛОО
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
