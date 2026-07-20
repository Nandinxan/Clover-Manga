"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut, deleteUser } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { UserRound, User, Heart, BookOpen, Wallet, Settings, LogOut, Trash2, ShieldAlert } from "lucide-react";

export default function AccountPage() {
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubscribeProfile: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // 🚀 ЗАСВАР: Username солигдоход шууд давхар өөрчлөгддөг Realtime Сонсогч
        const userRef = doc(db, "users", currentUser.uid);
        unsubscribeProfile = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data());
          }
        }, (error) => {
          console.error("Профайл уншихад алдаа гарлаа:", error);
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Системээс гарах функц
  const logout = async () => {
    await signOut(auth);
    router.push("/");
  };

  // 🚀 ШИНЭ: АКАУНТ Firestore БОЛОН Auth-ОГҮЙ БҮРМӨСӨН АВТОМАТ УСТГАХ ФУНКЦ
  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirm1 = confirm("Та өөрийн акаунтыг бүрмөсөн устгахдаа итгэлтэй байна уу?");
    if (!confirm1) return;
    const confirm2 = confirm("АНХААРУУЛГА: Таны койн, VIP эрх, уншсан түүх бүгд устах бөгөөд буцааж сэргээх боломжгүй! Эцсийн шийдвэр үү?");
    if (!confirm2) return;

    try {
      setLoading(true);
      const userRef = doc(db, "users", user.uid);
      
      // 1. Эхлээд Firestore өгөгдлийн сангаас хэрэглэгчийн датаг устгана
      await deleteDoc(userRef);
      
      // 2. Дараа нь Firebase Authentication системээс хэрэглэгчийг бүрмөсөн устгана
      await deleteUser(user);
      
      alert("Таны акаунт системээс бүрмөсөн устлаа.");
      router.push("/");
    } catch (error: any) {
      console.error("Акаунт устгахад алдаа гарлаа:", error);
      if (error.code === "auth/requires-recent-login") {
        alert("Аюулгүй байдлын үүднээс та системээс гараад дахин нэг удаа нэвтэрч орж ирээд акаунтоо устгана уу.");
      } else {
        alert("Акаунт устгахад алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.");
      }
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0B0F14] text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0B0F14] text-white font-bold text-sm">
        Уншиж байна... (Эсвэл нэвтрээгүй байна)
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-[#0B0F14] px-6 py-10 text-white">
      <div className="mx-auto max-w-md">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            Миний профайл
          </h1>
        </div>

        {/* Profile Карт (Username шууд солигддог ухаалаг хувилбар) */}
        <div className="rounded-3xl border border-[#232A35] bg-[#141922] p-8 text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#0B0F14] border border-[#232A35] text-gray-400">
            <UserRound size={55} strokeWidth={1.5} />
          </div>

          {/* 🚀 ЗАСВАР: Firebase Auth биш Firestore-ийн Realtime уншсан username-ийг тэргүүн ээлжинд харуулна */}
          <h2 className="mt-5 text-2xl font-bold">
            {profile?.username || user.displayName || "Хэрэглэгч"}
          </h2>

          <p className="mt-2 text-gray-400">
            {user.email}
          </p>
        </div>

        {/* Menu Цэсүүд */}
        <div className="mt-5 overflow-hidden rounded-3xl border border-[#232A35] bg-[#141922]">

          <button 
            onClick={() => router.push("/account/profile")}
            className="flex w-full items-center gap-4 border-b border-[#232A35] p-5 hover:bg-[#1A202B]"
          >
            <User size={22}/>
            Миний мэдээлэл
          </button>

          <button 
            onClick={() => router.push("/account/favourites")} 
            className="flex w-full items-center gap-4 border-b border-[#232A35] p-5 hover:bg-[#1A202B]"
          >
            <Heart size={22}/>
            Дуртай манга
          </button>

          <button 
            onClick={() => router.push("/account/history")}
            className="flex w-full items-center gap-4 border-b border-[#232A35] p-5 hover:bg-[#1A202B]"
          >
            <BookOpen size={22}/>
            Уншсан түүх
          </button>

          <button 
            onClick={() => router.push("/account/wallet")}
            className="flex w-full items-center gap-4 border-b border-[#232A35] p-5 hover:bg-[#1A202B]"
          >
            <Wallet size={22}/>
            Миний хэтэвч
          </button>

          <button 
            onClick={() => router.push("/account/settings")}
            className="flex w-full items-center gap-4 p-5 hover:bg-[#1A202B]"
          >
            <Settings size={22}/>
            Тохиргоо
          </button>

        </div>
        {/* Доод талын товчлуурууд: Гарах болон Акаунт устгах */}
        <div className="space-y-3">
          {/* Гарах товчлуур */}
          <button
            onClick={logout}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-500/20 bg-[#141922] py-4 font-semibold text-gray-300 transition hover:bg-gray-700 hover:text-white"
          >
            <LogOut size={20}/>
            Системээс гарах
          </button>
        </div>

      </div>
    </main>
  );
}
