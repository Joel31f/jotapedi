import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const CHATBASE_AGENT_ID = 'SDtj2i8qgXmlC_UyWoc9x'
const SCRIPT_ELEMENT_ID = CHATBASE_AGENT_ID

type ChatbaseFn = ((...args: unknown[]) => unknown) & { q?: unknown[] }

declare global {
  interface Window {
    chatbase?: ChatbaseFn
  }
}

// Mesmo código de incorporação fornecido pelo Chatbase, adaptado para React.
// Fica ativo em todo o sistema, exceto na tela de impressão do pedido.
function initChatbase() {
  if (!window.chatbase || (window.chatbase as ChatbaseFn)('getState') !== 'initialized') {
    const stub: ChatbaseFn = (...args: unknown[]) => {
      if (!stub.q) stub.q = []
      stub.q.push(args)
    }
    window.chatbase = new Proxy(stub, {
      get(target, prop) {
        if (prop === 'q') return target.q
        return (...args: unknown[]) => target(prop, ...args)
      },
    }) as ChatbaseFn
  }

  const load = () => {
    if (document.getElementById(SCRIPT_ELEMENT_ID)) return
    const script = document.createElement('script')
    script.src = 'https://www.chatbase.co/embed.min.js'
    script.id = SCRIPT_ELEMENT_ID
    ;(script as HTMLScriptElement & { domain?: string }).domain = 'www.chatbase.co'
    document.body.appendChild(script)
  }

  if (document.readyState === 'complete') load()
  else window.addEventListener('load', load, { once: true })
}

const HIDE_STYLE_ID = 'chatbase-hide-style'
const HIDE_CSS =
  '#chatbase-bubble-button, #chatbase-bubble-window, #chatbase-message-bubbles { display: none !important; }'

export function ChatbaseWidget() {
  const { pathname } = useLocation()
  const hidden = pathname.startsWith('/pedidos/') && pathname.replace(/\/$/, '').endsWith('/imprimir')

  // O script do Chatbase é carregado uma única vez e fica na página.
  useEffect(() => {
    initChatbase()
  }, [])

  // Na tela de impressão do pedido o balão fica escondido (senão sairia no papel/PDF).
  useEffect(() => {
    if (!hidden) return
    const style = document.createElement('style')
    style.id = HIDE_STYLE_ID
    style.textContent = HIDE_CSS
    document.head.appendChild(style)
    return () => style.remove()
  }, [hidden])

  return null
}
