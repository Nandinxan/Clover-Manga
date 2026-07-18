"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { ArrowLeft, Heart, Trash2, BookOpen } from "lucide-react";

interface FavouriteManga {
  id: string;
  title: string;
  coverUrl: string;
  author?: string;
}

export default function FavouritesPage() {
  const [user, setUser] = useState<any>(null);
  const [mangas, setMangas] = useState<FavouriteManga[]>([]);
  const [loading, setLoading] = useState(true);
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
            // 🚀 ЗАСВАРЛАВ:favorites болон favourites-ийн аль алинаас нь бодит уншина
            const favoritesData = data.favorites || data.favourites;
            
            if (favoritesData) {
              const favList: FavouriteManga[] = Object.keys(favoritesData).map(key => ({
                id: key,
                title: favoritesData[key].title || "Гарчиггүй манга",
                // 🚀 ЗАСВАРЛАВ: Хуучин image болон шинэ coverUrl-ийн алиныг нь ч унахгүй уншина
                coverUrl: favoritesData[key].coverUrl || favoritesData[key].image || "/placeholder-cover.jpg",
                author: favoritesData[key].author || "Үл мэдэгдэх"
              }));
              setMangas(favList);
            } else {
              setMangas([]);
            }
          } else {
            setMangas([]);
          }
        } catch (error) {
          console.error("Дуртай манга татахад алдаа гарлаа:", error);
        }
      } else {
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const removeFavourite = async (mangaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const fieldName = data.favourites ? `favourites.${mangaId}` : `favorites.${mangaId}`;
        
        await updateDoc(userRef, {
          [fieldName]: deleteField()
        });
        
        setMangas(prev => prev.filter(manga => manga.id !== mangaId));
      }
    } catch (error) {
      console.error("Устгахад алдаа гарлаа:", error);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0B0F14] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0F14] px-6 py-10 text-white">
      <div className="mx-auto max-w-md">
        
        {/* HEADER */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Дуртай манга</h1>
          <button
            type="button"
            onClick={() => router.push("/account")}
            className="rounded-full border border-[#232A35] p-2 hover:border-green-500 text-gray-400 hover:text-white transition active:scale-95"
          >
            <ArrowLeft size={22} />
          </button>
        </div>

        {/* ЖАГСААЛТ */}
        <div className="rounded-3xl border border-[#232A35] bg-[#141922] p-6 space-y-4 shadow-xl">
          {mangas.length === 0 ? (
            <div className="py-12 text-center text-gray-500 space-y-5">
              <Heart size={55} className="mx-auto text-gray-600 animate-pulse" strokeWidth={1.5} />
              <p className="text-base font-medium text-gray-400">Танд хадгалсан манга одоогоор алга байна.</p>
              <button 
                onClick={() => router.push("/")}
                className="rounded-2xl bg-green-500 px-6 py-3.5 text-sm font-black text-black transition hover:scale-[1.02] hover:bg-green-400 active:scale-[0.99] mx-auto block uppercase tracking-wider shadow-lg shadow-green-500/10"
              >
                Манга хайх
              </button>
            </div>
          ) : (
            mangas.map((manga) => (
              <div
                key={manga.id}
                onClick={() => router.push(`/manga/${manga.id}?from=favourites`)}
                className="flex items-center gap-4 rounded-2xl border border-[#222933] bg-[#0B0F14] p-3.5 cursor-pointer hover:border-green-500 transition-all duration-300 group hover:shadow-[0_0_20px_rgba(16,185,129,0.08)]"
              >
                <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-[#141922] border border-[#232A35]/40 shadow-md">
                  <img
                    src={manga.coverUrl}
                    alt={manga.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-white truncate group-hover:text-green-500 transition-colors duration-200">
                    {manga.title}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1 truncate font-medium">
                    Зохиолч: {manga.author}
                  </p>
                  
                  <div className="mt-3.5">
                    <span className="inline-flex items-center gap-1.5 text-xs text-green-500 font-bold bg-green-500/5 px-2.5 py-1 rounded-xl border border-green-500/10 group-hover:bg-green-500 group-hover:text-black transition-all duration-200">
                      <BookOpen size={12} /> Унших
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => removeFavourite(manga.id, e)}
                  className="rounded-xl p-2.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors flex-shrink-0"
                  title="Жагсаалтаас хасах"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}
