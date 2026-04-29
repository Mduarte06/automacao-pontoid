# 🤖 Automação Ponto ID - Injeção Dinâmica e Motor Cronológico (V26)

Este repositório contém uma automação avançada (`UserScript`) desenvolvida em JavaScript (Vanilla JS) para o preenchimento autônomo de diários de classe no sistema Ponto ID. 

O software evoluiu para uma ferramenta robusta com interface gráfica (UI) injetada, gerenciamento de fila via cache e um motor cronológico que lida com grades complexas, repetições de aulas e feriados de forma inteligente.

## ⚙️ Arquitetura e Funcionalidades

* **Motor Cronológico e Batch Scoping:** O sistema não apenas repete cliques, ele gera uma linha do tempo estrita baseada em uma **Data de Início** e **Data de Fim**. O algoritmo calcula exatamente em quais dias a matéria ocorre e aloca os textos cronologicamente, impedindo sobreposições ou quebra de limite de datas.
* **Painel de Configuração Dinâmico (Matriz 2D):** A grade curricular não é mais *hardcoded*. Uma interface visual (Modal) permite ao usuário configurar quantas aulas de cada disciplina ocorrem em cada dia da semana, salvando as preferências diretamente na memória do navegador.
* **Dashboard de Estado (Mochila):** Um modal injetado no DOM que atua como um painel de auditoria. O usuário pode visualizar a fila de injeção, verificar as datas calculadas, ler resumos dos conteúdos e deletar itens individualmente do cache antes da execução.
* **Algoritmo Anti-Colisão (Web Scraping):** O parsing do texto selecionado utiliza detecção por índice de posição (`indexOf`), priorizando a disciplina informada no cabeçalho e ignorando falsos positivos (ex: a palavra "história" no meio de um texto de Arte).
* **Feedback Visual (Toasts):** Sistema de notificações assíncronas em tempo real que confirmam capturas, alertam sobre limites de lote ou confirmam avanços manuais na fila.
* **Tratamento de Exceções (Feriados):** Caso o Ponto ID recuse a injeção por ser um "dia não letivo", o robô intercepta o modal de erro nativo, fecha-o, avança o calendário em 7 dias e tenta a injeção novamente, mantendo a sincronia.

## 🚀 Como Usar e Atalhos de Teclado

### Instalação
1. Instale a extensão **Tampermonkey** no seu navegador.
2. Clique [aqui](link_do_seu_arquivo_raw_aqui) para instalar o script diretamente (substitua pelo link Raw do GitHub).

### O Fluxo de Trabalho (Captura e Injeção)
A operação é dividida em duas etapas: **Escaneamento** (no diário de origem) e **Ejeção** (no diário de destino).

**No Teclado (Escaneamento):**
* `Ctrl + Espaço`: **Capturar Aula.** Selecione o texto da aula (incluindo o cabeçalho com a matéria) e pressione o atalho. O robô limpa o texto, calcula a data cronológica e guarda no *LocalStorage*.
* `Alt + P`: **Pular Feriado (Skip).** Selecione apenas o nome da matéria e pressione. Informa ao motor cronológico para avançar 1 dia letivo daquela disciplina sem salvar nenhum texto (útil quando a turma de origem não teve aula por causa de um feriado local).

**Na Interface (Ejeção):**
* **⚙️ Configurar Grade:** Abre a matriz para definir a quantidade de aulas diárias de cada disciplina.
* **🎒 Ver Mochila:** Abre o painel para revisar, auditar e apagar aulas capturadas.
* **🚀 Ejetar Lote:** Inicia o processo autônomo. O robô navegará pelos formulários, injetará o código via Select2 (AJAX) e salvará os diários.
* **🗑️ Limpar Tudo:** Esvazia o cache e reseta os limites de data (Início/Fim) para o início de um novo mês ou quinzena.

## 🛠️ Tecnologias Utilizadas
* JavaScript (ES6+)
* DOM Manipulation & Event Listeners
* LocalStorage API (Persistência de Fila/Estado)
* CSS in JS (Injeção de Modais e Toasts)
* Regex e Algoritmos de Indexação
