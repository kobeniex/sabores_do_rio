# Sabores do Rio: Cardápio Digital Interativo

Projeto do Grupo 6 (Desenvolvimento de Sistemas, Centro Universitário Fametro).
Site estático feito só com HTML, CSS e JavaScript, sem backend.

## Estrutura
- `index.html`: página, com Microdados (schema.org) em Restaurant, Menu, MenuSection e MenuItem
- `img/`: fotos dos 13 pratos (geradas por IA, 480x480)
- `css/style.css`: visual, layout responsivo, foco visível e tema de alto contraste
- `js/script.js`: filtro de 7 alérgenos (glúten, lactose, ovo, peixe, castanhas, amendoim e crustáceos), busca, índice de seções, validação dos dados, atalhos, pedido, mesa, observação, comandos de voz e tema

## Como executar
Abra o `index.html` no Chrome ou no Edge (a voz não funciona em todos os navegadores).
Para publicar, envie esta pasta para um repositório no GitHub e conecte à Vercel.

## Crédito da imagem
Imagem do topo: NASA/Jessica Meir, "The Ucayali River in the lowland Amazon rainforest of central Peru" ([NASA Image and Video Library](https://images.nasa.gov/details/iss074e0492148)).

## Comandos de voz
"quero duas moquecas", "remover pastel", "sem glúten", "mostrar tudo", "o que tem sem lactose?",
"buscar cupuaçu", "limpar busca", "mesa 5", "observação sem cebola", "qual o total", "mostrar pedido", "finalizar pedido".

## Acessibilidade
Atalhos de teclado (/, M, P, D, C), navegação por teclado, link "Pular para o cardápio", rótulos ARIA, ícones decorativos ocultos
modo escuro e botão de alto contraste. Testes manuais, sem certificação formal.
