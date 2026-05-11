import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-6xl font-black mb-4 tracking-tighter">LUMORA FORGE</h1>
      <p className="text-zinc-500 text-lg mb-10">Yapay zeka ile hikayeni yarat.</p>
      
      <Link 
        href="/login" 
        className="px-10 py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-bold transition-all shadow-xl shadow-purple-500/20"
      >
        Sisteme Giriş Yap
      </Link>
    </main>
  );
}