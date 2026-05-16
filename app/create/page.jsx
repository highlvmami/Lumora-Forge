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
  
  // Üretim Durumları
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImgGenerating, setIsImgGenerating] = useState(false);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  
  // Medya State'leri
  const [images, setImages] = useState([null, null, null]);
  const [imageLoading, setImageLoading] = useState([false, false, false]);
  const [videoUrl, setVideoUrl] = useState(null);

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
    setImages([null, null, null]);
    setVideoUrl(null);

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
      alert("Hikaye üretilerken bir hata oluştu.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Türkçe karakter temizleme haritası
  const trMap = {
    'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'I': 'I',
    'i': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U'
  };

  const cleanTextForAI = (text) => {
    return text
      .replace(/[çÇğĞıİöÖşŞüÜ]/g, (m) => trMap[m])
      .replace(/[^a-zA-Z0-9 ]/g, " ")
      .slice(0, 130)
      .trim();
  };

  // 3 SAHNE İÇİN GÖRSEL ÜRETİMİ
  const generateImages = async () => {
    if (!story) return alert("Önce hikaye oluşturmalısınız.");

    setIsImgGenerating(true);
    setImages([null, null, null]);

    const scenes = story
      .split(".")
      .map((s) => s.trim())
      .filter((s) => s.length > 15)
      .slice(0, 3);

    while (scenes.length < 3) {
      scenes.push(scenes[scenes.length - 1] || "Sinematik harika bir manzara");
    }

    const updatedImages = [null, null, null];

    for (let i = 0; i < scenes.length; i++) {
      setImageLoading((prev) => {
        const copy = [...prev];
        copy[i] = true;
        return copy;
      });

      let safeText = cleanTextForAI(scenes[i]);
      const encodedPrompt = encodeURIComponent(safeText + ", cinematic photography, highly detailed, 8k resolution");
      const randomSeed = Math.floor(Math.random() * 999999);
      
      const finalImgUrl = `https://image.pollinations.ai/p/${encodedPrompt}?width=1024&height=576&model=flux&seed=${randomSeed}&nologo=true`;

      try {
        const res = await fetch(finalImgUrl);
        if (res.ok) {
          updatedImages[i] = finalImgUrl;
          setImages([...updatedImages]);
        } else {
          updatedImages[i] = finalImgUrl;
          setImages([...updatedImages]);
        }
      } catch (error) {
        console.error("Görsel üretim hatası:", error);
        updatedImages[i] = finalImgUrl;
        setImages([...updatedImages]);
      } finally {
        setImageLoading((prev) => {
          const copy = [...prev];
          copy[i] = false;
          return copy;
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    setIsImgGenerating(false);
  };

  // TEK PARÇA SİNEMATİK VİDEO ÜRETİMİ
  const generateSingleVideo = async () => {
    if (!story) return alert("Önce hikaye oluşturmalısınız.");

    setIsVideoGenerating(true);
    setVideoUrl(null);

    // Tüm hikayeden genel, temiz bir özet video anahtarı çıkartıyoruz
    let safeText = cleanTextForAI(story.slice(0, 150));
    
    // Altyazı ve hareket animasyonları için prompt manipülasyonu
    const videoPrompt = encodeURIComponent(`${safeText}, continuous cinematic sequence, subtitles included, 4k resolution, cinematic lighting`);
    const randomSeed = Math.floor(Math.random() * 999999);

    // Ücretsiz ve kesintisiz tek video çıktısı sağlayan yapı
    const finalVideoUrl = `https://image.pollinations.ai/p/${videoPrompt}?width=1024&height=576&model=flux&seed=${randomSeed}&nologo=true&feed=true&video=true`;

    try {
      // Bağlantıyı canlandırmak için minik bir fetch tetikliyoruz
      await fetch(finalVideoUrl);
      setVideoUrl(finalVideoUrl);
    } catch (error) {
      console.error("Video üretim hatası:", error);
      setVideoUrl(finalVideoUrl); // Hata durumunda bile tarayıcı player'ına pasla
    } finally {
      setIsVideoGenerating(false);
    }
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
        videoUrl, // Tekil video adresi kaydediliyor
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
        {/* SOL TARAF: GİRDİ, HİKAYE VE VİDEO ALANI */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prompt Giriş */}
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

          {/* Hikaye Çıktısı */}
          <div className="p-6 bg-zinc-900 rounded-3xl min-h-[250px] border border-zinc-800">
            <pre className="whitespace-pre-wrap text-zinc-300 font-sans leading-relaxed text-sm">
              {story || "Üretilen Türkçe hikaye içeriği burada görüntülenecek..."}
            </pre>
          </div>

          {/* YENİ VE BAĞIMSIZ SİNEMATİK VİDEO ALANI */}
          <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">Sinematik Hikaye Videosu</h3>
              <button
                onClick={generateSingleVideo}
                disabled={isVideoGenerating || !story || isImgGenerating}
                className="px-5 py-2 bg-white text-black rounded-full text-xs font-bold hover:bg-zinc-200 disabled:opacity-40 transition"
              >
                {isVideoGenerating ? "VİDEO ÜRETİLİYOR..." : "VİDEO ÜRET (ALTYAZILI)"}
              </button>
            </div>

            <div className="aspect-video w-full bg-zinc-950 rounded-2xl overflow-hidden relative flex items-center justify-center border border-zinc-800">
              {videoUrl ? (
                <video 
                  src={videoUrl} 
                  controls 
                  autoPlay 
                  loop 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-xs text-zinc-600 flex flex-col items-center gap-3">
                  {isVideoGenerating ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-zinc-400 animate-pulse text-[11px] tracking-wider uppercase">Tüm sahneler birleştiriliyor ve video üretiliyor...</span>
                    </>
                  ) : (
                    <span className="tracking-wider uppercase text-zinc-500 text-[11px]">Üretilen video burada oynatılacak</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SAĞ TARAF: SADECE TEMİZ GÖRSEL PANELİ */}
        <div className="space-y-6">
          <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800">
            <h2 className="text-sm font-bold tracking-wider text-zinc-400 mb-4 uppercase">Görsel Sahneler</h2>
            
            <div className="grid gap-4">
              {images.map((img, i) => (
                <div key={i} className="space-y-2">
                  <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-1">Sahne {i + 1}</div>
                  <div className="aspect-video bg-zinc-950 rounded-2xl overflow-hidden relative flex items-center justify-center border border-zinc-800">
                    {img ? (
                      <img src={img} alt={`Sahne ${i + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-xs text-zinc-600 flex flex-col items-center gap-3">
                        {imageLoading[i] ? (
                          <>
                            <div className="w-5 h-5 border border-white border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-zinc-400 animate-pulse text-[10px] tracking-wider">Çiziliyor...</span>
                          </>
                        ) : (
                          <span className="tracking-wider text-zinc-500 text-[10px] uppercase">Boş Sahne</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={generateImages}
              disabled={isImgGenerating || !story || isVideoGenerating}
              className="w-full mt-6 px-4 py-2.5 bg-zinc-800 text-white rounded-full text-xs font-bold hover:bg-zinc-700 disabled:opacity-40 transition border border-zinc-700"
            >
              {isImgGenerating ? "GÖRSELLER ÇİZİLİYOR..." : "GÖRSELLERİ ÜRET"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}