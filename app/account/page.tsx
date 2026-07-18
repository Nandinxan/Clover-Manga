"use client";

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import {
  User,
  Heart,
  BookOpen,
  Wallet,
  Settings,
  LogOut,
  CalendarDays
} from "lucide-react";

export default function AccountPage() {
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          setProfile(snap.data());
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0B0F14] text-white">
        Нэвтэрнэ үү
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F14] px-6 py-10 text-white">
      <div className="mx-auto max-w-md">

        {/* Header (Сүрлэг том загварыг сэргээв) */}
        <div className="mb-6">
  <h1 className="text-3xl font-bold">
    Миний профайл
  </h1>
</div>
        {/* Profile (Өмнөх сүрлэг том бөөрөнхий загварыг сэргээв) */}
        <div className="rounded-3xl border border-[#232A35] bg-[#141922] p-8 text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#0B0F14] border border-[#232A35] text-gray-400">
            <UserRound size={55} strokeWidth={1.5} />
          </div>

          <h2 className="mt-5 text-2xl font-bold">
            {user.displayName || "Хэрэглэгч"}
          </h2>

          <p className="mt-2 text-gray-400">
            {user.email}
          </p>
        </div>
                {/* Menu (Өмнөх сүрлэг том бөөрөнхий цэсийг сэргээв) */}
        <div className="mt-5 overflow-hidden rounded-3xl border border-[#232A35] bg-[#141922]">

          <button 
            onClick={() => router.push("/account/profile")}
            className="flex w-full items-center gap-4 border-b border-[#232A35] p-5 hover:bg-[#1A202B]"
          >
            <User size={22}/>
            Миний мэдээлэл
          </button>

          {/* 🟩 ЗАСВАР: Замыг яг таны файлын систем шиг 'favourites' (u-тэй) болгож зөв холбов */}
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

        {/* Гарах товчлуур */}
        <button
          onClick={logout}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-red-500/30 bg-[#141922] py-4 font-semibold text-red-400 transition hover:bg-red-500 hover:text-white"
        >
          <LogOut size={20}/>
          Гарах
        </button>

      </div>
    </main>
  );
}
