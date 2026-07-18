"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Имэйлээ оруулна уу");
      return;
    }

    setLoading(true);

    try {
      // 🟩 Firebase Auth албан ёсны ухаалаг имэйл илгээгч
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      
      // Санамж: Аюулгүй байдлын шинэ дүрмээр бүртгэлгүй имэйл байсан ч амжилттай гэж харуулдаг болсон
      setMessage("Нууц үг сэргээх холбоос амжилттай илгээгдлээ. Хэрэв имэйл харагдахгүй бол Gmail-ийн 'Spam' болон 'All mail' хавтсыг заавал шалгаарай.");
      setEmail(""); 
    } 
    catch (err: any) {
      console.error("Firebase Reset Error Консол:", err.code, err.message);
      
      if (err.code === "auth/invalid-email") {
        setError("Имэйл хаяг буруу бүтэцтэй байна.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Хэт олон удаа оролдлоо. Түр хүлээгээд дахин оролдоно уу.");
      } else {
        setError("Имэйл илгээж чадсангүй. Консол дээрх алдааг шалгана уу.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] px-6">
      <div className="w-full max-w-md rounded-3xl border border-[#232A35] bg-[#141922] p-8">

        <h1 className="mb-2 text-center text-4xl font-bold text-white">Нууц үг сэргээх</h1>
        <p className="mb-8 text-center text-gray-400 text-xs leading-relaxed">
          Имэйлээ оруулаад сэргээх холбоос аваарай.
        </p>

        <form onSubmit={handleReset}>
          <input
            type="email"
            placeholder="Имэйл хаяг"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="mb-5 w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-4 py-3 text-white outline-none focus:border-green-500 disabled:opacity-50 text-sm"
          />

          {error && <p className="mb-4 text-center text-red-500 text-xs font-medium">{error}</p>}
          {message && <p className="mb-4 text-center text-green-500 text-xs font-medium leading-relaxed bg-green-500/5 border border-green-500/10 p-3 rounded-xl">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-500 py-3.5 font-bold text-black transition hover:bg-green-400 disabled:opacity-50 text-sm active:scale-[0.99]"
          >
            {loading ? "Илгээж байна..." : "Холбоос илгээх"}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400 text-xs">
          Санасан уу? <Link href="/login" className="text-green-500 hover:underline font-bold">Нэвтрэх</Link>
        </p>

      </div>
    </main>
  );
}
