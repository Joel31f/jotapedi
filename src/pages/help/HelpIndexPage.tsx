import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ShieldCheck } from 'lucide-react'
import { HELP_ARTICLES, HELP_CATEGORIES } from '@/data/helpArticles'

export function HelpIndexPage() {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()

  const filtered = query
    ? HELP_ARTICLES.filter(
        (a) => a.title.toLowerCase().includes(query) || a.summary.toLowerCase().includes(query) || a.category.toLowerCase().includes(query),
      )
    : HELP_ARTICLES

  return (
    <div className="min-h-svh bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-emerald-400">Jotapedi</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Central de Ajuda</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Artigos de passo a passo para usar o sistema no dia a dia. Se não encontrar o que precisa, fale com quem administra sua
            área de trabalho.
          </p>
          <div className="relative mt-5">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por assunto, ex: pedido, planilha, cliente…"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 py-2.5 pr-3 pl-9 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        {query ? (
          <ArticleList articles={filtered} emptyText="Nenhum artigo encontrado para essa busca." />
        ) : (
          HELP_CATEGORIES.map((category) => {
            const items = HELP_ARTICLES.filter((a) => a.category === category)
            if (items.length === 0) return null
            return (
              <section key={category} className="mb-8">
                <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-400 uppercase">{category}</h2>
                <ArticleList articles={items} />
              </section>
            )
          })
        )}
      </main>
    </div>
  )
}

function ArticleList({ articles, emptyText }: { articles: typeof HELP_ARTICLES; emptyText?: string }) {
  if (articles.length === 0) return <p className="text-sm text-neutral-500">{emptyText}</p>

  return (
    <div className="flex flex-col gap-2">
      {articles.map((article) => (
        <Link
          key={article.slug}
          to={`/ajuda/${article.slug}`}
          className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 transition-colors hover:border-emerald-700 hover:bg-neutral-900"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium text-neutral-100">{article.title}</p>
            {article.adminOnly ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-400">
                <ShieldCheck className="size-3" />
                Admin
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-neutral-400">{article.summary}</p>
        </Link>
      ))}
    </div>
  )
}
