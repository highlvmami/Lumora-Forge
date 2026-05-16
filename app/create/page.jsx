"use client";

import { useState, useEffect } from "react";
import { auth, db } from "../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Groq from "groq-sdk";

export default function CreateProject() {
  const [user, setUser] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [story, setStory] = useState("");
  const [length, setLength] = useState("orta");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImgGenerating, setIsImgGenerating] = useState(false);
  
  // Resimlerin yüklenme durumunu tek tek takip etmek için loader state'i
  const [images, setImages] = useState([null, null, null]);
  const [imageLoading, setImageLoading] = useState([false, false, false]);

  const router = useRouter();

  // AUTH
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/");
      setUser(u);
    });
    return () => unsub();
  }, [router]);

  // STORY
  const generateStory = async () => {
    if (!prompt) return alert("Konu yaz");

    setIsGenerating(true);

    try {
      const groq = new Groq({
        apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
        dangerouslyAllowBrowser: true,
      });

      const res = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `Kısa sinematik hikaye yaz. Konu: ${prompt} Uzunluk: ${length}`,
          },
        ],
      });

      setStory(res.choices[0]?.message?.content || "");
    } catch (err) {
      console.error(err);
      alert("Hikaye üretilemedi");
    } finally {
      setIsGenerating(false);
    }
  };

  // IMAGES - Doğrudan Güvenli URL Bağlantısı
  const generateImages = () => {
    if (!story) return alert("Önce hikaye oluştur");

    setIsImgGenerating(true);
    setImageLoading([true, true, true]);

    // Hikayeyi cümlelere böl
    const scenes = story
      .split(".")
      .filter((s) => s.trim().length > 15)
      .slice(0, 3);

    while (scenes.length < 3) {
      scenes.push(scenes[scenes.length - 1] || story);
    }

    // Backend API'yi tamamen bypass edip direkt Pollinations linki üretiyoruz
    const generatedUrls = scenes.map((scene, index) => {
      // Kelimeleri temizle, sadece harf ve sayı kalsın
      const cleanScene = encodeURIComponent(
        scene.replace(/[\n\r]/g, " ").replace(/[^a-zA-Z0-9 ]/g, "").trim()
      );
      // Her istekte resim değişsin diye benzersiz bir seed ekliyoruz
      const randomSeed = Math.floor(Math.random() * 100000);
      return `https://image.pollinations.ai/p/${cleanScene}?width=1024&height=576&nologo=true&seed=${randomSeed}`;
    });

    setImages(generatedUrls);
    setIsImgGenerating(false);
  };

  // Kırık imajları engellemek için yüklenme bitiş takibi
  const handleImageLoad = (index) => {
    setImageLoading((prev) => {
      const newState = [...prev];
      newState[index] = false;
      return newState;
    });
  };

  // SAVE
  const saveToFirebase = async () => {
    if (!story) return alert("Hikaye yok");

    await addDoc(collection(db, "projects"), {
      userId: user?.uid,
      userName: user?.displayName || "Anonim",
      prompt,
      story,
      length,
      images, 
      createdAt: serverTimestamp(),
    });

    alert("Kaydedildi");
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12 pt-24">
      {/* HEADER */}
      <div className="max-w-6xl mx-auto flex justify-between mb-10">
        <h1 className="text-3xl font-bold">LUMORA STUDIO</h1>
        <button
          onClick={saveToFirebase}
          className="px-5 py-2 bg-white text-black rounded-full text-xs font-bold"
        >
          KAYDET
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-zinc-900 rounded-3xl">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Hikaye fikrini yaz..."
              className="w-full bg-transparent text-xl outline-none h-24"
            />
            <div className="flex gap-2 mt-4">
              {["kısa", "orta", "uzun"].map((l) => (
                <button
                  key={l}
                  onClick={() => setLength(l)}
                  className={`px-3 py-1 rounded-full text-xs ${
                    length === l ? "bg-white text-black" : "bg-zinc-800"
                  }`}
                >
                  {l}
                </button>
              ))}
              <button
                onClick={generateStory}
                disabled={isGenerating}
                className="ml-auto px-5 py-2 bg-white text-black rounded-full text-xs font-bold"
              >
                {isGenerating ? "YAZILIYOR..." : "HİKAYE"}
              </button>
            </div>
          </div>

          <div className="p-6 bg-zinc-900 rounded-3xl min-h-[300px]">
            <pre className="whitespace-pre-wrap text-zinc-300">
              {story || "Hikaye burada..."}
            </pre>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          <div className="p-6 bg-zinc-900 rounded-3xl">
            <div className="grid gap-4">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="aspect-video bg-zinc-800 rounded-xl overflow-hidden relative flex items-center justify-center border border-zinc-700/50"
                >
                  {img && (
                    <img
                      src={img}
                      alt={`Sahne ${i + 1}`}
                      className={`w-full h-full object-cover transition-opacity duration-300 ${
                        imageLoading[i] ? "opacity-0" : "opacity-100"
                      }`}
                      onLoad={() => handleImageLoad(i)}
                      onError={(e) => {
                        // Eğer link anlık çökerse otomatik reload tetikler
                        e.target.src = img + "&retry=" + i;
                      }}
                    />
                  )}
                  
                  {(imageLoading[i] || !img) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-850 gap-2">
                      <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                      <div className="text-[10px] text-zinc-500 tracking-wider uppercase">
                        {img ? "Yapay zeka çiziyor..." : "Boş Sahne"}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={generateImages}
              disabled={isImgGenerating || !story}
              className="w-full mt-4 px-4 py-2 bg-white text-black rounded-full text-xs font-bold"
            >
              GÖRSELLERİ ÜRET
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}