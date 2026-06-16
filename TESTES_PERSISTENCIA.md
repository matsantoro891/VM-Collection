# Testes da atualização de persistência — VM Collection

## Verificações automatizadas realizadas

- Validação sintática de `app.js` e `storage.js` com Node.js.
- Verificação de que todos os IDs usados no JavaScript existem no HTML.
- Verificação de IDs duplicados no HTML.
- Teste de migração de item antigo salvo em localStorage para a nova estrutura persistente.
- Teste de preservação de foto do item em DataURL.
- Teste de preservação de arquivo anexo com nome, MIME, tamanho, data e conteúdo.
- Teste de migração e persistência da foto e dos dados do perfil.
- Teste de criação automática das categorias a partir dos itens.
- Teste de geração de backup completo com perfil, categorias, itens, imagens e arquivos.
- Teste de limpeza e restauração integral a partir do backup.

## Checklist recomendado após publicar em HTTPS

1. Anexar uma imagem a um item e um arquivo PDF/documento.
2. Fechar completamente o PWA e abri-lo novamente.
3. Confirmar a foto e os arquivos no detalhe do item.
4. Abrir Categorias, tocar em **Gerenciar mídia**, anexar imagem e arquivo.
5. Fechar completamente e abrir novamente.
6. Confirmar imagem e arquivos da categoria.
7. Cadastrar foto no Perfil e confirmar na tela inicial após reabrir.
8. Exportar o backup e verificar a folha nativa de compartilhamento no iPhone.
9. Salvar o JSON em Arquivos/iCloud Drive.
10. Limpar os dados de teste ou abrir em outro navegador/dispositivo.
11. Importar o backup e confirmar a restauração de todas as mídias.

> Observação: o teste físico no Safari/iPhone precisa ser feito depois da publicação em HTTPS, porque câmera, PWA e compartilhamento nativo dependem do ambiente real do aparelho.
