import { useEffect } from 'react'

const CHATBASE_AGENT_ID = 'SDtj2i8qgXmlC_UyWoc9x'
const SCRIPT_ELEMENT_ID = CHATBASE_AGENT_ID

type ChatbaseFn = ((...args: unknown[]) => unknown) & { q?: unknown[] }

declare global {
  interface Window {
    chatbase?: ChatbaseFn
  }
}

// Mesmo código de incorporação fornecido pelo Chatbase, adaptado para React.
// Só é usado na Central de Ajuda (/ajuda), que é pública e não carrega dados do cliente.
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
  useEffect(() => {
    initChatbase()
    return () => {
      // Ao sair da Central de Ajuda, remove o balão para ele não aparecer dentro do sistema.
      document.getElementById(SCRIPT_ELEMENT_ID)?.remove()
      document.getElementById('chatbase-bubble-button')?.remove()
      document.getElementById('chatbase-bubble-window')?.remove()
      delete window.chatbase
    }
  }, [])

  return null
}
