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
  
  const [images, setImages] = useState([null, null, null]);
  const [imageLoading, setImageLoading] = useState([false, false, false]);

  const router = useRouter();

  // KULLANICI GİRİŞ KONTROLÜ
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/");
      setUser(u);
    });
    return () => unsub();
  }, [router]);

  // %100 TÜRKÇE HİKAYE ÜRETİMİ
  const generateStory = async () => {
    if (!prompt) return alert("Lütfen bir konu yazın.");
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
            content: `Lütfen şu konu hakkında akıcı, betimlemeleri güçlü ve sinematik bir kısa hikaye yaz: "${prompt}". 
            HİKAYE TAMAMEN TÜRKÇE OLMALIDIR. 
            Hikaye uzunluğu yaklaşık ${length} uzunlukta olsun ve sahneleri birbirinden ayırt edebilmem için net cümlelerden oluşsun.`,
          },
        ],
      });

      setStory(res.choices[0]?.message?.content || "");
    } catch (err) {
      console.error(err);
      alert("Hikaye üretilirken bir hata oluştu.");
    } finally {
      setIsGenerating(false);
    }
  };

  // KESİNTİSİZ GÖRSEL ÜRETİMİ (SIRALI SİSTEM)
  const generateImages = async () => {
    if (!story) return alert("Önce hikaye oluşturmalısınız.");

    setIsImgGenerating(true);
    setImages([null, null, null]); // Önceki resimleri temizle

    // Türkçe karakterleri güvenli URL formatına dönüştüren harita (Yapay zekanın sapıtmaması için)
    const trMap = {
      'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'I': 'I',
      'i': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S',
      'ü': 'u', 'Ü': 'U'
    };

    // Hikayeyi noktalardan cümlelere ayırıyoruz
    const scenes = story
      .split(".")
      .map((s) => s.trim())
      .filter((s) => s.length > 15) // Çok kısa ve anlamsız bağlaç cümlelerini ele
      .slice(0, 3);

    // Eğer 3 cümle çıkmadıysa yedeklerle doldur
    while (scenes.length < 3) {
      scenes.push(scenes[scenes.length - 1] || "Sinematik harika bir manzara");
    }

    const updatedImages = [null, null, null];

    // ÖNEMLİ: İstekleri paralel değil, SIRAYLA (sekansiyel) atarak spam korumasını (402) engelliyoruz
    for (let i = 0; i < scenes.length; i++) {
      setImageLoading((prev) => {
        const copy = [...prev];
        copy[i] = true;
        return copy;
      });

      // Cümleyi temizle: Türkçe karakterleri dönüştür, sadece harf/sayı kalsın
      let safeText = scenes[i]
        .replace(/[çÇğĞıİöÖşŞüÜ]/g, (m) => trMap[m])
        .replace(/[^a-zA-Z0-9 ]/g, " ")
        .slice(0, 150) // URL çok uzun olup sunucuyu patlatmasın
        .trim();

      const encodedPrompt = encodeURIComponent(safeText + ", cinematic photography, highly detailed, 8k resolution");
      const randomSeed = Math.floor(Math.random() * 999999);
      
      // Tamamen ücretsiz, kota sınırı olmayan en stabil Flux modeli bağlantısı
      const finalImgUrl = `https://image.pollinations.ai/p/${encodedPrompt}?width=1024&height=576&model=flux&seed=${randomSeed}&nologo=true`;

      try {
        // Tarayıcının resmi arka planda indirmesini bekliyoruz
        const res = await fetch(finalImgUrl);
        if (res.ok) {
          updatedImages[i] = finalImgUrl;
          setImages([...updatedImages]);
        } else {
          // Sunucuda anlık dalgalanma olursa temel model linkini pasla
          updatedImages[i] = `https://image.pollinations.ai/p/${encodedPrompt}?width=1024&height=576&seed=${randomSeed}`;
          setImages([...updatedImages]);
        }
      } catch (error) {
        console.error("Görsel yüklenirken hata oluştu:", error);
      } finally {
        setImageLoading((prev) => {
          const copy = [...prev];
          copy[i] = false;
          return copy;
        });
      }

      // Her resim arasında yarım saniye (700ms) mola vererek sunucu blokajını aş
      await new Promise((resolve) => setTimeout(resolve, 700));
    }

    setIsImgGenerating(false);
  };

  // FIREBASE FIRESTORE KAYIT
  const saveToFirebase = async () => {
    if (!story) return alert("Kaydedilecek bir hikaye bulunamadı.");
    try {
      await addDoc(collection(db, "projects"), {
        userId: user?.uid,
        userName: user?.displayName || "Anonim Kullanıcı",
        prompt,
        story,
        length,
        images, 
        createdAt: serverTimestamp(),
      });
      alert("Projeniz başarıyla veritabanına kaydedildi!");
    } catch (e) {
      console.error(e);
      alert("Kaydedilirken bir hata oluştu.");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12 pt-24">
      {/* ÜST MENÜ */}
      <div className="max-w-6xl mx-auto flex justify-between mb-10 items-center">
        <h1 className="text-3xl font-bold tracking-tighter">LUMORA STUDIO</h1>
        <button
          onClick={saveToFirebase}
          className="px-6 py-2.5 bg-white text-black rounded-full text-xs font-bold hover:bg-zinc-200 transition"
        >
          KAYDET
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
        {/* SOL TARAF: GİRDİ VE HİKAYE ALANI */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Hikayenizin konusunu Türkçe olarak buraya yazın..."
              className="w-full bg-transparent text-xl outline-none h-24 resize-none text-white placeholder-zinc-500"
            />
            <div className="flex gap-2 mt-4 items-center">
              {["kısa", "orta", "uzun"].map((l) => (
                <button
                  key={l}
                  onClick={() => setLength(l)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                    length === l ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {l}
                </button>
              ))}
              <button
                onClick={generateStory}
                disabled={isGenerating}
                className="ml-auto px-6 py-2 bg-white text-black rounded-full text-xs font-bold hover:bg-zinc-200 disabled:opacity-50 transition"
              >
                {isGenerating ? "YAZILIYOR..." : "HİKAYE OLUŞTUR"}
              </button>
            </div>
          </div>

          <div className="p-6 bg-zinc-900 rounded-3xl min-h-[350px] border border-zinc-800">
            <pre className="whitespace-pre-wrap text-zinc-300 font-sans leading-relaxed">
              {story || "Üretilen Türkçe hikaye içeriği burada görüntülenecek..."}
            </pre>
          </div>
        </div>

        {/* SAĞ TARAF: GÖRSEL SAHNELERİ */}
        <div className="space-y-6">
          <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800">
            <div className="grid gap-4">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="aspect-video bg-zinc-950 rounded-2xl overflow-hidden relative flex items-center justify-center border border-zinc-800"
                >
                  {img ? (
                    <img
                      src={img}
                      alt={`Sahne ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-xs text-zinc-600 flex flex-col items-center gap-3">
                      {imageLoading[i] ? (
                        <>
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-zinc-400 animate-pulse text-[11px] tracking-wider uppercase">Sahne {i+1} Çiziliyor...</span>
                        </>
                      ) : (
                        <span className="tracking-wider uppercase text-zinc-500 text-[11px]">Boş Sahne {i + 1}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={generateImages}
              disabled={isImgGenerating || !story}
              className="w-full mt-4 px-4 py-2.5 bg-white text-black rounded-full text-xs font-bold hover:bg-zinc-200 disabled:opacity-40 transition"
            >
              {isImgGenerating ? "GÖRSELLER SIRAYLA ÇİZİLİYOR..." : "GÖRSELLERI ÜRET"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}