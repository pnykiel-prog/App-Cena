export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--primary)] via-[var(--color-navy-dark)] to-[#0a1a2e]">
      <div className="min-h-screen flex items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
