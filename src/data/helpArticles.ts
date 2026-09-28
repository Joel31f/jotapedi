export type HelpBlock =
  | { type: 'p'; text: string }
  | { type: 'steps'; items: string[] }
  | { type: 'note'; text: string }
  | { type: 'image'; src: string; alt: string }

export interface HelpArticle {
  slug: string
  title: string
  category: string
  summary: string
  adminOnly?: boolean
  blocks: HelpBlock[]
  related?: string[]
}

export const HELP_CATEGORIES = ['Pedidos', 'Clientes', 'Produtos', 'Geral'] as const

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: 'criar-pedido',
    title: 'Como criar um pedido',
    category: 'Pedidos',
    summary: 'Passo a passo para montar um pedido do zero, com cliente, itens e informações de entrega.',
    blocks: [
      {
        type: 'steps',
        items: [
          'No menu lateral, clique em Pedidos.',
          'Clique no botão "+ Novo pedido", no canto superior direito.',
          'No campo Cliente, digite o nome e escolha na lista. Se o cliente ainda não existe, cadastre primeiro (veja o artigo "Como cadastrar um cliente").',
          'Escolha o Estágio do pedido (por exemplo, Orçamento).',
          'Se o negócio usar marcas, escolha a Marca. Se usar mais de um vendedor, escolha o Responsável.',
          'Em Itens, clique em "Adicionar item" e busque o produto pelo código ou pela descrição. Ajuste a quantidade e, se precisar, o preço e o desconto.',
          'Preencha Contato, Transporte, Condição de pagamento, Previsão de entrega e Nº da ordem de compra do cliente, se tiver essas informações.',
          'Clique em Salvar. O pedido continua aberto na tela, então você pode conferir tudo, mudar algo e salvar de novo sem perder o que já fez.',
        ],
      },
      {
        type: 'note',
        text: 'Se a internet cair ou a aba recarregar sozinha no meio do preenchimento, o sistema guarda um rascunho automaticamente. Basta reabrir o mesmo pedido (ou clicar em Novo pedido de novo) que o que você tinha digitado volta.',
      },
    ],
    related: ['desconto-item-pedido', 'imprimir-pedido', 'mover-pedido-kanban'],
  },
  {
    slug: 'desconto-item-pedido',
    title: 'Como aplicar desconto em um item do pedido',
    category: 'Pedidos',
    summary: 'Duas formas de aplicar desconto: preenchendo o valor do desconto, ou direto no preço final.',
    blocks: [
      {
        type: 'p',
        text: 'Cada item do pedido tem os campos Preço unit., Desc. item, Tipo (R$ ou %) e Preço c/ desc. Eles conversam entre si, então você pode preencher pelo caminho que for mais rápido.',
      },
      {
        type: 'steps',
        items: [
          'Caminho 1 — pelo desconto: preencha o Preço unit., depois o valor em Desc. item, e escolha se é em R$ (valor fixo por unidade) ou % (percentual). O campo Preço c/ desc. se atualiza sozinho.',
          'Caminho 2 — pelo preço final: se você já sabe quanto vai cobrar por unidade depois do desconto, digite direto no campo Preço c/ desc. O sistema calcula o desconto em R$ sozinho.',
        ],
      },
      {
        type: 'note',
        text: 'O total do item, mostrado embaixo de cada linha, já considera a quantidade e o desconto.',
      },
    ],
    related: ['criar-pedido', 'imprimir-pedido'],
  },
  {
    slug: 'observacao-item-pedido',
    title: 'Como colocar uma observação em um item do pedido',
    category: 'Pedidos',
    summary: 'Para anotar uma medida específica, cor ou outro detalhe que vale só para aquele item.',
    blocks: [
      {
        type: 'p',
        text: 'Diferente da Observação do pedido (que vale para o pedido inteiro), cada item tem seu próprio campo de observação — útil para uma medida sob encomenda, por exemplo.',
      },
      {
        type: 'steps',
        items: [
          'No item do pedido, logo abaixo dos campos de preço, preencha o campo "Observação do item".',
          'Salve o pedido normalmente.',
        ],
      },
      {
        type: 'note',
        text: 'Essa observação sai impressa embaixo da descrição do item, tanto na via para o cliente quanto na via para a produção da fábrica.',
      },
    ],
    related: ['criar-pedido', 'imprimir-pedido'],
  },
  {
    slug: 'criar-produto-no-pedido',
    title: 'Como usar um item novo (que não está no catálogo) dentro de um pedido',
    category: 'Pedidos',
    summary: 'O que acontece quando você edita a descrição de um item e ela não bate com nenhum produto cadastrado.',
    blocks: [
      {
        type: 'p',
        text: 'Ao montar um item, se você editar a descrição para algo que ainda não existe no catálogo (por exemplo, para incluir uma medida), o sistema oferece a opção "Usar [...] só neste pedido". Isso guarda o texto editado apenas naquele pedido, sem criar nenhum produto novo — é o comportamento padrão para todo mundo.',
      },
      {
        type: 'note',
        text: 'Somente administradores têm a opção extra de cadastrar esse texto como um produto novo no catálogo (com o mesmo código ou com um código novo), para reaproveitar em pedidos futuros.',
      },
    ],
    related: ['criar-pedido', 'cadastrar-produto'],
  },
  {
    slug: 'imprimir-pedido',
    title: 'Como imprimir um pedido',
    category: 'Pedidos',
    summary: 'Existem duas vias de impressão: uma para o cliente, com preços, e uma para a produção, sem preços.',
    blocks: [
      {
        type: 'steps',
        items: [
          'Abra o pedido (clique nele na lista ou no quadro Kanban).',
          'No rodapé da tela, clique em "Imprimir" para a via completa, com preços — a que você entrega para o cliente.',
          'Clique em "Imprimir p/ produção" para a via sem nenhum preço, valores nem totais — só código, descrição, quantidade e as informações do pedido (transporte, previsão de entrega, etc). Essa via tem o selo "Via de produção" no topo.',
          'As duas abrem em uma aba nova, já prontas para imprimir ou salvar como PDF.',
        ],
      },
    ],
    related: ['criar-pedido', 'observacao-item-pedido'],
  },
  {
    slug: 'mover-pedido-kanban',
    title: 'Como mudar a etapa de um pedido',
    category: 'Pedidos',
    summary: 'Pelo quadro Kanban (arrastando) ou direto no formulário do pedido.',
    blocks: [
      {
        type: 'steps',
        items: [
          'Pelo quadro: em Pedidos, na aba Kanban, clique e arraste o cartão do pedido para a coluna da etapa desejada (Orçamento, Confirmado, Pago, Enviado, etc).',
          'Pelo formulário: abra o pedido e mude o campo Estágio, depois clique em Salvar.',
        ],
      },
      {
        type: 'note',
        text: 'Se aparecer um aviso de erro ao arrastar o pedido, tire um print e mande para quem cuida do sistema — pode ser uma permissão que precisa ser ajustada.',
      },
    ],
    related: ['criar-pedido'],
  },
  {
    slug: 'cadastrar-cliente',
    title: 'Como cadastrar um cliente',
    category: 'Clientes',
    summary: 'Cadastro completo, com preenchimento automático de endereço pelo CEP.',
    blocks: [
      {
        type: 'steps',
        items: [
          'No menu lateral, clique em Clientes.',
          'Clique em "+ Novo cliente".',
          'Preencha Nome e, se for pessoa jurídica, Empresa, CNPJ/CPF e Inscrição Estadual.',
          'Adicione e-mail e telefone (dá para adicionar mais de um de cada, clicando em "Adicionar").',
          'No bloco de Endereço, digite o CEP primeiro — rua, bairro, cidade e estado são preenchidos sozinhos. Depois complete número e complemento.',
          'Escolha o Estágio do lead e, se quiser, Tags.',
          'Clique em Salvar.',
        ],
      },
    ],
    related: ['criar-pedido'],
  },
  {
    slug: 'cadastrar-produto',
    title: 'Como cadastrar um produto',
    category: 'Produtos',
    summary: 'Cadastro individual de produto, incluindo preço, categoria e estoque mínimo.',
    blocks: [
      {
        type: 'steps',
        items: [
          'No menu lateral, clique em Produtos.',
          'Clique em "+ Novo produto".',
          'Preencha SKU (o código do produto), Descrição e Unidade (UN, KG, PAR, etc).',
          'Preencha Preço de venda e, se quiser controlar margem, Preço de custo.',
          'Categoria e Estoque mínimo são opcionais, mas ajudam a organizar e filtrar depois.',
          'Clique em Salvar.',
        ],
      },
      {
        type: 'note',
        text: 'O mesmo SKU pode se repetir em mais de um produto — é assim que o catálogo representa variações (cor, espessura, medida) de um mesmo código de fábrica.',
      },
    ],
    related: ['importar-produtos-planilha'],
  },
  {
    slug: 'importar-produtos-planilha',
    title: 'Como importar vários produtos de uma vez por planilha',
    category: 'Produtos',
    summary: 'Para cadastrar um catálogo inteiro sem digitar produto por produto.',
    blocks: [
      {
        type: 'steps',
        items: [
          'Em Produtos, clique em "Importar".',
          'Clique em "Baixar modelo" para pegar uma planilha em branco com as colunas certas — ou use sua própria planilha.',
          'Clique em "Escolher arquivo" e selecione o .csv ou .xlsx.',
          'Associe cada coluna da sua planilha ao campo correspondente do sistema (SKU, Descrição, etc). O sistema tenta adivinhar sozinho.',
          'Confira a amostra dos dados na tela seguinte.',
          'Clique em Importar. Cada linha da planilha vira um produto novo.',
        ],
      },
    ],
    related: ['cadastrar-produto', 'atualizar-produtos-planilha'],
  },
  {
    slug: 'atualizar-produtos-planilha',
    title: 'Como atualizar preços e dados de vários produtos de uma vez',
    category: 'Produtos',
    summary: 'Exportar, editar no Excel e reimportar — inclusive para trocar o SKU. Só para administradores.',
    adminOnly: true,
    blocks: [
      {
        type: 'p',
        text: 'Diferente de Importar (que cria produtos novos), esses botões só existem para quem é administrador e servem para atualizar produtos que já existem.',
      },
      {
        type: 'steps',
        items: [
          'Em Produtos, filtre se quiser (por categoria, por exemplo) e clique em "Exportar" para baixar uma planilha com os produtos filtrados, incluindo uma coluna de ID interno.',
          'Edite a planilha no Excel: mude preços, descrição, categoria — e até o SKU, se precisar.',
          'Não apague nem mude a coluna do ID interno: é ela que garante que cada linha atualize o produto certo.',
          'Volte ao sistema e clique em "Atualizar por planilha". Suba o arquivo editado e associe as colunas, mantendo a coluna do ID mapeada.',
          'Confira a amostra e clique em Atualizar. No final, o sistema avisa quantos produtos foram atualizados e se alguma linha não foi encontrada.',
        ],
      },
      {
        type: 'note',
        text: 'Se você subir uma planilha sem a coluna do ID, o sistema tenta localizar pelo SKU — mas aí, se o mesmo SKU existir em mais de um produto (variações de cor, por exemplo), essas linhas são ignoradas por segurança, para não atualizar o produto errado.',
      },
    ],
    related: ['cadastrar-produto', 'importar-produtos-planilha'],
  },
  {
    slug: 'convidar-membro-equipe',
    title: 'Como convidar um novo membro para a equipe',
    category: 'Geral',
    summary: 'Adicionar um vendedor ou colega de trabalho ao sistema. Só para administradores.',
    adminOnly: true,
    blocks: [
      {
        type: 'steps',
        items: [
          'Clique em Configurações, no menu lateral.',
          'Abra a aba Equipe.',
          'Clique em "Convidar membro".',
          'Preencha o e-mail da pessoa e escolha o perfil dela.',
          'A pessoa recebe um convite por e-mail para criar a senha e entrar.',
        ],
      },
    ],
  },
  {
    slug: 'pagina-recarregou-sozinha',
    title: 'A tela recarregou sozinha e eu ia perder o que tinha digitado',
    category: 'Geral',
    summary: 'Por que isso acontece e como o sistema te protege.',
    blocks: [
      {
        type: 'p',
        text: 'Às vezes o navegador (Chrome, Edge) descarta uma aba que está em segundo plano há um tempo, para economizar memória do computador. Quando você volta para ela, a página recarrega do zero — isso é um comportamento do navegador, não um defeito do Jotapedi.',
      },
      {
        type: 'p',
        text: 'Para não perder o que você estava digitando num pedido, cliente ou produto, o sistema salva um rascunho automaticamente no seu navegador. Se isso acontecer, é só reabrir o mesmo cadastro que estava editando (ou clicar em Novo de novo) que o rascunho volta sozinho.',
      },
      {
        type: 'note',
        text: 'Se puder, evite manter o Jotapedi aberto em duas abas ao mesmo tempo — isso deixa esse recarregamento mais frequente.',
      },
    ],
  },
]

export function getHelpArticle(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug)
}
