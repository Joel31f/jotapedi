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
// Fica ativo em todo o sistema, exceto na tela de impressão do pedido (o balão sairia no papel/PDF).
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

export function ChatbaseWidget() {
  const { pathname } = useLocation()
  const enabled = !(pathname.startsWith('/pedidos/') && pathname.replace(/\/$/, '').endsWith('/imprimir'))

  useEffect(() => {
    if (!enabled) return
    initChatbase()
    return () => {
      // Ao entrar numa tela onde o balão não deve aparecer, remove tudo.
      document.getElementById(SCRIPT_ELEMENT_ID)?.remove()
      document.getElementById('chatbase-bubble-button')?.remove()
      document.getElementById('chatbase-bubble-window')?.remove()
      delete window.chatbase
    }
  }, [enabled])

  return null
}
