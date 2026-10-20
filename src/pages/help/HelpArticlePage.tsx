import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { getHelpArticle, type HelpBlock } from '@/data/helpArticles'

export function HelpArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const article = getHelpArticle(slug ?? '')

  if (!article) return <Navigate to="/ajuda" replace />

  const related = (article.related ?? []).map((s) => getHelpArticle(s)).filter((a): a is NonNullable<typeof a> => !!a)

  return (
    <div className="min-h-svh bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <Link to="/ajuda" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200">
            <ArrowLeft className="size-4" />
            Central de Ajuda
          </Link>
          <p className="mt-3 text-sm font-medium text-emerald-400">{article.category}</p>
          <h1 className="mt-1 text-xl font-semibold sm:text-2xl">{article.title}</h1>
          {article.adminOnly ? (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-400">
              <ShieldCheck className="size-3" />
              Recurso só para administradores
            </span>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-8">
        <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-neutral-200">
          {article.blocks.map((block, i) => (
            <HelpBlockView key={i} block={block} />
          ))}
        </div>

        {related.length > 0 ? (
          <div className="mt-10 border-t border-neutral-800 pt-6">
            <p className="mb-3 text-sm font-semibold tracking-wide text-neutral-400 uppercase">Veja também</p>
            <div className="flex flex-col gap-2">
              {related.map((r) => (
                <Link key={r.slug} to={`/ajuda/${r.slug}`} className="text-sm text-emerald-400 hover:text-emerald-300">
                  {r.title}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}

function HelpBlockView({ block }: { block: HelpBlock }) {
  switch (block.type) {
    case 'p':
      return <p>{block.text}</p>
    case 'steps':
      return (
        <ol className="flex flex-col gap-2.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-900/60 text-xs font-semibold text-emerald-300">
                {i + 1}
              </span>
              <span className="pt-0.5">{item}</span>
            </li>
          ))}
        </ol>
      )
    case 'note':
      return (
        <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3 text-sm text-emerald-200">{block.text}</div>
      )
    case 'image':
      return <img src={block.src} alt={block.alt} className="rounded-lg border border-neutral-800" />
  }
}
