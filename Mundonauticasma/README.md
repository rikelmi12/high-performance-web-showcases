# Mundo Náutica — Landing Page Awwwards Concept

Landing page estática premium criada para a Mundo Náutica, com linguagem editorial/cinematográfica e foco em performance.

## Arquivos
- `index.html`
- `styles.css`
- `script.js`
- `assets/`

## Como testar
Abra `index.html` em um navegador com internet. As animações de entrada/menu usam GSAP via CDN e as imagens demonstrativas são carregadas do Unsplash.

Para melhor resultado, rode com um servidor local:

```bash
python3 -m http.server 8080
```

Depois abra `http://localhost:8080`.

## Antes de publicar
1. Trocar as imagens demonstrativas por fotos reais da Mundo Náutica/Rio Araguaia com autorização de uso.
2. Configurar `WHATSAPP_NUMBER` no início de `script.js` no formato `5562XXXXXXXXX`.
3. Confirmar horário de funcionamento, bairro comercial, telefone/WhatsApp, marcas, entrega e linhas atuais de náutica.
4. Se desejar, trocar o mapa embed pela localização oficial do Google Business Profile.

## Performance / scroll
Esta versão usa **rolagem 100% nativa do navegador**.

- Lenis foi removido totalmente;
- nenhuma biblioteca intercepta `wheel` ou trackpad;
- não há listener JavaScript executando durante o scroll;
- a barra de progresso usa Scroll-Driven Animations em navegadores compatíveis;
- reveals usam `IntersectionObserver` somente uma vez por elemento;
- ruído fixo fullscreen foi desativado;
- filtros/blur pesados das áreas grandes permanecem desativados;
- animações decorativas pausam fora da viewport;
- imagens demonstrativas usam resolução menor para reduzir custo de decode;
- touch/mobile também usa scroll nativo.

## Logo
A identidade visual está em `assets/`:
- `logo-mundo-nautica.webp` — versão principal otimizada;
- `logo-mundo-nautica-small.webp` — versão leve para o cabeçalho;
- `logo-mundo-nautica-master.png` — arquivo mestre em alta resolução;
- `favicon.png` — ícone do navegador.
