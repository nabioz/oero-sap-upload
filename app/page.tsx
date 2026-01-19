import { UploadDashboard } from "./components/UploadDashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none" />
      <div className="relative">
        <UploadDashboard />
      </div>
    </main>
  );
}
