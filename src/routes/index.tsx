import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  Check,
  ClipboardList,
  CreditCard,
  LineChart,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BrandMark } from "@/components/app-layout";
import { APP_SLOGAN, APP_NAME } from "@/lib/constants";
import { DIAS_TESTE_PADRAO } from "@/lib/licenca";
import heroDona from "@/assets/hero-dona-negocio.jpg";
import oficina from "@/assets/oficina-artesanato.jpg";
import maquininha from "@/assets/pagamento-maquininha.jpg";
import servicos from "@/assets/servicos-precos.jpg";
import costura from "@/assets/costura-atelier.jpg";
import mercearia from "@/assets/mercearia-estoque.jpg";
import salao from "@/assets/salao-atendimento.jpg";
import cozinha from "@/assets/cozinha-preparo.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Precifica — Lucro certo" },
      {
        name: "description",
        content:
          "Descubra o preço mínimo, ideal e promocional dos seus produtos e serviços considerando custos, folha, despesas fixas, impostos e taxas de cartão.",
      },
      { property: "og:title", content: "Precifica — Lucro certo" },
      {
        property: "og:description",
        content:
          "Precificação completa para pequenos negócios: custos, folha, despesas, taxas de pagamento e ponto de equilíbrio. 30 dias grátis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const RECURSOS = [
  {
    icon: Calculator,
    titulo: "Três modos de preço",
    texto: "Preço mínimo, preço ideal com margem e preço promocional com alerta de prejuízo.",
  },
  {
    icon: CreditCard,
    titulo: "Taxas reais de recebimento",
    texto: "Pix, débito e crédito de 1x a 12x com tarifa fixa e prazo de recebimento.",
  },
  {
    icon: PiggyBank,
    titulo: "Custo fixo rateado",
    texto: "Despesas, folha com encargos e pró-labore distribuídos por venda.",
  },
  {
    icon: TrendingUp,
    titulo: "Lucro líquido transparente",
    texto: "Veja quanto sobra de verdade, a margem efetiva e o markup de cada venda.",
  },
  {
    icon: BarChart3,
    titulo: "Relatórios e ponto de equilíbrio",
    texto: "Margem de contribuição, ticket médio e faturamento necessário para empatar.",
  },
  {
    icon: ShieldCheck,
    titulo: "Seus dados protegidos",
    texto: "Cada empresa enxerga somente os próprios cadastros e cálculos.",
  },
];

const DORES = [
  "Copiar o preço do concorrente e descobrir depois que não sobrou nada",
  "Esquecer a taxa da maquininha e o parcelamento na hora de vender",
  "Dar desconto sem saber até onde dá para ir",
  "Não saber quanto precisa vender no mês para pagar as contas",
];

const PASSOS = [
  {
    icon: ClipboardList,
    titulo: "Cadastre o seu negócio",
    texto:
      "Faturamento, pró-labore, despesas fixas, equipe e formas de pagamento em poucos minutos.",
  },
  {
    icon: Calculator,
    titulo: "Simule o preço",
    texto:
      "Escolha o produto ou serviço, a forma de pagamento e veja preço mínimo, ideal e promocional na hora.",
  },
  {
    icon: LineChart,
    titulo: "Venda com lucro",
    texto:
      "Salve os cenários, acompanhe o histórico e use os relatórios para ajustar preços com segurança.",
  },
];

const HISTORIAS = [
  {
    img: oficina,
    tag: "Produção própria",
    titulo: "Artesanato e fabricação",
    texto: "Matéria-prima, embalagem, frete e horas de trabalho entram no custo de cada peça.",
  },
  {
    img: maquininha,
    tag: "Comércio",
    titulo: "Lojas, mercearias e revenda",
    texto: "Cada forma de pagamento tem a sua taxa, e o preço se ajusta ao parcelamento escolhido.",
  },
  {
    img: servicos,
    tag: "Serviços",
    titulo: "Oficinas, consultorias e prestadores",
    texto: "Valor da hora, deslocamento, materiais e terceirizados calculados por atendimento.",
  },
  {
    img: salao,
    tag: "Beleza e bem-estar",
    titulo: "Salões, barbearias e estúdios",
    texto: "Tempo da profissional, produtos, comissão e taxa da máquina em cada atendimento.",
  },
];

const INCLUSO = [
  "Produtos e serviços ilimitados",
  "Simulador de preço completo",
  "Despesas fixas, equipe e encargos",
  "Formas de pagamento e taxas de cartão",
  "Histórico e cenários salvos",
  "Relatórios e ponto de equilíbrio",
  "Vários usuários na mesma empresa",
  "Acesso pelo celular e pelo computador",
];

const PERGUNTAS = [
  {
    q: "Preciso pagar para testar?",
    a: `Não. Você cria a conta e usa o ${APP_NAME} por ${DIAS_TESTE_PADRAO} dias sem pagar nada e sem cadastrar cartão.`,
  },
  {
    q: "O que acontece quando o teste termina?",
    a: "O acesso fica bloqueado até a contratação da licença anual. Os seus dados continuam guardados e voltam assim que a licença é ativada.",
  },
  {
    q: "Quanto custa depois do teste?",
    a: "R$ 129,90 por 12 meses de uso, com todos os recursos liberados.",
  },
  {
    q: "Serve para serviços, não só para produtos?",
    a: "Sim. Você informa horas, valor da hora, materiais, deslocamento e terceirizados, e o cálculo considera tudo isso.",
  },
  {
    q: "Preciso entender de contabilidade?",
    a: "Não. Os campos são em linguagem simples e o sistema explica o resultado: quanto cobrar, quanto sobra e qual é o preço mínimo seguro.",
  },
  {
    q: "Posso usar com a minha equipe?",
    a: "Sim. Você convida outras pessoas para a mesma empresa e define quem pode editar e quem só visualiza.",
  },
];

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/painel" });
  }, [user, loading, navigate]);

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border/60 bg-background/80 sticky top-0 z-30 border-b backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <BrandMark />
          <nav className="text-muted-foreground hidden items-center gap-7 text-sm font-medium md:flex">
            <a href="#recursos" className="hover:text-foreground transition-colors">
              Recursos
            </a>
            <a href="#como-funciona" className="hover:text-foreground transition-colors">
              Como funciona
            </a>
            <a href="#preco" className="hover:text-foreground transition-colors">
              Preço
            </a>
            <a href="#duvidas" className="hover:text-foreground transition-colors">
              Dúvidas
            </a>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" className="font-semibold">
              <Link to="/entrar">Entrar</Link>
            </Button>
            <Button asChild className="hidden rounded-xl font-semibold sm:inline-flex">
              <Link to="/entrar" search={{ modo: "cadastro" }}>
                Testar grátis
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero editorial */}
        <section className="bg-app-gradient border-border/60 border-b">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-14 pb-16 lg:grid-cols-[1fr_0.85fr] lg:pt-20 lg:pb-24">
            <div>
              <span className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
                Precificação para pequenos negócios
              </span>
              <h1 className="font-display mt-4 text-[2.6rem] leading-[1.02] font-extrabold tracking-tight md:text-6xl">
                Pare de chutar preço.
                <span className="text-brand-gradient block">{APP_SLOGAN}</span>
              </h1>
              <p className="text-muted-foreground mt-6 max-w-xl text-base leading-relaxed md:text-lg">
                O {APP_NAME} reúne custos, despesas fixas, folha salarial, impostos, comissões e
                taxas de cartão para mostrar exatamente quanto cobrar e quanto sobra em cada venda.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="gap-2 rounded-xl font-semibold">
                  <Link to="/entrar" search={{ modo: "cadastro" }}>
                    Criar conta gratuita <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-xl font-semibold">
                  <Link to="/entrar">Já tenho conta</Link>
                </Button>
              </div>
              <p className="text-muted-foreground mt-4 text-sm">
                {DIAS_TESTE_PADRAO} dias grátis · sem cartão de crédito
              </p>

              <dl className="border-border/70 mt-10 grid max-w-lg grid-cols-3 gap-6 border-t pt-6">
                {[
                  { k: `${DIAS_TESTE_PADRAO} dias`, v: "de teste completo" },
                  { k: "3 preços", v: "mínimo, ideal e promocional" },
                  { k: "Até 12x", v: "taxas de cartão calculadas" },
                ].map((i) => (
                  <div key={i.k}>
                    <dt className="font-display text-xl font-extrabold">{i.k}</dt>
                    <dd className="text-muted-foreground mt-0.5 text-xs leading-snug">{i.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative">
              <div className="shadow-lift overflow-hidden rounded-[2rem]">
                <img
                  src={heroDona}
                  alt="Dona de uma confeitaria conferindo os preços dos seus produtos no tablet"
                  width={1280}
                  height={1600}
                  className="aspect-[4/5] w-full object-cover"
                />
              </div>

              <div className="card-soft absolute -bottom-6 -left-4 w-[15.5rem] p-4 sm:-left-10 sm:w-64">
                <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-[0.14em] uppercase">
                  Bolo no pote · crédito 3x
                </p>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-muted-foreground text-xs">Preço mínimo</span>
                  <span className="text-sm font-semibold">R$ 19,90</span>
                </div>
                <div className="bg-accent mt-2 flex items-baseline justify-between rounded-xl px-3 py-2">
                  <span className="text-accent-foreground text-xs font-semibold">Preço ideal</span>
                  <span className="font-display text-primary text-xl font-extrabold">R$ 28,50</span>
                </div>
                <p className="text-success mt-2 text-xs font-semibold">
                  Lucro líquido R$ 8,55 · 30%
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Dores */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-display max-w-md text-3xl leading-tight font-extrabold tracking-tight md:text-4xl">
                Vender muito e não sobrar dinheiro tem explicação
              </h2>
              <p className="text-muted-foreground mt-4 max-w-md leading-relaxed">
                Quase sempre o problema não é o volume de vendas, é o preço. Estes são os erros mais
                comuns — e o {APP_NAME} resolve todos eles.
              </p>
              <div className="shadow-soft mt-8 hidden overflow-hidden rounded-3xl lg:block">
                <img
                  src={mercearia}
                  alt="Dono de mercearia conferindo os preços dos produtos nas prateleiras com um caderno"
                  loading="lazy"
                  width={1024}
                  height={1024}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            </div>
            <ul className="divide-border/70 border-border/70 divide-y border-y">
              {DORES.map((dor) => (
                <li key={dor} className="flex items-start gap-4 py-5">
                  <span className="text-muted-foreground/70 font-display pt-0.5 text-sm">—</span>
                  <p className="text-[0.975rem] leading-relaxed">{dor}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Como funciona */}
        <section
          id="como-funciona"
          className="border-border/60 bg-card/60 scroll-mt-24 border-y py-20"
        >
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="font-display max-w-xl text-3xl leading-tight font-extrabold tracking-tight md:text-4xl">
              Do cadastro ao preço certo em três passos
            </h2>
            <div className="mt-12 grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div className="shadow-soft overflow-hidden rounded-3xl">
                <img
                  src={costura}
                  alt="Costureira medindo uma peça de roupa na sua oficina de costura"
                  loading="lazy"
                  width={1024}
                  height={1024}
                  className="aspect-[4/5] w-full object-cover"
                />
              </div>
              <div className="grid gap-10">
                {PASSOS.map(({ icon: Icon, titulo, texto }, i) => (
                  <article key={titulo} className="border-border/70 border-t pt-6">
                    <div className="flex items-center gap-3">
                      <span className="text-primary font-display text-sm font-extrabold">
                        0{i + 1}
                      </span>
                      <Icon className="text-muted-foreground size-4" aria-hidden />
                    </div>
                    <h3 className="font-display mt-4 text-lg font-bold">{titulo}</h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{texto}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Histórias / para quem */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="font-display max-w-lg text-3xl leading-tight font-extrabold tracking-tight md:text-4xl">
              Feito para o pequeno negócio brasileiro
            </h2>
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
              MEI, microempresa ou autônomo: se você vende produto ou serviço, o cálculo já está
              pronto para o seu caso.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HISTORIAS.map(({ img, tag, titulo, texto }) => (
              <article key={titulo} className="group">
                <div className="shadow-soft overflow-hidden rounded-3xl">
                  <img
                    src={img}
                    alt={titulo}
                    loading="lazy"
                    width={1280}
                    height={960}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <p className="text-primary mt-5 text-xs font-semibold tracking-[0.16em] uppercase">
                  {tag}
                </p>
                <h3 className="font-display mt-2 text-lg font-bold">{titulo}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{texto}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Recursos */}
        <section
          id="recursos"
          className="border-border/60 bg-card/60 scroll-mt-24 border-y py-20"
        >
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="font-display max-w-xl text-3xl leading-tight font-extrabold tracking-tight md:text-4xl">
              Tudo o que entra no preço, em um só lugar
            </h2>
            <p className="text-muted-foreground mt-4 max-w-xl leading-relaxed">
              Nada de planilha solta: os cadastros conversam entre si e o cálculo é atualizado
              automaticamente.
            </p>
            <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {RECURSOS.map(({ icon: Icon, titulo, texto }) => (
                <article key={titulo}>
                  <span className="bg-accent text-primary mb-4 flex size-11 items-center justify-center rounded-2xl">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="font-display text-base font-bold">{titulo}</h3>
                  <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Preço */}
        <section id="preco" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <h2 className="font-display text-3xl leading-tight font-extrabold tracking-tight md:text-4xl">
                Um preço só, sem surpresa
              </h2>
              <p className="text-muted-foreground mt-4 max-w-lg leading-relaxed">
                Comece com {DIAS_TESTE_PADRAO} dias grátis e com todos os recursos liberados. Se
                fizer sentido para o seu negócio, você contrata a licença anual e continua de onde
                parou.
              </p>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {INCLUSO.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <Check className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-soft p-8">
              <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
                Licença anual
              </p>
              <p className="font-display mt-3 flex items-end gap-2">
                <span className="text-[2.75rem] leading-none font-extrabold">R$ 129,90</span>
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                por 12 meses — menos de R$ 11 por mês para saber o preço certo de tudo o que você
                vende.
              </p>
              <Button asChild size="lg" className="mt-7 w-full gap-2 rounded-xl font-semibold">
                <Link to="/entrar" search={{ modo: "cadastro" }}>
                  Começar os {DIAS_TESTE_PADRAO} dias grátis
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <p className="text-muted-foreground mt-3 text-center text-xs">
                Sem cartão para testar · cancele quando quiser
              </p>
            </div>
          </div>
        </section>

        {/* Dúvidas */}
        <section
          id="duvidas"
          className="border-border/60 bg-card/60 scroll-mt-24 border-y py-20"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[0.6fr_1fr]">
            <h2 className="font-display text-3xl leading-tight font-extrabold tracking-tight md:text-4xl">
              Perguntas frequentes
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {PERGUNTAS.map(({ q, a }) => (
                <AccordionItem key={q} value={q}>
                  <AccordionTrigger className="text-left text-base font-semibold">
                    {q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="relative overflow-hidden rounded-[2rem]">
            <img
              src={cozinha}
              alt="Cozinheira servindo prato feito em uma pequena lanchonete de bairro"
              loading="lazy"
              width={1024}
              height={1024}
              className="h-[22rem] w-full object-cover md:h-[24rem]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.25_0.08_292_/_0.88)] to-[oklch(0.25_0.08_292_/_0.45)]" />
            <div className="absolute inset-0 flex flex-col justify-center gap-5 px-8 md:px-14">
              <h2 className="font-display max-w-lg text-3xl leading-tight font-extrabold tracking-tight text-[oklch(0.99_0.005_300)] md:text-4xl">
                Descubra hoje quanto você deveria estar cobrando
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-[oklch(0.99_0.005_300_/_0.85)] md:text-base">
                Leva alguns minutos para cadastrar o seu negócio e ver o preço ideal de cada produto
                e serviço.
              </p>
              <div>
                <Button asChild size="lg" className="gap-2 rounded-xl font-semibold">
                  <Link to="/entrar" search={{ modo: "cadastro" }}>
                    Criar conta gratuita <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-border/70 border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 text-center md:flex-row md:justify-between md:text-left">
          <BrandMark />
          <nav className="text-muted-foreground flex flex-wrap justify-center gap-5 text-sm">
            <a href="#recursos" className="hover:text-foreground transition-colors">
              Recursos
            </a>
            <a href="#preco" className="hover:text-foreground transition-colors">
              Preço
            </a>
            <a href="#duvidas" className="hover:text-foreground transition-colors">
              Dúvidas
            </a>
            <Link to="/entrar" className="hover:text-foreground transition-colors">
              Entrar
            </Link>
          </nav>
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} {APP_NAME} · {APP_SLOGAN}
          </p>
        </div>
      </footer>
    </div>
  );
}
