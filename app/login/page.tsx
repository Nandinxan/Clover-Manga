"use client";

import Link from "next/link";
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import toast from "react-hot-toast";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
export default function LoginPage() {
  const router = useRouter();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState("");
const [message, setMessage] = useState("");
const [showPassword, setShowPassword] = useState(false);


  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0F14] px-6">

      <div className="w-full max-w-md rounded-3xl border border-[#232A35] bg-[#141922] p-8">

        <h1 className="mb-2 text-center text-4xl font-bold text-white">
          Нэвтрэх
        </h1>

        <p className="mb-8 text-center text-gray-400">
          Clover Manga-д тавтай морил.
        </p>

        <input
          type="email"
          placeholder="Имэйл"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-4 py-3 text-white outline-none focus:border-green-500"
        />

        <div className="relative mb-6">

  <input
    type={showPassword ? "text" : "password"}
    placeholder="Нууц үг"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="w-full rounded-xl border border-[#232A35] bg-[#0B0F14] px-4 py-3 pr-12 text-white outline-none focus:border-green-500"
  />

<Link
  href="/forgot-password"
  className="mt-6 block text-right text-sm text-green-500 hover:underline"
>
  Нууц үгээ мартсан уу?
</Link>

  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-4 top-[28%] -translate-y-1/2 text-gray-400 hover:text-white"
  >
    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
  </button>

</div>

{error && (
  <p className="mb-4 text-center text-red-500">
    {error}
  </p>
)}

        <button
  onClick={async () => {
  try {
    setError("");

    if (!email.trim() || !password) {
      toast.error("Бүх талбарыг бөглөнө үү");
      return;
    }

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    toast.success("Амжилттай нэвтэрлээ 🎉");

    setTimeout(() => {
      router.push("/");
    }, 1500);

  } catch (err:any) {

    if (err.code === "auth/invalid-credential") {
      toast.error("Имэйл эсвэл нууц үг буруу байна");
    } 
    else {
      toast.error("Нэвтрэхэд алдаа гарлаа");
    }

  }
}}

  className="w-full rounded-xl bg-green-500 py-3 font-bold text-black transition hover:bg-green-400"
>
  Нэвтрэх
</button>

        <p className="mt-6 text-center text-gray-400">
          Бүртгэлгүй юу?{" "}
          <Link href="/register" className="text-green-500 hover:underline">
            Бүртгүүлэх
          </Link>
        </p>

      </div>

    </main>
  );
}