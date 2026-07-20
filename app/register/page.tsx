"use client";

import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Товчлуурыг дахин дарахаас сэргийлнэ

  // Бүртгэх үндсэн функц
  const handleRegister = async () => {
    try {
      setError("");
      
      // 1. Оролтын утгуудыг шалгах
      if (!username.trim() || !email.trim() || !password || !confirmPassword) {
        setError("Бүх талбарыг бөглөнө үү");
        return;
      }

      if (password !== confirmPassword) {
        setError("Нууц үгүүд тохирохгүй байна");
        return;
      }

      if (password.length < 6) {
        setError("Нууц үг 6-аас дээш тэмдэгт байх ёстой");
        return;
      }

      setIsLoading(true);

      // 2. Firebase Auth дээр хэрэглэгч үүсгэх
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 3. Хэрэглэгчийн Auth Профайлыг шинэчлэх
      await updateProfile(user, {
        displayName: username,
      });

      // 4. Firestore өгөгдлийн сангийн "users" цуглуулгад хадгалах
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: username,
        email: email,
        coins: 0,
        accessType: "Free",
        accessStart: null,
        accessEnd: null,
        createdAt: serverTimestamp(),
        favorites: [],
        history: [],
      });

      // 5. Амжилтын мессеж харуулж, хуудсыг шилжүүлэх
      toast.success("Бүртгэл амжилттай үүслээ 🎉");
      
      setTimeout(() => {
        router.push("/");
      }, 1500);

    } catch (err: unknown) {
      console.error("Бүртгэлийн алдаа:", err);
      
      // Firebase алдааны кодыг зөв барьж авах (TypeScript-д зориулав)
      const firebaseError = err as { code?: string; message?: string };
      
      switch (firebaseError.code) {
        case "auth/email-already-in-use":
          setError("Энэ имэйл бүртгэлтэй байна");
          break;
        case "auth/invalid-email":
          setError("Имэйл буруу байна");
          break;
        case "auth/weak-password":
          setError("Нууц үг хамгийн багадаа 6 тэмдэгт байна");
          break;
        default:
          setError(firebaseError.message || "Бүртгэл үүсгэхэд алдаа гарлаа");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] px-6">
      <div className="w-full max-w-md rounded-3xl border border-[#232A35] bg-[#141922] p-8">
        <h1 className="mb-2 text-center text-4xl font-bold text-white">Бүртгүүлэх</h1>
        <p className="mb-8 text-center text-gray-400">Бүртгүүлээд ихийг уншаарай.</p>

        <input
          type="text"
          placeholder="Хэрэглэгчийн нэр"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
          className="mb-4 w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-4 py-3 text-white outline-none focus:border-green-500 disabled:opacity-50"
        />

        <input
          type="email"
          placeholder="Имэйл"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="mb-4 w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-4 py-3 text-white outline-none focus:border-green-500 disabled:opacity-50"
        />

        <div className="relative mb-5">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Нууц үг"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-4 py-3 pr-12 text-white outline-none focus:border-green-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div className="relative mb-6">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Нууц үг давтах"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-4 py-3 pr-12 text-white outline-none focus:border-green-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {error && <p className="mb-4 text-center text-red-500">{error}</p>}

        <button
          onClick={handleRegister}
          disabled={isLoading}
          className="w-full rounded-xl bg-green-500 py-3 font-bold text-black transition hover:bg-green-400 disabled:bg-gray-600 disabled:text-gray-400"
        >
          {isLoading ? "Уншиж байна..." : "Бүртгүүлэх"}
        </button>

        <p className="mt-6 text-center text-gray-400">
          Бүртгэлтэй юу?{" "}
          <Link href="/login" className="text-green-500 hover:underline">
            Нэвтрэх
          </Link>
        </p>
      </div>
    </main>
  );
}
