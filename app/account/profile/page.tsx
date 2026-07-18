"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { ArrowLeft, User, Phone, Mail, CheckCircle2 } from "lucide-react";

export default function ProfileEditPage() {
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data();
            setUsername(data.username || data.displayName || "");
            setPhoneNumber(data.phoneNumber || "");
          }
        } catch (error) {
          console.error("Мэдээлэл татахад алдаа гарлаа:", error);
        }
      } else {
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSuccess(false);

    try {
      const userRef = doc(db, "users", user.uid);
      // Firestore дахь хэрэглэгчийн мэдээллийг шинэчлэх
      await updateDoc(userRef, {
        username: username,
        phoneNumber: phoneNumber,
        updatedAt: new Date().toISOString()
      });

      setSuccess(true);
      // 3 секундын дараа амжилттай гэсэн бичгийг алга болгоно
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Шинэчлэхэд алдаа гарлаа:", error);
      alert("Мэдээллийг хадгалж чадсангүй.");
    } finally {
      setSaving(false);
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
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-full border border-[#232A35] p-2 hover:border-green-500 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Миний мэдээлэл</h1>
        </div>

        {/* Энд Амжилттай хадгалагдсан үед мэдэгдэл харагдана */}
        {success && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-green-400 animate-fade-in">
            <CheckCircle2 size={20} />
            <span>Мэдээлэл амжилттай шинэчлэгдлээ!</span>
          </div>
        )}

        {/* Форм */}
        <form onSubmit={handleSave} className="space-y-5">
          
          {/* Имэйл хаяг (Өөрчлөх боломжгүй) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Имэйл хаяг</label>
            <div className="flex items-center gap-3 rounded-2xl border border-[#232A35] bg-[#141922]/50 p-4 text-gray-500 cursor-not-allowed">
              <Mail size={20} />
              <input 
                type="email" 
                value={user?.email || ""} 
                disabled 
                className="bg-transparent outline-none w-full cursor-not-allowed"
              />
            </div>
          </div>

          {/* Хэрэглэгчийн нэр */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Хэрэглэгчийн нэр</label>
            <div className="flex items-center gap-3 rounded-2xl border border-[#232A35] bg-[#141922] p-4 focus-within:border-green-500 transition">
              <User size={20} className="text-gray-400" />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Нэрээ оруулна уу"
                required
                className="bg-transparent outline-none w-full text-white placeholder-gray-600"
              />
            </div>
          </div>

          {/* Утасны дугаар */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Утасны дугаар</label>
            <div className="flex items-center gap-3 rounded-2xl border border-[#232A35] bg-[#141922] p-4 focus-within:border-green-500 transition">
              <Phone size={20} className="text-gray-400" />
              <input 
                type="tel" 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Утасны дугаар"
                className="bg-transparent outline-none w-full text-white placeholder-gray-600"
              />
            </div>
          </div>

          {/* Хадгалах Товчлуур */}
          <button
            type="submit"
            disabled={saving}
            className="mt-4 flex w-full items-center justify-center rounded-2xl bg-green-500 py-4 font-semibold text-black transition hover:bg-green-400 disabled:bg-gray-600 disabled:text-gray-400"
          >
            {saving ? "Хадгалж байна..." : "Өөрчлөлтийг хадгалах"}
          </button>

        </form>

      </div>
    </main>
  );
}
