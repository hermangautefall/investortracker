export const revalidate = 3600

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Contact</h1>
      <p className="text-sm text-white/40 mb-10">Get in touch with the DataHeimdall team.</p>

      <div className="card-glow rounded-xl bg-white/[0.03] p-8 space-y-4 text-white/70 text-sm leading-relaxed">
        <p>
          For questions, data corrections, feedback, or partnership inquiries, please
          email us at:
        </p>
        <p>
          <a
            href="mailto:hello@dataheimdall.com"
            className="text-white text-base font-medium underline underline-offset-2 hover:text-white/70 transition-colors"
          >
            hello@dataheimdall.com
          </a>
        </p>
        <p className="text-white/40 text-xs pt-2">
          We aim to respond within 2 business days.
        </p>
      </div>
    </main>
  )
}
