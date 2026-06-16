# VM Collection — versão premium completa

Esta versão amplia o padrão visual premium da tela inicial para todas as áreas internas do aplicativo.

## Atualizações visuais

- Catálogo com banner premium, busca destacada, filtros avançados, ordenação, grade/lista e resumo da seleção.
- Cadastro dividido em quatro etapas visuais: mídia, identificação, aquisição/valor e classificação.
- Categorias com resumo, categoria líder, quantidade e valor estimado por grupo.
- Relatórios com indicadores gerais e análises por categoria, marca, ano e raridade.
- Estatísticas com cards de destaque, gráfico de crescimento e insights automáticos.
- Perfil com identidade da coleção, backup, instalação na tela inicial e estrutura de compartilhamento.
- Tela de detalhes reformulada para seguir a mesma identidade visual.

## Funcionalidades mantidas

- Foto pela câmera ou galeria.
- Vídeo de até 10 segundos.
- Busca e filtros.
- Favoritos, desejados e raros.
- Backup JSON.
- PWA instalável com ícone VM Collection.
- Dados locais com migração automática das versões anteriores.

## Observação

A sincronização multiusuário em celulares diferentes ainda requer backend e autenticação.


## Atualização — Localizar itens

- A busca principal agora pesquisa especificamente pelo nome do item.
- O filtro “Possuídos e desejados” passou a ser o primeiro campo dos filtros.
- O filtro de categorias passou a ser o segundo campo.
- O filtro de situação agora oferece: Possuídos e desejados, Somente possuídos e Somente desejados.
- Todos os demais campos, funções e elementos visuais foram preservados.


## Atualização de perfil e backup

- Cadastro do usuário com nome, data de nascimento, bio e foto de perfil.
- A foto do perfil aparece automaticamente no topo da tela inicial.
- O backup versão 4 inclui itens, fotos, vídeos, dados do perfil e foto do perfil.
- A importação continua compatível com backups antigos que continham somente itens.
- Texto principal atualizado para “Organize suas coleções”.


## Catálogo em PDF

- Novo botão “Gerar catálogo em PDF” após os campos de pesquisa e filtros.
- O catálogo utiliza exatamente a seleção filtrada e a ordem atual do Catálogo.
- A primeira página é uma capa com logo, nome do usuário, foto de perfil e categoria selecionada.
- A partir da segunda página, os itens aparecem em formato de lista.
- No navegador, escolha a opção de salvar/imprimir como PDF.
- A tela inicial recebeu a assinatura discreta “——— MSantoro ———” no final da página.


## Atualização de persistência local (v6)

- Itens, perfil e categorias agora são gravados em IndexedDB.
- Fotos, vídeos e documentos são convertidos para DataURL e persistidos dentro do banco local.
- Categorias possuem imagem própria e anexos persistentes.
- Itens aceitam arquivos PDF, imagens e documentos com nome, MIME, tamanho e data.
- Backup completo inclui perfil, categorias, itens, fotos, vídeos e anexos.
- No iPhone/PWA, a exportação tenta abrir a folha nativa de compartilhamento usando Web Share com arquivo.
- Backups antigos com fotos embutidas continuam compatíveis.
